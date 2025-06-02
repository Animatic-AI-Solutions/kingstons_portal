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

async def recalculate_irr_after_activity_change(portfolio_fund_id: int, db):
    """
    Automatically recalculates and stores IRR values after an activity change.
    
    User requirements:
    1. If it's the first activity for a portfolio fund, create a new IRR record
    2. If it's not the first activity, update the existing IRR value (don't create new row)
    3. Always recalculate portfolio-level IRR
    
    Args:
        portfolio_fund_id: The portfolio fund that was affected by the activity change
        db: Database connection
    """
    try:
        logger.info(f"Starting automatic IRR recalculation for portfolio fund {portfolio_fund_id}")
        
        # Step 1: Get portfolio_id from portfolio_fund_id
        portfolio_fund_result = db.table("portfolio_funds")\
            .select("portfolio_id")\
            .eq("id", portfolio_fund_id)\
            .execute()
        
        if not portfolio_fund_result.data:
            logger.error(f"Portfolio fund {portfolio_fund_id} not found")
            return {"success": False, "error": "Portfolio fund not found"}
        
        portfolio_id = portfolio_fund_result.data[0]["portfolio_id"]
        logger.info(f"Found portfolio_id: {portfolio_id} for portfolio_fund_id: {portfolio_fund_id}")
        
        # Step 2: Check if this is the first activity for the portfolio fund
        activity_count_result = db.table("holding_activity_log")\
            .select("id")\
            .eq("portfolio_fund_id", portfolio_fund_id)\
            .execute()
        
        activity_count = len(activity_count_result.data) if activity_count_result.data else 0
        is_first_activity = activity_count == 1  # If there's exactly 1 activity, it's the first one
        
        logger.info(f"Activity count for portfolio fund {portfolio_fund_id}: {activity_count}, is_first_activity: {is_first_activity}")
        
        # Step 3: Get the latest valuation date for this portfolio fund
        latest_valuation_result = db.table("portfolio_fund_valuations")\
            .select("valuation, valuation_date, id")\
            .eq("portfolio_fund_id", portfolio_fund_id)\
            .order("valuation_date", desc=True)\
            .limit(1)\
            .execute()
        
        if not latest_valuation_result.data:
            logger.warning(f"No valuations found for portfolio fund {portfolio_fund_id}, skipping IRR recalculation")
            return {"success": True, "message": "No valuations found, skipping IRR calculation"}
        
        latest_valuation_date = latest_valuation_result.data[0]["valuation_date"]
        latest_valuation_id = latest_valuation_result.data[0]["id"]
        # Convert to YYYY-MM-DD format for IRR calculation
        if 'T' in latest_valuation_date:
            calculation_date = latest_valuation_date.split('T')[0]
        else:
            calculation_date = latest_valuation_date
        
        logger.info(f"Using calculation date: {calculation_date}")
        
        # Step 4: Recalculate fund-level IRR using standardized function
        logger.info(f"Recalculating fund-level IRR for portfolio fund {portfolio_fund_id}")
        
        fund_irr_result = await calculate_single_portfolio_fund_irr(
            portfolio_fund_id=portfolio_fund_id,
            irr_date=calculation_date,
            db=db
        )
        
        fund_irr_success = False
        if fund_irr_result.get("success"):
            irr_percentage = fund_irr_result.get("irr_percentage", 0.0)
            logger.info(f"Fund IRR calculated: {irr_percentage}%")
            
            # Step 5: Implement user's requirement for IRR record creation/update
            if is_first_activity:
                # First activity - CREATE a new IRR record
                logger.info(f"First activity detected - creating new IRR record for portfolio fund {portfolio_fund_id}")
                
                irr_value_data = {
                    "fund_id": portfolio_fund_id,  # Correct field name for portfolio_fund_irr_values table
                    "irr_result": float(irr_percentage),  # Using irr_result column name
                    "irr_date": latest_valuation_date,  # Using irr_date column name
                    "fund_valuation_id": latest_valuation_id  # Correct field name for portfolio_fund_irr_values table
                }
                
                # Create new IRR record in portfolio_fund_irr_values table (fund-level IRR)
                db.table("portfolio_fund_irr_values").insert(irr_value_data).execute()
                logger.info(f"Created new fund IRR record for portfolio fund {portfolio_fund_id}")
            else:
                # Not the first activity - UPDATE existing IRR value
                logger.info(f"Subsequent activity detected - updating existing IRR value for portfolio fund {portfolio_fund_id}")
                
                # Find the existing IRR record for this fund (get the latest one)
                existing_irr = db.table("portfolio_fund_irr_values")\
                    .select("id")\
                    .eq("fund_id", portfolio_fund_id)\
                    .order("irr_date", desc=True)\
                    .limit(1)\
                    .execute()
                
                if existing_irr.data:
                    # Update existing IRR record
                    db.table("portfolio_fund_irr_values")\
                        .update({
                            "irr_result": float(irr_percentage),  # Using irr_result column name
                            "irr_date": latest_valuation_date,  # Using irr_date column name
                            "fund_valuation_id": latest_valuation_id
                        })\
                        .eq("id", existing_irr.data[0]["id"])\
                        .execute()
                    logger.info(f"Updated existing fund IRR for portfolio fund {portfolio_fund_id}")
                else:
                    # No existing IRR found, create new one (fallback case)
                    logger.warning(f"No existing IRR found for portfolio fund {portfolio_fund_id}, creating new record as fallback")
                    irr_value_data = {
                        "fund_id": portfolio_fund_id,
                        "irr_result": float(irr_percentage),  # Using irr_result column name
                        "irr_date": latest_valuation_date,  # Using irr_date column name
                        "fund_valuation_id": latest_valuation_id
                    }
                    db.table("portfolio_fund_irr_values").insert(irr_value_data).execute()
            
            fund_irr_success = True
        else:
            logger.warning(f"Fund IRR calculation failed: {fund_irr_result}")
        
        # Step 6: Always recalculate portfolio-level IRR (as per user requirement)
        logger.info(f"Recalculating portfolio-level IRR for portfolio {portfolio_id}")
        
        # Get all active portfolio funds for portfolio-level calculations
        portfolio_funds_result = db.table("portfolio_funds")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .eq("status", "active")\
            .execute()
        
        if not portfolio_funds_result.data:
            logger.warning(f"No active portfolio funds found for portfolio {portfolio_id}")
            return {
                "success": fund_irr_success,
                "fund_irr_calculated": fund_irr_success,
                "portfolio_irr_calculated": False,
                "message": "No active portfolio funds for portfolio-level calculation"
            }
        
        active_fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
        logger.info(f"Found {len(active_fund_ids)} active funds for portfolio-level calculations")
        
        # Step 7: Calculate portfolio valuation by summing fund valuations
        total_portfolio_value = 0.0
        for fund_id in active_fund_ids:
            fund_valuation_result = db.table("portfolio_fund_valuations")\
                .select("valuation")\
                .eq("portfolio_fund_id", fund_id)\
                .lte("valuation_date", calculation_date)\
                .order("valuation_date", desc=True)\
                .limit(1)\
                .execute()
            
            if fund_valuation_result.data:
                total_portfolio_value += float(fund_valuation_result.data[0]["valuation"])
        
        logger.info(f"Total portfolio value calculated: {total_portfolio_value}")
        
        # Step 8: Store/update portfolio valuation
        portfolio_valuation_data = {
            "portfolio_id": portfolio_id,
            "valuation_date": latest_valuation_date,
            "value": total_portfolio_value
        }
        
        existing_portfolio_valuation = db.table("portfolio_valuations")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .eq("valuation_date", latest_valuation_date)\
            .execute()
        
        if existing_portfolio_valuation.data:
            # Update existing portfolio valuation
            db.table("portfolio_valuations")\
                .update({"value": total_portfolio_value})\
                .eq("id", existing_portfolio_valuation.data[0]["id"])\
                .execute()
            portfolio_valuation_id = existing_portfolio_valuation.data[0]["id"]
            logger.info(f"Updated existing portfolio valuation for portfolio {portfolio_id}")
        else:
            # Create new portfolio valuation
            portfolio_valuation_result = db.table("portfolio_valuations")\
                .insert(portfolio_valuation_data)\
                .execute()
            portfolio_valuation_id = portfolio_valuation_result.data[0]["id"] if portfolio_valuation_result.data else None
            logger.info(f"Created new portfolio valuation for portfolio {portfolio_id}")
        
        # Step 9: Calculate portfolio-level IRR using multiple funds
        logger.info(f"Calculating portfolio-level IRR using {len(active_fund_ids)} active funds")
        
        portfolio_irr_result = await calculate_multiple_portfolio_funds_irr(
            portfolio_fund_ids=active_fund_ids,
            irr_date=calculation_date,
            db=db
        )
        
        portfolio_irr_success = False
        if portfolio_irr_result.get("success"):
            portfolio_irr_percentage = portfolio_irr_result.get("irr_percentage", 0.0)
            logger.info(f"Portfolio IRR calculated: {portfolio_irr_percentage}%")
            
            # Step 10: Store/update portfolio IRR (always update existing or create new)
            portfolio_irr_data = {
                "portfolio_id": portfolio_id,
                "irr_result": portfolio_irr_percentage,  # Using irr_result column name for portfolio_irr_values table
                "date": latest_valuation_date,  # Using date column name for portfolio_irr_values table
                "portfolio_valuation_id": portfolio_valuation_id,
                "calculation_method": "auto_recalc_after_activity"
            }
            
            existing_portfolio_irr = db.table("portfolio_irr_values")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .eq("date", latest_valuation_date)\
                .execute()
            
            if existing_portfolio_irr.data:
                # Update existing portfolio IRR
                db.table("portfolio_irr_values")\
                    .update({
                        "irr_result": portfolio_irr_percentage,  # Using irr_result column name
                        "portfolio_valuation_id": portfolio_valuation_id,
                        "calculation_method": "auto_recalc_after_activity"
                    })\
                    .eq("id", existing_portfolio_irr.data[0]["id"])\
                    .execute()
                logger.info(f"Updated existing portfolio IRR for portfolio {portfolio_id}")
            else:
                # Create new portfolio IRR
                db.table("portfolio_irr_values").insert(portfolio_irr_data).execute()
                logger.info(f"Created new portfolio IRR for portfolio {portfolio_id}")
            
            portfolio_irr_success = True
        else:
            logger.warning(f"Portfolio IRR calculation failed: {portfolio_irr_result}")
        
        logger.info(f"Automatic IRR recalculation completed for portfolio fund {portfolio_fund_id}")
        return {
            "success": True,
            "fund_irr_calculated": fund_irr_success,
            "portfolio_irr_calculated": portfolio_irr_success,
            "portfolio_id": portfolio_id,
            "calculation_date": calculation_date,
            "total_portfolio_value": total_portfolio_value,
            "is_first_activity": is_first_activity
        }
        
    except Exception as e:
        logger.error(f"Error during automatic IRR recalculation: {str(e)}")
        return {"success": False, "error": str(e)}

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
    holding_activity_log: HoldingActivityLogCreate, 
    db = Depends(get_db)
):
    """
    Creates a new holding activity log in the database.
    Simple version that just stores the activity without complex processing.
    Automatically determines product_id from portfolio_fund_id.
    """
    try:
        # Get the data dictionary from the model
        log_data = holding_activity_log.model_dump()
        
        logger.info(f"Creating activity log with data: {log_data}")
        
        # Automatically determine product_id from portfolio_fund_id
        portfolio_fund_id = log_data.get('portfolio_fund_id')
        if portfolio_fund_id and not log_data.get('product_id'):
            # Get the portfolio_id from the portfolio_fund
            portfolio_fund_result = db.table("portfolio_funds") \
                .select("portfolio_id") \
                .eq("id", portfolio_fund_id) \
                .execute()
            
            if portfolio_fund_result.data and len(portfolio_fund_result.data) > 0:
                portfolio_id = portfolio_fund_result.data[0]["portfolio_id"]
                
                # Find the client_product (the "product") that uses this portfolio
                product_result = db.table("client_products") \
                    .select("id") \
                    .eq("portfolio_id", portfolio_id) \
                .execute()
                
                if product_result.data and len(product_result.data) > 0:
                    product_id = product_result.data[0]["id"]
                    log_data['product_id'] = product_id
                    logger.info(f"Automatically determined product_id: {product_id} for portfolio_fund_id: {portfolio_fund_id}")
                else:
                    logger.warning(f"No client_product found for portfolio_id: {portfolio_id}")
                    raise HTTPException(status_code=400, detail=f"No product found for portfolio_fund_id: {portfolio_fund_id}")
            else:
                logger.error(f"Portfolio fund not found with id: {portfolio_fund_id}")
                raise HTTPException(status_code=400, detail=f"Portfolio fund not found with id: {portfolio_fund_id}")
        
        # Handle date serialization
        if "activity_timestamp" in log_data and isinstance(log_data["activity_timestamp"], date):
            log_data["activity_timestamp"] = log_data["activity_timestamp"].isoformat()
        
        # Handle amount conversion
        if 'amount' in log_data and log_data['amount'] is not None:
            if isinstance(log_data['amount'], Decimal):
                log_data['amount'] = float(log_data['amount'])
        
        # Insert the new activity log
        result = db.table("holding_activity_log").insert(log_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create holding activity log")
        
        created_activity = result.data[0]
        
        # ========================================================================
        # NEW: Automatically recalculate IRR after creating activity
        # ========================================================================
        try:
            logger.info(f"Triggering automatic IRR recalculation after creating activity for portfolio fund {portfolio_fund_id}")
            irr_recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db)
            logger.info(f"IRR recalculation result: {irr_recalc_result}")
        except Exception as e:
            # Don't fail the activity creation if IRR recalculation fails
            logger.error(f"IRR recalculation failed after activity creation: {str(e)}")
        # ========================================================================
        
        return created_activity
        
    except Exception as e:
        logger.error(f"Error creating holding activity log: {str(e)}")
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
            
            if portfolio_fund_id:
                logger.info(f"Triggering automatic IRR recalculation after updating activity for portfolio fund {portfolio_fund_id}")
                irr_recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db)
                logger.info(f"IRR recalculation result: {irr_recalc_result}")
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
        
        # Get portfolio_fund_id before deletion for IRR recalculation
        portfolio_fund_id = existing.data[0].get("portfolio_fund_id")
        
        # Delete the activity log
        db.table("holding_activity_log").delete().eq("id", holding_activity_log_id).execute()
        
        logger.info(f"Successfully deleted activity log with ID: {holding_activity_log_id}")
        
        # ========================================================================
        # NEW: Automatically recalculate IRR after deleting activity
        # ========================================================================
        try:
            if portfolio_fund_id:
                logger.info(f"Triggering automatic IRR recalculation after deleting activity for portfolio fund {portfolio_fund_id}")
                irr_recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db)
                logger.info(f"IRR recalculation result: {irr_recalc_result}")
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
