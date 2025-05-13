from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Optional, Literal
from collections import defaultdict
from datetime import datetime, date, timedelta
import logging
from statistics import mean
import numpy_financial as npf

from app.db.database import get_db
from app.api.routes.portfolio_funds import calculate_excel_style_irr

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def serialize_datetime(dt):
    """Helper function to serialize datetime objects to ISO format strings"""
    if isinstance(dt, (datetime, date)):
        return dt.isoformat()
    return dt

@router.get("/analytics/fund_distribution")
async def get_fund_distribution(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of funds to return"),
    db = Depends(get_db)
):
    """
    What it does: Returns the distribution of funds based on their current value from latest valuations.
    Why it's needed: Provides data for the fund distribution pie chart on the dashboard.
    How it works: 
        1. Fetches all available funds
        2. For each fund, calculates the total current value across all portfolio funds using latest valuations
        3. Returns funds sorted by current value (descending)
    Expected output: A list of funds with their names and current values
    """
    try:
        logger.info(f"Fetching fund distribution data with limit: {limit}")
        
        # Get all available funds
        funds_result = db.table("available_funds").select("id,fund_name").execute()
        
        if not funds_result.data:
            logger.warning("No funds found in the database")
            return {"funds": []}
        
        fund_data = []
        
        # For each fund, calculate total current value from latest valuations
        for fund in funds_result.data:
            # Get all portfolio_funds entries for this fund
            pf_result = db.table("portfolio_funds").select("id").eq("available_funds_id", fund["id"]).execute()
            
            total_value = 0
            
            for pf in pf_result.data:
                # Get the latest valuation for this portfolio fund
                valuation_result = db.table("latest_fund_valuations").select("value").eq("portfolio_fund_id", pf["id"]).execute()
                
                if valuation_result.data and len(valuation_result.data) > 0:
                    total_value += valuation_result.data[0]["value"] or 0
                else:
                    # Fallback to amount_invested if no valuation exists
                    amount_result = db.table("portfolio_funds").select("amount_invested").eq("id", pf["id"]).execute()
                    if amount_result.data:
                        total_value += amount_result.data[0]["amount_invested"] or 0
            
            # Only include funds with values > 0
            if total_value > 0:
                fund_data.append({
                    "id": fund["id"],
                    "name": fund["fund_name"],
                    "amount": total_value,
                    "category": "fund"  # Default category, could be enhanced in future
                })
        
        # Sort by amount (descending) and limit results
        fund_data.sort(key=lambda x: x["amount"], reverse=True)
        fund_data = fund_data[:limit]
        
        return {"funds": fund_data}
    except Exception as e:
        logger.error(f"Error fetching fund distribution: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/analytics/dashboard_stats")
