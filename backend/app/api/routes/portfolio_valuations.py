from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from datetime import datetime, date

from app.models.portfolio_valuation import (
    PortfolioValuation, PortfolioValuationCreate, PortfolioValuationUpdate,
    LatestPortfolioValuation
)
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/portfolio_valuations", response_model=List[PortfolioValuation])
async def get_portfolio_valuations(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    portfolio_id: Optional[int] = Query(None, description="Filter by portfolio ID"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves portfolio valuations with optional filtering.
    Why it's needed: Provides access to historical portfolio valuation data.
    """
    try:
        query = db.table("portfolio_valuations").select("*")
        
        if portfolio_id is not None:
            query = query.eq("portfolio_id", portfolio_id)
        
        # Order by portfolio_id and valuation_date descending
        query = query.order("portfolio_id").order("valuation_date", ascending=False)
        
        result = query.range(skip, skip + limit - 1).execute()
        return result.data
        
    except Exception as e:
        logger.error(f"Error fetching portfolio valuations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/latest_portfolio_valuations", response_model=List[LatestPortfolioValuation])
async def get_latest_portfolio_valuations(
    portfolio_id: Optional[int] = Query(None, description="Filter by portfolio ID"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves the latest portfolio valuations using the optimized view.
    Why it's needed: Provides fast access to current portfolio values without expensive calculations.
    """
    try:
        query = db.table("latest_portfolio_valuations").select("*")
        
        if portfolio_id is not None:
            query = query.eq("portfolio_id", portfolio_id)
        
        result = query.execute()
        return result.data
        
    except Exception as e:
        logger.error(f"Error fetching latest portfolio valuations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolio_valuations", response_model=PortfolioValuation)
async def create_portfolio_valuation(valuation: PortfolioValuationCreate, db = Depends(get_db)):
    """
    What it does: Creates a new portfolio valuation record.
    Why it's needed: Allows storing calculated portfolio values for performance optimization.
    """
    try:
        # Verify portfolio exists
        portfolio_check = db.table("portfolios").select("id").eq("id", valuation.portfolio_id).execute()
        if not portfolio_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {valuation.portfolio_id} not found")
        
        # Prepare data for insertion
        data_dict = valuation.model_dump()
        
        # Handle datetime serialization
        if isinstance(data_dict['valuation_date'], datetime):
            data_dict['valuation_date'] = data_dict['valuation_date'].isoformat()
        
        result = db.table("portfolio_valuations").insert(data_dict).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to create portfolio valuation")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating portfolio valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolio_valuations/{valuation_id}", response_model=PortfolioValuation)
async def get_portfolio_valuation(valuation_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a specific portfolio valuation by ID.
    """
    try:
        result = db.table("portfolio_valuations").select("*").eq("id", valuation_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail=f"Portfolio valuation with ID {valuation_id} not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching portfolio valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/portfolio_valuations/{valuation_id}", response_model=PortfolioValuation)
async def update_portfolio_valuation(
    valuation_id: int, 
    valuation_update: PortfolioValuationUpdate, 
    db = Depends(get_db)
):
    """
    What it does: Updates an existing portfolio valuation.
    """
    try:
        # Check if valuation exists
        check_result = db.table("portfolio_valuations").select("id").eq("id", valuation_id).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail=f"Portfolio valuation with ID {valuation_id} not found")
        
        # Prepare update data
        update_data = {k: v for k, v in valuation_update.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid update data provided")
        
        # Handle datetime serialization
        if 'valuation_date' in update_data and isinstance(update_data['valuation_date'], datetime):
            update_data['valuation_date'] = update_data['valuation_date'].isoformat()
        
        result = db.table("portfolio_valuations").update(update_data).eq("id", valuation_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to update portfolio valuation")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating portfolio valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/portfolio_valuations/{valuation_id}", response_model=dict)
async def delete_portfolio_valuation(valuation_id: int, db = Depends(get_db)):
    """
    What it does: Deletes a portfolio valuation record.
    """
    try:
        # Check if valuation exists
        check_result = db.table("portfolio_valuations").select("id").eq("id", valuation_id).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail=f"Portfolio valuation with ID {valuation_id} not found")
        
        result = db.table("portfolio_valuations").delete().eq("id", valuation_id).execute()
        
        return {"message": f"Portfolio valuation {valuation_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting portfolio valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/valuations", response_model=List[PortfolioValuation])
async def get_portfolio_valuations_by_portfolio(
    portfolio_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db = Depends(get_db)
):
    """
    What it does: Retrieves all valuations for a specific portfolio.
    """
    try:
        # Verify portfolio exists
        portfolio_check = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not portfolio_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        result = db.table("portfolio_valuations")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .order("valuation_date", ascending=False)\
            .range(skip, skip + limit - 1)\
            .execute()
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching portfolio valuations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/latest_valuation", response_model=LatestPortfolioValuation)
async def get_latest_portfolio_valuation(portfolio_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves the latest valuation for a specific portfolio.
    """
    try:
        result = db.table("latest_portfolio_valuations")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail=f"No valuations found for portfolio {portfolio_id}")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest portfolio valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolios/{portfolio_id}/calculate_valuation", response_model=PortfolioValuation)
async def calculate_and_store_portfolio_valuation(
    portfolio_id: int, 
    valuation_date: Optional[str] = Query(None, description="Date for valuation (YYYY-MM-DD), defaults to today"),
    db = Depends(get_db)
):
    """
    What it does: Calculates the total portfolio value by summing all fund valuations and stores it.
    Why it's needed: Creates portfolio-level valuations for IRR calculations and performance tracking.
    How it works:
        1. Gets all active funds in the portfolio
        2. Fetches the latest fund valuations for each fund (or for a specific date)
        3. Sums all fund values to get the total portfolio value
        4. Stores the portfolio valuation in the database
    """
    try:
        # Verify portfolio exists
        portfolio_check = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not portfolio_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        # Set valuation date to today if not provided
        if not valuation_date:
            valuation_date = datetime.now().date().isoformat()
        
        # Parse the valuation date
        try:
            target_date = datetime.fromisoformat(valuation_date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Get all active portfolio funds
        portfolio_funds_result = db.table("portfolio_funds")\
            .select("id, available_funds_id")\
            .eq("portfolio_id", portfolio_id)\
            .eq("status", "active")\
            .execute()
        
        if not portfolio_funds_result.data:
            logger.warning(f"No active funds found for portfolio {portfolio_id}")
            # Create a zero valuation if no funds
            portfolio_valuation = PortfolioValuationCreate(
                portfolio_id=portfolio_id,
                valuation_date=datetime.combine(target_date, datetime.min.time()),
                value=0.0
            )
        else:
            portfolio_fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
            
            # Get fund valuations for the target date (or closest date before)
            total_value = 0.0
            fund_values_found = 0
            
            for pf_id in portfolio_fund_ids:
                # Get the closest valuation on or before the target date
                valuation_result = db.table("portfolio_fund_valuations")\
                    .select("value")\
                    .eq("portfolio_fund_id", pf_id)\
                    .lte("valuation_date", target_date.isoformat())\
                    .order("valuation_date", ascending=False)\
                    .limit(1)\
                    .execute()
                
                if valuation_result.data:
                    total_value += float(valuation_result.data[0]["value"])
                    fund_values_found += 1
                else:
                    logger.warning(f"No valuation found for portfolio fund {pf_id} on or before {target_date}")
            
            logger.info(f"Calculated portfolio valuation: {total_value} from {fund_values_found} funds")
            
            # Create portfolio valuation
            portfolio_valuation = PortfolioValuationCreate(
                portfolio_id=portfolio_id,
                valuation_date=datetime.combine(target_date, datetime.min.time()),
                value=total_value
            )
        
        # Store the portfolio valuation
        data_dict = portfolio_valuation.model_dump()
        data_dict['valuation_date'] = data_dict['valuation_date'].isoformat()
        
        # Check if a valuation already exists for this date
        existing_result = db.table("portfolio_valuations")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .eq("valuation_date", data_dict['valuation_date'])\
            .execute()
        
        if existing_result.data:
            # Update existing valuation
            update_result = db.table("portfolio_valuations")\
                .update({"value": data_dict['value']})\
                .eq("id", existing_result.data[0]["id"])\
                .execute()
            
            if update_result.data and len(update_result.data) > 0:
                logger.info(f"Updated existing portfolio valuation for {portfolio_id} on {valuation_date}")
                return update_result.data[0]
        else:
            # Create new valuation
            result = db.table("portfolio_valuations").insert(data_dict).execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"Created new portfolio valuation for {portfolio_id} on {valuation_date}")
                return result.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to create or update portfolio valuation")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating portfolio valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/current_value", response_model=dict)
async def get_current_portfolio_value(portfolio_id: int, db = Depends(get_db)):
    """
    What it does: Calculates the current portfolio value without storing it.
    Why it's needed: Provides real-time portfolio value for quick checks.
    """
    try:
        # Verify portfolio exists
        portfolio_check = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not portfolio_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        # Get all active portfolio funds
        portfolio_funds_result = db.table("portfolio_funds")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .eq("status", "active")\
            .execute()
        
        if not portfolio_funds_result.data:
            return {
                "portfolio_id": portfolio_id,
                "current_value": 0.0,
                "fund_count": 0,
                "calculation_date": datetime.now().isoformat()
            }
        
        portfolio_fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
        
        # Get latest valuations using the optimized view
        latest_valuations_result = db.table("latest_portfolio_fund_valuations")\
            .select("portfolio_fund_id, value")\
            .in_("portfolio_fund_id", portfolio_fund_ids)\
            .execute()
        
        total_value = sum(float(fv["value"]) for fv in latest_valuations_result.data)
        
        return {
            "portfolio_id": portfolio_id,
            "current_value": total_value,
            "fund_count": len(latest_valuations_result.data),
            "calculation_date": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating current portfolio value: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") 