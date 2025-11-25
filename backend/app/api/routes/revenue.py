from fastapi import APIRouter, Depends, HTTPException
from app.db.database import get_db
import logging
import json
import hashlib

logger = logging.getLogger(__name__)

# Create the revenue router
router = APIRouter()

# Simple in-memory cache for revenue rate analytics
_revenue_cache = {
    "data": None,
    "hash": None,
    "timestamp": None
}

@router.get("/revenue/company")
async def get_company_revenue_analytics(db = Depends(get_db)):
    """
    Get company-wide revenue analytics using the company_revenue_analytics view.
    Returns total revenue, breakdown by type, and key metrics.
    """
    try:
        # Query the company_revenue_analytics view
        result = await db.fetch("SELECT * FROM company_revenue_analytics")
        
        if not result:
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
        revenue_data = dict(result[0])
        
        # Extract available fields from the view
        total_annual_revenue = float(revenue_data.get("total_annual_revenue", 0) or 0)
        active_products = int(revenue_data.get("active_products", 0) or 0)
        
        # Calculate derived metrics
        avg_revenue_per_product = (total_annual_revenue / active_products) if active_products > 0 else 0
        # For revenue_generating_products, we'll use active_products as a proxy since the view doesn't distinguish
        revenue_generating_products = active_products
        
        # Ensure all values are properly formatted
        formatted_data = {
            "total_annual_revenue": total_annual_revenue,
            "total_fixed_revenue": float(revenue_data.get("total_fixed_facilitated_revenue", 0) or 0),
            "total_percentage_revenue": float(revenue_data.get("total_percentage_revenue", 0) or 0),
            "active_products": active_products,
            "revenue_generating_products": revenue_generating_products,
            "avg_revenue_per_product": avg_revenue_per_product,
            "active_providers": int(revenue_data.get("active_providers", 0) or 0)
        }
        
        return [formatted_data]  # Return as array for frontend compatibility
        
    except Exception as e:
        logger.error(f"Error fetching company revenue analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching revenue analytics: {str(e)}")

@router.get("/revenue/client-groups")
async def get_client_groups_revenue_breakdown(db = Depends(get_db)):
    """
    Get revenue breakdown by client groups, showing each client group's revenue and percentage of total.
    Updated to include ALL products (active and inactive) for complete business analytics.
    Revenue status logic:
    - complete: All products have complete valuations (green dot - hidden in UI)
    - needs_valuation: At least one product missing valuations (amber dot)
    """
    try:
        # First get the total company revenue for percentage calculations
        company_revenue_result = await db.fetchrow("SELECT total_annual_revenue FROM company_revenue_analytics")
        total_company_revenue = float(company_revenue_result["total_annual_revenue"]) if company_revenue_result else 0
        
        # Get all client groups (active and dormant for complete analytics)
        client_groups = await db.fetch("SELECT id, name, status FROM client_groups WHERE status IN ('active', 'dormant')")
        
        if not client_groups:
            logger.warning("No client groups found")
            return []
        
        revenue_breakdown = []
        
        for client_group in client_groups:
            client_id = client_group["id"]
            client_name = client_group["name"]
            
            # Get all products for this client group (active and inactive for complete analytics)
            products = await db.fetch(
                "SELECT id, fixed_fee_facilitated, percentage_fee_facilitated, portfolio_id FROM client_products WHERE client_id = $1",
                client_id
            )
            
            if not products:
                # Client has no products, add with zero revenue and complete status
                revenue_breakdown.append({
                    "id": client_id,
                    "name": client_name,
                    "status": client_group["status"],
                    "product_count": 0,
                    "total_revenue": 0,
                    "revenue_percentage_of_total": 0,
                    "total_fum": 0,
                    "products_with_revenue": 0,
                    "revenue_status": "complete"  # Green dot - no products, nothing to calculate
                })
                continue
            
            total_client_revenue = 0
            total_client_fum = 0
            products_with_revenue = 0
            
            # Track revenue status for this client - SIMPLIFIED LOGIC
            has_missing_valuations = False  # Any product missing valuations = amber

            for product in products:
                product_id = product["id"]
                portfolio_id = product["portfolio_id"]
                fixed_fee_facilitated = float(product["fixed_fee_facilitated"] or 0)
                percentage_fee_facilitated = float(product["percentage_fee_facilitated"] or 0)
                
                if portfolio_id:
                    # Get portfolio funds for this product
                    portfolio_funds = await db.fetch(
                        "SELECT id, available_funds_id FROM portfolio_funds WHERE portfolio_id = $1 AND status = 'active'",
                        portfolio_id
                    )
                    
                    if portfolio_funds:
                        fund_ids = [pf["id"] for pf in portfolio_funds]
                        
                        # Get latest valuations for these funds
                        valuations = await db.fetch(
                            "SELECT portfolio_fund_id, valuation FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])",
                            fund_ids
                        )
                        
                        # Check if all funds have valuations
                        funds_with_valuations = len(valuations) if valuations else 0
                        total_valuations = sum(float(v["valuation"]) for v in valuations) if valuations else 0
                        
                        if funds_with_valuations == len(fund_ids):
                            product_has_valuations = True
                            product_fum = total_valuations
                        else:
                            product_has_valuations = False
                            product_fum = 0  # Exclude from revenue calculations
                            has_missing_valuations = True  # Mark client as needing amber status
                    else:
                        has_missing_valuations = True  # No funds = missing valuations
                        product_has_valuations = False
                        product_fum = 0
                else:
                    has_missing_valuations = True  # No portfolio = missing valuations
                    product_has_valuations = False
                    product_fum = 0
                
                # Add to totals only if product has complete valuations
                if product_has_valuations:
                    total_client_fum += product_fum
                    
                    # Calculate revenue only for products with complete valuations
                    if fixed_fee_facilitated > 0 or percentage_fee_facilitated > 0:
                        revenue = (fixed_fee_facilitated) + (product_fum * percentage_fee_facilitated / 100)
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
            
            # Add client to breakdown
            revenue_breakdown.append({
                "id": client_id,
                "name": client_name,
                "status": client_group["status"],
                "product_count": len(products),
                "total_revenue": total_client_revenue,
                "revenue_percentage_of_total": revenue_percentage,
                "total_fum": total_client_fum,
                "products_with_revenue": products_with_revenue,
                "revenue_status": revenue_status
            })
        
        # Sort by total revenue (descending)
        revenue_breakdown.sort(key=lambda x: x["total_revenue"], reverse=True)
        
        return revenue_breakdown
        
    except Exception as e:
        logger.error(f"Error calculating client group revenue breakdown: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating revenue breakdown: {str(e)}")

