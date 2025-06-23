from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.db.database import get_db
from app.models.fund_valuation import FundValuationCreate, FundValuationUpdate, FundValuation, LatestFundValuationViewItem
import logging

# Import the IRR recalculation function
from app.api.routes.holding_activity_logs import recalculate_irr_after_activity_change

router = APIRouter()
logger = logging.getLogger(__name__)

async def should_recalculate_portfolio_irr(portfolio_id: int, valuation_date: str, db) -> bool:
    """
    Check if portfolio IRR should be recalculated for a given date.
    Portfolio IRR should be recalculated whenever there's a common valuation date across all funds.
    
    Args:
        portfolio_id: The portfolio ID to check
        valuation_date: The valuation date in YYYY-MM-DD format
        db: Database connection
    
    Returns:
        True if portfolio IRR should be calculated/recalculated, False otherwise
    """
    try:
        # Get all portfolio funds in this portfolio (active and inactive)
        all_portfolio_funds_result = db.table("portfolio_funds")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not all_portfolio_funds_result.data:
            return False
        
        all_fund_ids = [pf["id"] for pf in all_portfolio_funds_result.data]
        
        # Check if ALL funds have a valuation on this date
        date_start = f"{valuation_date}T00:00:00"
        date_end = f"{valuation_date}T23:59:59"
        
        for fund_id in all_fund_ids:
            fund_valuation_check = db.table("portfolio_fund_valuations")\
                .select("id")\
                .eq("portfolio_fund_id", fund_id)\
                .gte("valuation_date", date_start)\
                .lte("valuation_date", date_end)\
                .execute()
            
            if not fund_valuation_check.data:
                # This fund doesn't have a valuation on this date, so it's not a common date
                return False
        
        # All funds have valuations on this date, so portfolio IRR should be calculated/recalculated
        # We should ALWAYS recalculate portfolio IRR when fund valuations change on a common date
        # This ensures portfolio IRR stays in sync with fund-level changes
        logger.info(f"All {len(all_fund_ids)} funds have valuations on {valuation_date} - portfolio IRR calculation needed")
        return True
        
    except Exception as e:
        logger.error(f"Error checking common valuation date: {str(e)}")
        return False

