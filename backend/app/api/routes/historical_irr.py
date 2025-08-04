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
        
        # Query the portfolio_historical_irr view - note: view uses portfolio_id, not product_id
        # We need to join through client_products to filter by product_id
        result = await db.fetch(
            """
            SELECT phi.portfolio_id, phi.portfolio_name, phi.date as irr_date, 
                   phi.irr_result, phi.product_name, phi.provider_name,
                   phi.created_at, cp.id as product_id
            FROM portfolio_historical_irr phi
            JOIN client_products cp ON phi.portfolio_id = cp.portfolio_id
            WHERE cp.id = $1 
            ORDER BY phi.date DESC 
            LIMIT $2
            """,
            product_id, limit
        )
        
        if result:
            logger.info(f"Found {len(result)} portfolio IRR records for product {product_id}")
            
            # Format the response
            historical_irrs = []
            for record in result:
                historical_irrs.append({
                    "irr_id": None,  # Not available in view
                    "portfolio_id": record["portfolio_id"],
                    "irr_result": float(record["irr_result"]) if record["irr_result"] is not None else None,
                    "irr_date": record["irr_date"],
                    "portfolio_valuation_id": None,  # Not available in view
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
        
        # Query the fund_historical_irr view - need to join through client_products
        result = await db.fetch(
            """
            SELECT fhi.fund_id, fhi.portfolio_id, fhi.fund_name, fhi.isin_number, 
                   fhi.risk_factor, fhi.date as irr_date, fhi.irr_result,
                   fhi.portfolio_name, fhi.product_name, fhi.provider_name,
                   cp.id as product_id
            FROM fund_historical_irr fhi
            JOIN client_products cp ON fhi.portfolio_id = cp.portfolio_id
            WHERE cp.id = $1 
            ORDER BY fhi.fund_id, fhi.date DESC
            """,
            product_id
        )
        
        if result:
            logger.info(f"Found {len(result)} fund IRR records for product {product_id}")
            
            # Group by fund and limit each fund's records
            funds_irr = {}
            for record in result:
                fund_id = record["fund_id"]
                
                if fund_id not in funds_irr:
                    funds_irr[fund_id] = {
                        "portfolio_fund_id": fund_id,
                        "fund_name": record["fund_name"],
                        "isin_number": record["isin_number"],
                        "risk_factor": record["risk_factor"],
                        "fund_status": None,  # Not available in view
                        "target_weighting": None,  # Not available in view
                        "historical_irr": []
                    }
                
                # Only add if we haven't reached the limit for this fund
                if len(funds_irr[fund_id]["historical_irr"]) < limit:
                    funds_irr[fund_id]["historical_irr"].append({
                        "irr_id": None,  # Not available in view
                        "irr_result": float(record["irr_result"]) if record["irr_result"] is not None else None,
                        "irr_date": record["irr_date"],
                        "fund_valuation_id": None  # Not available in view
                    })
            
            # Convert to list and sort by fund name
            funds_list = list(funds_irr.values())
            funds_list.sort(key=lambda x: x["fund_name"] or "")
            
            return {
                "product_id": product_id,
                "funds_historical_irr": funds_list,
                "total_funds": len(funds_list),
                "total_records": len(result)
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
            
            # Get product details with provider information using AsyncPG
            logger.info(f"Querying products for IDs: {request.product_ids}")
            
            # Since available_providers join doesn't exist, we'll do separate queries
            products = await db.fetch(
                "SELECT id, product_name, provider_id, status FROM client_products WHERE id = ANY($1::int[])",
                request.product_ids
            )
            
            logger.info(f"Found {len(products)} products")
            
            # Get provider information separately
            provider_ids = [p["provider_id"] for p in products if p["provider_id"]]
            providers = {}
            if provider_ids:
                provider_results = await db.fetch(
                    "SELECT id, name, theme_color FROM available_providers WHERE id = ANY($1::int[])",
                    provider_ids
                )
                providers = {p["id"]: p for p in provider_results}
            
            # Create a map of product info for easy lookup
            product_info_map = {}
            for product in products:
                provider_info = providers.get(product["provider_id"], {})
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
            if not products:
                result = {
                    "success": True,
                    "portfolio_history": portfolio_irr_history,
                    "products": product_info_map,
                    "product_ids": request.product_ids,
                    "selected_dates": request.selected_dates,
                    "message": "No valid products found"
                }
                future.set_result(result)
                return result
            
            # For each product, get IRR values for each selected date
            for product_id in request.product_ids:
                if product_id not in product_info_map:
                    logger.warning(f"Product {product_id} not found in product info map")
                    continue
                    
                product_info = product_info_map[product_id]
                
                for date_str in request.selected_dates:
                    try:
                        # Normalize date format to YYYY-MM-DD
                        normalized_date = date_str.split('T')[0] if 'T' in date_str else date_str
                        
                        # Get IRR value for this product and date from portfolio_historical_irr view
                        irr_result = await db.fetchrow(
                            """
                            SELECT phi.irr_result FROM portfolio_historical_irr phi
                            JOIN client_products cp ON phi.portfolio_id = cp.portfolio_id
                            WHERE cp.id = $1 
                              AND phi.date >= $2 
                              AND phi.date < $3 
                            ORDER BY phi.date DESC 
                            LIMIT 1
                            """,
                            product_id, normalized_date, f"{normalized_date}T23:59:59"
                        )
                        
                        irr_value = None
                        if irr_result:
                            irr_value = float(irr_result["irr_result"])
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
                    portfolio_ids = await db.fetch(
                        """
                        SELECT portfolio_id FROM client_products 
                        WHERE id = ANY($1::int[]) AND portfolio_id IS NOT NULL
                        """,
                        request.product_ids
                    )
                    
                    portfolio_id_list = [row["portfolio_id"] for row in portfolio_ids if row["portfolio_id"]]
                    
                    if not portfolio_id_list:
                        logger.warning(f"No portfolio IDs found for products {request.product_ids}")
                        portfolio_irr_history.append({
                            "date": date_str,
                            "portfolio_irr": None
                        })
                        continue
                    
                    # Get all portfolio fund IDs from these portfolios
                    portfolio_funds = await db.fetch(
                        "SELECT id FROM portfolio_funds WHERE portfolio_id = ANY($1::int[])",
                        portfolio_id_list
                    )
                    
                    portfolio_fund_ids = [row["id"] for row in portfolio_funds]
                    
                    if not portfolio_fund_ids:
                        logger.warning(f"No portfolio fund IDs found for portfolios {portfolio_id_list} on date {date_str}")
                        portfolio_irr_history.append({
                            "date": date_str,
                            "portfolio_irr": None
                        })
                        continue
                    
                    logger.debug(f"📊 Calculating portfolio IRR for date {date_str} with {len(portfolio_fund_ids)} funds: {portfolio_fund_ids}")
                    
                    # Before calculating IRR, check if all portfolio funds have valuations for this date
                    # This prevents IRR calculation failures due to incomplete data
                    logger.debug(f"🔍 Checking valuation availability for {len(portfolio_fund_ids)} funds on {normalized_date}")
                    
                    valuation_check = await db.fetch(
                        """
                        SELECT DISTINCT ON (portfolio_fund_id) 
                            portfolio_fund_id, valuation 
                        FROM portfolio_fund_valuations 
                        WHERE portfolio_fund_id = ANY($1::int[]) 
                          AND valuation_date <= $2
                        ORDER BY portfolio_fund_id, valuation_date DESC
                        """,
                        portfolio_fund_ids, normalized_date
                    )
                    
                    # Group by portfolio_fund_id to get the latest valuation for each fund
                    fund_valuations = {}
                    for row in valuation_check:
                        fund_id = row["portfolio_fund_id"]
                        if fund_id not in fund_valuations:
                            fund_valuations[fund_id] = row["valuation"]
                    
                    # Check if all funds have valuations
                    missing_valuations = [fund_id for fund_id in portfolio_fund_ids if fund_id not in fund_valuations or fund_valuations[fund_id] is None]
                    
                    if missing_valuations:
                        logger.warning(f"⚠️ Missing valuations for funds {missing_valuations} as of {normalized_date}. Cannot calculate accurate IRR - returning N/A")
                        portfolio_irr_history.append({
                            "date": date_str,
                            "portfolio_irr": None  # N/A when data is incomplete
                        })
                        continue
                    
                    logger.debug(f"✅ All {len(portfolio_fund_ids)} funds have valuations for {normalized_date}")
                    
                    # Use the proper portfolio IRR calculation function - this is the ONLY method we should use
                    try:
                        portfolio_irr_result = await calculate_multiple_portfolio_funds_irr(
                            portfolio_fund_ids=portfolio_fund_ids,
                            irr_date=normalized_date,
                            db=db
                        )
                        
                        portfolio_irr = None
                        if portfolio_irr_result and portfolio_irr_result.get("success"):
                            portfolio_irr = portfolio_irr_result.get("irr_percentage")
                            logger.info(f"✅ Portfolio IRR for {date_str}: {portfolio_irr}% using proper cash flow methodology")
                        else:
                            logger.warning(f"⚠️ Portfolio IRR calculation returned unsuccessful result for {date_str}: {portfolio_irr_result}")
                            
                    except Exception as calc_error:
                        logger.error(f"❌ Portfolio IRR calculation failed for {date_str}: {str(calc_error)}")
                        portfolio_irr = None
                    
                    # No fallback averaging - if the proper calculation fails, we return None
                    # This ensures mathematical accuracy by only using cash flow-based IRR calculations
                    
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