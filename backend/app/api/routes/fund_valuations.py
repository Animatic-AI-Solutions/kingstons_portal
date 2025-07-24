from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.db.database import get_db
from app.models.fund_valuation import FundValuationCreate, FundValuationUpdate, FundValuation, LatestFundValuationViewItem
import logging

# Import the IRR cascade service for comprehensive IRR management
from app.services.irr_cascade_service import IRRCascadeService
# Import the legacy IRR recalculation function (will be deprecated)
from app.api.routes.holding_activity_logs import recalculate_irr_after_activity_change

router = APIRouter()
logger = logging.getLogger(__name__)

async def should_recalculate_portfolio_irr(portfolio_id: int, valuation_date: str, db) -> bool:
    """
    Check if portfolio IRR should be recalculated for a given date.
    Portfolio IRR should be recalculated whenever there's a common valuation date across all funds.
    
    For active funds: Must have actual valuations on that date.
    For inactive funds: Either have actual valuations on that date, OR the date is after their latest valuation date 
    (in which case they are considered to have £0 valuation).
    
    Args:
        portfolio_id: The portfolio ID to check
        valuation_date: The valuation date in YYYY-MM-DD format
        db: Database connection
    
    Returns:
        True if portfolio IRR should be calculated/recalculated, False otherwise
    """
    try:
        # Get all portfolio funds in this portfolio (active and inactive) with their status
        all_portfolio_funds_result = db.table("portfolio_funds")\
            .select("id, status")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not all_portfolio_funds_result.data:
            return False
        
        # Separate active and inactive funds
        active_funds = [pf["id"] for pf in all_portfolio_funds_result.data if pf.get("status", "active") == "active"]
        inactive_funds = [pf["id"] for pf in all_portfolio_funds_result.data if pf.get("status", "active") != "active"]
        
        # Check if ALL active funds have valuations on this date
        date_start = f"{valuation_date}T00:00:00"
        date_end = f"{valuation_date}T23:59:59"
        
        for fund_id in active_funds:
            fund_valuation_check = db.table("portfolio_fund_valuations")\
                .select("id")\
                .eq("portfolio_fund_id", fund_id)\
                .gte("valuation_date", date_start)\
                .lte("valuation_date", date_end)\
                .execute()
            
            if not fund_valuation_check.data:
                # This active fund doesn't have a valuation on this date, so it's not a common date
                return False
        
        # Check inactive funds - they either need actual valuations or the date is after their latest valuation date
        for fund_id in inactive_funds:
            fund_valuation_check = db.table("portfolio_fund_valuations")\
                .select("id")\
                .eq("portfolio_fund_id", fund_id)\
                .gte("valuation_date", date_start)\
                .lte("valuation_date", date_end)\
                .execute()
            
            if not fund_valuation_check.data:
                # This inactive fund doesn't have a valuation on this date
                # Check if the date is after its latest valuation date
                latest_valuation = db.table("portfolio_fund_valuations")\
                    .select("valuation_date")\
                    .eq("portfolio_fund_id", fund_id)\
                    .order("valuation_date", desc=True)\
                    .limit(1)\
                    .execute()
                
                if latest_valuation.data:
                    latest_date = latest_valuation.data[0]["valuation_date"].split('T')[0]
                    if valuation_date <= latest_date:
                        # The date is not after the latest valuation date, so it's not a common date
                        return False
                else:
                    # No valuations found for this inactive fund, so it's not a common date
                    return False
        
        # All active funds have valuations on this date, and all inactive funds either have valuations 
        # or the date is after their latest valuation date
        logger.info(f"All {len(active_funds)} active funds + {len(inactive_funds)} inactive funds (with £0 after latest date) have valuations on {valuation_date} - portfolio IRR calculation needed")
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
        logger.info(f"🔍 VALUATION ENTRY: ===== FUND VALUATION CREATE ENDPOINT HIT =====")
        logger.info(f"🔍 VALUATION ENTRY: create_fund_valuation called for fund {fund_valuation.portfolio_fund_id}, date {fund_valuation.valuation_date}, value {fund_valuation.valuation}")
        
        # Check if portfolio fund exists
        logger.info(f"🔍 VALUATION ENTRY: Checking if portfolio fund {fund_valuation.portfolio_fund_id} exists...")
        portfolio_fund_result = db.table("portfolio_funds").select("id").eq("id", fund_valuation.portfolio_fund_id).execute()
        if not portfolio_fund_result.data or len(portfolio_fund_result.data) == 0:
            logger.error(f"🔍 VALUATION ENTRY: Portfolio fund {fund_valuation.portfolio_fund_id} not found")
            raise HTTPException(status_code=404, detail="Portfolio fund not found")
        logger.info(f"🔍 VALUATION ENTRY: Portfolio fund {fund_valuation.portfolio_fund_id} exists ✅")
        
        # Handle None values as zeros
        valuation_amount = 0.0
        if fund_valuation.valuation is not None:
            try:
                valuation_amount = float(fund_valuation.valuation)
                logger.info(f"🔍 VALUATION ENTRY: Parsed valuation amount: {valuation_amount}")
            except (ValueError, TypeError):
                logger.error(f"🔍 VALUATION ENTRY: Invalid valuation format: {fund_valuation.valuation}")
                raise HTTPException(status_code=400, detail="Invalid valuation format - must be a number")
        else:
            logger.info(f"🔍 VALUATION ENTRY: Valuation is None, using 0.0")
        
        # Check for duplicate (same portfolio_fund_id and valuation_date)
        logger.info(f"🔍 VALUATION ENTRY: Checking for existing valuation for fund {fund_valuation.portfolio_fund_id} on date {fund_valuation.valuation_date.isoformat()}")
        existing_valuation = db.table("portfolio_fund_valuations") \
            .select("*") \
            .eq("portfolio_fund_id", fund_valuation.portfolio_fund_id) \
            .eq("valuation_date", fund_valuation.valuation_date.isoformat()) \
            .execute()
        
        if existing_valuation.data:
            logger.info(f"🔍 VALUATION ENTRY: ===== EXISTING VALUATION FOUND - TAKING UPDATE PATH =====")
            logger.info(f"🔍 VALUATION ENTRY: Found existing valuation with ID {existing_valuation.data[0]['id']}")
            logger.info(f"🔍 VALUATION ENTRY: Current value: {existing_valuation.data[0]['valuation']}, new value: {valuation_amount}")
            
            # Update existing valuation
            existing_id = existing_valuation.data[0]["id"]
            
            update_result = db.table("portfolio_fund_valuations").update({
                "valuation": valuation_amount
            }).eq("id", existing_id).execute()
            
            if update_result.data:
                logger.info(f"🔍 VALUATION ENTRY (UPDATE): Updated existing fund valuation with ID {existing_id} for fund {fund_valuation.portfolio_fund_id}, date {fund_valuation.valuation_date}, value {fund_valuation.valuation}")
                
                updated_valuation = update_result.data[0]
                
                # ========================================================================
                # ENHANCED: Use comprehensive IRR cascade service for valuation updates
                # ========================================================================
                logger.info(f"📈 [IRR CASCADE INTEGRATION] Triggering IRR calculation for existing valuation update")
                
                try:
                    # Get the valuation date for IRR recalculation
                    valuation_date = fund_valuation.valuation_date.isoformat().split('T')[0]
                    
                    logger.info(f"📈 [IRR CASCADE] Using cascade service for fund {fund_valuation.portfolio_fund_id}, date {valuation_date}")
                    
                    # Use the comprehensive cascade service for IRR calculation
                    irr_service = IRRCascadeService(db)
                    irr_result = await irr_service.handle_fund_valuation_creation_edit(
                        fund_valuation.portfolio_fund_id, valuation_date
                    )
                    
                    if irr_result.get("success"):
                        logger.info(f"📈 [IRR CASCADE] ✅ IRR calculation completed: {irr_result}")
                    else:
                        logger.warning(f"📈 [IRR CASCADE] ⚠️ IRR calculation had issues: {irr_result}")
                        
                except Exception as e:
                    # Don't fail the valuation update if IRR calculation fails
                    logger.error(f"📈 [IRR CASCADE] ❌ IRR calculation failed for existing valuation update: {str(e)}")
                # ========================================================================
                
                logger.info(f"🔍 VALUATION EXIT (UPDATE): ===== UPDATE PATH COMPLETE =====")
                logger.info(f"🔍 VALUATION EXIT (UPDATE): Updated valuation data: {updated_valuation}")
                return updated_valuation
            else:
                logger.error(f"🔍 VALUATION ENTRY (UPDATE): Failed to update existing fund valuation")
                raise HTTPException(status_code=500, detail="Failed to update existing fund valuation")
        
        # Create new valuation
        logger.info(f"🔍 VALUATION ENTRY: ===== NO EXISTING VALUATION FOUND - TAKING CREATE PATH =====")
        logger.info(f"🔍 VALUATION ENTRY: Creating new valuation for fund {fund_valuation.portfolio_fund_id}, date {fund_valuation.valuation_date.isoformat()}, value {valuation_amount}")
        
        fund_valuation_data = {
            "portfolio_fund_id": fund_valuation.portfolio_fund_id,
            "valuation_date": fund_valuation.valuation_date.isoformat(),
            "valuation": valuation_amount
        }
        
        logger.info(f"🔍 VALUATION ENTRY: Fund valuation data to insert: {fund_valuation_data}")
        result = db.table("portfolio_fund_valuations").insert(fund_valuation_data).execute()
        
        if not result.data or len(result.data) == 0:
            logger.error(f"🔍 VALUATION ENTRY: Failed to create fund valuation - no data returned")
            raise HTTPException(status_code=500, detail="Failed to create fund valuation")
            
        created_valuation = result.data[0]
        logger.info(f"🔍 VALUATION ENTRY: Successfully created fund valuation with ID {created_valuation.get('id')}")
        
        # ========================================================================
        # ENHANCED: Use comprehensive IRR cascade service for new valuation creation
        # ========================================================================
        logger.info(f"📈 [IRR CASCADE INTEGRATION] Triggering IRR calculation for new valuation creation")
        
        try:
            # Get the valuation date for IRR calculation
            valuation_date = fund_valuation.valuation_date.isoformat().split('T')[0]
            
            logger.info(f"📈 [IRR CASCADE] Using cascade service for fund {fund_valuation.portfolio_fund_id}, date {valuation_date}")
            
            # Use the comprehensive cascade service for IRR calculation
            irr_service = IRRCascadeService(db)
            irr_result = await irr_service.handle_fund_valuation_creation_edit(
                fund_valuation.portfolio_fund_id, valuation_date
            )
            
            if irr_result.get("success"):
                logger.info(f"📈 [IRR CASCADE] ✅ IRR calculation completed: {irr_result}")
            else:
                logger.warning(f"📈 [IRR CASCADE] ⚠️ IRR calculation had issues: {irr_result}")
                
        except Exception as e:
            # Don't fail the valuation creation if IRR calculation fails
            logger.error(f"📈 [IRR CASCADE] ❌ IRR calculation failed for new valuation creation: {str(e)}")
        # ========================================================================
            
        logger.info(f"🔍 VALUATION EXIT: ===== CREATE PATH COMPLETE =====")
        logger.info(f"🔍 VALUATION EXIT: create_fund_valuation completed successfully for fund {fund_valuation.portfolio_fund_id}")
        logger.info(f"🔍 VALUATION EXIT: Final created_valuation data: {created_valuation}")
        return created_valuation
    except HTTPException:
        logger.error(f"🔍 VALUATION EXIT: HTTPException raised in create_fund_valuation")
        raise
    except Exception as e:
        logger.error(f"🔍 VALUATION EXIT: Unexpected exception in create_fund_valuation: {str(e)}")
        logger.error(f"🔍 VALUATION EXIT: Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"🔍 VALUATION EXIT: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

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
            logger.info(f"🗑️ [IRR CASCADE INTEGRATION] Deleting fund valuation {valuation_id} due to empty value")
            
            # ========================================================================
            # ENHANCED: Use comprehensive IRR cascade service for deletion
            # ========================================================================
            try:
                irr_service = IRRCascadeService(db)
                
                # Use the comprehensive cascade deletion
                cascade_result = await irr_service.handle_fund_valuation_deletion(valuation_id)
                
                if not cascade_result.get("success"):
                    error_msg = cascade_result.get("error", "Unknown cascade deletion error")
                    logger.error(f"🗑️ [IRR CASCADE] Cascade deletion failed: {error_msg}")
                    raise HTTPException(status_code=500, detail=f"IRR cascade deletion failed: {error_msg}")
                
                logger.info(f"🗑️ [IRR CASCADE] ✅ Deletion cascade completed successfully: {cascade_result}")
                
                # Return the deleted record information
                return {
                    "message": f"Fund valuation {valuation_id} deleted successfully with IRR cascade",
                    "valuation_deleted": cascade_result.get("valuation_deleted", False),
                    "fund_irr_deleted": cascade_result.get("fund_irr_deleted", False), 
                    "portfolio_irr_deleted": cascade_result.get("portfolio_irr_deleted", False),
                    "portfolio_valuation_deleted": cascade_result.get("portfolio_valuation_deleted", False),
                    "completeness_maintained": cascade_result.get("completeness_maintained", False)
                }
                
            except HTTPException:
                raise  # Re-raise HTTP exceptions as-is
            except Exception as e:
                logger.error(f"🗑️ [IRR CASCADE] ❌ Unexpected error in cascade deletion: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Unexpected error during cascade deletion: {str(e)}")
            # ========================================================================
            
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
        # ENHANCED: Use comprehensive IRR cascade service for valuation updates
        # ========================================================================
        try:
            # Get portfolio_fund_id from the updated record or existing record
            portfolio_fund_id = updated_valuation.get("portfolio_fund_id") or existing_result.data[0]["portfolio_fund_id"]
            
            # Get the valuation date (use updated date if provided, otherwise existing)
            valuation_date = updated_valuation.get("valuation_date") or existing_result.data[0]["valuation_date"]
            if isinstance(valuation_date, str):
                valuation_date = valuation_date.split('T')[0]
            
            logger.info(f"📈 [IRR CASCADE INTEGRATION] Triggering IRR calculation for fund {portfolio_fund_id}, date {valuation_date}")
            
            # Use the comprehensive cascade service for IRR calculation
            irr_service = IRRCascadeService(db)
            irr_result = await irr_service.handle_fund_valuation_creation_edit(
                portfolio_fund_id, valuation_date
            )
            
            if irr_result.get("success"):
                logger.info(f"📈 [IRR CASCADE] ✅ IRR calculation completed: {irr_result}")
            else:
                logger.warning(f"📈 [IRR CASCADE] ⚠️ IRR calculation had issues: {irr_result}")
                    
        except Exception as e:
            # Don't fail the valuation update if IRR update fails
            logger.error(f"📈 [IRR CASCADE] ❌ IRR calculation failed after valuation update: {str(e)}")
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
    Delete a fund valuation with comprehensive IRR cascade deletion logic.
    
    Uses the IRR cascade service to handle:
    1. Deleting the fund-level IRR that was based on that valuation
    2. Checking if this deletion breaks common valuation dates across the portfolio
    3. If so, deleting the portfolio-level IRR and valuation for that date
    4. Deleting the original fund valuation
    """
    try:
        logger.info(f"🗑️ [IRR CASCADE INTEGRATION] Attempting to delete fund valuation with ID: {valuation_id}")
        
        # Check if fund valuation exists
        existing_result = db.table("portfolio_fund_valuations").select("*").eq("id", valuation_id).execute()
        
        if not existing_result.data or len(existing_result.data) == 0:
            logger.warning(f"🗑️ [IRR CASCADE] Fund valuation with ID {valuation_id} not found, but treating as success")
            return {"message": f"Fund valuation with ID {valuation_id} doesn't exist", "status": "success"}
        
        # ========================================================================
        # ENHANCED: Use comprehensive IRR cascade service for deletion
        # ========================================================================
        try:
            irr_service = IRRCascadeService(db)
            
            # Use the comprehensive cascade deletion
            cascade_result = await irr_service.handle_fund_valuation_deletion(valuation_id)
            
            if not cascade_result.get("success"):
                error_msg = cascade_result.get("error", "Unknown cascade deletion error")
                logger.error(f"🗑️ [IRR CASCADE] Cascade deletion failed: {error_msg}")
                raise HTTPException(status_code=500, detail=f"IRR cascade deletion failed: {error_msg}")
            
            logger.info(f"🗑️ [IRR CASCADE] ✅ Deletion cascade completed successfully: {cascade_result}")
            
            # Format cascade deletion details for response
            cascade_details = []
            if cascade_result.get("fund_irr_deleted"):
                cascade_details.append("Fund IRR deleted")
            if cascade_result.get("portfolio_irr_deleted"):
                cascade_details.append("Portfolio IRR deleted") 
            if cascade_result.get("portfolio_valuation_deleted"):
                cascade_details.append("Portfolio valuation deleted")
            
            response_message = f"Fund valuation with ID {valuation_id} deleted successfully with IRR cascade"
            if cascade_details:
                response_message += f". Cascade actions: {'; '.join(cascade_details)}"
            
            return {
                "message": response_message,
                "status": "success",
                "valuation_deleted": cascade_result.get("valuation_deleted", False),
                "fund_irr_deleted": cascade_result.get("fund_irr_deleted", False),
                "portfolio_irr_deleted": cascade_result.get("portfolio_irr_deleted", False),
                "portfolio_valuation_deleted": cascade_result.get("portfolio_valuation_deleted", False),
                "completeness_maintained": cascade_result.get("completeness_maintained", False),
                "affected_date": cascade_result.get("date"),
                "cascade_details": cascade_details
            }
            
        except HTTPException:
            raise  # Re-raise HTTP exceptions as-is
        except Exception as e:
            logger.error(f"🗑️ [IRR CASCADE] ❌ Unexpected error in cascade deletion: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Unexpected error during cascade deletion: {str(e)}")
        # ========================================================================
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🗑️ [IRR CASCADE] Error deleting fund valuation: {str(e)}")
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