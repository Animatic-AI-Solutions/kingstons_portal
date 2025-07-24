from fastapi import APIRouter, HTTPException, Depends, Query
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
        portfolio_fund_result = db.table("portfolio_funds")\
            .select("portfolio_id")\
            .eq("id", portfolio_fund_id)\
            .execute()
        
        if not portfolio_fund_result.data:
            logger.error(f"Portfolio fund {portfolio_fund_id} not found")
            return {"success": False, "error": "Portfolio fund not found"}
        
        portfolio_id = portfolio_fund_result.data[0]["portfolio_id"]
        
        # Get the latest activity date if not provided
        if not activity_date:
            latest_activity = db.table("holding_activity_log")\
                .select("activity_timestamp")\
                .eq("portfolio_fund_id", portfolio_fund_id)\
                .order("activity_timestamp", desc=True)\
                .limit(1)\
                .execute()
            
            if latest_activity.data:
                activity_date = latest_activity.data[0]["activity_timestamp"].split('T')[0]
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
        portfolio_fund_result = db.table("portfolio_funds")\
            .select("portfolio_id")\
            .eq("id", portfolio_fund_id)\
            .execute()
        
        if not portfolio_fund_result.data:
            logger.error(f"Portfolio fund {portfolio_fund_id} not found")
            return {"success": False, "error": "Portfolio fund not found"}
        
        portfolio_id = portfolio_fund_result.data[0]["portfolio_id"]
        
        # Get the latest activity date if not provided
        if not activity_date:
            latest_activity = db.table("holding_activity_log")\
                .select("activity_timestamp")\
                .eq("portfolio_fund_id", portfolio_fund_id)\
                .order("activity_timestamp", desc=True)\
                .limit(1)\
                .execute()
            
            if latest_activity.data:
                activity_date = latest_activity.data[0]["activity_timestamp"].split('T')[0]
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
        fund_statuses = db.table("portfolio_funds")\
            .select("id, status")\
            .in_("id", fund_ids)\
            .execute()
        
        if not fund_statuses.data:
            logger.info("No fund information found")
            return []
        
        # Separate active and inactive funds
        active_funds = [f["id"] for f in fund_statuses.data if f.get("status", "active") == "active"]
        inactive_funds = [f["id"] for f in fund_statuses.data if f.get("status", "active") != "active"]
        
        logger.info(f"Found {len(active_funds)} active funds and {len(inactive_funds)} inactive funds")
        
        # Get all valuation dates for all funds from start date onwards
        all_valuations = db.table("portfolio_fund_valuations")\
            .select("portfolio_fund_id, valuation_date")\
            .in_("portfolio_fund_id", fund_ids)\
            .gte("valuation_date", start_date)\
            .execute()
        
        if not all_valuations.data:
            logger.info("No valuations found for any funds from start date onwards")
            return []
        
        # For inactive funds, get their latest valuation date
        inactive_fund_latest_dates = {}
        if inactive_funds:
            for fund_id in inactive_funds:
                latest_valuation = db.table("portfolio_fund_valuations")\
                    .select("valuation_date")\
                    .eq("portfolio_fund_id", fund_id)\
                    .order("valuation_date", desc=True)\
                    .limit(1)\
                    .execute()
                
                if latest_valuation.data:
                    latest_date = latest_valuation.data[0]["valuation_date"].split('T')[0]
                    inactive_fund_latest_dates[fund_id] = latest_date
                    logger.info(f"Inactive fund {fund_id} latest valuation date: {latest_date}")
        
        # Group active fund valuations by date
        active_fund_dates = {}
        for valuation in all_valuations.data:
            fund_id = valuation["portfolio_fund_id"]
            if fund_id in active_funds:
                date = valuation["valuation_date"].split('T')[0]  # Ensure YYYY-MM-DD
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
                        v["valuation_date"].split('T')[0] == date
                        for v in all_valuations.data
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
        portfolio_funds = db.table("portfolio_funds")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not portfolio_funds.data:
            logger.warning(f"No portfolio funds found for portfolio {portfolio_id}")
            return 0.0
        
        fund_ids = [pf["id"] for pf in portfolio_funds.data]
        
        # Get fund valuations for this date
        fund_valuations = db.table("portfolio_fund_valuations")\
            .select("valuation")\
            .in_("portfolio_fund_id", fund_ids)\
            .eq("valuation_date", date)\
            .execute()
        
        if not fund_valuations.data:
            logger.warning(f"No fund valuations found for portfolio {portfolio_id} on {date}")
            return 0.0
        
        total_valuation = sum(float(fv["valuation"]) for fv in fund_valuations.data)
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
        query = db.table("holding_activity_log").select("*")
        
        if product_id is not None:
            query = query.eq("product_id", product_id)
        
        if portfolio_fund_id is not None:
            query = query.eq("portfolio_fund_id", portfolio_fund_id)
            
        if portfolio_id is not None:
            # Get all portfolio_fund_ids associated with this portfolio
            portfolio_funds = db.table("portfolio_funds") \
                .select("id") \
                .eq("portfolio_id", portfolio_id) \
                .execute()
                
            if portfolio_funds.data and len(portfolio_funds.data) > 0:
                portfolio_fund_ids = [fund["id"] for fund in portfolio_funds.data]
                query = query.in_("portfolio_fund_id", portfolio_fund_ids)
            else:
                return []
            
        if activity_type is not None:
            query = query.eq("activity_type", activity_type)
            
        if from_date is not None:
            query = query.gte("activity_timestamp", from_date)
            
        if to_date is not None:
            query = query.lte("activity_timestamp", to_date)
            
        # Order by activity_timestamp descending (newest first)
        query = query.order("activity_timestamp", desc=True)
            
        result = query.range(skip, skip + limit - 1).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/holding_activity_logs", response_model=HoldingActivityLog)