async def get_dashboard_stats(db = Depends(get_db)):
    """
    Return dashboard statistics including company-wide IRR calculated from client IRRs.
    """
    try:
        stats = {
            "totalFUM": 0,
            "companyIRR": 0,
            "totalAccounts": 0,
            "totalClients": 0,
            "totalActiveHoldings": 0
        }
        
        # Get company-wide IRR using our new calculation method
        company_irr_result = await calculate_company_irr(db)
        stats["companyIRR"] = company_irr_result["company_irr"]
        stats["totalClients"] = company_irr_result["client_count"]
        stats["totalAccounts"] = company_irr_result["total_products"]
        
        # Calculate total FUM from latest fund valuations instead of portfolio_funds.amount_invested
        # This gives a more accurate representation of current value vs. historical invested amount
        latest_valuations_result = db.table("latest_fund_valuations").select("value").execute()
        if latest_valuations_result.data:
            stats["totalFUM"] = sum(val["value"] or 0 for val in latest_valuations_result.data)
        else:
            # Fallback to amount_invested if no valuations exist
            portfolio_funds_result = db.table("portfolio_funds").select("amount_invested").execute()
            if portfolio_funds_result.data:
                stats["totalFUM"] = sum(pf["amount_invested"] or 0 for pf in portfolio_funds_result.data)
        
        # Get total active holdings (portfolio funds that are active)
        active_holdings_result = db.table("portfolio_funds").select("id").eq("status", "active").execute()
        if active_holdings_result.data:
            stats["totalActiveHoldings"] = len(active_holdings_result.data)
        
        return stats
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/analytics/performance_data")
async def get_performance_data(
    date_range: Literal["all-time", "ytd", "12m", "3y", "5y"] = "all-time",
    entity_type: Literal["overview", "clients", "products", "portfolios", "funds", "products", "providers"] = "overview",
    sort_order: Literal["highest", "lowest"] = "highest",
    limit: int = Query(5, ge=1, le=100),
    db = Depends(get_db)
):
    try:
        logger.info(f"Starting performance data fetch for date_range: {date_range}, entity_type: {entity_type}")
        
        response = {
            "companyFUM": 0,
            "companyIRR": 0,
            "performanceData": []
        }

        # Get company-wide stats
        company_stats = await calculate_company_irr(db)
        response["companyIRR"] = company_stats["company_irr"]
        
        # Calculate total FUM
        fum_result = db.table("portfolio_funds").select("amount_invested").execute()
        if fum_result.data:
            response["companyFUM"] = sum(pf["amount_invested"] or 0 for pf in fum_result.data)

        if entity_type == "funds":
            # Get funds with their latest IRR values and total FUM
            funds_result = db.table("available_funds").select("*").execute()
            
            for fund in funds_result.data:
                # Get portfolio funds and their latest IRR values
                pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("available_funds_id", fund["id"]).execute()
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                
                for pf in pf_result.data:
                    # Get latest IRR value for this portfolio fund
                    irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                    
                    if irr_result.data and pf["amount_invested"]:
                        total_fum += pf["amount_invested"]
                        weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                        total_weight += pf["amount_invested"]
                
                if total_weight > 0:
                    response["performanceData"].append({
                        "id": fund["id"],
                        "name": fund["fund_name"],
                        "type": "fund",
                        "irr": weighted_irr / total_weight,
                        "fum": total_fum,
                        "startDate": None
                    })
            
            # Sort by IRR
            response["performanceData"].sort(
                key=lambda x: x["irr"],
                reverse=(sort_order == "highest")
            )
            response["performanceData"] = response["performanceData"][:limit]
        
        elif entity_type == "portfolios":
            # Get portfolios with their latest IRR values and total FUM
            portfolios_result = db.table("portfolios").select("*").execute()
            
            for portfolio in portfolios_result.data:
                # Get portfolio funds and their latest IRR values
                pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", portfolio["id"]).execute()
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                
                for pf in pf_result.data:
                    irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                    
                    if irr_result.data and pf["amount_invested"]:
                        total_fum += pf["amount_invested"]
                        weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                        total_weight += pf["amount_invested"]
                
                if total_weight > 0:
                    response["performanceData"].append({
                        "id": portfolio["id"],
                        "name": portfolio["portfolio_name"],
                        "type": "portfolio",
                        "irr": weighted_irr / total_weight,
                        "fum": total_fum,
                        "startDate": portfolio["start_date"]
                    })
            
            # Sort by IRR
            response["performanceData"].sort(
                key=lambda x: x["irr"],
                reverse=(sort_order == "highest")
            )
            response["performanceData"] = response["performanceData"][:limit]

        elif entity_type == "products":
            # Get products with their latest IRR values and total FUM
            products_result = db.table("client_products").select("*").execute()
            
            for product in products_result.data:
                # Get product's portfolio directly from client_products
                if product["portfolio_id"]:
                    total_fum = 0
                    weighted_irr = 0
                    total_weight = 0
                    
                    # Get all portfolio funds for this portfolio
                    pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", product["portfolio_id"]).execute()
                    
                    for pf in pf_result.data:
                        irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                        
                        if irr_result.data and pf["amount_invested"]:
                            total_fum += pf["amount_invested"]
                            weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                            total_weight += pf["amount_invested"]
                
                    if total_weight > 0:
                        # Get client name for product
                        client_result = db.table("client_groups").select("name").eq("id", product["client_id"]).execute()
                        client_name = client_result.data[0]["name"] if client_result.data else "Unknown Client"
                        
                        response["performanceData"].append({
                            "id": product["id"],
                            "name": product["product_name"] or f"{client_name}'s product",
                            "type": "product",
                            "irr": weighted_irr / total_weight,
                            "fum": total_fum,
                            "startDate": product["start_date"]
                        })
            
            # Sort by IRR
            response["performanceData"].sort(
                key=lambda x: x["irr"],
                reverse=(sort_order == "highest")
            )
            response["performanceData"] = response["performanceData"][:limit]

        elif entity_type == "clients":
            # Get clients with their latest IRR values and total FUM
            clients_result = db.table("client_groups").select("*").execute()
            
            for client in clients_result.data:
                # Get client products
                products_result = db.table("client_products").select("*").eq("client_id", client["id"]).execute()
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                earliest_start_date = None
                
                for product in products_result.data:
                    # Get portfolio directly from client_products
                    if product["portfolio_id"]:
                        # Get all portfolio funds for this portfolio
                        pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", product["portfolio_id"]).execute()
                        
                        for pf in pf_result.data:
                            irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                            
                            if irr_result.data and pf["amount_invested"]:
                                total_fum += pf["amount_invested"]
                                weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                                total_weight += pf["amount_invested"]
                                
                                if not earliest_start_date or (product["start_date"] and product["start_date"] < earliest_start_date):
                                    earliest_start_date = product["start_date"]
                
                if total_weight > 0:
                    client_name = client["name"]
                    response["performanceData"].append({
                        "id": client["id"],
                        "name": client_name,
                        "type": "client",
                        "irr": weighted_irr / total_weight,
                        "fum": total_fum,
                        "startDate": earliest_start_date,
                        "advisor": client["advisor"]
                    })
            
            # Sort by IRR
            response["performanceData"].sort(
                key=lambda x: x["irr"],
                reverse=(sort_order == "highest")
            )
            response["performanceData"] = response["performanceData"][:limit]

        elif entity_type == "overview":
            # Get top performers across all entity types
            all_performers = []
            
            # Get top funds
            funds_result = db.table("available_funds").select("*").execute()
            for fund in funds_result.data:
                pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("available_funds_id", fund["id"]).execute()
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                
                for pf in pf_result.data:
                    irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                    
                    if irr_result.data and pf["amount_invested"]:
                        total_fum += pf["amount_invested"]
                        weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                        total_weight += pf["amount_invested"]
                
                if total_weight > 0:
                    all_performers.append({
                        "id": fund["id"],
                        "name": fund["fund_name"],
                        "type": "fund",
                        "irr": weighted_irr / total_weight,
                        "fum": total_fum,
                        "startDate": None
                    })
            
            # Get top portfolios
            portfolios_result = db.table("portfolios").select("*").execute()
            for portfolio in portfolios_result.data:
                pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", portfolio["id"]).execute()
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                
                for pf in pf_result.data:
                    irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                    
                    if irr_result.data and pf["amount_invested"]:
                        total_fum += pf["amount_invested"]
                        weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                        total_weight += pf["amount_invested"]
                
                if total_weight > 0:
                    all_performers.append({
                        "id": portfolio["id"],
                        "name": portfolio["portfolio_name"],
                        "type": "portfolio",
                        "irr": weighted_irr / total_weight,
                        "fum": total_fum,
                        "startDate": portfolio["start_date"]
                    })
            
            # Get top products
            products_result = db.table("client_products").select("*").execute()
            for product in products_result.data:
                if product["portfolio_id"]:
                    total_fum = 0
                    weighted_irr = 0
                    total_weight = 0
                    
                    # Get all portfolio funds for this portfolio
                    pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", product["portfolio_id"]).execute()
                    
                    for pf in pf_result.data:
                        irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                        
                        if irr_result.data and pf["amount_invested"]:
                            total_fum += pf["amount_invested"]
                            weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                            total_weight += pf["amount_invested"]
                
                    if total_weight > 0:
                        client_result = db.table("client_groups").select("name").eq("id", product["client_id"]).execute()
                        client_name = client_result.data[0]["name"] if client_result.data else "Unknown Client"
                        
                        all_performers.append({
                            "id": product["id"],
                            "name": product["product_name"] or f"{client_name}'s product",
                            "type": "product",
                            "irr": weighted_irr / total_weight,
                            "fum": total_fum,
                            "startDate": product["start_date"]
                        })
            
            # Get top clients
            clients_result = db.table("client_groups").select("*").execute()
            for client in clients_result.data:
                products_result = db.table("client_products").select("*").eq("client_id", client["id"]).execute()
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                earliest_start_date = None
                
                for product in products_result.data:
                    if product["portfolio_id"]:
                        # Get all portfolio funds for this portfolio
                        pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", product["portfolio_id"]).execute()
                        
                        for pf in pf_result.data:
                            irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                            
                            if irr_result.data and pf["amount_invested"]:
                                total_fum += pf["amount_invested"]
                                weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                                total_weight += pf["amount_invested"]
                                
                                if not earliest_start_date or (product["start_date"] and product["start_date"] < earliest_start_date):
                                    earliest_start_date = product["start_date"]
                
                if total_weight > 0:
                    client_name = client["name"]
                    all_performers.append({
                        "id": client["id"],
                        "name": client_name,
                        "type": "client",
                        "irr": weighted_irr / total_weight,
                        "fum": total_fum,
                        "startDate": earliest_start_date,
                        "advisor": client["advisor"]
                    })
            
            # Sort all performers by IRR
            all_performers.sort(
                key=lambda x: x["irr"],
                reverse=(sort_order == "highest")
            )
            response["performanceData"] = all_performers[:limit]

        logger.info("Successfully completed performance data fetch")
        return response
        
    except Exception as e:
        logger.error(f"Error fetching performance data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/analytics/product_client_counts")