@router.get("/revenue/rate")
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
    global _revenue_cache
    try:

        # Get a hash of all revenue-relevant data to check if recalculation is needed
        # Get all client products with revenue configuration (active and inactive for complete analytics)
        products_for_hash = await db.fetch(
            "SELECT id, client_id, fixed_fee_facilitated, percentage_fee_facilitated, portfolio_id, status FROM client_products"
        )
        
        # Get all latest valuations
        valuations_for_hash = await db.fetch(
            "SELECT portfolio_fund_id, valuation, valuation_date FROM latest_portfolio_fund_valuations"
        )
        
        # Create hash of the revenue-relevant data
        hash_data = {
            "products": [dict(p) for p in products_for_hash],
            "valuations": [dict(v) for v in valuations_for_hash]
        }
        revenue_data_str = json.dumps(hash_data, sort_keys=True, default=str)
        current_hash = hashlib.md5(revenue_data_str.encode()).hexdigest()
        
        # Check if we can use cached result
        if (_revenue_cache["hash"] == current_hash and 
            _revenue_cache["data"] is not None):
            return _revenue_cache["data"]
        
        # Get all client groups (active and dormant for complete analytics)
        client_groups = await db.fetch("SELECT id, name, status FROM client_groups WHERE status IN ('active', 'dormant')")
        
        if not client_groups:
            logger.warning("No client groups found")
            return {
                "total_revenue": 0,
                "total_fum": 0,
                "revenue_rate_percentage": 0,
                "complete_client_groups_count": 0,
                "total_client_groups": 0
            }
        
        total_client_groups = len(client_groups)
        complete_client_groups = []
        total_revenue = 0
        total_fum = 0
        
        for client_group in client_groups:
            client_id = client_group["id"]
            client_name = client_group["name"]
            
            # Get all products for this client group (active and inactive for complete analytics)
            products = await db.fetch(
                "SELECT id, fixed_fee_facilitated, percentage_fee_facilitated, portfolio_id FROM client_products WHERE client_id = $1",
                client_id
            )
            
            if not products:
                continue  # Skip client groups with no products
            
            # Find products with fee setup (including zero fees)
            products_with_fee_setup = []
            products_with_positive_fees = []
            
            for product in products:
                fixed_fee_facilitated_value = product["fixed_fee_facilitated"]
                percentage_fee_facilitated = product["percentage_fee_facilitated"]
                
                # Check if product has any fee setup (including zero fees)
                if fixed_fee_facilitated_value is not None or percentage_fee_facilitated is not None:
                    products_with_fee_setup.append(product)
                    
                    # Also track products with positive fees
                    fixed_fee_facilitated_val = float(fixed_fee_facilitated_value) if fixed_fee_facilitated_value is not None else 0
                    percentage_fee_facilitated_val = float(percentage_fee_facilitated) if percentage_fee_facilitated is not None else 0
                    
                    if fixed_fee_facilitated_val > 0 or percentage_fee_facilitated_val > 0:
                        products_with_positive_fees.append(product)
            
            # Skip if no fee setup at all
            if not products_with_fee_setup:
                continue
                
            # Check if all products with positive fees have complete valuations
            client_complete = True
            client_fum = 0
            client_revenue = 0
            
            for product in products_with_fee_setup:
                portfolio_id = product["portfolio_id"]
                fixed_fee_facilitated_val = float(product["fixed_fee_facilitated"] or 0)
                percentage_fee_facilitated_val = float(product["percentage_fee_facilitated"] or 0)
                
                if portfolio_id:
                    # Get portfolio funds for this product
                    portfolio_funds = await db.fetch(
                        "SELECT id FROM portfolio_funds WHERE portfolio_id = $1 AND status = 'active'",
                        portfolio_id
                    )
                    
                    if portfolio_funds:
                        fund_ids = [pf["id"] for pf in portfolio_funds]
                        
                        # Get latest valuations for these funds
                        valuations = await db.fetch(
                            "SELECT portfolio_fund_id, valuation FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])",
                            fund_ids
                        )
                        
                        # Check if all funds have valuations
                        funds_with_valuations = len(valuations) if valuations else 0
                        total_valuations = sum(float(v["valuation"]) for v in valuations) if valuations else 0
                        
                        # If this product has positive fees, it must have complete valuations to be "complete"
                        if fixed_fee_facilitated_val > 0 or percentage_fee_facilitated_val > 0:
                            if funds_with_valuations != len(fund_ids):
                                client_complete = False
                                continue  # Skip this product for revenue calculation
                        
                        # Add to FUM (for both zero and positive fee products if they have valuations)
                        if funds_with_valuations == len(fund_ids):
                            client_fum += total_valuations
                            
                            # Calculate revenue (only for positive fee products)
                            if fixed_fee_facilitated_val > 0 or percentage_fee_facilitated_val > 0:
                                product_revenue = fixed_fee_facilitated_val + (total_valuations * percentage_fee_facilitated_val / 100)
                                client_revenue += product_revenue
                    else:
                        # Product has no funds - if it has positive fees, mark as incomplete
                        if fixed_fee_facilitated_val > 0 or percentage_fee_facilitated_val > 0:
                            client_complete = False
                else:
                    # Product has no portfolio - if it has positive fees, mark as incomplete
                    if fixed_fee_facilitated_val > 0 or percentage_fee_facilitated_val > 0:
                        client_complete = False
            
            # Only include complete clients in totals
            if client_complete:
                complete_client_groups.append({
                    "id": client_id,
                    "name": client_name,
                    "fum": client_fum,
                    "revenue": client_revenue
                })
                total_fum += client_fum
                total_revenue += client_revenue
        
        # Calculate revenue rate percentage
        revenue_rate_percentage = (total_revenue / total_fum * 100) if total_fum > 0 else 0
        
        result = {
            "total_revenue": total_revenue,
            "total_fum": total_fum,
            "revenue_rate_percentage": revenue_rate_percentage,
            "complete_client_groups_count": len(complete_client_groups),
            "total_client_groups": total_client_groups
        }
        
        # Cache the result
        _revenue_cache = {
            "data": result,
            "hash": current_hash,
            "timestamp": None  # Could add timestamp if needed
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error calculating revenue rate analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating revenue rate: {str(e)}")

@router.post("/revenue/rate/refresh")
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

@router.get("/revenue/optimized")
async def get_revenue_breakdown_optimized(db = Depends(get_db)):
    """
    Optimized revenue breakdown endpoint using pre-joined database view
    Eliminates N+1 query problems for fast loading
    """
    try:
        logger.info("Fetching optimized revenue breakdown")
        
        # Single query to get all revenue data using optimized view
        result = await db.fetch("SELECT * FROM revenue_analytics_optimized")
        
        if not result:
            return []
        
        # Group data by client for aggregation
        client_data = {}
        
        for row in result:
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
                    fixed_fee_facilitated = float(row["fixed_fee_facilitated"] or 0)
                    percentage_fee_facilitated = float(row["percentage_fee_facilitated"] or 0)
                    
                    if fixed_fee_facilitated > 0 or percentage_fee_facilitated > 0:
                        revenue = fixed_fee_facilitated + (product_fum * percentage_fee_facilitated / 100)
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