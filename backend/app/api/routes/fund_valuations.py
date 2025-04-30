from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.db.database import get_db
from app.models.fund_valuation import FundValuationCreate, FundValuationUpdate, FundValuation
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/fund_valuations", response_model=FundValuation)
async def create_fund_valuation(
    fund_valuation: FundValuationCreate,
    db = Depends(get_db)
):
    """
    Create a new fund valuation.
    If the valuation value is zero or None, any existing valuation for the same fund and date will be deleted.
    """
    try:
        # Check if portfolio fund exists
        portfolio_fund_result = db.table("portfolio_funds").select("id").eq("id", fund_valuation.portfolio_fund_id).execute()
        if not portfolio_fund_result.data or len(portfolio_fund_result.data) == 0:
            raise HTTPException(status_code=404, detail="Portfolio fund not found")
        
        # Handle None values as zeros
        value = 0.0
        if fund_valuation.value is not None:
            try:
                value = float(fund_valuation.value)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Invalid value format - must be a number")
        
        # Check for zero value
        if value == 0 or value == 0.0:
            # Check if valuation exists for this date
            existing_valuation = db.table("fund_valuations") \
                .select("*") \
                .eq("portfolio_fund_id", fund_valuation.portfolio_fund_id) \
                .eq("valuation_date", fund_valuation.valuation_date.isoformat()) \
                .execute()
            
            # If there's an existing valuation, delete it
            if existing_valuation.data and len(existing_valuation.data) > 0:
                valuation_id = existing_valuation.data[0]["id"]
                logger.info(f"Deleting existing valuation with ID {valuation_id} because new value is zero")
                
                delete_result = db.table("fund_valuations").delete().eq("id", valuation_id).execute()
                
                # Create a response with the deleted valuation info
                deleted_data = existing_valuation.data[0]
                deleted_data["_deleted"] = True
                deleted_data["message"] = "Valuation was deleted because value was zero"
                return deleted_data
            
            # No existing valuation to delete, return a placeholder response
            return {
                "id": None,
                "portfolio_fund_id": fund_valuation.portfolio_fund_id,
                "valuation_date": fund_valuation.valuation_date.isoformat(),
                "value": 0,
                "_deleted": True,
                "message": "No valuation created because value was zero"
            }
        
        # Check for duplicate (same portfolio_fund_id and valuation_date)
        existing_valuation = db.table("fund_valuations") \
            .select("*") \
            .eq("portfolio_fund_id", fund_valuation.portfolio_fund_id) \
            .eq("valuation_date", fund_valuation.valuation_date.isoformat()) \
            .execute()
        
        if existing_valuation.data and len(existing_valuation.data) > 0:
            # Update the existing valuation instead of creating a new one
            valuation_id = existing_valuation.data[0]["id"]
            logger.info(f"Found existing valuation with ID {valuation_id}, updating instead of creating new one")
            
            update_result = db.table("fund_valuations") \
                .update({"value": value, "updated_at": datetime.now().isoformat()}) \
                .eq("id", valuation_id) \
                .execute()
            
            if not update_result.data or len(update_result.data) == 0:
                raise HTTPException(status_code=500, detail="Failed to update fund valuation")
            
            return update_result.data[0]
        
        # Create new fund valuation
        now = datetime.now().isoformat()
        fund_valuation_data = {
            "portfolio_fund_id": fund_valuation.portfolio_fund_id,
            "valuation_date": fund_valuation.valuation_date.isoformat(),
            "value": value,
            "created_at": now
        }
        
        logger.info(f"Creating new valuation for fund {fund_valuation.portfolio_fund_id} with value {value}")
        result = db.table("fund_valuations").insert(fund_valuation_data).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create fund valuation")
            
        return result.data[0]
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
        query = db.table("fund_valuations").select("*")
        
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
        result = db.table("fund_valuations") \
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
        result = db.table("fund_valuations") \
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
        result = db.table("fund_valuations").select("*").eq("id", valuation_id).execute()
        
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
    If the valuation value is set to zero or empty (None), the valuation record will be deleted.
    If the valuation doesn't exist and the value is zero, we treat this as success (nothing to do).
    """
    try:
        # Check if fund valuation exists
        existing_result = db.table("fund_valuations").select("*").eq("id", valuation_id).execute()
        
        # Handle case where valuation doesn't exist
        if not existing_result.data or len(existing_result.data) == 0:
            # If the value is zero or None, just return success (nothing to do)
            if fund_valuation.value is not None and (fund_valuation.value == 0 or fund_valuation.value == 0.0):
                logger.info(f"Valuation with ID {valuation_id} not found, but value is zero, so nothing to do")
                return {
                    "id": valuation_id,
                    "value": 0,
                    "_deleted": True,
                    "message": "No action needed - valuation doesn't exist and value is zero"
                }
            else:
                # For non-zero values, still return 404 since we can't update something that doesn't exist
                raise HTTPException(status_code=404, detail="Fund valuation not found")
        
        # Check if we should delete the valuation (value is zero or None)
        if fund_valuation.value is not None and (fund_valuation.value == 0 or fund_valuation.value == 0.0):
            logger.info(f"Deleting valuation with ID {valuation_id} because value is zero")
            
            # Delete the valuation
            delete_result = db.table("fund_valuations").delete().eq("id", valuation_id).execute()
            
            if not delete_result or not hasattr(delete_result, 'data') or not delete_result.data:
                raise HTTPException(status_code=500, detail="Failed to delete fund valuation")
                
            # Return the last known data with a special flag indicating it was deleted
            deleted_data = existing_result.data[0]
            deleted_data["_deleted"] = True
            deleted_data["message"] = "Valuation was deleted because value was zero"
            return deleted_data
        
        # Prepare update data (only include fields that are provided)
        update_data = {
            "updated_at": datetime.now().isoformat()  # Always set updated_at
        }
        
        if fund_valuation.portfolio_fund_id is not None:
            # Verify that portfolio fund exists
            portfolio_fund_result = db.table("portfolio_funds").select("id").eq("id", fund_valuation.portfolio_fund_id).execute()
            if not portfolio_fund_result.data or len(portfolio_fund_result.data) == 0:
                raise HTTPException(status_code=404, detail="Portfolio fund not found")
            
            update_data["portfolio_fund_id"] = fund_valuation.portfolio_fund_id
        
        if fund_valuation.valuation_date is not None:
            update_data["valuation_date"] = fund_valuation.valuation_date.isoformat()
        
        if fund_valuation.value is not None:
            update_data["value"] = float(fund_valuation.value)
        
        if len(update_data) == 1 and "updated_at" in update_data:
            # No actual updates provided, return existing data
            return existing_result.data[0]
        
        # Update the fund valuation
        result = db.table("fund_valuations").update(update_data).eq("id", valuation_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to update fund valuation")
            
        return result.data[0]
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
    Delete a fund valuation.
    If the valuation doesn't exist, we consider this a success since the end goal
    (having no valuation with that ID) is already achieved.
    """
    try:
        logger.info(f"Attempting to delete fund valuation with ID: {valuation_id}")
        
        # Check if fund valuation exists
        existing_result = db.table("fund_valuations").select("*").eq("id", valuation_id).execute()
        
        if not existing_result.data or len(existing_result.data) == 0:
            logger.warning(f"Fund valuation with ID {valuation_id} not found, but treating as success")
            return {"message": f"Fund valuation with ID {valuation_id} doesn't exist", "status": "success"}
        
        # Delete the fund valuation
        result = db.table("fund_valuations").delete().eq("id", valuation_id).execute()
        
        if not result or not hasattr(result, 'data') or not result.data:
            logger.error(f"Failed to delete fund valuation with ID {valuation_id}")
            raise HTTPException(status_code=500, detail="Failed to delete fund valuation")
            
        logger.info(f"Successfully deleted fund valuation with ID {valuation_id}")
        return {"message": f"Fund valuation with ID {valuation_id} deleted successfully", "status": "success"}
    except Exception as e:
        logger.error(f"Error deleting fund valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") 