@router.post("/fund_valuations", response_model=FundValuation)
async def create_fund_valuation(
    fund_valuation: FundValuationCreate,
    db = Depends(get_db)
):
    """
    Create a new fund valuation.
    Zero-value valuations are now allowed and will be saved.
    """
    try:
        logger.info(f"🔍 VALUATION ENTRY: create_fund_valuation called for fund {fund_valuation.portfolio_fund_id}, date {fund_valuation.valuation_date}, value {fund_valuation.valuation}")
        # Check if portfolio fund exists
        portfolio_fund_result = db.table("portfolio_funds").select("id").eq("id", fund_valuation.portfolio_fund_id).execute()
        if not portfolio_fund_result.data or len(portfolio_fund_result.data) == 0:
            raise HTTPException(status_code=404, detail="Portfolio fund not found")
        
        # Handle None values as zeros
        valuation_amount = 0.0
        if fund_valuation.valuation is not None:
            try:
                valuation_amount = float(fund_valuation.valuation)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Invalid valuation format - must be a number")
        
        # Check for duplicate (same portfolio_fund_id and valuation_date)
        existing_valuation = db.table("portfolio_fund_valuations") \
            .select("*") \
            .eq("portfolio_fund_id", fund_valuation.portfolio_fund_id) \
            .eq("valuation_date", fund_valuation.valuation_date.isoformat()) \
            .execute()
        
        if existing_valuation.data:
            # Update existing valuation
            existing_id = existing_valuation.data[0]['id']
            update_result = db.table("portfolio_fund_valuations") \
                .update({
                    "valuation": valuation_amount,
                    "created_at": datetime.now().isoformat()
                }) \
                .eq("id", existing_id) \
                .execute()
            
            if update_result.data:
                logger.info(f"Updated existing fund valuation with ID {existing_id}")
                
                updated_valuation = update_result.data[0]
                
                # ========================================================================
                # NEW: Automatically recalculate IRR after updating existing valuation
                # ========================================================================
                try:
                    # Get the valuation date for IRR recalculation
                    valuation_date = fund_valuation.valuation_date.isoformat().split('T')[0]
                    
                    # Find existing IRR for this fund and date
                    existing_irr = db.table("portfolio_fund_irr_values")\
                        .select("*")\
                        .eq("fund_id", fund_valuation.portfolio_fund_id)\
                        .eq("date", valuation_date)\
                        .execute()
                    
                    if existing_irr.data:
                        # Update existing IRR
                        from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
                        irr_result = await calculate_single_portfolio_fund_irr(
                            portfolio_fund_id=fund_valuation.portfolio_fund_id,
                            irr_date=valuation_date,
                            db=db
                        )
                        
                        if irr_result.get("success"):
                            new_irr = irr_result.get("irr_percentage", 0.0)
                            db.table("portfolio_fund_irr_values")\
                                .update({"irr_result": float(new_irr)})\
                                .eq("id", existing_irr.data[0]["id"])\
                                .execute()
                            logger.info(f"Updated existing IRR for {valuation_date}: {new_irr}%")
                    else:
                        # Create new IRR if none exists
                        logger.info(f"No existing IRR found for {valuation_date}, creating new IRR")
                        from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
                        irr_result = await calculate_single_portfolio_fund_irr(
                            portfolio_fund_id=fund_valuation.portfolio_fund_id,
                            irr_date=valuation_date,
                            db=db
                        )
                        
                        if irr_result.get("success"):
                            new_irr = irr_result.get("irr_percentage", 0.0)
                            
                            irr_data = {
                                "fund_id": fund_valuation.portfolio_fund_id,
                                "irr_result": float(new_irr),
                                "date": valuation_date,
                                "fund_valuation_id": updated_valuation.get("id")
                            }
                            
                            db.table("portfolio_fund_irr_values").insert(irr_data).execute()
                            logger.info(f"Created new IRR for {valuation_date}: {new_irr}%")
                        
                except Exception as e:
                    # Don't fail the valuation update if IRR recalculation fails
                    logger.error(f"IRR recalculation failed after valuation update: {str(e)}")
                # ========================================================================
                
                # ========================================================================
                # NEW: Check if this creates a common valuation date that needs portfolio IRR
                # ========================================================================
                try:
                    # Get the portfolio ID for this fund
                    portfolio_fund_result = db.table("portfolio_funds").select("portfolio_id").eq("id", fund_valuation.portfolio_fund_id).execute()
                    if portfolio_fund_result.data:
                        portfolio_id = portfolio_fund_result.data[0]["portfolio_id"]
                        valuation_date = fund_valuation.valuation_date.isoformat().split('T')[0]
                        
                        # Check if portfolio IRR should be recalculated for this date
                        if await should_recalculate_portfolio_irr(portfolio_id, valuation_date, db):
                            logger.info(f"🔍 PORTFOLIO IRR: Portfolio IRR recalculation needed for portfolio {portfolio_id} on date {valuation_date}")
                            
                            # Import and call the portfolio IRR calculation function
                            from app.api.routes.portfolios import calculate_portfolio_irr
                            portfolio_irr_result = await calculate_portfolio_irr(portfolio_id=portfolio_id, db=db)
                            logger.info(f"🔍 PORTFOLIO IRR: Portfolio IRR calculation completed: {portfolio_irr_result.get('portfolio_irr', {}).get('calculated', False)}")
                        else:
                            logger.info(f"🔍 PORTFOLIO IRR: No portfolio IRR calculation needed for portfolio {portfolio_id} on date {valuation_date}")
                except Exception as e:
                    # Don't fail the valuation update if portfolio IRR calculation fails
                    logger.error(f"🔍 PORTFOLIO IRR: Portfolio IRR calculation failed after valuation update: {str(e)}")
                # ========================================================================
                
                return updated_valuation
            else:
                raise HTTPException(status_code=500, detail="Failed to update existing fund valuation")
        
        # Create new valuation
        fund_valuation_data = {
            "portfolio_fund_id": fund_valuation.portfolio_fund_id,
            "valuation_date": fund_valuation.valuation_date.isoformat(),
            "valuation": valuation_amount
        }
        
        result = db.table("portfolio_fund_valuations").insert(fund_valuation_data).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create fund valuation")
            
        created_valuation = result.data[0]
        
        # ========================================================================
        # NEW: Automatically create IRR after creating fund valuation
        # ========================================================================
        try:
            # Get the valuation date for IRR calculation
            valuation_date = fund_valuation.valuation_date.isoformat().split('T')[0]
            
            logger.info(f"🔍 VALUATION DEBUG: About to check for existing IRR for fund {fund_valuation.portfolio_fund_id}, date {valuation_date}")
            
            # Check if IRR already exists for this fund and date
            existing_irr = db.table("portfolio_fund_irr_values")\
                .select("*")\
                .eq("fund_id", fund_valuation.portfolio_fund_id)\
                .eq("date", valuation_date)\
                .execute()
            
            logger.info(f"🔍 VALUATION DEBUG: Found {len(existing_irr.data) if existing_irr.data else 0} existing IRR records")
            
            if not existing_irr.data:
                logger.info(f"🔍 VALUATION DEBUG: About to create new IRR for fund {fund_valuation.portfolio_fund_id}")
                # Create new IRR
                from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
                irr_result = await calculate_single_portfolio_fund_irr(
                    portfolio_fund_id=fund_valuation.portfolio_fund_id,
                    irr_date=valuation_date,
                    db=db
                )
                
                if irr_result.get("success"):
                    new_irr = irr_result.get("irr_percentage", 0.0)
                    
                    irr_data = {
                        "fund_id": fund_valuation.portfolio_fund_id,
                        "irr_result": float(new_irr),
                        "date": valuation_date,
                        "fund_valuation_id": created_valuation["id"]
                    }
                    
                    logger.info(f"🔍 VALUATION DEBUG: About to insert IRR data: {irr_data}")
                    insert_result = db.table("portfolio_fund_irr_values").insert(irr_data).execute()
                    logger.info(f"🔍 VALUATION DEBUG: Successfully created new IRR: {insert_result.data}")
            else:
                logger.info(f"🔍 VALUATION DEBUG: IRR already exists for {valuation_date}, skipping creation")
                
        except Exception as e:
            # Don't fail the valuation creation if IRR calculation fails
            logger.error(f"🔍 VALUATION DEBUG: IRR calculation failed after valuation creation: {str(e)}")
        # ========================================================================
        
        # ========================================================================
        # NEW: Check if this creates a common valuation date that needs portfolio IRR
        # ========================================================================
        try:
            # Get the portfolio ID for this fund
            portfolio_fund_result = db.table("portfolio_funds").select("portfolio_id").eq("id", fund_valuation.portfolio_fund_id).execute()
            if portfolio_fund_result.data:
                portfolio_id = portfolio_fund_result.data[0]["portfolio_id"]
                valuation_date = fund_valuation.valuation_date.isoformat().split('T')[0]
                
                # Check if portfolio IRR should be recalculated for this date
                if await should_recalculate_portfolio_irr(portfolio_id, valuation_date, db):
                    logger.info(f"🔍 PORTFOLIO IRR: Portfolio IRR recalculation needed for portfolio {portfolio_id} on date {valuation_date}")
                    
                    # Import and call the portfolio IRR calculation function
                    from app.api.routes.portfolios import calculate_portfolio_irr
                    portfolio_irr_result = await calculate_portfolio_irr(portfolio_id=portfolio_id, db=db)
                    logger.info(f"🔍 PORTFOLIO IRR: Portfolio IRR calculation completed: {portfolio_irr_result.get('portfolio_irr', {}).get('calculated', False)}")
                else:
                    logger.info(f"🔍 PORTFOLIO IRR: No portfolio IRR calculation needed for portfolio {portfolio_id} on date {valuation_date}")
        except Exception as e:
            # Don't fail the valuation creation if portfolio IRR calculation fails
            logger.error(f"🔍 PORTFOLIO IRR: Portfolio IRR calculation failed after valuation creation: {str(e)}")
        # ========================================================================
            
        logger.info(f"🔍 VALUATION EXIT: create_fund_valuation completed successfully for fund {fund_valuation.portfolio_fund_id}")
        return created_valuation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating fund valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/fund_valuations", response_model=List[FundValuation])
