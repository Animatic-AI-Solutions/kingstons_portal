from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
from datetime import datetime, date, timedelta
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

@router.get("/portfolio-irr-values/{portfolio_id}")
async def get_portfolio_irr_values(
    portfolio_id: int,
    db = Depends(get_db)
):
    """
    Get stored portfolio IRR values directly from portfolio_irr_values table.
    This returns the actual stored portfolio-level IRR calculations, not fund averages.
    """
    try:
        logger.info(f"Fetching stored portfolio IRR values for portfolio {portfolio_id}")

        # Query the portfolio_irr_values table directly
        result = await db.fetch(
            """
            SELECT id, portfolio_id, date, irr_result, created_at
            FROM portfolio_irr_values
            WHERE portfolio_id = $1
            ORDER BY date DESC
            """,
            portfolio_id
        )

        if result:
            logger.info(f"Found {len(result)} stored portfolio IRR values for portfolio {portfolio_id}")

            # Format the response
            irr_values = []
            for record in result:
                irr_values.append({
                    "id": record["id"],
                    "portfolio_id": record["portfolio_id"],
                    "date": record["date"],
                    "irr_result": float(record["irr_result"]) if record["irr_result"] is not None else None,
                    "created_at": record["created_at"]
                })

            return irr_values
        else:
            logger.info(f"No stored portfolio IRR values found for portfolio {portfolio_id}")
            return []

    except Exception as e:
        logger.error(f"Error fetching stored portfolio IRR values for portfolio {portfolio_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stored portfolio IRR values: {str(e)}")

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
            
            # For each product, get stored IRR values for each selected date
            for product_id in request.product_ids:
                if product_id not in product_info_map:
                    continue
                    
                product_info = product_info_map[product_id]
                
                # Get portfolio ID for this product
                portfolio_id_result = await db.fetchrow(
                    "SELECT portfolio_id FROM client_products WHERE id = $1",
                    product_id
                )
                
                if not portfolio_id_result or not portfolio_id_result["portfolio_id"]:
                    # Create null entries for consistency
                    for date_str in request.selected_dates:
                        product_irr_history.append({
                            "product_id": product_id,
                            "product_name": product_info["product_name"],
                            "provider_name": product_info["provider_name"],
                            "provider_theme_color": product_info["provider_theme_color"],
                            "status": product_info["status"],
                            "irr_date": date_str,
                            "irr_result": None,
                            "valuation": None,
                            "profit": None,
                            "investments": None,
                            "withdrawals": None
                        })
                    continue
                
                portfolio_id = portfolio_id_result["portfolio_id"]
                
                # For each selected date, fetch stored IRR from portfolio_irr_values table
                for date_str in request.selected_dates:
                    try:
                        # Normalize date format to YYYY-MM-DD
                        normalized_date_str = date_str.split('T')[0] if 'T' in date_str else date_str
                        normalized_date = datetime.strptime(normalized_date_str, "%Y-%m-%d").date()
                        
                        # Fetch stored IRR from portfolio_historical_irr (same source as individual product cards)
                        stored_irr_result = await db.fetchrow(
                            """
                            SELECT irr_result, date
                            FROM portfolio_historical_irr
                            WHERE portfolio_id = $1 AND date = $2
                            """,
                            portfolio_id, normalized_date
                        )
                        
                        logger.info(f"🔍 [SUMMARY ENDPOINT DEBUG] Product {product_id} (portfolio {portfolio_id}) for date {normalized_date}: {stored_irr_result['irr_result'] if stored_irr_result else None}% (from portfolio_historical_irr table)")
                        
                        irr_value = None
                        if stored_irr_result and stored_irr_result["irr_result"] is not None:
                            irr_value = float(stored_irr_result["irr_result"])

                        logger.info(f"🔍 [SUMMARY ENDPOINT RESULT] Product {product_id} for date {date_str}: storing irr_result = {irr_value}% in response")

                        # Fetch valuation for this portfolio on this date
                        valuation = 0.0
                        valuation_result = await db.fetchrow(
                            """
                            SELECT SUM(fv.valuation) as total_valuation
                            FROM portfolio_fund_valuations fv
                            JOIN portfolio_funds pf ON pf.id = fv.portfolio_fund_id
                            WHERE pf.portfolio_id = $1 AND fv.valuation_date = $2
                            """,
                            portfolio_id, normalized_date
                        )
                        if valuation_result and valuation_result["total_valuation"]:
                            valuation = float(valuation_result["total_valuation"])

                        # Fetch activities up to this date and sum by type for profit calculation
                        activities = await db.fetch(
                            """
                            SELECT activity_type, SUM(amount) as total_amount
                            FROM holding_activity_log
                            WHERE portfolio_fund_id IN (
                                SELECT id FROM portfolio_funds WHERE portfolio_id = $1
                            )
                            AND activity_timestamp <= $2
                            GROUP BY activity_type
                            """,
                            portfolio_id, normalized_date
                        )

                        # Calculate profit components
                        investments = 0.0
                        withdrawals = 0.0

                        for activity in activities:
                            activity_type = activity["activity_type"].lower()
                            amount = float(activity["total_amount"])

                            # Money IN (subtract from profit)
                            if any(keyword in activity_type for keyword in ["investment", "taxuplift", "fundswitchin", "productswitchin"]):
                                investments += amount
                            # Money OUT (subtract from profit)
                            elif any(keyword in activity_type for keyword in ["withdrawal", "fundswitchout", "productswitchout"]):
                                withdrawals += amount

                        # Calculate profit: valuation - investments - withdrawals
                        profit = valuation - investments - withdrawals

                        # Add entry with stored IRR and calculated profit/valuation
                        product_irr_history.append({
                            "product_id": product_id,
                            "product_name": product_info["product_name"],
                            "provider_name": product_info["provider_name"],
                            "provider_theme_color": product_info["provider_theme_color"],
                            "status": product_info["status"],
                            "irr_date": date_str,
                            "irr_result": irr_value,
                            "valuation": valuation,
                            "profit": profit,
                            "investments": investments,
                            "withdrawals": withdrawals
                        })
                        
                    except Exception as product_date_error:
                        logger.error(f"Error fetching stored IRR for product {product_id} on date {date_str}: {str(product_date_error)}")
                        # Still create a row with null values for consistency
                        product_irr_history.append({
                            "product_id": product_id,
                            "product_name": product_info["product_name"],
                            "provider_name": product_info["provider_name"],
                            "provider_theme_color": product_info["provider_theme_color"],
                            "status": product_info["status"],
                            "irr_date": date_str,
                            "irr_result": None,
                            "valuation": None,
                            "profit": None,
                            "investments": None,
                            "withdrawals": None
                        })
                
            # Calculate portfolio totals for each date (aggregated across multiple portfolios)
            for date_str in request.selected_dates:
                try:
                    # Normalize date format to YYYY-MM-DD (remove time component if present)
                    normalized_date_str = date_str.split('T')[0] if 'T' in date_str else date_str
                    logger.debug(f"📅 Processing portfolio total for date: {date_str} -> normalized: {normalized_date_str}")
                    
                    # Convert string to date object for database queries
                    normalized_date = datetime.strptime(normalized_date_str, "%Y-%m-%d").date()
                    
                    # Get all portfolio fund IDs for the selected products (this needs to be calculated)
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
                            "portfolio_irr": None,
                            "valuation": None,
                            "profit": None,
                            "investments": None,
                            "withdrawals": None
                        })
                        continue
                    
                    # Get all portfolio fund IDs from these portfolios for aggregated calculation
                    portfolio_funds = await db.fetch(
                        "SELECT id FROM portfolio_funds WHERE portfolio_id = ANY($1::int[])",
                        portfolio_id_list
                    )
                    
                    portfolio_fund_ids = [row["id"] for row in portfolio_funds]
                    
                    if not portfolio_fund_ids:
                        logger.warning(f"No portfolio fund IDs found for portfolios {portfolio_id_list} on date {date_str}")
                        portfolio_irr_history.append({
                            "date": date_str,
                            "portfolio_irr": None,
                            "valuation": None,
                            "profit": None,
                            "investments": None,
                            "withdrawals": None
                        })
                        continue
                    
                    logger.debug(f"📊 Calculating aggregated portfolio IRR for date {date_str} with {len(portfolio_fund_ids)} funds from {len(portfolio_id_list)} portfolios")
                    
                    # Use the proper portfolio IRR calculation function for aggregated calculation
                    try:
                        # Import here to avoid potential circular import issues
                        from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr
                        
                        portfolio_irr_result = await calculate_multiple_portfolio_funds_irr(
                            portfolio_fund_ids=portfolio_fund_ids,
                            irr_date=normalized_date,  # Now passing date object instead of string
                            db=db
                        )
                        
                        portfolio_irr = None
                        if portfolio_irr_result and portfolio_irr_result.get("success"):
                            portfolio_irr = portfolio_irr_result.get("irr_percentage")
                            logger.info(f"✅ Calculated aggregated portfolio IRR for {date_str}: {portfolio_irr}%")
                        else:
                            logger.warning(f"⚠️ Portfolio IRR calculation returned unsuccessful result for {date_str}: {portfolio_irr_result}")
                            
                    except Exception as calc_error:
                        logger.error(f"❌ Portfolio IRR calculation failed for {date_str}: {str(calc_error)}")
                        portfolio_irr = None

                    # Get total valuation for all portfolios on this date
                    total_valuation = 0.0
                    valuation_result = await db.fetchrow(
                        """
                        SELECT SUM(fv.valuation) as total_valuation
                        FROM portfolio_fund_valuations fv
                        JOIN portfolio_funds pf ON pf.id = fv.portfolio_fund_id
                        WHERE pf.portfolio_id = ANY($1::int[]) AND fv.valuation_date = $2
                        """,
                        portfolio_id_list, normalized_date
                    )
                    if valuation_result and valuation_result["total_valuation"]:
                        total_valuation = float(valuation_result["total_valuation"])

                    # Get total activities for all portfolios up to this date
                    activities = await db.fetch(
                        """
                        SELECT activity_type, SUM(amount) as total_amount
                        FROM holding_activity_log
                        WHERE portfolio_fund_id IN (
                            SELECT id FROM portfolio_funds WHERE portfolio_id = ANY($1::int[])
                        )
                        AND activity_timestamp <= $2
                        GROUP BY activity_type
                        """,
                        portfolio_id_list, normalized_date
                    )

                    # Calculate total profit components
                    total_investments = 0.0
                    total_withdrawals = 0.0

                    for activity in activities:
                        activity_type = activity["activity_type"].lower()
                        amount = float(activity["total_amount"])

                        # Money IN (subtract from profit)
                        if any(keyword in activity_type for keyword in ["investment", "taxuplift", "fundswitchin", "productswitchin"]):
                            total_investments += amount
                        # Money OUT (subtract from profit)
                        elif any(keyword in activity_type for keyword in ["withdrawal", "fundswitchout", "productswitchout"]):
                            total_withdrawals += amount

                    # Calculate total profit: valuation - investments - withdrawals
                    total_profit = total_valuation - total_investments - total_withdrawals

                    portfolio_irr_history.append({
                        "date": date_str,
                        "portfolio_irr": portfolio_irr,
                        "valuation": total_valuation,
                        "profit": total_profit,
                        "investments": total_investments,
                        "withdrawals": total_withdrawals
                    })
                    
                except Exception as date_error:
                    logger.error(f"Error calculating aggregated portfolio IRR for date {date_str}: {str(date_error)}")
                    portfolio_irr_history.append({
                        "date": date_str,
                        "portfolio_irr": None,
                        "valuation": None,
                        "profit": None,
                        "investments": None,
                        "withdrawals": None
                    })
            
            logger.info(f"Successfully fetched IRR history summary: {len(product_irr_history)} product rows, {len(portfolio_irr_history)} date totals")
            
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