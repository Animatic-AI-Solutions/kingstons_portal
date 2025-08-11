from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional
import logging
from datetime import datetime, date
from decimal import Decimal

from app.models.holding_activity_log import HoldingActivityLog, HoldingActivityLogCreate, HoldingActivityLogUpdate
from app.db.database import get_db

# Import standardized IRR calculation functions
from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr, calculate_multiple_portfolio_funds_irr

# Import modern IRR cascade service
from app.services.irr_cascade_service import IRRCascadeService

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def recalculate_irr_after_activity_change(portfolio_fund_id: int, db, activity_date: str = None):
    """
    OPTIMIZED: This function now uses targeted IRR recalculation for single activities.
    
    Delegates to IRRCascadeService.handle_activity_changes_batch() with only the
    specific activity date, avoiding expensive historical recalculation.
    
    Args:
        portfolio_fund_id: The portfolio fund that was affected by the activity change
        db: Database connection
        activity_date: The date of the activity that was changed (YYYY-MM-DD format)
    """
    try:
        # Import the modern IRR cascade service
        from app.services.irr_cascade_service import IRRCascadeService
        
        logger.info(f"⚡ [OPTIMIZED] Targeted IRR recalculation for portfolio_fund {portfolio_fund_id} on date {activity_date or 'latest'}")
        
        # Get portfolio_id from portfolio_fund_id
        portfolio_fund_result = await db.fetchrow(
            "SELECT portfolio_id FROM portfolio_funds WHERE id = $1",
            portfolio_fund_id
        )
        
        if not portfolio_fund_result:
            logger.error(f"Portfolio fund {portfolio_fund_id} not found")
            return {"success": False, "error": "Portfolio fund not found"}
        
        portfolio_id = portfolio_fund_result["portfolio_id"]
        
        # Get the latest activity date if not provided
        if not activity_date:
            latest_activity = await db.fetchrow(
                "SELECT activity_timestamp FROM holding_activity_log WHERE portfolio_fund_id = $1 ORDER BY activity_timestamp DESC LIMIT 1",
                portfolio_fund_id
            )
            
            if latest_activity:
                activity_date = str(latest_activity["activity_timestamp"]).split('T')[0]
            else:
                logger.warning(f"No activities found for portfolio fund {portfolio_fund_id}")
                return {"success": False, "error": "No activities found"}
        
        # Use the IRR cascade service for targeted activity processing
        irr_service = IRRCascadeService(db)
        
        # For single activity changes, only process the specific activity date
        # This is much more efficient than processing all historical dates
        cascade_result = await irr_service.handle_activity_changes_batch(portfolio_id, [activity_date])
        
        if cascade_result.get("success"):
            logger.info(f"✅ [ACTIVITY WRAPPER] Targeted IRR cascade completed successfully: {cascade_result}")
            
            # Transform cascade service result to match legacy return format
            return {
                "success": True,
                "portfolio_fund_id": portfolio_fund_id,
                "portfolio_id": portfolio_id,
                "activity_start_date": activity_date,
                "recalculated_existing": cascade_result.get("fund_irrs_recalculated", 0),
                "new_entries_created": 0,  # Cascade service updates existing, doesn't create duplicates
                "portfolio_irr_recalculated": cascade_result.get("portfolio_irrs_recalculated", 0),
                "dates_processed": cascade_result.get("dates_processed", 0),
                "cascade_service_used": True,
                "method": "targeted_activity_batch"
            }
        else:
            logger.error(f"❌ [ACTIVITY WRAPPER] Targeted IRR cascade failed: {cascade_result}")
            return cascade_result
        
    except Exception as e:
        logger.error(f"❌ [ACTIVITY WRAPPER] Error in targeted IRR recalculation: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}


async def recalculate_irr_after_historical_change(portfolio_fund_id: int, db, activity_date: str = None):
    """
    HISTORICAL: This function is for major historical data corrections that affect all future IRRs.
    
    Use this ONLY when you've made a historical change that invalidates all IRR calculations
    from that date forward. For normal activity changes, use recalculate_irr_after_activity_change().
    
    Args:
        portfolio_fund_id: The portfolio fund that was affected by the historical change
        db: Database connection
        activity_date: The date from which to recalculate all future IRRs (YYYY-MM-DD format)
    """
    try:
        from app.services.irr_cascade_service import IRRCascadeService
        
        logger.warning(f"🔄 [HISTORICAL] Full historical IRR recalculation for portfolio_fund {portfolio_fund_id} from {activity_date or 'latest'}")
        logger.warning("⚠️  This will recalculate ALL IRRs from the specified date onwards - use sparingly!")
        
        # Get portfolio_id from portfolio_fund_id
        portfolio_fund_result = await db.fetchrow(
            "SELECT portfolio_id FROM portfolio_funds WHERE id = $1",
            portfolio_fund_id
        )
        
        if not portfolio_fund_result:
            logger.error(f"Portfolio fund {portfolio_fund_id} not found")
            return {"success": False, "error": "Portfolio fund not found"}
        
        portfolio_id = portfolio_fund_result["portfolio_id"]
        
        # Get the latest activity date if not provided
        if not activity_date:
            latest_activity = await db.fetchrow(
                "SELECT activity_timestamp FROM holding_activity_log WHERE portfolio_fund_id = $1 ORDER BY activity_timestamp DESC LIMIT 1",
                portfolio_fund_id
            )
            
            if latest_activity:
                activity_date = str(latest_activity["activity_timestamp"]).split('T')[0]
            else:
                logger.warning(f"No activities found for portfolio fund {portfolio_fund_id}")
                return {"success": False, "error": "No activities found"}
        
        # Use the IRR cascade service for comprehensive historical changes
        irr_service = IRRCascadeService(db)
        cascade_result = await irr_service.handle_historical_changes(portfolio_id, activity_date)
        
        if cascade_result.get("success"):
            dates_count = cascade_result.get("dates_processed", 0)
            logger.warning(f"🔄 [HISTORICAL] Historical IRR cascade completed: processed {dates_count} dates")
            
            # Transform cascade service result to match legacy return format
            return {
                "success": True,
                "portfolio_fund_id": portfolio_fund_id,
                "portfolio_id": portfolio_id,
                "activity_start_date": activity_date,
                "recalculated_existing": cascade_result.get("fund_irrs_recalculated", 0),
                "new_entries_created": 0,  # Cascade service updates existing, doesn't create duplicates
                "portfolio_irr_recalculated": cascade_result.get("portfolio_irrs_recalculated", 0),
                "dates_processed": cascade_result.get("dates_processed", 0),
                "cascade_service_used": True,
                "method": "full_historical_recalculation"
            }
        else:
            logger.error(f"❌ [HISTORICAL] Historical IRR cascade failed: {cascade_result}")
            return cascade_result
        
    except Exception as e:
        logger.error(f"❌ [HISTORICAL] Error in historical IRR recalculation: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}


async def find_common_valuation_dates_from_date(fund_ids: List[int], start_date: str, db) -> List[str]:
    """
    Find dates where ALL portfolio funds have valuations from a start date onwards.
    
    For active funds: Must have actual valuations on that date.
    For inactive funds: Either have actual valuations on that date, OR the date is after their latest valuation date 
    (in which case they are considered to have £0 valuation).
    
    Args:
        fund_ids: List of portfolio fund IDs
        start_date: Only consider dates from this date onwards (YYYY-MM-DD format)
        db: Database connection
    
    Returns:
        List of date strings (YYYY-MM-DD) where all funds have valuations from start_date onwards
    """
    if len(fund_ids) <= 1:
        logger.info("Only one or no funds provided, no common dates possible")
        return []
    
    try:
        logger.info(f"Finding common valuation dates for {len(fund_ids)} funds from {start_date} onwards")
        
        # Get fund statuses to separate active and inactive funds
        fund_statuses = await db.fetch(
            "SELECT id, status FROM portfolio_funds WHERE id = ANY($1::int[])",
            fund_ids
        )
        
        if not fund_statuses:
            logger.info("No fund information found")
            return []
        
        # Separate active and inactive funds
        active_funds = [f["id"] for f in fund_statuses if f.get("status", "active") == "active"]
        inactive_funds = [f["id"] for f in fund_statuses if f.get("status", "active") != "active"]
        
        logger.info(f"Found {len(active_funds)} active funds and {len(inactive_funds)} inactive funds")
        
        # Get all valuation dates for all funds from start date onwards
        all_valuations = await db.fetch(
            "SELECT portfolio_fund_id, valuation_date FROM portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[]) AND valuation_date >= $2",
            fund_ids, start_date
        )
        
        if not all_valuations:
            logger.info("No valuations found for any funds from start date onwards")
            return []
        
        # For inactive funds, get their latest valuation date
        inactive_fund_latest_dates = {}
        if inactive_funds:
            for fund_id in inactive_funds:
                latest_valuation = await db.fetchrow(
                    "SELECT valuation_date FROM portfolio_fund_valuations WHERE portfolio_fund_id = $1 ORDER BY valuation_date DESC LIMIT 1",
                    fund_id
                )
                
                if latest_valuation:
                    latest_date = str(latest_valuation["valuation_date"]).split('T')[0]
                    inactive_fund_latest_dates[fund_id] = latest_date
                    logger.info(f"Inactive fund {fund_id} latest valuation date: {latest_date}")
        
        # Group active fund valuations by date
        active_fund_dates = {}
        for valuation in all_valuations:
            fund_id = valuation["portfolio_fund_id"]
            if fund_id in active_funds:
                date = str(valuation["valuation_date"]).split('T')[0]  # Ensure YYYY-MM-DD
                if date not in active_fund_dates:
                    active_fund_dates[date] = set()
                active_fund_dates[date].add(fund_id)
        
        # Find common dates where:
        # 1. All active funds have actual valuations
        # 2. All inactive funds either have actual valuations OR the date is after their latest valuation date
        common_dates = []
        
        for date, active_fund_set in active_fund_dates.items():
            # Check if all active funds have valuations on this date
            if len(active_fund_set) == len(active_funds):
                # Now check inactive funds
                all_inactive_covered = True
                
                for inactive_fund_id in inactive_funds:
                    # Check if this inactive fund has a valuation on this date
                    has_valuation_on_date = any(
                        v["portfolio_fund_id"] == inactive_fund_id and 
                        str(v["valuation_date"]).split('T')[0] == date
                        for v in all_valuations
                    )
                    
                    # If no valuation on this date, check if date is after latest valuation date
                    if not has_valuation_on_date:
                        latest_date = inactive_fund_latest_dates.get(inactive_fund_id)
                        if latest_date is None or date <= latest_date:
                            # This inactive fund doesn't have a valuation on this date and 
                            # the date is not after its latest valuation date
                            all_inactive_covered = False
                            break
                
                if all_inactive_covered:
                    common_dates.append(date)
        
        common_dates.sort()  # Sort chronologically
        logger.info(f"Found {len(common_dates)} common valuation dates from {start_date} onwards: {common_dates}")
        
        if inactive_funds:
            logger.info(f"Inactive funds treated as £0 valuation for dates after their latest valuation dates")
        
        return common_dates
        
    except Exception as e:
        logger.error(f"Error finding common valuation dates from date: {str(e)}")
        return []


async def calculate_portfolio_valuation_for_date(portfolio_id: int, date: str, db) -> float:
    """
    Calculate total portfolio valuation for a specific date by summing fund valuations.
    
    Args:
        portfolio_id: The portfolio ID
        date: Date in YYYY-MM-DD format
        db: Database connection
    
    Returns:
        Total portfolio valuation as float, or 0.0 if no valuations found
    """
    try:
        # Get all portfolio funds for this portfolio
        portfolio_funds = await db.fetch(
            "SELECT id FROM portfolio_funds WHERE portfolio_id = $1",
            portfolio_id
        )
        
        if not portfolio_funds:
            logger.warning(f"No portfolio funds found for portfolio {portfolio_id}")
            return 0.0
        
        fund_ids = [pf["id"] for pf in portfolio_funds]
        
        # Get fund valuations for this date
        fund_valuations = await db.fetch(
            "SELECT valuation FROM portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[]) AND valuation_date = $2",
            fund_ids, date
        )
        
        if not fund_valuations:
            logger.warning(f"No fund valuations found for portfolio {portfolio_id} on {date}")
            return 0.0
        
        total_valuation = sum(float(fv["valuation"]) for fv in fund_valuations)
        logger.info(f"Calculated portfolio valuation for portfolio {portfolio_id} on {date}: {total_valuation}")
        return total_valuation
        
    except Exception as e:
        logger.error(f"Error calculating portfolio valuation for portfolio {portfolio_id} on {date}: {str(e)}")
        return 0.0


async def recalculate_portfolio_irr_values_from_date(portfolio_id: int, start_date: str, db) -> int:
    """
    DEPRECATED: This function has been replaced by IRRCascadeService.
    
    Use IRRCascadeService.handle_historical_changes() instead.
    
    This wrapper maintains compatibility while delegating to the new cascade service.
    
    Args:
        portfolio_id: The portfolio ID
        start_date: Only recalculate portfolio IRR values from this date onwards (YYYY-MM-DD format)
        db: Database connection
    
    Returns:
        The number of portfolio IRR values processed (recalculated + created)
    """
    try:
        logger.info(f"🔄 [LEGACY WRAPPER] Delegating portfolio IRR recalculation to IRRCascadeService for portfolio {portfolio_id} from {start_date}")
        
        # Use the IRR cascade service for historical changes
        irr_service = IRRCascadeService(db)
        cascade_result = await irr_service.handle_historical_changes(portfolio_id, start_date)
        
        if cascade_result.get("success"):
            logger.info(f"✅ [LEGACY WRAPPER] Portfolio IRR cascade completed: {cascade_result}")
            
            # Return the total number of IRRs processed (funds + portfolios)
            fund_irrs = cascade_result.get("fund_irrs_recalculated", 0)
            portfolio_irrs = cascade_result.get("portfolio_irrs_recalculated", 0)
            total_processed = fund_irrs + portfolio_irrs
            
            logger.info(f"📊 [LEGACY WRAPPER] Total IRRs processed: {fund_irrs} fund IRRs + {portfolio_irrs} portfolio IRRs = {total_processed}")
            return total_processed
        else:
            logger.error(f"❌ [LEGACY WRAPPER] Portfolio IRR cascade failed: {cascade_result}")
            return 0
        
    except Exception as e:
        logger.error(f"❌ [LEGACY WRAPPER] Error in portfolio IRR recalculation wrapper: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return 0

router = APIRouter()

@router.get("/holding_activity_logs", response_model=List[HoldingActivityLog])
async def get_holding_activity_logs(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    product_id: Optional[int] = None,
    portfolio_fund_id: Optional[int] = None,
    portfolio_id: Optional[int] = None,
    activity_type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db = Depends(get_db)
):
    """
    Retrieves a paginated list of holding activity logs with optional filtering.
    """
    try:
        # Build base query with filters
        where_conditions = []
        params = []
        param_count = 0
        
        if product_id is not None:
            param_count += 1
            where_conditions.append(f"product_id = ${param_count}")
            params.append(product_id)
        
        if portfolio_fund_id is not None:
            param_count += 1
            where_conditions.append(f"portfolio_fund_id = ${param_count}")
            params.append(portfolio_fund_id)
            
        if portfolio_id is not None:
            # Get all portfolio_fund_ids associated with this portfolio
            portfolio_funds = await db.fetch(
                "SELECT id FROM portfolio_funds WHERE portfolio_id = $1",
                portfolio_id
            )
                
            if portfolio_funds:
                portfolio_fund_ids = [fund["id"] for fund in portfolio_funds]
                param_count += 1
                where_conditions.append(f"portfolio_fund_id = ANY(${param_count}::int[])")
                params.append(portfolio_fund_ids)
            else:
                return []
            
        if activity_type is not None:
            param_count += 1
            where_conditions.append(f"activity_type = ${param_count}")
            params.append(activity_type)
            
        if from_date is not None:
            param_count += 1
            where_conditions.append(f"activity_timestamp >= ${param_count}")
            params.append(from_date)
            
        if to_date is not None:
            param_count += 1
            where_conditions.append(f"activity_timestamp <= ${param_count}")
            params.append(to_date)
        
        # Build the complete query
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        # Add pagination parameters
        param_count += 1
        offset_param = param_count
        param_count += 1
        limit_param = param_count
        params.extend([skip, limit])
        
        query = f"""
            SELECT * FROM holding_activity_log
            {where_clause}
            ORDER BY activity_timestamp DESC
            OFFSET ${offset_param} LIMIT ${limit_param}
        """
        
        result = await db.fetch(query, *params)
        return [dict(row) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/holding_activity_logs", response_model=HoldingActivityLog)
async def create_holding_activity_log(
    log: HoldingActivityLogCreate,
    request: Request,
    db = Depends(get_db),
    skip_irr_calculation: bool = False  # New parameter to skip IRR when part of transaction
):
    """
    Create a new holding activity log entry.
    
    Args:
        log: The activity log data to create
        db: Database connection
        skip_irr_calculation: If True, skips IRR calculation (used in transactions)
    """
    try:
        
        # Prepare data for insertion
        logger.info(f"🔍 ACTIVITY CREATE: Preparing log data for portfolio_fund_id={log.portfolio_fund_id}, product_id={log.product_id}, activity_type={log.activity_type}, activity_timestamp={log.activity_timestamp}, amount={log.amount}")
        logger.info(f"🔍 ACTIVITY CREATE: Timestamp details - Type={type(log.activity_timestamp)}, Value={log.activity_timestamp}, Repr={repr(log.activity_timestamp)}")
        
        # Convert date to timezone-aware datetime at midnight UTC to avoid timezone conversion issues
        if isinstance(log.activity_timestamp, date) and not isinstance(log.activity_timestamp, datetime):
            # Convert date to datetime at midnight UTC
            from datetime import timezone
            activity_datetime = datetime.combine(log.activity_timestamp, datetime.min.time()).replace(tzinfo=timezone.utc)
            logger.info(f"🔧 TIMEZONE FIX: Converted {log.activity_timestamp} to {activity_datetime}")
        else:
            activity_datetime = log.activity_timestamp
            
        # Insert the new activity log - pass timezone-aware datetime to avoid conversion issues
        created_activity = await db.fetchrow(
            "INSERT INTO holding_activity_log (portfolio_fund_id, product_id, activity_type, activity_timestamp, amount) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            log.portfolio_fund_id, log.product_id, log.activity_type, activity_datetime, float(log.amount) if log.amount is not None else None
        )
        
        if not created_activity:
            raise HTTPException(status_code=500, detail="Failed to create holding activity log")
        
        portfolio_fund_id = created_activity['portfolio_fund_id']
        
        logger.info(f"Created new holding activity log for portfolio fund {portfolio_fund_id}")
        logger.info(f"🔍 ACTIVITY CREATED: Database returned - ID={created_activity['id']}, Timestamp={created_activity['activity_timestamp']}, Type={type(created_activity['activity_timestamp'])}")
        
        # ========================================================================
        # NEW: Conditional IRR recalculation for transaction coordination
        # ========================================================================
        if skip_irr_calculation:
            logger.info(f"⏭️ TRANSACTION COORDINATOR: Skipping IRR calculation for activity on fund {portfolio_fund_id} (will be calculated after valuation)")
        else:
            logger.info(f"🔄 STANDALONE: Calculating IRR for activity on fund {portfolio_fund_id} (not part of transaction)")
            try:
                # Extract the activity date for sophisticated recalculation
                # log.activity_timestamp is already a date object after Pydantic validation
                if hasattr(log.activity_timestamp, 'isoformat'):
                    activity_date = log.activity_timestamp.isoformat()  # date.isoformat() gives YYYY-MM-DD
                else:
                    activity_date = str(log.activity_timestamp)
                
                logger.info(f"🔍 ACTIVITY DATE EXTRACTION: Original={log.activity_timestamp}, Type={type(log.activity_timestamp)}, Extracted={activity_date}")
                
                irr_recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db, activity_date)
            except Exception as e:
                # Don't fail the activity creation if IRR recalculation fails
                logger.error(f"IRR recalculation failed after activity creation: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        # ========================================================================
        
        return dict(created_activity)
        
    except Exception as e:
        logger.error(f"Error creating holding activity log: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {repr(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/holding_activity_logs/earliest_date")
async def get_earliest_activity_date(
    product_id: Optional[int] = None,
    portfolio_fund_id: Optional[int] = None,
    db = Depends(get_db)
):
    """
    Retrieves the earliest activity date for a given product or portfolio fund.
    """
    try:
        if product_id is None and portfolio_fund_id is None:
            raise HTTPException(status_code=400, detail="Either product_id or portfolio_fund_id is required")

        where_conditions = []
        params = []
        param_count = 0
        
        if product_id is not None:
            param_count += 1
            where_conditions.append(f"product_id = ${param_count}")
            params.append(product_id)
        
        if portfolio_fund_id is not None:
            param_count += 1
            where_conditions.append(f"portfolio_fund_id = ${param_count}")
            params.append(portfolio_fund_id)
        
        where_clause = " WHERE " + " AND ".join(where_conditions)
        query = f"SELECT activity_timestamp FROM holding_activity_log{where_clause} ORDER BY activity_timestamp ASC LIMIT 1"
            
        result = await db.fetchrow(query, *params)
        
        if not result:
            return {"earliest_date": None}
            
        earliest_date = result["activity_timestamp"]
        return {"earliest_date": earliest_date}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/holding_activity_logs/{holding_activity_log_id}", response_model=HoldingActivityLog)
async def get_holding_activity_log(holding_activity_log_id: int, db = Depends(get_db)):
    """
    Retrieves a specific holding activity log by its ID.
    """
    try:
        result = await db.fetchrow("SELECT * FROM holding_activity_log WHERE id = $1", holding_activity_log_id)
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Holding activity log with ID {holding_activity_log_id} not found")
            
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting holding activity log: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/holding_activity_logs/{activity_id}", response_model=HoldingActivityLog)
async def update_holding_activity_log(
    activity_id: int,
    holding_activity_log: HoldingActivityLogUpdate,
    db = Depends(get_db)
):
    """
    Updates an existing holding activity log.
    Simple version that just updates the record without complex processing.
    """
    try:
        # Check if activity exists
        existing_result = await db.fetchrow("SELECT * FROM holding_activity_log WHERE id = $1", activity_id)
        
        if not existing_result:
            raise HTTPException(status_code=404, detail="Holding activity log not found")
            
        # Get update data
        update_data = holding_activity_log.model_dump(exclude_unset=True)
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        # PostgreSQL with asyncpg handles datetime objects directly, no conversion needed

        # Handle amount conversion
        if 'amount' in update_data and isinstance(update_data['amount'], Decimal):
                    update_data['amount'] = float(update_data['amount'])

        # Handle timezone conversion for activity_timestamp
        if 'activity_timestamp' in update_data:
            timestamp_value = update_data['activity_timestamp']
            if isinstance(timestamp_value, date) and not isinstance(timestamp_value, datetime):
                # Convert date to datetime at midnight UTC
                from datetime import timezone
                activity_datetime = datetime.combine(timestamp_value, datetime.min.time()).replace(tzinfo=timezone.utc)
                update_data['activity_timestamp'] = activity_datetime
                logger.info(f"🔧 TIMEZONE FIX UPDATE: Converted {timestamp_value} to {activity_datetime}")

        logger.info(f"Updating activity {activity_id} with data: {update_data}")

        # Build dynamic UPDATE query
        if update_data:
            set_clauses = []
            params = []
            param_count = 0
            
            for key, value in update_data.items():
                param_count += 1
                set_clauses.append(f"{key} = ${param_count}")
                params.append(value)
            
            param_count += 1
            params.append(activity_id)
            
            query = f"UPDATE holding_activity_log SET {', '.join(set_clauses)} WHERE id = ${param_count} RETURNING *"
            updated_activity = await db.fetchrow(query, *params)
        else:
            updated_activity = existing_result
        
        if not updated_activity:
            raise HTTPException(status_code=400, detail="Failed to update holding activity log")
        
        # ========================================================================
        # NEW: Automatically recalculate IRR after updating activity
        # ========================================================================
        try:
            # Get the portfolio_fund_id from the existing record
            portfolio_fund_id = existing_result["portfolio_fund_id"]
            
            # Use the updated activity date if provided, otherwise use the existing one
            activity_date = None
            if 'activity_timestamp' in update_data:
                # update_data['activity_timestamp'] is already a date object after Pydantic validation
                if hasattr(update_data['activity_timestamp'], 'isoformat'):
                    activity_date = update_data['activity_timestamp'].isoformat()
                else:
                    activity_date = str(update_data['activity_timestamp'])
            else:
                # existing_result["activity_timestamp"] could be a date or datetime from database
                existing_timestamp = existing_result["activity_timestamp"]
                if hasattr(existing_timestamp, 'date'):
                    # It's a datetime, get the date part
                    activity_date = existing_timestamp.date().isoformat()
                elif hasattr(existing_timestamp, 'isoformat'):
                    # It's already a date
                    activity_date = existing_timestamp.isoformat()
                else:
                    # Fallback to string conversion
                    activity_date = str(existing_timestamp).split('T')[0]
                    
            logger.info(f"🔍 ACTIVITY DATE EXTRACTION (UPDATE): Extracted={activity_date}, UpdateData={update_data.get('activity_timestamp')}, ExistingType={type(existing_result['activity_timestamp'])}")
            
            if portfolio_fund_id:
                logger.info(f"Triggering sophisticated IRR recalculation after updating activity for portfolio fund {portfolio_fund_id} on date {activity_date}")
                irr_recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db, activity_date)
                logger.info(f"Sophisticated IRR recalculation result: {irr_recalc_result}")
            else:
                logger.warning("No portfolio_fund_id found for IRR recalculation")
        except Exception as e:
            # Don't fail the activity update if IRR recalculation fails
            logger.error(f"IRR recalculation failed after activity update: {str(e)}")
        # ========================================================================
        
        return dict(updated_activity)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating holding activity log: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/holding_activity_logs/{holding_activity_log_id}")
async def delete_holding_activity_log(holding_activity_log_id: int, db = Depends(get_db)):
    """
    Deletes a holding activity log.
    Simple version that just deletes the record.
    """
    try:
        # Check if exists
        existing = await db.fetchrow("SELECT * FROM holding_activity_log WHERE id = $1", holding_activity_log_id)
        
        if not existing:
            raise HTTPException(status_code=404, detail=f"Activity log with ID {holding_activity_log_id} not found")
        
        # Get portfolio_fund_id and activity date before deletion for IRR recalculation
        portfolio_fund_id = existing["portfolio_fund_id"]
        
        # Handle activity date extraction properly
        existing_timestamp = existing["activity_timestamp"]
        if hasattr(existing_timestamp, 'date'):
            # It's a datetime, get the date part
            activity_date = existing_timestamp.date().isoformat()
        elif hasattr(existing_timestamp, 'isoformat'):
            # It's already a date
            activity_date = existing_timestamp.isoformat()
        else:
            # Fallback to string conversion
            activity_date = str(existing_timestamp).split('T')[0]
            
        logger.info(f"🔍 ACTIVITY DATE EXTRACTION (DELETE): Extracted={activity_date}, ExistingType={type(existing_timestamp)}")
        
        # Delete the activity log
        await db.execute("DELETE FROM holding_activity_log WHERE id = $1", holding_activity_log_id)
        
        logger.info(f"Successfully deleted activity log with ID: {holding_activity_log_id}")
        
        # ========================================================================
        # NEW: Automatically recalculate IRR after deleting activity
        # ========================================================================
        try:
            if portfolio_fund_id:
                logger.info(f"Triggering sophisticated IRR recalculation after deleting activity for portfolio fund {portfolio_fund_id} on date {activity_date}")
                irr_recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db, activity_date)
                logger.info(f"Sophisticated IRR recalculation result: {irr_recalc_result}")
            else:
                logger.warning("No portfolio_fund_id found for IRR recalculation")
        except Exception as e:
            # Don't fail the activity deletion if IRR recalculation fails
            logger.error(f"IRR recalculation failed after activity deletion: {str(e)}")
        # ========================================================================
        
        return {"status": "success", "message": f"Activity log with ID {holding_activity_log_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting activity log: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/holding_activity_logs/test_sophisticated_irr_recalculation")
async def test_sophisticated_irr_recalculation(
    portfolio_fund_id: int = Query(..., description="Portfolio fund ID to test IRR recalculation for"),
    activity_date: Optional[str] = Query(None, description="Activity date to use for testing (YYYY-MM-DD format)"),
    db = Depends(get_db)
):
    """
    Test endpoint to manually trigger the sophisticated IRR recalculation system.
    
    This endpoint allows you to test the advanced IRR recalculation logic that:
    1. Recalculates all IRR values from the specified activity date onwards (same date or later)
    2. Only creates new IRR entries if all portfolio funds share common valuation dates
    3. Replaces irr_result in existing entries rather than creating new ones
    4. Recalculates both fund-level and portfolio-level IRR values
    
    Args:
        portfolio_fund_id: The portfolio fund ID to test with
        activity_date: Optional activity date in YYYY-MM-DD format (defaults to latest activity date)
    
    Returns:
        Detailed results of the sophisticated IRR recalculation process
    """
    try:
        logger.info(f"Testing sophisticated IRR recalculation for portfolio fund {portfolio_fund_id}")
        
        # Verify portfolio fund exists
        portfolio_fund_check = await db.fetchrow(
            "SELECT id, portfolio_id FROM portfolio_funds WHERE id = $1",
            portfolio_fund_id
        )
        
        if not portfolio_fund_check:
            raise HTTPException(status_code=404, detail=f"Portfolio fund {portfolio_fund_id} not found")
        
        portfolio_id = portfolio_fund_check["portfolio_id"]
        
        # If no activity date provided, get the latest activity date
        if not activity_date:
            latest_activity = await db.fetchrow(
                "SELECT activity_timestamp FROM holding_activity_log WHERE portfolio_fund_id = $1 ORDER BY activity_timestamp DESC LIMIT 1",
                portfolio_fund_id
            )
            
            if latest_activity:
                activity_date = str(latest_activity["activity_timestamp"]).split('T')[0]
            else:
                raise HTTPException(status_code=400, detail=f"No activities found for portfolio fund {portfolio_fund_id} and no activity_date provided")
        
        # Get current state before recalculation
        existing_irr_before = await db.fetch(
            "SELECT * FROM portfolio_fund_irr_values WHERE fund_id = $1 AND date >= $2",
            portfolio_fund_id, activity_date
        )
        
        existing_portfolio_irr_before = await db.fetch(
            "SELECT * FROM portfolio_irr_values WHERE portfolio_id = $1 AND date >= $2",
            portfolio_id, activity_date
        )
        
        # Trigger the sophisticated IRR recalculation
        recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db, activity_date)
        
        # Get state after recalculation
        existing_irr_after = await db.fetch(
            "SELECT * FROM portfolio_fund_irr_values WHERE fund_id = $1 AND date >= $2",
            portfolio_fund_id, activity_date
        )
        
        existing_portfolio_irr_after = await db.fetch(
            "SELECT * FROM portfolio_irr_values WHERE portfolio_id = $1 AND date >= $2",
            portfolio_id, activity_date
        )
        
        return {
            "test_status": "completed",
            "portfolio_fund_id": portfolio_fund_id,
            "portfolio_id": portfolio_id,
            "activity_date_used": activity_date,
            "recalculation_result": recalc_result,
            "before_state": {
                "fund_irr_count": len(existing_irr_before) if existing_irr_before else 0,
                "portfolio_irr_count": len(existing_portfolio_irr_before) if existing_portfolio_irr_before else 0,
                "fund_irr_values": [dict(row) for row in existing_irr_before] if existing_irr_before else [],
                "portfolio_irr_values": [dict(row) for row in existing_portfolio_irr_before] if existing_portfolio_irr_before else []
            },
            "after_state": {
                "fund_irr_count": len(existing_irr_after) if existing_irr_after else 0,
                "portfolio_irr_count": len(existing_portfolio_irr_after) if existing_portfolio_irr_after else 0,
                "fund_irr_values": [dict(row) for row in existing_irr_after] if existing_irr_after else [],
                "portfolio_irr_values": [dict(row) for row in existing_portfolio_irr_after] if existing_portfolio_irr_after else []
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in sophisticated IRR recalculation test: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")

@router.post("/holding_activity_logs/compare_irr_performance")
async def compare_irr_performance(
    portfolio_fund_id: int = Query(..., description="Portfolio fund ID to test performance with"),
    activity_date: Optional[str] = Query(None, description="Activity date to use for testing (YYYY-MM-DD format)"),
    db = Depends(get_db)
):
    """
    Compare performance between targeted activity recalculation vs full historical recalculation.
    
    This endpoint demonstrates the efficiency difference between:
    1. Targeted recalculation (processes only specific activity date)
    2. Historical recalculation (processes all dates from activity date onwards)
    
    Use this to understand when to use which method.
    """
    try:
        import time
        
        logger.info(f"🔬 [PERFORMANCE TEST] Starting IRR performance comparison for portfolio fund {portfolio_fund_id}")
        
        # Verify portfolio fund exists
        portfolio_fund_check = await db.fetchrow(
            "SELECT id, portfolio_id FROM portfolio_funds WHERE id = $1",
            portfolio_fund_id
        )
        
        if not portfolio_fund_check:
            raise HTTPException(status_code=404, detail=f"Portfolio fund {portfolio_fund_id} not found")
        
        portfolio_id = portfolio_fund_check["portfolio_id"]
        
        # If no activity date provided, get the latest activity date
        if not activity_date:
            latest_activity = await db.fetchrow(
                "SELECT activity_timestamp FROM holding_activity_log WHERE portfolio_fund_id = $1 ORDER BY activity_timestamp DESC LIMIT 1",
                portfolio_fund_id
            )
            
            if latest_activity:
                activity_date = str(latest_activity["activity_timestamp"]).split('T')[0]
            else:
                raise HTTPException(status_code=400, detail=f"No activities found for portfolio fund {portfolio_fund_id} and no activity_date provided")
        
        # Test 1: Targeted Activity Recalculation
        logger.info("🚀 [PERFORMANCE TEST] Testing targeted activity recalculation...")
        start_time = time.time()
        
        targeted_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db, activity_date)
        
        targeted_duration = time.time() - start_time
        logger.info(f"⚡ [PERFORMANCE TEST] Targeted recalculation completed in {targeted_duration:.2f} seconds")
        
        # Test 2: Historical Recalculation
        logger.info("🐌 [PERFORMANCE TEST] Testing full historical recalculation...")
        start_time = time.time()
        
        historical_result = await recalculate_irr_after_historical_change(portfolio_fund_id, db, activity_date)
        
        historical_duration = time.time() - start_time
        logger.info(f"🔄 [PERFORMANCE TEST] Historical recalculation completed in {historical_duration:.2f} seconds")
        
        # Calculate performance metrics
        speed_improvement = historical_duration / targeted_duration if targeted_duration > 0 else 0
        time_saved = historical_duration - targeted_duration
        
        return {
            "test_status": "completed",
            "portfolio_fund_id": portfolio_fund_id,
            "portfolio_id": portfolio_id,
            "activity_date_used": activity_date,
            "performance_comparison": {
                "targeted_method": {
                    "duration_seconds": round(targeted_duration, 2),
                    "dates_processed": targeted_result.get("dates_processed", 0),
                    "method": "handle_activity_changes_batch",
                    "efficiency": "high"
                },
                "historical_method": {
                    "duration_seconds": round(historical_duration, 2),
                    "dates_processed": historical_result.get("dates_processed", 0),
                    "method": "handle_historical_changes",
                    "efficiency": "low"
                },
                "performance_metrics": {
                    "speed_improvement_factor": round(speed_improvement, 1),
                    "time_saved_seconds": round(time_saved, 2),
                    "efficiency_gain_percent": round(((historical_duration - targeted_duration) / historical_duration * 100), 1) if historical_duration > 0 else 0
                }
            },
            "recommendation": {
                "use_targeted_for": "Single activity changes, regular operations",
                "use_historical_for": "Major historical corrections, data fixes",
                "summary": f"Targeted method is {speed_improvement:.1f}x faster and saves {time_saved:.1f} seconds"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in IRR performance comparison: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Performance test failed: {str(e)}")

@router.post("/holding_activity_logs/recalculate_all_portfolio_irr")
async def recalculate_all_portfolio_irr(
    portfolio_id: int = Query(..., description="Portfolio ID to recalculate IRR for all funds"),
    activity_date: Optional[str] = Query(None, description="Activity date to use for recalculation (YYYY-MM-DD format)"),
    db = Depends(get_db)
):
    """
    Manually trigger IRR recalculation for all funds in a portfolio.
    This is useful when activities are added through other means and IRR recalculation wasn't triggered.
    """
    try:
        # Get all portfolio funds
        portfolio_funds = await db.fetch(
            "SELECT id, available_funds_id FROM portfolio_funds WHERE portfolio_id = $1",
            portfolio_id
        )
        
        if not portfolio_funds:
            return {"success": False, "error": f"No portfolio funds found for portfolio {portfolio_id}"}
        
        results = []
        
        for pf in portfolio_funds:
            portfolio_fund_id = pf["id"]
            available_funds_id = pf["available_funds_id"]
            
            # Get fund name for logging
            fund_details = await db.fetchrow(
                "SELECT fund_name, isin_number FROM available_funds WHERE id = $1",
                available_funds_id
            )
            
            fund_name = "Unknown"
            if fund_details:
                fund_name = fund_details["fund_name"]
            
            try:
                # Trigger IRR recalculation for this fund
                irr_result = await recalculate_irr_after_activity_change(
                    portfolio_fund_id=portfolio_fund_id,
                    db=db,
                    activity_date=activity_date
                )
                
                results.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "fund_name": fund_name,
                    "success": irr_result.get("success", False),
                    "result": irr_result
                })
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Failed to recalculate IRR for fund {portfolio_fund_id}: {error_msg}")
                
                results.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "fund_name": fund_name,
                    "success": False,
                    "error": error_msg
                })
        
        # Summary
        successful_count = sum(1 for r in results if r["success"])
        failed_count = len(results) - successful_count
        
        return {
            "success": True,
            "portfolio_id": portfolio_id,
            "total_funds": len(results),
            "successful_recalculations": successful_count,
            "failed_recalculations": failed_count,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in manual portfolio IRR recalculation: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}


