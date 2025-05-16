from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from datetime import datetime, date, timedelta
from pydantic import BaseModel

from app.models.holding_activity_log import HoldingActivityLog, HoldingActivityLogCreate, HoldingActivityLogUpdate
from app.db.database import get_db

# Import from portfolio_funds to use the calculate_portfolio_fund_irr function
from app.api.routes.portfolio_funds import calculate_portfolio_fund_irr

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

async def check_valuation_exists_for_month(portfolio_fund_id: int, activity_date: date, db) -> bool:
    """
    Check if a valuation record exists for a specific portfolio fund and month.
    Returns true if a valuation exists, false otherwise.
    """
    # Get the first day of the month
    first_day = datetime(activity_date.year, activity_date.month, 1)
    
    # Get the first day of the next month
    if activity_date.month == 12:
        next_month = datetime(activity_date.year + 1, 1, 1)
    else:
        next_month = datetime(activity_date.year, activity_date.month + 1, 1)
    
    # Check if valuation exists within this month
    valuation_result = db.table("fund_valuations") \
        .select("id") \
        .eq("portfolio_fund_id", portfolio_fund_id) \
        .gte("valuation_date", first_day.isoformat()) \
        .lt("valuation_date", next_month.isoformat()) \
        .execute()
    
    return valuation_result.data and len(valuation_result.data) > 0

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
    What it does: Retrieves a paginated list of holding activity logs with optional filtering.
    Why it's needed: Provides a way to view holding activity logs in the system.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'holding_activity_log' table with optional filters
        3. Applies pagination parameters to limit result size
        4. Returns the data as a list of HoldingActivityLog objects
    Expected output: A JSON array of holding activity log objects with all their details
    """
    try:
        query = db.table("holding_activity_log").select("*")
        
        if product_id is not None:
            query = query.eq("product_id", product_id)
        
        if portfolio_fund_id is not None:
            query = query.eq("portfolio_fund_id", portfolio_fund_id)
            
        if portfolio_id is not None:
            # First, get all portfolio_fund_ids associated with this portfolio
            portfolio_funds = db.table("portfolio_funds") \
                .select("id") \
                .eq("portfolio_id", portfolio_id) \
                .execute()
                
            if portfolio_funds.data and len(portfolio_funds.data) > 0:
                # Extract the fund IDs
                portfolio_fund_ids = [fund["id"] for fund in portfolio_funds.data]
                # Filter activity logs by these fund IDs
                query = query.in_("portfolio_fund_id", portfolio_fund_ids)
            else:
                # No funds in portfolio, return empty result
                return []
            
        if activity_type is not None:
            query = query.eq("activity_type", activity_type)
            
        if from_date is not None:
            query = query.gte("activity_timestamp", from_date)
            
        if to_date is not None:
            query = query.lte("activity_timestamp", to_date)
            
        # Extract values from Query objects
        skip_val = skip
        limit_val = limit
        if hasattr(skip, 'default'):
            skip_val = skip.default
        if hasattr(limit, 'default'):
            limit_val = limit.default
            
        # Order by activity_timestamp descending (newest first)
        query = query.order("activity_timestamp", desc=True)
            
        result = query.range(skip_val, skip_val + limit_val - 1).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

async def find_most_recent_common_valuation_month(portfolio_id: int, db) -> tuple:
    """
    Find the most recent month where all portfolio funds in the portfolio have a valuation.
    Returns a tuple (year, month) if found, otherwise None.
    """
    try:
        # Get all funds in the portfolio
        portfolio_funds = db.table("portfolio_funds")\
            .select("id")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
            
        if not portfolio_funds.data or len(portfolio_funds.data) == 0:
            logger.info(f"No funds found in portfolio {portfolio_id}")
            return None
            
        # For each fund, get its valuation dates
        all_fund_valuations = {}
        for pf in portfolio_funds.data:
            fund_id = pf["id"]
            
            valuations = db.table("fund_valuations")\
                .select("valuation_date")\
                .eq("portfolio_fund_id", fund_id)\
                .order("valuation_date", desc=True)\
                .execute()
                
            if not valuations.data:
                # This fund has no valuations, so no common month exists
                logger.info(f"Fund {fund_id} has no valuations")
                return None
                
            # Extract year and month from each valuation date
            fund_dates = []
            for val in valuations.data:
                val_date = datetime.fromisoformat(val["valuation_date"].replace('Z', '+00:00'))
                fund_dates.append((val_date.year, val_date.month))
                
            all_fund_valuations[fund_id] = set(fund_dates)
        
        # Find dates that exist in all funds' valuation sets
        if not all_fund_valuations:
            return None
            
        # Start with dates from the first fund
        common_dates = list(next(iter(all_fund_valuations.values())))
        
        # Intersect with each other fund's dates
        for fund_id, dates in all_fund_valuations.items():
            common_dates = [date for date in common_dates if date in dates]
            
            if not common_dates:
                # No common dates found
                return None
        
        # Sort by year and month (descending) to get the most recent
        common_dates.sort(reverse=True)
        
        if common_dates:
            logger.info(f"Found most recent common valuation month: {common_dates[0]}")
            return common_dates[0]  # Returns tuple (year, month)
        
        return None
    except Exception as e:
        logger.error(f"Error finding common valuation month: {str(e)}")
        return None

async def recalculate_fund_weightings(portfolio_id: int, db) -> None:
    """
    Recalculate and update weightings for all funds in a portfolio based on:
    1. Initially, the amount_invested in each fund
    2. If all funds have a valuation for the same month, use those valuation values
    """
    try:
        # Find the most recent month where all portfolio funds have a valuation
        common_month = await find_most_recent_common_valuation_month(portfolio_id, db)
        
        # Get all funds in the portfolio
        portfolio_funds = db.table("portfolio_funds")\
            .select("id", "amount_invested")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
            
        if not portfolio_funds.data:
            logger.info(f"No funds found in portfolio {portfolio_id}")
            return
            
        # If we have a common valuation month, use valuation values
        if common_month:
            year, month = common_month
            logger.info(f"Using valuation values from {year}-{month} for fund weightings")
            
            # Get each fund's valuation for this month
            fund_values = {}
            total_value = 0
            
            for pf in portfolio_funds.data:
                fund_id = pf["id"]
                
                # Get the valuation for this fund in the common month
                start_date = datetime(year, month, 1).isoformat()
                end_date = datetime(year, month + 1, 1).isoformat() if month < 12 else datetime(year + 1, 1, 1).isoformat()
                
                valuation = db.table("fund_valuations")\
                    .select("value")\
                    .eq("portfolio_fund_id", fund_id)\
                    .gte("valuation_date", start_date)\
                    .lt("valuation_date", end_date)\
                    .execute()
                    
                if valuation.data and len(valuation.data) > 0:
                    value = float(valuation.data[0]["value"] or 0)
                    fund_values[fund_id] = value
                    total_value += value
                else:
                    # Fallback to amount_invested if valuation not found
                    value = float(pf["amount_invested"] or 0)
                    fund_values[fund_id] = value
                    total_value += value
                    logger.warning(f"Valuation not found for fund {fund_id} in month {year}-{month}, using amount_invested")
        else:
            # Use amount_invested for weightings
            logger.info(f"No common valuation month found, using amount_invested for fund weightings")
            
            fund_values = {pf["id"]: float(pf["amount_invested"] or 0) for pf in portfolio_funds.data}
            total_value = sum(fund_values.values())
        
        # Skip if total value is zero
        if total_value == 0:
            logger.warning(f"Total portfolio value is zero, skipping weighting calculation for portfolio {portfolio_id}")
            return
            
        # Update each fund's weighting
        for fund_id, value in fund_values.items():
            new_weighting = value / total_value if total_value > 0 else 0
            
            db.table("portfolio_funds")\
                .update({"weighting": new_weighting})\
                .eq("id", fund_id)\
                .execute()
                
        logger.info(f"Updated fund weightings for portfolio {portfolio_id}")
    except Exception as e:
        logger.error(f"Error recalculating fund weightings: {str(e)}")
        raise

async def recalculate_product_weightings(client_id: int, db) -> None:
    """
    Recalculate and update weightings for all products belonging to a client based on their portfolio values.
    Considers fund valuations when available.
    """
    try:
        # Get all active products for the client
        products = db.table("client_products")\
            .select("id", "portfolio_id")\
            .eq("client_id", client_id)\
            .eq("status", "active")\
            .execute()
            
        if not products.data:
            return
            
        product_values = []
        
        # Calculate total value for each product
        for product in products.data:
            # Get the portfolio directly from client_products (no need for product_holdings)
            portfolio_id = product.get("portfolio_id")
            
            if not portfolio_id:
                product_values.append({"id": product["id"], "value": 0})
                continue
                
            common_month = await find_most_recent_common_valuation_month(portfolio_id, db)
            
            # Get all funds in the portfolio
            portfolio_funds = db.table("portfolio_funds")\
                .select("id", "amount_invested")\
                .eq("portfolio_id", portfolio_id)\
                .execute()
                
            if not portfolio_funds.data:
                product_values.append({"id": product["id"], "value": 0})
                continue
                
            # If we have a common valuation month, use those values
            if common_month:
                year, month = common_month
                
                # Calculate total portfolio value based on valuations
                total_value = 0
                for pf in portfolio_funds.data:
                    start_date = datetime(year, month, 1).isoformat()
                    end_date = datetime(year, month + 1, 1).isoformat() if month < 12 else datetime(year + 1, 1, 1).isoformat()
                    
                    valuation = db.table("fund_valuations")\
                        .select("value")\
                        .eq("portfolio_fund_id", pf["id"])\
                        .gte("valuation_date", start_date)\
                        .lt("valuation_date", end_date)\
                        .execute()
                        
                    if valuation.data and len(valuation.data) > 0:
                        value = float(valuation.data[0]["value"] or 0)
                    else:
                        value = float(pf["amount_invested"] or 0)
                        
                    total_value += value
                
                product_values.append({"id": product["id"], "value": total_value})
            else:
                # Use invested amounts
                total_value = sum(float(pf["amount_invested"] or 0) for pf in portfolio_funds.data)
                product_values.append({"id": product["id"], "value": total_value})
        
        # Calculate total value across all products
        total_client_value = sum(av["value"] for av in product_values)
        
        if total_client_value == 0:
            return
            
        # Update each product's weighting
        for av in product_values:
            new_weighting = av["value"] / total_client_value if total_client_value > 0 else 0
            
            db.table("client_products")\
                .update({"weighting": new_weighting})\
                .eq("id", av["id"])\
                .execute()
                
        logger.info(f"Updated product weightings for client {client_id}")
    except Exception as e:
        logger.error(f"Error recalculating product weightings: {str(e)}")
        raise

async def has_valuation_been_edited(portfolio_fund_id: int, activity_date: date, db) -> bool:
    """
    Check if a valuation exists for the given portfolio fund and month of the activity date,
    and if it has been edited since its creation.
    """
    try:
        year = activity_date.year
        month = activity_date.month
        
        # Get the valuation for this month
        start_date = datetime(year, month, 1).isoformat()
        end_date = datetime(year, month + 1, 1).isoformat() if month < 12 else datetime(year + 1, 1, 1).isoformat()
        
        valuation = db.table("fund_valuations")\
            .select("*")\
            .eq("portfolio_fund_id", portfolio_fund_id)\
            .gte("valuation_date", start_date)\
            .lt("valuation_date", end_date)\
            .execute()
            
        if not valuation.data or len(valuation.data) == 0:
            # No valuation exists for this month
            return False
            
        # Check if the valuation has been edited (created_at != updated_at)
        valuation_data = valuation.data[0]
        
        # If updated_at doesn't exist or matches created_at, it hasn't been edited
        if "updated_at" not in valuation_data or valuation_data["updated_at"] is None:
            return False
            
        created_at = datetime.fromisoformat(valuation_data["created_at"].replace('Z', '+00:00'))
        updated_at = datetime.fromisoformat(valuation_data["updated_at"].replace('Z', '+00:00'))
        
        # If they're different by more than a few milliseconds, it has been edited
        return (updated_at - created_at).total_seconds() > 1
    except Exception as e:
        logger.error(f"Error checking if valuation has been edited: {str(e)}")
        return False

async def recalculate_irr_values_after_activity(portfolio_fund_id: int, activity_timestamp: datetime, db) -> None:
    """
    What it does: Recalculates IRR values for a portfolio fund with dates after a given activity timestamp,
    but only if the valuation for that month has been edited.
    Why it's needed: Ensures IRR values remain accurate after new cash flows are recorded.
    How it works:
        1. Gets all IRR values for the fund with dates after the activity timestamp
        2. For each IRR value, checks if the valuation for that month has been edited
        3. If edited, recalculates the IRR value using the updated cash flow history
        4. Updates the IRR values in the database
    """
    try:
        # Convert activity_timestamp properly for logging
        activity_ts_str = None
        if activity_timestamp:
            if isinstance(activity_timestamp, datetime):
                activity_ts_str = activity_timestamp.isoformat()
            elif isinstance(activity_timestamp, date):
                activity_ts_str = activity_timestamp.isoformat()
            else:
                activity_ts_str = str(activity_timestamp)
                
        logger.info(f"Starting selective IRR recalculation for portfolio_fund_id: {portfolio_fund_id} after {activity_ts_str}")
        
        # Check if portfolio fund exists
        check_result = db.table("portfolio_funds").select("*").eq("id", portfolio_fund_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            logger.error(f"Portfolio fund not found with ID: {portfolio_fund_id}")
            return
        
        # Convert activity_timestamp to a date object for comparison
        activity_date = None
        if isinstance(activity_timestamp, datetime):
            activity_date = activity_timestamp.date()
        elif isinstance(activity_timestamp, date):
            activity_date = activity_timestamp
        elif isinstance(activity_timestamp, str):
            # Parse string to datetime, then extract date
            try:
                dt = datetime.fromisoformat(activity_timestamp.replace('Z', '+00:00'))
                activity_date = dt.date()
            except ValueError:
                # Try directly as a date if datetime parsing fails
                activity_date = date.fromisoformat(activity_timestamp)
        
        if activity_date is None:
            logger.error(f"Could not convert activity timestamp to date: {activity_timestamp}")
            return
            
        logger.info(f"Converted activity timestamp to date: {activity_date}")
        
        # Get IRR values for this fund with dates after the activity timestamp
        irr_values = db.table("irr_values")\
            .select("*")\
            .eq("fund_id", portfolio_fund_id)\
            .execute()
            
        if not irr_values.data:
            logger.info(f"No IRR values found for portfolio_fund_id: {portfolio_fund_id}")
            return
        
        # Filter IRR values with dates after the activity timestamp
        affected_irr_values = []
        for irr_value in irr_values.data:
            try:
                # Convert the IRR date string to a date object for comparison
                irr_datetime = datetime.fromisoformat(irr_value["date"].replace('Z', '+00:00'))
                irr_date = irr_datetime.date()
                
                logger.info(f"Comparing IRR date {irr_date} with activity date {activity_date}")
                
                # Now compare date to date
                if irr_date >= activity_date:
                    affected_irr_values.append(irr_value)
            except Exception as e:
                logger.error(f"Error parsing date from IRR value: {str(e)}")
                continue
        
        logger.info(f"Found {len(affected_irr_values)} IRR values after {activity_date}")
        
        # Recalculate each affected IRR value, but only if its valuation has been edited
        update_count = 0
        for irr_value in affected_irr_values:
            try:
                # Parse date and extract month/year
                valuation_date = datetime.fromisoformat(irr_value["date"].replace('Z', '+00:00'))
                valuation_amount = float(irr_value["valuation"])
                
                # Check if the valuation for this month has been edited
                valuation_edited = await has_valuation_been_edited(
                    portfolio_fund_id=portfolio_fund_id,
                    activity_date=valuation_date.date(),
                    db=db
                )
                
                if not valuation_edited:
                    logger.info(f"Skipping IRR recalculation for date {valuation_date.isoformat()} - valuation not edited")
                    continue
                
                logger.info(f"Recalculating IRR for date: {valuation_date.isoformat()}, valuation: {valuation_amount}")
                
                # Skip if valuation is zero or negative
                if valuation_amount <= 0:
                    logger.warning(f"Skipping IRR calculation for invalid valuation: {valuation_amount}")
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
                logger.error(f"Error recalculating IRR value: {str(e)}")
                continue
        
        logger.info(f"Completed IRR recalculation for portfolio_fund_id: {portfolio_fund_id}, updated {update_count} values")
    except Exception as e:
        logger.error(f"Error in selective IRR recalculation: {str(e)}")

@router.post("/holding_activity_logs", response_model=HoldingActivityLog)
async def create_holding_activity_log(
    holding_activity_log: HoldingActivityLogCreate, 
    skip_fund_update: bool = Query(False, description="Skip updating the fund's amount_invested"),
    db = Depends(get_db)
):
    """
    What it does: Creates a new holding activity log in the database.
    Why it's needed: Allows recording investment and withdrawal activities for portfolio funds.
    How it works:
        1. Validates the input data
        2. Inserts the activity in the database
        3. Updates the fund's amount_invested if applicable
        4. Recalculates IRR values if needed
        5. Returns the created activity record
    Expected output: The newly created holding activity log object
    """
    try:
        # Process backward compatibility for account_holding_id to product_id
        if holding_activity_log.account_holding_id and not holding_activity_log.product_id:
            holding_activity_log.product_id = holding_activity_log.account_holding_id
            
        # Get the data dictionary from the model
        log_data = holding_activity_log.model_dump()
        
        # Debug
        logger.info(f"Creating activity log with data: {log_data}")
        
        # Ensure activity_timestamp is properly serialized if it's a date object
        if "activity_timestamp" in log_data and isinstance(log_data["activity_timestamp"], date):
            log_data["activity_timestamp"] = log_data["activity_timestamp"].isoformat()
            
        # Ensure amount is a float if present
        if 'amount' in log_data and log_data['amount'] is not None:
            try:
                log_data['amount'] = float(log_data['amount'])
            except (ValueError, TypeError):
                raise HTTPException(status_code=422, detail="Invalid amount format")
        
        # Remove account_holding_id and product_holding_id if present as they're not in the database schema
        if 'account_holding_id' in log_data:
            log_data.pop('account_holding_id')
            
        if 'product_holding_id' in log_data:
            log_data.pop('product_holding_id')
        
        # Insert the new activity log
        result = db.table("holding_activity_log").insert(log_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create holding activity log")
        
        # If skip_fund_update is True, don't update the fund's amount_invested
        if not skip_fund_update:
            # Process the activity to update fund amounts
            logger.info(f"skip_fund_update is {skip_fund_update}, processing activity with ID {result.data[0]['id']} to update fund amounts")
            
            # Special handling for SwitchOut activities - always skip fund updates for SwitchOut
            # since they will be handled by the corresponding SwitchIn activity
            if holding_activity_log.activity_type == 'SwitchOut' and hasattr(holding_activity_log, 'related_fund') and holding_activity_log.related_fund:
                logger.info(f"SwitchOut activity detected with related_fund. Fund updates will be handled by the corresponding SwitchIn activity.")
                # Don't process fund updates for SwitchOut, they're handled by SwitchIn
            else:
                # Process fund updates for all other activities
                await process_activity_for_fund_updates(log_data, db)
                logger.info(f"Updated fund amounts for activity: {result.data[0]['id']}")
        else:
            logger.info(f"skip_fund_update is {skip_fund_update}, skipping fund amount updates for activity: {result.data[0]['id']}")
        
        # Recalculate weightings for all affected portfolios and clients
        for portfolio_id in affected_portfolio_ids:
            await recalculate_fund_weightings(portfolio_id, db)
            
        for client_id in affected_client_ids:
            await recalculate_product_weightings(client_id, db)
        
        # Recalculate IRR values for affected portfolio funds
        for portfolio_fund_id in affected_portfolio_fund_ids:
            activity_timestamp = holding_activity_log.activity_timestamp if holding_activity_log.activity_timestamp else datetime.now()
            
            # Handle different timestamp types
            if isinstance(activity_timestamp, date):
                # Convert date to datetime for the recalculation function
                activity_timestamp = datetime.combine(activity_timestamp, datetime.min.time())
            elif isinstance(activity_timestamp, str):
                try:
                    # Try to parse as ISO format first
                    activity_timestamp = datetime.fromisoformat(activity_timestamp.replace('Z', '+00:00'))
                except ValueError:
                    # Try to parse as date format
                    try:
                        activity_timestamp = datetime.strptime(activity_timestamp, "%Y-%m-%d")
                    except ValueError:
                        # If all parsing fails, use current time as fallback
                        logger.warning(f"Could not parse activity timestamp: {activity_timestamp}, using current time")
                        activity_timestamp = datetime.now()
                
            await recalculate_irr_values_after_activity(
                portfolio_fund_id=portfolio_fund_id,
                activity_timestamp=activity_timestamp,
                db=db
            )
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating holding activity log: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

async def process_activity_for_fund_updates(activity_data: dict, db) -> None:
    """
    Process a newly added or updated activity record, updating fund amounts
    based on the activity type (Contribution, Withdrawal, Valuation, Fee, etc.)
    """
    try:
        if 'portfolio_fund_id' not in activity_data or not activity_data['portfolio_fund_id']:
            logger.error("Cannot process activity without portfolio_fund_id")
            return
            
        portfolio_fund_id = activity_data['portfolio_fund_id']
        
        # Get current fund data
        fund_response = db.table("portfolio_funds")\
            .select("*")\
            .eq("id", portfolio_fund_id)\
            .execute()
            
        if not fund_response.data:
            logger.error(f"Portfolio fund {portfolio_fund_id} not found")
            return
        
        fund = fund_response.data[0]
        current_amount = fund.get('amount_invested') or 0
        
        # Check for zero amount in the activity
        if not activity_data.get('amount'):
            logger.info(f"Skipping fund update for zero amount activity (type: {activity_data.get('activity_type')})")
            return
            
        amount = float(activity_data['amount'])
        activity_type = activity_data['activity_type']
        new_amount = current_amount
        
        # Process different activity types
        if activity_type == 'Contribution':
            # Contributions increase the amount invested
            new_amount = current_amount + amount
            logger.info(f"Processing Contribution: {current_amount} + {amount} = {new_amount}")
            
        elif activity_type == 'Withdrawal':
            # Withdrawals decrease the amount invested
            new_amount = current_amount - amount
            logger.info(f"Processing Withdrawal: {current_amount} - {amount} = {new_amount}")
            
        elif activity_type == 'Fee':
            # Fees decrease the amount invested
            new_amount = current_amount - amount
            logger.info(f"Processing Fee: {current_amount} - {amount} = {new_amount}")
            
        elif activity_type == 'Distribution':
            # Distributions decrease the amount invested
            new_amount = current_amount - amount
            logger.info(f"Processing Distribution: {current_amount} - {amount} = {new_amount}")
            
        elif activity_type == 'SwitchOut':
            # Switch Out decreases the amount invested
            new_amount = current_amount - amount
            logger.info(f"Processing SwitchOut: {current_amount} - {amount} = {new_amount}")
            
            # Process the related fund for Switch In
            if 'related_fund' in activity_data and activity_data['related_fund']:
                related_fund_id = activity_data['related_fund']
                
                # Create a corresponding SwitchIn activity
                switch_in_data = {
                    'portfolio_fund_id': related_fund_id,
                    'activity_timestamp': activity_data['activity_timestamp'],
                    'activity_type': 'SwitchIn',
                    'amount': amount,  # Keep the same absolute amount for consistency
                    'related_fund': portfolio_fund_id,
                    'product_id': activity_data.get('product_id')
                }
                
                # Check if this is a cross-product switch
                # Get source product info
                source_portfolio_id = fund['portfolio_id']
                
                if 'product_id' in activity_data and activity_data['product_id']:
                    source_product_id = activity_data['product_id']
                    
                    # Get target fund's portfolio
                    target_fund = db.table("portfolio_funds")\
                        .select("portfolio_id")\
                        .eq("id", related_fund_id)\
                .execute()
                
                    if target_fund.data:
                        target_portfolio_id = target_fund.data[0]['portfolio_id']
                        
                        # Check if target portfolio is in a different product
                        if target_portfolio_id != source_portfolio_id:
                            # Find product with this portfolio_id
                            target_product = db.table("client_products")\
                                .select("id")\
                                .eq("portfolio_id", target_portfolio_id)\
                                .execute()
                                
                            if target_product.data:
                                target_product_id = target_product.data[0]['id']
                                switch_in_data['product_id'] = target_product_id
                                logger.info(f"Cross-product switch: source product={source_product_id}, target product={target_product_id}")
                
                # Create the SwitchIn activity
                db.table("holding_activity_log")\
                    .insert(switch_in_data)\
                .execute()
            
                # Update the related fund
                related_fund = db.table("portfolio_funds")\
                    .select("amount_invested")\
                    .eq("id", related_fund_id)\
                .execute()
                
                if related_fund.data:
                    related_amount = related_fund.data[0].get('amount_invested') or 0
                new_related_amount = related_amount + amount
                
                db.table("portfolio_funds")\
                    .update({"amount_invested": new_related_amount})\
                        .eq("id", related_fund_id)\
                    .execute()
                        
            logger.info(f"Updated related fund {related_fund_id} amount: {related_amount} + {amount} = {new_related_amount}")
            
        elif activity_type == 'SwitchIn':
            # Switch In increases the amount invested
            new_amount = current_amount + amount
            logger.info(f"Processing SwitchIn: {current_amount} + {amount} = {new_amount}")
            
        # Update the fund amount
        if new_amount != current_amount:
            db.table("portfolio_funds")\
                .update({"amount_invested": new_amount})\
                .eq("id", portfolio_fund_id)\
                .execute()
                
            logger.info(f"Updated fund {portfolio_fund_id} amount invested from {current_amount} to {new_amount}")
        
    except Exception as e:
        logger.error(f"Error processing activity for fund updates: {str(e)}")

@router.get("/holding_activity_logs/{holding_activity_log_id}", response_model=HoldingActivityLog)
async def get_holding_activity_log(holding_activity_log_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a specific holding activity log by its ID.
    Why it's needed: Allows viewing details of a specific holding activity log.
    How it works:
        1. Validates that the holding activity log exists
        2. Returns the holding activity log data
    Expected output: A JSON object containing the holding activity log details
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

@router.delete("/holding_activity_logs/{holding_activity_log_id}")
async def delete_holding_activity_log(holding_activity_log_id: int, db = Depends(get_db)):
    """
    What it does: Deletes a holding activity log and updates:
    1. Fund weightings within the portfolio(s) using the most recent common valuation month if available
    2. product weightings for the client(s) using the most recent common valuation month if available
    3. Recalculates IRR values for the fund(s) with dates after the activity timestamp, but only if valuations have been edited
    Why it's needed: Allows removing activity logs while keeping all weightings and IRR values in sync.
    How it works:
        1. Retrieves the activity log and validates that it exists
        2. Tracks affected portfolios and funds for recalculation
        3. Recalculates fund weightings in affected portfolio(s) using the most recent common valuation month
        4. Recalculates product weightings for affected client(s) using the most recent common valuation month
        5. Recalculates IRR values with dates after the activity timestamp, but only for edited valuations
        6. Deletes the holding activity log
    """
    try:
        # Get activity log
        activity = db.table("holding_activity_log").select("*").eq("id", holding_activity_log_id).execute()
        
        if not activity.data or len(activity.data) == 0:
            raise HTTPException(status_code=404, detail=f"Activity log with ID {holding_activity_log_id} not found")
        
        activity_data = activity.data[0]
        
        # Get source fund data
        source_portfolio_fund_id = activity_data["portfolio_fund_id"]
        source_fund = db.table("portfolio_funds").select("id", "portfolio_id").eq("id", source_portfolio_fund_id).execute()
            
        if not source_fund.data:
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {source_portfolio_fund_id} not found")
            
        source_fund_data = source_fund.data[0]
        source_portfolio_id = source_fund_data["portfolio_id"]
        
        # Set up tracking of affected portfolios and clients
        affected_portfolio_ids = {source_portfolio_id}
        affected_portfolio_fund_ids = {source_portfolio_fund_id}
        affected_client_ids = set()
        
        # Check for related fund in switch activities
        related_fund_id = None
        
        # For Switch activities with a related fund
        if activity_data["activity_type"] in ["SwitchIn", "SwitchOut"] and activity_data.get("related_fund"):
            related_fund_id = activity_data["related_fund"]
            related_fund = db.table("portfolio_funds")\
                .select("id", "portfolio_id")\
                .eq("id", related_fund_id)\
                .execute()
                
            if related_fund.data:
                related_fund_data = related_fund.data[0]
                related_fund_id = related_fund_data["id"]
                related_portfolio_id = related_fund_data["portfolio_id"]
                
                affected_portfolio_ids.add(related_portfolio_id)
                affected_portfolio_fund_ids.add(related_fund_id)
                
                # If related fund is in a different product, get its client_id
                if related_portfolio_id != source_portfolio_id:
                    # Instead of querying product_holdings, directly check client_products
                    related_products = db.table("client_products")\
                        .select("client_id")\
                        .eq("portfolio_id", related_portfolio_id)\
                        .execute()
                        
                    if related_products.data:
                        affected_client_ids.add(related_products.data[0]["client_id"])
                
        # Legacy Switch support
        elif activity_data["activity_type"] == "Switch" and activity_data.get("target_portfolio_fund_id"):
            related_fund_id = activity_data["target_portfolio_fund_id"]
            related_fund = db.table("portfolio_funds")\
                .select("id", "portfolio_id")\
                .eq("id", related_fund_id)\
                .execute()
                
            if related_fund.data:
                related_fund_data = related_fund.data[0]
                related_fund_id = related_fund_data["id"]
                related_portfolio_id = related_fund_data["portfolio_id"]
                
                affected_portfolio_ids.add(related_portfolio_id)
                affected_portfolio_fund_ids.add(related_fund_id)
        
        # Get client_id from product_id for client product lookup
        product_id = activity_data.get("product_id")
        client_id = None
        if product_id:
            client_product = db.table("client_products")\
                .select("client_id")\
                .eq("id", product_id)\
                .execute()
                
            if client_product.data:
                client_id = client_product.data[0]["client_id"]
                affected_client_ids.add(client_id)
        
        # Delete the holding activity log
        db.table("holding_activity_log").delete().eq("id", holding_activity_log_id).execute()
        logger.info(f"Successfully deleted activity log with ID: {holding_activity_log_id}")
        
        # Recalculate weightings for affected portfolios
        for portfolio_id in affected_portfolio_ids:
            await recalculate_fund_weightings(portfolio_id, db)
        
        # Recalculate client product weightings
        for client_id in affected_client_ids:
            await recalculate_product_weightings(client_id, db)
        
        # Properly handle activity_timestamp for IRR recalculation
        activity_timestamp = activity_data.get("activity_timestamp")
        if isinstance(activity_timestamp, str):
            try:
                activity_timestamp = datetime.strptime(activity_timestamp, "%Y-%m-%d")
            except ValueError:
                # Try to parse with more formats if needed
                try:
                    activity_timestamp = datetime.fromisoformat(activity_timestamp.replace('Z', '+00:00'))
                except ValueError:
                    # If parsing fails, log and use current time as fallback
                    logger.warning(f"Could not parse activity timestamp: {activity_timestamp}, using current time")
                    activity_timestamp = datetime.now()
        
        # Recalculate IRR values for affected funds
        for portfolio_fund_id in affected_portfolio_fund_ids:
            await recalculate_irr_values_after_activity(
                portfolio_fund_id=portfolio_fund_id, 
                activity_timestamp=activity_timestamp,
                db=db
            )
        
        return {"status": "success", "message": f"Activity log with ID {holding_activity_log_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting activity log: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/holding_activity_logs/{activity_id}", response_model=HoldingActivityLog)
async def update_holding_activity_log(
    activity_id: int,
    holding_activity_log: HoldingActivityLogUpdate,
    skip_fund_update: bool = Query(False, description="Skip updating the fund's amount_invested"),
    reverse_before_update: bool = Query(False, description="Reverse the effect of the current activity before applying the new one"),
    db = Depends(get_db)
):
    """
    What it does: Updates an existing holding activity log and updates related entities based on activity changes.
    Why it's needed: Allows modifying holding activity logs while keeping fund amounts and IRR values in sync.
    How it works:
        1. Validates the activity update data
        2. Optionally reverses the effect of the original activity
        3. Updates the activity with new values
        4. Processes the updated activity to modify fund amounts
        5. Recalculates valuations and IRR values as needed
        6. Returns the updated activity log
    """
    try:
        # Get the existing activity
        existing_result = db.table("holding_activity_log")\
            .select("*")\
            .eq("id", activity_id)\
            .execute()
            
        if not existing_result.data:
            raise HTTPException(status_code=404, detail=f"Holding activity log with ID {activity_id} not found")
        
        existing_activity = existing_result.data[0]
        
        # Get the data dictionary from the update model
        update_data = {k: v for k, v in holding_activity_log.model_dump().items() if v is not None}
        
        # Debug
        logger.info(f"Updating activity {activity_id} with data: {update_data}")
        logger.info(f"Existing activity: {existing_activity}")
        logger.info(f"Reverse before update: {reverse_before_update}")
        logger.info(f"Skip fund update: {skip_fund_update}")
        
        # Ensure amount is a float if present
        if 'amount' in update_data and update_data['amount'] is not None:
            try:
                update_data['amount'] = float(update_data['amount'])
            except (ValueError, TypeError):
                raise HTTPException(status_code=422, detail="Invalid amount format")
        
        # Ensure activity_timestamp is properly serialized if it's a date object
        if "activity_timestamp" in update_data and isinstance(update_data["activity_timestamp"], date):
            update_data["activity_timestamp"] = update_data["activity_timestamp"].isoformat()
        
        # Remove account_holding_id if present as it's not in the database schema
        if 'account_holding_id' in update_data:
            account_holding_id = update_data.pop('account_holding_id')
            # If account_holding_id is provided but product_id isn't, use account_holding_id as product_id
            if 'product_id' not in update_data:
                update_data['product_id'] = account_holding_id
            logger.info(f"Removed account_holding_id={account_holding_id} from update data (not in schema)")
        
        # Remove product_holding_id if present as it's not in the database schema either
        if 'product_holding_id' in update_data:
            product_holding_id = update_data.pop('product_holding_id')
            logger.info(f"Removed product_holding_id={product_holding_id} from update data (not in schema)")
                
        # Track portfolios and clients affected by this update
        affected_portfolio_ids = set()
        affected_portfolio_fund_ids = set()
        affected_client_ids = set()
        
        # Get original portfolio fund
        original_fund_id = existing_activity['portfolio_fund_id']
        original_fund_result = db.table("portfolio_funds")\
            .select("portfolio_id")\
            .eq("id", original_fund_id)\
            .execute()
            
        if original_fund_result.data:
            original_portfolio_id = original_fund_result.data[0]['portfolio_id']
            affected_portfolio_ids.add(original_portfolio_id)
            affected_portfolio_fund_ids.add(original_fund_id)
        
        # Get original product id (for direct link in the updated schema)
        original_product_id = existing_activity.get('product_id')
        
        if original_product_id:
            # Get client_id from client_products
            client_result = db.table("client_products")\
                    .select("client_id")\
                .eq("id", original_product_id)\
            .execute()
            
            if client_result.data:
                affected_client_ids.add(client_result.data[0]['client_id'])
        
        # If portfolio_fund_id is being changed, add the new fund and portfolio to affected lists
        if 'portfolio_fund_id' in update_data and update_data['portfolio_fund_id'] != original_fund_id:
            new_fund_result = db.table("portfolio_funds")\
            .select("portfolio_id")\
                .eq("id", update_data['portfolio_fund_id'])\
            .execute()
            
            if new_fund_result.data:
                new_portfolio_id = new_fund_result.data[0]['portfolio_id']
                affected_portfolio_ids.add(new_portfolio_id)
                affected_portfolio_fund_ids.add(update_data['portfolio_fund_id'])
        
        # If product_id is being changed, add the new client to the affected list
        if 'product_id' in update_data and update_data['product_id'] != original_product_id:
            new_client_result = db.table("client_products")\
                .select("client_id")\
                .eq("id", update_data['product_id'])\
                .execute()
                
            if new_client_result.data:
                affected_client_ids.add(new_client_result.data[0]['client_id'])
        
        # Handle related funds for Switch activities
        if existing_activity.get('activity_type') in ['SwitchIn', 'SwitchOut'] and existing_activity.get('related_fund'):
            related_fund_id = existing_activity['related_fund']
            related_fund_result = db.table("portfolio_funds")\
                .select("portfolio_id")\
                .eq("id", related_fund_id)\
                .execute()
                
            if related_fund_result.data:
                related_portfolio_id = related_fund_result.data[0]['portfolio_id']
                affected_portfolio_ids.add(related_portfolio_id)
                affected_portfolio_fund_ids.add(related_fund_id)
                
                # Get client for the related fund's portfolio
                related_client_result = db.table("client_products")\
                    .select("client_id")\
                    .eq("portfolio_id", related_portfolio_id)\
                    .execute()
                    
                if related_client_result.data:
                    affected_client_ids.add(related_client_result.data[0]['client_id'])
                    
        # If the activity type is changing to/from a switch type, or the related fund is changing
        if ('activity_type' in update_data and update_data['activity_type'] in ['SwitchIn', 'SwitchOut']) or \
           (existing_activity.get('activity_type') in ['SwitchIn', 'SwitchOut'] and 'related_fund' in update_data):
            
            # If there's a new related fund
            if 'related_fund' in update_data and update_data['related_fund']:
                new_related_fund_id = update_data['related_fund']
                new_related_fund_result = db.table("portfolio_funds")\
                    .select("portfolio_id")\
                    .eq("id", new_related_fund_id)\
                                .execute()
                            
                if new_related_fund_result.data:
                    new_related_portfolio_id = new_related_fund_result.data[0]['portfolio_id']
                    affected_portfolio_ids.add(new_related_portfolio_id)
                    affected_portfolio_fund_ids.add(new_related_fund_id)
                    
                    # Get client for the new related fund's portfolio
                    new_related_client_result = db.table("client_products")\
                        .select("client_id")\
                        .eq("portfolio_id", new_related_portfolio_id)\
                        .execute()
                        
                    if new_related_client_result.data:
                        affected_client_ids.add(new_related_client_result.data[0]['client_id'])
        
        # Update the activity log
        result = db.table("holding_activity_log").update(update_data).eq("id", activity_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to update holding activity log")
        
        # Apply the new activity's effects to fund amounts, but only if skip_fund_update is False
        if not skip_fund_update:
            # Prepare activity data for processing
            # Make a deep copy and ensure proper serialization
            activity_data = {**existing_activity, **update_data}
            
            # Ensure activity_timestamp is properly serialized if it's not already
            if "activity_timestamp" in activity_data and isinstance(activity_data["activity_timestamp"], date):
                activity_data["activity_timestamp"] = activity_data["activity_timestamp"].isoformat()
            
            # Special handling for SwitchOut activities - skip fund updates for SwitchOut with related_fund
            if activity_data.get("activity_type") == 'SwitchOut' and activity_data.get("related_fund"):
                logger.info(f"SwitchOut activity detected with related_fund. Fund updates will be handled by the corresponding SwitchIn activity.")
                # Don't process fund updates for SwitchOut, they're handled by SwitchIn
            else:
                # If reverse_before_update is true, reverse the effect of the original activity first
                if reverse_before_update and activity_data.get("activity_type") in ["Investment", "RegularInvestment", "GovernmentUplift", "Withdrawal"]:
                    logger.info(f"Reversing the effect of the original activity before applying the new one")
                    
                    # Create a copy of the original activity with negated amount
                    original_data = {**existing_activity}
                    # For reversal, we need to invert the activity type effect
                    if original_data.get("activity_type") in ["Investment", "RegularInvestment", "GovernmentUplift"]:
                        # For "adding" activities, we need to subtract
                        logger.info(f"Reversing addition activity by applying negative amount")
                        
                        # Get portfolio fund
                        portfolio_fund_id = original_data.get("portfolio_fund_id")
                        portfolio_fund = db.table("portfolio_funds")\
                            .select("id", "amount_invested")\
                            .eq("id", portfolio_fund_id)\
                            .execute()
                        
                        if portfolio_fund.data:
                            current_amount = float(portfolio_fund.data[0]["amount_invested"] or 0)
                            original_amount = float(original_data.get("amount", 0))
                            
                            # Subtract the original amount
                            new_amount = current_amount - original_amount
                            if new_amount < 0:
                                new_amount = 0
                            
                            db.table("portfolio_funds")\
                                .update({"amount_invested": new_amount})\
                                .eq("id", portfolio_fund_id)\
                                .execute()
                                
                            logger.info(f"Reversed addition: updated fund {portfolio_fund_id} amount_invested from {current_amount} to {new_amount}")
                    
                    elif original_data.get("activity_type") == "Withdrawal":
                        # For "subtracting" activities, we need to add back
                        logger.info(f"Reversing withdrawal activity by adding back amount")
                        
                        # Get portfolio fund
                        portfolio_fund_id = original_data.get("portfolio_fund_id")
                        portfolio_fund = db.table("portfolio_funds")\
                            .select("id", "amount_invested")\
                            .eq("id", portfolio_fund_id)\
                            .execute()
                        
                        if portfolio_fund.data:
                            current_amount = float(portfolio_fund.data[0]["amount_invested"] or 0)
                            original_amount = float(original_data.get("amount", 0))
                            
                            # Add back the original amount
                            new_amount = current_amount + original_amount
                            
                            db.table("portfolio_funds")\
                                .update({"amount_invested": new_amount})\
                                .eq("id", portfolio_fund_id)\
                                .execute()
                                
                            logger.info(f"Reversed withdrawal: updated fund {portfolio_fund_id} amount_invested from {current_amount} to {new_amount}")

                # Now process the new activity data
                await process_activity_for_fund_updates(activity_data, db)
                logger.info(f"Updated fund amounts for activity: {activity_id}")
        else:
            logger.info(f"skip_fund_update is {skip_fund_update}, skipping fund amount updates for activity: {activity_id}")
        
        # Recalculate weightings for all affected portfolios and clients
        for portfolio_id in affected_portfolio_ids:
            await recalculate_fund_weightings(portfolio_id, db)
            
        for client_id in affected_client_ids:
            await recalculate_product_weightings(client_id, db)
        
        # Recalculate IRR values for affected portfolio funds
        for portfolio_fund_id in affected_portfolio_fund_ids:
            activity_timestamp = holding_activity_log.activity_timestamp if holding_activity_log.activity_timestamp else datetime.now()
            
            # Handle different timestamp types
            if isinstance(activity_timestamp, date):
                # Convert date to datetime for the recalculation function
                activity_timestamp = datetime.combine(activity_timestamp, datetime.min.time())
            elif isinstance(activity_timestamp, str):
                try:
                    # Try to parse as ISO format first
                    activity_timestamp = datetime.fromisoformat(activity_timestamp.replace('Z', '+00:00'))
                except ValueError:
                    # Try to parse as date format
                    try:
                        activity_timestamp = datetime.strptime(activity_timestamp, "%Y-%m-%d")
                    except ValueError:
                        # If all parsing fails, use current time as fallback
                        logger.warning(f"Could not parse activity timestamp: {activity_timestamp}, using current time")
                        activity_timestamp = datetime.now()
                
            await recalculate_irr_values_after_activity(
                portfolio_fund_id=portfolio_fund_id,
                activity_timestamp=activity_timestamp,
                db=db
            )
        
        # Get and return the updated activity log
        updated_activity = db.table("holding_activity_log").select("*").eq("id", activity_id).execute()
        if not updated_activity.data or len(updated_activity.data) == 0:
            raise HTTPException(status_code=404, detail=f"Updated activity with ID {activity_id} not found")
            
        return updated_activity.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating holding activity log: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/holding_activity_logs/earliest_date")
async def get_earliest_activity_date(
    product_id: Optional[int] = None,
    portfolio_fund_id: Optional[int] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves the earliest activity date for a given product or portfolio fund.
    Why it's needed: To determine the starting point for monthly activity displays.
    How it works:
        1. Connects to the Supabase database
        2. Queries the 'holding_activity_log' table with filters
        3. Orders by activity_timestamp in ascending order
        4. Returns the earliest date found
    Expected output: A JSON object with the earliest activity date
    """
    try:
        if product_id is None and portfolio_fund_id is None:
            raise HTTPException(status_code=400, detail="Either product_id or portfolio_fund_id is required")

        query = db.table("holding_activity_log").select("activity_timestamp")
        
        if product_id is not None:
            query = query.eq("product_id", product_id)
        
        if portfolio_fund_id is not None:
            query = query.eq("portfolio_fund_id", portfolio_fund_id)
            
        # Order by activity_timestamp ascending (oldest first)
        query = query.order("activity_timestamp", desc=False).limit(1)
            
        result = query.execute()
        
        if not result.data or len(result.data) == 0:
            # If no activity found, return null
            return {"earliest_date": None}
            
        earliest_date = result.data[0]["activity_timestamp"]
        return {"earliest_date": earliest_date}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