async def create_holding_activity_log(
    log: HoldingActivityLogCreate,
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
        # Convert log data to dict and prepare for insertion
        log_data = {
            "portfolio_fund_id": log.portfolio_fund_id,
            "product_id": log.product_id,
            "activity_type": log.activity_type,
            "activity_timestamp": log.activity_timestamp.isoformat(),
            "amount": float(log.amount) if log.amount is not None else None,
        }
        
        logger.info(f"🔍 ACTIVITY CREATE: Prepared log_data: {log_data}")
        
        # Insert the new activity log
        result = db.table("holding_activity_log").insert(log_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create holding activity log")
        
        created_activity = result.data[0]
        portfolio_fund_id = created_activity['portfolio_fund_id']
        
        logger.info(f"Created new holding activity log for portfolio fund {portfolio_fund_id}")
        
        # ========================================================================
        # NEW: Conditional IRR recalculation for transaction coordination
        # ========================================================================
        if skip_irr_calculation:
            logger.info(f"⏭️ TRANSACTION COORDINATOR: Skipping IRR calculation for activity on fund {portfolio_fund_id} (will be calculated after valuation)")
        else:
            logger.info(f"🔄 STANDALONE: Calculating IRR for activity on fund {portfolio_fund_id} (not part of transaction)")
            try:
                # Extract the activity date for sophisticated recalculation
                activity_date = log_data.get("activity_timestamp", "").split('T')[0]
                
                irr_recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db, activity_date)
            except Exception as e:
                # Don't fail the activity creation if IRR recalculation fails
                logger.error(f"IRR recalculation failed after activity creation: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        # ========================================================================
        
        return created_activity
        
    except Exception as e:
        logger.error(f"Error creating holding activity log: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {repr(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/holding_activity_logs/{holding_activity_log_id}", response_model=HoldingActivityLog)
async def get_holding_activity_log(holding_activity_log_id: int, db = Depends(get_db)):
    """
    Retrieves a specific holding activity log by its ID.
    """
    try:
        result = db.table("holding_activity_log").select("*").eq("id", holding_activity_log_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Holding activity log with ID {holding_activity_log_id} not found")
            
        return result.data[0]
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
        existing_result = db.table("holding_activity_log").select("*").eq("id", activity_id).execute()
        
        if not existing_result.data:
            raise HTTPException(status_code=404, detail="Holding activity log not found")
            
        # Get update data
        update_data = holding_activity_log.model_dump(exclude_unset=True)
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        # Handle date serialization
        if 'activity_timestamp' in update_data and isinstance(update_data['activity_timestamp'], date):
            update_data['activity_timestamp'] = update_data['activity_timestamp'].isoformat()

        # Handle amount conversion
        if 'amount' in update_data and isinstance(update_data['amount'], Decimal):
                    update_data['amount'] = float(update_data['amount'])

        logger.info(f"Updating activity {activity_id} with data: {update_data}")

        # Update the activity log
        result = db.table("holding_activity_log").update(update_data).eq("id", activity_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to update holding activity log")
        
        updated_activity = result.data[0]
        
        # ========================================================================
        # NEW: Automatically recalculate IRR after updating activity
        # ========================================================================
        try:
            # Get the portfolio_fund_id from the existing record
            existing_activity = existing_result.data[0]
            portfolio_fund_id = existing_activity.get("portfolio_fund_id")
            
            # Use the updated activity date if provided, otherwise use the existing one
            activity_date = None
            if 'activity_timestamp' in update_data:
                activity_date = update_data['activity_timestamp'].split('T')[0]
            else:
                activity_date = existing_activity.get("activity_timestamp", "").split('T')[0]
            
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
        
        return updated_activity
        
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
        existing = db.table("holding_activity_log").select("*").eq("id", holding_activity_log_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail=f"Activity log with ID {holding_activity_log_id} not found")
        
        # Get portfolio_fund_id and activity date before deletion for IRR recalculation
        portfolio_fund_id = existing.data[0].get("portfolio_fund_id")
        activity_date = existing.data[0].get("activity_timestamp", "").split('T')[0]
        
        # Delete the activity log
        db.table("holding_activity_log").delete().eq("id", holding_activity_log_id).execute()
        
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

        query = db.table("holding_activity_log").select("activity_timestamp")
        
        if product_id is not None:
            query = query.eq("product_id", product_id)
        
        if portfolio_fund_id is not None:
            query = query.eq("portfolio_fund_id", portfolio_fund_id)
            
        query = query.order("activity_timestamp", desc=False).limit(1)
            
        result = query.execute()
        
        if not result.data or len(result.data) == 0:
            return {"earliest_date": None}
            
        earliest_date = result.data[0]["activity_timestamp"]
        return {"earliest_date": earliest_date}
        
    except Exception as e:
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
        portfolio_fund_check = db.table("portfolio_funds")\
            .select("id, portfolio_id")\
            .eq("id", portfolio_fund_id)\
            .execute()
        
        if not portfolio_fund_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio fund {portfolio_fund_id} not found")
        
        portfolio_id = portfolio_fund_check.data[0]["portfolio_id"]
        
        # If no activity date provided, get the latest activity date
        if not activity_date:
            latest_activity = db.table("holding_activity_log")\
                .select("activity_timestamp")\
                .eq("portfolio_fund_id", portfolio_fund_id)\
                .order("activity_timestamp", desc=True)\
                .limit(1)\
                .execute()
            
            if latest_activity.data:
                activity_date = latest_activity.data[0]["activity_timestamp"].split('T')[0]
            else:
                raise HTTPException(status_code=400, detail=f"No activities found for portfolio fund {portfolio_fund_id} and no activity_date provided")
        
        # Get current state before recalculation
        existing_irr_before = db.table("portfolio_fund_irr_values")\
            .select("*")\
            .eq("fund_id", portfolio_fund_id)\
            .gte("date", activity_date)\
            .execute()
        
        existing_portfolio_irr_before = db.table("portfolio_irr_values")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .gte("date", activity_date)\
            .execute()
        
        # Trigger the sophisticated IRR recalculation
        recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db, activity_date)
        
        # Get state after recalculation
        existing_irr_after = db.table("portfolio_fund_irr_values")\
            .select("*")\
            .eq("fund_id", portfolio_fund_id)\
            .gte("date", activity_date)\
            .execute()
        
        existing_portfolio_irr_after = db.table("portfolio_irr_values")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .gte("date", activity_date)\
            .execute()
        
        return {
            "test_status": "completed",
            "portfolio_fund_id": portfolio_fund_id,
            "portfolio_id": portfolio_id,
            "activity_date_used": activity_date,
            "recalculation_result": recalc_result,
            "before_state": {
                "fund_irr_count": len(existing_irr_before.data) if existing_irr_before.data else 0,
                "portfolio_irr_count": len(existing_portfolio_irr_before.data) if existing_portfolio_irr_before.data else 0,
                "fund_irr_values": existing_irr_before.data if existing_irr_before.data else [],
                "portfolio_irr_values": existing_portfolio_irr_before.data if existing_portfolio_irr_before.data else []
            },
            "after_state": {
                "fund_irr_count": len(existing_irr_after.data) if existing_irr_after.data else 0,
                "portfolio_irr_count": len(existing_portfolio_irr_after.data) if existing_portfolio_irr_after.data else 0,
                "fund_irr_values": existing_irr_after.data if existing_irr_after.data else [],
                "portfolio_irr_values": existing_portfolio_irr_after.data if existing_portfolio_irr_after.data else []
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
        portfolio_fund_check = db.table("portfolio_funds")\
            .select("id, portfolio_id")\
            .eq("id", portfolio_fund_id)\
            .execute()
        
        if not portfolio_fund_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio fund {portfolio_fund_id} not found")
        
        portfolio_id = portfolio_fund_check.data[0]["portfolio_id"]
        
        # If no activity date provided, get the latest activity date
        if not activity_date:
            latest_activity = db.table("holding_activity_log")\
                .select("activity_timestamp")\
                .eq("portfolio_fund_id", portfolio_fund_id)\
                .order("activity_timestamp", desc=True)\
                .limit(1)\
                .execute()
            
            if latest_activity.data:
                activity_date = latest_activity.data[0]["activity_timestamp"].split('T')[0]
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
        portfolio_funds = db.table("portfolio_funds")\
            .select("id, available_funds_id")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not portfolio_funds.data:
            return {"success": False, "error": f"No portfolio funds found for portfolio {portfolio_id}"}
        
        results = []
        
        for pf in portfolio_funds.data:
            portfolio_fund_id = pf["id"]
            available_funds_id = pf["available_funds_id"]
            
            # Get fund name for logging
            fund_details = db.table("available_funds")\
                .select("fund_name, isin_number")\
                .eq("id", available_funds_id)\
                .execute()
            
            fund_name = "Unknown"
            if fund_details.data:
                fund_name = fund_details.data[0]["fund_name"]
            
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
