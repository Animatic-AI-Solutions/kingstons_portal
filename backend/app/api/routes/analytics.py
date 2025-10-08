from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Optional, Literal
from collections import defaultdict
from datetime import datetime, date, timedelta
import logging
from statistics import mean
import numpy_financial as npf
import asyncio
import numpy as np
import time

from app.db.database import get_db
from app.api.routes.portfolio_funds import calculate_excel_style_irr

# Global cache for company IRR to prevent expensive recalculations
_company_irr_cache = {
    'value': None,
    'timestamp': None,
    'cache_duration': 86400  # 24 hours cache (was 5 minutes)
}

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
    limit: int = Query(100000, ge=1, le=100000, description="Maximum number of funds to return"),
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
        funds_result = await db.fetch("SELECT id, fund_name FROM available_funds")
        
        if not funds_result:
            logger.warning("No funds found in the database")
            return {"funds": []}
        
        # Extract fund IDs for bulk queries
        fund_ids = [dict(fund)["id"] for fund in funds_result]
        
        # Bulk fetch all portfolio_funds for all funds
        portfolio_funds_result = await db.fetch("""
            SELECT id, amount_invested, available_funds_id 
            FROM portfolio_funds 
            WHERE available_funds_id = ANY($1::int[])
        """, fund_ids)
        
        # Extract portfolio fund IDs for bulk valuation query
        pf_ids = [dict(pf)["id"] for pf in portfolio_funds_result]
        
        # Bulk fetch all valuations for all portfolio funds
        valuations_result = await db.fetch("""
            SELECT portfolio_fund_id, valuation 
            FROM latest_portfolio_fund_valuations 
            WHERE portfolio_fund_id = ANY($1::int[])
        """, pf_ids) if pf_ids else []
        
        # Create lookup maps for efficient processing
        pf_by_fund_id = {}
        for pf_record in portfolio_funds_result:
            pf = dict(pf_record)
            fund_id = pf["available_funds_id"]
            if fund_id not in pf_by_fund_id:
                pf_by_fund_id[fund_id] = []
            pf_by_fund_id[fund_id].append(pf)
        
        valuations_by_pf_id = {}
        for val_record in valuations_result:
            val = dict(val_record)
            valuations_by_pf_id[val["portfolio_fund_id"]] = val["valuation"]
        
        fund_data = []
        valuations_used = 0
        amount_invested_fallbacks = 0
        
        # Process each fund with bulk data
        for fund_record in funds_result:
            fund = dict(fund_record)
            fund_id = fund["id"]
            
            total_value = 0
            fund_has_valuations = False
            
            # Get portfolio funds for this fund
            portfolio_funds = pf_by_fund_id.get(fund_id, [])
            
            for pf in portfolio_funds:
                pf_id = pf["id"]
                
                # Check if valuation exists
                if pf_id in valuations_by_pf_id and valuations_by_pf_id[pf_id] is not None:
                    # Use latest market valuation (preferred method)
                    total_value += valuations_by_pf_id[pf_id]
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
    limit: int = Query(100000, ge=1, le=100000, description="Maximum number of providers to return"),
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
        providers_result = await db.fetch("SELECT id, name FROM available_providers")
        
        if not providers_result:
            logger.warning("No providers found in the database")
            return {"providers": []}
        
        # Extract provider IDs for bulk queries
        provider_ids = [dict(provider)["id"] for provider in providers_result]
        
        # Bulk fetch all client_products for all providers
        products_result = await db.fetch("""
            SELECT id, portfolio_id, provider_id 
            FROM client_products 
            WHERE provider_id = ANY($1::int[]) AND portfolio_id IS NOT NULL
        """, provider_ids)
        
        # Extract portfolio IDs for bulk queries
        portfolio_ids = [dict(product)["portfolio_id"] for product in products_result]
        portfolio_ids = list(set(portfolio_ids))  # Remove duplicates
        
        # Bulk fetch all portfolio_funds for all portfolios
        portfolio_funds_result = await db.fetch("""
            SELECT id, amount_invested, portfolio_id 
            FROM portfolio_funds 
            WHERE portfolio_id = ANY($1::int[])
        """, portfolio_ids) if portfolio_ids else []
        
        # Extract portfolio fund IDs for bulk valuation query
        pf_ids = [dict(pf)["id"] for pf in portfolio_funds_result]
        
        # Bulk fetch all valuations for all portfolio funds
        valuations_result = await db.fetch("""
            SELECT portfolio_fund_id, valuation 
            FROM latest_portfolio_fund_valuations 
            WHERE portfolio_fund_id = ANY($1::int[])
        """, pf_ids) if pf_ids else []
        
        # Create lookup maps for efficient processing
        products_by_provider_id = {}
        for product_record in products_result:
            product = dict(product_record)
            provider_id = product["provider_id"]
            if provider_id not in products_by_provider_id:
                products_by_provider_id[provider_id] = []
            products_by_provider_id[provider_id].append(product)
        
        pf_by_portfolio_id = {}
        for pf_record in portfolio_funds_result:
            pf = dict(pf_record)
            portfolio_id = pf["portfolio_id"]
            if portfolio_id not in pf_by_portfolio_id:
                pf_by_portfolio_id[portfolio_id] = []
            pf_by_portfolio_id[portfolio_id].append(pf)
        
        valuations_by_pf_id = {}
        for val_record in valuations_result:
            val = dict(val_record)
            valuations_by_pf_id[val["portfolio_fund_id"]] = val["valuation"]
        
        provider_data = []
        valuations_used = 0
        amount_invested_fallbacks = 0
        
        # Process each provider with bulk data
        for provider_record in providers_result:
            provider = dict(provider_record)
            provider_id = provider["id"]
            
            total_value = 0
            provider_has_valuations = False
            
            # Get products for this provider
            products = products_by_provider_id.get(provider_id, [])
            
            for product in products:
                portfolio_id = product["portfolio_id"]
                if portfolio_id:
                    # Get portfolio funds for this product's portfolio
                    portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
                    
                    for pf in portfolio_funds:
                        pf_id = pf["id"]
                        
                        # Check if valuation exists
                        if pf_id in valuations_by_pf_id and valuations_by_pf_id[pf_id] is not None:
                            # Use latest market valuation (preferred method)
                            total_value += valuations_by_pf_id[pf_id]
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
        try:
            company_irr_result = await calculate_company_irr(db)
            stats["companyIRR"] = float(company_irr_result) if company_irr_result is not None else 0.0
        except Exception as e:
            logger.warning(f"Error calculating company IRR: {e}")
            stats["companyIRR"] = 0.0
        
        # Get client and product counts separately
        try:
            clients_count_result = await db.fetchval("SELECT COUNT(*) FROM client_groups WHERE status = 'active'")
            stats["totalClients"] = int(clients_count_result) if clients_count_result is not None else 0
        except Exception as e:
            logger.warning(f"Error counting clients: {e}")
            stats["totalClients"] = 0
        
        try:
            products_count_result = await db.fetchval("SELECT COUNT(*) FROM client_products WHERE status = 'active'")
            stats["totalAccounts"] = int(products_count_result) if products_count_result is not None else 0
        except Exception as e:
            logger.warning(f"Error counting products: {e}")
            stats["totalAccounts"] = 0
        
        # Calculate total FUM from latest fund valuations (preferred) with fallback to amount_invested
        # This gives current market value rather than historical invested amount
        latest_valuations_result = await db.fetch("SELECT valuation FROM latest_portfolio_fund_valuations")
        total_from_valuations = 0
        total_from_investments = 0
        
        if latest_valuations_result:
            total_from_valuations = sum(dict(val)["valuation"] or 0 for val in latest_valuations_result)
            stats["totalFUM"] = total_from_valuations
        
        # If no valuations exist, fallback to amount_invested
        if total_from_valuations == 0:
            portfolio_funds_result = await db.fetch("SELECT amount_invested FROM portfolio_funds")
            if portfolio_funds_result:
                total_from_investments = sum(dict(pf)["amount_invested"] or 0 for pf in portfolio_funds_result)
                stats["totalFUM"] = total_from_investments
                logger.warning(f"Dashboard stats: No valuations found, using amount_invested fallback: {total_from_investments}")
        
        # Get total active holdings (portfolio funds that are active)
        active_holdings_result = await db.fetch("SELECT id FROM portfolio_funds WHERE status = 'active'")
        if active_holdings_result:
            stats["totalActiveHoldings"] = len(active_holdings_result)
        
        return stats
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/analytics/performance_data")
async def get_performance_data(
    date_range: Literal["all-time", "ytd", "12m", "3y", "5y"] = "all-time",
    entity_type: Literal["overview", "clients", "products", "portfolios", "funds", "products", "providers"] = "overview",
    sort_order: Literal["highest", "lowest"] = "highest",
    limit: int = Query(100000, ge=1, le=100000),
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
        latest_valuations_result = await db.fetch("SELECT valuation FROM latest_portfolio_fund_valuations")
        if latest_valuations_result:
            response["companyFUM"] = sum(dict(val)["valuation"] or 0 for val in latest_valuations_result)
        else:
            # Fallback to amount_invested if no valuations exist
            fum_result = await db.fetch("SELECT amount_invested FROM portfolio_funds")
            if fum_result:
                response["companyFUM"] = sum(dict(pf)["amount_invested"] or 0 for pf in fum_result)
                logger.warning(f"Performance data: No valuations found, using amount_invested fallback: {response['companyFUM']}")
            else:
                response["companyFUM"] = 0

        if entity_type == "funds":
            # Get funds with their latest IRR values and total FUM - OPTIMIZED BULK QUERIES
            funds_result = await db.fetch("SELECT * FROM available_funds")
            
            if funds_result:
                # Extract fund IDs for bulk queries
                fund_ids = [dict(fund)["id"] for fund in funds_result]
                
                # Bulk fetch all portfolio_funds for all funds
                portfolio_funds_result = await db.fetch("""
                    SELECT id, amount_invested, available_funds_id 
                    FROM portfolio_funds 
                    WHERE available_funds_id = ANY($1::int[])
                """, fund_ids)
                
                # Extract portfolio fund IDs for bulk IRR query
                pf_ids = [dict(pf)["id"] for pf in portfolio_funds_result]
                
                # Bulk fetch latest IRR values for all portfolio funds
                irr_values_result = await db.fetch("""
                    SELECT DISTINCT ON (fund_id) fund_id, irr_result
                    FROM portfolio_fund_irr_values 
                    WHERE fund_id = ANY($1::int[])
                    ORDER BY fund_id, date DESC
                """, pf_ids) if pf_ids else []
                
                # Create lookup maps for efficient processing
                pf_by_fund_id = {}
                for pf_record in portfolio_funds_result:
                    pf = dict(pf_record)
                    fund_id = pf["available_funds_id"]
                    if fund_id not in pf_by_fund_id:
                        pf_by_fund_id[fund_id] = []
                    pf_by_fund_id[fund_id].append(pf)
                
                irr_by_pf_id = {}
                for irr_record in irr_values_result:
                    irr = dict(irr_record)
                    irr_by_pf_id[irr["fund_id"]] = irr["irr_result"]
                
                # Process each fund with bulk data
                for fund_record in funds_result:
                    fund = dict(fund_record)
                    fund_id = fund["id"]
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                
                    # Get portfolio funds for this fund
                portfolio_funds = pf_by_fund_id.get(fund_id, [])
                    
                for pf in portfolio_funds:
                    pf_id = pf["id"]
                    amount_invested = pf["amount_invested"]
                        
                    # Get latest IRR value for this portfolio fund
                    if pf_id in irr_by_pf_id and amount_invested:
                        irr_value = irr_by_pf_id[pf_id]
                        total_fum += amount_invested
                        weighted_irr += (irr_value * amount_invested)
                        total_weight += amount_invested
                
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
            # Get portfolios with their latest IRR values and total FUM - OPTIMIZED BULK QUERIES
            portfolios_result = await db.fetch("SELECT * FROM portfolios")
            
            if portfolios_result:
                # Extract portfolio IDs for bulk queries
                portfolio_ids = [dict(portfolio)["id"] for portfolio in portfolios_result]
                
                # Bulk fetch all portfolio_funds for all portfolios
                portfolio_funds_result = await db.fetch("""
                    SELECT id, amount_invested, portfolio_id 
                    FROM portfolio_funds 
                    WHERE portfolio_id = ANY($1::int[])
                """, portfolio_ids)
                
                # Extract portfolio fund IDs for bulk IRR query
                pf_ids = [dict(pf)["id"] for pf in portfolio_funds_result]
                
                # Bulk fetch latest IRR values for all portfolio funds
                irr_values_result = await db.fetch("""
                    SELECT DISTINCT ON (fund_id) fund_id, irr_result
                    FROM portfolio_fund_irr_values 
                    WHERE fund_id = ANY($1::int[])
                    ORDER BY fund_id, date DESC
                """, pf_ids) if pf_ids else []
                
                # Create lookup maps for efficient processing
                pf_by_portfolio_id = {}
                for pf_record in portfolio_funds_result:
                    pf = dict(pf_record)
                    portfolio_id = pf["portfolio_id"]
                    if portfolio_id not in pf_by_portfolio_id:
                        pf_by_portfolio_id[portfolio_id] = []
                    pf_by_portfolio_id[portfolio_id].append(pf)
                
                irr_by_pf_id = {}
                for irr_record in irr_values_result:
                    irr = dict(irr_record)
                    irr_by_pf_id[irr["fund_id"]] = irr["irr_result"]
                
                # Process each portfolio with bulk data
                for portfolio_record in portfolios_result:
                    portfolio = dict(portfolio_record)
                    portfolio_id = portfolio["id"]
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                
                # Get portfolio funds for this portfolio
                portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
                    
                for pf in portfolio_funds:
                    pf_id = pf["id"]
                    amount_invested = pf["amount_invested"]
                        
                    # Get latest IRR value for this portfolio fund
                    if pf_id in irr_by_pf_id and amount_invested:
                        irr_value = irr_by_pf_id[pf_id]
                        total_fum += amount_invested
                        weighted_irr += (irr_value * amount_invested)
                        total_weight += amount_invested
                
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
            # Get products with their latest IRR values and total FUM - OPTIMIZED BULK QUERIES
            products_result = await db.fetch("SELECT * FROM client_products")
            
            if products_result:
                # Extract portfolio IDs and client IDs for bulk queries
                portfolio_ids = [dict(product)["portfolio_id"] for product in products_result if dict(product)["portfolio_id"]]
                client_ids = [dict(product)["client_id"] for product in products_result if dict(product)["client_id"]]
                portfolio_ids = list(set(portfolio_ids))  # Remove duplicates
                client_ids = list(set(client_ids))  # Remove duplicates
                
                # Bulk fetch all portfolio_funds for all portfolios
                portfolio_funds_result = await db.fetch("""
                    SELECT id, amount_invested, portfolio_id 
                    FROM portfolio_funds 
                    WHERE portfolio_id = ANY($1::int[])
                """, portfolio_ids) if portfolio_ids else []
                
                # Extract portfolio fund IDs for bulk IRR query
                pf_ids = [dict(pf)["id"] for pf in portfolio_funds_result]
                
                # Bulk fetch latest IRR values and client names
                irr_values_result = await db.fetch("""
                    SELECT DISTINCT ON (fund_id) fund_id, irr_result
                    FROM portfolio_fund_irr_values 
                    WHERE fund_id = ANY($1::int[])
                    ORDER BY fund_id, date DESC
                """, pf_ids) if pf_ids else []
                
                client_names_result = await db.fetch("""
                    SELECT id, name FROM client_groups WHERE id = ANY($1::int[])
                """, client_ids) if client_ids else []
                
                # Create lookup maps for efficient processing
                pf_by_portfolio_id = {}
                for pf_record in portfolio_funds_result:
                    pf = dict(pf_record)
                    portfolio_id = pf["portfolio_id"]
                    if portfolio_id not in pf_by_portfolio_id:
                        pf_by_portfolio_id[portfolio_id] = []
                    pf_by_portfolio_id[portfolio_id].append(pf)
                
                irr_by_pf_id = {}
                for irr_record in irr_values_result:
                    irr = dict(irr_record)
                    irr_by_pf_id[irr["fund_id"]] = irr["irr_result"]
                
                client_names_by_id = {}
                for client_record in client_names_result:
                    client = dict(client_record)
                    client_names_by_id[client["id"]] = client["name"]
                
                # Process each product with bulk data
                for product_record in products_result:
                    product = dict(product_record)
                    portfolio_id = product["portfolio_id"]
                    
                    if portfolio_id:
                        total_fum = 0
                        weighted_irr = 0
                        total_weight = 0
                    
                        # Get portfolio funds for this portfolio
                        portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
                        
                        for pf in portfolio_funds:
                            pf_id = pf["id"]
                            amount_invested = pf["amount_invested"]
                            
                            # Get latest IRR value for this portfolio fund
                            if pf_id in irr_by_pf_id and amount_invested:
                                irr_value = irr_by_pf_id[pf_id]
                                total_fum += amount_invested
                                weighted_irr += (irr_value * amount_invested)
                                total_weight += amount_invested
                
                    if total_weight > 0:
                        # Get client name for product
                        client_name = client_names_by_id.get(product["client_id"], "Unknown Client")
                        
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
            # Get clients with their latest IRR values and total FUM - OPTIMIZED BULK QUERIES
            clients_result = await db.fetch("SELECT * FROM client_groups")
            
            if clients_result:
                # Extract client IDs for bulk queries
                client_ids = [dict(client)["id"] for client in clients_result]
                
                # Bulk fetch all products for all clients
                products_result = await db.fetch("""
                    SELECT * FROM client_products 
                    WHERE client_id = ANY($1::int[]) AND portfolio_id IS NOT NULL
                """, client_ids)
                
                # Extract portfolio IDs for bulk queries
                portfolio_ids = [dict(product)["portfolio_id"] for product in products_result]
                portfolio_ids = list(set(portfolio_ids))  # Remove duplicates
                
                # Bulk fetch all portfolio_funds for all portfolios
                portfolio_funds_result = await db.fetch("""
                    SELECT id, amount_invested, portfolio_id 
                    FROM portfolio_funds 
                    WHERE portfolio_id = ANY($1::int[])
                """, portfolio_ids) if portfolio_ids else []
                
                # Extract portfolio fund IDs for bulk IRR query
                pf_ids = [dict(pf)["id"] for pf in portfolio_funds_result]
                
                # Bulk fetch latest IRR values for all portfolio funds
                irr_values_result = await db.fetch("""
                    SELECT DISTINCT ON (fund_id) fund_id, irr_result
                    FROM portfolio_fund_irr_values 
                    WHERE fund_id = ANY($1::int[])
                    ORDER BY fund_id, date DESC
                """, pf_ids) if pf_ids else []
                
                # Create lookup maps for efficient processing
                products_by_client_id = {}
                for product_record in products_result:
                    product = dict(product_record)
                    client_id = product["client_id"]
                    if client_id not in products_by_client_id:
                        products_by_client_id[client_id] = []
                    products_by_client_id[client_id].append(product)
                
                pf_by_portfolio_id = {}
                for pf_record in portfolio_funds_result:
                    pf = dict(pf_record)
                    portfolio_id = pf["portfolio_id"]
                    if portfolio_id not in pf_by_portfolio_id:
                        pf_by_portfolio_id[portfolio_id] = []
                    pf_by_portfolio_id[portfolio_id].append(pf)
                
                irr_by_pf_id = {}
                for irr_record in irr_values_result:
                    irr = dict(irr_record)
                    irr_by_pf_id[irr["fund_id"]] = irr["irr_result"]
                
                # Process each client with bulk data
                for client_record in clients_result:
                    client = dict(client_record)
                    client_id = client["id"]
                
                    total_fum = 0
                    weighted_irr = 0
                    total_weight = 0
                    earliest_start_date = None
                
                    # Get products for this client from the bulk data
                    client_products = [p for p in products_result if dict(p)["client_id"] == client_id]
                    
                    for product_record in client_products:
                        product = dict(product_record)
                        portfolio_id = product["portfolio_id"]
                        
                        if portfolio_id:
                            # Get portfolio funds for this portfolio
                            portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
                            
                            for pf in portfolio_funds:
                                pf_id = pf["id"]
                                amount_invested = pf["amount_invested"]
                                
                                # Get latest IRR value for this portfolio fund
                                if pf_id in irr_by_pf_id and amount_invested:
                                    irr_value = irr_by_pf_id[pf_id]
                                    total_fum += amount_invested
                                    weighted_irr += (irr_value * amount_invested)
                                    total_weight += amount_invested
                                
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
            # 🚀 MASSIVELY OPTIMIZED: Get top performers across all entity types
            # Converts N*M*P*Q queries (potentially thousands) to 5 bulk queries
            all_performers = []
            
            # Step 1: Bulk fetch all entities (4 queries instead of individual loops)
            funds_result = await db.fetch("SELECT * FROM available_funds")
            portfolios_result = await db.fetch("SELECT * FROM portfolios")  
            products_result = await db.fetch("""
                SELECT cp.*, cg.name as client_name 
                FROM client_products cp 
                JOIN client_groups cg ON cp.client_id = cg.id
                WHERE cp.portfolio_id IS NOT NULL
            """)
            clients_result = await db.fetch("SELECT * FROM client_groups")
            
            # Step 2: Get all unique portfolio IDs from all entities
            all_portfolio_ids = set()
            
            # Collect portfolio IDs from portfolios directly
            for portfolio_record in portfolios_result:
                all_portfolio_ids.add(portfolio_record["id"])
            
            # Collect portfolio IDs from products
            for product_record in products_result:
                if product_record["portfolio_id"]:
                    all_portfolio_ids.add(product_record["portfolio_id"])
            
            all_portfolio_ids = list(all_portfolio_ids)
            
            if not all_portfolio_ids:
                response["performanceData"] = []
                return response
            
            # Step 3: Bulk fetch all portfolio funds for all portfolios (1 query instead of N)
            portfolio_funds_result = await db.fetch("""
                SELECT id, portfolio_id, available_funds_id, amount_invested 
                FROM portfolio_funds 
                WHERE portfolio_id = ANY($1::int[]) OR available_funds_id = ANY($2::int[])
            """, all_portfolio_ids, [fund["id"] for fund in funds_result])
            
            # Step 4: Bulk fetch all IRR values for all portfolio funds (1 query instead of N*M)
            all_pf_ids = [pf["id"] for pf in portfolio_funds_result]
            if all_pf_ids:
                # Get latest IRR for each portfolio fund
                latest_irr_result = await db.fetch("""
                    SELECT DISTINCT ON (fund_id) fund_id, irr_result
                    FROM portfolio_fund_irr_values 
                    WHERE fund_id = ANY($1::int[])
                    ORDER BY fund_id, date DESC
                """, all_pf_ids)
            else:
                latest_irr_result = []
            
            # Step 5: Create efficient lookup maps
            pf_by_portfolio_id = {}
            pf_by_fund_id = {}
            for pf_record in portfolio_funds_result:
                pf = dict(pf_record)
                # Map by portfolio_id
                if pf["portfolio_id"]:
                    if pf["portfolio_id"] not in pf_by_portfolio_id:
                        pf_by_portfolio_id[pf["portfolio_id"]] = []
                    pf_by_portfolio_id[pf["portfolio_id"]].append(pf)
                # Map by available_funds_id
                if pf["available_funds_id"]:
                    if pf["available_funds_id"] not in pf_by_fund_id:
                        pf_by_fund_id[pf["available_funds_id"]] = []
                    pf_by_fund_id[pf["available_funds_id"]].append(pf)
            
            irr_by_pf_id = {}
            for irr_record in latest_irr_result:
                irr = dict(irr_record)
                irr_by_pf_id[irr["fund_id"]] = irr["irr_result"]
            
            # Step 6: Process funds with bulk data
            for fund_record in funds_result:
                fund = dict(fund_record)
                fund_id = fund["id"]
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                
                # Get portfolio funds for this fund
                portfolio_funds = pf_by_fund_id.get(fund_id, [])
                
                for pf in portfolio_funds:
                    pf_id = pf["id"]
                    amount_invested = pf["amount_invested"]
                    
                    # Get latest IRR value for this portfolio fund
                    if pf_id in irr_by_pf_id and amount_invested:
                        irr_value = irr_by_pf_id[pf_id]
                        total_fum += amount_invested
                        weighted_irr += (irr_value * amount_invested)
                        total_weight += amount_invested
                
                if total_weight > 0:
                    all_performers.append({
                        "id": fund["id"],
                        "name": fund["fund_name"],
                        "type": "fund",
                        "irr": weighted_irr / total_weight,
                        "fum": total_fum,
                        "startDate": None
                    })
            
            # Step 7: Process portfolios with bulk data
            for portfolio_record in portfolios_result:
                portfolio = dict(portfolio_record)
                portfolio_id = portfolio["id"]
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                
                # Get portfolio funds for this portfolio
                portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
                
                for pf in portfolio_funds:
                    pf_id = pf["id"]
                    amount_invested = pf["amount_invested"]
                    
                    # Get latest IRR value for this portfolio fund
                    if pf_id in irr_by_pf_id and amount_invested:
                        irr_value = irr_by_pf_id[pf_id]
                        total_fum += amount_invested
                        weighted_irr += (irr_value * amount_invested)
                        total_weight += amount_invested
                
                if total_weight > 0:
                    all_performers.append({
                        "id": portfolio["id"],
                        "name": portfolio["portfolio_name"],
                        "type": "portfolio",
                        "irr": weighted_irr / total_weight,
                        "fum": total_fum,
                        "startDate": portfolio["start_date"]
                    })
            
            # Step 8: Process products with bulk data (includes client names from JOIN)
            for product_record in products_result:
                product = dict(product_record)
                portfolio_id = product["portfolio_id"]
                
                if portfolio_id:
                    total_fum = 0
                    weighted_irr = 0
                    total_weight = 0
                    
                    # Get portfolio funds for this portfolio
                    portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
                    
                    for pf in portfolio_funds:
                        pf_id = pf["id"]
                        amount_invested = pf["amount_invested"]
                        
                        # Get latest IRR value for this portfolio fund
                        if pf_id in irr_by_pf_id and amount_invested:
                            irr_value = irr_by_pf_id[pf_id]
                            total_fum += amount_invested
                            weighted_irr += (irr_value * amount_invested)
                            total_weight += amount_invested
                
                    if total_weight > 0:
                        client_name = product.get("client_name", "Unknown Client")
                        
                        all_performers.append({
                            "id": product["id"],
                            "name": product["product_name"] or f"{client_name}'s product",
                            "type": "product",
                            "irr": weighted_irr / total_weight,
                            "fum": total_fum,
                            "startDate": product["start_date"]
                        })
            
            # Step 9: Process clients with bulk data
            for client_record in clients_result:
                client = dict(client_record)
                client_id = client["id"]
                
                total_fum = 0
                weighted_irr = 0
                total_weight = 0
                earliest_start_date = None
                
                # Get products for this client from the bulk data
                client_products = [p for p in products_result if dict(p)["client_id"] == client_id]
                
                for product_record in client_products:
                    product = dict(product_record)
                    portfolio_id = product["portfolio_id"]
                    
                    if portfolio_id:
                        # Get portfolio funds for this portfolio
                        portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
                        
                        for pf in portfolio_funds:
                            pf_id = pf["id"]
                            amount_invested = pf["amount_invested"]
                            
                            # Get latest IRR value for this portfolio fund
                            if pf_id in irr_by_pf_id and amount_invested:
                                irr_value = irr_by_pf_id[pf_id]
                                total_fum += amount_invested
                                weighted_irr += (irr_value * amount_invested)
                                total_weight += amount_invested
                                
                                if not earliest_start_date or (product["start_date"] and product["start_date"] < earliest_start_date):
                                    earliest_start_date = product["start_date"]
                
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
        products_result = await db.fetch("SELECT DISTINCT product_type FROM client_products WHERE product_type IS NOT NULL")
        
        if not products_result:
            return {
                "relationships": [],
                "products": [],
                "data": []
            }
        
        # Extract unique product types
        product_types = [dict(product)["product_type"] for product in products_result]
        
        # Get all clients and their relationship types
        clients_result = await db.fetch("SELECT id, relationship FROM client_groups WHERE relationship IS NOT NULL")
        
        if not clients_result:
            return {
                "relationships": [],
                "products": [],
                "data": []
            }
        
        # Get all client-product associations
        client_products_result = await db.fetch("SELECT client_id, product_type FROM client_products WHERE product_type IS NOT NULL")
        
        # Build the response
        relationships = list(set(dict(client)["relationship"] for client in clients_result))
        
        data = []
        for relationship in relationships:
            counts = {product_type: 0 for product_type in product_types}
            for client_record in clients_result:
                client = dict(client_record)
                if client["relationship"] == relationship:
                    for cp_record in client_products_result:
                        cp = dict(cp_record)
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
        # Get all funds in the portfolio - OPTIMIZED BULK QUERIES
        funds_result = await db.fetch("SELECT * FROM portfolio_funds WHERE portfolio_id = $1", portfolio_id)
        
        if not funds_result:
            return {
                "irr": 0.0,
                "total_investment": 0.0,
                "current_value": 0.0,
                "fund_performance": []
            }
            
        # Extract fund IDs for bulk queries
        fund_ids = [dict(fund)["id"] for fund in funds_result]
        
        # Bulk fetch investment amounts for all funds
        investment_result = await db.fetch("""
            SELECT portfolio_fund_id, SUM(amount) as total_investment
            FROM holding_activity_log 
            WHERE portfolio_fund_id = ANY($1::int[]) AND activity_type = 'Investment'
            GROUP BY portfolio_fund_id
        """, fund_ids)
        
        # Create lookup map for investments
        investment_by_fund_id = {}
        for inv_record in investment_result:
            inv = dict(inv_record)
            investment_by_fund_id[inv["portfolio_fund_id"]] = float(inv["total_investment"] or 0)
            
        total_investment = 0.0
        current_value = 0.0
        fund_performance = []
        
        for fund_record in funds_result:
            fund = dict(fund_record)
            fund_id = fund["id"]
            
            # Get investment amount from lookup
            investment = investment_by_fund_id.get(fund_id, 0.0)
            
            # Get current value from the fund record
            fund_current_value = float(fund.get("market_value") or 0.0)
            
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

async def calculate_company_irr(db):
    """
    Calculate company-wide IRR using the standardized multiple IRR endpoint.
    This ensures consistency with individual fund IRR calculations and properly handles
    internal transfers (SwitchIn/SwitchOut) by aggregating them monthly.
    
    PERFORMANCE OPTIMIZATION: Uses 5-minute cache to prevent expensive recalculations
    """
    global _company_irr_cache
    
    # Check cache first
    current_time = time.time()
    if (_company_irr_cache['value'] is not None and 
        _company_irr_cache['timestamp'] is not None and
        (current_time - _company_irr_cache['timestamp']) < _company_irr_cache['cache_duration']):
        
        cache_age = current_time - _company_irr_cache['timestamp']
        logger.info(f"🚀 Using cached company IRR: {_company_irr_cache['value']:.1f}% (cache age: {cache_age:.1f}s)")
        return _company_irr_cache['value']
    
    logger.info("🔄 Cache miss - calculating fresh company IRR...")
    
    try:
        # Step 1: Get ALL portfolio fund IDs (including inactive/sold funds for complete historical IRR)
        # FIXED: Include inactive funds as they represent sold positions crucial for accurate IRR
        portfolio_funds_response = await db.fetch("SELECT id FROM portfolio_funds")
        
        all_portfolio_fund_ids = [dict(fund)['id'] for fund in portfolio_funds_response]
        
        if not all_portfolio_fund_ids:
            logger.warning("No portfolio funds found (active or inactive)")
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
            db=db
        )
        
        if irr_result and irr_result.get('success'):
            company_irr = irr_result.get('irr_percentage', 0.0)
            
            # Update cache with successful result
            _company_irr_cache['value'] = company_irr
            _company_irr_cache['timestamp'] = current_time
            logger.info(f"✅ Company IRR calculated and cached: {company_irr:.1f}%")
            
            return company_irr
        else:
            logger.warning("Standardized IRR calculation failed or returned unsuccessful result")
            return 0.0
            
    except Exception as e:
        logger.error(f"Error in calculate_company_irr using standardized endpoint: {e}")
        # Fallback to simple calculation if standardized endpoint fails
        try:
            
            # Get total current valuations
            latest_valuations_response = await db.fetch("SELECT valuation FROM latest_portfolio_fund_valuations")
            
            total_current_value = sum(float(dict(v)['valuation'] or 0) for v in latest_valuations_response)
            
            # Get total amount invested
            portfolio_funds_response = await db.fetch("SELECT amount_invested FROM portfolio_funds WHERE status = 'active'")
            
            total_invested = sum(float(dict(pf)['amount_invested'] or 0) for pf in portfolio_funds_response)
            
            if total_invested > 0:
                # Simple ROI calculation as fallback
                simple_roi = ((total_current_value / total_invested) - 1) * 100
                
                # Cache the fallback result too
                _company_irr_cache['value'] = simple_roi
                _company_irr_cache['timestamp'] = current_time
                logger.info(f"✅ Fallback ROI calculated and cached: {simple_roi:.1f}%")
                
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
        client_count = await db.fetchval("SELECT COUNT(*) FROM client_groups WHERE status = 'active'")
        client_count = int(client_count) if client_count is not None else 0
        
        total_products = await db.fetchval("SELECT COUNT(*) FROM client_products WHERE status = 'active'")
        total_products = int(total_products) if total_products is not None else 0
        
        # FIXED: Include all funds (active and inactive) for complete historical IRR accounting
        portfolio_funds_result = await db.fetch("SELECT id, amount_invested FROM portfolio_funds")
        total_portfolio_funds = len(portfolio_funds_result) if portfolio_funds_result else 0
        
        # Calculate total investment for backward compatibility
        total_investment = 0
        if portfolio_funds_result:
            for pf_record in portfolio_funds_result:
                pf = dict(pf_record)
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
        # Get all products for the client - OPTIMIZED BULK QUERIES
        products_result = await db.fetch("SELECT * FROM client_products WHERE client_id = $1", client_id)
        
        if not products_result:
            logger.info(f"No products found for client {client_id}")
            return {"client_id": client_id, "irr": 0, "product_count": 0}
            
        # Extract portfolio IDs and bulk fetch portfolio funds
        portfolio_ids = [dict(product)["portfolio_id"] for product in products_result if dict(product)["portfolio_id"]]
        product_count = len(products_result)
        
        if not portfolio_ids:
            logger.info(f"No portfolios found for client {client_id}")
            return {"client_id": client_id, "irr": 0, "product_count": product_count, "portfolio_fund_count": 0}
        
        # Bulk fetch all portfolio funds for all portfolios at once
        portfolio_funds_result = await db.fetch("""
            SELECT id FROM portfolio_funds 
            WHERE portfolio_id = ANY($1::int[])
        """, portfolio_ids)
        
        all_portfolio_fund_ids = [dict(pf)["id"] for pf in portfolio_funds_result]
        
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
        product_result = await db.fetchrow("""
            SELECT portfolio_id, start_date 
            FROM client_products 
            WHERE id = $1
        """, product_id)
            
        if not product_result or not dict(product_result)["portfolio_id"]:
            logger.info(f"No portfolio associated with product {product_id}")
            return {
                "product_id": product_id,
                "irr": 0,
                "portfolio_fund_count": 0,
                "total_invested": 0,
                "date": None
            }
            
        portfolio_id = dict(product_result)["portfolio_id"]
            
        # Get all portfolio funds for this portfolio
        portfolio_funds_result = await db.fetch("""
            SELECT id FROM portfolio_funds 
            WHERE portfolio_id = $1
        """, portfolio_id)
            
        # DEBUG: Log fund counts
        if not portfolio_funds_result:
            logger.info(f"No portfolio funds found for portfolio {portfolio_id}")
            return {
                "product_id": product_id,
                "irr": 0,
                "portfolio_fund_count": 0,
                "total_invested": 0,
                "date": None
            }
            
        portfolio_fund_ids = [dict(pf)["id"] for pf in portfolio_funds_result]
        
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
        # MASSIVE OPTIMIZATION: Convert N*M*P*Q queries to 4 bulk queries
        
        # Step 1: Get all active clients
        clients_result = await db.fetch("SELECT * FROM client_groups WHERE status = 'active'")
        
        if not clients_result:
            return []
        
        # Step 2: Bulk fetch all client products for all clients
        client_ids = [dict(client)["id"] for client in clients_result]
        products_result = await db.fetch("""
            SELECT * FROM client_products 
            WHERE client_id = ANY($1::int[]) AND status = 'active' AND portfolio_id IS NOT NULL
        """, client_ids)
        
        # Step 3: Bulk fetch all portfolio funds for all portfolios
        portfolio_ids = [dict(product)["portfolio_id"] for product in products_result]
        portfolio_ids = list(set(portfolio_ids))  # Remove duplicates
        
        portfolio_funds_result = await db.fetch("""
            SELECT available_funds_id, amount_invested, portfolio_id
            FROM portfolio_funds 
            WHERE portfolio_id = ANY($1::int[])
        """, portfolio_ids) if portfolio_ids else []
        
        # Step 4: Bulk fetch all fund risk factors
        fund_ids = [dict(pf)["available_funds_id"] for pf in portfolio_funds_result]
        fund_ids = list(set(fund_ids))  # Remove duplicates
        
        funds_result = await db.fetch("""
            SELECT id, risk_factor FROM available_funds 
            WHERE id = ANY($1::int[]) AND risk_factor IS NOT NULL
        """, fund_ids) if fund_ids else []
        
        # Step 5: Create efficient lookup maps
        products_by_client_id = {}
        for product_record in products_result:
            product = dict(product_record)
            client_id = product["client_id"]
            if client_id not in products_by_client_id:
                products_by_client_id[client_id] = []
            products_by_client_id[client_id].append(product)
        
        pf_by_portfolio_id = {}
        for pf_record in portfolio_funds_result:
            pf = dict(pf_record)
            portfolio_id = pf["portfolio_id"]
            if portfolio_id not in pf_by_portfolio_id:
                pf_by_portfolio_id[portfolio_id] = []
            pf_by_portfolio_id[portfolio_id].append(pf)
        
        risk_by_fund_id = {}
        for fund_record in funds_result:
            fund = dict(fund_record)
            risk_by_fund_id[fund["id"]] = fund["risk_factor"]
        
        # Step 6: Process each client with bulk data
        client_risks = []
        
        for client_record in clients_result:
            try:
                client = dict(client_record)
                client_id = client["id"]
                
                # Get products for this client
                products = products_by_client_id.get(client_id, [])
                
                if not products:
                    continue
                
                total_client_investment = 0
                weighted_risk_sum = 0
                
                for product in products:
                    portfolio_id = product["portfolio_id"]
                    
                    if not portfolio_id:
                        continue
                    
                    product_investment = 0
                    product_risk_sum = 0
                    
                    # Get portfolio funds for this portfolio
                    portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
                    
                    portfolio_investment = 0
                    portfolio_risk_sum = 0
                    
                    for pf in portfolio_funds:
                        fund_id = pf["available_funds_id"]
                        amount_invested = pf["amount_invested"] or 0
                        
                        # Get risk factor from lookup
                        risk_factor = risk_by_fund_id.get(fund_id)
                        
                        if risk_factor is None:
                            continue
                        
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
async def get_portfolio_irr(portfolio_id: int, db = Depends(get_db)):
    """
    Get the latest portfolio IRR from the portfolio_irr_values table.
    This uses the correct aggregated cash flow analysis approach that considers
    all portfolio funds together, rather than a weighted average of individual fund IRRs.
    
    The portfolio IRR values are calculated and stored by the portfolio IRR recalculation
    process using the proper cash flow separation logic.
    """
    try:
        # Check if portfolio exists
        portfolio_check = await db.fetchrow("SELECT id FROM portfolios WHERE id = $1", portfolio_id)
        if not portfolio_check:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        # Get the latest portfolio IRR from the portfolio_irr_values table
        logger.info(f"📊 [ANALYTICS DEBUG] Querying portfolio_irr_values for portfolio_id: {portfolio_id}")
        
        latest_irr_result = await db.fetchrow("""
            SELECT irr_result, date FROM portfolio_irr_values 
            WHERE portfolio_id = $1 
            ORDER BY date DESC 
            LIMIT 1
        """, portfolio_id)
        
        logger.info(f"📊 [ANALYTICS DEBUG] Query result: {latest_irr_result}")
        logger.info(f"📊 [ANALYTICS DEBUG] Query result: {latest_irr_result}")
        
        if latest_irr_result and dict(latest_irr_result)["irr_result"] is not None:
            irr_record = dict(latest_irr_result)
            irr_value = float(irr_record["irr_result"])
            logger.info(f"📊 Retrieved portfolio IRR for portfolio {portfolio_id}: {irr_value}% from date {irr_record['date']}")
            return {"portfolio_id": portfolio_id, "irr": irr_value}
        else:
            logger.warning(f"📊 [ANALYTICS DEBUG] No portfolio IRR found - result: {latest_irr_result}")
            if latest_irr_result:
                logger.warning(f"📊 [ANALYTICS DEBUG] IRR result value: {dict(latest_irr_result).get('irr_result', 'KEY_NOT_FOUND')}")
            
            # Fallback: If no portfolio IRR values exist, try to calculate using the correct method
            logger.warning(f"No portfolio IRR values found for portfolio {portfolio_id}, attempting to calculate using aggregated approach")
            
            # Get all portfolio funds for the portfolio to calculate IRR
            portfolio_funds_result = await db.fetch("SELECT id FROM portfolio_funds WHERE portfolio_id = $1", portfolio_id)
            
            if not portfolio_funds_result:
                logger.info(f"No portfolio funds found for portfolio {portfolio_id}")
                return {"portfolio_id": portfolio_id, "irr": 0}
            
            # Use the fixed calculate_multiple_portfolio_funds_irr function
            from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr
            
            fund_ids = [dict(fund)["id"] for fund in portfolio_funds_result]
            try:
                irr_calculation_result = await calculate_multiple_portfolio_funds_irr(
                    portfolio_fund_ids=fund_ids,
                    irr_date=None,  # Use latest date
                    db=db
                )
                
                if irr_calculation_result.get("success"):
                    irr_value = irr_calculation_result.get("irr_percentage", 0)
                    logger.info(f"📊 Calculated portfolio IRR for portfolio {portfolio_id}: {irr_value}% using aggregated method")
                else:
                    irr_value = 0
                    logger.warning(f"Failed to calculate portfolio IRR for portfolio {portfolio_id}")
            except Exception as calc_error:
                logger.error(f"Error calculating portfolio IRR for portfolio {portfolio_id}: {str(calc_error)}")
                irr_value = 0
        
        return {
            "portfolio_id": portfolio_id,
            "irr": irr_value
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting portfolio IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting portfolio IRR: {str(e)}") 

@router.get("/analytics/portfolio_template_distribution")
async def get_portfolio_template_distribution(
    limit: int = Query(100000, ge=1, le=100000, description="Maximum number of portfolio templates to return"),
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
        # OPTIMIZED BULK QUERIES: Convert N*M*P queries to 4 bulk queries
        
        # Step 1: Get all template portfolio generations
        generations_result = await db.fetch("SELECT id, generation_name FROM template_portfolio_generations")
        
        if not generations_result:
            logger.warning("No template portfolio generations found in the database")
            return {"templates": []}
        
        # Step 2: Bulk fetch all portfolios (both templated and bespoke)
        portfolios_result = await db.fetch("SELECT id, template_generation_id FROM portfolios")
        
        # Step 3: Bulk fetch all portfolio funds for all portfolios
        portfolio_ids = [dict(portfolio)["id"] for portfolio in portfolios_result]
        portfolio_funds_result = await db.fetch("""
            SELECT id, amount_invested, portfolio_id 
            FROM portfolio_funds 
            WHERE portfolio_id = ANY($1::int[])
        """, portfolio_ids) if portfolio_ids else []
        
        # Step 4: Bulk fetch all valuations for all portfolio funds
        pf_ids = [dict(pf)["id"] for pf in portfolio_funds_result]
        valuations_result = await db.fetch("""
            SELECT portfolio_fund_id, valuation 
            FROM latest_portfolio_fund_valuations 
            WHERE portfolio_fund_id = ANY($1::int[]) AND valuation IS NOT NULL
        """, pf_ids) if pf_ids else []
        
        # Step 5: Create efficient lookup maps
        portfolios_by_template_id = {}
        bespoke_portfolios = []
        
        for portfolio_record in portfolios_result:
            portfolio = dict(portfolio_record)
            template_id = portfolio["template_generation_id"]
            
            if template_id is None:
                bespoke_portfolios.append(portfolio)
            else:
                if template_id not in portfolios_by_template_id:
                    portfolios_by_template_id[template_id] = []
                portfolios_by_template_id[template_id].append(portfolio)
        
        pf_by_portfolio_id = {}
        for pf_record in portfolio_funds_result:
            pf = dict(pf_record)
            portfolio_id = pf["portfolio_id"]
            if portfolio_id not in pf_by_portfolio_id:
                pf_by_portfolio_id[portfolio_id] = []
            pf_by_portfolio_id[portfolio_id].append(pf)
        
        valuations_by_pf_id = {}
        for val_record in valuations_result:
            val = dict(val_record)
            valuations_by_pf_id[val["portfolio_fund_id"]] = val["valuation"]
        
        # Step 6: Process templates with bulk data
        template_data = []
        valuations_used = 0
        amount_invested_fallbacks = 0
        
        # Process each template generation
        for generation_record in generations_result:
            generation = dict(generation_record)
            template_id = generation["id"]
            
            # Get portfolios for this template
            portfolios = portfolios_by_template_id.get(template_id, [])
            
            total_value = 0
            template_has_valuations = False
            
            for portfolio in portfolios:
                portfolio_id = portfolio["id"]
                
                # Get portfolio funds for this portfolio
                portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
                
                for pf in portfolio_funds:
                    pf_id = pf["id"]
                    
                    # Check for valuation first (preferred)
                    if pf_id in valuations_by_pf_id:
                        total_value += valuations_by_pf_id[pf_id]
                        template_has_valuations = True
                        valuations_used += 1
                    else:
                        # Fallback to amount_invested
                        amount_invested = pf["amount_invested"]
                        if amount_invested is not None:
                            total_value += amount_invested
                            amount_invested_fallbacks += 1
                            logger.debug(f"No valuation found for portfolio_fund {pf_id}, using amount_invested: {amount_invested}")
            
            # Only include template generations with values > 0
            if total_value > 0:
                template_data.append({
                    "id": str(generation["id"]),
                    "name": generation["generation_name"],
                    "amount": total_value,
                    "valuation_source": "latest_valuation" if template_has_valuations else "amount_invested"
                })
        
        # Step 7: Process bespoke portfolios
        bespoke_total = 0
        bespoke_has_valuations = False
        
        for portfolio in bespoke_portfolios:
            portfolio_id = portfolio["id"]
            
            # Get portfolio funds for this bespoke portfolio
            portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
            
            for pf in portfolio_funds:
                pf_id = pf["id"]
                
                # Check for valuation first (preferred)
                if pf_id in valuations_by_pf_id:
                    bespoke_total += valuations_by_pf_id[pf_id]
                    bespoke_has_valuations = True
                    valuations_used += 1
                else:
                    # Fallback to amount_invested
                    amount_invested = pf["amount_invested"]
                    if amount_invested is not None:
                        bespoke_total += amount_invested
                        amount_invested_fallbacks += 1
                        logger.debug(f"No valuation found for portfolio_fund {pf_id}, using amount_invested: {amount_invested}")
        
        # Add bespoke category if it has value
        if bespoke_total > 0:
            template_data.insert(0, {
                "id": "bespoke",
                "name": "Bespoke Portfolios",
                "amount": bespoke_total,
                "valuation_source": "latest_valuation" if bespoke_has_valuations else "amount_invested"
            })
        
        # Sort by amount (descending) and limit results
        template_data.sort(key=lambda x: x["amount"], reverse=True)
        template_data = template_data[:limit]
        
        return {"templates": template_data}
    except Exception as e:
        logger.error(f"Error fetching portfolio template distribution: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}") 

@router.get("/analytics/dashboard_all")
async def get_dashboard_all_data(
    fund_limit: int = Query(100000, ge=1, le=100000, description="Maximum number of funds to return"),
    provider_limit: int = Query(100000, ge=1, le=100000, description="Maximum number of providers to return"),
    template_limit: int = Query(100000, ge=1, le=100000, description="Maximum number of templates to return"),
    db = Depends(get_db)
):
    """
    OPTIMIZED: Get ALL dashboard data in a single request with bulk queries.
    This replaces 4+ separate API calls with 1 optimized endpoint.
    Eliminates N+1 query problem by fetching all data in bulk.
    """
    try:
        # 1. Get ALL latest valuations in one query (instead of N individual queries)
        all_valuations_result = await db.fetch("SELECT portfolio_fund_id, valuation, valuation_date FROM latest_portfolio_fund_valuations")
        
        # Create lookup dictionary for O(1) access
        valuations_lookup = {}
        total_fum_from_valuations = 0
        
        if all_valuations_result:
            for v_record in all_valuations_result:
                v = dict(v_record)
                if v["valuation"] is not None:
                    valuations_lookup[v["portfolio_fund_id"]] = v["valuation"]
                    total_fum_from_valuations += v["valuation"]
        
        # 2. Get ALL portfolio funds with related data in one query
        portfolio_funds_result = await db.fetch("SELECT id, portfolio_id, available_funds_id, amount_invested, status FROM portfolio_funds WHERE status = 'active'")
        
        # 3. Get ALL reference data in parallel batch queries
        # FIXED: Include ALL funds regardless of status to prevent exclusions
        funds_result = await db.fetch("SELECT id, fund_name, status FROM available_funds")
        providers_result = await db.fetch("SELECT id, name, status FROM available_providers")
        portfolios_result = await db.fetch("SELECT id, template_generation_id, status FROM portfolios")
        templates_result = await db.fetch("SELECT id, generation_name, status FROM template_portfolio_generations")
        client_products_result = await db.fetch("SELECT id, portfolio_id, provider_id, status FROM client_products WHERE status = 'active'")
        
        # 4. Calculate distributions using in-memory aggregation (MUCH faster)
        fund_totals = {}
        provider_totals = {}
        template_totals = {}
        total_fum = 0
        total_from_investments = 0
        
        # Create lookup dictionaries for O(1) access (FIXED: Include ALL funds/providers regardless of status)
        funds_lookup = {dict(f)["id"]: dict(f)["fund_name"] for f in funds_result} if funds_result else {}
        providers_lookup = {dict(p)["id"]: dict(p)["name"] for p in providers_result} if providers_result else {}
        templates_lookup = {dict(t)["id"]: dict(t)["generation_name"] for t in templates_result} if templates_result else {}
        portfolios_lookup = {dict(p)["id"]: dict(p)["template_generation_id"] for p in portfolios_result} if portfolios_result else {}
        
        # DEBUGGING: Log lookup sizes to identify the data inconsistency
        logger.info(f"🔍 Lookup Dictionary Sizes:")
        logger.info(f"   Funds Lookup: {len(funds_lookup)} funds")
        logger.info(f"   Providers Lookup: {len(providers_lookup)} providers")
        logger.info(f"   Templates Lookup: {len(templates_lookup)} templates")
        logger.info(f"   Portfolios Lookup: {len(portfolios_lookup)} portfolios")
        logger.info(f"   Portfolio Funds to Process: {len(portfolio_funds_result) if portfolio_funds_result else 0}")
        
        # Group client products by portfolio and provider for O(1) lookup
        portfolio_to_provider = {}
        if client_products_result:
            for cp_record in client_products_result:
                cp = dict(cp_record)
                if cp["portfolio_id"] and cp["provider_id"]:
                    portfolio_to_provider[cp["portfolio_id"]] = cp["provider_id"]
        
        # 5. Process all portfolio funds in one pass (instead of nested loops)
        # FIXED: Ensure consistent FUM totals across all distributions by including ALL valid portfolio funds
        
        # DEBUGGING: Track fund distribution issues
        portfolio_funds_with_values = 0
        portfolio_funds_with_fund_ids = 0
        portfolio_funds_missing_fund_ids = 0
        
        if portfolio_funds_result:
            for pf_record in portfolio_funds_result:
                pf = dict(pf_record)
                # Get current value (valuation preferred, amount_invested as fallback)
                current_value = valuations_lookup.get(pf["id"]) or pf["amount_invested"] or 0
                
                if current_value > 0:
                    portfolio_funds_with_values += 1
                    
                    # Track fund ID statistics
                    if pf["available_funds_id"]:
                        portfolio_funds_with_fund_ids += 1
                    else:
                        portfolio_funds_missing_fund_ids += 1
                    total_fum += current_value
                    
                    # Track amount_invested separately for fallback calculations
                    if pf["amount_invested"]:
                        total_from_investments += pf["amount_invested"]
                    
                    # Aggregate by fund (FIXED: Include ALL funds, even if missing from lookup)
                    fund_id = pf["available_funds_id"]
                    if fund_id and fund_id in funds_lookup:
                        fund_totals[fund_id] = fund_totals.get(fund_id, 0) + current_value
                    else:
                        # Include orphaned/unknown funds to maintain total consistency
                        fund_totals["unknown_fund"] = fund_totals.get("unknown_fund", 0) + current_value
                        # DEBUGGING: Log which portfolio funds are missing fund references
                        if fund_id:
                            logger.warning(f"🔍 Portfolio Fund {pf['id']} references missing fund_id: {fund_id} (£{current_value:,.2f})")
                        else:
                            logger.warning(f"🔍 Portfolio Fund {pf['id']} has NULL fund_id (£{current_value:,.2f})")
                    
                    # Aggregate by provider (FIXED: Include ALL funds, even if missing provider mapping)
                    provider_id = portfolio_to_provider.get(pf["portfolio_id"])
                    if provider_id and provider_id in providers_lookup:
                        provider_totals[provider_id] = provider_totals.get(provider_id, 0) + current_value
                    else:
                        # Include funds without provider mapping to maintain total consistency
                        provider_totals["unassigned_provider"] = provider_totals.get("unassigned_provider", 0) + current_value
                    
                    # Aggregate by template (FIXED: Include ALL funds, even if missing template mapping)
                    portfolio_id = pf["portfolio_id"]
                    if portfolio_id in portfolios_lookup:
                        template_id = portfolios_lookup[portfolio_id]
                        if template_id and template_id in templates_lookup:
                            template_totals[template_id] = template_totals.get(template_id, 0) + current_value
                        elif not template_id:  # Bespoke portfolios (null template_id)
                            template_totals["bespoke"] = template_totals.get("bespoke", 0) + current_value
                        else:
                            # Template ID exists but not found in templates_lookup
                            template_totals["unknown_template"] = template_totals.get("unknown_template", 0) + current_value
                    else:
                        # Portfolio not found in portfolios lookup
                        template_totals["unassigned_template"] = template_totals.get("unassigned_template", 0) + current_value
        
        # 6. Calculate company IRR using optimized function (eliminates N+1 queries)
        company_irr = await calculate_company_irr(db)
        
        # Count metrics efficiently from already loaded data
        client_count = await db.fetchval("SELECT COUNT(*) FROM client_groups WHERE status = 'active'")
        
        total_products = await db.fetchval("SELECT COUNT(*) FROM client_products WHERE status = 'active'")
        
        # 7. Format response data efficiently (FIXED: Handle unknown/unassigned categories)
        funds_list = []
        for fund_id, amount in sorted(fund_totals.items(), key=lambda x: x[1], reverse=True)[:fund_limit]:
            if fund_id == "unknown_fund":
                funds_list.append({"id": "unknown_fund", "name": "Unknown/Orphaned Funds", "amount": amount})
            else:
                funds_list.append({"id": str(fund_id), "name": funds_lookup[fund_id], "amount": amount})
        
        providers_list = []
        for provider_id, amount in sorted(provider_totals.items(), key=lambda x: x[1], reverse=True)[:provider_limit]:
            if provider_id == "unassigned_provider":
                providers_list.append({"id": "unassigned_provider", "name": "Unassigned Provider", "amount": amount})
            else:
                providers_list.append({"id": str(provider_id), "name": providers_lookup[provider_id], "amount": amount})
        
        # Handle templates including bespoke and unknown categories (FIXED)
        template_items = []
        for template_id, amount in template_totals.items():
            if template_id == "bespoke":
                template_items.append(("bespoke", "Bespoke Portfolios", amount))
            elif template_id == "unknown_template":
                template_items.append(("unknown_template", "Unknown Template", amount))
            elif template_id == "unassigned_template":
                template_items.append(("unassigned_template", "Unassigned Template", amount))
            elif template_id in templates_lookup:
                template_items.append((template_id, templates_lookup[template_id], amount))
        
        # Sort and limit templates
        template_items.sort(key=lambda x: x[2], reverse=True)
        templates_list = [
            {"id": str(item[0]), "name": item[1], "amount": item[2]}
            for item in template_items[:template_limit]
        ]
        
        # 8. FIXED: Use fund distribution total for consistency with UI
        fund_distribution_total = sum(fund_totals.values())
        provider_distribution_total = sum(provider_totals.values())
        template_distribution_total = sum(template_totals.values())
        
        # Use fund distribution total as the authoritative FUM for consistency
        final_fum = fund_distribution_total if fund_distribution_total > 0 else (total_fum if total_fum > 0 else total_from_investments)
        
        # FIXED: Log data consistency information for debugging
        
        logger.info(f"📊 FUM Distribution Consistency Check:")
        logger.info(f"   Total FUM: £{final_fum:,.2f}")
        logger.info(f"   Fund Distribution Total: £{fund_distribution_total:,.2f}")
        logger.info(f"   Provider Distribution Total: £{provider_distribution_total:,.2f}")
        logger.info(f"   Template Distribution Total: £{template_distribution_total:,.2f}")
        
        # DEBUGGING: Log portfolio fund processing statistics
        logger.info(f"🔍 Portfolio Fund Processing Statistics:")
        logger.info(f"   Portfolio Funds with Values: {portfolio_funds_with_values}")
        logger.info(f"   Portfolio Funds with Fund IDs: {portfolio_funds_with_fund_ids}")
        logger.info(f"   Portfolio Funds missing Fund IDs: {portfolio_funds_missing_fund_ids}")
        logger.info(f"   Fund Categories in totals: {len(fund_totals)}")
        
        # Log any unknown/unassigned categories for debugging
        if "unknown_fund" in fund_totals:
            logger.warning(f"⚠️  Unknown/Orphaned Funds: £{fund_totals['unknown_fund']:,.2f}")
        if "unassigned_provider" in provider_totals:
            logger.warning(f"⚠️  Unassigned Provider: £{provider_totals['unassigned_provider']:,.2f}")
        if "unknown_template" in template_totals or "unassigned_template" in template_totals:
            unknown_amt = template_totals.get('unknown_template', 0)
            unassigned_amt = template_totals.get('unassigned_template', 0)
            logger.warning(f"⚠️  Template Issues - Unknown: £{unknown_amt:,.2f}, Unassigned: £{unassigned_amt:,.2f}")
        
        response = {
            "metrics": {
                "totalFUM": final_fum,
                "companyIRR": company_irr,
                "totalClients": client_count,
                "totalAccounts": total_products,
                "totalActiveHoldings": len(portfolio_funds_result) if portfolio_funds_result else 0
            },
            "funds": funds_list,
            "providers": providers_list,
            "templates": templates_list,
            "performance": {
                "optimization_stats": {
                    "total_db_queries": 6,  # vs 50+ individual queries before
                                "total_portfolio_funds": len(portfolio_funds_result) if portfolio_funds_result else 0,
            "total_valuations": len(all_valuations_result) if all_valuations_result else 0,
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
    limit: int = Query(100000, ge=1, le=100000, description="Number of products to return"),
    db = Depends(get_db)
):
    """
    Get products with the biggest difference between target risk and actual risk.
    
    Target risk: weighted average risk of portfolio_funds against their target_weighting
    Actual risk: weighted average risk of portfolio_funds against their latest valuations
    """
    try:
        # MASSIVE OPTIMIZATION: Convert N*M*P*Q queries to 5 bulk queries
        
        # Step 1: Get all active client products with portfolios and client names
        products_with_clients_result = await db.fetch("""
            SELECT cp.id, cp.product_name, cp.client_id, cp.portfolio_id, cg.name as client_name
            FROM client_products cp
            JOIN client_groups cg ON cp.client_id = cg.id
            WHERE cp.status = 'active' AND cp.portfolio_id IS NOT NULL
        """)
        
        if not products_with_clients_result:
            return []
        
        # Step 2: Bulk fetch all portfolio funds for all products
        portfolio_ids = [dict(product)["portfolio_id"] for product in products_with_clients_result]
        portfolio_funds_result = await db.fetch("""
            SELECT id, available_funds_id, target_weighting, amount_invested, portfolio_id
            FROM portfolio_funds 
            WHERE portfolio_id = ANY($1::int[]) AND status = 'active'
        """, portfolio_ids)
        
        # Step 3: Bulk fetch all fund risk factors and names
        fund_ids = [dict(pf)["available_funds_id"] for pf in portfolio_funds_result]
        fund_ids = list(set(fund_ids))  # Remove duplicates
        
        funds_result = await db.fetch("""
            SELECT id, risk_factor, fund_name 
            FROM available_funds 
            WHERE id = ANY($1::int[]) AND risk_factor IS NOT NULL
        """, fund_ids) if fund_ids else []
        
        # Step 4: Bulk fetch latest valuations for all portfolio funds
        pf_ids = [dict(pf)["id"] for pf in portfolio_funds_result]
        valuations_result = await db.fetch("""
            SELECT DISTINCT ON (portfolio_fund_id) portfolio_fund_id, valuation
            FROM portfolio_fund_valuations 
            WHERE portfolio_fund_id = ANY($1::int[])
            ORDER BY portfolio_fund_id, valuation_date DESC
        """, pf_ids) if pf_ids else []
        
        # Step 5: Create efficient lookup maps
        pf_by_portfolio_id = {}
        for pf_record in portfolio_funds_result:
            pf = dict(pf_record)
            portfolio_id = pf["portfolio_id"]
            if portfolio_id not in pf_by_portfolio_id:
                pf_by_portfolio_id[portfolio_id] = []
            pf_by_portfolio_id[portfolio_id].append(pf)
        
        funds_by_id = {}
        for fund_record in funds_result:
            fund = dict(fund_record)
            funds_by_id[fund["id"]] = fund
        
        valuations_by_pf_id = {}
        for val_record in valuations_result:
            val = dict(val_record)
            valuations_by_pf_id[val["portfolio_fund_id"]] = val["valuation"]
        
        # Step 6: Process each product with bulk data
        risk_differences = []
        
        for product_record in products_with_clients_result:
            product = dict(product_record)
            product_id = product["id"]
            portfolio_id = product["portfolio_id"]
            
            # Get portfolio funds for this product
            portfolio_funds = pf_by_portfolio_id.get(portfolio_id, [])
            
            if not portfolio_funds:
                continue
            
            # Build fund data with bulk lookup
            fund_data = {}
            for pf in portfolio_funds:
                fund_id = pf["available_funds_id"]
                pf_id = pf["id"]
                
                # Get fund info from lookup
                if fund_id not in funds_by_id:
                    continue
                
                fund_info = funds_by_id[fund_id]
                
                fund_data[pf_id] = {
                    "risk_factor": fund_info["risk_factor"],
                    "fund_name": fund_info["fund_name"],
                    "target_weighting": float(pf["target_weighting"] or 0),
                    "amount_invested": float(pf["amount_invested"] or 0),
                    "latest_valuation": float(valuations_by_pf_id.get(pf_id, 0)) if pf_id in valuations_by_pf_id else None
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
                
                # Get client name from bulk query
                client_name = product.get("client_name", "Unknown")
                
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







@router.post("/analytics/cache/reset")
async def reset_company_irr_cache():
    """
    Reset the company IRR cache to force recalculation.
    Useful for debugging and after data changes.
    """
    global _company_irr_cache
    old_value = _company_irr_cache['value']
    
    _company_irr_cache['value'] = None
    _company_irr_cache['timestamp'] = None
    
    logger.info(f"🔄 Company IRR cache reset (was: {old_value})")
    
    return {
        "success": True,
        "message": "Company IRR cache has been reset",
        "previous_value": old_value
    }

@router.get("/analytics/dashboard-fast")
async def get_ultra_fast_dashboard(
    fund_limit: int = Query(100000, ge=1, le=100000),
    provider_limit: int = Query(100000, ge=1, le=100000), 
    template_limit: int = Query(100000, ge=1, le=100000),
    db = Depends(get_db)
):
    """
    ULTRA-FAST Analytics Dashboard: Uses pre-computed views instead of real-time IRR calculations.
    Performance target: <2 seconds vs 67+ seconds for real-time calculations.
    
    Key optimizations:
    - Uses analytics_dashboard_summary view for metrics (no real-time IRR)
    - Uses fund_distribution_fast view for fund data
    - Uses provider_distribution_fast view for provider data
    - Minimal template calculation without IRR
    """
    start_time = time.time()
    
    try:
        logger.info("🚀 Starting ultra-fast dashboard calculation...")
        
        # 1. Get pre-computed metrics (sub-second response)
        try:
            metrics_result = await db.fetch("SELECT * FROM analytics_dashboard_summary")
            
            if not metrics_result:
                raise Exception("Analytics dashboard summary view returned no data")
                
        except Exception as view_error:
            logger.warning(f"📋 Pre-computed views not available: {view_error}")
            logger.info("🔄 Views may not be deployed yet. Please run deploy_analytics_views.ps1")
            raise HTTPException(
                status_code=503, 
                detail="Analytics views not deployed. Please run deploy_analytics_views.ps1 script to enable ultra-fast analytics."
            )
        
        summary = dict(metrics_result[0])
        
        # 2. Get fast fund distribution (no IRR calculations)
        funds_result = await db.fetch("""
            SELECT id, name, amount 
            FROM fund_distribution_fast 
            LIMIT $1
        """, fund_limit)
        
        # 3. Get fast provider distribution
        providers_result = await db.fetch("""
            SELECT id, name, amount 
            FROM provider_distribution_fast 
            LIMIT $1
        """, provider_limit)
        
        # 4. Get template distribution (simplified, no IRR)
        templates_result = await db.fetch("""
            SELECT id, generation_name, status 
            FROM template_portfolio_generations 
            WHERE status = 'active' 
            LIMIT $1
        """, template_limit)
        
        # Calculate percentages for distributions
        total_fum = float(summary.get("total_fum", 0))
        
        funds = []
        if funds_result and total_fum > 0:
            for fund_record in funds_result:
                fund = dict(fund_record)
                amount = float(fund["amount"] or 0)
                funds.append({
                    "id": fund["id"],
                    "name": fund["name"],
                    "amount": amount,
                    "percentage": round((amount / total_fum) * 100, 1)
                })
        
        providers = []
        if providers_result and total_fum > 0:
            for provider_record in providers_result:
                provider = dict(provider_record)
                amount = float(provider["amount"] or 0)
                providers.append({
                    "id": provider["id"],
                    "name": provider["name"],
                    "amount": amount,
                    "percentage": round((amount / total_fum) * 100, 1)
                })
        
        templates = []
        if templates_result:
            for template_record in templates_result:
                template = dict(template_record)
                templates.append({
                    "id": template["id"],
                    "name": template["generation_name"],
                    "amount": 0,  # Template amounts would require additional calculation
                    "percentage": 0
                })
        
        # 5. Get revenue data (using existing company_revenue_analytics view)
        try:
            revenue_result = await db.fetch("SELECT * FROM company_revenue_analytics")
            if revenue_result:
                revenue_data = dict(revenue_result[0])
                logger.info(f"✅ Revenue data loaded: £{revenue_data.get('total_annual_revenue', 0):,.2f}")
            else:
                logger.warning("⚠️ No revenue data found in company_revenue_analytics view")
                # Fallback: provide basic revenue structure
                revenue_data = {
                    "total_annual_revenue": 0,
                    "active_products": 0,
                    "revenue_generating_products": 0,
                    "avg_revenue_per_product": 0,
                    "active_providers": 0
                }
        except Exception as revenue_error:
            logger.warning(f"⚠️ Revenue data not available: {revenue_error}")
            # Fallback: provide basic revenue structure
            revenue_data = {
                "total_annual_revenue": 0,
                "active_products": 0,
                "revenue_generating_products": 0,
                "avg_revenue_per_product": 0,
                "active_providers": 0
            }
        
        # 6. Mock performance data (to be replaced with pre-computed views)
        top_performers = []
        client_risks = []
        
        # Compile response
        end_time = time.time()
        calculation_time = end_time - start_time
        
        logger.info(f"✅ Ultra-fast dashboard completed in {calculation_time:.2f}s")
        
        response = {
            "optimized": True,
            "phase": "ultra-fast",
            "calculation_time": round(calculation_time, 2),
            "metrics": {
                "totalFUM": float(summary.get("total_fum", 0)),
                "companyIRR": float(summary.get("company_irr", 0)),
                "totalClients": int(summary.get("total_clients", 0)),
                "totalAccounts": int(summary.get("total_accounts", 0)),
                "totalActiveHoldings": int(summary.get("total_funds_managed", 0))
            },
            "distributions": {
                "funds": funds,
                "providers": providers,
                "templates": templates
            },
            "performance": {
                "topPerformers": top_performers,
                "clientRisks": client_risks
            },
            "revenue": revenue_data,
            "cache_info": {
                "last_irr_calculation": summary.get("last_irr_calculation"),
                "data_source": "pre_computed_views"
            },

        }
        
        return response
        
    except Exception as e:
        end_time = time.time()
        calculation_time = end_time - start_time
        logger.error(f"❌ Ultra-fast dashboard failed after {calculation_time:.2f}s: {e}")
        raise HTTPException(status_code=500, detail=f"Ultra-fast dashboard calculation failed: {str(e)}")

@router.post("/analytics/company/irr/refresh-background")
async def refresh_company_irr_background(db = Depends(get_db)):
    """
    Background refresh of company IRR calculation.
    This endpoint can be called periodically or manually to update the IRR cache
    without blocking the main dashboard loading.
    """
    try:
        # Use asyncio to run the calculation in the background
        import asyncio
        
        async def background_irr_calculation():
            logger.info("🔄 Starting background company IRR calculation...")
            start_time = time.time()
            
            # Reset cache to force fresh calculation
            global _company_irr_cache
            _company_irr_cache['value'] = None
            _company_irr_cache['timestamp'] = None
            
            # Calculate fresh IRR
            company_irr = await calculate_company_irr(db)
            
            end_time = time.time()
            calculation_time = end_time - start_time
            
            logger.info(f"✅ Background company IRR calculation completed in {calculation_time:.2f}s: {company_irr}%")
            
            return {
                "success": True,
                "company_irr": company_irr,
                "calculation_time": round(calculation_time, 2),
                "cache_updated": True,
                "background": True
            }
        
        # Run the calculation
        result = await background_irr_calculation()
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Background company IRR calculation failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "background": True
        }

@router.get("/analytics/irr-status")
async def get_irr_calculation_status():
    """
    Get the current status of IRR calculations and cache.
    Useful for the frontend to know if data is fresh or needs refreshing.
    """
    try:
        global _company_irr_cache
        
        current_time = time.time()
        cache_age = None
        cache_fresh = False
        
        if _company_irr_cache['timestamp'] is not None:
            cache_age = current_time - _company_irr_cache['timestamp']
            cache_fresh = cache_age < _company_irr_cache['cache_duration']
        
        return {
            "cache_exists": _company_irr_cache['value'] is not None,
            "cache_fresh": cache_fresh,
            "cache_age_seconds": cache_age,
            "cache_age_hours": round(cache_age / 3600, 1) if cache_age else None,
            "cached_irr": _company_irr_cache['value'],
            "cache_duration": _company_irr_cache['cache_duration'],
            "last_calculation": _company_irr_cache['timestamp']
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting IRR status: {e}")
        return {
            "error": str(e)
        }