async def get_fund_valuations(
    portfolio_fund_id: Optional[int] = Query(None),
    db = Depends(get_db)
):
    """
    Get all fund valuations, optionally filtered by portfolio_fund_id.
    """
    try:
        query = db.table("portfolio_fund_valuations").select("*")
        
        if portfolio_fund_id is not None:
            query = query.eq("portfolio_fund_id", portfolio_fund_id)
        
        # Order by date descending (newest first)
        result = query.order("valuation_date", desc=True).execute()
        
        return result.data
    except Exception as e:
        logger.error(f"Error getting fund valuations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/fund_valuations/latest/{portfolio_fund_id}", response_model=FundValuation)
async def get_latest_fund_valuation(
    portfolio_fund_id: int,
    db = Depends(get_db)
):
    """
    Get the latest fund valuation for a specific portfolio fund.
    """
    try:
        result = db.table("portfolio_fund_valuations") \
            .select("*") \
            .eq("portfolio_fund_id", portfolio_fund_id) \
            .order("valuation_date", desc=True) \
            .limit(1) \
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="No fund valuations found for this portfolio fund")
            
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting latest fund valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/all_latest_fund_valuations", response_model=List[LatestFundValuationViewItem])
async def get_all_latest_fund_valuations_from_view(
    db = Depends(get_db)
):
    """
    Get all latest fund valuations from the public.latest_portfolio_fund_valuations view.
    """
    try:
        # The view is already named 'latest_portfolio_fund_valuations'
        result = db.table("latest_portfolio_fund_valuations").select("*").execute()
        
        if not result.data:
            return []
            
        return result.data
    except Exception as e:
        logger.error(f"Error getting all latest fund valuations from view: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/fund_valuations/exists/{portfolio_fund_id}")
