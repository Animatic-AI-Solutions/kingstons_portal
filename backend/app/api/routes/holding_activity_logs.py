from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from datetime import datetime, date
from decimal import Decimal

from app.models.holding_activity_log import HoldingActivityLog, HoldingActivityLogCreate, HoldingActivityLogUpdate
from app.db.database import get_db

# Import standardized IRR calculation functions
from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr, calculate_multiple_portfolio_funds_irr

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def recalculate_irr_after_activity_change(portfolio_fund_id: int, db, activity_date: str = None):
    """
    Advanced IRR recalculation that implements the user's sophisticated requirements:
    
    1. Recalculates all IRR values from the activity date onwards (same date or later)
    2. Only creates new IRR entries if all portfolio funds share common valuation dates
    3. Replaces irr_result in existing entries rather than creating new ones
    4. Recalculates both fund-level and portfolio-level IRR values
    
    Args:
        portfolio_fund_id: The portfolio fund that was affected by the activity change
        db: Database connection
        activity_date: The date of the activity that was changed (YYYY-MM-DD format)
    """
    try:
        # IRR recalculation for portfolio fund after activity change
        # Starting sophisticated IRR recalculation
        
        # DEBUG: Get fund details to identify which fund this is
        fund_details = db.table("portfolio_funds")\
            .select("portfolio_id, available_funds_id")\
            .eq("id", portfolio_fund_id)\
            .execute()
        
        if fund_details.data:
            available_funds_id = fund_details.data[0]["available_funds_id"]
            fund_name_result = db.table("available_funds")\
                .select("fund_name, isin_number")\
                .eq("id", available_funds_id)\
                .execute()
            
            if fund_name_result.data:
                fund_name = fund_name_result.data[0]["fund_name"]
                isin = fund_name_result.data[0]["isin_number"]
        
        # Step 1: Get the latest activity date if not provided
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
        
        # Step 2: Get portfolio_id
        portfolio_fund_result = db.table("portfolio_funds")\
            .select("portfolio_id")\
            .eq("id", portfolio_fund_id)\
            .execute()
        
        if not portfolio_fund_result.data:
            logger.error(f"Portfolio fund {portfolio_fund_id} not found")
            return {"success": False, "error": "Portfolio fund not found"}
        
        portfolio_id = portfolio_fund_result.data[0]["portfolio_id"]
        
        # DEBUG: Check current valuation for this fund
        latest_valuation = db.table("portfolio_fund_valuations")\
            .select("valuation, valuation_date")\
            .eq("portfolio_fund_id", portfolio_fund_id)\
            .order("valuation_date", desc=True)\
            .limit(1)\
            .execute()
        
        if latest_valuation.data:
            current_valuation = latest_valuation.data[0]["valuation"]
            valuation_date = latest_valuation.data[0]["valuation_date"]
            
            if current_valuation == 0:
                logger.warning(f"Zero valuation detected for fund {portfolio_fund_id} - this may affect IRR calculation")
        else:
            logger.warning(f"No valuations found for fund {portfolio_fund_id}")
        
        # Step 3: Find all existing IRR values from the activity date onwards that need recalculation
        existing_irr_values = db.table("portfolio_fund_irr_values")\
            .select("*")\
            .eq("fund_id", portfolio_fund_id)\
            .gte("date", activity_date)\
            .order("date", desc=True)\
            .execute()
        
        # Process existing IRR values if any
        
        # Step 4: Recalculate each existing IRR value
        recalculated_count = 0
        for irr_record in existing_irr_values.data:
            irr_date = irr_record["date"].split('T')[0]  # Ensure YYYY-MM-DD format
            
            # Recalculate IRR for this specific date
            fund_irr_result = await calculate_single_portfolio_fund_irr(
                portfolio_fund_id=portfolio_fund_id,
                irr_date=irr_date,
                db=db
            )
            
            if fund_irr_result.get("success"):
                new_irr_percentage = fund_irr_result.get("irr_percentage", 0.0)
                old_irr_percentage = irr_record["irr_result"]
                
                # Update the existing IRR record (replace irr_result)
                update_result = db.table("portfolio_fund_irr_values")\
                    .update({"irr_result": float(new_irr_percentage)})\
                    .eq("id", irr_record["id"])\
                    .execute()
                recalculated_count += 1
            else:
                error_msg = fund_irr_result.get("error", "Unknown error")
                logger.warning(f"Failed to recalculate IRR for date {irr_date}: {error_msg}")
        
        # Step 5: Only create individual fund IRR entries for valuation dates where IRR truly doesn't exist
        # This step should be conservative and only create entries for dates that have valuations but no IRR records
        # The previous step (Step 4) already updated all existing IRR records from the activity date onwards
        
        # Get all valuation dates for this specific portfolio fund from activity date onwards
        fund_valuations = db.table("portfolio_fund_valuations")\
            .select("valuation_date, valuation")\
            .eq("portfolio_fund_id", portfolio_fund_id)\
            .gte("valuation_date", activity_date)\
            .execute()
        
        fund_valuation_dates = [(val["valuation_date"].split('T')[0], val["valuation"]) for val in fund_valuations.data]
        
        new_entries_created = 0
        
        # Only create IRR entries for valuation dates where IRR truly doesn't exist
        # Skip dates that were already processed in Step 4 (existing IRR updates)
        existing_irr_dates = set(irr_record["date"].split('T')[0] for irr_record in existing_irr_values.data)
        
        for valuation_date, valuation_amount in fund_valuation_dates:
            # Skip if this date already had an IRR record that was updated
            if valuation_date in existing_irr_dates:
                continue
            
            # Double-check if IRR already exists for this fund and date
            existing_check = db.table("portfolio_fund_irr_values")\
                .select("id")\
                .eq("fund_id", portfolio_fund_id)\
                .eq("date", valuation_date)\
                .execute()
            
            if not existing_check.data:
                # Create new IRR entry for this specific fund
                fund_irr_result = await calculate_single_portfolio_fund_irr(
                    portfolio_fund_id=portfolio_fund_id,
                    irr_date=valuation_date,
                    db=db
                )
                
                if fund_irr_result.get("success"):
                    irr_percentage = fund_irr_result.get("irr_percentage", 0.0)
                    
                    # Get valuation_id for this date
                    valuation_result = db.table("portfolio_fund_valuations")\
                        .select("id")\
                        .eq("portfolio_fund_id", portfolio_fund_id)\
                        .eq("valuation_date", valuation_date)\
                        .execute()
                    
                    valuation_id = valuation_result.data[0]["id"] if valuation_result.data else None
                    
                    irr_value_data = {
                        "fund_id": portfolio_fund_id,
                        "irr_result": float(irr_percentage),
                        "date": valuation_date,
                        "fund_valuation_id": valuation_id
                    }
                    
                    insert_result = db.table("portfolio_fund_irr_values").insert(irr_value_data).execute()
                    new_entries_created += 1
                else:
                    error_msg = fund_irr_result.get("error", "Unknown error")
                    logger.warning(f"Failed to calculate IRR for portfolio fund {portfolio_fund_id} on date {valuation_date}: {error_msg}")
        
        # Step 6: Check for portfolio-level IRR calculations based on common dates
        all_portfolio_funds = db.table("portfolio_funds")\
            .select("id, status")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        common_dates = []
        if all_portfolio_funds.data and len(all_portfolio_funds.data) > 1:
            all_fund_ids = [pf["id"] for pf in all_portfolio_funds.data]
            
            # Find common valuation dates across all funds from the activity date onwards
            common_dates = await find_common_valuation_dates_from_date(all_fund_ids, activity_date, db)
        else:
            common_dates = []
        
        # Step 7: Recalculate portfolio-level IRR values from the activity date onwards
        portfolio_irr_recalculated = await recalculate_portfolio_irr_values_from_date(
            portfolio_id, activity_date, db
        )
        
        result = {
            "success": True,
            "portfolio_fund_id": portfolio_fund_id,
            "portfolio_id": portfolio_id,
            "activity_start_date": activity_date,
            "recalculated_existing": recalculated_count,
            "new_entries_created": new_entries_created,
            "portfolio_irr_recalculated": portfolio_irr_recalculated,
            "common_dates_found": len(common_dates)
        }
        
        # IRR recalculation completed successfully
        return result
        
    except Exception as e:
        logger.error(f"Error in sophisticated IRR recalculation: {str(e)}")
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