async def get_product_client_counts(db = Depends(get_db)):
    """
    Counts the number of clients by relationship type and product type.
    Returns a matrix of relationship types vs product types with counts.
    Example response:
    {
        "relationships": ["Spouse", "Child", "Parent"],
        "products": ["Product A", "Product B"],
        "data": [
            {"relationship": "Spouse", "counts": {"Product A": 5, "Product B": 3}},
            {"relationship": "Child", "counts": {"Product A": 2, "Product B": 7}},
            {"relationship": "Parent", "counts": {"Product A": 1, "Product B": 4}}
        ]
    }
    """
    try:
        # Get all product types from client_products
        products_result = await db.table("client_products").select("product_type").execute()
        
        if not products_result.data:
            return {
                "relationships": [],
                "products": [],
                "data": []
            }
        
        # Extract unique product types
        product_types = list(set(product["product_type"] for product in products_result.data if product["product_type"]))
        
        # Get all clients and their relationship types
        clients_result = await db.table("client_groups").select("id", "relationship").execute()
        
        if not clients_result.data:
            return {
                "relationships": [],
                "products": [],
                "data": []
            }
        
        # Get all client-product associations
        client_products_result = await db.table("client_products").select("client_id", "product_type").execute()
        
        # Build the response
        relationships = list(set(client["relationship"] for client in clients_result.data if client["relationship"]))
        
        data = []
        for relationship in relationships:
            counts = {product_type: 0 for product_type in product_types}
            for client in clients_result.data:
                if client["relationship"] == relationship:
                    for cp in client_products_result.data:
                        if cp["client_id"] == client["id"] and cp["product_type"] in product_types:
                            counts[cp["product_type"]] += 1
            data.append({
                "relationship": relationship,
                "counts": counts
            })
        
        return {
            "relationships": relationships,
            "products": product_types,
            "data": data
        }
    except Exception as e:
        logger.error(f"Error calculating product client counts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/analytics/portfolio/{portfolio_id}/performance")