async def check_fund_valuation_exists(
    portfolio_fund_id: int,
    year: int = Query(..., ge=1900, le=2100),
    month: int = Query(..., ge=1, le=12),
    db = Depends(get_db)
):
    """
    Check if a fund valuation exists for a specific month and year.
    
    This endpoint is used to validate whether a valuation record exists
    for a given portfolio fund in a specific month/year. This is important
    for ensuring that transactions (withdrawals, switches, etc.) can only
    be recorded for months where a valuation exists.
    
    The query is optimized using the idx_fund_valuations_fund_date index
    on (portfolio_fund_id, valuation_date) for efficient lookups.
    
    Returns a JSON object with a boolean 'exists' field indicating whether
    a valuation record exists.
    """
    try:
        first_day = datetime(year, month, 1)
        if month == 12:
            next_month = datetime(year + 1, 1, 1)
        else:
            next_month = datetime(year, month + 1, 1)
            
        # This query uses the idx_fund_valuations_fund_date index for fast lookups
        result = db.table("portfolio_fund_valuations") \
            .select("id") \
            .eq("portfolio_fund_id", portfolio_fund_id) \
            .gte("valuation_date", first_day.isoformat()) \
            .lt("valuation_date", next_month.isoformat()) \
            .limit(1) \
            .execute()
            
        return {"exists": bool(result.data and len(result.data) > 0)}
    except Exception as e:
        logger.error(f"Error checking fund valuation existence: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/fund_valuations/{valuation_id}", response_model=FundValuation)
