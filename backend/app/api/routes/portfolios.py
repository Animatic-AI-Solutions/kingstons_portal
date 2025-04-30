from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from datetime import date, datetime
from pydantic import BaseModel

from app.models.portfolio import Portfolio, PortfolioCreate, PortfolioUpdate
from app.db.database import get_db
from app.models.holding_activity_log import HoldingActivityLog, HoldingActivityLogUpdate
from app.api.routes.portfolio_funds import calculate_excel_style_irr

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PortfolioFromTemplate(BaseModel):
    template_id: int
    portfolio_name: str

router = APIRouter()

@router.get("/portfolios", response_model=List[Portfolio])
async def get_portfolios(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    status: Optional[str] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of portfolios with optional filtering by status.
    Why it's needed: Provides a way to view and filter investment portfolios in the system.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'portfolios' table with optional filters
        3. Applies pagination parameters to limit result size
        4. Returns the data as a list of Portfolio objects
    Expected output: A JSON array of portfolio objects with all their details
    """
    try:
        query = db.table("portfolios").select("*")
        
        if status is not None:
            query = query.eq("status", status)
            
        # Extract values from Query objects
        skip_val = skip
        limit_val = limit
        if hasattr(skip, 'default'):
            skip_val = skip.default
        if hasattr(limit, 'default'):
            limit_val = limit.default
            
        result = query.range(skip_val, skip_val + limit_val - 1).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolios", response_model=Portfolio)
async def create_portfolio(portfolio: PortfolioCreate, db = Depends(get_db)):
    """
    What it does: Creates a new portfolio in the database.
    Why it's needed: Allows adding new investment portfolios to the system.
    How it works:
        1. Validates the portfolio data using the PortfolioCreate model
        2. Inserts the validated data into the 'portfolios' table
        3. Returns the newly created portfolio with its generated ID
    Expected output: A JSON object containing the created portfolio with all fields including ID and created_at timestamp
    """
    try:
        # Explicitly handle date serialization
        data_dict = portfolio.model_dump()
        
        # Set start_date to today if not provided
        if 'start_date' not in data_dict or data_dict['start_date'] is None:
            data_dict['start_date'] = date.today().isoformat()
        elif data_dict['start_date'] is not None:
            data_dict['start_date'] = data_dict['start_date'].isoformat()
        
        if 'end_date' in data_dict and data_dict['end_date'] is not None:
            data_dict['end_date'] = data_dict['end_date'].isoformat()
        
        result = db.table("portfolios").insert(data_dict).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=400, detail="Failed to create portfolio")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}", response_model=Portfolio)
async def get_portfolio(portfolio_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single portfolio by ID.
    Why it's needed: Allows viewing detailed information about a specific portfolio.
    How it works:
        1. Takes the portfolio_id from the URL path
        2. Queries the 'portfolios' table for a record with matching ID
        3. Returns the portfolio data or raises a 404 error if not found
    Expected output: A JSON object containing the requested portfolio's details
    """
    try:
        result = db.table("portfolios").select("*").eq("id", portfolio_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/portfolios/{portfolio_id}", response_model=Portfolio)
async def update_portfolio(portfolio_id: int, portfolio_update: PortfolioUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing portfolio's information.
    Why it's needed: Allows modifying portfolio details when investment strategies change.
    How it works:
        1. Validates the update data using the PortfolioUpdate model
        2. Removes any None values from the input (fields that aren't being updated)
        3. Verifies the portfolio exists
        4. Updates only the provided fields in the database
        5. Returns the updated portfolio information
    Expected output: A JSON object containing the updated portfolio's details
    """
    # Remove None values from the update data
    update_data = {k: v for k, v in portfolio_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update data provided")
    
    try:
        # Check if portfolio exists
        check_result = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        # Convert date objects to ISO format strings
        if 'start_date' in update_data and update_data['start_date'] is not None:
            update_data['start_date'] = update_data['start_date'].isoformat()
        
        if 'end_date' in update_data and update_data['end_date'] is not None:
            update_data['end_date'] = update_data['end_date'].isoformat()
        
        # Update the portfolio
        result = db.table("portfolios").update(update_data).eq("id", portfolio_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update portfolio")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/portfolios/{portfolio_id}", response_model=dict)
async def delete_portfolio(portfolio_id: int, db = Depends(get_db)):
    """
    What it does: Deletes a portfolio from the database.
    Why it's needed: Allows removing portfolios that are no longer relevant to the business.
    How it works:
        1. Verifies the portfolio exists
        2. Gets all portfolio_funds associated with this portfolio
        3. For each portfolio fund:
           - Deletes all IRR values associated with the fund
           - Deletes all holding activity logs associated with the fund
        4. Deletes all portfolio_funds associated with this portfolio
        5. Updates account_holdings to remove references to this portfolio
        6. Deletes the portfolio record
        7. Returns a success message
    Expected output: A JSON object with a success message confirmation and deletion counts
    """
    try:
        # Check if portfolio exists
        check_result = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        logger.info(f"Deleting portfolio with ID: {portfolio_id} and all related data")
        
        # Get all portfolio_funds for this portfolio
        portfolio_funds = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_id).execute()
        
        # Track deletion counts
        irr_values_deleted = 0
        activity_logs_deleted = 0
        portfolio_funds_deleted = len(portfolio_funds.data) if portfolio_funds.data else 0
        
        # Handle dependent records for each portfolio fund
        if portfolio_funds.data:
            for fund in portfolio_funds.data:
                fund_id = fund["id"]
                
                # Delete IRR values for this fund
                irr_result = db.table("irr_values").delete().eq("fund_id", fund_id).execute()
                deleted_count = len(irr_result.data) if irr_result.data else 0
                irr_values_deleted += deleted_count
                logger.info(f"Deleted {deleted_count} IRR values for portfolio fund {fund_id}")
                
                # Delete activity logs for this fund
                activity_result = db.table("holding_activity_log").delete().eq("portfolio_fund_id", fund_id).execute()
                deleted_count = len(activity_result.data) if activity_result.data else 0
                activity_logs_deleted += deleted_count
                logger.info(f"Deleted {deleted_count} activity logs for portfolio fund {fund_id}")
        
        # Now delete all portfolio_funds
        db.table("portfolio_funds").delete().eq("portfolio_id", portfolio_id).execute()
        logger.info(f"Deleted {portfolio_funds_deleted} portfolio funds for portfolio {portfolio_id}")
        
        # Update account_holdings to remove references to this portfolio
        holdings_result = db.table("account_holdings").update({"portfolio_id": None}).eq("portfolio_id", portfolio_id).execute()
        holdings_updated = len(holdings_result.data) if holdings_result.data else 0
        logger.info(f"Updated {holdings_updated} account holdings to remove portfolio reference")
        
        # Delete the portfolio
        result = db.table("portfolios").delete().eq("id", portfolio_id).execute()
        
        return {
            "message": f"Portfolio with ID {portfolio_id} deleted successfully",
            "details": {
                "portfolio_funds_deleted": portfolio_funds_deleted,
                "irr_values_deleted": irr_values_deleted,
                "activity_logs_deleted": activity_logs_deleted,
                "holdings_updated": holdings_updated
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolios/from_template", response_model=Portfolio)
async def create_portfolio_from_template(template_data: PortfolioFromTemplate, db = Depends(get_db)):
    """
    What it does: Creates a new portfolio based on a template.
    Why it's needed: Allows creating portfolios using predefined templates.
    How it works:
        1. Gets the template details from available_portfolios
        2. Creates a new portfolio with the provided name
        3. Copies the fund allocations from the template
        4. Returns the newly created portfolio
    Expected output: A JSON object containing the created portfolio details
    """
    try:
        logger.info(f"Creating portfolio from template {template_data.template_id}")
        
        # Get template details
        template_response = db.table("available_portfolios") \
            .select("*") \
            .eq("id", template_data.template_id) \
            .execute()
            
        if not template_response.data or len(template_response.data) == 0:
            raise HTTPException(status_code=404, detail=f"Template with ID {template_data.template_id} not found")
        
        template = template_response.data[0]
        
        # Create a new portfolio with today's date as start_date
        today = date.today().isoformat()
        portfolio_data = {
            "portfolio_name": template_data.portfolio_name,
            "status": "active",
            "start_date": today  # Set to today's date
        }
        
        portfolio_result = db.table("portfolios").insert(portfolio_data).execute()
        
        if not portfolio_result.data or len(portfolio_result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create portfolio from template")
            
        new_portfolio = portfolio_result.data[0]
        
        # Get the template's funds
        template_funds_response = db.table("available_portfolio_funds") \
            .select("*") \
            .eq("portfolio_id", template_data.template_id) \
            .execute()
            
        if not template_funds_response.data:
            # No funds in template, just return the empty portfolio
            return new_portfolio
            
        # Create funds in the new portfolio based on template
        for fund in template_funds_response.data:
            fund_data = {
                "portfolio_id": new_portfolio["id"],
                "available_funds_id": fund["fund_id"],
                "target_weighting": fund["target_weighting"],
                "start_date": today,  # Use the same start_date as the portfolio
                "amount_invested": 0  # Initial amount is zero
            }
            
            db.table("portfolio_funds").insert(fund_data).execute()
        
        logger.info(f"Successfully created portfolio ID {new_portfolio['id']} from template {template_data.template_id}")
        return new_portfolio
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating portfolio from template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
