from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from datetime import date, datetime
from pydantic import BaseModel

from app.models.portfolio import Portfolio, PortfolioCreate, PortfolioUpdate, PortfolioWithTemplate, TemplateInfo
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
        3. Adds the CASHLINE fund with 0% weighting by default
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
            
            # Always add the CASHLINE fund to every new portfolio
            logger.info(f"Adding CASHLINE fund to portfolio {new_portfolio['id']}")
            
            # Find the CASHLINE fund
            cashline_fund_result = db.table("available_funds").select("*").eq("isin_number", "CASHLINE").limit(1).execute()
            
            if cashline_fund_result.data and len(cashline_fund_result.data) > 0:
                cashline_fund = cashline_fund_result.data[0]
                logger.info(f"Found CASHLINE fund with ID {cashline_fund['id']}")
                
                # Get the same start date as the portfolio
                portfolio_start_date = data_dict['start_date']
                
                # Add CASHLINE fund with 0% weighting
                cashline_fund_data = {
                    "portfolio_id": new_portfolio["id"],
                    "available_funds_id": cashline_fund["id"],
                    "weighting": 0,  # 0% weighting
                    "start_date": portfolio_start_date,
                    "amount_invested": 0  # No initial investment
                }
                
                cashline_result = db.table("portfolio_funds").insert(cashline_fund_data).execute()
                if cashline_result.data and len(cashline_result.data) > 0:
                    logger.info(f"Successfully added CASHLINE fund to portfolio {new_portfolio['id']}")
                else:
                    logger.warning(f"Failed to add CASHLINE fund to portfolio {new_portfolio['id']}")
            else:
                logger.warning("CASHLINE fund not found in available_funds table")
                
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
        
        # If portfolio has an original_template_id, get the template info
        if portfolio.get("original_template_id"):
            template_result = db.table("available_portfolios") \
                .select("*") \
                .eq("id", portfolio["original_template_id"]) \
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
            "start_date": today,  # Set to today's date
            "original_template_id": template_data.template_id  # Add template ID reference
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
            logger.warning(f"Found duplicate funds in template {template_data.template_id}: {duplicates}")
            
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
                "weighting": fund["target_weighting"],
                "start_date": today,  # Use the same start_date as the portfolio
                "amount_invested": 0  # Initial amount is zero
            }
            
            db.table("portfolio_funds").insert(fund_data).execute()
            added_fund_ids.add(fund_id)  # Mark as added
        
        # Always add the CASHLINE fund if it's not already included in the template
        # Find if CASHLINE is already added
        cashline_fund_included = False
        for fund in template_funds_response.data:
            # Get fund details to check if it's the CASHLINE fund
            fund_details = db.table("available_funds").select("*").eq("id", fund["fund_id"]).execute()
            if fund_details.data and len(fund_details.data) > 0:
                if fund_details.data[0].get("isin_number") == "CASHLINE":
                    cashline_fund_included = True
                    logger.info(f"CASHLINE fund already included in template {template_data.template_id}")
                    break
        
        # If CASHLINE not already included, add it
        if not cashline_fund_included:
            logger.info(f"Adding CASHLINE fund to portfolio {new_portfolio['id']}")
            # Find the CASHLINE fund
            cashline_fund_result = db.table("available_funds").select("*").eq("isin_number", "CASHLINE").limit(1).execute()
            
            if cashline_fund_result.data and len(cashline_fund_result.data) > 0:
                cashline_fund = cashline_fund_result.data[0]
                logger.info(f"Found CASHLINE fund with ID {cashline_fund['id']}")
                
                # Add CASHLINE fund with 0% weighting
                cashline_fund_data = {
                    "portfolio_id": new_portfolio["id"],
                    "available_funds_id": cashline_fund["id"],
                    "weighting": 0,  # 0% weighting
                    "start_date": today,
                    "amount_invested": 0  # No initial investment
                }
                
                cashline_result = db.table("portfolio_funds").insert(cashline_fund_data).execute()
                if cashline_result.data and len(cashline_result.data) > 0:
                    logger.info(f"Successfully added CASHLINE fund to portfolio {new_portfolio['id']}")
                else:
                    logger.warning(f"Failed to add CASHLINE fund to portfolio {new_portfolio['id']}")
            else:
                logger.warning("CASHLINE fund not found in available_funds table")
        
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
        
        # Get the most recent valuation date that exists for all portfolio funds
        most_recent_valuation_dates = []
        
        for fund in portfolio_funds:
            fund_id = fund["id"]
            logger.info(f"Checking valuations for fund {fund_id}")
            
            # Get the most recent valuation for this fund
            latest_valuation = db.table("fund_valuations")\
                .select("*")\
                .eq("portfolio_fund_id", fund_id)\
                .order("valuation_date", desc=True)\
                .limit(1)\
                .execute()
                
            if not latest_valuation.data or len(latest_valuation.data) == 0:
                # If any fund doesn't have a valuation, we can't calculate IRR
                logger.error(f"No valuation found for portfolio fund ID {fund_id}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Portfolio fund ID {fund_id} has no valuations. All funds must have valuations to calculate IRR."
                )
                
            # Add the date to our list
            valuation_date = datetime.fromisoformat(latest_valuation.data[0]["valuation_date"])
            most_recent_valuation_dates.append({
                "portfolio_fund_id": fund_id,
                "date": valuation_date,
                "valuation": latest_valuation.data[0]["value"],
                "valuation_id": latest_valuation.data[0]["id"]  # Include the valuation ID to ensure we're using the right record
            })
            logger.info(f"Fund {fund_id} has most recent valuation date: {valuation_date.isoformat()}")
        
        # Get the earliest date from the most recent valuations
        # (This ensures all funds have a valuation on or after this date)
        if not most_recent_valuation_dates:
            raise HTTPException(status_code=400, detail="No valuations found for any portfolio funds")
            
        # Sort by date in ascending order and take the earliest (so all funds have valuations on or after this date)
        most_recent_valuation_dates.sort(key=lambda x: x["date"])
        common_date = most_recent_valuation_dates[0]["date"]
        common_date_iso = common_date.isoformat()
        logger.info(f"Using common date for calculations: {common_date_iso}")
        
        # Format as year and month for IRR calculation
        year = common_date.year
        month = common_date.month
        
        # Calculate IRR for each portfolio fund
        calculation_results = []
        funds_to_calculate = []
        funds_with_existing_irr = []
        
        for fund_data in most_recent_valuation_dates:
            portfolio_fund_id = fund_data["portfolio_fund_id"]
            valuation = float(fund_data["valuation"])
            valuation_date = fund_data["date"]
            valuation_id = fund_data["valuation_id"]
            
            # This log line will help identify where activity logs are needed but missing
            logger.info(f"Checking fund {portfolio_fund_id} for IRR calculation, valuation: {valuation}")
            
            # Check if IRR already exists for this date - use consistent string format for comparison
            existing_irr = db.table("irr_values")\
                .select("*")\
                .eq("fund_id", portfolio_fund_id)\
                .eq("date", common_date_iso)\
                .execute()
            
            logger.info(f"Found {len(existing_irr.data) if existing_irr.data else 0} existing IRR record(s) for fund {portfolio_fund_id}")
            
            # Special handling for zero valuations - always set IRR to zero
            if valuation == 0:
                logger.info(f"Zero valuation detected for fund {portfolio_fund_id} - storing IRR value of 0")
                
                irr_value_data = {
                    "fund_id": portfolio_fund_id,
                    "irr_result": 0.0,  # Set IRR to zero
                    "date": valuation_date.isoformat(),
                    "fund_valuation_id": valuation_id
                }
                
                if existing_irr.data and len(existing_irr.data) > 0:
                    # Update existing record
                    irr_id = existing_irr.data[0]["id"]
                    db.table("irr_values")\
                        .update({"irr_result": 0.0})\
                        .eq("id", irr_id)\
                        .execute()
                    
                    calculation_results.append({
                        "portfolio_fund_id": portfolio_fund_id,
                        "status": "calculated",
                        "irr_value": 0.0,
                        "existing_irr": existing_irr.data[0]["irr_result"] if "irr_result" in existing_irr.data[0] else None
                    })
                else:
                    # Create new record
                    db.table("irr_values").insert(irr_value_data).execute()
                    
                    calculation_results.append({
                        "portfolio_fund_id": portfolio_fund_id,
                        "status": "calculated",
                        "irr_value": 0.0,
                        "existing_irr": None
                    })
                
                logger.info(f"Successfully set IRR to 0 for zero valuation on date: {valuation_date.isoformat()}")
                continue
            
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
                # IRR already exists for this fund on this date
                funds_with_existing_irr.append(portfolio_fund_id)
                calculation_results.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "status": "skipped",
                    "message": "IRR already exists for this date",
                    "existing_irr": existing_irr.data[0]["irr_result"]
                })
                logger.info(f"Skipping IRR calculation for fund {portfolio_fund_id} - already exists with value {existing_irr.data[0]['irr_result']}")
            else:
                # Add to list of funds that need calculation
                funds_to_calculate.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "valuation": valuation,
                    "valuation_id": valuation_id
                })
                logger.info(f"Fund {portfolio_fund_id} needs IRR calculation")
        
        # Calculate IRR for funds that need it
        logger.info(f"Found {len(funds_to_calculate)} funds needing IRR calculation and {len(funds_with_existing_irr)} funds with existing IRR")
        
        for fund_info in funds_to_calculate:
            portfolio_fund_id = fund_info["portfolio_fund_id"]
            valuation = fund_info["valuation"]
            
            try:
                # Calculate IRR for this fund
                from app.api.routes.portfolio_funds import calculate_portfolio_fund_irr_sync
                logger.info(f"Calculating IRR for fund {portfolio_fund_id}, month={month}, year={year}, valuation={valuation}")
                
                # Pass the fund_valuation_id directly to ensure we're using the correct valuation
                irr_result = calculate_portfolio_fund_irr_sync(
                    portfolio_fund_id=portfolio_fund_id,
                    month=month,
                    year=year,
                    valuation=valuation,
                    db=db,
                    fund_valuation_id=fund_info.get("valuation_id")
                )
                
                logger.info(f"IRR calculation result for fund {portfolio_fund_id}: {irr_result}")
                
                if irr_result.get("status") == "error":
                    # This is an error response from the calculation function
                    error_msg = irr_result.get("error", "Unknown error during IRR calculation")
                    calculation_results.append({
                        "portfolio_fund_id": portfolio_fund_id,
                        "status": "error",
                        "message": error_msg,
                        "date_info": f"Month: {month}, Year: {year}"
                    })
                    logger.error(f"Error in IRR calculation for fund {portfolio_fund_id}: {error_msg}")
                else:
                    # This is a successful calculation
                    calculation_results.append({
                        "portfolio_fund_id": portfolio_fund_id,
                        "status": "calculated",
                        "irr_value": irr_result.get("irr_percentage"),
                        "message": "IRR calculated successfully"
                    })
                    logger.info(f"Successfully calculated IRR for fund {portfolio_fund_id}: {irr_result.get('irr_percentage')}%")
                
            except Exception as e:
                error_message = str(e)
                logger.error(f"Error calculating IRR for fund ID {portfolio_fund_id}: {error_message}")
                logger.error(f"Date: {common_date_iso}, Month: {month}, Year: {year}, Valuation: {valuation}")
                
                # Get activity logs for this fund to help troubleshoot
                try:
                    activity_logs = db.table("holding_activity_log")\
                        .select("*")\
                        .eq("portfolio_fund_id", portfolio_fund_id)\
                        .execute()
                        
                    log_count = len(activity_logs.data) if activity_logs.data else 0
                    logger.info(f"Fund {portfolio_fund_id} has {log_count} activity logs")
                    
                    if log_count == 0:
                        detailed_error = f"{error_message}. Fund has no activity logs. IRR calculation requires cash flow activities."
                    else:
                        detailed_error = f"{error_message}. Fund has {log_count} activity logs."
                except Exception as log_err:
                    detailed_error = f"{error_message}. Could not retrieve activity logs: {str(log_err)}"
                
                calculation_results.append({
                    "portfolio_fund_id": portfolio_fund_id,
                    "status": "error",
                    "message": detailed_error,
                    "date_info": f"Month: {month}, Year: {year}"
                })
        
        # Count the results by status
        successful = sum(1 for r in calculation_results if r["status"] == "calculated")
        skipped = sum(1 for r in calculation_results if r["status"] == "skipped")
        failed = sum(1 for r in calculation_results if r["status"] == "error")
        
        logger.info(f"IRR calculation complete for {successful} funds on {common_date.strftime('%d/%m/%Y')}. Skipped {skipped} funds with existing IRR values.")
        
        return {
            "portfolio_id": portfolio_id,
            "calculation_date": common_date_iso,
            "total_funds": len(portfolio_funds),
            "successful": successful,
            "skipped": skipped,
            "failed": failed,
            "details": calculation_results
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
            
            valuation = db.table("fund_valuations")\
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
                    "valuation": float(valuation.data[0]["value"]),
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
                # Special handling for zero valuations
                if valuation == 0:
                    logger.info(f"Zero valuation detected for fund {portfolio_fund_id} - storing IRR value of 0")
                    
                    # Get the valuation date from the valuation record
                    valuation_date = datetime.fromisoformat(fund_info["valuation_date"])
                    
                    # Check if IRR already exists for this date
                    existing_irr = db.table("irr_values")\
                        .select("*")\
                        .eq("fund_id", portfolio_fund_id)\
                        .eq("date", valuation_date.isoformat())\
                        .execute()
                    
                    irr_value_data = {
                        "fund_id": portfolio_fund_id,
                        "irr_result": 0.0,  # Set IRR to zero
                        "date": valuation_date.isoformat(),
                        "fund_valuation_id": fund_info.get("valuation_id")
                    }
                    
                    if existing_irr.data and len(existing_irr.data) > 0:
                        # Update existing record
                        irr_id = existing_irr.data[0]["id"]
                        db.table("irr_values")\
                            .update({"irr_result": 0.0})\
                            .eq("id", irr_id)\
                            .execute()
                    else:
                        # Create new record
                        db.table("irr_values").insert(irr_value_data).execute()
                    
                    calculation_results.append({
                        "status": "success",
                        "irr_percentage": 0.0,
                        "portfolio_fund_id": portfolio_fund_id,
                        "date": valuation_date.isoformat(),
                        "calculation_type": "zero_valuation"
                    })
                    
                    logger.info(f"Successfully set IRR to 0 for zero valuation on date: {valuation_date.isoformat()}")
                    continue
                
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
                from app.api.routes.portfolio_funds import calculate_portfolio_fund_irr_sync
                logger.info(f"Calculating IRR for fund {portfolio_fund_id}, month={month}, year={year}, valuation={valuation}")
                
                # Pass the fund_valuation_id directly to ensure we're using the correct valuation
                irr_result = calculate_portfolio_fund_irr_sync(
                    portfolio_fund_id=portfolio_fund_id,
                    month=month,
                    year=year,
                    valuation=valuation,
                    db=db,
                    fund_valuation_id=fund_info.get("valuation_id")
                )
                
                logger.info(f"IRR calculation result for fund {portfolio_fund_id}: {irr_result}")
                
                if irr_result.get("status") == "error":
                    # This is an error response from the calculation function
                    error_msg = irr_result.get("error", "Unknown error during IRR calculation")
                    calculation_results.append({
                        "portfolio_fund_id": portfolio_fund_id,
                        "status": "error",
                        "message": error_msg,
                        "date_info": f"Month: {month}, Year: {year}"
                    })
                    logger.error(f"Error in IRR calculation for fund {portfolio_fund_id}: {error_msg}")
                else:
                    # This is a successful calculation
                    calculation_results.append({
                        "portfolio_fund_id": portfolio_fund_id,
                        "status": "calculated",
                        "irr_value": irr_result.get("irr_percentage"),
                        "message": "IRR calculated successfully"
                    })
                    logger.info(f"Successfully calculated IRR for fund {portfolio_fund_id}: {irr_result.get('irr_percentage')}%")
                
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
        4. For each portfolio with an original_template_id, fetches the template info
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
        
        # Create a set of all template IDs to fetch in a single query
        template_ids = {p["original_template_id"] for p in portfolios if p.get("original_template_id")}
        
        # If there are templates to fetch, get them all at once
        templates_dict = {}
        if template_ids:
            templates_query = db.table("available_portfolios").select("*").in_("id", list(template_ids)).execute()
            if templates_query.data:
                templates_dict = {t["id"]: t for t in templates_query.data}
        
        # Add template info to each portfolio
        for portfolio in portfolios:
            if portfolio.get("original_template_id") and portfolio["original_template_id"] in templates_dict:
                portfolio["template_info"] = templates_dict[portfolio["original_template_id"]]
        
        return portfolios
    except Exception as e:
        logger.error(f"Error fetching portfolios with template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
