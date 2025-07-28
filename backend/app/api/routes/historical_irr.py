from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
from datetime import datetime
from app.db.database import get_db
from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Request deduplication cache to prevent multiple simultaneous identical requests
_active_requests = {}
_request_lock = {}

# Pydantic models for IRR history summary
class IRRHistorySummaryRequest(BaseModel):
    product_ids: List[int]
    selected_dates: List[str]  # YYYY-MM-DD format
    client_group_ids: Optional[List[int]] = None

def _generate_request_key(request: IRRHistorySummaryRequest) -> str:
    """Generate a unique key for request deduplication"""
    return f"summary_{sorted(request.product_ids)}_{sorted(request.selected_dates)}_{request.client_group_ids}"

@router.get("/portfolio/{product_id}")
async def get_portfolio_historical_irr(
    product_id: int,
    limit: Optional[int] = Query(default=12, description="Maximum number of historical IRR records to return"),
    db = Depends(get_db)
):
    """
    Get historical IRR values for a specific product/portfolio.
    Returns up to 'limit' most recent IRR calculations for the portfolio.
    """
    try:
        logger.info(f"Fetching portfolio historical IRR for product {product_id} (limit: {limit})")
        
        # Query the portfolio_historical_irr view
        response = db.table("portfolio_historical_irr") \
            .select("*") \
            .eq("product_id", product_id) \
            .order("irr_date", desc=True) \
            .limit(limit) \
            .execute()
        
        if response.data:
            logger.info(f"Found {len(response.data)} portfolio IRR records for product {product_id}")
            
            # Format the response
            historical_irrs = []
            for record in response.data:
                historical_irrs.append({
                    "irr_id": record["irr_id"],
                    "portfolio_id": record["portfolio_id"],
                    "irr_result": float(record["irr_result"]) if record["irr_result"] is not None else None,
                    "irr_date": record["irr_date"],
                    "portfolio_valuation_id": record["portfolio_valuation_id"],
                    "portfolio_name": record["portfolio_name"],
                    "product_name": record["product_name"],
                    "provider_name": record["provider_name"]
                })
            
            return {
                "product_id": product_id,
                "portfolio_historical_irr": historical_irrs,
                "count": len(historical_irrs)
            }
        else:
            logger.info(f"No portfolio historical IRR data found for product {product_id}")
            return {
                "product_id": product_id,
                "portfolio_historical_irr": [],
                "count": 0
            }
            
    except Exception as e:
        logger.error(f"Error fetching portfolio historical IRR for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio historical IRR: {str(e)}")

@router.get("/funds/{product_id}")
async def get_funds_historical_irr(
    product_id: int,
    limit: Optional[int] = Query(default=12, description="Maximum number of historical IRR records per fund"),
    db = Depends(get_db)
):
    """
    Get historical IRR values for all funds within a specific product/portfolio.
    Returns up to 'limit' most recent IRR calculations for each fund.
    """
    try:
        logger.info(f"Fetching funds historical IRR for product {product_id} (limit: {limit})")
        
        # Query the fund_historical_irr view
        response = db.table("fund_historical_irr") \
            .select("*") \
            .eq("product_id", product_id) \
            .order("portfolio_fund_id") \
            .order("irr_date", desc=True) \
            .execute()
        
        if response.data:
            logger.info(f"Found {len(response.data)} fund IRR records for product {product_id}")
            
            # Group by fund and limit each fund's records
            funds_irr = {}
            for record in response.data:
                fund_id = record["portfolio_fund_id"]
                
                if fund_id not in funds_irr:
                    funds_irr[fund_id] = {
                        "portfolio_fund_id": fund_id,
                        "fund_name": record["fund_name"],
                        "isin_number": record["isin_number"],
                        "risk_factor": record["risk_factor"],
                        "fund_status": record["fund_status"],
                        "target_weighting": float(record["target_weighting"]) if record["target_weighting"] is not None else None,
                        "historical_irr": []
                    }
                
                # Only add if we haven't reached the limit for this fund
                if len(funds_irr[fund_id]["historical_irr"]) < limit:
                    funds_irr[fund_id]["historical_irr"].append({
                        "irr_id": record["irr_id"],
                        "irr_result": float(record["irr_result"]) if record["irr_result"] is not None else None,
                        "irr_date": record["irr_date"],
                        "fund_valuation_id": record["fund_valuation_id"]
                    })
            
            # Convert to list and sort by fund name
            funds_list = list(funds_irr.values())
            funds_list.sort(key=lambda x: x["fund_name"] or "")
            
            return {
                "product_id": product_id,
                "funds_historical_irr": funds_list,
                "total_funds": len(funds_list),
                "total_records": len(response.data)
            }
        else:
            logger.info(f"No funds historical IRR data found for product {product_id}")
            return {
                "product_id": product_id,
                "funds_historical_irr": [],
                "total_funds": 0,
                "total_records": 0
            }
            
    except Exception as e:
        logger.error(f"Error fetching funds historical IRR for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch funds historical IRR: {str(e)}")

