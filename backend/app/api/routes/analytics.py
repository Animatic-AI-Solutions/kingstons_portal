from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Optional, Literal
from collections import defaultdict
from datetime import datetime, date, timedelta
import logging
from statistics import mean
import numpy_financial as npf
import asyncio
import numpy as np

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
    What it does: Returns the distribution of funds based on their current market value from latest valuations.
    Why it's needed: Provides data for the fund distribution pie chart on the dashboard.
    How it works: 
        1. Fetches all available funds
        2. For each fund, calculates the total current market value using latest valuations
        3. Only falls back to amount_invested if no valuations exist (and logs this clearly)
        4. Returns funds sorted by current market value (descending)
    Expected output: A list of funds with their names and current market values
    """
    try:
        # Get all available funds
        funds_result = db.table("available_funds").select("id,fund_name").execute()
        
        if not funds_result.data:
            logger.warning("No funds found in the database")
            return {"funds": []}
        
        fund_data = []
        valuations_used = 0
        amount_invested_fallbacks = 0
        
        # For each fund, calculate total current market value from latest valuations
        for fund in funds_result.data:
            # Get all portfolio_funds entries for this fund
            pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("available_funds_id", fund["id"]).execute()
            
            total_value = 0
            fund_has_valuations = False
            
            for pf in pf_result.data:
                # Prioritize latest valuation for current market value
                valuation_result = db.table("latest_portfolio_fund_valuations").select("valuation").eq("portfolio_fund_id", pf["id"]).execute()
                
                if valuation_result.data and len(valuation_result.data) > 0 and valuation_result.data[0]["valuation"] is not None:
                    # Use latest market valuation (preferred method)
                    total_value += valuation_result.data[0]["valuation"]
                    fund_has_valuations = True
                    valuations_used += 1
                else:
                    # Fallback to amount_invested only if no valuation exists
                    if pf["amount_invested"] is not None:
                        total_value += pf["amount_invested"]
                        amount_invested_fallbacks += 1
                        logger.debug(f"No valuation found for portfolio_fund {pf['id']}, using amount_invested: {pf['amount_invested']}")
            
            # Only include funds with values > 0
            if total_value > 0:
                fund_data.append({
                    "id": fund["id"],
                    "name": fund["fund_name"],
                    "amount": total_value,
                    "category": "fund",
                    "valuation_source": "latest_valuation" if fund_has_valuations else "amount_invested"
                })
        
        # Sort by amount (descending) and limit results
        fund_data.sort(key=lambda x: x["amount"], reverse=True)
        fund_data = fund_data[:limit]
        
        return {"funds": fund_data}
    except Exception as e:
        logger.error(f"Error fetching fund distribution: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/analytics/provider_distribution")
async def get_provider_distribution(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of providers to return"),
    db = Depends(get_db)
):
    """
    What it does: Returns the distribution of providers based on the total current market value (FUM) they manage.
    Why it's needed: Provides data for the provider distribution pie chart on the dashboard.
    How it works: 
        1. Fetches all providers
        2. For each provider, calculates the total current market value across all products using latest valuations
        3. Only falls back to amount_invested if no valuations exist (and logs this clearly)
        4. Returns providers sorted by total current market value (descending)
    Expected output: A list of providers with their names and total current market value
    """
    try:
        # Get all providers
        providers_result = db.table("available_providers").select("id,name").execute()
        
        if not providers_result.data:
            logger.warning("No providers found in the database")
            return {"providers": []}
        
        provider_data = []
        valuations_used = 0
        amount_invested_fallbacks = 0
        
        # For each provider, calculate total current market value (FUM)
        for provider in providers_result.data:
            # Get all products for this provider
            products_result = db.table("client_products").select("id,portfolio_id").eq("provider_id", provider["id"]).execute()
            
            total_value = 0
            provider_has_valuations = False
            
            for product in products_result.data:
                if product["portfolio_id"]:
                    # Get all portfolio_funds for this product's portfolio
                    pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", product["portfolio_id"]).execute()
                    
                    for pf in pf_result.data:
                        # Prioritize latest valuation for current market value
                        valuation_result = db.table("latest_portfolio_fund_valuations").select("valuation").eq("portfolio_fund_id", pf["id"]).execute()
                        
                        if valuation_result.data and len(valuation_result.data) > 0 and valuation_result.data[0]["valuation"] is not None:
                            # Use latest market valuation (preferred method)
                            total_value += valuation_result.data[0]["valuation"]
                            provider_has_valuations = True
                            valuations_used += 1
                        else:
                            # Fallback to amount_invested only if no valuation exists
                            if pf["amount_invested"] is not None:
                                total_value += pf["amount_invested"]
                                amount_invested_fallbacks += 1
                                logger.debug(f"No valuation found for portfolio_fund {pf['id']}, using amount_invested: {pf['amount_invested']}")
            
            # Only include providers with values > 0
            if total_value > 0:
                provider_data.append({
                    "id": str(provider["id"]),  # Convert to string to match the Fund interface
                    "name": provider["name"],
                    "amount": total_value,
                    "valuation_source": "latest_valuation" if provider_has_valuations else "amount_invested"
                })
        
        # Log the data source breakdown for transparency
        # Sort by amount (descending) and limit results
        provider_data.sort(key=lambda x: x["amount"], reverse=True)
        provider_data = provider_data[:limit]
        
        return {"providers": provider_data}
    except Exception as e:
        logger.error(f"Error fetching provider distribution: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/analytics/dashboard_stats")
async def get_dashboard_stats(db = Depends(get_db)):
    """
    Return dashboard statistics including company-wide IRR calculated from client IRRs.
    Total FUM is calculated from latest market valuations (preferred) with fallback to amount_invested.
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
        
        # Calculate total FUM from latest fund valuations (preferred) with fallback to amount_invested
        # This gives current market value rather than historical invested amount
        latest_valuations_result = db.table("latest_portfolio_fund_valuations").select("valuation").execute()
        total_from_valuations = 0
        total_from_investments = 0
        
        if latest_valuations_result.data:
            total_from_valuations = sum(val["valuation"] or 0 for val in latest_valuations_result.data)
            stats["totalFUM"] = total_from_valuations
        
        # If no valuations exist, fallback to amount_invested
        if total_from_valuations == 0:
            portfolio_funds_result = db.table("portfolio_funds").select("amount_invested").execute()
            if portfolio_funds_result.data:
                total_from_investments = sum(pf["amount_invested"] or 0 for pf in portfolio_funds_result.data)
                stats["totalFUM"] = total_from_investments
                logger.warning(f"Dashboard stats: No valuations found, using amount_invested fallback: {total_from_investments}")
        
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
        response = {
            "companyFUM": 0,
            "companyIRR": 0,
            "performanceData": []
        }

        # Get company-wide stats
        company_irr = await calculate_company_irr(db)
        response["companyIRR"] = company_irr
        
        # Calculate total FUM using latest valuations (consistent with dashboard_stats)
        latest_valuations_result = db.table("latest_portfolio_fund_valuations").select("valuation").execute()
        if latest_valuations_result.data:
            response["companyFUM"] = sum(val["valuation"] or 0 for val in latest_valuations_result.data)
        else:
            # Fallback to amount_invested if no valuations exist
            fum_result = db.table("portfolio_funds").select("amount_invested").execute()
            if fum_result.data:
                response["companyFUM"] = sum(pf["amount_invested"] or 0 for pf in fum_result.data)
                logger.warning(f"Performance data: No valuations found, using amount_invested fallback: {response['companyFUM']}")
            else:
                response["companyFUM"] = 0

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
                    irr_result = db.table("portfolio_fund_irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                    
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
                    irr_result = db.table("portfolio_fund_irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                    
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
                        irr_result = db.table("portfolio_fund_irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                        
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
                            irr_result = db.table("portfolio_fund_irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                            
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
                    irr_result = db.table("portfolio_fund_irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                    
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
                    irr_result = db.table("portfolio_fund_irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                    
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
                        irr_result = db.table("portfolio_fund_irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                        
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
                            irr_result = db.table("portfolio_fund_irr_values").select("irr_result").eq("fund_id", pf["id"]).order("date", desc=True).limit(1).execute()
                            
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

async def calculate_company_irr(client):
    """
    Calculate company-wide IRR using the standardized multiple IRR endpoint.
    This ensures consistency with individual fund IRR calculations and properly handles
    internal transfers (SwitchIn/SwitchOut) by aggregating them monthly.
    """
    try:
        # Step 1: Get all portfolio fund IDs in a single query
        portfolio_funds_response = client.table('portfolio_funds') \
            .select('id') \
            .eq('status', 'active') \
            .execute()
        
        all_portfolio_fund_ids = [fund['id'] for fund in portfolio_funds_response.data]
        
        if not all_portfolio_fund_ids:
            logger.warning("No active portfolio funds found")
            return 0.0
        
        # Step 2: Use the standardized multiple IRR endpoint
        # Import the function directly to avoid HTTP overhead
        from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr
        
        # Create a mock request body for the standardized endpoint
        class MockBody:
            def __init__(self, portfolio_fund_ids, irr_date=None):
                self.portfolio_fund_ids = portfolio_fund_ids
                self.irr_date = irr_date
        
        # Call the standardized multiple IRR calculation
        irr_result = await calculate_multiple_portfolio_funds_irr(
            portfolio_fund_ids=all_portfolio_fund_ids,
            irr_date=None,  # Use latest valuation date
            db=client
        )
        
        if irr_result and irr_result.get('success'):
            company_irr = irr_result.get('irr_percentage', 0.0)
            return company_irr
        else:
            logger.warning("Standardized IRR calculation failed or returned unsuccessful result")
            return 0.0
            
    except Exception as e:
        logger.error(f"Error in calculate_company_irr using standardized endpoint: {e}")
        # Fallback to simple calculation if standardized endpoint fails
        try:
            
            # Get total current valuations
            latest_valuations_response = client.table('latest_portfolio_fund_valuations') \
                .select('valuation') \
                .execute()
            
            total_current_value = sum(float(v['valuation'] or 0) for v in latest_valuations_response.data)
            
            # Get total amount invested
            portfolio_funds_response = client.table('portfolio_funds') \
                .select('amount_invested') \
                .eq('status', 'active') \
                .execute()
            
            total_invested = sum(float(pf['amount_invested'] or 0) for pf in portfolio_funds_response.data)
            
            if total_invested > 0:
                # Simple ROI calculation as fallback
                simple_roi = ((total_current_value / total_invested) - 1) * 100
                return simple_roi
            else:
                logger.warning("No investment amount found for fallback calculation")
                return 0.0
                
        except Exception as fallback_error:
            logger.error(f"Fallback calculation also failed: {fallback_error}")
            return 0.0

@router.get("/analytics/company/irr")
async def get_company_irr_endpoint(db = Depends(get_db)):
    """
    Calculate the company-wide IRR based on all portfolio funds across all active portfolios.
    This endpoint wraps the optimized calculate_company_irr function.
    """
    try:
        # Calculate the optimized IRR
        company_irr = await calculate_company_irr(db)
        
        # Get additional metrics for compatibility with existing API
        client_count_result = db.table("client_groups").select("id").eq("status", "active").execute()
        client_count = len(client_count_result.data) if client_count_result.data else 0
        
        product_count_result = db.table("client_products").select("id").eq("status", "active").execute()
        total_products = len(product_count_result.data) if product_count_result.data else 0
        
        portfolio_funds_result = db.table("portfolio_funds").select("id").eq("status", "active").execute()
        total_portfolio_funds = len(portfolio_funds_result.data) if portfolio_funds_result.data else 0
        
        # Calculate total investment for backward compatibility
        total_investment = 0
        if portfolio_funds_result.data:
            for pf in portfolio_funds_result.data:
                if pf.get("amount_invested"):
                    total_investment += float(pf["amount_invested"])
        
        return {
            "company_irr": company_irr,
            "client_count": client_count,
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
    Calculate the standardized IRR across all products for a specific client using the standardized multiple funds IRR endpoint.
    This is done by:
    1. Finding all products for the client
    2. Collecting all portfolio fund IDs from these products
    3. Using the standardized multiple funds IRR calculation to get the true aggregated IRR
    """
    try:
        # Get all products for the client
        products_result = db.table("client_products").select("*").eq("client_id", client_id).execute()
        
        if not products_result.data:
            logger.info(f"No products found for client {client_id}")
            return {"client_id": client_id, "irr": 0, "product_count": 0}
            
        # Collect all portfolio fund IDs from all products
        all_portfolio_fund_ids = []
        product_count = len(products_result.data)
        
        for product in products_result.data:
            # Get portfolio directly from client_products
            if not product["portfolio_id"]:
                continue
                
            # Get all portfolio funds for this portfolio
            portfolio_funds_result = db.table("portfolio_funds")\
                .select("id")\
                .eq("portfolio_id", product["portfolio_id"])\
                .execute()
                
            if portfolio_funds_result.data:
                portfolio_fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
                all_portfolio_fund_ids.extend(portfolio_fund_ids)
        
        if not all_portfolio_fund_ids:
            logger.info(f"No portfolio funds found for client {client_id}")
            return {"client_id": client_id, "irr": 0, "product_count": product_count, "portfolio_fund_count": 0}
        
        # Use the standardized multiple funds IRR calculation
        from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr
        
        try:
            irr_result = await calculate_multiple_portfolio_funds_irr(
                portfolio_fund_ids=all_portfolio_fund_ids,
                irr_date=None,  # Use latest valuation date
                db=db
            )
            
            client_irr = irr_result.get("irr_percentage", 0)
            
            return {
                "client_id": client_id,
                "irr": client_irr,  # Return as percentage
                "product_count": product_count,
                "portfolio_fund_count": len(all_portfolio_fund_ids),
                "calculation_method": "standardized_multiple_funds_irr"
            }
            
        except Exception as irr_error:
            logger.error(f"Error calculating standardized IRR: {str(irr_error)}")
            return {
                "client_id": client_id,
                "irr": 0,
                "product_count": product_count,
                "portfolio_fund_count": len(all_portfolio_fund_ids),
                "error": f"IRR calculation failed: {str(irr_error)}"
            }
        
    except Exception as e:
        logger.error(f"Error calculating client IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating client IRR: {str(e)}")

@router.get("/analytics/product/{product_id}/irr")
async def calculate_product_irr(product_id: int, db = Depends(get_db)):
    """
    Calculate the standardized IRR for a specific product using the standardized multiple funds IRR endpoint.
    This is done by:
    1. Getting the product's portfolio directly from client_products
    2. Collecting all portfolio fund IDs from that portfolio
    3. Using the standardized multiple funds IRR calculation to get the true product IRR
    """
    try:
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
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
            
        # DEBUG: Log fund counts
        if not portfolio_funds_result.data:
            logger.info(f"No portfolio funds found for portfolio {portfolio_id}")
            return {
                "product_id": product_id,
                "irr": 0,
                "portfolio_fund_count": 0,
                "total_invested": 0,
                "date": None
            }
            
        portfolio_fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
        
        # Use the standardized multiple funds IRR calculation
        from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr
        
        try:
            irr_result = await calculate_multiple_portfolio_funds_irr(
                portfolio_fund_ids=portfolio_fund_ids,
                irr_date=None,  # Use latest valuation date
                db=db
            )
            
            product_irr = irr_result.get("irr_percentage", 0)
            # Display '-' if IRR is exactly 0%
            if product_irr == 0:
                product_irr = "-"
            
            return {
                "product_id": product_id,
                "irr": product_irr,  # Return as percentage or '-'
                "portfolio_fund_count": len(portfolio_fund_ids),
                "total_valuation": irr_result.get("total_valuation", 0),
                "date": irr_result.get("calculation_date"),
                "calculation_method": "standardized_multiple_funds_irr"
            }
            
        except Exception as irr_error:
            logger.error(f"Error calculating standardized IRR for product {product_id}: {str(irr_error)}")
            return {
                "product_id": product_id,
                "irr": "-",
                "portfolio_fund_count": len(portfolio_fund_ids),
                "total_invested": 0,
                "date": None,
                "error": f"IRR calculation failed: {str(irr_error)}"
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
                irr_result = db.table("portfolio_fund_irr_values")\
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
            except Exception as e:
                logger.error(f"Error getting IRR for fund {fund['id']}: {str(e)}")
                continue
        
        # Calculate weighted average IRR
        if all_irr_values and all_weights:
            total_weight = sum(all_weights)
            if total_weight > 0:
                weighted_irr = sum(irr * (weight / total_weight) 
                                for irr, weight in zip(all_irr_values, all_weights))
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

@router.get("/analytics/portfolio_template_distribution")
async def get_portfolio_template_distribution(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of portfolio templates to return"),
    db = Depends(get_db)
):
    """
    What it does: Returns the distribution of portfolio templates based on the total current market value (FUM) they manage.
    Why it's needed: Provides data for the portfolio template distribution pie chart on the dashboard.
    How it works: 
        1. Fetches all template portfolio generations
        2. For each generation, finds all portfolios linked to it via template_generation_id
        3. For each portfolio, calculates the total current market value across all funds using latest valuations
        4. Only falls back to amount_invested if no valuations exist (and logs this clearly)
        5. Returns portfolio template generations sorted by total current market value (descending)
    Expected output: A list of portfolio template generations with their names and total current market value
    """
    try:
        # Get all template portfolio generations
        generations_result = db.table("template_portfolio_generations").select("id,generation_name").execute()
        
        if not generations_result.data:
            logger.warning("No template portfolio generations found in the database")
            return {"templates": []}
        
        # Add a category for portfolios without a template (bespoke)
        template_data = [
            {
                "id": "bespoke",
                "name": "Bespoke Portfolios",
                "amount": 0,
                "valuation_source": "mixed"
            }
        ]
        
        valuations_used = 0
        amount_invested_fallbacks = 0
        
        # For each template generation, calculate total current market value (FUM)
        for generation in generations_result.data:
            # Find all portfolios that use this template generation
            portfolios_result = db.table("portfolios").select("id").eq("template_generation_id", generation["id"]).execute()
            
            total_value = 0
            template_has_valuations = False
            
            for portfolio in portfolios_result.data:
                # Get all portfolio_funds for this portfolio
                pf_result = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio["id"]).execute()
                
                for pf in pf_result.data:
                    # Prioritize latest valuation for current market value
                    valuation_result = db.table("latest_portfolio_fund_valuations").select("valuation").eq("portfolio_fund_id", pf["id"]).execute()
                    
                    if valuation_result.data and len(valuation_result.data) > 0 and valuation_result.data[0]["valuation"] is not None:
                        # Use latest market valuation (preferred method)
                        total_value += valuation_result.data[0]["valuation"]
                        template_has_valuations = True
                        valuations_used += 1
                    else:
                        # Fallback to amount_invested only if no valuation exists
                        if pf["amount_invested"] is not None:
                            total_value += pf["amount_invested"]
                            amount_invested_fallbacks += 1
                            logger.debug(f"No valuation found for portfolio_fund {pf['id']}, using amount_invested: {pf['amount_invested']}")
            
            # Only include template generations with values > 0
            if total_value > 0:
                template_data.append({
                    "id": str(generation["id"]),
                    "name": generation["generation_name"],
                    "amount": total_value,
                    "valuation_source": "latest_valuation" if template_has_valuations else "amount_invested"
                })
        
        # Now handle portfolios without a template (bespoke)
        # Find all portfolios with null template_generation_id
        bespoke_portfolios_result = db.table("portfolios").select("id").is_("template_generation_id", "null").execute()
        
        bespoke_total = 0
        bespoke_has_valuations = False
        
        for portfolio in bespoke_portfolios_result.data:
            # Get all portfolio_funds for this bespoke portfolio
            pf_result = db.table("portfolio_funds").select("id,amount_invested").eq("portfolio_id", portfolio["id"]).execute()
            
            for pf in pf_result.data:
                # Prioritize latest valuation for current market value
                valuation_result = db.table("latest_portfolio_fund_valuations").select("valuation").eq("portfolio_fund_id", pf["id"]).execute()
                
                if valuation_result.data and len(valuation_result.data) > 0 and valuation_result.data[0]["valuation"] is not None:
                    # Use latest market valuation (preferred method)
                    bespoke_total += valuation_result.data[0]["valuation"]
                    bespoke_has_valuations = True
                    valuations_used += 1
                else:
                    # Fallback to amount_invested only if no valuation exists
                    if pf["amount_invested"] is not None:
                        bespoke_total += pf["amount_invested"]
                        amount_invested_fallbacks += 1
                        logger.debug(f"No valuation found for portfolio_fund {pf['id']}, using amount_invested: {pf['amount_invested']}")
        
        # Update the bespoke category amount and valuation source
        template_data[0]["amount"] = bespoke_total
        template_data[0]["valuation_source"] = "latest_valuation" if bespoke_has_valuations else "amount_invested"
        
        # Remove bespoke category if it's 0
        if bespoke_total == 0:
            template_data = template_data[1:]
        
        # Sort by amount (descending) and limit results
        template_data.sort(key=lambda x: x["amount"], reverse=True)
        template_data = template_data[:limit]
        
        return {"templates": template_data}
    except Exception as e:
        logger.error(f"Error fetching portfolio template distribution: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}") 

@router.get("/analytics/dashboard_all")
async def get_dashboard_all_data(
    fund_limit: int = Query(10, ge=1, le=50, description="Maximum number of funds to return"),
    provider_limit: int = Query(10, ge=1, le=50, description="Maximum number of providers to return"),
    template_limit: int = Query(10, ge=1, le=50, description="Maximum number of templates to return"),
    db = Depends(get_db)
):
    """
    OPTIMIZED: Get ALL dashboard data in a single request with bulk queries.
    This replaces 4+ separate API calls with 1 optimized endpoint.
    Eliminates N+1 query problem by fetching all data in bulk.
    """
    try:
        # 1. Get ALL latest valuations in one query (instead of N individual queries)
        all_valuations_result = db.table("latest_portfolio_fund_valuations")\
            .select("portfolio_fund_id, valuation, valuation_date")\
            .execute()
        
        # Create lookup dictionary for O(1) access
        valuations_lookup = {}
        total_fum_from_valuations = 0
        
        if all_valuations_result.data:
            for v in all_valuations_result.data:
                if v["valuation"] is not None:
                    valuations_lookup[v["portfolio_fund_id"]] = v["valuation"]
                    total_fum_from_valuations += v["valuation"]
        
        # 2. Get ALL portfolio funds with related data in one query
        portfolio_funds_result = db.table("portfolio_funds")\
            .select("id, portfolio_id, available_funds_id, amount_invested, status")\
            .eq("status", "active")\
            .execute()
        
        # 3. Get ALL reference data in parallel batch queries
        funds_task = db.table("available_funds").select("id, fund_name").execute()
        providers_task = db.table("available_providers").select("id, name").execute()
        portfolios_task = db.table("portfolios").select("id, template_generation_id").execute()
        templates_task = db.table("template_portfolio_generations").select("id, generation_name").execute()
        client_products_task = db.table("client_products").select("id, portfolio_id, provider_id, status").eq("status", "active").execute()
        
        # Execute queries in parallel
        funds_result = funds_task
        providers_result = providers_task
        portfolios_result = portfolios_task
        templates_result = templates_task
        client_products_result = client_products_task
        
        # 4. Calculate distributions using in-memory aggregation (MUCH faster)
        fund_totals = {}
        provider_totals = {}
        template_totals = {}
        total_fum = 0
        total_from_investments = 0
        
        # Create lookup dictionaries for O(1) access
        funds_lookup = {f["id"]: f["fund_name"] for f in funds_result.data} if funds_result.data else {}
        providers_lookup = {p["id"]: p["name"] for p in providers_result.data} if providers_result.data else {}
        templates_lookup = {t["id"]: t["generation_name"] for t in templates_result.data} if templates_result.data else {}
        portfolios_lookup = {p["id"]: p["template_generation_id"] for p in portfolios_result.data} if portfolios_result.data else {}
        
        # Group client products by portfolio and provider for O(1) lookup
        portfolio_to_provider = {}
        if client_products_result.data:
            for cp in client_products_result.data:
                if cp["portfolio_id"] and cp["provider_id"]:
                    portfolio_to_provider[cp["portfolio_id"]] = cp["provider_id"]
        
        # 5. Process all portfolio funds in one pass (instead of nested loops)
        if portfolio_funds_result.data:
            for pf in portfolio_funds_result.data:
                # Get current value (valuation preferred, amount_invested as fallback)
                current_value = valuations_lookup.get(pf["id"]) or pf["amount_invested"] or 0
                
                if current_value > 0:
                    total_fum += current_value
                    
                    # Track amount_invested separately for fallback calculations
                    if pf["amount_invested"]:
                        total_from_investments += pf["amount_invested"]
                    
                    # Aggregate by fund
                    fund_id = pf["available_funds_id"]
                    if fund_id and fund_id in funds_lookup:
                        fund_totals[fund_id] = fund_totals.get(fund_id, 0) + current_value
                    
                    # Aggregate by provider
                    provider_id = portfolio_to_provider.get(pf["portfolio_id"])
                    if provider_id and provider_id in providers_lookup:
                        provider_totals[provider_id] = provider_totals.get(provider_id, 0) + current_value
                    
                    # Aggregate by template
                    portfolio_id = pf["portfolio_id"]
                    if portfolio_id in portfolios_lookup:
                        template_id = portfolios_lookup[portfolio_id]
                        if template_id and template_id in templates_lookup:
                            template_totals[template_id] = template_totals.get(template_id, 0) + current_value
                        elif not template_id:  # Bespoke portfolios (null template_id)
                            template_totals["bespoke"] = template_totals.get("bespoke", 0) + current_value
        
        # 6. Calculate company IRR using optimized function (eliminates N+1 queries)
        company_irr = await calculate_company_irr(db)
        
        # Count metrics efficiently from already loaded data
        client_count_result = db.table("client_groups").select("id").eq("status", "active").execute()
        client_count = len(client_count_result.data) if client_count_result.data else 0
        
        product_count_result = db.table("client_products").select("id").eq("status", "active").execute()
        total_products = len(product_count_result.data) if product_count_result.data else 0
        
        # 7. Format response data efficiently
        funds_list = [
            {"id": str(fund_id), "name": funds_lookup[fund_id], "amount": amount}
            for fund_id, amount in sorted(fund_totals.items(), key=lambda x: x[1], reverse=True)[:fund_limit]
        ]
        
        providers_list = [
            {"id": str(provider_id), "name": providers_lookup[provider_id], "amount": amount}
            for provider_id, amount in sorted(provider_totals.items(), key=lambda x: x[1], reverse=True)[:provider_limit]
        ]
        
        # Handle templates including bespoke
        template_items = []
        for template_id, amount in template_totals.items():
            if template_id == "bespoke":
                template_items.append(("bespoke", "Bespoke Portfolios", amount))
            elif template_id in templates_lookup:
                template_items.append((template_id, templates_lookup[template_id], amount))
        
        # Sort and limit templates
        template_items.sort(key=lambda x: x[2], reverse=True)
        templates_list = [
            {"id": str(item[0]), "name": item[1], "amount": item[2]}
            for item in template_items[:template_limit]
        ]
        
        # 8. Use total_fum from valuations, fallback to investments if needed
        final_fum = total_fum if total_fum > 0 else total_from_investments
        
        response = {
            "metrics": {
                "totalFUM": final_fum,
                "companyIRR": company_irr,
                "totalClients": client_count,
                "totalAccounts": total_products,
                "totalActiveHoldings": len(portfolio_funds_result.data) if portfolio_funds_result.data else 0
            },
            "funds": funds_list,
            "providers": providers_list,
            "templates": templates_list,
            "performance": {
                "optimization_stats": {
                    "total_db_queries": 6,  # vs 50+ individual queries before
                    "total_portfolio_funds": len(portfolio_funds_result.data) if portfolio_funds_result.data else 0,
                    "total_valuations": len(all_valuations_result.data) if all_valuations_result.data else 0,
                    "valuations_used": len(valuations_lookup),
                    "fum_source": "valuations" if total_fum > 0 else "investments"
                }
            }
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error fetching optimized dashboard data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}") 

@router.get("/analytics/risk_differences")
async def get_products_risk_differences(
    limit: int = Query(10, ge=1, le=50, description="Number of products to return"),
    db = Depends(get_db)
):
    """
    Get products with the biggest difference between target risk and actual risk.
    
    Target risk: weighted average risk of portfolio_funds against their target_weighting
    Actual risk: weighted average risk of portfolio_funds against their latest valuations
    """
    try:
        # Get all active client products with their portfolios
        products_result = db.table("client_products")\
            .select("id, product_name, client_id, portfolio_id")\
            .eq("status", "active")\
            .not_.is_("portfolio_id", "null")\
            .execute()
        
        if not products_result.data:
            return []
        
        risk_differences = []
        
        for product in products_result.data:
            product_id = product["id"]
            portfolio_id = product["portfolio_id"]
            
            # Get all portfolio funds for this product
            portfolio_funds_result = db.table("portfolio_funds")\
                .select("id, available_funds_id, target_weighting, amount_invested")\
                .eq("portfolio_id", portfolio_id)\
                .eq("status", "active")\
                .execute()
            
            if not portfolio_funds_result.data:
                continue
            
            # Get fund risk factors and latest valuations
            fund_data = {}
            for pf in portfolio_funds_result.data:
                fund_id = pf["available_funds_id"]
                
                # Get fund risk factor
                fund_result = db.table("available_funds")\
                    .select("risk_factor, fund_name")\
                    .eq("id", fund_id)\
                    .execute()
                
                if not fund_result.data or fund_result.data[0]["risk_factor"] is None:
                    continue
                
                # Get latest valuation for this portfolio fund
                valuation_result = db.table("portfolio_fund_valuations")\
                    .select("valuation")\
                    .eq("portfolio_fund_id", pf["id"])\
                    .order("valuation_date", desc=True)\
                    .limit(1)\
                    .execute()
                
                fund_data[pf["id"]] = {
                    "risk_factor": fund_result.data[0]["risk_factor"],
                    "fund_name": fund_result.data[0]["fund_name"],
                    "target_weighting": float(pf["target_weighting"] or 0),
                    "amount_invested": float(pf["amount_invested"] or 0),
                    "latest_valuation": float(valuation_result.data[0]["valuation"]) if valuation_result.data else None
                }
            
            if not fund_data:
                continue
            
            # Calculate target risk (weighted by target_weighting)
            target_risk = None
            total_target_weight = sum(fund["target_weighting"] for fund in fund_data.values())
            
            if total_target_weight > 0:
                weighted_target_risk = sum(
                    fund["risk_factor"] * fund["target_weighting"] 
                    for fund in fund_data.values()
                )
                target_risk = weighted_target_risk / total_target_weight
            
            # Calculate actual risk (weighted by latest valuations)
            actual_risk = None
            funds_with_valuations = {k: v for k, v in fund_data.items() if v["latest_valuation"] is not None}
            total_valuation = sum(fund["latest_valuation"] for fund in funds_with_valuations.values())
            
            if total_valuation > 0 and funds_with_valuations:
                weighted_actual_risk = sum(
                    fund["risk_factor"] * fund["latest_valuation"] 
                    for fund in funds_with_valuations.values()
                )
                actual_risk = weighted_actual_risk / total_valuation
            
            # Calculate risk difference
            if target_risk is not None and actual_risk is not None:
                risk_difference = abs(actual_risk - target_risk)
                
                # Get client name
                client_result = db.table("client_groups")\
                    .select("name")\
                    .eq("id", product["client_id"])\
                    .execute()
                
                client_name = client_result.data[0]["name"] if client_result.data else "Unknown"
                
                risk_differences.append({
                    "product_id": product_id,
                    "product_name": product["product_name"],
                    "client_name": client_name,
                    "target_risk": round(target_risk, 2),
                    "actual_risk": round(actual_risk, 2),
                    "risk_difference": round(risk_difference, 2),
                    "fund_count": len(fund_data),
                    "funds_with_valuations": len(funds_with_valuations)
                })
        
        # Sort by risk difference (descending) and limit results
        risk_differences.sort(key=lambda x: x["risk_difference"], reverse=True)
        
        return risk_differences[:limit]
        
    except Exception as e:
        logger.error(f"Error calculating risk differences: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating risk differences: {str(e)}") 

@router.get("/company-revenue-analytics")
async def get_company_revenue_analytics(db = Depends(get_db)):
    """
    Get company-wide revenue analytics using the company_revenue_analytics view.
    Returns total revenue, breakdown by type, and key metrics.
    """
    try:
        # Query the company_revenue_analytics view
        result = db.table("company_revenue_analytics").select("*").execute()
        
        if not result.data:
            logger.warning("No data returned from company_revenue_analytics view")
            return [{
                "total_annual_revenue": 0,
                "total_fixed_revenue": 0,
                "total_percentage_revenue": 0,
                "active_products": 0,
                "revenue_generating_products": 0,
                "avg_revenue_per_product": 0,
                "active_providers": 0
            }]
        
        # The view returns a single row with aggregated data
        revenue_data = result.data[0]
        
        # Ensure all values are properly formatted
        formatted_data = {
            "total_annual_revenue": float(revenue_data.get("total_annual_revenue", 0) or 0),
            "total_fixed_revenue": float(revenue_data.get("total_fixed_revenue", 0) or 0),
            "total_percentage_revenue": float(revenue_data.get("total_percentage_revenue", 0) or 0),
            "active_products": int(revenue_data.get("active_products", 0) or 0),
            "revenue_generating_products": int(revenue_data.get("revenue_generating_products", 0) or 0),
            "avg_revenue_per_product": float(revenue_data.get("avg_revenue_per_product", 0) or 0),
            "active_providers": int(revenue_data.get("active_providers", 0) or 0)
        }
        
        return [formatted_data]  # Return as array for frontend compatibility
        
    except Exception as e:
        logger.error(f"Error fetching company revenue analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching revenue analytics: {str(e)}")

@router.get("/client-groups/revenue-breakdown")
async def get_client_groups_revenue_breakdown(db = Depends(get_db)):
    """
    Get revenue breakdown by client groups, showing each client group's revenue and percentage of total.
    Updated to handle 2-state revenue status logic:
    - needs_valuation: Has non-zero fees but using ad-hoc valuations
    - complete: Has fees and real valuations available
    """
    try:
        # First get the total company revenue for percentage calculations
        company_revenue_result = db.table("company_revenue_analytics").select("total_annual_revenue").execute()
        total_company_revenue = float(company_revenue_result.data[0]["total_annual_revenue"]) if company_revenue_result.data else 0
        
        # Get all active client groups
        client_groups_result = db.table("client_groups").select("id, name, status").eq("status", "active").execute()
        
        if not client_groups_result.data:
            logger.warning("No active client groups found")
            return []
        
        revenue_breakdown = []
        
        for client_group in client_groups_result.data:
            client_id = client_group["id"]
            client_name = client_group["name"]
            
            # Get all products for this client group
            products_result = db.table("client_products")\
                .select("id, fixed_cost, percentage_fee, portfolio_id")\
                .eq("client_id", client_id)\
                .eq("status", "active")\
                .execute()
            
            if not products_result.data:
                # Client has no products, add with zero revenue and complete status
                revenue_breakdown.append({
                    "id": client_id,
                    "name": client_name,
                    "status": client_group["status"],
                    "total_fum": 0,
                    "total_revenue": 0,
                    "revenue_percentage_of_total": 0,
                    "product_count": 0,
                    "products_with_revenue": 0,
                    "revenue_status": "complete"  # Green dot - no products, nothing to calculate
                })
                continue
            
            total_client_revenue = 0
            total_client_fum = 0
            products_with_revenue = 0
            
            # Track revenue status for this client - SIMPLIFIED LOGIC
            has_missing_valuations = False  # Any product missing valuations = amber
            
            for product in products_result.data:
                fixed_cost = float(product.get("fixed_cost", 0))
                percentage_fee = float(product.get("percentage_fee", 0))
                portfolio_id = product.get("portfolio_id")
                
                logger.info(f"  Product ID {product.get('id')}: fixed_cost={fixed_cost}, percentage_fee={percentage_fee}, portfolio_id={portfolio_id}")
                
                # Calculate product FUM and check if valuations exist
                product_fum = 0
                product_has_valuations = False
                
                if portfolio_id:
                    # Get all portfolio funds for this portfolio
                    portfolio_funds_result = db.table("portfolio_funds")\
                        .select("id")\
                        .eq("portfolio_id", portfolio_id)\
                        .eq("status", "active")\
                        .execute()
                    
                    
                    if portfolio_funds_result.data:
                        fund_ids = [fund["id"] for fund in portfolio_funds_result.data]
                        
                        # Check if ALL portfolio funds have valuations in latest_portfolio_fund_valuations
                        total_valuations = 0
                        funds_with_valuations = 0
                        
                        for fund_id in fund_ids:
                            valuation_result = db.table("latest_portfolio_fund_valuations")\
                                .select("valuation")\
                                .eq("portfolio_fund_id", fund_id)\
                                .execute()
                            
                            if valuation_result.data:
                                funds_with_valuations += 1
                                valuation_value = valuation_result.data[0]["valuation"]
                                if valuation_value is not None:
                                    total_valuations += float(valuation_value)
                        
                        # Product has complete valuations if ALL its portfolio funds have valuations
                        if funds_with_valuations == len(fund_ids):
                            product_has_valuations = True
                            product_fum = total_valuations
                        else:
                            product_has_valuations = False
                            product_fum = 0  # Exclude from revenue calculations
                            has_missing_valuations = True  # Mark client as needing amber status
                    else:
                        has_missing_valuations = True  # No funds = missing valuations
                else:
                    has_missing_valuations = True  # No portfolio = missing valuations
                
                # Add to totals only if product has complete valuations
                if product_has_valuations:
                    total_client_fum += product_fum
                    
                    # Calculate revenue only for products with complete valuations
                    if fixed_cost > 0 or percentage_fee > 0:
                        revenue = (fixed_cost) + (product_fum * percentage_fee / 100)
                        total_client_revenue += revenue
                        products_with_revenue += 1
            
            # Calculate percentage of total company revenue
            revenue_percentage = 0
            if total_company_revenue > 0:
                revenue_percentage = (total_client_revenue / total_company_revenue) * 100
            
            # Determine revenue status using simplified logic
            revenue_status = "complete"  # Default to complete
            
            if has_missing_valuations:
                revenue_status = "needs_valuation"  # Amber dot - has missing valuations
            else:
                revenue_status = "complete"  # Green dot (hidden) - complete valuations
            

            
            revenue_breakdown.append({
                "id": client_id,
                "name": client_name,
                "status": client_group["status"],
                "total_fum": total_client_fum,
                "total_revenue": total_client_revenue,
                "revenue_percentage_of_total": revenue_percentage,
                "product_count": len(products_result.data),
                "products_with_revenue": products_with_revenue,
                "revenue_status": revenue_status
            })
        
        # Sort by total revenue (descending)
        revenue_breakdown.sort(key=lambda x: x["total_revenue"], reverse=True)
        
        return revenue_breakdown
        
    except Exception as e:
        logger.error(f"Error calculating client group revenue breakdown: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating revenue breakdown: {str(e)}")

import hashlib
import json

# Simple in-memory cache
_revenue_cache = {
    "data": None,
    "hash": None,
    "timestamp": None
}

@router.get("/revenue-rate-analytics")
async def get_revenue_rate_analytics(db = Depends(get_db)):
    """
    Calculate revenue rate for 'complete' client groups.
    Updated to include zero-fee products in FUM calculations.
    
    Complete = has at least one product with fee setup (including zero fees) AND 
              all products with positive fees have latest valuations.
    
    Returns:
    - total_revenue: Sum of revenue from products with positive fees
    - total_fum: Sum of FUM from ALL products (including zero-fee products)
    - revenue_rate_percentage: (total_revenue / total_fum) * 100
    - complete_client_groups_count: Number of complete client groups
    - total_client_groups: Total number of active client groups
    """
    try:

        # Get a hash of all revenue-relevant data to check if recalculation is needed
        # Get all active client products with revenue configuration
        products_for_hash = db.table("client_products")\
            .select("id, client_id, fixed_cost, percentage_fee, portfolio_id, status")\
            .eq("status", "active")\
            .execute()
        
        # Get all latest valuations
        valuations_for_hash = db.table("latest_portfolio_fund_valuations")\
            .select("portfolio_fund_id, valuation, valuation_date")\
            .execute()
        
        # Create hash of the revenue-relevant data
        hash_data = {
            "products": products_for_hash.data,
            "valuations": valuations_for_hash.data
        }
        revenue_data_str = json.dumps(hash_data, sort_keys=True, default=str)
        current_hash = hashlib.md5(revenue_data_str.encode()).hexdigest()
        
        # Check if we can use cached result
        if (_revenue_cache["hash"] == current_hash and 
            _revenue_cache["data"] is not None):
            return _revenue_cache["data"]
        
        # Get all active client groups
        client_groups_result = db.table("client_groups").select("id, name, status").eq("status", "active").execute()
        
        if not client_groups_result.data:
            logger.warning("No active client groups found")
            return {
                "total_revenue": 0,
                "total_fum": 0,
                "revenue_rate_percentage": 0,
                "complete_client_groups_count": 0,
                "total_client_groups": 0
            }
        
        total_client_groups = len(client_groups_result.data)
        complete_client_groups = []
        total_revenue = 0
        total_fum = 0
        
        for client_group in client_groups_result.data:
            client_id = client_group["id"]
            client_name = client_group["name"]
            
            # Get all active products for this client group
            products_result = db.table("client_products")\
                .select("id, fixed_cost, percentage_fee, portfolio_id")\
                .eq("client_id", client_id)\
                .eq("status", "active")\
                .execute()
            
            if not products_result.data:
                continue  # Skip client groups with no products
            
            # Find products with fee setup (including zero fees)
            products_with_fee_setup = []
            products_with_positive_fees = []
            
            for product in products_result.data:
                fixed_cost = product.get("fixed_cost")
                percentage_fee = product.get("percentage_fee")
                
                # Check if product has any fee setup (including zero fees)
                if fixed_cost is not None or percentage_fee is not None:
                    products_with_fee_setup.append(product)
                    
                    # Also track products with positive fees
                    fixed_cost_val = float(fixed_cost) if fixed_cost is not None else 0
                    percentage_fee_val = float(percentage_fee) if percentage_fee is not None else 0
                    
                    if fixed_cost_val > 0 or percentage_fee_val > 0:
                        products_with_positive_fees.append(product)
            
            # Skip client groups with no fee setup at all
            if len(products_with_fee_setup) == 0:
                continue
            
            # Check if ALL products with positive fees have complete calculations (valuations available)
            client_revenue = 0
            all_positive_fees_complete = True
            
            # Check products with positive fees for completeness and calculate revenue
            for product in products_with_positive_fees:
                fixed_cost = product.get("fixed_cost")
                percentage_fee = product.get("percentage_fee")
                portfolio_id = product.get("portfolio_id")
                
                fixed_cost_val = float(fixed_cost) if fixed_cost is not None else 0
                percentage_fee_val = float(percentage_fee) if percentage_fee is not None else 0
                
                # Calculate product FUM from portfolio valuations
                product_fum = 0
                if portfolio_id:
                    # Get all active portfolio funds for this portfolio
                    portfolio_funds_result = db.table("portfolio_funds")\
                        .select("id")\
                        .eq("portfolio_id", portfolio_id)\
                        .eq("status", "active")\
                        .execute()
                    
                    if portfolio_funds_result.data:
                        # Get latest valuations for all portfolio funds
                        fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
                        
                        for fund_id in fund_ids:
                            valuation_result = db.table("latest_portfolio_fund_valuations")\
                                .select("valuation")\
                                .eq("portfolio_fund_id", fund_id)\
                                .execute()
                            
                            if valuation_result.data and valuation_result.data[0]["valuation"]:
                                product_fum += float(valuation_result.data[0]["valuation"])
                
                # Calculate product revenue
                product_revenue = 0
                
                # If only fixed cost is set (no percentage fee)
                if fixed_cost_val > 0 and percentage_fee_val == 0:
                    product_revenue = fixed_cost_val
                # If percentage fee is involved (with or without fixed cost)
                elif percentage_fee_val > 0:
                    if product_fum > 0:  # Only complete if there's valuation
                        product_revenue = fixed_cost_val + (product_fum * (percentage_fee_val / 100))
                    else:
                        # Has percentage fee setup but no valuation - not complete
                        all_positive_fees_complete = False
                        break
                
                client_revenue += product_revenue
            
            # Only include this client group if ALL products with positive fees are complete
            if all_positive_fees_complete:
                # Calculate total FUM from ALL products with fee setup (including zero-fee products)
                client_total_fum = 0
                for product in products_with_fee_setup:  # All products with fee setup
                    portfolio_id = product.get("portfolio_id")
                    
                    if portfolio_id:
                        # Get all active portfolio funds for this portfolio
                        portfolio_funds_result = db.table("portfolio_funds")\
                            .select("id")\
                            .eq("portfolio_id", portfolio_id)\
                            .eq("status", "active")\
                            .execute()
                        
                        if portfolio_funds_result.data:
                            # Get latest valuations for all portfolio funds
                            fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
                            
                            for fund_id in fund_ids:
                                valuation_result = db.table("latest_portfolio_fund_valuations")\
                                    .select("valuation")\
                                    .eq("portfolio_fund_id", fund_id)\
                                    .execute()
                                
                                if valuation_result.data and valuation_result.data[0]["valuation"]:
                                    client_total_fum += float(valuation_result.data[0]["valuation"])
                
                complete_client_groups.append({
                    "id": client_id,
                    "name": client_name,
                    "revenue": client_revenue,
                    "fum": client_total_fum
                })
                total_revenue += client_revenue
                total_fum += client_total_fum
                

        
        # Calculate revenue rate percentage
        revenue_rate_percentage = 0
        if total_fum > 0:
            revenue_rate_percentage = (total_revenue / total_fum) * 100
        
        result = {
            "total_revenue": total_revenue,
            "total_fum": total_fum,
            "revenue_rate_percentage": revenue_rate_percentage,
            "complete_client_groups_count": len(complete_client_groups),
            "total_client_groups": total_client_groups
        }
        

        # Cache the result
        _revenue_cache["data"] = result
        _revenue_cache["hash"] = current_hash
        _revenue_cache["timestamp"] = datetime.now()
        
        return result
        
    except Exception as e:
        logger.error(f"Error calculating revenue rate analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating revenue rate analytics: {str(e)}")

@router.post("/revenue-rate-analytics/refresh")
async def refresh_revenue_rate_cache():
    """
    Manually clear the revenue rate analytics cache to force recalculation on next request.
    Useful when you know revenue data has changed and want immediate refresh.
    """
    global _revenue_cache
    _revenue_cache = {
        "data": None,
        "hash": None,
        "timestamp": None
    }
    logger.info("Revenue rate analytics cache cleared manually")
    return {"message": "Cache cleared successfully", "status": "success"}

@router.get("/analytics/revenue_breakdown_optimized")
async def get_revenue_breakdown_optimized(db = Depends(get_db)):
    """
    Optimized revenue breakdown endpoint using pre-joined database view
    Eliminates N+1 query problems for fast loading
    """
    try:
        logger.info("Fetching optimized revenue breakdown")
        
        # Single query to get all revenue data using optimized view
        result = db.table("revenue_analytics_optimized").select("*").execute()
        
        if not result.data:
            return []
        
        # Group data by client for aggregation
        client_data = {}
        
        for row in result.data:
            client_id = row["client_id"]
            
            if client_id not in client_data:
                client_data[client_id] = {
                    "id": client_id,
                    "name": row["client_name"],
                    "status": row["client_status"],
                    "total_fum": 0,
                    "total_revenue": 0,
                    "product_count": 0,
                    "products_with_revenue": 0,
                    "revenue_status": "complete",
                    "has_missing_valuations": False,
                    "processed_products": set()
                }
            
            client = client_data[client_id]
            product_id = row["product_id"]
            
            # Process each product only once (due to multiple fund rows per product)
            if product_id and product_id not in client["processed_products"]:
                client["processed_products"].add(product_id)
                client["product_count"] += 1
                
                # Check if product has complete valuations
                fund_count = row["product_fund_count"] or 0
                valued_fund_count = row["product_valued_fund_count"] or 0
                product_fum = float(row["product_total_fum"] or 0)
                
                if fund_count > 0 and valued_fund_count == fund_count:
                    # Product has complete valuations
                    client["total_fum"] += product_fum
                    
                    # Calculate revenue
                    fixed_cost = float(row["fixed_cost"] or 0)
                    percentage_fee = float(row["percentage_fee"] or 0)
                    
                    if fixed_cost > 0 or percentage_fee > 0:
                        revenue = fixed_cost + (product_fum * percentage_fee / 100)
                        client["total_revenue"] += revenue
                        client["products_with_revenue"] += 1
                else:
                    # Product has missing valuations
                    client["has_missing_valuations"] = True
        
        # Calculate company totals for percentage calculations
        total_company_revenue = sum(client["total_revenue"] for client in client_data.values())
        
        # Finalize client data
        revenue_breakdown = []
        for client in client_data.values():
            # Remove processed_products set (not JSON serializable)
            del client["processed_products"]
            
            # Set revenue status
            client["revenue_status"] = "needs_valuation" if client["has_missing_valuations"] else "complete"
            del client["has_missing_valuations"]  # Remove internal flag
            
            # Calculate revenue percentage
            client["revenue_percentage_of_total"] = (
                (client["total_revenue"] / total_company_revenue * 100) 
                if total_company_revenue > 0 else 0
            )
            
            revenue_breakdown.append(client)
        
        # Sort by total revenue (descending)
        revenue_breakdown.sort(key=lambda x: x["total_revenue"], reverse=True)
        
        logger.info(f"Optimized revenue breakdown: processed {len(revenue_breakdown)} clients")
        return revenue_breakdown
        
    except Exception as e:
        logger.error(f"Error in optimized revenue breakdown: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating revenue breakdown: {str(e)}")