async def get_portfolio_performance(portfolio_id: int, db = Depends(get_db)):
    """
    Get performance metrics for a portfolio including IRR and other key metrics.
    """
    try:
        # Get all funds in the portfolio
        funds_result = await db.table("portfolio_funds").select("*").eq("portfolio_id", portfolio_id).execute()
        
        if not funds_result.data:
            return {
                "irr": 0.0,
                "total_investment": 0.0,
                "current_value": 0.0,
                "fund_performance": []
            }
            
        total_investment = 0.0
        current_value = 0.0
        fund_performance = []
        
        for fund in funds_result.data:
            # Get investment amount
            investment_result = await db.table("holding_activity_log")\
                .select("amount")\
                .eq("portfolio_fund_id", fund["id"])\
                .eq("activity_type", "Investment")\
                .execute()
            investment = sum(log["amount"] for log in investment_result.data) if investment_result.data else 0.0
            
            # Get current value
            current_value_result = await db.table("portfolio_funds")\
                .select("market_value")\
                .eq("id", fund["id"])\
                .execute()
            fund_current_value = current_value_result.data[0]["market_value"] if current_value_result.data else 0.0
            
            total_investment += investment
            current_value += fund_current_value
            
            # Calculate fund IRR
            try:
                import numpy_financial as npf
                cash_flows = [-investment, fund_current_value]
                irr = npf.irr(cash_flows)
                annualized_irr = (1 + irr) ** (365 / 365) - 1  # Assuming 1 year period
            except:
                annualized_irr = 0.0
                
            fund_performance.append({
                "fund_id": fund["id"],
                "fund_name": fund.get("fund_name", "Unknown Fund"),
                "investment": investment,
                "current_value": fund_current_value,
                "irr": annualized_irr
            })
            
        # Calculate portfolio IRR
        try:
            import numpy_financial as npf
            cash_flows = [-total_investment, current_value]
            irr = npf.irr(cash_flows)
            portfolio_irr = (1 + irr) ** (365 / 365) - 1  # Assuming 1 year period
        except:
            portfolio_irr = 0.0
            
        return {
            "irr": portfolio_irr,
            "total_investment": total_investment,
            "current_value": current_value,
            "fund_performance": fund_performance
        }
    except Exception as e:
        logger.error(f"Error calculating portfolio performance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}") 