@router.post("/summary")
async def get_irr_history_summary(
    request: IRRHistorySummaryRequest,
    db = Depends(get_db)
):
    """
    Get IRR history summary table data for multiple products across selected dates.
    Returns product-level IRR values for each date plus portfolio totals.
    """
    try:
        # Generate request key for deduplication
        request_key = _generate_request_key(request)
        
        # Check if this exact request is already being processed
        if request_key in _active_requests:
            logger.info(f"🔄 Request {request_key} already in progress, waiting for result...")
            # Wait for the existing request to complete and return its result
            return await _active_requests[request_key]
        
        # Mark this request as active
        import asyncio
        future = asyncio.Future()
        _active_requests[request_key] = future
        
        try:
            logger.info(f"🚀 Processing new IRR history summary request: {request_key}")
            logger.info(f"Products: {request.product_ids}, Dates: {len(request.selected_dates)}")
            
            # Validate input
            if not request.product_ids or not request.selected_dates:
                result = {
                    "success": True,
                    "data": {
                        "product_irr_history": [],
                        "portfolio_irr_history": []
                    }
                }
                future.set_result(result)
                return result
            
            product_irr_history = []
            portfolio_irr_history = []
            
            # Get product details with provider information using Supabase client
            logger.info(f"Querying products for IDs: {request.product_ids}")
            product_response = db.table("client_products") \
                .select("id, product_name, provider_id, status, available_providers(name, theme_color)") \
                .in_("id", request.product_ids) \
                .execute()
            
            logger.info(f"Product response: {product_response}")
            logger.info(f"Found {len(product_response.data)} products")
            
            # Create a map of product info for easy lookup
            product_info_map = {}
            for product in product_response.data:
                provider_info = product.get("available_providers", {}) or {}
                product_info_map[product["id"]] = {
                    "product_name": product["product_name"],
                    "provider_name": provider_info.get("name", "Unknown Provider"),
                    "provider_theme_color": provider_info.get("theme_color", "#6B7280"),
                    "status": product.get("status", "unknown")
                }
            
            # Build results structure with product details
            portfolio_irr_history = []
            
            # Skip processing if no dates requested
            if not request.selected_dates:
                result = {
                    "success": True,
                    "portfolio_history": portfolio_irr_history,
                    "products": product_info_map,
                    "product_ids": request.product_ids,
                    "selected_dates": request.selected_dates,
                    "message": "No dates selected for IRR history calculation"
                }
                future.set_result(result)
                return result
            
            # Only process dates that are actually requested
            valid_dates = [date for date in request.selected_dates if date and date.strip()]
            if not valid_dates:
                result = {
                    "success": True,
                    "portfolio_history": portfolio_irr_history,
                    "products": product_info_map,
                    "product_ids": request.product_ids,
                    "selected_dates": request.selected_dates,
                    "message": "No valid dates found for IRR history calculation"
                }
                future.set_result(result)
                return result

            # Only continue if we have valid products
            if not product_response.data:
                result = {
                    "success": True,
                    "portfolio_history": portfolio_irr_history,
                    "products": product_info_map,
                    "product_ids": request.product_ids,
                    "selected_dates": request.selected_dates,
                    "message": "No products found for specified IDs"
                }
                future.set_result(result)
                return result
                
            # Filter out products that don't exist or have issues
            valid_product_ids = []
            for product in product_response.data:
                if product and product.get("id"):
                    valid_product_ids.append(product["id"])
            
            if not valid_product_ids:
                result = {
                    "success": True,
                    "portfolio_history": portfolio_irr_history,
                    "products": product_info_map,
                    "product_ids": request.product_ids,
                    "selected_dates": request.selected_dates,
                    "message": "No valid product IDs found"
                }
                future.set_result(result)
                return result
                
            # Only process valid products from here on
            request.product_ids = valid_product_ids
            
            # Skip if no actual processing needed
            if len(valid_product_ids) == 0:
                result = {
                    "success": True,
                    "portfolio_history": portfolio_irr_history,
                    "products": product_info_map,
                    "product_ids": request.product_ids,
                    "selected_dates": request.selected_dates,
                    "message": "No products to process after validation"
                }
                future.set_result(result)
                return result
                
            # Only process if we have both valid products and valid dates
            if len(valid_dates) == 0 or len(valid_product_ids) == 0:
                result = {
                    "success": True,
                    "portfolio_history": portfolio_irr_history,
                    "products": product_info_map,
                    "product_ids": request.product_ids,
                    "selected_dates": request.selected_dates,
                    "message": "Insufficient data for IRR calculation"
                }
                future.set_result(result)
                return result
            
            # Skip any invalid combinations
            for product_id in request.product_ids:
                if product_id not in product_info_map:
                    logger.warning(f"Product {product_id} not found in product info map, skipping")
                    continue
            
                            # Create flat rows for each product-date combination (for table display)
            for product_id in request.product_ids:
                if product_id not in product_info_map:
                    continue
                    
                product_info = product_info_map[product_id]
                
                for date_str in request.selected_dates:
                    try:
                        # Normalize date format to YYYY-MM-DD
                        normalized_date = date_str.split('T')[0] if 'T' in date_str else date_str
                        
                        # Get IRR value for this product and date from portfolio_historical_irr table
                        product_irr_response = db.table("portfolio_historical_irr") \
                            .select("irr_result") \
                            .eq("product_id", product_id) \
                            .gte("irr_date", normalized_date) \
                            .lt("irr_date", f"{normalized_date}T23:59:59") \
                            .order("irr_date", desc=True) \
                            .limit(1) \
                            .execute()
                        
                        irr_value = None
                        if product_irr_response.data and len(product_irr_response.data) > 0:
                            irr_value = float(product_irr_response.data[0]["irr_result"])
                            logger.info(f"📊 Product {product_id} IRR for {date_str}: {irr_value}%")
                        else:
                            logger.warning(f"⚠️ No IRR data found for product {product_id} on date {date_str}")
                        
                        # Create one flat row per product-date combination
                        product_irr_history.append({
                            "product_id": product_id,
                            "product_name": product_info["product_name"],
                            "provider_name": product_info["provider_name"],
                            "provider_theme_color": product_info["provider_theme_color"],
                            "status": product_info["status"],
                            "irr_date": date_str,
                            "irr_result": irr_value
                        })
                        
                    except Exception as product_date_error:
                        logger.error(f"Error fetching IRR for product {product_id} on date {date_str}: {str(product_date_error)}")
                        # Still create a row with null IRR value for consistency
                        product_irr_history.append({
                            "product_id": product_id,
                            "product_name": product_info["product_name"],
                            "provider_name": product_info["provider_name"],
                            "provider_theme_color": product_info["provider_theme_color"],
                            "status": product_info["status"],
                            "irr_date": date_str,
                            "irr_result": None
                        })
                
            # Calculate portfolio totals for each date using proper portfolio IRR calculation
            for date_str in request.selected_dates:
                try:
                    # Normalize date format to YYYY-MM-DD (remove time component if present)
                    normalized_date = date_str.split('T')[0] if 'T' in date_str else date_str
                    logger.debug(f"📅 Processing date: {date_str} -> normalized: {normalized_date}")
                    
                    # Get all portfolio fund IDs for the selected products
                    # First get all portfolio IDs for the selected products
                    portfolio_ids_response = db.table("client_products") \
                        .select("portfolio_id") \
                        .in_("id", request.product_ids) \
                        .not_.is_("portfolio_id", "null") \
                        .execute()
                    
                    portfolio_ids = [row["portfolio_id"] for row in portfolio_ids_response.data if row["portfolio_id"]]
                    
                    if not portfolio_ids:
                        logger.warning(f"No portfolio IDs found for products {request.product_ids}")
                        portfolio_irr_history.append({
                            "date": date_str,
                            "portfolio_irr": None
                        })
                        continue
                    
                    # Get all portfolio fund IDs from these portfolios
                    portfolio_funds_response = db.table("portfolio_funds") \
                        .select("id") \
                        .in_("portfolio_id", portfolio_ids) \
                        .execute()
                    
                    portfolio_fund_ids = [row["id"] for row in portfolio_funds_response.data]
                    
                    if not portfolio_fund_ids:
                        logger.warning(f"No portfolio fund IDs found for portfolios {portfolio_ids} on date {date_str}")
                        portfolio_irr_history.append({
                            "date": date_str,
                            "portfolio_irr": None
                        })
                        continue
                    
                    logger.debug(f"Calculating portfolio IRR for date {date_str} with {len(portfolio_fund_ids)} funds")
                    
                    # Use the proper portfolio IRR calculation function
                    try:
                        portfolio_irr_result = await calculate_multiple_portfolio_funds_irr(
                            portfolio_fund_ids=portfolio_fund_ids,
                            irr_date=normalized_date,
                            db=db
                        )
                        
                        portfolio_irr = None
                        if portfolio_irr_result and portfolio_irr_result.get("success"):
                            portfolio_irr = portfolio_irr_result.get("irr_percentage")
                            logger.debug(f"✅ Portfolio IRR for {date_str}: {portfolio_irr}%")
                            
                        else:
                            logger.warning(f"⚠️ Portfolio IRR calculation unsuccessful for {date_str}")
                            
                    except Exception as calc_error:
                        logger.warning(f"❌ Portfolio IRR calculation failed for {date_str}: {str(calc_error)}")
                        portfolio_irr = None
                    
                    # Fallback: If portfolio IRR calculation failed, use simple average of individual product IRRs
                    if portfolio_irr is None:
                        logger.debug(f"🔄 Using fallback average for date {date_str}")
                        try:
                            portfolio_irr_response = db.table("portfolio_historical_irr") \
                                .select("irr_result, portfolio_valuation_id") \
                                .in_("product_id", request.product_ids) \
                                .gte("irr_date", normalized_date) \
                                .lt("irr_date", f"{normalized_date}T23:59:59") \
                                .execute()
                            
                            if portfolio_irr_response.data and len(portfolio_irr_response.data) > 0:
                                irr_values = [float(row["irr_result"]) for row in portfolio_irr_response.data if row["irr_result"] is not None]
                                portfolio_irr = sum(irr_values) / len(irr_values) if irr_values else None
                                if portfolio_irr is not None:
                                    logger.debug(f"📊 Fallback average IRR for {date_str}: {portfolio_irr}%")
                        except Exception as fallback_error:
                            logger.error(f"❌ Fallback calculation failed for {date_str}: {str(fallback_error)}")
                            portfolio_irr = None
                    
                    portfolio_irr_history.append({
                        "date": date_str,
                        "portfolio_irr": portfolio_irr
                    })
                    
                except Exception as date_error:
                    logger.error(f"Error calculating portfolio IRR for date {date_str}: {str(date_error)}")
                    portfolio_irr_history.append({
                        "date": date_str,
                        "portfolio_irr": None
                    })
            
            logger.info(f"Successfully fetched IRR history summary: {len(product_irr_history)} products, {len(portfolio_irr_history)} dates")
            
            result = {
                "success": True,
                "data": {
                    "product_irr_history": product_irr_history,
                    "portfolio_irr_history": portfolio_irr_history
                }
            }
            future.set_result(result)
            return result
                
        except Exception as e:
            logger.error(f"Error processing IRR history summary request {request_key}: {str(e)}")
            result = {"success": False, "detail": f"Failed to process IRR history summary: {str(e)}"}
            future.set_result(result)
            return result
        finally:
            # Clean up the active request entry
            if request_key in _active_requests:
                del _active_requests[request_key]
        
    except Exception as e:
        logger.error(f"Error fetching IRR history summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch IRR history summary: {str(e)}")

@router.get("/combined/{product_id}")
async def get_combined_historical_irr(
    product_id: int,
    limit: Optional[int] = Query(default=12, description="Maximum number of historical IRR records"),
    db = Depends(get_db)
):
    """
    Get both portfolio-level and fund-level historical IRR data for a product.
    This is a convenience endpoint that combines both queries.
    """
    try:
        logger.info(f"Fetching combined historical IRR for product {product_id}")
        
        # Fetch both portfolio and fund historical IRR data
        portfolio_data = await get_portfolio_historical_irr(product_id, limit, db)
        funds_data = await get_funds_historical_irr(product_id, limit, db)
        
        return {
            "product_id": product_id,
            "portfolio_historical_irr": portfolio_data["portfolio_historical_irr"],
            "funds_historical_irr": funds_data["funds_historical_irr"],
            "portfolio_count": portfolio_data["count"],
            "funds_count": funds_data["total_funds"],
            "total_fund_records": funds_data["total_records"]
        }
        
    except Exception as e:
        logger.error(f"Error fetching combined historical IRR for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch combined historical IRR: {str(e)}") 