async def get_fund_valuation(
    valuation_id: int,
    db = Depends(get_db)
):
    """
    Get a specific fund valuation by ID.
    """
    try:
        result = db.table("portfolio_fund_valuations").select("*").eq("id", valuation_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Fund valuation not found")
            
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fund valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/fund_valuations/{valuation_id}", response_model=FundValuation)
async def update_fund_valuation(
    valuation_id: int,
    fund_valuation: FundValuationUpdate,
    db = Depends(get_db)
):
    """
    Update a fund valuation.
    Zero-value valuations are now allowed and will be saved.
    Empty string values will delete the valuation.
    """
    try:
        # Check if fund valuation exists
        existing_result = db.table("portfolio_fund_valuations").select("*").eq("id", valuation_id).execute()
        
        # Handle case where valuation doesn't exist
        if not existing_result.data or len(existing_result.data) == 0:
            raise HTTPException(status_code=404, detail="Fund valuation not found")
        
        # Check if value is empty string and delete if so
        if hasattr(fund_valuation, 'valuation') and isinstance(fund_valuation.valuation, str) and fund_valuation.valuation.strip() == "":
            logger.info(f"Deleting fund valuation {valuation_id} due to empty value")
            
            # Get portfolio_fund_id before deletion for IRR recalculation
            portfolio_fund_id = existing_result.data[0]["portfolio_fund_id"]
            
            # ========================================================================
            # NEW: Clean up related IRR records before deleting valuation
            # ========================================================================
            try:
                # Delete any IRR records that reference this valuation
                irr_cleanup_result = db.table("portfolio_fund_irr_values")\
                    .delete()\
                    .eq("fund_valuation_id", valuation_id)\
                    .execute()
                
                if irr_cleanup_result.data:
                    logger.info(f"Cleaned up {len(irr_cleanup_result.data)} related IRR records before deleting valuation {valuation_id}")
            except Exception as e:
                logger.warning(f"Failed to clean up related IRR records for valuation {valuation_id}: {str(e)}")
            # ========================================================================
            
            delete_result = db.table("portfolio_fund_valuations").delete().eq("id", valuation_id).execute()
            
            if not delete_result.data:
                raise HTTPException(status_code=500, detail="Failed to delete fund valuation")
                
            # ========================================================================
            # NEW: Automatically recalculate IRR after deleting valuation
            # ========================================================================
            try:
                # Get the valuation date for sophisticated recalculation
                valuation_date = existing_result.data[0].get("valuation_date", "").split('T')[0]
                
                logger.info(f"Triggering sophisticated IRR recalculation after deleting valuation for portfolio fund {portfolio_fund_id} on date {valuation_date}")
                irr_recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db, valuation_date)
                logger.info(f"Sophisticated IRR recalculation result: {irr_recalc_result}")
            except Exception as e:
                # Don't fail the valuation deletion if IRR recalculation fails
                logger.error(f"IRR recalculation failed after valuation deletion: {str(e)}")
            # ========================================================================
                
            # Return the deleted record
            return existing_result.data[0]
            
        # Prepare update data (only include fields that are provided)
        update_data = {}  # Removed updated_at as it doesn't exist in the schema
        
        if fund_valuation.portfolio_fund_id is not None:
            # Verify that portfolio fund exists
            portfolio_fund_result = db.table("portfolio_funds").select("id").eq("id", fund_valuation.portfolio_fund_id).execute()
            if not portfolio_fund_result.data or len(portfolio_fund_result.data) == 0:
                raise HTTPException(status_code=404, detail="Portfolio fund not found")
            
            update_data["portfolio_fund_id"] = fund_valuation.portfolio_fund_id
        
        if fund_valuation.valuation_date is not None:
            update_data["valuation_date"] = fund_valuation.valuation_date.isoformat()
        
        if fund_valuation.valuation is not None:
            update_data["valuation"] = float(fund_valuation.valuation)
        
        if len(update_data) == 0:
            # No actual updates provided, return existing data
            return existing_result.data[0]
        
        # Update the fund valuation
        result = db.table("portfolio_fund_valuations").update(update_data).eq("id", valuation_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to update fund valuation")
            
        updated_valuation = result.data[0]
        
        # ========================================================================
        # NEW: Automatically update IRR after updating fund valuation
        # ========================================================================
        try:
            # Get portfolio_fund_id from the updated record or existing record
            portfolio_fund_id = updated_valuation.get("portfolio_fund_id") or existing_result.data[0]["portfolio_fund_id"]
            
            # Get the valuation date (use updated date if provided, otherwise existing)
            valuation_date = updated_valuation.get("valuation_date") or existing_result.data[0]["valuation_date"]
            if isinstance(valuation_date, str):
                valuation_date = valuation_date.split('T')[0]
            
            # Find existing IRR for this fund and date
            existing_irr = db.table("portfolio_fund_irr_values")\
                .select("*")\
                .eq("fund_id", portfolio_fund_id)\
                .eq("date", valuation_date)\
                .execute()
            
            if existing_irr.data:
                # Update existing IRR
                from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
                irr_result = await calculate_single_portfolio_fund_irr(
                    portfolio_fund_id=portfolio_fund_id,
                    irr_date=valuation_date,
                    db=db
                )
                
                if irr_result.get("success"):
                    new_irr = irr_result.get("irr_percentage", 0.0)
                    db.table("portfolio_fund_irr_values")\
                        .update({"irr_result": float(new_irr)})\
                        .eq("id", existing_irr.data[0]["id"])\
                        .execute()
                    logger.info(f"Updated existing IRR for {valuation_date}: {new_irr}%")
            else:
                # Create new IRR if none exists
                from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
                irr_result = await calculate_single_portfolio_fund_irr(
                    portfolio_fund_id=portfolio_fund_id,
                    irr_date=valuation_date,
                    db=db
                )
                
                if irr_result.get("success"):
                    new_irr = irr_result.get("irr_percentage", 0.0)
                    
                    irr_data = {
                        "fund_id": portfolio_fund_id,
                        "irr_result": float(new_irr),
                        "date": valuation_date,
                        "fund_valuation_id": valuation_id
                    }
                    
                    db.table("portfolio_fund_irr_values").insert(irr_data).execute()
                    logger.info(f"Created new IRR for {valuation_date}: {new_irr}%")
                    
        except Exception as e:
            # Don't fail the valuation update if IRR update fails
            logger.error(f"IRR update failed after valuation update: {str(e)}")
        # ========================================================================
        
        # ========================================================================
        # NEW: Check if this creates a common valuation date that needs portfolio IRR
        # ========================================================================
        try:
            # Get the portfolio ID for this fund
            portfolio_fund_result = db.table("portfolio_funds").select("portfolio_id").eq("id", updated_valuation.get("portfolio_fund_id") or existing_result.data[0]["portfolio_fund_id"]).execute()
            if portfolio_fund_result.data:
                portfolio_id = portfolio_fund_result.data[0]["portfolio_id"]
                
                # Get the valuation date (use updated date if provided, otherwise existing)
                valuation_date = updated_valuation.get("valuation_date") or existing_result.data[0]["valuation_date"]
                if isinstance(valuation_date, str):
                    valuation_date = valuation_date.split('T')[0]
                
                # Check if portfolio IRR should be recalculated for this date
                if await should_recalculate_portfolio_irr(portfolio_id, valuation_date, db):
                    logger.info(f"🔍 PORTFOLIO IRR: Portfolio IRR recalculation needed for portfolio {portfolio_id} on date {valuation_date}")
                    
                    # Import and call the portfolio IRR calculation function
                    from app.api.routes.portfolios import calculate_portfolio_irr
                    portfolio_irr_result = await calculate_portfolio_irr(portfolio_id=portfolio_id, db=db)
                    logger.info(f"🔍 PORTFOLIO IRR: Portfolio IRR calculation completed: {portfolio_irr_result.get('portfolio_irr', {}).get('calculated', False)}")
                else:
                    logger.info(f"🔍 PORTFOLIO IRR: No portfolio IRR calculation needed for portfolio {portfolio_id} on date {valuation_date}")
        except Exception as e:
            # Don't fail the valuation update if portfolio IRR calculation fails
            logger.error(f"🔍 PORTFOLIO IRR: Portfolio IRR calculation failed after valuation update: {str(e)}")
        # ========================================================================
            
        return updated_valuation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating fund valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/fund_valuations/{valuation_id}", response_model=dict)
async def delete_fund_valuation(
    valuation_id: int,
    db = Depends(get_db)
):
    """
    Delete a fund valuation with cascade deletion logic.
    
    When a fund valuation is deleted:
    1. Delete the fund-level IRR that was based on that valuation
    2. Check if this deletion breaks common valuation dates across the portfolio
    3. If so, delete the portfolio-level IRR and valuation for that date
    """
    try:
        logger.info(f"Attempting to delete fund valuation with ID: {valuation_id}")
        
        # Check if fund valuation exists and get its details
        existing_result = db.table("portfolio_fund_valuations").select("*").eq("id", valuation_id).execute()
        
        if not existing_result.data or len(existing_result.data) == 0:
            logger.warning(f"Fund valuation with ID {valuation_id} not found, but treating as success")
            return {"message": f"Fund valuation with ID {valuation_id} doesn't exist", "status": "success"}
        
        # Get details of the valuation being deleted
        valuation_to_delete = existing_result.data[0]
        portfolio_fund_id = valuation_to_delete["portfolio_fund_id"]
        valuation_date = valuation_to_delete["valuation_date"]
        
        # Extract just the date part (YYYY-MM-DD) for comparison
        if isinstance(valuation_date, str):
            valuation_date_only = valuation_date.split('T')[0]
        else:
            valuation_date_only = valuation_date.strftime('%Y-%m-%d')
        
        logger.info(f"Deleting fund valuation for portfolio fund {portfolio_fund_id} on date {valuation_date_only}")
        
        # Get the portfolio ID for this fund
        portfolio_fund_result = db.table("portfolio_funds")\
            .select("portfolio_id")\
            .eq("id", portfolio_fund_id)\
            .execute()
        
        if not portfolio_fund_result.data:
            raise HTTPException(status_code=404, detail=f"Portfolio fund {portfolio_fund_id} not found")
        
        portfolio_id = portfolio_fund_result.data[0]["portfolio_id"]
        
        # ========================================================================
        # Step 1: Clean up related fund-level IRR records before deleting valuation
        # ========================================================================
        try:
            # Delete any IRR records that reference this valuation
            irr_cleanup_result = db.table("portfolio_fund_irr_values")\
                .delete()\
                .eq("fund_valuation_id", valuation_id)\
                .execute()
            
            if irr_cleanup_result.data:
                logger.info(f"Cleaned up {len(irr_cleanup_result.data)} fund-level IRR records before deleting valuation {valuation_id}")
                
            # Also delete any fund-level IRRs for this fund on the same date (even if not linked by valuation_id)
            # Use date range instead of LIKE for timestamp comparison
            date_start = f"{valuation_date_only}T00:00:00"
            date_end = f"{valuation_date_only}T23:59:59"
            
            fund_irr_cleanup_result = db.table("portfolio_fund_irr_values")\
                .delete()\
                .eq("fund_id", portfolio_fund_id)\
                .gte("date", date_start)\
                .lte("date", date_end)\
                .execute()
                
            if fund_irr_cleanup_result.data:
                logger.info(f"Cleaned up {len(fund_irr_cleanup_result.data)} additional fund-level IRR records for date {valuation_date_only}")
                
        except Exception as e:
            logger.warning(f"Failed to clean up related IRR records for valuation {valuation_id}: {str(e)}")
        
        # ========================================================================
        # Step 2: Check if deleting this valuation breaks common valuation dates
        # ========================================================================
        
        # Get ALL portfolio funds in this portfolio (both active and inactive)
        # IRR calculations should include all funds for historical accuracy
        all_portfolio_funds_result = db.table("portfolio_funds")\
            .select("id, status")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        all_portfolio_fund_ids = [pf["id"] for pf in all_portfolio_funds_result.data] if all_portfolio_funds_result.data else []
        
        # Check if after deleting this valuation, ALL funds still have valuations on this date
        # For a common date to exist, EVERY portfolio fund (active + inactive) must have a valuation on that date
        common_date_still_exists = True
        
        if len(all_portfolio_fund_ids) > 0:
            for fund_id in all_portfolio_fund_ids:
                # Check if this fund has a valuation on the same date using date range
                date_start = f"{valuation_date_only}T00:00:00"
                date_end = f"{valuation_date_only}T23:59:59"
                
                fund_valuation_check = db.table("portfolio_fund_valuations")\
                    .select("id")\
                    .eq("portfolio_fund_id", fund_id)\
                    .gte("valuation_date", date_start)\
                    .lte("valuation_date", date_end)\
                    .execute()
                
                # IMPORTANT: For the fund we're deleting from, we need to check if there are 
                # OTHER valuations on this date (since we're about to delete one)
                if fund_id == portfolio_fund_id:
                    # For the fund we're deleting from, check if there are other valuations on this date
                    # (excluding the one we're about to delete)
                    remaining_valuations = [v for v in fund_valuation_check.data if v["id"] != valuation_id] if fund_valuation_check.data else []
                    if not remaining_valuations:
                        # This fund will have no valuations left on this date after deletion
                        common_date_still_exists = False
                        logger.info(f"Fund {fund_id} will have no valuations on {valuation_date_only} after deleting valuation {valuation_id}")
                        break
                else:
                    # For other funds, just check if they have any valuation on this date
                    if not fund_valuation_check.data:
                        # This fund doesn't have a valuation on this date, so common date is already broken
                        common_date_still_exists = False
                        logger.info(f"Fund {fund_id} has no valuations on {valuation_date_only}")
                        break
            
            logger.info(f"Common valuation date {valuation_date_only} still exists after deletion: {common_date_still_exists}")
        else:
            # If there are no portfolio funds, then there's no common date
            common_date_still_exists = False
            logger.info(f"No portfolio funds found, common date will be broken")
        
        # ========================================================================
        # Step 3: Delete the fund valuation
        # ========================================================================
        result = db.table("portfolio_fund_valuations").delete().eq("id", valuation_id).execute()
        
        if not result or not hasattr(result, 'data') or not result.data:
            logger.error(f"Failed to delete fund valuation with ID {valuation_id}")
            raise HTTPException(status_code=500, detail="Failed to delete fund valuation")
            
        logger.info(f"Successfully deleted fund valuation with ID {valuation_id}")
        
        # ========================================================================
        # Step 4: If common date is broken, delete portfolio-level IRR and valuation for that date
        # ========================================================================
        cascade_deletions = []
        
        if not common_date_still_exists:
            logger.info(f"Common valuation date {valuation_date_only} is broken, performing cascade deletions")
            
            # Delete portfolio-level IRR values for this date using date range
            try:
                date_start = f"{valuation_date_only}T00:00:00"
                date_end = f"{valuation_date_only}T23:59:59"
                
                portfolio_irr_delete_result = db.table("portfolio_irr_values")\
                    .delete()\
                    .eq("portfolio_id", portfolio_id)\
                    .gte("date", date_start)\
                    .lte("date", date_end)\
                    .execute()
                
                if portfolio_irr_delete_result.data:
                    logger.info(f"Deleted {len(portfolio_irr_delete_result.data)} portfolio IRR records for date {valuation_date_only}")
                    cascade_deletions.append(f"Deleted {len(portfolio_irr_delete_result.data)} portfolio IRR records")
                
            except Exception as e:
                logger.warning(f"Failed to delete portfolio IRR records for date {valuation_date_only}: {str(e)}")
            
            # Delete portfolio-level valuation for this date using date range
            try:
                date_start = f"{valuation_date_only}T00:00:00"
                date_end = f"{valuation_date_only}T23:59:59"
                
                portfolio_valuation_delete_result = db.table("portfolio_valuations")\
                    .delete()\
                    .eq("portfolio_id", portfolio_id)\
                    .gte("valuation_date", date_start)\
                    .lte("valuation_date", date_end)\
                    .execute()
                
                if portfolio_valuation_delete_result.data:
                    logger.info(f"Deleted {len(portfolio_valuation_delete_result.data)} portfolio valuation records for date {valuation_date_only}")
                    cascade_deletions.append(f"Deleted {len(portfolio_valuation_delete_result.data)} portfolio valuation records")
                
            except Exception as e:
                logger.warning(f"Failed to delete portfolio valuation records for date {valuation_date_only}: {str(e)}")
        
        # ========================================================================
        # Step 5: Trigger IRR recalculation for remaining data
        # ========================================================================
        try:
            logger.info(f"Triggering sophisticated IRR recalculation after deleting valuation for portfolio fund {portfolio_fund_id}")
            irr_recalc_result = await recalculate_irr_after_activity_change(portfolio_fund_id, db, valuation_date_only)
            logger.info(f"Sophisticated IRR recalculation result: {irr_recalc_result}")
        except Exception as e:
            # Don't fail the valuation deletion if IRR recalculation fails
            logger.error(f"IRR recalculation failed after valuation deletion: {str(e)}")
        
        # ========================================================================
        # Return success with cascade deletion details
        # ========================================================================
        response_message = f"Fund valuation with ID {valuation_id} deleted successfully"
        if cascade_deletions:
            response_message += f". Cascade deletions: {'; '.join(cascade_deletions)}"
        
        return {
            "message": response_message,
            "status": "success",
            "cascade_deletions": cascade_deletions,
            "common_date_broken": not common_date_still_exists,
            "affected_date": valuation_date_only
        }
        
    except Exception as e:
        logger.error(f"Error deleting fund valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/fund_valuations/latest-date")
async def get_latest_valuation_date():
    """
    Get the latest valuation date from all fund valuations.
    
    This is a simplified hardcoded version to unblock the frontend.
    """
    # Simply return today's date to unblock the frontend
    return {"latest_date": datetime.now().strftime("%Y-%m-%d")} 

@router.get("/latest_fund_valuations")
async def get_latest_fund_valuations(
    portfolio_fund_id: Optional[int] = Query(None, description="Filter by portfolio fund ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of records to return"),
    db = Depends(get_db)
):
    """
    Get the latest fund valuations from the latest_portfolio_fund_valuations view.
    """
    try:
        query = db.table("latest_portfolio_fund_valuations").select("*")
        
        if portfolio_fund_id is not None:
            query = query.eq("portfolio_fund_id", portfolio_fund_id)
        
        result = query.execute()
        
        # If we need to filter by portfolio_id, we need to do a join with portfolio_funds
        if portfolio_fund_id is None:
            # Get all portfolio_fund_ids for this portfolio
            portfolio_funds = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_fund_id).execute()
            
            if portfolio_funds.data and len(portfolio_funds.data) > 0:
                # Extract the IDs
                fund_ids = [fund["id"] for fund in portfolio_funds.data]
                
                # Filter the valuations to only include these funds
                result.data = [valuation for valuation in result.data if valuation["portfolio_fund_id"] in fund_ids]
            else:
                # No portfolio funds found for this portfolio
                result.data = []
        
        return result.data
    except Exception as e:
        logger.error(f"Error getting latest fund valuations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")