@router.get("/analytics/company/irr")
async def calculate_company_irr(db = Depends(get_db)):
    """
    Calculate the company-wide IRR based on all portfolio funds across all active portfolios.
    Instead of averaging client IRRs, this directly calculates the IRR from all cash flows
    and valuations across the entire company.
    """
    try:
        logger.info("Calculating company-wide IRR across all active portfolio funds")
        
        # Get all active portfolios
        portfolios_result = db.table("portfolios").select("id").eq("status", "active").execute()
        
        if not portfolios_result.data:
            logger.info("No active portfolios found")
            return {
                "company_irr": 0,
                "client_count": 0,
                "total_products": 0,
                "total_portfolio_funds": 0,
                "total_investment": 0
            }
        
        # Collect all portfolio fund IDs from active portfolios
        all_portfolio_fund_ids = []
        for portfolio in portfolios_result.data:
            pf_result = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio["id"]).eq("status", "active").execute()
            all_portfolio_fund_ids.extend([pf["id"] for pf in pf_result.data])
        
        if not all_portfolio_fund_ids:
            logger.info("No active portfolio funds found in active portfolios")
            return {
                "company_irr": 0,
                "client_count": 0,
                "total_products": 0,
                "total_portfolio_funds": 0,
                "total_investment": 0
            }
        
        logger.info(f"Processing {len(all_portfolio_fund_ids)} active portfolio funds")
        
        # For IRR calculation, we need the initial investments and current valuations
        total_investment = 0
        total_current_value = 0
        all_cash_flows = []
        
        # Get data needed for company stats
        client_count_result = db.table("client_groups").select("id").eq("status", "active").execute()
        client_count = len(client_count_result.data) if client_count_result.data else 0
        
        product_count_result = db.table("client_products").select("id").eq("status", "active").execute()
        total_products = len(product_count_result.data) if product_count_result.data else 0
        
        # Collect all cash flows from all portfolio funds
        for fund_id in all_portfolio_fund_ids:
            # 1. Get the investments (negative cash flows)
            investments_result = db.table("holding_activity_log")\
                .select("activity_timestamp, amount, activity_type")\
                .eq("portfolio_fund_id", fund_id)\
                .execute()
            
            if investments_result.data:
                for activity in investments_result.data:
                    if activity["activity_type"] == "Investment" and activity["amount"]:
                        # Investment is a negative cash flow (money going out)
                        flow_date = datetime.fromisoformat(activity["activity_timestamp"].replace('Z', '+00:00')) \
                            if isinstance(activity["activity_timestamp"], str) \
                            else activity["activity_timestamp"]
                        flow_amount = -float(activity["amount"])  # Negative for investments
                        all_cash_flows.append((flow_date, flow_amount))
                        total_investment += abs(flow_amount)
            
            # 2. Get the current valuation (positive cash flow)
            valuation_result = db.table("latest_fund_valuations")\
                .select("valuation_date, value")\
                .eq("portfolio_fund_id", fund_id)\
                .execute()
            
            if valuation_result.data and len(valuation_result.data) > 0:
                valuation = valuation_result.data[0]
                if valuation["value"] and valuation["valuation_date"]:
                    val_date = datetime.fromisoformat(valuation["valuation_date"].replace('Z', '+00:00')) \
                        if isinstance(valuation["valuation_date"], str) \
                        else valuation["valuation_date"]
                    val_amount = float(valuation["value"])
                    all_cash_flows.append((val_date, val_amount))  
                    total_current_value += val_amount
        
        # Calculate IRR if we have valid cash flows
        company_irr = 0
        if all_cash_flows and len(all_cash_flows) >= 2:
            try:
                # Sort cash flows by date
                all_cash_flows.sort(key=lambda x: x[0])
                
                dates = [cf[0] for cf in all_cash_flows]
                amounts = [cf[1] for cf in all_cash_flows]
                
                # Check if we have both negative and positive flows
                if any(amount < 0 for amount in amounts) and any(amount > 0 for amount in amounts):
                    # Use the same IRR calculation function used for individual funds
                    irr_result = calculate_excel_style_irr(dates, amounts)
                    company_irr = irr_result['period_irr'] * 100  # Convert to percentage
                    logger.info(f"Calculated overall company IRR: {company_irr}%")
                else:
                    logger.warning("Cannot calculate IRR: cash flows don't have both investments and returns")
            except Exception as e:
                logger.error(f"Error in IRR calculation: {str(e)}")
                # Fall back to simple ROI if IRR calculation fails
                if total_investment > 0:
                    company_irr = ((total_current_value / total_investment) - 1) * 100
                    logger.info(f"Falling back to simple ROI calculation: {company_irr}%")
        elif total_investment > 0 and total_current_value > 0:
            # If we don't have detailed cash flows but have totals, calculate simple ROI
            company_irr = ((total_current_value / total_investment) - 1) * 100
            logger.info(f"Calculated simple ROI as fallback: {company_irr}%")
        
        return {
            "company_irr": company_irr,
            "client_count": client_count,
            "total_products": total_products,
            "total_portfolio_funds": len(all_portfolio_fund_ids),
            "total_investment": total_investment
        }
        
    except Exception as e:
        logger.error(f"Error calculating company IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating company IRR: {str(e)}")

