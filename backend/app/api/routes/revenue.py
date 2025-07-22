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

@router.get("/revenue/client-groups")
async def get_client_groups_revenue_breakdown(db = Depends(get_db)):
    """
    Get revenue breakdown by client groups, showing each client group's revenue and percentage of total.
    Updated to handle 2-state revenue status logic:
    - complete: All products have complete valuations (green dot - hidden in UI)
    - needs_valuation: At least one product missing valuations (amber dot)
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
            
            # Get all active products for this client group
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

            for product in products_result.data:
                product_id = product["id"]
                portfolio_id = product.get("portfolio_id")
                fixed_cost = float(product.get("fixed_cost", 0) or 0)
                percentage_fee = float(product.get("percentage_fee", 0) or 0)
                
                if portfolio_id:
                    # Get portfolio funds for this product
                    portfolio_funds_result = db.table("portfolio_funds")\
                        .select("id, available_funds_id")\
                        .eq("portfolio_id", portfolio_id)\
                        .eq("status", "active")\
                        .execute()
                    
                    if portfolio_funds_result.data:
                        fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
                        
                        # Get latest valuations for these funds
                        valuations_result = db.table("latest_portfolio_fund_valuations")\
                            .select("portfolio_fund_id, valuation")\
                            .in_("portfolio_fund_id", fund_ids)\
                            .execute()
                        
                        # Check if all funds have valuations
                        funds_with_valuations = len(valuations_result.data) if valuations_result.data else 0
                        total_valuations = sum(float(v["valuation"]) for v in valuations_result.data) if valuations_result.data else 0
                        
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
            
            # Add client to breakdown
            revenue_breakdown.append({
                "id": client_id,
                "name": client_name,
                "status": client_group["status"],
                "product_count": len(products_result.data),
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
            
            # Skip if no fee setup at all
            if not products_with_fee_setup:
                continue
                
            # Check if all products with positive fees have complete valuations
            client_complete = True
            client_fum = 0
            client_revenue = 0
            
            for product in products_with_fee_setup:
                portfolio_id = product.get("portfolio_id")
                fixed_cost_val = float(product.get("fixed_cost", 0) or 0)
                percentage_fee_val = float(product.get("percentage_fee", 0) or 0)
                
                if portfolio_id:
                    # Get portfolio funds for this product
                    portfolio_funds_result = db.table("portfolio_funds")\
                        .select("id")\
                        .eq("portfolio_id", portfolio_id)\
                        .eq("status", "active")\
                        .execute()
                    
                    if portfolio_funds_result.data:
                        fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
                        
                        # Get latest valuations for these funds
                        valuations_result = db.table("latest_portfolio_fund_valuations")\
                            .select("portfolio_fund_id, valuation")\
                            .in_("portfolio_fund_id", fund_ids)\
                            .execute()
                        
                        # Check if all funds have valuations
                        funds_with_valuations = len(valuations_result.data) if valuations_result.data else 0
                        total_valuations = sum(float(v["valuation"]) for v in valuations_result.data) if valuations_result.data else 0
                        
                        # If this product has positive fees, it must have complete valuations to be "complete"
                        if fixed_cost_val > 0 or percentage_fee_val > 0:
                            if funds_with_valuations != len(fund_ids):
                                client_complete = False
                                continue  # Skip this product for revenue calculation
                        
                        # Add to FUM (for both zero and positive fee products if they have valuations)
                        if funds_with_valuations == len(fund_ids):
                            client_fum += total_valuations
                            
                            # Calculate revenue (only for positive fee products)
                            if fixed_cost_val > 0 or percentage_fee_val > 0:
                                product_revenue = fixed_cost_val + (total_valuations * percentage_fee_val / 100)
                                client_revenue += product_revenue
                    else:
                        # Product has no funds - if it has positive fees, mark as incomplete
                        if fixed_cost_val > 0 or percentage_fee_val > 0:
                            client_complete = False
                else:
                    # Product has no portfolio - if it has positive fees, mark as incomplete
                    if fixed_cost_val > 0 or percentage_fee_val > 0:
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