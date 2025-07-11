from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict, Union
import logging
from datetime import date, datetime
from pydantic import BaseModel

from app.models.portfolio import Portfolio, PortfolioCreate, PortfolioUpdate, PortfolioWithTemplate, TemplateInfo
from app.db.database import get_db
from app.models.holding_activity_log import HoldingActivityLog, HoldingActivityLogUpdate
from app.api.routes.portfolio_funds import calculate_excel_style_irr
from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PortfolioFromTemplate(BaseModel):
    template_id: int
    generation_id: Optional[int] = None  # Added generation_id field
    portfolio_name: str
    status: str = "active"
    start_date: Optional[str] = None

router = APIRouter()

@router.get("/portfolios", response_model=Union[List[Portfolio], Dict[str, int]])
async def get_portfolios(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    status: Optional[str] = None,
    template_generation_id: Optional[int] = None,
    count_only: bool = False,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of portfolios with optional filtering by status and template.
    Why it's needed: Provides a way to view and filter investment portfolios in the system.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'portfolios' table with optional filters
        3. If count_only is True, returns just the count of matching records
        4. Otherwise applies pagination parameters to limit result size
        5. Returns the data as a list of Portfolio objects or a count
    Expected output: A JSON array of portfolio objects with all their details or a count
    """
    try:
        # Start building the query
        if count_only:
            query = db.table("portfolios").select("id")
        else:
            query = db.table("portfolios").select("*")
        
        # Apply filters
        if status is not None:
            query = query.eq("status", status)
            
        if template_generation_id is not None:
            query = query.eq("template_generation_id", template_generation_id)
        
        # If count_only is True, return just the count
        if count_only:
            result = query.execute()
            return {"count": len(result.data) if result.data else 0}
        
        # Otherwise, apply pagination and return the data
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
        3. Adds the Cash fund (name 'Cash', ISIN 'N/A') with null weighting (no weighting set initially)
        4. Returns the newly created portfolio with its generated ID
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
            new_portfolio = result.data[0]
            
            # Always add the Cash fund to every new portfolio
            logger.info(f"Adding Cash fund to portfolio {new_portfolio['id']}")
            
            # Find the Cash fund
            cash_fund_result = db.table("available_funds").select("*") \
                                 .eq("fund_name", "Cash") \
                                 .eq("isin_number", "N/A") \
                                 .limit(1).execute()
            
            if cash_fund_result.data and len(cash_fund_result.data) > 0:
                cash_fund = cash_fund_result.data[0]
                logger.info(f"Found Cash fund with ID {cash_fund['id']}")
                
                # Get the same start date as the portfolio
                portfolio_start_date = data_dict['start_date']
                
                # Add Cash fund with null weighting (no weighting set initially)
                cash_fund_data = {
                    "portfolio_id": new_portfolio["id"],
                    "available_funds_id": cash_fund["id"],
                    "target_weighting": None,  # null weighting for flexible system
                    "start_date": portfolio_start_date,
                    "amount_invested": 0  # No initial investment
                }
                
                cash_add_result = db.table("portfolio_funds").insert(cash_fund_data).execute()
                if cash_add_result.data and len(cash_add_result.data) > 0:
                    logger.info(f"Successfully added Cash fund to portfolio {new_portfolio['id']}")
                else:
                    logger.warning(f"Failed to add Cash fund to portfolio {new_portfolio['id']}")
            else:
                logger.warning("Cash fund (name 'Cash', ISIN 'N/A') not found in available_funds table")
                
            return new_portfolio
            
        raise HTTPException(status_code=400, detail="Failed to create portfolio")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}", response_model=PortfolioWithTemplate)
async def get_portfolio(portfolio_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single portfolio by ID.
    Why it's needed: Allows viewing detailed information about a specific portfolio.
    How it works:
        1. Takes the portfolio_id from the URL path
        2. Queries the 'portfolios' table for a record with matching ID
        3. Fetches template information if the portfolio was created from a template
        4. Returns the portfolio data or raises a 404 error if not found
    Expected output: A JSON object containing the requested portfolio's details with template info
    """
    try:
        result = db.table("portfolios").select("*").eq("id", portfolio_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        portfolio = result.data[0]
        
        # If portfolio has a template_generation_id, get the template info
        if portfolio.get("template_generation_id"):
            template_result = db.table("template_portfolio_generations") \
                .select("*") \
                .eq("id", portfolio["template_generation_id"]) \
                .execute()
                
            if template_result.data and len(template_result.data) > 0:
                portfolio["template_info"] = template_result.data[0]
        
        return portfolio
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting portfolio: {str(e)}")
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
        5. Updates product_holdings to remove references to this portfolio
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
                irr_result = db.table("portfolio_fund_irr_values").delete().eq("fund_id", fund_id).execute()
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
        
        # Update product_holdings to remove references to this portfolio
        holdings_result = db.table("product_holdings").update({"portfolio_id": None}).eq("portfolio_id", portfolio_id).execute()
        holdings_updated = len(holdings_result.data) if holdings_result.data else 0
        logger.info(f"Updated {holdings_updated} product holdings to remove portfolio reference")
        
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
        2. Gets the specified generation or the latest active generation of the template
        3. Creates a new portfolio with the provided name
        4. Copies the fund allocations from the template generation
        5. Returns the newly created portfolio
    Expected output: A JSON object containing the created portfolio details
    """
    try:
        logger.info(f"Creating portfolio from template {template_data.template_id} with generation {template_data.generation_id}")
        
        # Get template details
        template_response = db.table("available_portfolios") \
            .select("*") \
            .eq("id", template_data.template_id) \
            .execute()
            
        if not template_response.data or len(template_response.data) == 0:
            raise HTTPException(status_code=404, detail=f"Template with ID {template_data.template_id} not found")
        
        template = template_response.data[0]
        generation = None
        
        # Get the specific generation if provided, otherwise get the latest active generation
        if template_data.generation_id:
            generation_response = db.table("template_portfolio_generations") \
                .select("*") \
                .eq("id", template_data.generation_id) \
                .execute()
                
            if not generation_response.data or len(generation_response.data) == 0:
                raise HTTPException(status_code=404, detail=f"Generation with ID {template_data.generation_id} not found")
            
            generation = generation_response.data[0]
            logger.info(f"Using specified generation: {generation['id']}")
        else:
            # Get the latest active generation of this template
            latest_generation_response = db.table("template_portfolio_generations") \
                .select("*") \
                .eq("available_portfolio_id", template_data.template_id) \
                .eq("status", "active") \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
                
            if not latest_generation_response.data or len(latest_generation_response.data) == 0:
                raise HTTPException(status_code=404, detail="No active generations found for this template")
            
            generation = latest_generation_response.data[0]
            logger.info(f"Using latest generation: {generation['id']}")
        
        # Create the portfolio with template reference
        portfolio_data = {
            "portfolio_name": f"{template['name']} - {generation['generation_name']}",
            "status": "active",
            "start_date": date.today().isoformat(),
            "template_generation_id": generation['id']  # Use generation ID instead of template ID
        }
        
        portfolio_result = db.table("portfolios").insert(portfolio_data).execute()
        
        if not portfolio_result.data or len(portfolio_result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create portfolio from template")
            
        new_portfolio = portfolio_result.data[0]
        
        # Get the template's funds from the generation
        template_funds_response = db.table("available_portfolio_funds") \
            .select("*") \
            .eq("template_portfolio_generation_id", generation["id"]) \
            .execute()
            
        if not template_funds_response.data:
            # No funds in template, just return the empty portfolio
            return new_portfolio
            
        # Check for duplicate funds in the template and log them
        fund_ids = [fund["fund_id"] for fund in template_funds_response.data]
        unique_fund_ids = set(fund_ids)
        if len(fund_ids) != len(unique_fund_ids):
            # There are duplicates - log them for debugging
            duplicate_funds = {}
            for fund_id in fund_ids:
                if fund_id in duplicate_funds:
                    duplicate_funds[fund_id] += 1
                else:
                    duplicate_funds[fund_id] = 1
                    
            # Filter to just duplicates    
            duplicates = {fund_id: count for fund_id, count in duplicate_funds.items() if count > 1}
            logger.warning(f"Found duplicate funds in template generation {generation['id']}: {duplicates}")
            
            # Get fund names for better logging
            for fund_id in duplicates.keys():
                fund_details = db.table("available_funds").select("fund_name").eq("id", fund_id).execute()
                if fund_details.data and len(fund_details.data) > 0:
                    logger.warning(f"Fund ID {fund_id} ({fund_details.data[0].get('fund_name', 'Unknown')}) appears {duplicates[fund_id]} times in template")
        
        # Use a set to track which funds we've already added to avoid duplicates
        added_fund_ids = set()
            
        # Create funds in the new portfolio based on template 
        for fund in template_funds_response.data:
            fund_id = fund["fund_id"]
            
            # Skip duplicate funds
            if fund_id in added_fund_ids:
                logger.info(f"Skipping duplicate fund ID {fund_id} in template")
                continue
                
            fund_data = {
                "portfolio_id": new_portfolio["id"],
                "available_funds_id": fund_id,
                "target_weighting": fund["target_weighting"],
                "start_date": date.today().isoformat(),  # Use the same start_date as the portfolio
                "amount_invested": 0  # Initial amount is zero
            }
            
            db.table("portfolio_funds").insert(fund_data).execute()
            added_fund_ids.add(fund_id)  # Mark as added
        
        # Always add the Cash fund if it's not already included in the template
        # Find if Cash is already added
        cash_fund_included = False
        for fund in template_funds_response.data:
            # Get fund details to check if it's the Cash fund
            fund_details = db.table("available_funds").select("*").eq("id", fund["fund_id"]).execute()
            if fund_details.data and len(fund_details.data) > 0:
                if fund_details.data[0].get("fund_name") == "Cash":
                    cash_fund_included = True
                    logger.info(f"Cash fund already included in template {template_data.template_id}")
                    break
        
        # If Cash not already included, add it
        if not cash_fund_included:
            logger.info(f"Adding Cash fund to portfolio {new_portfolio['id']}")
            # Find the Cash fund
            cash_fund_result = db.table("available_funds").select("*") \
                                 .eq("fund_name", "Cash") \
                                 .eq("isin_number", "N/A") \
                                 .limit(1).execute()
            
            if cash_fund_result.data and len(cash_fund_result.data) > 0:
                cash_fund = cash_fund_result.data[0]
                logger.info(f"Found Cash fund with ID {cash_fund['id']}")
                
                # Add Cash fund with null weighting (no weighting set initially)
                cash_fund_data = {
                    "portfolio_id": new_portfolio["id"],
                    "available_funds_id": cash_fund["id"],
                    "target_weighting": None,  # null weighting for flexible system
                    "start_date": date.today().isoformat(),
                    "amount_invested": 0  # No initial investment
                }
                
                cash_add_result = db.table("portfolio_funds").insert(cash_fund_data).execute()
                if cash_add_result.data and len(cash_add_result.data) > 0:
                    logger.info(f"Successfully added Cash fund to portfolio {new_portfolio['id']}")
                else:
                    logger.warning(f"Failed to add Cash fund to portfolio {new_portfolio['id']}")
            else:
                logger.warning("Cash fund (name 'Cash', ISIN 'N/A') not found in available_funds table")
        
        logger.info(f"Successfully created portfolio ID {new_portfolio['id']} from template {template_data.template_id}")
        return new_portfolio
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating portfolio from template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolios/{portfolio_id}/calculate-irr", response_model=dict)
async def calculate_portfolio_irr(
    portfolio_id: int,
    db = Depends(get_db)
):
    """
    What it does: Calculates the IRR for all portfolio funds in a portfolio for the most recent common date.
    Why it's needed: Allows bulk IRR calculation across a portfolio when all funds have valuations.
    How it works:
        1. Gets all portfolio funds in the portfolio
        2. Finds the most recent date for which all portfolio funds have valuations
        3. For each portfolio fund, calculates IRR if it doesn't already exist for that date
        4. Returns a summary of the calculation results
    Expected output: A JSON object with the calculation results summary
    """
    logger.info(f"🔍 DEBUG: calculate_portfolio_irr CALLED for portfolio {portfolio_id}")
    try:
        # Check if portfolio exists
        portfolio_result = db.table("portfolios").select("*").eq("id", portfolio_id).execute()
        if not portfolio_result.data or len(portfolio_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")

        # Get all portfolio funds in this portfolio
        portfolio_funds_result = db.table("portfolio_funds").select("*").eq("portfolio_id", portfolio_id).execute()
        if not portfolio_funds_result.data or len(portfolio_funds_result.data) == 0:
            raise HTTPException(status_code=404, detail="No portfolio funds found in this portfolio")
        
        portfolio_funds = portfolio_funds_result.data
        logger.info(f"Found {len(portfolio_funds)} funds in portfolio {portfolio_id}")
        
        # 🔍 DEBUG: Log fund statuses to understand the filtering issue
        active_funds = [f for f in portfolio_funds if f.get("status", "active") == "active"]
        inactive_funds = [f for f in portfolio_funds if f.get("status", "active") != "active"]
        logger.info(f"🔍 DEBUG: calculate_portfolio_irr - Fund breakdown: {len(active_funds)} active, {len(inactive_funds)} inactive")
        for fund in portfolio_funds:
            logger.info(f"🔍 DEBUG: calculate_portfolio_irr - Fund {fund['id']}: status = {fund.get('status', 'active')}")
        
        # Get the most recent valuation date that exists for ALL portfolio funds
        # Include ALL funds (active and inactive) for historical accuracy
        all_fund_data = []
        active_funds_with_valuations = []
        
        for fund in portfolio_funds:
            fund_id = fund["id"]
            fund_status = fund.get("status", "active")
            logger.info(f"Processing fund {fund_id} (status: {fund_status})")
            
            if fund_status == "active":
                # Get the most recent valuation for active funds
                latest_valuation = db.table("portfolio_fund_valuations")\
                    .select("*")\
                    .eq("portfolio_fund_id", fund_id)\
                    .order("valuation_date", desc=True)\
                    .limit(1)\
                    .execute()
                    
                if not latest_valuation.data or len(latest_valuation.data) == 0:
                    logger.error(f"Active fund {fund_id} has no valuations - this is required for portfolio valuation")
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Active portfolio fund ID {fund_id} has no valuations. Active funds must have valuations to calculate portfolio value."
                    )
                else:
                    # Add active fund with actual valuation
                    from datetime import datetime as dt
                    valuation_date = dt.fromisoformat(latest_valuation.data[0]["valuation_date"])
                    active_funds_with_valuations.append({
                        "portfolio_fund_id": fund_id,
                        "date": valuation_date,
                        "valuation": latest_valuation.data[0]["valuation"],
                        "valuation_id": latest_valuation.data[0]["id"],
                        "status": fund_status
                    })
                    logger.info(f"Active fund {fund_id} has valuation {latest_valuation.data[0]['valuation']} on {valuation_date.isoformat()}")
            else:
                # Inactive fund - assume zero valuation but still include for IRR calculation
                logger.info(f"Inactive fund {fund_id} - assuming zero valuation but including for IRR calculation")
        
        # Determine common date from active funds only
        if not active_funds_with_valuations:
            raise HTTPException(status_code=400, detail="No active funds with valuations found")
            
        # Sort by date in ascending order and take the earliest (so all active funds have a valuation on or after this date)
        active_funds_with_valuations.sort(key=lambda x: x["date"])
        common_date = active_funds_with_valuations[0]["date"]
        common_date_iso = common_date.isoformat()
        logger.info(f"Using common date for calculations: {common_date_iso}")
        
        # Now create the complete fund data list including inactive funds with zero valuations
        most_recent_valuation_dates = []
        
        for fund in portfolio_funds:
            fund_id = fund["id"]
            fund_status = fund.get("status", "active")
            
            if fund_status == "active":
                # Find the active fund data we already processed
                fund_data = next((f for f in active_funds_with_valuations if f["portfolio_fund_id"] == fund_id), None)
                if fund_data:
                    most_recent_valuation_dates.append(fund_data)
            else:
                # Add inactive fund with zero valuation on the common date
                most_recent_valuation_dates.append({
                    "portfolio_fund_id": fund_id,
                    "date": common_date,
                    "valuation": 0.0,  # Assume zero valuation for inactive funds
                    "valuation_id": None,  # No actual valuation record
                    "status": fund_status
                })
                logger.info(f"Including inactive fund {fund_id} with zero valuation for IRR calculation")
        
        # Log summary
        active_funds = [f for f in most_recent_valuation_dates if f["status"] == "active"]
        inactive_funds = [f for f in most_recent_valuation_dates if f["status"] != "active"]
        logger.info(f"Fund summary: {len(active_funds)} active funds with actual valuations, {len(inactive_funds)} inactive funds with zero valuations")
        logger.info(f"Total funds for IRR calculation: {len(most_recent_valuation_dates)}")
        
        # Format as year and month for IRR calculation
        year = common_date.year
        month = common_date.month
        
        # Calculate IRR for each portfolio fund
        calculation_results = []
        funds_to_calculate = []
        funds_with_existing_irr = []
        
        for fund_data in most_recent_valuation_dates:
            portfolio_fund_id = fund_data["portfolio_fund_id"]
            valuation = fund_data["valuation"]
            
            # This log line will help identify where activity logs are needed but missing
            logger.info(f"Checking fund {portfolio_fund_id} for IRR calculation, valuation: {valuation}")
            
            # Check if IRR already exists for this date - use consistent string format for comparison
            existing_irr = db.table("portfolio_fund_irr_values")\
                .select("*")\
                .eq("fund_id", portfolio_fund_id)\
                .eq("date", common_date_iso)\
                .execute()
            
            logger.info(f"Found {len(existing_irr.data) if existing_irr.data else 0} existing IRR record(s) for fund {portfolio_fund_id}")
            
            # Handle zero valuations using the proper standardized calculation (exclude from final valuation)
            # No special hardcoding - let the standardized endpoint handle the £0 edge case
            
            # For negative valuations, log error and skip
            if valuation < 0:
                logger.error(f"Cannot calculate IRR for negative valuation: {valuation}")
                calculation_results.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "status": "error",
                    "message": f"Cannot calculate IRR for negative valuation: {valuation}"
                })
                continue
            
            if existing_irr.data and len(existing_irr.data) > 0:
                # IRR already exists for this fund on this date - check if it was recently updated
                existing_record = existing_irr.data[0]
                created_at = existing_record.get("created_at", "")
                updated_recently = False
                
                # Check if the record was created/updated in the last 5 minutes (likely from activity change)
                if created_at:
                    try:
                        from datetime import datetime, timedelta
                        record_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        current_time = datetime.now(record_time.tzinfo)
                        time_diff = current_time - record_time
                        updated_recently = time_diff < timedelta(minutes=5)
                    except:
                        pass
                
                funds_with_existing_irr.append(portfolio_fund_id)
                calculation_results.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "status": "skipped",
                    "message": f"IRR already exists for this date{' (recently updated)' if updated_recently else ''}",
                    "existing_irr": existing_record["irr_result"],
                    "recently_updated": updated_recently
                })
                logger.info(f"Skipping IRR calculation for fund {portfolio_fund_id} - already exists with value {existing_record['irr_result']}{' (recently updated)' if updated_recently else ''}")
            else:
                # Add to list of funds that need calculation
                funds_to_calculate.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "valuation": valuation,
                    "valuation_id": fund_data.get("valuation_id")
                })
                logger.info(f"Fund {portfolio_fund_id} needs IRR calculation")
        
        # Calculate IRR for funds that need it
        logger.info(f"Found {len(funds_to_calculate)} funds needing IRR calculation and {len(funds_with_existing_irr)} funds with existing IRR")
        
        for fund_info in funds_to_calculate:
            portfolio_fund_id = fund_info["portfolio_fund_id"]
            valuation = fund_info["valuation"]
            
            try:
                # Use the standardized single fund IRR endpoint
                logger.info(f"Calculating IRR for fund {portfolio_fund_id} using standardized endpoint")
                
                # Import the standardized function
                from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
                
                # Call the standardized IRR calculation with the common date
                irr_result = await calculate_single_portfolio_fund_irr(
                    portfolio_fund_id=portfolio_fund_id,
                    irr_date=common_date_iso.split('T')[0],  # Convert to YYYY-MM-DD format
                    db=db
                )
                
                logger.info(f"Standardized IRR calculation result for fund {portfolio_fund_id}: {irr_result}")
                
                if irr_result.get("success"):
                    # Extract IRR percentage from standardized response
                    irr_percentage = irr_result.get("irr_percentage", 0.0)
                    
                    # Store the IRR value in the portfolio_fund_irr_values table
                    irr_value_data = {
                        "fund_id": portfolio_fund_id,
                        "irr_result": float(irr_percentage),
                        "date": common_date_iso,
                        "fund_valuation_id": fund_info.get("valuation_id")
                    }
                    
                    # Check if IRR already exists and update or insert
                    existing_irr = db.table("portfolio_fund_irr_values")\
                        .select("*")\
                        .eq("fund_id", portfolio_fund_id)\
                        .eq("date", common_date_iso)\
                        .execute()
                    
                    if existing_irr.data and len(existing_irr.data) > 0:
                        # Update existing
                        irr_id = existing_irr.data[0]["id"]
                        db.table("portfolio_fund_irr_values")\
                            .update({"irr_result": float(irr_percentage)})\
                            .eq("id", irr_id)\
                            .execute()
                    else:
                        # Insert new
                        db.table("portfolio_fund_irr_values").insert(irr_value_data).execute()
                    
                    calculation_results.append({
                        "portfolio_fund_id": portfolio_fund_id,
                        "status": "calculated",
                        "irr_value": irr_percentage,
                        "calculation_date": common_date_iso,
                        "method": "standardized"
                    })
                else:
                    # Handle error from standardized calculation
                    error_msg = f"Standardized IRR calculation failed: {irr_result}"
                    logger.error(error_msg)
                    calculation_results.append({
                        "portfolio_fund_id": portfolio_fund_id,
                        "status": "error",
                        "message": error_msg
                    })
                
            except Exception as e:
                error_msg = f"Error calculating IRR for fund {portfolio_fund_id}: {str(e)}"
                logger.error(error_msg)
                calculation_results.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "status": "error",
                    "message": error_msg
                })
        
        # Count the results by status
        successful = sum(1 for r in calculation_results if r["status"] == "calculated")
        skipped = sum(1 for r in calculation_results if r["status"] == "skipped")
        failed = sum(1 for r in calculation_results if r["status"] == "error")
        
        logger.info(f"IRR calculation complete for {successful} funds on {common_date.strftime('%d/%m/%Y')}. Skipped {skipped} funds with existing IRR values.")
        
        # =======================================================================
        # NEW: Calculate and store portfolio-level valuation and IRR
        # =======================================================================
        
        portfolio_valuation_result = None
        portfolio_irr_result = None
        
        try:
            # Step 1: Calculate portfolio valuation by summing all fund valuations
            logger.info("Calculating portfolio-level valuation and IRR...")
            
            # Get portfolio fund IDs - separate active and inactive funds
            all_fund_ids = [pf["id"] for pf in portfolio_funds]
            active_fund_ids = [pf["id"] for pf in portfolio_funds if pf.get("status", "active") == "active"]
            inactive_fund_ids = [pf["id"] for pf in portfolio_funds if pf.get("status", "active") != "active"]
            
            # DEBUG: Log fund counts and IDs
            logger.info(f"🔍 DEBUG: Portfolio {portfolio_id} fund analysis:")
            logger.info(f"🔍 DEBUG: Total portfolio_funds from query: {len(portfolio_funds)}")
            logger.info(f"🔍 DEBUG: all_fund_ids: {all_fund_ids}")
            logger.info(f"🔍 DEBUG: active_fund_ids: {active_fund_ids}")
            logger.info(f"🔍 DEBUG: inactive_fund_ids: {inactive_fund_ids}")
            
            # Also get fund IDs that have valuations (for portfolio valuation calculation)
            funds_with_valuations = [fd["portfolio_fund_id"] for fd in most_recent_valuation_dates]
            
            # UPDATED LOGIC: Use ONLY ACTIVE funds for valuation, but ALL funds for IRR calculation
            # Portfolio valuation reflects current active holdings, while IRR includes historical accuracy
            
            if all_fund_ids:
                # Calculate total portfolio value using ONLY ACTIVE funds (for current valuation)
                total_portfolio_value = 0.0
                for fund_data in most_recent_valuation_dates:
                    if fund_data["portfolio_fund_id"] in active_fund_ids:
                        total_portfolio_value += fund_data["valuation"]
                

                
                # Step 2: Store portfolio valuation
                portfolio_valuation_data = {
                    "portfolio_id": portfolio_id,
                    "valuation_date": common_date_iso,
                    "valuation": total_portfolio_value
                }
                
                # Check if portfolio valuation already exists for this date
                existing_portfolio_valuation = db.table("portfolio_valuations")\
                    .select("id")\
                    .eq("portfolio_id", portfolio_id)\
                    .eq("valuation_date", common_date_iso)\
                    .execute()
                
                if existing_portfolio_valuation.data:
                    # Update existing portfolio valuation
                    portfolio_valuation_result = db.table("portfolio_valuations")\
                        .update({"valuation": total_portfolio_value})\
                        .eq("id", existing_portfolio_valuation.data[0]["id"])\
                        .execute()
                    portfolio_valuation_id = existing_portfolio_valuation.data[0]["id"]
                    logger.info(f"Updated existing portfolio valuation for {portfolio_id}")
                else:
                    # Create new portfolio valuation
                    portfolio_valuation_result = db.table("portfolio_valuations")\
                        .insert(portfolio_valuation_data)\
                        .execute()
                    portfolio_valuation_id = portfolio_valuation_result.data[0]["id"] if portfolio_valuation_result.data else None
                    logger.info(f"Created new portfolio valuation for {portfolio_id}")
                
                # Step 3: Calculate portfolio-level IRR using ALL funds (active + inactive) for historical accuracy
                logger.info(f"🔍 DEBUG: Calculating portfolio IRR using ALL funds (active + inactive) for historical accuracy: {len(all_fund_ids)} funds")
                logger.info(f"🔍 DEBUG: all_fund_ids contains: {all_fund_ids}")
                logger.info(f"🔍 DEBUG: About to call calculate_multiple_portfolio_funds_irr with fund IDs: {all_fund_ids}")
                
                portfolio_irr_response = await calculate_multiple_portfolio_funds_irr(
                    portfolio_fund_ids=all_fund_ids,  # Use ALL funds (active + inactive) for historical accuracy
                    irr_date=common_date_iso.split('T')[0],  # Convert to YYYY-MM-DD format
                    db=db
                )
                
                logger.info(f"🔍 DEBUG: calculate_multiple_portfolio_funds_irr returned: {portfolio_irr_response}")
                
                if portfolio_irr_response.get("success"):
                    portfolio_irr_percentage = portfolio_irr_response.get("irr_percentage", 0.0)
                    logger.info(f"Portfolio IRR calculated (all funds): {portfolio_irr_percentage}%")
                    
                    # Step 4: Store portfolio IRR value
                    portfolio_irr_data = {
                        "portfolio_id": portfolio_id,
                        "irr_result": portfolio_irr_percentage,
                        "date": common_date_iso,
                        "portfolio_valuation_id": portfolio_valuation_id
                    }
                    
                    # Check if portfolio IRR already exists for this date
                    existing_portfolio_irr = db.table("portfolio_irr_values")\
                        .select("id")\
                        .eq("portfolio_id", portfolio_id)\
                        .eq("date", common_date_iso)\
                        .execute()
                    
                    if existing_portfolio_irr.data:
                        # Update existing portfolio IRR
                        portfolio_irr_result = db.table("portfolio_irr_values")\
                            .update({
                                "irr_result": portfolio_irr_percentage,
                                "portfolio_valuation_id": portfolio_valuation_id
                            })\
                            .eq("id", existing_portfolio_irr.data[0]["id"])\
                            .execute()
                        logger.info(f"Updated existing portfolio IRR for {portfolio_id}")
                    else:
                        # Create new portfolio IRR
                        portfolio_irr_result = db.table("portfolio_irr_values")\
                            .insert(portfolio_irr_data)\
                            .execute()
                        logger.info(f"Created new portfolio IRR for {portfolio_id}")
                else:
                    logger.warning(f"Portfolio IRR calculation failed: {portfolio_irr_response}")
            else:
                logger.warning("No funds found for portfolio-level calculations")
        
        except Exception as e:
            logger.error(f"Error calculating portfolio-level valuation and IRR: {str(e)}")
            # Don't fail the entire operation if portfolio-level calculation fails
        
        # =======================================================================
        # END: Portfolio-level calculations
        # =======================================================================
        
        return {
            "portfolio_id": portfolio_id,
            "calculation_date": common_date_iso,
            "total_funds": len(portfolio_funds),
            "successful": successful,
            "skipped": skipped,
            "failed": failed,
            "details": calculation_results,
            # NEW: Include portfolio-level results
            "portfolio_valuation": {
                "calculated": portfolio_valuation_result is not None,
                "total_value": sum(fund_data["valuation"] for fund_data in most_recent_valuation_dates if fund_data["portfolio_fund_id"] in active_fund_ids) if portfolio_funds else 0.0
            },
            "portfolio_irr": {
                "calculated": portfolio_irr_result is not None,
                "irr_value": portfolio_irr_response.get("irr_result") if 'portfolio_irr_response' in locals() and portfolio_irr_response.get("success") else None
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portfolio-wide IRR calculation error: {str(e)}")
        import traceback
        logger.error(f"Stack trace: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error calculating portfolio IRR: {str(e)}")

@router.post("/portfolios/{portfolio_id}/calculate-irr-for-date", response_model=dict)
async def calculate_portfolio_irr_for_date(
    portfolio_id: int,
    date: str,
    db = Depends(get_db)
):
    """
    Calculate IRR values for all funds in a portfolio for a specific date.
    
    This endpoint:
    1. Validates that the portfolio exists
    2. Gets all portfolio funds associated with the portfolio
    3. Checks if all funds have valuations for the specified date
    4. Calculates IRR for each fund with valuations
    5. Returns calculation results and any missing valuations
    
    Args:
        portfolio_id: ID of the portfolio to calculate IRR for
        date: Date in YYYY-MM-DD format to calculate IRR for
        
    Returns:
        Dictionary with calculation results
    """
    try:
        logger.info(f"Calculating IRR for portfolio {portfolio_id} on date {date}")
        
        # Parse and validate date
        try:
            calculation_date = datetime.fromisoformat(date)
            logger.info(f"Parsed date: {calculation_date}")
        except ValueError:
            logger.error(f"Invalid date format: {date}")
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")
            
        # Extract year and month for calculations
        year = calculation_date.year
        month = calculation_date.month
        
        # Check if portfolio exists
        portfolio = db.table("portfolios").select("*").eq("id", portfolio_id).execute()
        if not portfolio.data:
            raise HTTPException(status_code=404, detail=f"Portfolio {portfolio_id} not found")
            
        # Get all funds in the portfolio
        portfolio_funds = db.table("portfolio_funds").select("*").eq("portfolio_id", portfolio_id).execute()
        if not portfolio_funds.data:
            raise HTTPException(status_code=404, detail=f"No funds found in portfolio {portfolio_id}")
            
        # Check if all funds have valuations for the specified date
        missing_valuations = []
        funds_with_valuations = []
        
        for fund in portfolio_funds.data:
            fund_id = fund["id"]
            
            # Try to find a valuation for the specific date
            valuation_date_start = calculation_date.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            valuation_date_end = calculation_date.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
            
            logger.info(f"Looking for valuation for fund {fund_id} between {valuation_date_start} and {valuation_date_end}")
            
            valuation = db.table("portfolio_fund_valuations")\
                .select("*")\
                .eq("portfolio_fund_id", fund_id)\
                .gte("valuation_date", valuation_date_start)\
                .lte("valuation_date", valuation_date_end)\
                .execute()
                
            if not valuation.data:
                missing_valuations.append({
                    "portfolio_fund_id": fund_id,
                    "fund_name": fund.get("name", f"Fund {fund_id}")
                })
                logger.info(f"No valuation found for fund {fund_id} on date {date}")
            else:
                logger.info(f"Found valuation for fund {fund_id}: {valuation.data[0]}")
                funds_with_valuations.append({
                    "portfolio_fund_id": fund_id,
                    "valuation": float(valuation.data[0]["valuation"]),
                    "valuation_id": valuation.data[0]["id"],
                    "valuation_date": valuation.data[0]["valuation_date"]
                })
                
        # Check if we have any funds with valuations
        if not funds_with_valuations:
            return {
                "status": "error",
                "message": "No valuations found for any funds on the specified date",
                "missing_valuations": missing_valuations,
                "portfolio_id": portfolio_id,
                "date": date,
                "calculation_results": []
            }
            
        # Calculate IRR for each fund with valuations
        calculation_results = []
        
        for fund_info in funds_with_valuations:
            portfolio_fund_id = fund_info["portfolio_fund_id"]
            valuation = fund_info["valuation"]
            
            try:
                # Handle zero valuations using proper standardized calculation (exclude from final valuation)
                # No special hardcoding - let the standardized endpoint handle the £0 edge case
                
                # For negative valuations, log error and skip
                if valuation < 0:
                    logger.error(f"Cannot calculate IRR for negative valuation: {valuation}")
                    calculation_results.append({
                        "status": "error",
                        "error": f"Cannot calculate IRR for negative valuation: {valuation}",
                        "portfolio_fund_id": portfolio_fund_id
                    })
                    continue
                
                # Calculate IRR for this fund with positive valuation
                from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
                logger.info(f"Calculating IRR for fund {portfolio_fund_id} using standardized endpoint for date {date}")
                
                # Use the standardized IRR calculation
                irr_result = await calculate_single_portfolio_fund_irr(
                    portfolio_fund_id=portfolio_fund_id,
                    irr_date=date,  # Use the provided date directly
                    db=db
                )
                
                logger.info(f"Standardized IRR calculation result for fund {portfolio_fund_id}: {irr_result}")
                
                if irr_result.get("success"):
                    # Extract IRR percentage from standardized response
                    irr_percentage = irr_result.get("irr_percentage", 0.0)
                    
                    # Store the IRR value in the portfolio_fund_irr_values table
                    irr_value_data = {
                        "fund_id": portfolio_fund_id,
                        "irr_result": float(irr_percentage),
                        "date": calculation_date.isoformat(),
                        "fund_valuation_id": fund_info.get("valuation_id")
                    }
                    
                    # Check if IRR already exists and update or insert
                    existing_irr = db.table("portfolio_fund_irr_values")\
                        .select("*")\
                        .eq("fund_id", portfolio_fund_id)\
                        .eq("date", calculation_date.isoformat())\
                        .execute()
                    
                    if existing_irr.data and len(existing_irr.data) > 0:
                        # Update existing
                        irr_id = existing_irr.data[0]["id"]
                        db.table("portfolio_fund_irr_values")\
                            .update({"irr_result": float(irr_percentage)})\
                            .eq("id", irr_id)\
                            .execute()
                    else:
                        # Insert new
                        db.table("portfolio_fund_irr_values").insert(irr_value_data).execute()
                    
                    calculation_results.append({
                        "portfolio_fund_id": portfolio_fund_id,
                        "status": "calculated",
                        "irr_value": irr_percentage,
                        "calculation_date": calculation_date.isoformat(),
                        "method": "standardized"
                    })
                    logger.info(f"Successfully calculated IRR for fund {portfolio_fund_id}: {irr_percentage}%")
                else:
                    # Handle error from standardized calculation
                    error_msg = f"Standardized IRR calculation failed: {irr_result}"
                    logger.error(error_msg)
                    calculation_results.append({
                        "portfolio_fund_id": portfolio_fund_id,
                        "status": "error",
                        "message": error_msg
                    })
                
            except Exception as e:
                logger.error(f"Error calculating IRR for fund {portfolio_fund_id}: {str(e)}")
                calculation_results.append({
                    "status": "error",
                    "error": str(e),
                    "portfolio_fund_id": portfolio_fund_id
                })
                
        # Return the results
        return {
            "status": "success" if all(r.get("status") == "success" for r in calculation_results) else "partial",
            "message": "IRR calculation completed" if not missing_valuations else "Some funds missing valuations",
            "portfolio_id": portfolio_id,
            "date": date,
            "missing_valuations": missing_valuations,
            "calculation_results": calculation_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating IRR: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate IRR: {str(e)}")

@router.get("/portfolios/with-template", response_model=List[PortfolioWithTemplate])
async def get_portfolios_with_template(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    status: Optional[str] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of portfolios with template information.
    Why it's needed: Provides a way to view and filter investment portfolios with their template origins.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'portfolios' table with optional filters
        3. Applies pagination parameters to limit result size
        4. For each portfolio with a template_generation_id, fetches the template info
        5. Returns the data as a list of PortfolioWithTemplate objects
    Expected output: A JSON array of portfolio objects with template details where applicable
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
        
        # If no portfolios found, return empty list
        if not result.data:
            return []
        
        portfolios = result.data
        
        # Get unique template IDs from portfolios that have them
        template_ids = {p["template_generation_id"] for p in portfolios if p.get("template_generation_id")}
        
        # Fetch all templates in one query if there are any
        templates_dict = {}
        if template_ids:
            templates_result = db.table("template_portfolio_generations").select("*").in_("id", list(template_ids)).execute()
            templates_dict = {t["id"]: t for t in templates_result.data}
        
        # Add template info to each portfolio
        for portfolio in portfolios:
            if portfolio.get("template_generation_id") and portfolio["template_generation_id"] in templates_dict:
                portfolio["template_info"] = templates_dict[portfolio["template_generation_id"]]
        
        return portfolios
    except Exception as e:
        logger.error(f"Error fetching portfolios with template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolios/{portfolio_id}/calculate-total-irr", response_model=dict)
async def calculate_portfolio_total_irr(
    portfolio_id: int,
    year: int = Query(..., ge=1900, le=2100, description="Year for the calculations"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves the latest portfolio IRR from the latest_portfolio_irr_values view.
    Why it's needed: Product IRR = Latest Portfolio IRR (not calculated, just retrieved).
    How it works:
        1. Checks if the portfolio exists
        2. Fetches the latest portfolio IRR from the latest_portfolio_irr_values view
        3. Returns the IRR value and calculation date
    Expected output: A JSON object with the latest portfolio IRR value
    """
    try:
        # Check if portfolio exists
        portfolio_result = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not portfolio_result.data or len(portfolio_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")

        # Get the latest portfolio IRR from the view
        portfolio_irr_result = db.table("latest_portfolio_irr_values")\
            .select("irr_result, irr_date")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not portfolio_irr_result.data or len(portfolio_irr_result.data) == 0:
            # No IRR found for this portfolio
            logger.info(f"No portfolio IRR found for portfolio {portfolio_id}")
            return {
                "status": "success",
                "portfolio_id": portfolio_id,
                "irr_percentage": 0.0,  # Changed from irr_value to irr_percentage to match frontend expectation
                "valuation_date": datetime.now().isoformat(),  # Changed from calculation_date to valuation_date to match frontend expectation
                "note": "No portfolio IRR found - returning 0%"
            }
        
        # Extract the IRR data
        irr_data = portfolio_irr_result.data[0]
        irr_percentage = float(irr_data.get("irr_result", 0))
        irr_date = irr_data.get("irr_date")
        
        logger.info(f"Retrieved portfolio IRR for portfolio {portfolio_id}: {irr_percentage}%")
            
        return {
            "status": "success",
            "portfolio_id": portfolio_id,
            "irr_percentage": irr_percentage,  # Changed from irr_value to irr_percentage to match frontend expectation
            "valuation_date": irr_date if irr_date else datetime.now().isoformat(),  # Changed from calculation_date to valuation_date to match frontend expectation
            "note": "Retrieved from latest_portfolio_irr_values"
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving portfolio total IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve portfolio IRR: {str(e)}")

@router.get("/portfolios/{portfolio_id}/complete", response_model=dict)
async def get_complete_portfolio(
    portfolio_id: int,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a complete portfolio with all related data in a single query.
    Why it's needed: Dramatically improves frontend performance by eliminating multiple sequential API calls.
    How it works:
        1. Fetches portfolio details
        2. Fetches all portfolio funds with their details
        3. Fetches the latest valuation for each fund
        4. Fetches the latest IRR value for each fund
        5. Returns all data in a structured response
    Expected output: A JSON object containing the portfolio with all its funds, valuations, and IRR data
    """
    try:

        
        # Get portfolio details
        portfolio_result = db.table("portfolios")\
            .select("*")\
            .eq("id", portfolio_id)\
            .execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        portfolio = portfolio_result.data[0]
        
        # Get template generation details
        template_generation = None
        if portfolio.get("template_generation_id") is not None:
            template_result = db.table("template_portfolio_generations")\
                .select("*")\
                .eq("id", portfolio["template_generation_id"])\
                .execute()
            
            template_generation = template_result.data[0] if template_result.data else None
        
        # Get portfolio funds
        portfolio_funds_result = db.table("portfolio_funds")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        # 🔍 DEBUG: Log all portfolio funds from database
        logger.info(f"🔍 DEBUG: get_complete_portfolio for portfolio {portfolio_id}")
        if portfolio_funds_result.data:
            logger.info(f"🔍 DEBUG: Found {len(portfolio_funds_result.data)} portfolio funds:")
            for i, pf in enumerate(portfolio_funds_result.data):
                logger.info(f"🔍 DEBUG: Fund {i+1}: ID={pf.get('id')}, AvailableFundID={pf.get('available_funds_id')}, Status={pf.get('status', 'active')}")
        else:
            logger.info("🔍 DEBUG: No portfolio funds found")
        
        if not portfolio_funds_result.data:
            # Return portfolio data even if no funds
            return {
                "portfolio": portfolio,
                "template_generation": template_generation,
                "funds": [],
                "valuations": [],
                "irr_values": []
            }
        
        portfolio_funds = portfolio_funds_result.data
        fund_ids = [pf["id"] for pf in portfolio_funds]
        
        # Get available fund details
        available_fund_ids = list(set([pf["available_funds_id"] for pf in portfolio_funds]))
        available_funds_result = db.table("available_funds")\
            .select("*")\
            .in_("id", available_fund_ids)\
            .execute()
        
        available_funds_lookup = {af["id"]: af for af in available_funds_result.data} if available_funds_result.data else {}
        
        # Get latest valuations
        valuations_result = db.table("latest_portfolio_fund_valuations")\
            .select("*")\
            .in_("portfolio_fund_id", fund_ids)\
            .execute()
        
        # Get latest IRR values
        irr_result = db.table("latest_portfolio_fund_irr_values")\
            .select("*")\
            .in_("fund_id", fund_ids)\
            .execute()
        
        if not irr_result.data:
            irr_values = []
        else:
            irr_values = irr_result.data
        
        # Create lookup maps for enhanced fund data
        valuations_lookup = {val["portfolio_fund_id"]: val for val in (valuations_result.data or [])}
        irr_lookup = {irr["fund_id"]: irr for irr in irr_values}
        
        # Enhance portfolio funds with related data
        for fund in portfolio_funds:
            fund_id = fund["id"]
            available_funds_id = fund.get("available_funds_id")
            
            # Add fund details
            if available_funds_id and available_funds_id in available_funds_lookup:
                fund_details = available_funds_lookup[available_funds_id]
                fund["fund_details"] = fund_details
                fund["fund_name"] = fund_details.get("fund_name")
                fund["isin_number"] = fund_details.get("isin_number")
                fund["risk_factor"] = fund_details.get("risk_factor")
            
            # Add latest valuation
            if fund_id in valuations_lookup:
                valuation = valuations_lookup[fund_id]
                fund["latest_valuation"] = valuation
                fund["market_value"] = valuation.get("valuation")
                fund["valuation_date"] = valuation.get("valuation_date")
            
            # Add IRR data
            if fund_id in irr_lookup:
                irr_data = irr_lookup[fund_id]
                fund["irr_result"] = irr_data.get("irr_result")
                fund["irr_date"] = irr_data.get("irr_date")
            else:
                fund["irr_result"] = None
                fund["irr_date"] = None
        
        # Construct the complete response in the expected format
        response = {
            "portfolio": portfolio,
            "template_info": template_generation,
            "portfolio_funds": portfolio_funds,
            "valuations_map": valuations_lookup,
            "irr_map": irr_lookup
        }
        
        # 🔍 DEBUG: Log final response portfolio_funds
        logger.info(f"🔍 DEBUG: Final response contains {len(portfolio_funds)} portfolio_funds:")
        for i, pf in enumerate(portfolio_funds):
            logger.info(f"🔍 DEBUG: Response Fund {i+1}: ID={pf.get('id')}, Name={pf.get('fund_name')}, Status={pf.get('status', 'active')}")
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching complete portfolio data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/latest-irr", response_model=dict)
async def get_latest_portfolio_irr(portfolio_id: int, db = Depends(get_db)):
    """
    Optimized endpoint to fetch stored portfolio IRR from latest_portfolio_irr_values view.
    This eliminates the need to recalculate IRR when the stored value is sufficient.
    """
    try:
        # Query the latest_portfolio_irr_values view
        result = db.table("latest_portfolio_irr_values") \
                   .select("portfolio_id, irr_result, irr_date") \
                   .eq("portfolio_id", portfolio_id) \
                   .execute()
        
        if result.data and len(result.data) > 0:
            irr_data = result.data[0]
            response_data = {
                "portfolio_id": portfolio_id,
                "irr_result": irr_data["irr_result"],
                "irr_date": irr_data["irr_date"],
                "source": "stored"
            }
            return response_data
        else:
            response_data = {
                "portfolio_id": portfolio_id,
                "irr_result": None,
                "irr_date": None,
                "source": "not_found"
            }
            return response_data
    except Exception as e:
        logger.error(f"❌ [IRR DEBUG] Error fetching stored IRR for portfolio {portfolio_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/irr-history", response_model=dict)
async def get_portfolio_irr_history(
    portfolio_id: int, 
    months: int = Query(12, ge=1, le=60, description="Number of months of history to return"),
    db = Depends(get_db)
):
    """
    Get historical IRR values for portfolio comparison reporting.
    Used when historical IRR analysis is specifically requested.
    """
    try:
        # Query historical IRR values from portfolio_irr_values table
        result = db.table("portfolio_irr_values") \
                   .select("irr_result, date, calculation_method") \
                   .eq("portfolio_id", portfolio_id) \
                   .order("date", desc=True) \
                   .limit(months) \
                   .execute()
        
        return {
            "portfolio_id": portfolio_id,
            "history": result.data or [],
            "count": len(result.data) if result.data else 0
        }
    except Exception as e:
        logger.error(f"Error fetching IRR history for portfolio {portfolio_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/activity_logs", response_model=dict)
async def get_portfolio_activity_logs(
    portfolio_id: int,
    year: Optional[int] = None,
    month: Optional[int] = None,
    activity_type: Optional[str] = None,
    summary: bool = False,
    db = Depends(get_db)
):
    """
    What it does: Retrieves all activity logs for a portfolio with optional filtering and summarization.
    Why it's needed: Optimizes frontend performance by providing filtered and/or summarized activity data.
    How it works:
        1. Fetches all activity logs for the portfolio's funds
        2. Applies optional filtering by year, month, and activity type
        3. If summary=True, provides aggregated statistics by activity type and fund
        4. Returns organized data for efficient frontend processing
    Expected output: A JSON object containing activity logs and optionally summary statistics
    """
    try:

        
        # First check if the portfolio exists
        portfolio_result = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not portfolio_result.data or len(portfolio_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        # Get all portfolio funds
        portfolio_funds_result = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_id).execute()
        if not portfolio_funds_result.data:
            return {"activity_logs": [], "summary": {}}
        
        # Extract portfolio fund IDs
        portfolio_fund_ids = [fund["id"] for fund in portfolio_funds_result.data]
        
        # Build the activity logs query
        query = db.table("holding_activity_log").select("*").in_("portfolio_fund_id", portfolio_fund_ids)
        
        # Apply filters if provided
        if year:
            # Filter by year
            start_date = datetime(year, 1, 1).isoformat()
            end_date = datetime(year + 1, 1, 1).isoformat()
            query = query.gte("activity_timestamp", start_date).lt("activity_timestamp", end_date)
        
        if month and year:
            # Filter by specific month
            start_date = datetime(year, month, 1).isoformat()
            # Calculate end date (handle December)
            if month == 12:
                end_date = datetime(year + 1, 1, 1).isoformat()
            else:
                end_date = datetime(year, month + 1, 1).isoformat()
            query = query.gte("activity_timestamp", start_date).lt("activity_timestamp", end_date)
        
        if activity_type:
            query = query.eq("activity_type", activity_type)
        
        # Order by timestamp descending
        query = query.order("activity_timestamp", desc=True)
        
        # Execute the query
        activity_result = query.execute()
        activity_logs = activity_result.data or []

        
        # Prepare the response
        response = {
            "activity_logs": activity_logs,
            "summary": {}
        }
        
        # Generate summary data if requested
        if summary and activity_logs:
            # Count by activity type
            activity_type_counts = {}
            for log in activity_logs:
                activity_type = log.get("activity_type", "Unknown")
                activity_type_counts[activity_type] = activity_type_counts.get(activity_type, 0) + 1
            
            # Total by activity type
            activity_type_totals = {}
            for log in activity_logs:
                activity_type = log.get("activity_type", "Unknown")
                amount = log.get("amount", 0)
                activity_type_totals[activity_type] = activity_type_totals.get(activity_type, 0) + amount
            
            # Activity summary by fund
            fund_activity_summary = {}
            for log in activity_logs:
                fund_id = log.get("portfolio_fund_id")
                activity_type = log.get("activity_type", "Unknown")
                amount = log.get("amount", 0)
                
                if fund_id not in fund_activity_summary:
                    fund_activity_summary[fund_id] = {}
                
                if activity_type not in fund_activity_summary[fund_id]:
                    fund_activity_summary[fund_id][activity_type] = 0
                
                fund_activity_summary[fund_id][activity_type] += amount
            
            # Add summary to response
            response["summary"] = {
                "activity_type_counts": activity_type_counts,
                "activity_type_totals": activity_type_totals,
                "fund_activity_summary": fund_activity_summary
            }
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching portfolio activity logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