@router.get("/analytics/client/{client_id}/irr")
async def calculate_client_irr(client_id: int, db = Depends(get_db)):
    """
    Calculate the weighted average IRR across all products (active and dormant) for a specific client.
    This is done by:
    1. Finding all products for the client
    2. For each product, getting its associated portfolio directly
    3. For each portfolio, finding its portfolio funds
    4. For each portfolio fund, getting its most recent IRR value and amount invested
    5. Calculating weighted average IRR using amount_invested as weights
    """
    try:
        logger.info(f"Calculating IRR for client {client_id}")
        
        # Get all products for the client
        products_result = db.table("client_products").select("*").eq("client_id", client_id).execute()
        
        if not products_result.data:
            logger.info(f"No products found for client {client_id}")
            return {"client_id": client_id, "irr": 0, "product_count": 0}
            
        all_irr_values = []
        all_weights = []  # Store amount_invested for each IRR value
        product_count = len(products_result.data)
        
        for product in products_result.data:
            # Get portfolio directly from client_products
            if not product["portfolio_id"]:
                continue
                
            # Get all portfolio funds for this portfolio
            portfolio_funds_result = db.table("portfolio_funds")\
                .select("id", "amount_invested")\
                .eq("portfolio_id", product["portfolio_id"])\
                .execute()
                
            if not portfolio_funds_result.data:
                continue
                
            # Get the most recent IRR value for each portfolio fund
            for pf in portfolio_funds_result.data:
                irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                    
                if irr_result.data and len(irr_result.data) > 0 and irr_result.data[0]["irr_result"] is not None:
                    # IRR is stored as percentage in the database
                    irr_value = irr_result.data[0]["irr_result"]
                    amount_invested = float(pf["amount_invested"] or 0)
                    
                    if amount_invested > 0:  # Only include funds with positive investment
                        all_irr_values.append(irr_value)
                        all_weights.append(amount_invested)
                        logger.info(f"Found IRR value: {irr_value}% with weight {amount_invested} for portfolio fund {pf['id']}")
        
        # Calculate weighted average IRR if we have any values
        if all_irr_values and all_weights:
            total_weight = sum(all_weights)
            if total_weight > 0:
                client_irr = sum(irr * weight for irr, weight in zip(all_irr_values, all_weights)) / total_weight
            else:
                client_irr = 0
        else:
            client_irr = 0
            
        logger.info(f"Calculated weighted client IRR: {client_irr}% from {len(all_irr_values)} IRR values")
        
        return {
            "client_id": client_id,
            "irr": client_irr,  # Return as percentage
            "product_count": product_count,
            "portfolio_fund_count": len(all_irr_values)
        }
        
    except Exception as e:
        logger.error(f"Error calculating client IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating client IRR: {str(e)}")