async def recalculate_portfolio_irr_values_from_date(portfolio_id: int, start_date: str, db) -> int:
    """
    Recalculate portfolio-level IRR values from a start date onwards.
    This recalculates existing portfolio IRR entries and creates new ones for common valuation dates.
    
    Args:
        portfolio_id: The portfolio ID
        start_date: Only recalculate portfolio IRR values from this date onwards (YYYY-MM-DD format)
        db: Database connection
    
    Returns:
        The number of portfolio IRR values processed (recalculated + created)
    """
    try:
        logger.info(f"Recalculating portfolio-level IRR values for portfolio {portfolio_id} from {start_date} onwards")
        
        # Get all funds for this portfolio (active + inactive for historical accuracy)
        portfolio_funds = db.table("portfolio_funds")\
            .select("id, status")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not portfolio_funds.data:
            logger.warning(f"No portfolio funds found for portfolio {portfolio_id}")
            return 0
        
        all_fund_ids = [pf["id"] for pf in portfolio_funds.data]
        
        # Get existing portfolio IRR values from start date onwards
        existing_portfolio_irr = db.table("portfolio_irr_values")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .gte("date", start_date)\
            .order("date", desc=True)\
            .execute()
        
        recalculated_count = 0
        
        # Recalculate each existing portfolio IRR value
        for portfolio_irr_record in existing_portfolio_irr.data:
            irr_date = portfolio_irr_record["date"].split('T')[0]  # Ensure YYYY-MM-DD format
            
            # Calculate new portfolio IRR using multiple funds endpoint
            portfolio_irr_result = await calculate_multiple_portfolio_funds_irr(
                portfolio_fund_ids=all_fund_ids,
                irr_date=irr_date,
                db=db
            )
            
            if portfolio_irr_result.get("success"):
                new_portfolio_irr = portfolio_irr_result.get("irr_percentage", 0.0)
                
                # Update existing portfolio IRR record (replace irr_result)
                db.table("portfolio_irr_values")\
                    .update({"irr_result": float(new_portfolio_irr)})\
                    .eq("id", portfolio_irr_record["id"])\
                    .execute()
                
                logger.info(f"Updated portfolio IRR for date {irr_date}: {new_portfolio_irr}%")
                recalculated_count += 1
            else:
                logger.warning(f"Failed to recalculate portfolio IRR for date {irr_date}")
        
        # NEW: Find common valuation dates and create portfolio IRR entries where they don't exist
        if len(all_fund_ids) > 1:
            common_dates = await find_common_valuation_dates_from_date(all_fund_ids, start_date, db)
            logger.info(f"Found {len(common_dates)} common valuation dates from {start_date} onwards: {common_dates}")
            
            created_count = 0
            for common_date in common_dates:
                # Check if portfolio IRR already exists for this date
                existing_check = db.table("portfolio_irr_values")\
                    .select("id")\
                    .eq("portfolio_id", portfolio_id)\
                    .eq("date", common_date)\
                    .execute()
                
                if not existing_check.data:
                    # Create new portfolio IRR entry for this common date
                    portfolio_irr_result = await calculate_multiple_portfolio_funds_irr(
                        portfolio_fund_ids=all_fund_ids,
                        irr_date=common_date,
                        db=db
                    )
                    
                    if portfolio_irr_result.get("success"):
                        portfolio_irr_percentage = portfolio_irr_result.get("irr_percentage", 0.0)
                        
                        # Get portfolio valuation ID for this date if it exists
                        portfolio_valuation_result = db.table("portfolio_valuations")\
                            .select("id")\
                            .eq("portfolio_id", portfolio_id)\
                            .eq("valuation_date", common_date)\
                            .execute()
                        
                        portfolio_valuation_id = portfolio_valuation_result.data[0]["id"] if portfolio_valuation_result.data else None
                        
                        portfolio_irr_data = {
                            "portfolio_id": portfolio_id,
                            "irr_result": float(portfolio_irr_percentage),
                            "date": common_date,
                            "portfolio_valuation_id": portfolio_valuation_id
                        }
                        
                        db.table("portfolio_irr_values").insert(portfolio_irr_data).execute()
                        logger.info(f"Created new portfolio IRR entry for date {common_date}: {portfolio_irr_percentage}%")
                        created_count += 1
                    else:
                        logger.warning(f"Failed to calculate portfolio IRR for common date {common_date}")
                else:
                    logger.info(f"Portfolio IRR already exists for date {common_date}, skipping creation")
            
            total_processed = recalculated_count + created_count
            logger.info(f"Portfolio IRR processing complete: {recalculated_count} recalculated, {created_count} created, {total_processed} total")
            return total_processed
        else:
            logger.info(f"Only {len(all_fund_ids)} funds, skipping portfolio IRR creation for common dates")
            return recalculated_count
        
    except Exception as e:
        logger.error(f"Error recalculating portfolio IRR values from date: {str(e)}")
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
