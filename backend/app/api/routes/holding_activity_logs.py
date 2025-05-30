from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from datetime import datetime, date
from decimal import Decimal

from app.models.holding_activity_log import HoldingActivityLog, HoldingActivityLogCreate, HoldingActivityLogUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        
        return result.data[0]
        
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
        
        return result.data[0]
        
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
        
        # Delete the activity log
        db.table("holding_activity_log").delete().eq("id", holding_activity_log_id).execute()
        
        logger.info(f"Successfully deleted activity log with ID: {holding_activity_log_id}")
        
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