@router.get("/analytics/product/{product_id}/irr")
async def calculate_product_irr(product_id: int, db = Depends(get_db)):
    """
    Calculate the weighted average IRR for a specific product.
    This is done by:
    1. Getting the product's portfolio directly from client_products
    2. For each portfolio fund in that portfolio:
       - Get its most recent IRR value
       - Weight it by (amount_invested in this fund / total amount invested in all funds in this portfolio)
    3. Sum the weighted IRRs to get the product's total IRR
    """
    try:
        logger.info(f"Calculating IRR for product {product_id}")
        
        # Get the product and its associated portfolio
        product_result = db.table("client_products")\
            .select("portfolio_id, start_date")\
            .eq("id", product_id)\
            .execute()
            
        if not product_result.data or not product_result.data[0]["portfolio_id"]:
            logger.info(f"No portfolio associated with product {product_id}")
            return {
                "product_id": product_id,
                "irr": 0,
                "portfolio_fund_count": 0,
                "total_invested": 0,
                "date": None
            }
            
        portfolio_id = product_result.data[0]["portfolio_id"]
            
        # Get all portfolio funds for this portfolio
        portfolio_funds_result = db.table("portfolio_funds")\
            .select("id", "amount_invested")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
            
        if not portfolio_funds_result.data:
            logger.info(f"No portfolio funds found for portfolio {portfolio_id}")
            return {
                "product_id": product_id,
                "irr": 0,
                "portfolio_fund_count": 0,
                "total_invested": 0,
                "date": None
            }
            
        all_irr_values = []
        all_weights = []  # Store amount_invested for each IRR value
        total_invested = 0
        latest_irr_date = None
        
        # Calculate total amount invested in this portfolio
        portfolio_total = sum(float(pf["amount_invested"] or 0) for pf in portfolio_funds_result.data)
        
        if portfolio_total == 0:
            logger.info(f"No investments found in portfolio {portfolio_id}")
            return {
                "product_id": product_id,
                "irr": 0,
                "portfolio_fund_count": len(portfolio_funds_result.data),
                "total_invested": 0,
                "date": None
            }
        
        # Get the most recent IRR value for each portfolio fund
        for pf in portfolio_funds_result.data:
            amount_invested = float(pf["amount_invested"] or 0)
            if amount_invested > 0:  # Only include funds with positive investment
                irr_result = db.table("irr_values").select("irr_result, date").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                    
                if irr_result.data and len(irr_result.data) > 0 and irr_result.data[0]["irr_result"] is not None:
                    irr_value = irr_result.data[0]["irr_result"]
                    weight = amount_invested / portfolio_total  # Weight by proportion of total portfolio investment
                    
                    all_irr_values.append(irr_value)
                    all_weights.append(weight)
                    total_invested += amount_invested
                    
                    # Track the latest IRR date
                    if irr_result.data[0]["date"]:
                        current_date = datetime.fromisoformat(irr_result.data[0]["date"].replace('Z', '+00:00') if isinstance(irr_result.data[0]["date"], str) else irr_result.data[0]["date"].isoformat())
                        if latest_irr_date is None or current_date > latest_irr_date:
                            latest_irr_date = current_date
                    
                    logger.info(f"Found IRR value: {irr_value}% with weight {weight} for portfolio fund {pf['id']}")
        
        # Calculate weighted average IRR
        if all_irr_values and all_weights:
            product_irr = sum(irr * weight for irr, weight in zip(all_irr_values, all_weights))
            logger.info(f"Calculated weighted product IRR: {product_irr}% from {len(all_irr_values)} IRR values")
        else:
            product_irr = 0
            logger.info("No valid IRR values found for calculation")
        
        return {
            "product_id": product_id,
            "irr": product_irr,  # Return as percentage
            "portfolio_fund_count": len(portfolio_funds_result.data),
            "total_invested": total_invested,
            "date": latest_irr_date.isoformat() if latest_irr_date else None
        }
        
    except Exception as e:
        logger.error(f"Error calculating product IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating product IRR: {str(e)}") 

