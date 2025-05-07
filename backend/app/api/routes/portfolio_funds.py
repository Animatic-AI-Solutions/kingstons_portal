from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional
import logging
from datetime import datetime, date
import numpy_financial as npf
from decimal import Decimal

from app.models.portfolio_fund import PortfolioFund, PortfolioFundCreate, PortfolioFundUpdate
from app.models.irr_value import IRRValueCreate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def calculate_excel_style_irr(dates, amounts, guess=0.02):
    """
    Calculate IRR for the investment period using numpy_financial.
    Creates artificial monthly periods to handle irregular cash flows.
    All cash flows within the same month are totaled together.
    
    Parameters:
    - dates: List of datetime objects for each cash flow
    - amounts: List of cash flow amounts (negative for outflows, positive for inflows)
    - guess: Initial guess for IRR calculation (not used with numpy_financial)
    
    Returns:
    - Dictionary containing:
        - period_irr: The annualized IRR (monthly IRR * 12) as decimal
        - days_in_period: Number of days in the investment period
    """
    # Basic input validation
    if not dates or not amounts or len(dates) != len(amounts):
        error_msg = f"Invalid inputs: dates={len(dates) if dates else 0}, amounts={len(amounts) if amounts else 0}"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    if len(dates) < 2 or len(amounts) < 2:
        error_msg = "IRR calculation requires at least two cash flows (one initial investment and one return)"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    # Validate cash flows
    if not any(amount < 0 for amount in amounts):
        error_msg = "IRR calculation requires at least one negative cash flow (investment)"
        logger.error(error_msg)
        raise ValueError(error_msg)
        
    if not any(amount > 0 for amount in amounts):
        error_msg = "IRR calculation requires at least one positive cash flow (return or final valuation)"
        logger.error(error_msg)
        raise ValueError(error_msg)
        
    try:
        # Log input data for debugging
        logger.info(f"IRR calculation input - dates: {[d.isoformat() for d in dates]}")
        logger.info(f"IRR calculation input - amounts: {amounts}")
        
        # Sort cash flows by date to ensure chronological order
        sorted_flows = sorted(zip(dates, amounts), key=lambda x: x[0])
        dates = [d for d, _ in sorted_flows]
        amounts = [a for _, a in sorted_flows]
        
        # Check if all dates are the same
        if all(d == dates[0] for d in dates):
            logger.warning("All cash flow dates are identical - using simple return calculation instead of IRR")
            # Calculate simple return: (ending_value - initial_investment) / initial_investment
            total_outflow = sum(a for a in amounts if a < 0)  # Sum of all negative cash flows
            total_inflow = sum(a for a in amounts if a > 0)   # Sum of all positive cash flows
            
            if total_outflow == 0:
                error_msg = "Cannot calculate return: total investment amount is zero"
                logger.error(error_msg)
                raise ValueError(error_msg)
                
            simple_return = total_inflow / abs(total_outflow) - 1
            logger.info(f"Simple return calculation: {simple_return}")
            
            # Since all cash flows are on the same day, the period is effectively 0 days
            # We'll return the simple return as the IRR
            return {
                'period_irr': simple_return,
                'days_in_period': 0,
                'is_simple_return': True
            }
        
        # Get the start and end dates
        start_date = dates[0]
        end_date = dates[-1]
        
        # Check for future dates
        now = datetime.now()
        future_dates = [d for d in dates if d > now]
        if future_dates:
            logger.warning(f"IRR calculation includes {len(future_dates)} future dates. This may affect the result.")
        
        logger.info(f"Start date details: year={start_date.year}, month={start_date.month}, day={start_date.day}")
        logger.info(f"End date details: year={end_date.year}, month={end_date.month}, day={end_date.day}")
        
        # Check if the investment period is too short
        if (end_date - start_date).days < 1:
            logger.warning("Investment period is less than 1 day - using simple return calculation")
            # Calculate simple return: (ending_value - initial_investment) / initial_investment
            total_outflow = sum(a for a in amounts if a < 0)  # Sum of all negative cash flows
            total_inflow = sum(a for a in amounts if a > 0)   # Sum of all positive cash flows
            
            if total_outflow == 0:
                error_msg = "Cannot calculate return: total investment amount is zero"
                logger.error(error_msg)
                raise ValueError(error_msg)
                
            simple_return = total_inflow / abs(total_outflow) - 1
            logger.info(f"Simple return calculation: {simple_return}")
            
            return {
                'period_irr': simple_return,
                'days_in_period': (end_date - start_date).days,
                'is_simple_return': True
            }
        
        # Calculate total number of months between start and end
        total_months = ((end_date.year - start_date.year) * 12) + (end_date.month - start_date.month)
        logger.info(f"Calculated total_months: {total_months}")
        
        if total_months < 1:
            logger.warning("Investment period is less than one month - using simple IRR calculation")
            # For very short periods, we'll calculate a simple IRR using just the initial and final cash flows
            initial_investment = amounts[0]
            final_value = amounts[-1]
            
            # Calculate simple return
            simple_return = final_value / abs(initial_investment) - 1
            
            # Annualize the return based on days
            days = (end_date - start_date).days
            annualized_return = (1 + simple_return) ** (365 / max(1, days)) - 1
            
            logger.info(f"Simple return: {simple_return}, Annualized: {annualized_return}")
            
            return {
                'period_irr': annualized_return,
                'days_in_period': days,
                'is_simple_return': True
            }
        
        # Create array for all months in the period (initialized to zero)
        monthly_amounts = [0] * (total_months + 1)
        logger.info(f"Created monthly_amounts array with {len(monthly_amounts)} elements")
        
        # Map all cash flows to their corresponding months, totaling flows within same month
        for date, amount in zip(dates, amounts):
            month_index = ((date.year - start_date.year) * 12) + (date.month - start_date.month)
            if month_index < 0 or month_index >= len(monthly_amounts):
                error_msg = f"Invalid month index: {month_index} for date {date.isoformat()}"
                logger.error(error_msg)
                raise ValueError(error_msg)
                
            logger.info(f"Mapping flow: date={date.isoformat()}, amount={amount}, month_index={month_index}")
            monthly_amounts[month_index] += amount  # Add to any existing amount for that month
        
        # Debug logging
        logger.info("\nCash flow sequence:")
        initial_investment = abs(monthly_amounts[0])
        intermediate_flows = sum(monthly_amounts[1:-1])
        final_value = monthly_amounts[-1]
        
        logger.info(f"Start date: {start_date.strftime('%Y-%m')}")
        logger.info(f"End date: {end_date.strftime('%Y-%m')}")
        logger.info(f"Total months: {total_months + 1}")
        
        # Check if final value is positive (as expected for IRR calculation)
        if final_value <= 0:
            error_msg = f"Final cash flow (valuation) must be positive, but got {final_value}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Check if we have a valid investment pattern (negative initial flow, positive final flow)
        if monthly_amounts[0] >= 0:
            error_msg = f"Initial cash flow should be negative (investment), but got {monthly_amounts[0]}"
            logger.warning(error_msg)  # Warning only, as this might work in some cases
        
        logger.info("\nMonthly cash flows:")
        for i, amount in enumerate(monthly_amounts):
            logger.info(f"Month {i}: {amount}")
        
        # Calculate IRR using the monthly cash flows
        logger.info("Calculating IRR using numpy_financial.irr...")
        try:
            monthly_irr = npf.irr(monthly_amounts)
            logger.info(f"Raw monthly IRR calculation result: {monthly_irr}")
        except Exception as calc_err:
            error_msg = f"NumPy IRR calculation error: {str(calc_err)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        if monthly_irr is None:
            error_msg = "Could not calculate IRR - no valid solution found. Check for alternating sign pattern in cash flows."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Check for extreme IRR values that might indicate an error
        if abs(monthly_irr) > 1:  # More than 100% monthly return
            logger.warning(f"Extreme IRR value detected: {monthly_irr}. This may indicate incorrect cash flow data.")
        
        # Annualize the monthly IRR by multiplying by 12
        annualized_irr = monthly_irr * 12
        logger.info(f"Annualized IRR (monthly_irr * 12): {annualized_irr}")
            
        days_in_period = (end_date - start_date).days
        logger.info(f"Days in period: {days_in_period}")
            
        logger.info(f"\nIRR Results:")
        logger.info(f"Monthly IRR: {monthly_irr * 100:.2f}%")
        logger.info(f"Annualized IRR: {annualized_irr * 100:.2f}%")
        logger.info(f"Months in period: {total_months + 1}")
        
        return {
            'period_irr': annualized_irr,  # Return annualized IRR instead of monthly IRR
            'days_in_period': days_in_period
        }
        
    except Exception as e:
        logger.error(f"Error in IRR calculation: {str(e)}")
        # Add stack trace for more detailed error information
        import traceback
        logger.error(f"IRR calculation stack trace: {traceback.format_exc()}")
        raise