# ==================== BULK OPERATIONS WITH SEQUENCE RESERVATION ====================

from app.utils.sequence_manager import SequenceManager

@router.post("/holding_activity_logs/bulk", response_model=List[dict])
async def create_bulk_holding_activity_logs(
    activities: List[HoldingActivityLogCreate],
    skip_irr_calculation: bool = Query(False, description="Skip IRR recalculation for transaction coordination"),
    db = Depends(get_db)
):
    """
    Bulk create holding activity logs with sequence reservation
    
    This endpoint uses sequence reservation to prevent ID conflicts during bulk operations.
    Designed for high-volume activity imports and bulk monthly saves.
    
    Key Features:
    - Atomic sequence reservation prevents race conditions
    - Batch processing with individual error handling
    - Optional IRR recalculation coordination
    - Comprehensive logging and error reporting
    
    Args:
        activities: List of activity log data to create
        skip_irr_calculation: Skip IRR calc for transaction coordination (default: False)
        db: Database dependency
        
    Returns:
        List of created activity log records with assigned IDs
        
    Raises:
        HTTPException: On validation errors or database failures
    """
    try:
        if not activities:
            logger.info("🚀 BULK: No activities provided, returning empty list")
            return []
        
        logger.info(f"🚀 BULK: Creating {len(activities)} activity logs with sequence reservation")
        
        # Convert Pydantic models to dict format for bulk insertion
        activity_data = []
        for log in activities:
            # Handle timezone conversion - improved datetime parsing
            if isinstance(log.activity_timestamp, date) and not isinstance(log.activity_timestamp, datetime):
                from datetime import timezone
                activity_datetime = datetime.combine(log.activity_timestamp, datetime.min.time()).replace(tzinfo=timezone.utc)
                logger.debug(f"🔧 BULK: Converted date {log.activity_timestamp} to datetime {activity_datetime}")
            elif isinstance(log.activity_timestamp, str):
                # Handle ISO datetime strings (e.g., "2025-08-01T00:00:00Z")
                try:
                    from dateutil import parser
                    activity_datetime = parser.parse(log.activity_timestamp)
                    logger.debug(f"🔧 BULK: Parsed ISO string '{log.activity_timestamp}' to datetime {activity_datetime}")
                except ImportError:
                    # Fallback if dateutil is not available
                    import re
                    # Extract just the date part if it's an ISO string
                    date_match = re.match(r'(\d{4}-\d{2}-\d{2})', log.activity_timestamp)
                    if date_match:
                        date_str = date_match.group(1)
                        activity_datetime = datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                        logger.debug(f"🔧 BULK: Extracted date '{date_str}' from '{log.activity_timestamp}' → {activity_datetime}")
                    else:
                        activity_datetime = log.activity_timestamp
                except Exception as parse_error:
                    logger.warning(f"⚠️ BULK: Failed to parse datetime string '{log.activity_timestamp}': {parse_error}, using as-is")
                    activity_datetime = log.activity_timestamp
            else:
                activity_datetime = log.activity_timestamp
            
            # Prepare data dict (matching the structure from lines 492-495)
            activity_record = {
                'portfolio_fund_id': log.portfolio_fund_id,
                'product_id': log.product_id,
                'activity_type': log.activity_type,
                'activity_timestamp': activity_datetime,
                'amount': float(log.amount) if log.amount is not None else None,
                'created_at': datetime.utcnow()
            }
            
            activity_data.append(activity_record)
            logger.debug(f"🔍 BULK: Prepared activity - Fund: {log.portfolio_fund_id}, Type: {log.activity_type}, Amount: {log.amount}")
        
        # Use sequence manager for bulk insert with reserved IDs
        logger.info("🔒 BULK: Using SequenceManager for bulk insert with sequence reservation")
        created_activities = await SequenceManager.bulk_insert_with_reserved_ids(
            db=db,
            table_name='holding_activity_log',
            data=activity_data,
            sequence_name='holding_activity_log_id_seq'
        )
        
        success_count = len(created_activities)
        logger.info(f"✅ BULK: Successfully created {success_count}/{len(activities)} activities")
        
        # Handle IRR recalculation if not skipped
        if not skip_irr_calculation and created_activities:
            logger.info("🔄 BULK: Triggering IRR recalculation for affected funds...")
            
            # Group by portfolio fund for efficient recalculation
            portfolio_funds = set(activity['portfolio_fund_id'] for activity in created_activities)
            recalc_results = []
            
            for portfolio_fund_id in portfolio_funds:
                try:
                    logger.info(f"🔄 BULK: Recalculating IRR for portfolio fund {portfolio_fund_id}")
                    
                    # Use the existing IRR recalculation logic (from lines 20-85)
                    irr_result = await recalculate_irr_after_activity_change(
                        portfolio_fund_id, 
                        db, 
                        activity_date=None  # Will use latest activity date
                    )
                    
                    recalc_results.append({
                        'portfolio_fund_id': portfolio_fund_id,
                        'success': irr_result.get('success', False),
                        'irr_values_updated': irr_result.get('irr_values_updated', 0)
                    })
                    
                    logger.info(f"✅ BULK: IRR recalculation completed for fund {portfolio_fund_id}")
                    
                except Exception as irr_error:
                    logger.error(f"⚠️ BULK: IRR recalculation failed for fund {portfolio_fund_id}: {irr_error}")
                    recalc_results.append({
                        'portfolio_fund_id': portfolio_fund_id,
                        'success': False,
                        'error': str(irr_error)
                    })
                    # Don't fail the entire bulk operation for IRR issues
            
            logger.info(f"🔄 BULK: IRR recalculation completed for {len(portfolio_funds)} funds")
            
            # Add recalculation summary to response
            for activity in created_activities:
                fund_id = activity['portfolio_fund_id']
                fund_recalc = next((r for r in recalc_results if r['portfolio_fund_id'] == fund_id), None)
                if fund_recalc:
                    activity['irr_recalculation'] = fund_recalc
        else:
            logger.info("⏭️ BULK: Skipping IRR recalculation (skip_irr_calculation=True)")
        
        # Return created activities with metadata
        response_data = {
            'activities': created_activities,
            'summary': {
                'total_requested': len(activities),
                'total_created': success_count,
                'success_rate': (success_count / len(activities)) * 100 if activities else 0,
                'irr_recalculation_skipped': skip_irr_calculation,
                'sequence_reservation_used': True
            }
        }
        
        logger.info(f"🎉 BULK: Bulk activity creation completed - {success_count} activities created")
        return created_activities  # Return just the activities for compatibility
        
    except Exception as e:
        logger.error(f"❌ BULK: Error creating bulk activity logs: {e}")
        import traceback
        logger.error(f"❌ BULK: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Bulk activity creation failed: {str(e)}")


# ==================== BULK VALIDATION UTILITIES ====================

def validate_bulk_activities(activities: List[HoldingActivityLogCreate]) -> List[str]:
    """
    Validate bulk activities before processing to prevent sequence waste
    
    Args:
        activities: List of activities to validate
        
    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []
    
    for i, activity in enumerate(activities):
        activity_num = i + 1
        
        if not activity.portfolio_fund_id:
            errors.append(f"Activity {activity_num}: Missing portfolio_fund_id")
        
        if not activity.product_id:
            errors.append(f"Activity {activity_num}: Missing product_id")
        
        if not activity.activity_type:
            errors.append(f"Activity {activity_num}: Missing activity_type")
        
        if not activity.activity_timestamp:
            errors.append(f"Activity {activity_num}: Missing activity_timestamp")
        
        if activity.amount is None:
            errors.append(f"Activity {activity_num}: Missing amount")
        elif not isinstance(activity.amount, (int, float)) and activity.amount != 0:
            try:
                float(activity.amount)
            except (ValueError, TypeError):
                errors.append(f"Activity {activity_num}: Invalid amount value: {activity.amount}")
    
    return errors