@router.get("/analytics/client_risks")
async def get_client_risks(db = Depends(get_db)):
    """
    Calculate and return the weighted average risk for each client based on their investments.
    The risk is calculated as:
    1. Portfolio level: Weighted average of fund risks based on amount_invested
    2. product level: Weighted average of portfolio risks based on total investment
    3. Client level: Weighted average of product risks based on total investment
    """
    try:
        # Get all active clients
        clients_result = db.table("client_groups").select("*").eq("status", "active").execute()
        
        client_risks = []
        
        for client in clients_result.data:
            try:
                # Get all products for this client
                products_result = db.table("client_products")\
                    .select("*")\
                    .eq("client_id", client["id"])\
                    .eq("status", "active")\
                    .execute()
                
                if not products_result.data:
                    continue
                
                total_client_investment = 0
                weighted_risk_sum = 0
                
                for product in products_result.data:
                    # Get portfolio directly from client_products
                    if not product["portfolio_id"]:
                        continue
                    
                    product_investment = 0
                    product_risk_sum = 0
                    
                    # Get all funds in this portfolio
                    portfolio_funds_result = db.table("portfolio_funds")\
                        .select("available_funds_id, amount_invested")\
                        .eq("portfolio_id", product["portfolio_id"])\
                        .execute()
                    
                    if not portfolio_funds_result.data:
                        continue
                    
                    portfolio_investment = 0
                    portfolio_risk_sum = 0
                    
                    for pf in portfolio_funds_result.data:
                        # Get the fund's risk factor
                        fund_result = db.table("available_funds")\
                            .select("risk_factor")\
                            .eq("id", pf["available_funds_id"])\
                            .execute()
                        
                        if not fund_result.data or fund_result.data[0]["risk_factor"] is None:
                            continue
                            
                        amount_invested = pf["amount_invested"] or 0
                        risk_factor = fund_result.data[0]["risk_factor"]
                        
                        portfolio_investment += amount_invested
                        portfolio_risk_sum += risk_factor * amount_invested
                    
                    if portfolio_investment > 0:
                        portfolio_risk = portfolio_risk_sum / portfolio_investment
                        product_investment += portfolio_investment
                        product_risk_sum += portfolio_risk * portfolio_investment
                
                    if product_investment > 0:
                        product_risk = product_risk_sum / product_investment
                        total_client_investment += product_investment
                        weighted_risk_sum += product_risk * product_investment
                
                if total_client_investment > 0:
                    client_risk = weighted_risk_sum / total_client_investment
                    client_name = client["name"]
                    client_risks.append({
                        "client_id": client["id"],
                        "client_name": client_name,
                        "risk_score": round(client_risk, 2),
                        "total_investment": total_client_investment
                    })
            
            except Exception as e:
                logger.error(f"Error processing client {client['id']}: {str(e)}")
                continue
        
        return client_risks
        
    except Exception as e:
        logger.error(f"Error calculating client risks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") 

@router.get("/analytics/portfolio/{portfolio_id}/irr")
async def calculate_portfolio_irr(portfolio_id: int, db = Depends(get_db)):
    """
    Calculate the weighted average IRR for a specific portfolio.
    This is done by:
    1. Finding all portfolio funds for the portfolio
    2. For each portfolio fund, getting its most recent IRR value and amount invested
    3. Calculating weighted average IRR using amount_invested as weights
    """
    try:
        logger.info(f"Calculating IRR for portfolio {portfolio_id}")
        
        # Check if portfolio exists
        portfolio_check = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not portfolio_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        # Get all portfolio funds for the portfolio
        portfolio_funds_result = db.table("portfolio_funds").select("*").eq("portfolio_id", portfolio_id).execute()
        
        if not portfolio_funds_result.data:
            logger.info(f"No portfolio funds found for portfolio {portfolio_id}")
            return {"portfolio_id": portfolio_id, "irr": 0}
            
        all_irr_values = []
        all_weights = []  # Store amount_invested for each IRR value
        portfolio_fund_count = len(portfolio_funds_result.data)
        
        # For each portfolio fund, get the latest IRR value
        for fund in portfolio_funds_result.data:
            try:
                # Get the latest IRR value for this fund
                irr_result = db.table("irr_values")\
                    .select("irr_result")\
                    .eq("fund_id", fund["id"])\
                    .order("date", desc=True)\
                    .limit(1)\
                    .execute()
                
                if irr_result.data and irr_result.data[0]["irr_result"] is not None:
                    irr_value = float(irr_result.data[0]["irr_result"])
                    weight = float(fund["amount_invested"] or 0)
                    
                    all_irr_values.append(irr_value)
                    all_weights.append(weight)
                    logger.info(f"Added fund {fund['id']} IRR: {irr_value}% with weight {weight}")
            except Exception as e:
                logger.error(f"Error getting IRR for fund {fund['id']}: {str(e)}")
                continue
        
        # Calculate weighted average IRR
        if all_irr_values and all_weights:
            total_weight = sum(all_weights)
            if total_weight > 0:
                weighted_irr = sum(irr * (weight / total_weight) 
                                for irr, weight in zip(all_irr_values, all_weights))
                logger.info(f"Calculated weighted portfolio IRR: {weighted_irr}% from {len(all_irr_values)} funds")
            else:
                weighted_irr = 0
        else:
            weighted_irr = 0
        
        return {
            "portfolio_id": portfolio_id,
            "irr": weighted_irr
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating portfolio IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating portfolio IRR: {str(e)}") 