from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from datetime import datetime, date

from app.models.portfolio_irr_value import (
    PortfolioIRRValue, PortfolioIRRValueCreate, PortfolioIRRValueUpdate,
    LatestPortfolioIRRValue, PortfolioValueIRRSummary
)
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/portfolio_irr_values", response_model=List[PortfolioIRRValue])
async def get_portfolio_irr_values(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    portfolio_id: Optional[int] = Query(None, description="Filter by portfolio ID"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves portfolio IRR values with optional filtering.
    Why it's needed: Provides access to historical portfolio IRR calculations.
    """
    try:
        query = db.table("portfolio_irr_values").select("*")
        
        if portfolio_id is not None:
            query = query.eq("portfolio_id", portfolio_id)
        
        # Order by portfolio_id and calculation_date descending
        query = query.order("portfolio_id").order("calculation_date", ascending=False)
        
        result = query.range(skip, skip + limit - 1).execute()
        return result.data
        
    except Exception as e:
        logger.error(f"Error fetching portfolio IRR values: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/latest_portfolio_irr_values", response_model=List[LatestPortfolioIRRValue])
async def get_latest_portfolio_irr_values(
    portfolio_id: Optional[int] = Query(None, description="Filter by portfolio ID"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves the latest portfolio IRR values using the optimized view.
    Why it's needed: Provides fast access to current portfolio IRR without expensive calculations.
    """
    try:
        query = db.table("latest_portfolio_irr_values").select("*")
        
        if portfolio_id is not None:
            query = query.eq("portfolio_id", portfolio_id)
        
        result = query.execute()
        return result.data
        
    except Exception as e:
        logger.error(f"Error fetching latest portfolio IRR values: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolio_value_irr_summary", response_model=List[PortfolioValueIRRSummary])
async def get_portfolio_value_irr_summary(
    portfolio_id: Optional[int] = Query(None, description="Filter by portfolio ID"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves the comprehensive portfolio value and IRR summary using the optimized view.
    Why it's needed: Provides a complete portfolio performance overview with minimal database overhead.
    """
    try:
        query = db.table("portfolio_value_irr_summary").select("*")
        
        if portfolio_id is not None:
            query = query.eq("portfolio_id", portfolio_id)
        
        result = query.execute()
        return result.data
        
    except Exception as e:
        logger.error(f"Error fetching portfolio value IRR summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolio_irr_values", response_model=PortfolioIRRValue)
async def create_portfolio_irr_value(irr_value: PortfolioIRRValueCreate, db = Depends(get_db)):
    """
    What it does: Creates a new portfolio IRR value record.
    Why it's needed: Allows storing calculated portfolio IRR for performance optimization.
    """
    try:
        # Verify portfolio exists
        portfolio_check = db.table("portfolios").select("id").eq("id", irr_value.portfolio_id).execute()
        if not portfolio_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {irr_value.portfolio_id} not found")
        
        # Verify portfolio_valuation_id exists if provided
        if irr_value.portfolio_valuation_id:
            valuation_check = db.table("portfolio_valuations").select("id").eq("id", irr_value.portfolio_valuation_id).execute()
            if not valuation_check.data:
                raise HTTPException(status_code=404, detail=f"Portfolio valuation with ID {irr_value.portfolio_valuation_id} not found")
        
        # Prepare data for insertion
        data_dict = irr_value.model_dump()
        
        # Handle datetime serialization
        if isinstance(data_dict['calculation_date'], datetime):
            data_dict['calculation_date'] = data_dict['calculation_date'].isoformat()
        
        result = db.table("portfolio_irr_values").insert(data_dict).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to create portfolio IRR value")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating portfolio IRR value: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolios/{portfolio_id}/calculate_irr_with_valuation", response_model=dict)
async def calculate_irr_with_valuation(
    portfolio_id: int,
    irr_result: float,
    calculation_date: Optional[str] = Query(None, description="Date for calculation (YYYY-MM-DD), defaults to today"),
    calculation_method: str = Query("standard", description="IRR calculation method"),
    db = Depends(get_db)
):
    """
    What it does: Calculates portfolio valuation and stores both valuation and IRR together.
    Why it's needed: Ensures portfolio valuations and IRR values are properly linked and consistent.
    How it works:
        1. Calculates the portfolio valuation by summing fund values
        2. Stores the portfolio valuation
        3. Creates the IRR value record linked to the valuation
        4. Returns both records
    """
    try:
        # Verify portfolio exists
        portfolio_check = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not portfolio_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        # Set calculation date to today if not provided
        if not calculation_date:
            calculation_date = datetime.now().date().isoformat()
        
        # Parse the calculation date
        try:
            target_date = datetime.fromisoformat(calculation_date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Step 1: Calculate and store portfolio valuation
        # Get all active portfolio funds
        portfolio_funds_result = db.table("portfolio_funds")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .eq("status", "active")\
            .execute()
        
        total_value = 0.0
        if portfolio_funds_result.data:
            portfolio_fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
            
            # Get fund valuations for the target date (or closest date before)
            for pf_id in portfolio_fund_ids:
                valuation_result = db.table("portfolio_fund_valuations")\
                    .select("valuation")\
                    .eq("portfolio_fund_id", pf_id)\
                    .lte("valuation_date", target_date.isoformat())\
                    .order("valuation_date", ascending=False)\
                    .limit(1)\
                    .execute()
                
                if valuation_result.data:
                    total_value += float(valuation_result.data[0]["valuation"])
        
        # Create portfolio valuation data
        valuation_data = {
            "portfolio_id": portfolio_id,
            "valuation_date": datetime.combine(target_date, datetime.min.time()).isoformat(),
            "value": total_value
        }
        
        # Check if valuation already exists for this date
        existing_valuation = db.table("portfolio_valuations")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .eq("valuation_date", valuation_data['valuation_date'])\
            .execute()
        
        if existing_valuation.data:
            # Update existing valuation
            valuation_result = db.table("portfolio_valuations")\
                .update({"value": valuation_data['value']})\
                .eq("id", existing_valuation.data[0]["id"])\
                .execute()
            portfolio_valuation_id = existing_valuation.data[0]["id"]
        else:
            # Create new valuation
            valuation_result = db.table("portfolio_valuations").insert(valuation_data).execute()
            if not valuation_result.data:
                raise HTTPException(status_code=500, detail="Failed to create portfolio valuation")
            portfolio_valuation_id = valuation_result.data[0]["id"]
        
        # Step 2: Create IRR value linked to the valuation
        irr_data = {
            "portfolio_id": portfolio_id,
            "irr_result": irr_result,
            "calculation_date": datetime.combine(target_date, datetime.min.time()).isoformat(),
            "portfolio_valuation_id": portfolio_valuation_id,
            "calculation_method": calculation_method
        }
        
        # Check if IRR value already exists for this date
        existing_irr = db.table("portfolio_irr_values")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .eq("calculation_date", irr_data['calculation_date'])\
            .execute()
        
        if existing_irr.data:
            # Update existing IRR value
            irr_result_db = db.table("portfolio_irr_values")\
                .update({
                    "irr_result": irr_data['irr_result'],
                    "portfolio_valuation_id": portfolio_valuation_id,
                    "calculation_method": calculation_method
                })\
                .eq("id", existing_irr.data[0]["id"])\
                .execute()
        else:
            # Create new IRR value
            irr_result_db = db.table("portfolio_irr_values").insert(irr_data).execute()
        
        if not irr_result_db.data:
            raise HTTPException(status_code=500, detail="Failed to create portfolio IRR value")
        
        return {
            "message": "Portfolio valuation and IRR calculated successfully",
            "portfolio_id": portfolio_id,
            "valuation": valuation_result.data[0] if valuation_result.data else None,
            "irr_value": irr_result_db.data[0],
            "calculation_date": calculation_date,
            "total_portfolio_value": total_value,
            "irr_result": irr_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating IRR with valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolio_irr_values/{irr_value_id}", response_model=PortfolioIRRValue)
async def get_portfolio_irr_value(irr_value_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a specific portfolio IRR value by ID.
    """
    try:
        result = db.table("portfolio_irr_values").select("*").eq("id", irr_value_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail=f"Portfolio IRR value with ID {irr_value_id} not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching portfolio IRR value: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/portfolio_irr_values/{irr_value_id}", response_model=PortfolioIRRValue)
async def update_portfolio_irr_value(
    irr_value_id: int, 
    irr_value_update: PortfolioIRRValueUpdate, 
    db = Depends(get_db)
):
    """
    What it does: Updates an existing portfolio IRR value.
    """
    try:
        # Check if IRR value exists
        check_result = db.table("portfolio_irr_values").select("id").eq("id", irr_value_id).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail=f"Portfolio IRR value with ID {irr_value_id} not found")
        
        # Prepare update data
        update_data = {k: v for k, v in irr_value_update.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid update data provided")
        
        # Handle datetime serialization
        if 'calculation_date' in update_data and isinstance(update_data['calculation_date'], datetime):
            update_data['calculation_date'] = update_data['calculation_date'].isoformat()
        
        # Verify portfolio_valuation_id exists if being updated
        if 'portfolio_valuation_id' in update_data and update_data['portfolio_valuation_id']:
            valuation_check = db.table("portfolio_valuations").select("id").eq("id", update_data['portfolio_valuation_id']).execute()
            if not valuation_check.data:
                raise HTTPException(status_code=404, detail=f"Portfolio valuation with ID {update_data['portfolio_valuation_id']} not found")
        
        result = db.table("portfolio_irr_values").update(update_data).eq("id", irr_value_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to update portfolio IRR value")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating portfolio IRR value: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{irr_id}")
async def delete_portfolio_irr(irr_id: int, db = Depends(get_db)):
    """
    Delete a portfolio IRR value by ID with detailed response.
    """
    try:
        logger.info(f"Attempting to delete portfolio IRR with ID: {irr_id}")
        
        # Get the IRR record details before deletion
        irr_record_result = db.table("portfolio_irr_values")\
            .select("*")\
            .eq("id", irr_id)\
            .execute()
        
        if not irr_record_result.data:
            logger.error(f"Portfolio IRR with ID {irr_id} not found")
            raise HTTPException(status_code=404, detail="Portfolio IRR not found")
        
        irr_record = irr_record_result.data[0]
        portfolio_id = irr_record.get("portfolio_id")
        irr_date = irr_record.get("date")
        
        if isinstance(irr_date, str):
            irr_date_only = irr_date.split('T')[0]
        else:
            irr_date_only = str(irr_date).split(' ')[0] if irr_date else "Unknown"
        
        logger.info(f"Deleting portfolio IRR for portfolio {portfolio_id} on date {irr_date_only}")
        
        # Delete the portfolio IRR value
        result = db.table("portfolio_irr_values").delete().eq("id", irr_id).execute()
        
        if not result or not hasattr(result, 'data') or not result.data:
            logger.error(f"Failed to delete portfolio IRR with ID {irr_id}")
            raise HTTPException(status_code=500, detail="Failed to delete portfolio IRR")
        
        logger.info(f"Successfully deleted portfolio IRR with ID {irr_id}")
        
        # Return detailed success response
        return {
            "message": f"Portfolio IRR with ID {irr_id} deleted successfully",
            "status": "success",
            "cascade_deletions": [],
            "common_date_broken": False,
            "affected_date": irr_date_only,
            "portfolio_id": portfolio_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting portfolio IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting portfolio IRR: {str(e)}")

@router.get("/portfolios/{portfolio_id}/irr_values", response_model=List[PortfolioIRRValue])
async def get_portfolio_irr_values_by_portfolio(
    portfolio_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db = Depends(get_db)
):
    """
    What it does: Retrieves all IRR values for a specific portfolio.
    """
    try:
        # Verify portfolio exists
        portfolio_check = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not portfolio_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        result = db.table("portfolio_irr_values")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .order("calculation_date", ascending=False)\
            .range(skip, skip + limit - 1)\
            .execute()
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching portfolio IRR values: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/latest_irr", response_model=LatestPortfolioIRRValue)
async def get_latest_portfolio_irr(portfolio_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves the latest IRR value for a specific portfolio.
    """
    try:
        result = db.table("latest_portfolio_irr_values")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail=f"No IRR values found for portfolio {portfolio_id}")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest portfolio IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/performance_summary", response_model=PortfolioValueIRRSummary)
async def get_portfolio_performance_summary(portfolio_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a comprehensive performance summary for a specific portfolio.
    """
    try:
        result = db.table("portfolio_value_irr_summary")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail=f"No performance data found for portfolio {portfolio_id}")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching portfolio performance summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolios/{portfolio_id}/recalculate_irr", response_model=dict)
async def manually_recalculate_portfolio_irr(
    portfolio_id: int,
    db = Depends(get_db)
):
    """
    What it does: Manually triggers IRR recalculation for all funds in a portfolio.
    Why it's needed: Allows manual recalculation when needed, uses the same logic as automatic recalculation.
    """
    try:
        # Verify portfolio exists
        portfolio_check = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not portfolio_check.data:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        # Get all portfolio funds for this portfolio
        portfolio_funds_result = db.table("portfolio_funds")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not portfolio_funds_result.data:
            raise HTTPException(status_code=404, detail=f"No portfolio funds found in portfolio {portfolio_id}")
        
        portfolio_fund_ids = [pf["id"] for pf in portfolio_funds_result.data]
        
        # Import the recalculation function from holding_activity_logs
        from app.api.routes.holding_activity_logs import recalculate_irr_after_activity_change
        
        # Recalculate IRR for each portfolio fund (this will also recalculate portfolio-level IRR)
        recalculation_results = []
        
        for portfolio_fund_id in portfolio_fund_ids:
            try:
                logger.info(f"Manually recalculating IRR for portfolio fund {portfolio_fund_id}")
                result = await recalculate_irr_after_activity_change(portfolio_fund_id, db)
                recalculation_results.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "success": result.get("success", False),
                    "result": result
                })
            except Exception as e:
                logger.error(f"Error recalculating IRR for portfolio fund {portfolio_fund_id}: {str(e)}")
                recalculation_results.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "success": False,
                    "error": str(e)
                })
        
        # Count successes and failures
        successful_recalculations = sum(1 for r in recalculation_results if r["success"])
        failed_recalculations = len(recalculation_results) - successful_recalculations
        
        return {
            "message": f"IRR recalculation completed for portfolio {portfolio_id}",
            "portfolio_id": portfolio_id,
            "total_funds": len(portfolio_fund_ids),
            "successful_recalculations": successful_recalculations,
            "failed_recalculations": failed_recalculations,
            "details": recalculation_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error manually recalculating portfolio IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/quick_performance", response_model=dict)
async def get_quick_portfolio_performance(portfolio_id: int, db = Depends(get_db)):
    """
    What it does: Quickly retrieves pre-calculated portfolio performance data.
    Why it's needed: Provides fast access to IRR and valuation data that's already calculated and stored.
    """
    try:
        # Get latest portfolio valuation
        latest_valuation = db.table("latest_portfolio_valuations")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        # Get latest portfolio IRR
        latest_irr = db.table("latest_portfolio_irr_values")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        # Get portfolio details
        portfolio_details = db.table("portfolios")\
            .select("portfolio_name, status")\
            .eq("id", portfolio_id)\
            .execute()
        
        # Get count of active funds
        active_funds_count = db.table("portfolio_funds")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .eq("status", "active")\
            .execute()
        
        return {
            "portfolio_id": portfolio_id,
            "portfolio_name": portfolio_details.data[0]["portfolio_name"] if portfolio_details.data else None,
            "portfolio_status": portfolio_details.data[0]["status"] if portfolio_details.data else None,
            "current_valuation": latest_valuation.data[0] if latest_valuation.data else None,
            "irr_value": latest_irr.data[0] if latest_irr.data else None,
            "active_funds_count": len(active_funds_count.data) if active_funds_count.data else 0,
            "data_available": {
                "valuation": bool(latest_valuation.data),
                "irr": bool(latest_irr.data)
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching quick portfolio performance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") 