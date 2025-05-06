from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Optional, Literal
from collections import defaultdict
from datetime import datetime, timedelta
import logging
from statistics import mean

from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def serialize_datetime(dt):
    """Helper function to serialize datetime objects to ISO format strings"""
    if isinstance(dt, (datetime, date)):
        return dt.isoformat()
    return dt

@router.get("/analytics/dashboard_stats")
async def get_dashboard_stats(db = Depends(get_db)):
    """
    Return dashboard statistics including company-wide IRR calculated from client IRRs.
    """
    try:
        stats = {
            "totalFUM": 0,
            "companyIRR": 0,
            "totalproducts": 0,
            "totalClients": 0,
            "totalPortfolios": 0
        }
        
        # Get company-wide IRR using our new calculation method
        company_irr_result = await calculate_company_irr(db)
        stats["companyIRR"] = company_irr_result["company_irr"]
        stats["totalClients"] = company_irr_result["client_count"]
        stats["totalproducts"] = company_irr_result["total_products"]
        
        # Calculate total FUM from portfolio funds
        portfolio_funds_result = db.table("portfolio_funds").select("amount_invested").execute()
        if portfolio_funds_result.data:
            stats["totalFUM"] = sum(pf["amount_invested"] or 0 for pf in portfolio_funds_result.data)
        
        # Get total portfolios
        portfolios_result = db.table("portfolios").select("id").execute()
        if portfolios_result.data:
            stats["totalPortfolios"] = len(portfolios_result.data)
        
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
                # Get product holdings and their portfolio funds
                holdings_result = db.table("product_holdings").select("portfolio_id").eq("client_product_id", product["id"]).execute()
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                
                for holding in holdings_result.data:
                    if holding["portfolio_id"]:
                        pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", holding["portfolio_id"]).execute()
                        
                        for pf in pf_result.data:
                            irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                            
                            if irr_result.data and pf["amount_invested"]:
                                total_fum += pf["amount_invested"]
                                weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                                total_weight += pf["amount_invested"]
                
                if total_weight > 0:
                    # Get client name for product
                    client_result = db.table("clients").select("name").eq("id", product["client_id"]).execute()
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
            clients_result = db.table("clients").select("*").execute()
            
            for client in clients_result.data:
                # Get client products
                products_result = db.table("client_products").select("id").eq("client_id", client["id"]).execute()
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                earliest_start_date = None
                
                for product in products_result.data:
                    # Get product holdings and their portfolio funds
                    holdings_result = db.table("product_holdings").select("portfolio_id,start_date").eq("client_product_id", product["id"]).execute()
                    
                    for holding in holdings_result.data:
                        if holding["portfolio_id"]:
                            pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", holding["portfolio_id"]).execute()
                            
                            for pf in pf_result.data:
                                irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                                
                                if irr_result.data and pf["amount_invested"]:
                                    total_fum += pf["amount_invested"]
                                    weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                                    total_weight += pf["amount_invested"]
                                    
                                    if not earliest_start_date or (holding["start_date"] and holding["start_date"] < earliest_start_date):
                                        earliest_start_date = holding["start_date"]
                
                if total_weight > 0:
                    response["performanceData"].append({
                        "id": client["id"],
                        "name": client["name"],
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
                holdings_result = db.table("product_holdings").select("portfolio_id").eq("client_product_id", product["id"]).execute()
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                        
                for holding in holdings_result.data:
                    if holding["portfolio_id"]:
                        pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", holding["portfolio_id"]).execute()
                        
                    for pf in pf_result.data:
                        irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                            
                        if irr_result.data and pf["amount_invested"]:
                            total_fum += pf["amount_invested"]
                            weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                            total_weight += pf["amount_invested"]
                
                if total_weight > 0:
                    client_result = db.table("clients").select("name").eq("id", product["client_id"]).execute()
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
            clients_result = db.table("clients").select("*").execute()
            for client in clients_result.data:
                products_result = db.table("client_products").select("id").eq("client_id", client["id"]).execute()
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                earliest_start_date = None
                
                for product in products_result.data:
                    holdings_result = db.table("product_holdings").select("portfolio_id,start_date").eq("client_product_id", product["id"]).execute()
                    
                    for holding in holdings_result.data:
                        if holding["portfolio_id"]:
                            pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", holding["portfolio_id"]).execute()
                            
                            for pf in pf_result.data:
                                irr_result = db.table("irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                                
                                if irr_result.data and pf["amount_invested"]:
                                    total_fum += pf["amount_invested"]
                                    weighted_irr += (irr_result.data[0]["irr_result"] * pf["amount_invested"])
                                    total_weight += pf["amount_invested"]
                                    
                                    if not earliest_start_date or (holding["start_date"] and holding["start_date"] < earliest_start_date):
                                        earliest_start_date = holding["start_date"]
                
                if total_weight > 0:
                    all_performers.append({
                        "id": client["id"],
                        "name": client["name"],
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
    What it does: Generates analytics data showing the number of clients using each product, categorized by client relationship type.
    Why it's needed: Provides business insights on product distribution across different client relationship types.
    How it works:
        1. Retrieves all active products
        2. Retrieves all clients and their relationship types
        3. Retrieves all client-product associations
        4. Builds a matrix of relationship types and product names with counts
        5. Returns structured data for easy visualization
    Expected output: A JSON object with:
        - "relationships": Array of all unique client relationship types
        - "products": Array of all active product names
        - "data": Array of objects, each containing:
            - "relationship": A relationship type
            - "counts": Object mapping product names to client counts
    
    Example output:
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
        # Get all active products
        products_result = await db.table("available_products").select("id", "name").execute()
        
        if not products_result.data:
            return {
                "relationships": [],
                "products": [],
                "data": []
            }
        
        # Get all clients and their relationship types
        clients_result = await db.table("clients").select("id", "relationship_type").execute()
        
        if not clients_result.data:
            return {
                "relationships": [],
                "products": [],
                "data": []
            }
        
        # Get all client-product associations
        client_products_result = await db.table("client_products").select("*").execute()
        
        # Build the response
        relationships = list(set(client["relationship_type"] for client in clients_result.data if client["relationship_type"]))
        products = [product["name"] for product in products_result.data]
        
        data = []
        for relationship in relationships:
            counts = {product: 0 for product in products}
            for client in clients_result.data:
                if client["relationship_type"] == relationship:
                    for cp in client_products_result.data:
                        if cp["client_id"] == client["id"]:
                            product = next((p["name"] for p in products_result.data if p["id"] == cp["product_id"]), None)
                            if product:
                                counts[product] += 1
            data.append({
                "relationship": relationship,
                "counts": counts
            })
        
        return {
            "relationships": relationships,
            "products": products,
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
    Calculate the company-wide IRR using a weighted average of client IRRs,
    where each client's weight is proportional to their total investment amount.
    This provides a more accurate view of the company's performance by giving
    more weight to larger investors.
    """
    try:
        logger.info("Calculating company-wide IRR")
        
        # Get all clients
        clients_result = db.table("clients").select("id").execute()
        
        if not clients_result.data:
            logger.info("No clients found")
            return {
                "company_irr": 0,
                "client_count": 0,
                "total_products": 0,
                "total_portfolio_funds": 0,
                "total_investment": 0
            }
            
        client_irrs = []
        client_investments = []  # Store total investment for each client
        total_products = 0
        total_portfolio_funds = 0
        
        # Calculate IRR and total investment for each client
        for client in clients_result.data:
            try:
                # Get client's IRR and portfolio fund count
                client_result = await calculate_client_irr(client["id"], db)
                
                # Get all products for this client to sum up total investment
                products_result = db.table("client_products").select("id").eq("client_id", client["id"]).execute()
                client_total_investment = 0
                
                for product in products_result.data:
                    # Get all holdings for this product
                    holdings_result = db.table("product_holdings")\
                        .select("portfolio_id")\
                        .eq("client_product_id", product["id"])\
                        .execute()
                        
                    for holding in holdings_result.data:
                        if holding["portfolio_id"]:
                            # Get all portfolio funds for this portfolio
                            portfolio_funds_result = db.table("portfolio_funds")\
                                .select("amount_invested")\
                                .eq("portfolio_id", holding["portfolio_id"])\
                                .execute()
                                
                            # Sum up all investments in this portfolio
                            portfolio_investment = sum(float(pf["amount_invested"] or 0) 
                                                    for pf in portfolio_funds_result.data)
                            client_total_investment += portfolio_investment
                
                if client_result["irr"] != 0 and client_total_investment > 0:
                    client_irrs.append(client_result["irr"])
                    client_investments.append(client_total_investment)
                    total_products += client_result["product_count"]
                    total_portfolio_funds += client_result["portfolio_fund_count"]
                    logger.info(f"Added client {client['id']} IRR: {client_result['irr']}% "
                              f"with investment {client_total_investment}")
            except Exception as e:
                logger.error(f"Error calculating IRR for client {client['id']}: {str(e)}")
                continue
        
        # Calculate company-wide IRR as weighted average of client IRRs
        if client_irrs and client_investments:
            total_investment = sum(client_investments)
            if total_investment > 0:
                company_irr = sum(irr * (investment / total_investment) 
                                for irr, investment in zip(client_irrs, client_investments))
                logger.info(f"Calculated weighted company IRR: {company_irr}% "
                          f"from {len(client_irrs)} clients with total investment {total_investment}")
            else:
                company_irr = 0
        else:
            company_irr = 0
            total_investment = 0
        
        return {
            "company_irr": company_irr,
            "client_count": len(client_irrs),
            "total_products": total_products,
            "total_portfolio_funds": total_portfolio_funds,
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
    2. For each product, finding its portfolio
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
            # Get all holdings for this product (both active and dormant)
            holdings_result = db.table("product_holdings")\
                .select("portfolio_id")\
                .eq("client_product_id", product["id"])\
                .execute()
                
            if not holdings_result.data:
                continue
                
            for holding in holdings_result.data:
                if not holding["portfolio_id"]:
                    continue
                    
                # Get all portfolio funds for this portfolio
                portfolio_funds_result = db.table("portfolio_funds")\
                    .select("id", "amount_invested")\
                    .eq("portfolio_id", holding["portfolio_id"])\
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
    1. Finding the product's current portfolio through product_holdings
    2. For each portfolio fund in that portfolio:
       - Get its most recent IRR value
       - Weight it by (amount_invested in this fund / total amount invested in all funds in this portfolio)
    3. Sum the weighted IRRs to get the product's total IRR
    """
    try:
        logger.info(f"Calculating IRR for product {product_id}")
        
        # Get the active holding for this product
        holdings_result = db.table("product_holdings")\
            .select("portfolio_id")\
            .eq("client_product_id", product_id)\
            .eq("status", "active")\
            .execute()
            
        if not holdings_result.data:
            logger.info(f"No active holding found for product {product_id}")
            return {
                "product_id": product_id,
                "irr": 0,
                "portfolio_fund_count": 0,
                "total_invested": 0,
                "date": None
            }
            
        portfolio_id = holdings_result.data[0]["portfolio_id"]
        if not portfolio_id:
            logger.info(f"No portfolio assigned to active holding for product {product_id}")
            return {
                "product_id": product_id,
                "irr": 0,
                "portfolio_fund_count": 0,
                "total_invested": 0,
                "date": None
            }
            
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
        clients_result = db.table("clients").select("*").eq("status", "active").execute()
        
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
                    # Get all holdings for this product
                    holdings_result = db.table("product_holdings")\
                        .select("portfolio_id")\
                        .eq("client_product_id", product["id"])\
                        .eq("status", "active")\
                        .execute()
                    
                    if not holdings_result.data:
                        continue
                    
                    product_investment = 0
                    product_risk_sum = 0
                    
                    for holding in holdings_result.data:
                        if not holding["portfolio_id"]:
                            continue
                            
                        # Get all funds in this portfolio
                        portfolio_funds_result = db.table("portfolio_funds")\
                            .select("available_funds_id, amount_invested")\
                            .eq("portfolio_id", holding["portfolio_id"])\
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
                    client_risks.append({
                        "client_id": client["id"],
                        "client_name": client["name"],
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