def to_serializable(val):
    if isinstance(val, Decimal):
        return float(val)
    return val

router = APIRouter()

@router.get("/portfolio_funds", response_model=List[PortfolioFund])
async def get_portfolio_funds(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    portfolio_id: Optional[int] = None,
    available_funds_id: Optional[int] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves portfolio-fund associations based on optional filters.
    Why it's needed: Allows viewing the funds associated with specific portfolios.
    How it works:
        1. Takes optional filter parameters
        2. Builds a query to retrieve matching portfolio-fund associations
        3. Includes the latest valuation for each fund from the fund_valuations table
        4. Returns a list of matching associations with pagination
    Expected output: A JSON array containing portfolio fund associations
    """
    try:
        query = db.table("portfolio_funds").select("*")
        
        # Apply filters
        if portfolio_id is not None:
            query = query.eq("portfolio_id", portfolio_id)
            
        if available_funds_id is not None:
            query = query.eq("available_funds_id", available_funds_id)
            
        # Apply pagination
        query = query.range(skip, skip + limit - 1)
        
        # Execute the query
        result = query.execute()
        
        if not result.data:
            return []
            
        # Get all fund IDs
        fund_ids = [fund["id"] for fund in result.data]
        
        # Get the latest valuations for all funds in a single query if possible
        latest_valuations = {}
        
        if len(fund_ids) > 0:
            # Get the latest valuation for each fund from fund_valuations
            for fund_id in fund_ids:

                valuation_result = db.table("fund_valuations")\
                    .select("value", "valuation_date", "portfolio_fund_id")\
                    .eq("portfolio_fund_id", fund_id)\
                    .order("valuation_date", desc=True)\
                    .limit(1)\
                    .execute()
                    
                if valuation_result.data and len(valuation_result.data) > 0:
                    latest_valuations[fund_id] = {
                        "value": valuation_result.data[0]["value"],
                        "date": valuation_result.data[0]["valuation_date"]
                    }
        
        # Add valuations to the portfolio funds
        for fund in result.data:
            fund_id = fund["id"]
            if fund_id in latest_valuations:

                fund["market_value"] = float(latest_valuations[fund_id]["value"])

                fund["valuation_date"] = latest_valuations[fund_id]["date"]
        
        return result.data
    except Exception as e:
        logger.error(f"Error retrieving portfolio funds: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolio_funds", response_model=PortfolioFund)
async def create_portfolio_fund(
    portfolio_fund: PortfolioFundCreate,
    db = Depends(get_db)
):
    """
    Create a new portfolio fund association.
    """
    try:
        # Validate portfolio exists
        portfolio_result = db.table("portfolios").select("id").eq("id", portfolio_fund.portfolio_id).execute()
        if not portfolio_result.data or len(portfolio_result.data) == 0:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Validate fund exists
        fund_result = db.table("available_funds").select("id").eq("id", portfolio_fund.available_funds_id).execute()
        if not fund_result.data or len(fund_result.data) == 0:
            raise HTTPException(status_code=404, detail="Fund not found")
        
        # Create new portfolio fund
        # Ensure start_date is today if not provided
        today = date.today().isoformat()
        portfolio_fund_data = {
            "portfolio_id": portfolio_fund.portfolio_id,
            "available_funds_id": portfolio_fund.available_funds_id,
            "weighting": to_serializable(0 if portfolio_fund.weighting is None else portfolio_fund.weighting),
            "start_date": portfolio_fund.start_date.isoformat() if portfolio_fund.start_date else today,
            "amount_invested": to_serializable(0 if portfolio_fund.amount_invested is None else portfolio_fund.amount_invested)
        }
        
        result = db.table("portfolio_funds").insert(portfolio_fund_data).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create portfolio fund")
        # Use Pydantic model for serialization
        return PortfolioFund(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating portfolio fund: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolio_funds/{portfolio_fund_id}", response_model=PortfolioFund)
async def get_portfolio_fund(portfolio_fund_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single portfolio fund association by ID.
    Why it's needed: Allows viewing detailed information about a specific portfolio-fund association.
    How it works:
        1. Takes the portfolio_fund_id from the URL path
        2. Queries the 'portfolio_funds' table for a record with matching ID
        3. Fetches the latest valuation from fund_valuations if available
        4. Returns the association data or raises a 404 error if not found
    Expected output: A JSON object containing the requested portfolio fund's details
    """
    try:
        result = db.table("portfolio_funds").select("*").eq("id", portfolio_fund_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")
            
        # Get the portfolio fund data
        portfolio_fund = result.data[0]

        # Get latest valuation for this fund from fund_valuations
        valuation_result = db.table("fund_valuations")\
            .select("value", "valuation_date")\
            .eq("portfolio_fund_id", portfolio_fund_id)\
            .order("valuation_date", desc=True)\
            .limit(1)\
            .execute()
            
        if valuation_result.data and len(valuation_result.data) > 0:
            latest_valuation = valuation_result.data[0]
            portfolio_fund["market_value"] = float(latest_valuation["value"])
            portfolio_fund["valuation_date"] = latest_valuation["valuation_date"]

        return portfolio_fund
    except Exception as e:
        logger.error(f"Error retrieving portfolio fund: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/portfolio_funds/{portfolio_fund_id}", response_model=PortfolioFund)
async def update_portfolio_fund(portfolio_fund_id: int, portfolio_fund_update: PortfolioFundUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing portfolio fund association's information.
    Why it's needed: Allows modifying portfolio-fund association details when they change.
    How it works:
        1. Validates the update data using the PortfolioFundUpdate model
        2. Removes any None values from the input (fields that aren't being updated)
        3. Verifies the association exists
        4. Validates that referenced portfolio_id and available_funds_id exist if provided
        5. Updates only the provided fields in the database
        6. Returns the updated association information
    Expected output: A JSON object containing the updated portfolio fund's details
    """
    # Remove None values from the update data
    update_data = {k: v for k, v in portfolio_fund_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update data provided")
    
    try:
        # Check if portfolio fund exists
        check_result = db.table("portfolio_funds").select("id").eq("id", portfolio_fund_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")
        
        # Validate portfolio_id if provided
        if "portfolio_id" in update_data and update_data["portfolio_id"] is not None:
            portfolio_check = db.table("portfolios").select("id").eq("id", update_data["portfolio_id"]).execute()
            if not portfolio_check.data or len(portfolio_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Portfolio with ID {update_data['portfolio_id']} not found")
        
        # Validate available_funds_id if provided
        if "available_funds_id" in update_data and update_data["available_funds_id"] is not None:
            fund_check = db.table("available_funds").select("id").eq("id", update_data["available_funds_id"]).execute()
            if not fund_check.data or len(fund_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Fund with ID {update_data['available_funds_id']} not found")
        
        # Convert date objects to ISO format strings
        if 'start_date' in update_data and update_data['start_date'] is not None:
            update_data['start_date'] = update_data['start_date'].isoformat()
        
        if 'end_date' in update_data and update_data['end_date'] is not None:
            update_data['end_date'] = update_data['end_date'].isoformat()
        
        # Update the portfolio fund
        result = db.table("portfolio_funds").update(update_data).eq("id", portfolio_fund_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update portfolio fund")
    except Exception as e:
        logger.error(f"Error updating portfolio fund: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/portfolio_funds/{portfolio_fund_id}", response_model=dict)
async def delete_portfolio_fund(portfolio_fund_id: int, db = Depends(get_db)):
    """
    What it does: Deletes a portfolio fund association and all related data from the database.
    Why it's needed: Allows removing portfolio-fund associations that are no longer needed.
    How it works:
        1. Verifies the association exists
        2. Deletes all related IRR values for this portfolio fund
        3. Deletes all holding activity logs for this portfolio fund
        4. Deletes the portfolio fund record
        5. Returns a success message with details of what was deleted
    Expected output: A JSON object with a success message confirmation and deletion counts
    """
    try:
        # Check if portfolio fund exists
        check_result = db.table("portfolio_funds").select("id").eq("id", portfolio_fund_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")
        
        logger.info(f"Deleting portfolio fund with ID: {portfolio_fund_id} and all related data")
        
        # First, delete related IRR values
        irr_result = db.table("irr_values").delete().eq("fund_id", portfolio_fund_id).execute()
        irr_values_deleted = len(irr_result.data) if irr_result.data else 0
        logger.info(f"Deleted {irr_values_deleted} IRR values for portfolio fund {portfolio_fund_id}")
        
        # Second, delete related holding activity logs
        activity_result = db.table("holding_activity_log").delete().eq("portfolio_fund_id", portfolio_fund_id).execute()
        activity_logs_deleted = len(activity_result.data) if activity_result.data else 0
        logger.info(f"Deleted {activity_logs_deleted} activity logs for portfolio fund {portfolio_fund_id}")
        
        # Now it's safe to delete the portfolio fund
        result = db.table("portfolio_funds").delete().eq("id", portfolio_fund_id).execute()
        
        return {
            "message": f"Portfolio fund with ID {portfolio_fund_id} deleted successfully",
            "details": {
                "irr_values_deleted": irr_values_deleted,
                "activity_logs_deleted": activity_logs_deleted
            }
        }
    except Exception as e:
        logger.error(f"Error deleting portfolio fund: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolio_funds/{portfolio_fund_id}/calculate-irr", response_model=dict)
async def calculate_portfolio_fund_irr(
    portfolio_fund_id: int,
    month: int = Query(..., ge=1, le=12, description="Month for the valuation"),
    year: int = Query(..., ge=1900, le=2100, description="Year for the valuation"),
    valuation: float = Query(..., gt=0, description="Current market value"),
    guess: float = Query(0.02, description="Initial guess for IRR calculation (not used)"),
    db = Depends(get_db)
):
    """
    What it does: Calculates the Internal Rate of Return (IRR) for a portfolio fund.
    Why it's needed: Provides performance metrics for portfolio funds over time.
    How it works:
        1. Gets all cash flow activities for the portfolio fund
        2. Adjusts the sign of cash flows based on activity type
        3. Adds the current valuation as a final positive cash flow
        4. Calculates the IRR using the Excel-style method
        5. Stores the IRR value in the irr_values table
        6. Returns the IRR and details of the calculation
    Expected output: A JSON object with the calculated IRR value and verification information
    """
    try:
        logger.info(f"Starting IRR calculation for portfolio_fund_id: {portfolio_fund_id}")
        logger.info(f"Input parameters - month: {month}, year: {year}, valuation: {valuation}")
        logger.info(f"Parameter types - month: {type(month)}, year: {type(year)}")
        
        # Validate input month and year
        if not isinstance(month, int) or month < 1 or month > 12:
            logger.error(f"Invalid month value: {month}. Must be an integer between 1 and 12.")
            raise HTTPException(status_code=400, detail=f"Invalid month value: {month}. Must be an integer between 1 and 12.")
            
        if not isinstance(year, int) or year < 1900 or year > 2100:
            logger.error(f"Invalid year value: {year}. Must be an integer between 1900 and 2100.")
            raise HTTPException(status_code=400, detail=f"Invalid year value: {year}. Must be an integer between 1900 and 2100.")

        # Verify that a valuation exists for this month/year
        first_day = datetime(year, month, 1)
        if month == 12:
            next_month = datetime(year + 1, 1, 1)
        else:
            next_month = datetime(year, month + 1, 1)

        valuation_result = db.table("fund_valuations") \
            .select("*") \
            .eq("portfolio_fund_id", portfolio_fund_id) \
            .gte("valuation_date", first_day.isoformat()) \
            .lt("valuation_date", next_month.isoformat()) \
            .execute()

        if not valuation_result.data or len(valuation_result.data) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No valuation record exists for {datetime(year, month, 1).strftime('%B %Y')}. Please add a valuation first."
            )

        # Use the valuation from the database instead of the provided value
        existing_valuation = valuation_result.data[0]
        logger.info(f"Found existing valuation: {existing_valuation}")
        valuation = float(existing_valuation["value"])
        logger.info(f"Using valuation from database: {valuation}")

        # Add the fund_valuation_id from the existing valuation
        fund_valuation_id = existing_valuation["id"]
        logger.info(f"Using fund_valuation_id: {fund_valuation_id}")

        # Check if portfolio fund exists
        check_result = db.table("portfolio_funds").select("*").eq("id", portfolio_fund_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            logger.error(f"Portfolio fund not found with ID: {portfolio_fund_id}")
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")

        logger.info(f"Found portfolio fund: {check_result.data[0]}")

        # Get all activity logs for this portfolio fund
        activity_logs = db.table("holding_activity_log")\
            .select("*")\
            .eq("portfolio_fund_id", portfolio_fund_id)\
            .order("activity_timestamp")\
            .execute()

        if not activity_logs.data:
            error_msg = "No activity logs found for this portfolio fund"
            logger.error(error_msg)
            return {
                "status": "error",
                "error": error_msg,
                "portfolio_fund_id": portfolio_fund_id,
                "irr_percentage": None
            }

        logger.info(f"Found {len(activity_logs.data)} activity logs")

        # Check if there's only a single activity log on the same date as valuation
        if len(activity_logs.data) == 1:
            activity_date = datetime.fromisoformat(activity_logs.data[0]["activity_timestamp"])
            # Use the actual valuation date from the database record
            if activity_date.year == valuation_date.year and activity_date.month == valuation_date.month:
                logger.warning(f"Only a single activity on the same date as valuation for fund {portfolio_fund_id}")
                
                # Calculate simple return based on investment and valuation
                activity_amount = float(activity_logs.data[0]["amount"])
                activity_type = activity_logs.data[0]["activity_type"]
                
                if activity_type in ["Investment", "RegularInvestment", "GovernmentUplift"]:
                    # Simple return = (Valuation / Investment) - 1
                    simple_return = (valuation / activity_amount) - 1
                    irr_percentage = simple_return * 100
                    
                    logger.info(f"Calculated simple return: {simple_return} ({irr_percentage}%)")
                    
                    # Store the IRR value using the correct valuation date
                    irr_value_data = {
                        "fund_id": portfolio_fund_id,
                        "irr_result": float(round(irr_percentage, 2)),
                        "date": valuation_date.isoformat(),
                        "fund_valuation_id": fund_valuation_id  # Add the fund_valuation_id reference
                    }
                    
                    # Check if IRR already exists
                    existing_irr = db.table("irr_values")\
                        .select("*")\
                        .eq("fund_id", portfolio_fund_id)\
                        .eq("date", valuation_date.isoformat())\
                        .execute()
                    
                    if existing_irr.data and len(existing_irr.data) > 0:
                        # Update existing
                        irr_id = existing_irr.data[0]["id"]
                        db.table("irr_values")\
                            .update({"irr_result": float(round(irr_percentage, 2))})\
                            .eq("id", irr_id)\
                            .execute()
                    else:
                        # Insert new
                        db.table("irr_values").insert(irr_value_data).execute()
                    
                    return {
                        "status": "success",
                        "irr_percentage": round(irr_percentage, 2),
                        "portfolio_fund_id": portfolio_fund_id,
                        "date": valuation_date.isoformat(),
                        "calculation_type": "simple_return"
                    }
                else:
                    error_msg = f"Cannot calculate return: The only activity is not an investment ({activity_type})"
                    logger.error(error_msg)
                    return {
                        "status": "error",
                        "error": error_msg,
                        "portfolio_fund_id": portfolio_fund_id,
                        "irr_percentage": None
                    }

        # Prepare cash flows and dates for IRR calculation
        dates = []
        amounts = []

        # Add historical cash flows with traditional IRR convention:
        # - Money going out (investments) is negative
        # - Money coming in (withdrawals, returns) is positive
        for log in activity_logs.data:
            amount = float(log["amount"])
            # Apply sign convention based on activity type
            if log["activity_type"] in ["Investment", "RegularInvestment", "GovernmentUplift"]:
                # Investments are money going out (negative)
                amount = -amount
            elif log["activity_type"] == "Withdrawal":
                # Withdrawals are money coming in (positive)
                amount = abs(amount)  # Ensure positive
            elif log["activity_type"] == "Switch":
                # For switches:
                # - Negative amount means money going out (keep negative)
                # - Positive amount means money coming in (keep positive)
                amount = amount  # Keep original sign
            
            date = datetime.fromisoformat(log["activity_timestamp"])
            dates.append(date)
            amounts.append(amount)
            logger.info(f"Added {log['activity_type']} cash flow: {amount} on {date}")

        # Add current valuation as final positive cash flow (money coming in)
        try:
            logger.info(f"Creating valuation date with year={year}, month={month}, day=1")
            valuation_date = datetime(year, month, 1)
            logger.info(f"Successfully created valuation date: {valuation_date.isoformat()}")
            
            dates.append(valuation_date)
            amounts.append(valuation)  # Positive because it's money coming in
            logger.info(f"Added final valuation: {valuation} on {valuation_date}")
            
        except ValueError as e:
            logger.error(f"Error creating valuation date with year={year}, month={month}: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid date parameters: {str(e)}")

        # Calculate IRR using numpy_financial method
        logger.info("Calling calculate_excel_style_irr with prepared data")
        try:
            irr_result = calculate_excel_style_irr(dates, amounts)
            logger.info(f"IRR calculation result: {irr_result}")
                
            # Convert period IRR to percentage for storage
            irr_percentage = irr_result['period_irr'] * 100
            # Round to 2 decimal places for consistency and readability
            irr_percentage = round(irr_percentage, 2)
            logger.info(f"Calculated period IRR: {irr_percentage:.2f}% (type: {type(irr_percentage).__name__})")
        except ValueError as ve:
            error_message = str(ve)
            logger.error(f"IRR calculation error: {error_message}")
            raise HTTPException(status_code=400, detail=f"IRR calculation failed: {error_message}")
        except Exception as e:
            logger.error(f"Unexpected error in IRR calculation: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Unexpected error in IRR calculation: {str(e)}")

        # Check if an IRR value already exists for this fund and date
        existing_irr = db.table("irr_values")\
            .select("*")\
            .eq("fund_id", portfolio_fund_id)\
            .eq("date", valuation_date.isoformat())\
            .execute()
            
        logger.info(f"Checking for existing IRR values for fund_id={portfolio_fund_id}, date={valuation_date.isoformat()}")
        logger.info(f"Found existing IRR records: {len(existing_irr.data) if existing_irr.data else 0}")
        
        # Ensure we're storing as a float, not an integer
        irr_value_data = {

            "irr_result": float(irr_percentage),  # Explicitly cast to float to ensure proper storage
            "fund_valuation_id": fund_valuation_id  # Add the fund_valuation_id reference

        }
        logger.info(f"IRR data to be saved: {irr_value_data} (value type: {type(irr_value_data['irr_result']).__name__})")
        
        irr_value_id = None
        
        if existing_irr.data and len(existing_irr.data) > 0:
            # Update the existing IRR value
            oldest_record = existing_irr.data[0]
            irr_value_id = oldest_record["id"]
            
            # Log the type and value of the existing record for debugging
            old_value = oldest_record["irr_result"]
            old_value_type = type(old_value).__name__ 
            logger.info(f"Updating existing IRR value with ID: {irr_value_id}")
            logger.info(f"Old value: {old_value} (type: {old_value_type}), New value: {irr_percentage}")
            
            irr_value_result = db.table("irr_values")\
                .update(irr_value_data)\
                .eq("id", irr_value_id)\
                .execute()
                
            logger.info(f"Update result: {irr_value_result.data}")
                
            # Check if there are multiple IRR records for the same date (cleanup duplicates)
            if len(existing_irr.data) > 1:
                # Get all duplicate IDs (excluding the one we just updated)
                duplicate_ids = [record["id"] for record in existing_irr.data[1:]]
                logger.warning(f"Found {len(duplicate_ids)} duplicate IRR records for the same date. Cleaning up IDs: {duplicate_ids}")
                
                # Delete all duplicates
                for dup_id in duplicate_ids:
                    db.table("irr_values").delete().eq("id", dup_id).execute()
                
        else:
            # No existing record, insert a new one
            full_irr_data = {
                "fund_id": portfolio_fund_id,
                "irr_result": float(irr_percentage),  # Explicitly cast to float

                "date": valuation_date.isoformat(),
                "fund_valuation_id": fund_valuation_id  # Add the fund_valuation_id reference

            }
            
            logger.info(f"Storing new IRR value: {full_irr_data}")
            irr_value_result = db.table("irr_values").insert(full_irr_data).execute()
            
            if not irr_value_result.data:
                logger.error("Failed to store IRR value")
                raise HTTPException(status_code=500, detail="Failed to store IRR value")
                
            irr_value_id = irr_value_result.data[0]["id"]
            logger.info(f"Insert result - new IRR record: {irr_value_result.data[0]}")
            
        logger.info(f"Successfully stored/updated IRR value with ID: {irr_value_id}")
        
        # Verify that the IRR value was stored correctly
        verification = db.table("irr_values").select("*").eq("id", irr_value_id).execute()
        if verification.data:
            stored_value = verification.data[0]["irr_result"]
            stored_type = type(stored_value).__name__
            logger.info(f"Verification - stored IRR: {stored_value} (type: {stored_type})")
            
            # Check if the stored value matches what we tried to save
            if abs(float(stored_value) - float(irr_percentage)) > 0.01:  # Allow small float precision differences
                logger.warning(f"Stored IRR value {stored_value} differs from calculated value {irr_percentage}")
        
        response_data = {
            "portfolio_fund_id": portfolio_fund_id,
            "irr": irr_result['period_irr'],       # Decimal form (e.g., 0.0521)
            "irr_percentage": irr_percentage,      # Percentage form (e.g., 5.21)
            "irr_value_id": irr_value_id,
            "calculation_date": valuation_date.isoformat(),

            "fund_valuation_id": fund_valuation_id,
            "days_in_period": irr_result['days_in_period']
        }
        logger.info(f"Returning response: {response_data}")
        return response_data

    except Exception as e:
        logger.error(f"Error calculating IRR: {str(e)}")
        import traceback
        logger.error(f"IRR calculation stack trace: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error calculating IRR: {str(e)}")

@router.get("/portfolio_funds/{portfolio_fund_id}/latest-irr", response_model=dict)
async def get_latest_irr(portfolio_fund_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves the latest IRR value for a specific portfolio fund.
    Why it's needed: Provides quick access to the most recent IRR calculation.
    How it works:
        1. Validates the portfolio fund exists
        2. Queries the irr_values table for the most recent entry for this fund using the date index
        3. Returns the IRR value and related metadata
    Expected output: A JSON object containing the latest IRR value and calculation details
    """
    try:
        logger.info(f"Fetching latest IRR for portfolio_fund_id: {portfolio_fund_id}")

        # Check if portfolio fund exists
        check_result = db.table("portfolio_funds").select("*").eq("id", portfolio_fund_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            logger.error(f"Portfolio fund not found with ID: {portfolio_fund_id}")
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")

        logger.info(f"Found portfolio fund: {check_result.data[0]}")

        # Get the latest IRR value for this fund using the optimized index
        logger.info("Querying irr_values table...")
        query = db.table("irr_values")\
            .select("*")\
            .eq("fund_id", portfolio_fund_id)\
            .order("date", desc=True)\
            .limit(1)
            
        logger.info(f"Executing query: {query}")
        irr_result = query.execute()
        logger.info(f"Query result: {irr_result.data}")

        if not irr_result.data or len(irr_result.data) == 0:
            logger.warning(f"No IRR values found for portfolio_fund_id: {portfolio_fund_id}")
            return {
                "portfolio_fund_id": portfolio_fund_id,
                "irr": 0,
                "calculation_date": None,
                "fund_valuation_id": None
            }

        latest_irr = irr_result.data[0]
        logger.info(f"Found latest IRR value: {latest_irr}")
        
        # Ensure we're handling the IRR as a float
        irr_value = latest_irr["irr_result"]
        
        # Log details about the retrieved value
        logger.info(f"Retrieved IRR value: {irr_value} (type: {type(irr_value).__name__})")
        
        # If the value is not a float or is None, handle it appropriately
        if irr_value is None:
            irr_value = 0.0
            logger.warning("IRR value is None, defaulting to 0.0")
        else:
            try:
                irr_value = float(irr_value)
                logger.info(f"Converted IRR to float: {irr_value}")
            except (ValueError, TypeError) as e:
                logger.error(f"Error converting IRR value to float: {str(e)}")
                irr_value = 0.0
                
        # Return the IRR value as a properly formatted float
        response = {
            "portfolio_fund_id": portfolio_fund_id,
            "irr": irr_value,  # The percentage value (e.g., 5.21)
            "irr_decimal": irr_value / 100 if irr_value != 0 else 0.0,  # Also provide decimal form (e.g., 0.0521)
            "calculation_date": latest_irr["date"],

            "fund_valuation_id": latest_irr.get("fund_valuation_id")

        }
        logger.info(f"Returning response: {response}")
        return response

    except Exception as e:
        logger.error(f"Error fetching IRR value: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching IRR value: {str(e)}")

@router.post("/portfolio_funds/{portfolio_fund_id}/recalculate-all-irr", response_model=dict)
async def recalculate_all_irr_values(
    portfolio_fund_id: int,
    db = Depends(get_db)
):
    """
    What it does: Recalculates all historical IRR values for a specific portfolio fund.
    Why it's needed: Provides a way to ensure all IRR values are consistent after editing activities.
    How it works:
        1. Validates the portfolio fund exists
        2. Gets all existing IRR values for the fund
        3. For each valuation date, recalculates the IRR with current cash flows
        4. Updates existing IRR records instead of creating new ones
        5. Returns a summary of the updated IRR values
    Expected output: A JSON object with details of the recalculation operation
    """
    try:
        logger.info(f"Starting full IRR recalculation for portfolio_fund_id: {portfolio_fund_id}")
        
        # Check if portfolio fund exists
        check_result = db.table("portfolio_funds").select("*").eq("id", portfolio_fund_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            logger.error(f"Portfolio fund not found with ID: {portfolio_fund_id}")
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")
        
        # Get all existing IRR values for this fund
        existing_irr_values = db.table("irr_values")\
            .select("*")\
            .eq("fund_id", portfolio_fund_id)\
            .order("date")\
            .execute()
            
        if not existing_irr_values.data:
            logger.info(f"No existing IRR values found for portfolio_fund_id: {portfolio_fund_id}. Skipping initial IRR creation.")
            return {
                "portfolio_fund_id": portfolio_fund_id,
                "message": "No existing IRR values to recalculate. Skipping IRR calculation.",
                "updated_count": 0
            }
        
        # Recalculate IRR for each existing valuation date
        update_count = 0
        for irr_value in existing_irr_values.data:
            try:
                # Parse date and extract month/year
                valuation_date = datetime.fromisoformat(irr_value["date"])

                fund_valuation_id = irr_value["fund_valuation_id"]
                
                # Get the valuation amount from fund_valuations table
                if fund_valuation_id:
                    valuation_result = db.table("fund_valuations")\
                        .select("value")\
                        .eq("id", fund_valuation_id)\
                        .execute()
                        
                    if valuation_result.data and len(valuation_result.data) > 0:
                        valuation_amount = float(valuation_result.data[0]["value"])
                    else:
                        logger.warning(f"Fund valuation record with ID {fund_valuation_id} not found, skipping IRR recalculation")
                        continue
                else:
                    logger.warning(f"IRR record has no fund_valuation_id, looking for valuation by date")
                    # Fall back to finding valuation by date if fund_valuation_id is not set
                    month_start = valuation_date.replace(day=1)
                    if month_start.month == 12:
                        next_month = month_start.replace(year=month_start.year + 1, month=1)
                    else:
                        next_month = month_start.replace(month=month_start.month + 1)
                    
                    valuation_result = db.table("fund_valuations")\
                        .select("*")\
                        .eq("portfolio_fund_id", portfolio_fund_id)\
                        .gte("valuation_date", month_start.isoformat())\
                        .lt("valuation_date", next_month.isoformat())\
                        .execute()
                        
                    if not valuation_result.data or len(valuation_result.data) == 0:
                        logger.warning(f"No valuation found for date {valuation_date.isoformat()}, skipping IRR recalculation")
                        continue
                        
                    valuation_amount = float(valuation_result.data[0]["value"])
                    fund_valuation_id = valuation_result.data[0]["id"]

                
                logger.info(f"Recalculating IRR for date: {valuation_date.isoformat()}, valuation: {valuation_amount}")
                
                # For zero valuations, store an IRR of zero instead of skipping
                if valuation_amount == 0:
                    logger.info(f"Zero valuation detected - storing IRR value of 0 for portfolio_fund_id {portfolio_fund_id}")
                    
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
                        "fund_valuation_id": fund_valuation_id
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
                    
                    update_count += 1
                    logger.info(f"Successfully set IRR to 0 for zero valuation on date: {valuation_date.isoformat()}")
                    continue
                
                # Skip if valuation is negative
                if valuation_amount < 0:
                    logger.warning(f"Skipping IRR calculation for negative valuation: {valuation_amount}")
                    continue
                
                # Recalculate IRR for this date and valuation
                await calculate_portfolio_fund_irr(
                    portfolio_fund_id=portfolio_fund_id,
                    month=valuation_date.month,
                    year=valuation_date.year,
                    valuation=valuation_amount,
                    db=db
                )
                
                update_count += 1
                logger.info(f"Successfully recalculated IRR for date: {valuation_date.isoformat()}")
                
            except Exception as e:
                logger.error(f"Error recalculating IRR for valuation date {irr_value['date']}: {str(e)}")
                # Continue with next valuation date instead of failing whole process
        
        # Remove the final update block that calculates current IRR
        return {
            "portfolio_fund_id": portfolio_fund_id,
            "message": f"IRR values recalculated successfully",
            "updated_count": update_count
        }
        
    except Exception as e:
        logger.error(f"Error recalculating IRR values: {str(e)}")
        import traceback
        logger.error(f"Stack trace: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error recalculating IRR values: {str(e)}")

def calculate_portfolio_fund_irr_sync(
    portfolio_fund_id: int,
    month: int,
    year: int,
    valuation: float,
    db,
    guess: float = 0.02,
    fund_valuation_id: int = None
):
    """
    Synchronous wrapper for IRR calculation functionality.
    This function directly implements the IRR calculation without using asyncio,
    avoiding the "event loop already running" error when called from another async context.
    """
    import traceback
    
    try:
        logger.info(f"Starting synchronous IRR calculation for portfolio_fund_id: {portfolio_fund_id}")
        logger.info(f"Input parameters - month: {month}, year: {year}, valuation: {valuation}")
        
        # Validate input month and year
        if not isinstance(month, int) or month < 1 or month > 12:
            logger.error(f"Invalid month value: {month}. Must be an integer between 1 and 12.")
            return {
                "status": "error",
                "error": f"Invalid month value: {month}. Must be an integer between 1 and 12.",
                "portfolio_fund_id": portfolio_fund_id,
                "irr_percentage": None
            }
            
        if not isinstance(year, int) or year < 1900 or year > 2100:
            logger.error(f"Invalid year value: {year}. Must be an integer between 1900 and 2100.")
            return {
                "status": "error",
                "error": f"Invalid year value: {year}. Must be an integer between 1900 and 2100.",
                "portfolio_fund_id": portfolio_fund_id,
                "irr_percentage": None
            }

        # If fund_valuation_id is provided, use it directly
        if fund_valuation_id:
            valuation_result = db.table("fund_valuations") \
                .select("*") \
                .eq("id", fund_valuation_id) \
                .execute()
                
            if not valuation_result.data or len(valuation_result.data) == 0:
                error_msg = f"Specified valuation record with ID {fund_valuation_id} not found."
                logger.error(error_msg)
                return {
                    "status": "error",
                    "error": error_msg,
                    "portfolio_fund_id": portfolio_fund_id,
                    "irr_percentage": None
                }
        else:
            # Otherwise query by month/year as before
            first_day = datetime(year, month, 1)
            if month == 12:
                next_month = datetime(year + 1, 1, 1)
            else:
                next_month = datetime(year, month + 1, 1)

            valuation_result = db.table("fund_valuations") \
                .select("*") \
                .eq("portfolio_fund_id", portfolio_fund_id) \
                .gte("valuation_date", first_day.isoformat()) \
                .lt("valuation_date", next_month.isoformat()) \
                .execute()

            if not valuation_result.data or len(valuation_result.data) == 0:
                error_msg = f"No valuation record exists for {datetime(year, month, 1).strftime('%B %Y')}. Please add a valuation first."
                logger.error(error_msg)
                return {
                    "status": "error",
                    "error": error_msg,
                    "portfolio_fund_id": portfolio_fund_id,
                    "irr_percentage": None
                }

        # Use the valuation from the database
        existing_valuation = valuation_result.data[0]
        logger.info(f"Found existing valuation: {existing_valuation}")
        valuation = float(existing_valuation["value"])
        logger.info(f"Using valuation from database: {valuation}")

        # Add the fund_valuation_id from the existing valuation
        fund_valuation_id = existing_valuation["id"]
        logger.info(f"Using fund_valuation_id: {fund_valuation_id}")
        
        # Get correct valuation date from the record
        valuation_date = datetime.fromisoformat(existing_valuation["valuation_date"])
        logger.info(f"Using valuation date: {valuation_date.isoformat()}")

        # Check if portfolio fund exists
        check_result = db.table("portfolio_funds").select("*").eq("id", portfolio_fund_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            error_msg = f"Portfolio fund with ID {portfolio_fund_id} not found"
            logger.error(error_msg)
            return {
                "status": "error",
                "error": error_msg,
                "portfolio_fund_id": portfolio_fund_id,
                "irr_percentage": None
            }

        # Get all activity logs for this portfolio fund
        activity_logs = db.table("holding_activity_log")\
            .select("*")\
            .eq("portfolio_fund_id", portfolio_fund_id)\
            .order("activity_timestamp")\
            .execute()

        if not activity_logs.data:
            error_msg = "No activity logs found for this portfolio fund"
            logger.error(error_msg)
            return {
                "status": "error",
                "error": error_msg,
                "portfolio_fund_id": portfolio_fund_id,
                "irr_percentage": None
            }

        logger.info(f"Found {len(activity_logs.data)} activity logs")

        # Check if there's only a single activity log on the same date as valuation
        if len(activity_logs.data) == 1:
            activity_date = datetime.fromisoformat(activity_logs.data[0]["activity_timestamp"])
            # Use the actual valuation date from the database record
            if activity_date.year == valuation_date.year and activity_date.month == valuation_date.month:
                logger.warning(f"Only a single activity on the same date as valuation for fund {portfolio_fund_id}")
                
                # Calculate simple return based on investment and valuation
                activity_amount = float(activity_logs.data[0]["amount"])
                activity_type = activity_logs.data[0]["activity_type"]
                
                if activity_type in ["Investment", "RegularInvestment", "GovernmentUplift"]:
                    # Simple return = (Valuation / Investment) - 1
                    simple_return = (valuation / activity_amount) - 1
                    irr_percentage = simple_return * 100
                    
                    logger.info(f"Calculated simple return: {simple_return} ({irr_percentage}%)")
                    
                    # Store the IRR value using the correct valuation date
                    irr_value_data = {
                        "fund_id": portfolio_fund_id,
                        "irr_result": float(round(irr_percentage, 2)),
                        "date": valuation_date.isoformat(),
                        "fund_valuation_id": fund_valuation_id  # Add the fund_valuation_id reference
                    }
                    
                    # Check if IRR already exists
                    existing_irr = db.table("irr_values")\
                        .select("*")\
                        .eq("fund_id", portfolio_fund_id)\
                        .eq("date", valuation_date.isoformat())\
                        .execute()
                    
                    if existing_irr.data and len(existing_irr.data) > 0:
                        # Update existing
                        irr_id = existing_irr.data[0]["id"]
                        db.table("irr_values")\
                            .update({"irr_result": float(round(irr_percentage, 2))})\
                            .eq("id", irr_id)\
                            .execute()
                    else:
                        # Insert new
                        db.table("irr_values").insert(irr_value_data).execute()
                    
                    return {
                        "status": "success",
                        "irr_percentage": round(irr_percentage, 2),
                        "portfolio_fund_id": portfolio_fund_id,
                        "date": valuation_date.isoformat(),
                        "calculation_type": "simple_return"
                    }
                else:
                    error_msg = f"Cannot calculate return: The only activity is not an investment ({activity_type})"
                    logger.error(error_msg)
                    return {
                        "status": "error",
                        "error": error_msg,
                        "portfolio_fund_id": portfolio_fund_id,
                        "irr_percentage": None
                    }

        # Prepare cash flows and dates for IRR calculation
        dates = []
        amounts = []

        # Add historical cash flows with traditional IRR convention:
        # - Money going out (investments) is negative
        # - Money coming in (withdrawals, returns) is positive
        for log in activity_logs.data:
            amount = float(log["amount"])
            # Apply sign convention based on activity type
            if log["activity_type"] in ["Investment", "RegularInvestment", "GovernmentUplift"]:
                # Investments are money going out (negative)
                amount = -amount
            elif log["activity_type"] == "Withdrawal":
                # Withdrawals are money coming in (positive)
                amount = abs(amount)  # Ensure positive
            elif log["activity_type"] == "Switch":
                # For switches:
                # - Negative amount means money going out (keep negative)
                # - Positive amount means money coming in (keep positive)
                amount = amount  # Keep original sign
            
            date = datetime.fromisoformat(log["activity_timestamp"])
            dates.append(date)
            amounts.append(amount)
            logger.info(f"Added cash flow: {log['activity_type']}, date={date}, amount={amount}")

        # Add current valuation as final positive cash flow (money coming in)
        try:
            # Use the actual valuation date from the database record
            logger.info(f"Using valuation date: {valuation_date.isoformat()}")
            
            # Check if all activities are on the same date as the valuation
            all_same_date = True
            for date in dates:
                if date.year != valuation_date.year or date.month != valuation_date.month:
                    all_same_date = False
                    break
            
            # If all activities are on the same date as valuation, add the valuation with a small time offset
            if all_same_date:
                logger.warning("All cash flows are on the same date - adjusting valuation date slightly")
                # Add one day to the valuation date to create a minimum time difference
                modified_valuation_date = valuation_date.replace(day=min(valuation_date.day + 1, 28))
                dates.append(modified_valuation_date)
            else:
                dates.append(valuation_date)
                
            amounts.append(valuation)  # Positive because it's money coming in
            logger.info(f"Added final valuation: date={valuation_date}, amount={valuation}")
            
        except ValueError as e:
            error_msg = f"Invalid date parameters: {str(e)}"
            logger.error(error_msg)
            return {
                "status": "error",
                "error": error_msg,
                "portfolio_fund_id": portfolio_fund_id,
                "irr_percentage": None
            }

        # Calculate IRR using numpy_financial method
        logger.info("Calling calculate_excel_style_irr with prepared data")
        try:
            irr_result = calculate_excel_style_irr(dates, amounts)
            logger.info(f"IRR calculation result: {irr_result}")
            
            # Convert period IRR to percentage for storage
            irr_percentage = irr_result['period_irr'] * 100
            # Round to 2 decimal places
            irr_percentage = round(irr_percentage, 2)
            logger.info(f"Calculated IRR: {irr_percentage}%")
            
            # Check if an IRR value already exists for this fund and date
            existing_irr = db.table("irr_values")\
                .select("*")\
                .eq("fund_id", portfolio_fund_id)\
                .eq("date", valuation_date.isoformat())\
                .execute()
                
            logger.info(f"Checking for existing IRR values for fund_id={portfolio_fund_id}, date={valuation_date.isoformat()}")
            
            # Ensure we're storing as a float, not an integer
            irr_value_data = {
                "irr_result": float(irr_percentage),  # Explicitly cast to float to ensure proper storage
                "fund_valuation_id": fund_valuation_id  # Add the fund_valuation_id reference
            }
            
            if existing_irr.data and len(existing_irr.data) > 0:
                # Update the existing IRR value
                oldest_record = existing_irr.data[0]
                irr_value_id = oldest_record["id"]
                
                db.table("irr_values")\
                    .update(irr_value_data)\
                    .eq("id", irr_value_id)\
                    .execute()
                    
                logger.info(f"Updated existing IRR value with ID: {irr_value_id}")
                    
            else:
                # No existing record, insert a new one
                full_irr_data = {
                    "fund_id": portfolio_fund_id,
                    "irr_result": float(irr_percentage),  # Explicitly cast to float
                    "date": valuation_date.isoformat(),
                    "fund_valuation_id": fund_valuation_id  # Add the fund_valuation_id reference
                }
                
                logger.info(f"Storing new IRR value: {full_irr_data}")
                db.table("irr_values").insert(full_irr_data).execute()
            
            calculation_type = "standard_irr"
            if irr_result.get('is_simple_return'):
                calculation_type = "simple_return"
                
            return {
                "status": "success",
                "irr_percentage": irr_percentage,
                "portfolio_fund_id": portfolio_fund_id,
                "date": valuation_date.isoformat(),
                "calculation_type": calculation_type
            }
            
        except ValueError as ve:
            error_message = str(ve)
            logger.error(f"IRR calculation error: {error_message}")
            return {
                "status": "error",
                "error": error_message,
                "portfolio_fund_id": portfolio_fund_id,
                "irr_percentage": None
            }
        except Exception as e:
            logger.error(f"Unexpected error in IRR calculation: {str(e)}")
            logger.error(f"IRR calculation stack trace: {traceback.format_exc()}")
            return {
                "status": "error",
                "error": f"Unexpected error in IRR calculation: {str(e)}",
                "portfolio_fund_id": portfolio_fund_id,
                "irr_percentage": None
            }
    except Exception as e:
        logger.error(f"Error in synchronous IRR calculation: {str(e)}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        return {
            "status": "error",
            "error": str(e),
            "portfolio_fund_id": portfolio_fund_id,
            "irr_percentage": None
        }

@router.get("/portfolio_funds/{portfolio_fund_id}/irr-values", response_model=List[dict])
async def get_fund_irr_values(portfolio_fund_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves all historical IRR values for a specific portfolio fund.
    Why it's needed: Provides access to historical performance data over time.
    How it works:
        1. Validates the portfolio fund exists
        2. Queries the irr_values table for all entries for this fund
        3. Formats the data for the frontend with additional metadata
    Expected output: A JSON array of IRR values with calculation dates and related metadata
    """
    try:
        logger.info(f"Fetching IRR values for portfolio_fund_id: {portfolio_fund_id}")
        
        # Check if portfolio fund exists
        check_result = db.table("portfolio_funds").select("*").eq("id", portfolio_fund_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            logger.error(f"Portfolio fund not found with ID: {portfolio_fund_id}")
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")
            
        # Get all IRR values
        irr_values = db.table("irr_values")\
            .select("*")\
            .eq("fund_id", portfolio_fund_id)\
            .order("date")\
            .execute()
            
        result = []
        
        if irr_values.data:
            for irr in irr_values.data:
                # Format as needed for frontend
                formatted_irr = {
                    "id": irr["id"],
                    "date": irr["date"],
                    "irr": float(irr["irr_result"]),  # Changed from value to irr_result
                    "fund_id": irr["fund_id"],
                    "created_at": irr["created_at"],
                    "fund_valuation_id": irr["fund_valuation_id"]  # Added this field
                }
                result.append(formatted_irr)
                
        return result
    except Exception as e:
        logger.error(f"Error fetching IRR values: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching IRR values: {str(e)}")

@router.patch("/irr-values/{irr_value_id}", response_model=dict)
async def update_irr_value(
    irr_value_id: int, 
    data: dict = Body(..., description="IRR value update data"), 
    db = Depends(get_db)
):
    """
    What it does: Updates an existing IRR value record.
    Why it's needed: Allows correcting or adjusting IRR values when necessary.
    How it works:
        1. Validates the IRR value record exists
        2. Updates the provided fields (date, value, or valuation)
        3. If date or valuation is updated, recalculates the IRR
        4. Returns the updated IRR value record
    Expected output: A JSON object containing the updated IRR value information
    """
    try:
        logger.info(f"Updating IRR value with ID: {irr_value_id}, data: {data}")
        
        # Validate the IRR value exists
        irr_check = db.table("irr_values").select("*").eq("id", irr_value_id).execute()
        if not irr_check.data or len(irr_check.data) == 0:
            logger.error(f"IRR value not found with ID: {irr_value_id}")
            raise HTTPException(status_code=404, detail=f"IRR value with ID {irr_value_id} not found")
            
        irr_record = irr_check.data[0]
        logger.info(f"Found IRR record: {irr_record}")
        
        # Get fund_id for possible recalculation
        fund_id = irr_record["fund_id"]
        
        # Prepare update data
        update_data = {}
        
        # Update date if provided
        if "date" in data:
            update_data["date"] = data["date"]
            logger.info(f"Updating date to: {data['date']}")
            

        # Update fund_valuation_id if provided
        if "fund_valuation_id" in data:
            update_data["fund_valuation_id"] = data["fund_valuation_id"]
            logger.info(f"Updating fund_valuation_id to: {data['fund_valuation_id']}")

            
        # If we're updating date or fund_valuation_id, we need to recalculate IRR
        if ("date" in data or "fund_valuation_id" in data) and fund_id:

            logger.info(f"Recalculating IRR for fund_id: {fund_id}")
            
            try:
                # Get all activity logs for this portfolio fund
                activity_logs = db.table("holding_activity_log")\
                    .select("*")\
                    .eq("portfolio_fund_id", fund_id)\
                    .order("activity_timestamp")\
                    .execute()
                
                if activity_logs.data:
                    logger.info(f"Found {len(activity_logs.data)} activity logs for recalculation")
                    
                    # Prepare cash flows and dates
                    dates = []
                    amounts = []
                    
                    for log in activity_logs.data:
                        amount = float(log["amount"])
                        # Apply sign convention
                        if log["activity_type"] in ["Investment", "RegularInvestment", "GovernmentUplift"]:
                            amount = -amount
                        elif log["activity_type"] == "Withdrawal":
                            amount = abs(amount)
                        
                        date = datetime.fromisoformat(log["activity_timestamp"])
                        dates.append(date)
                        amounts.append(amount)
                        logger.info(f"Added cash flow: {log['activity_type']}, date={activity_date}, amount={amount}")
                
                # Add the final valuation as a positive cash flow
                valuation_date = data.get("date", irr_record["date"])


                
                # Convert date string to datetime object if necessary
                if isinstance(valuation_date, str):
                    valuation_date = datetime.fromisoformat(valuation_date.replace('Z', '+00:00'))
                
                if "fund_valuation_id" in data:
                    # Get the valuation amount from the fund_valuation record
                    valuation_record = db.table("fund_valuations")\
                        .select("value")\
                        .eq("id", data["fund_valuation_id"])\
                        .execute()
                    if valuation_record.data and len(valuation_record.data) > 0:
                        valuation_amount = valuation_record.data[0]["value"]
                    else:
                        raise HTTPException(status_code=404, detail=f"Fund valuation with ID {data['fund_valuation_id']} not found")
                else:
                    # Get the valuation amount from the existing fund_valuation record
                    existing_fund_valuation_id = irr_record["fund_valuation_id"]
                    if existing_fund_valuation_id:
                        valuation_record = db.table("fund_valuations")\
                            .select("value")\
                            .eq("id", existing_fund_valuation_id)\
                            .execute()
                        if valuation_record.data and len(valuation_record.data) > 0:
                            valuation_amount = valuation_record.data[0]["value"]
                        else:
                            raise HTTPException(status_code=404, detail=f"Fund valuation with ID {existing_fund_valuation_id} not found")
                    else:
                        raise HTTPException(status_code=400, detail="Cannot recalculate IRR without fund_valuation_id")
                
                dates.append(valuation_date)
                amounts.append(valuation_amount)
                logger.info(f"Added final valuation: date={valuation_date}, amount={valuation_amount}")
                
                # Calculate IRR
                if len(dates) >= 2 and len(amounts) >= 2:
                    logger.info("Calling calculate_excel_style_irr with prepared data")

                    irr_result = calculate_excel_style_irr(dates, amounts)
                    
                    if irr_result and 'period_irr' in irr_result:
                        # Convert to percentage
                        irr_percentage = irr_result['period_irr'] * 100
                        irr_percentage = round(irr_percentage, 2)
                        logger.info(f"Recalculated IRR: {irr_percentage:.2f}%")
                        
                        # Update the IRR value
                        update_data["irr_result"] = float(irr_percentage)
                    else:
                        logger.error("IRR calculation failed")
            except Exception as calc_error:
                logger.error(f"Error recalculating IRR: {str(calc_error)}")
                # Continue with the update even if IRR recalculation fails
        
        # If we have updates to make
        if update_data:
            logger.info(f"Applying updates to IRR value: {update_data}")
            result = db.table("irr_values").update(update_data).eq("id", irr_value_id).execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"Successfully updated IRR value: {result.data[0]}")
                return result.data[0]
            else:
                logger.error("Failed to update IRR value")
                raise HTTPException(status_code=500, detail="Failed to update IRR value")
        else:
            logger.info("No updates provided for IRR value")
            return irr_record
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating IRR value: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating IRR value: {str(e)}")

@router.delete("/irr-values/{irr_value_id}", status_code=204)
async def delete_irr_value(irr_value_id: int, db = Depends(get_db)):
    """
    What it does: Deletes an IRR value record.
    Why it's needed: Allows removing incorrect or outdated IRR entries.
    How it works:
        1. Validates the IRR value exists
        2. Deletes the record
    Expected output: No content on success
    """
    try:
        logger.info(f"Deleting IRR value with ID: {irr_value_id}")
        
        # Check if IRR value exists
        check_result = db.table("irr_values").select("*").eq("id", irr_value_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            logger.error(f"IRR value not found with ID: {irr_value_id}")
            raise HTTPException(status_code=404, detail=f"IRR value with ID {irr_value_id} not found")
            
        # Delete the record
        db.table("irr_values").delete().eq("id", irr_value_id).execute()
        logger.info(f"Successfully deleted IRR value with ID: {irr_value_id}")
        
        return None
        
    except Exception as e:
        logger.error(f"Error deleting IRR value: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting IRR value: {str(e)}")
