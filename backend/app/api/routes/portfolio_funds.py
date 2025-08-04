from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional
import logging
from datetime import datetime, date, timedelta
import numpy_financial as npf
from decimal import Decimal
import numpy as np
from pydantic import BaseModel
import hashlib
import json
import asyncio

from app.models.portfolio_fund import PortfolioFund, PortfolioFundCreate, PortfolioFundUpdate
from app.models.irr_value import IRRValueCreate
from app.db.database import get_db

# IRR Cache Implementation
class IRRCache:
    """
    In-memory cache for IRR calculations to prevent redundant computations.
    
    Cache Key Strategy:
    - Combines portfolio fund IDs, calculation date, and cash flow data
    - Uses SHA256 hash for consistent, collision-resistant keys
    - TTL (Time To Live) prevents stale data
    """
    
    def __init__(self, default_ttl_minutes: int = 30):
        self._cache = {}
        self._default_ttl = timedelta(minutes=default_ttl_minutes)
        self._lock = asyncio.Lock()
        
    def _generate_cache_key(self, 
                          portfolio_fund_ids: List[int], 
                          calculation_date: Optional[str] = None,
                          cash_flows: Optional[List[float]] = None,
                          fund_valuations: Optional[dict] = None) -> str:
        """Generate a unique cache key for IRR calculation inputs."""
        # Sort fund IDs to ensure consistent ordering
        sorted_fund_ids = sorted(portfolio_fund_ids)
        
        # Create cache key components
        key_data = {
            'fund_ids': sorted_fund_ids,
            'calculation_date': calculation_date or 'latest',
            'cash_flows': cash_flows or [],
            'fund_valuations': fund_valuations or {}
        }
        
        # Convert to JSON string and hash
        key_string = json.dumps(key_data, sort_keys=True)
        cache_key = hashlib.sha256(key_string.encode()).hexdigest()
        
        return cache_key
    
    async def get(self, 
                  portfolio_fund_ids: List[int], 
                  calculation_date: Optional[str] = None,
                  cash_flows: Optional[List[float]] = None,
                  fund_valuations: Optional[dict] = None) -> Optional[dict]:
        """Retrieve cached IRR calculation result."""
        async with self._lock:
            cache_key = self._generate_cache_key(portfolio_fund_ids, calculation_date, cash_flows, fund_valuations)
            
            if cache_key not in self._cache:
                logger.debug(f"IRR cache miss for key: {cache_key[:16]}...")
                return None
            
            cached_item = self._cache[cache_key]
            
            # Check if expired
            if datetime.now() > cached_item['expires_at']:
                logger.debug(f"IRR cache entry expired for key: {cache_key[:16]}...")
                del self._cache[cache_key]
                return None
            
            return cached_item['data']
    
    async def set(self, 
                  portfolio_fund_ids: List[int], 
                  result: dict,
                  calculation_date: Optional[str] = None,
                  cash_flows: Optional[List[float]] = None,
                  fund_valuations: Optional[dict] = None,
                  ttl_minutes: Optional[int] = None) -> None:
        """Store IRR calculation result in cache."""
        async with self._lock:
            cache_key = self._generate_cache_key(portfolio_fund_ids, calculation_date, cash_flows, fund_valuations)
            ttl = timedelta(minutes=ttl_minutes or self._default_ttl.total_seconds() / 60)
            
            self._cache[cache_key] = {
                'data': result,
                'created_at': datetime.now(),
                'expires_at': datetime.now() + ttl,
                'fund_ids': portfolio_fund_ids,
                'calculation_date': calculation_date
            }

    async def invalidate_portfolio_funds(self, portfolio_fund_ids: List[int]) -> int:
        """
        Invalidate cache entries that involve any of the specified portfolio fund IDs.
        
        Args:
            portfolio_fund_ids: List of portfolio fund IDs to invalidate cache for
            
        Returns:
            int: Number of cache entries that were invalidated
        """
        async with self._lock:
            keys_to_remove = []
            
            for cache_key, cached_item in self._cache.items():
                cached_fund_ids = cached_item.get('fund_ids', [])
                
                # Check if any of the fund IDs to invalidate are in this cache entry
                if any(fund_id in cached_fund_ids for fund_id in portfolio_fund_ids):
                    keys_to_remove.append(cache_key)
            
            # Remove the identified cache entries
            for key in keys_to_remove:
                del self._cache[key]
            
            return len(keys_to_remove)

    async def clear_expired(self) -> int:
        """
        Remove expired cache entries.
        
        Returns:
            int: Number of expired entries that were removed
        """
        async with self._lock:
            current_time = datetime.now()
            keys_to_remove = []
            
            for cache_key, cached_item in self._cache.items():
                if current_time > cached_item['expires_at']:
                    keys_to_remove.append(cache_key)
            
            # Remove expired entries
            for key in keys_to_remove:
                del self._cache[key]
            
            return len(keys_to_remove)

    async def get_stats(self) -> dict:
        """
        Get cache statistics.
        
        Returns:
            dict: Cache statistics including total entries, expired entries, etc.
        """
        async with self._lock:
            current_time = datetime.now()
            total_entries = len(self._cache)
            expired_entries = 0
            
            for cached_item in self._cache.values():
                if current_time > cached_item['expires_at']:
                    expired_entries += 1
            
            return {
                'total_entries': total_entries,
                'active_entries': total_entries - expired_entries,
                'expired_entries': expired_entries,
                'cache_hit_potential': f"{((total_entries - expired_entries) / max(total_entries, 1)) * 100:.1f}%"
            }

# Global cache instance
_irr_cache = IRRCache(default_ttl_minutes=30)

# Pydantic models for batch requests
class BatchHistoricalValuationsRequest(BaseModel):
    fund_ids: List[int]

class BatchValuationsRequest(BaseModel):
    fund_ids: List[int]
    valuation_date: Optional[str] = None

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def calculate_excel_style_irr(dates, amounts, guess=0.02):
    """
    Calculate IRR using Excel-style methodology with monthly cash flows.
    
    Args:
        dates: List of dates (can be datetime objects or ISO format strings)
        amounts: List of corresponding cash flow amounts
        guess: Initial guess for IRR calculation (not used in current implementation)
    
    Returns:
        dict: Contains 'period_irr' (annualized IRR) and 'days_in_period'
    """
    import numpy_financial as npf
    from datetime import datetime, date
    import logging
    
    logger = logging.getLogger(__name__)
    
            # Starting IRR calculation
    
    if len(dates) != len(amounts):
        error_msg = f"Dates and amounts must have the same length. Got {len(dates)} dates and {len(amounts)} amounts."
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    if len(dates) < 2:
        error_msg = "IRR calculation requires at least 2 cash flows (investment and return)"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    # Check for at least one negative and one positive cash flow
    negative_flows = [amount for amount in amounts if amount < 0]
    positive_flows = [amount for amount in amounts if amount > 0]
    
    if not negative_flows:
        error_msg = "IRR calculation requires at least one negative cash flow (investment)"
        logger.error(error_msg)
        raise ValueError(error_msg)
        
    if not positive_flows:
        error_msg = "IRR calculation requires at least one positive cash flow (return or final valuation)"
        logger.error(error_msg)
        raise ValueError(error_msg)
        
    try:
        # Convert dates to datetime objects if they're strings, and prepare for logging
        processed_dates = []
        date_strings_for_logging = []
        
        for d in dates:
            if isinstance(d, str):
                # Parse ISO format string to datetime
                if 'T' in d:
                    # Full datetime string
                    date_obj = datetime.fromisoformat(d.replace('Z', '+00:00'))
                else:
                    # Date-only string
                    date_obj = datetime.strptime(d, '%Y-%m-%d')
                processed_dates.append(date_obj)
                date_strings_for_logging.append(d)
            elif isinstance(d, datetime):
                processed_dates.append(d)
                date_strings_for_logging.append(d.isoformat())
            elif isinstance(d, date):
                # Convert date to datetime
                date_obj = datetime.combine(d, datetime.min.time())
                processed_dates.append(date_obj)
                date_strings_for_logging.append(date_obj.isoformat())
            else:
                error_msg = f"Unsupported date type: {type(d)} for date: {d}"
                logger.error(error_msg)
                raise ValueError(error_msg)
        
        # Input validation completed
        
        # Sort cash flows by date to ensure chronological order
        sorted_flows = sorted(zip(processed_dates, amounts), key=lambda x: x[0])
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
            
            return {
                'period_irr': simple_return,
                'days_in_period': (end_date - start_date).days,
                'is_simple_return': True
            }
        
        # Calculate total number of months between start and end (inclusive)
        # For IRR calculation, we need the inclusive count of months in the period
        # Example: Jan to May = 5 months (Jan=0, Feb=1, Mar=2, Apr=3, May=4)
        total_months = ((end_date.year - start_date.year) * 12) + (end_date.month - start_date.month) + 1
        
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
            
            return {
                'period_irr': annualized_return,
                'days_in_period': days,
                'is_simple_return': True
            }
        
        # Create array for months in the period 
        # Since total_months is now the inclusive count, we need exactly that many elements
        # Example: 5 months (Jan=0, Feb=1, Mar=2, Apr=3, May=4) = array of size 5
        monthly_amounts = [0] * total_months
        
        # Map all cash flows to their corresponding months, totaling flows within same month
        for date, amount in zip(dates, amounts):
            month_index = ((date.year - start_date.year) * 12) + (date.month - start_date.month)
            if month_index < 0 or month_index >= len(monthly_amounts):
                error_msg = f"Invalid month index: {month_index} for date {date.isoformat()}"
                logger.error(error_msg)
                raise ValueError(error_msg)
                
            monthly_amounts[month_index] += amount  # Add to any existing amount for that month
        
        # Round amounts below a pence to zero to handle floating point precision errors
        monthly_amounts = [0.0 if abs(amount) < 0.01 else amount for amount in monthly_amounts]
        
        # Validate cash flow sequence
        final_value = monthly_amounts[-1]
        
        # UPDATED: More flexible validation for final cash flow
        # The final cash flow should generally be positive (representing current valuation)
        # but we'll allow some flexibility for edge cases
        if final_value <= 0:
            # Check if this might be a valid scenario (e.g., all money withdrawn)
            total_outflows = sum(amount for amount in monthly_amounts if amount > 0)
            total_inflows = abs(sum(amount for amount in monthly_amounts if amount < 0))
            
            if total_outflows > total_inflows:
                # This might be a valid scenario where more money was withdrawn than invested
                logger.warning(f"Final cash flow is negative ({final_value}), but total outflows ({total_outflows}) > total inflows ({total_inflows}). Proceeding with calculation.")
            else:
                error_msg = f"Final cash flow (valuation) must be positive, but got {final_value}. This typically indicates the valuation is being combined with activities in the same month."
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
        logger.info(f"Monthly IRR: {monthly_irr * 100:.4f}%")
        logger.info(f"Annualized IRR: {annualized_irr * 100:.4f}%")
        logger.info(f"Months in period: {total_months}")
        logger.info(f"Array size used: {len(monthly_amounts)}")
        
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
    """Convert database values to JSON serializable types."""
    if val is None:
        return None
    elif isinstance(val, Decimal):
        return float(val)
    elif isinstance(val, (date, datetime)):
        return val.isoformat()
    elif isinstance(val, (list, tuple)):
        return [to_serializable(item) for item in val]
    elif isinstance(val, dict):
        return {k: to_serializable(v) for k, v in val.items()}
    elif isinstance(val, (int, float, str, bool)):
        return val
    else:
        # For any other type, try to convert to string as fallback
        try:
            return str(val)
        except Exception:
            return None

router = APIRouter()

@router.get("/portfolio_funds", response_model=List[PortfolioFund])
async def get_portfolio_funds(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    portfolio_id: Optional[int] = None,
    available_funds_id: Optional[int] = None,
    select: Optional[str] = "*",  # Add select parameter to allow choosing fields
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
        # Build dynamic query with filters
        base_query = "SELECT * FROM portfolio_funds"
        where_conditions = []
        params = []
        param_counter = 1
        
        # Apply filters
        if portfolio_id is not None:
            where_conditions.append(f"portfolio_id = ${param_counter}")
            params.append(portfolio_id)
            param_counter += 1
            
        if available_funds_id is not None:
            where_conditions.append(f"available_funds_id = ${param_counter}")
            params.append(available_funds_id)
            param_counter += 1
        
        # Add WHERE clause if we have conditions
        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)
        
        # Add pagination
        base_query += f" ORDER BY id LIMIT ${param_counter} OFFSET ${param_counter + 1}"
        params.extend([limit, skip])
        
        # Execute the main query
        result = await db.fetch(base_query, *params)
        
        if not result:
            return []
        
        # Convert records to dicts
        portfolio_funds = [dict(record) for record in result]
            
        # Get all fund IDs
        fund_ids = [fund["id"] for fund in portfolio_funds]
        
        # Get the latest valuations for all funds in a single query if possible
        latest_valuations = {}
        
        if len(fund_ids) > 0:
            # Get the latest valuation for each fund from portfolio_fund_valuations
            # Using DISTINCT ON to get the latest valuation per fund efficiently
            valuation_query = """
                SELECT DISTINCT ON (portfolio_fund_id) 
                       valuation, valuation_date, portfolio_fund_id
                FROM portfolio_fund_valuations
                WHERE portfolio_fund_id = ANY($1::int[])
                ORDER BY portfolio_fund_id, valuation_date DESC
            """
            
            valuation_result = await db.fetch(valuation_query, fund_ids)
                
            # Group valuations by portfolio_fund_id and keep only the latest for each
            if valuation_result:
                for val_record in valuation_result:
                    val = dict(val_record)
                    fund_id = val.get("portfolio_fund_id")
                    latest_valuations[fund_id] = val
        
        # Add valuations to the portfolio funds
        for fund in portfolio_funds:
            fund_id = fund["id"]
            if fund_id in latest_valuations:
                fund["market_value"] = float(latest_valuations[fund_id]["valuation"])
                fund["valuation_date"] = latest_valuations[fund_id]["valuation_date"]
        
        return portfolio_funds
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
        portfolio_result = await db.fetchrow("SELECT id FROM portfolios WHERE id = $1", portfolio_fund.portfolio_id)
        if not portfolio_result:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Validate fund exists
        fund_result = await db.fetchrow("SELECT id FROM available_funds WHERE id = $1", portfolio_fund.available_funds_id)
        if not fund_result:
            raise HTTPException(status_code=404, detail="Fund not found")
        
        # Step 1: Create the record with only the required fields (avoiding weighting due to schema cache issue)
        today = date.today().isoformat()

        portfolio_fund_data = {
            "portfolio_id": portfolio_fund.portfolio_id,
            "available_funds_id": portfolio_fund.available_funds_id,
            "target_weighting": to_serializable(portfolio_fund.target_weighting),  # Allow None/NULL values
            "start_date": portfolio_fund.start_date,  # Pass date object directly
            "end_date": portfolio_fund.end_date if portfolio_fund.end_date else None,  # Pass date object directly
            "amount_invested": portfolio_fund.amount_invested,
            "status": portfolio_fund.status

        }
        
        # Add amount_invested if provided
        if portfolio_fund.amount_invested is not None:
            portfolio_fund_data["amount_invested"] = float(portfolio_fund.amount_invested)
        
        logger.info(f"Creating portfolio fund with minimal data: {portfolio_fund_data}")
        
        # Build dynamic INSERT query
        columns = list(portfolio_fund_data.keys())
        values = list(portfolio_fund_data.values())
        placeholders = [f"${i+1}" for i in range(len(values))]
        
        insert_query = f"""
            INSERT INTO portfolio_funds ({', '.join(columns)}) 
            VALUES ({', '.join(placeholders)}) 
            RETURNING *
        """
        
        # Insert the record
        result = await db.fetchrow(insert_query, *values)
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create portfolio fund - no data returned")
        
        created_fund = dict(result)
        created_fund_id = created_fund["id"]
        logger.info(f"Successfully created portfolio fund with ID: {created_fund_id}")
        
        # Step 2: Update the weighting separately if provided
        if portfolio_fund.target_weighting is not None:
            try:
                logger.info(f"Updating weighting to {portfolio_fund.target_weighting} for fund ID {created_fund_id}")
                
                # Use the update endpoint to set the weighting
                update_result = await db.fetchrow(
                    "UPDATE portfolio_funds SET target_weighting = $1 WHERE id = $2 RETURNING *",
                    float(portfolio_fund.target_weighting), created_fund_id
                )
                
                if update_result:
                    # Use the updated data
                    created_fund = dict(update_result)
                    logger.info(f"Successfully updated weighting: {created_fund}")
                else:
                    logger.warning("Weighting update didn't return data, but fund was created")
                    # Add weighting to the original data for return
                    created_fund["target_weighting"] = float(portfolio_fund.target_weighting)
                    
            except Exception as weighting_error:
                logger.warning(f"Failed to update weighting, but fund was created: {str(weighting_error)}")
                # Fund was created successfully, just couldn't set weighting
                # Add weighting to the return data anyway
                created_fund["target_weighting"] = float(portfolio_fund.target_weighting) if portfolio_fund.target_weighting is not None else None
        
        # Use Pydantic model for serialization
        return PortfolioFund(**created_fund)
        
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
        3. Fetches the latest valuation from portfolio_fund_valuations if available
        4. Returns the association data or raises a 404 error if not found
    Expected output: A JSON object containing the requested portfolio fund's details
    """
    try:
        result = await db.fetchrow("SELECT * FROM portfolio_funds WHERE id = $1", portfolio_fund_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")
            
        # Get the portfolio fund data
        portfolio_fund = dict(result)

        # Get latest valuation for this fund from portfolio_fund_valuations
        valuation_result = await db.fetchrow("""
            SELECT valuation, valuation_date
            FROM portfolio_fund_valuations
            WHERE portfolio_fund_id = $1
            ORDER BY valuation_date DESC
            LIMIT 1
        """, portfolio_fund_id)
            
        if valuation_result:
            latest_valuation = dict(valuation_result)
            portfolio_fund["market_value"] = float(latest_valuation["valuation"])
            portfolio_fund["valuation_date"] = latest_valuation["valuation_date"]

        return portfolio_fund
    except Exception as e:
        logger.error(f"Error retrieving portfolio fund: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/portfolio_funds/{portfolio_fund_id}", response_model=PortfolioFund)
async def update_portfolio_fund(portfolio_fund_id: int, portfolio_fund_update: PortfolioFundUpdate, db = Depends(get_db)):
    """
    Update a portfolio fund by ID with automatic IRR cache invalidation.
    
    Args:
        portfolio_fund_id: ID of the portfolio fund to update
        portfolio_fund_update: Update data for the portfolio fund
        
    Returns:
        Updated portfolio fund details
    """
    try:
        # Convert update model to dict, excluding None values and ensuring JSON serializable
        raw_update_data = {k: v for k, v in portfolio_fund_update.dict().items() if v is not None}
        
        if not raw_update_data:
            raise HTTPException(status_code=422, detail="No valid update data provided")
        
        # Ensure all update data is JSON serializable (convert Decimals to floats)
        update_data = {}
        for key, value in raw_update_data.items():
            update_data[key] = to_serializable(value)
        
        # Check if the portfolio fund exists
        fund_result = await db.fetchrow("SELECT * FROM portfolio_funds WHERE id = $1", portfolio_fund_id)
        if not fund_result:
            raise HTTPException(status_code=404, detail=f"Portfolio fund with id {portfolio_fund_id} not found")
        
        # Build dynamic UPDATE query
        set_clauses = []
        values = []
        param_counter = 1
        
        for key, value in update_data.items():
            set_clauses.append(f"{key} = ${param_counter}")
            values.append(value)
            param_counter += 1
        
        # Add portfolio_fund_id as the last parameter
        values.append(portfolio_fund_id)
        
        update_query = f"""
            UPDATE portfolio_funds 
            SET {', '.join(set_clauses)} 
            WHERE id = ${param_counter}
            RETURNING *
        """
        
        # Update the portfolio fund
        logger.info(f"Updating portfolio fund {portfolio_fund_id} with data: {update_data}")
        response = await db.fetchrow(update_query, *values)
        
        if not response:
            raise HTTPException(status_code=404, detail="Portfolio fund not found or no changes applied")
        
        # Invalidate IRR cache for this fund since data has changed
        await _irr_cache.invalidate_portfolio_funds([portfolio_fund_id])
        
        # Convert Decimal objects to float for JSON serialization with comprehensive handling
        updated_fund = dict(response)
        
        try:
            # Deep conversion of all values to ensure JSON serialization
            serialized_fund = {}
            for key, value in updated_fund.items():
                serialized_fund[key] = to_serializable(value)
            
            logger.info(f"Serialized fund data: {serialized_fund}")
            
            # Use Pydantic model for final validation and serialization
            return PortfolioFund(**serialized_fund)
            
        except Exception as serialization_error:
            logger.error(f"Error serializing portfolio fund data: {str(serialization_error)}")
            logger.error(f"Problematic data: {updated_fund}")
            
            # Fallback: return basic response without Pydantic validation
            return {
                "id": updated_fund.get("id"),
                "portfolio_id": updated_fund.get("portfolio_id"),
                "available_funds_id": updated_fund.get("available_funds_id"),
                "target_weighting": float(updated_fund.get("target_weighting", 0)) if updated_fund.get("target_weighting") is not None else None,
                "amount_invested": float(updated_fund.get("amount_invested", 0)) if updated_fund.get("amount_invested") is not None else None,
                "status": updated_fund.get("status", "active"),
                "start_date": updated_fund.get("start_date"),
                "end_date": updated_fund.get("end_date")
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating portfolio fund {portfolio_fund_id}: {str(e)}")
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
        check_result = await db.fetchrow("SELECT id FROM portfolio_funds WHERE id = $1", portfolio_fund_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")
        
        logger.info(f"Deleting portfolio fund with ID: {portfolio_fund_id} and all related data")
        
        # First, delete related IRR values
        irr_delete_query = "DELETE FROM portfolio_fund_irr_values WHERE fund_id = $1"
        irr_values_deleted = await db.execute(irr_delete_query, portfolio_fund_id)
        logger.info(f"Deleted {irr_values_deleted.split()[-1]} IRR values for portfolio fund {portfolio_fund_id}")
        
        # Second, delete related holding activity logs
        activity_delete_query = "DELETE FROM holding_activity_log WHERE portfolio_fund_id = $1"
        activity_logs_deleted = await db.execute(activity_delete_query, portfolio_fund_id)
        logger.info(f"Deleted {activity_logs_deleted.split()[-1]} activity logs for portfolio fund {portfolio_fund_id}")
        
        # Now it's safe to delete the portfolio fund
        fund_delete_query = "DELETE FROM portfolio_funds WHERE id = $1"
        await db.execute(fund_delete_query, portfolio_fund_id)
        
        # Extract deletion counts from execute results
        irr_count = int(irr_values_deleted.split()[-1]) if irr_values_deleted.split()[-1].isdigit() else 0
        activity_count = int(activity_logs_deleted.split()[-1]) if activity_logs_deleted.split()[-1].isdigit() else 0
        
        return {
            "message": f"Portfolio fund with ID {portfolio_fund_id} deleted successfully",
            "details": {
                "irr_values_deleted": irr_count,
                "activity_logs_deleted": activity_count
            }
        }
    except Exception as e:
        logger.error(f"Error deleting portfolio fund: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/portfolio-funds/latest-irr", response_model=dict)
async def get_latest_fund_irrs(
    fund_ids: str = Query(..., description="Comma-separated list of portfolio fund IDs"),
    db = Depends(get_db)
):
    """
    Optimized endpoint to fetch stored fund IRRs from latest_portfolio_fund_irr_values view.
    This eliminates the need to recalculate individual fund IRRs when stored values are sufficient.
    """
    try:
        # Parse the comma-separated fund IDs
        fund_id_list = [int(id.strip()) for id in fund_ids.split(',') if id.strip()]
        
        if not fund_id_list:
            return {"fund_irrs": [], "count": 0}
        
        # Query the latest_portfolio_fund_irr_values view for multiple funds
        result = await db.fetch("""
            SELECT fund_id, irr_result, date 
            FROM latest_portfolio_fund_irr_values 
            WHERE fund_id = ANY($1::int[])
        """, fund_id_list)
        
        # Transform the data to match expected format
        fund_irrs = []
        if result:
            for irr_record in result:
                irr_dict = dict(irr_record)
                fund_irrs.append({
                    "fund_id": irr_dict["fund_id"],
                    "irr_result": irr_dict["irr_result"],
                    "irr_date": irr_dict["date"]
                })
        
        return {
            "fund_irrs": fund_irrs,
            "count": len(fund_irrs),
            "requested_funds": len(fund_id_list),
            "source": "stored"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid fund_ids parameter: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching stored fund IRRs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

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
        check_result = await db.fetchrow("SELECT * FROM portfolio_funds WHERE id = $1", portfolio_fund_id)
        if not check_result:
            logger.error(f"Portfolio fund not found with ID: {portfolio_fund_id}")
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")

        logger.info(f"Found portfolio fund: {dict(check_result)}")

        # Get the latest IRR value for this fund using the optimized index
        logger.info("Querying irr_values table...")
        irr_query = """
            SELECT * FROM portfolio_fund_irr_values 
            WHERE fund_id = $1 
            ORDER BY date DESC 
            LIMIT 1
        """
            
        logger.info(f"Executing query with fund_id: {portfolio_fund_id}")
        irr_result = await db.fetchrow(irr_query, portfolio_fund_id)
        logger.info(f"Query result: {dict(irr_result) if irr_result else None}")

        if not irr_result:
            logger.warning(f"No IRR values found for portfolio_fund_id: {portfolio_fund_id}")
            return {
                "portfolio_fund_id": portfolio_fund_id,
                "irr": 0,
                "calculation_date": None,
                "fund_valuation_id": None
            }

        latest_irr = dict(irr_result)
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
        check_result = await db.fetchrow("SELECT * FROM portfolio_funds WHERE id = $1", portfolio_fund_id)
        if not check_result:
            logger.error(f"Portfolio fund not found with ID: {portfolio_fund_id}")
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")
        
        # Get all existing IRR values for this fund
        existing_irr_values = await db.fetch("""
            SELECT * FROM portfolio_fund_irr_values 
            WHERE fund_id = $1 
            ORDER BY date
        """, portfolio_fund_id)
            
        if not existing_irr_values:
            logger.info(f"No existing IRR values found for portfolio_fund_id: {portfolio_fund_id}. Skipping initial IRR creation.")
            return {
                "portfolio_fund_id": portfolio_fund_id,
                "message": "No existing IRR values to recalculate. Skipping IRR calculation.",
                "updated_count": 0
            }
        
        # Recalculate IRR for each existing valuation date
        update_count = 0
        for irr_record in existing_irr_values:
            try:
                irr_value = dict(irr_record)
                # Parse date and extract month/year
                valuation_date = datetime.fromisoformat(irr_value["date"])

                fund_valuation_id = irr_value["fund_valuation_id"]
                
                # Get the valuation amount from portfolio_fund_valuations table
                if fund_valuation_id:
                    valuation_result = await db.fetchrow("""
                        SELECT valuation FROM portfolio_fund_valuations WHERE id = $1
                    """, fund_valuation_id)
                        
                    if valuation_result:
                        valuation_amount = float(dict(valuation_result)["valuation"])
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
                    
                    valuation_result = await db.fetchrow("""
                        SELECT * FROM portfolio_fund_valuations 
                        WHERE portfolio_fund_id = $1 
                          AND valuation_date >= $2 
                          AND valuation_date < $3
                        ORDER BY valuation_date LIMIT 1
                    """, portfolio_fund_id, month_start.isoformat(), next_month.isoformat())
                        
                    if not valuation_result:
                        logger.warning(f"No valuation found for date {valuation_date.isoformat()}, skipping IRR recalculation")
                        continue
                        
                    valuation_dict = dict(valuation_result)
                    valuation_amount = float(valuation_dict["valuation"])
                    fund_valuation_id = valuation_dict["id"]

                
                logger.info(f"Recalculating IRR for date: {valuation_date.isoformat()}, valuation: {valuation_amount}")
                
                # For zero valuations, use proper standardized calculation (exclude from final valuation)
                # No hardcoding to 0% - let the standardized endpoint handle the £0 edge case
                
                # Skip if valuation is negative
                if valuation_amount < 0:
                    logger.warning(f"Skipping IRR calculation for negative valuation: {valuation_amount}")
                    continue
                
                # Recalculate IRR for this date and valuation using standardized endpoint
                irr_result = await calculate_single_portfolio_fund_irr(
                    portfolio_fund_id=portfolio_fund_id,
                    irr_date=valuation_date.strftime("%Y-%m-%d"),
                    db=db
                )
                
                if irr_result.get("success"):
                    logger.info(f"Successfully recalculated IRR for date: {valuation_date.isoformat()}")
                    update_count += 1
                else:
                    logger.error(f"Failed to recalculate IRR for date {valuation_date.isoformat()}: {irr_result}")
                    # Continue with next valuation date instead of failing whole process
                
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
        check_result = await db.fetchrow("SELECT * FROM portfolio_funds WHERE id = $1", portfolio_fund_id)
        if not check_result:
            logger.error(f"Portfolio fund not found with ID: {portfolio_fund_id}")
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {portfolio_fund_id} not found")
            
        # Get all IRR values
        irr_values = await db.fetch("""
            SELECT * FROM portfolio_fund_irr_values 
            WHERE fund_id = $1 
            ORDER BY date
        """, portfolio_fund_id)
            
        result = []
        
        if irr_values:
            for irr_record in irr_values:
                irr = dict(irr_record)
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

@router.post("/portfolio_funds/batch/irr-values", response_model=dict)
async def get_batch_irr_values(
    fund_ids: List[int] = Body(..., description="List of portfolio fund IDs to fetch IRR values for"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves IRR values for multiple portfolio funds in a single batch request.
    Why it's needed: Optimizes performance by reducing multiple API calls to a single request.
    How it works:
        1. Accepts a list of portfolio fund IDs
        2. Validates each fund exists
        3. Queries the irr_values table for all entries for these funds in a single query
        4. Groups and formats the data by fund ID for the frontend
    Expected output: A JSON object with fund IDs as keys and arrays of IRR values as values
    """
    try:
        logger.info(f"Fetching batch IRR values for {len(fund_ids)} portfolio funds: {fund_ids}")
        
        if not fund_ids:
            logger.warning("No fund IDs provided for batch IRR values")
            return {"data": {}}
            
        # Check that all funds exist
        funds_check = await db.fetch("""
            SELECT id FROM portfolio_funds WHERE id = ANY($1::int[])
        """, fund_ids)
            
        found_fund_ids = [dict(fund)["id"] for fund in funds_check] if funds_check else []
        missing_fund_ids = [fund_id for fund_id in fund_ids if fund_id not in found_fund_ids]
        
        if missing_fund_ids:
            logger.warning(f"Some portfolio funds not found: {missing_fund_ids}")
            
        # Get all IRR values for the valid funds in a single query
        irr_values = await db.fetch("""
            SELECT * FROM portfolio_fund_irr_values 
            WHERE fund_id = ANY($1::int[]) 
            ORDER BY date
        """, found_fund_ids)
            
        # Group by fund_id
        result = {}
        
        if irr_values:
            for irr_record in irr_values:
                irr = dict(irr_record)
                fund_id = irr["fund_id"]
                
                # Format as needed for frontend
                formatted_irr = {
                    "id": irr["id"],
                    "date": irr["date"],
                    "irr": float(irr["irr_result"]),
                    "fund_id": fund_id,
                    "created_at": irr["created_at"],
                    "fund_valuation_id": irr["fund_valuation_id"]
                }
                
                # Initialize the array if this is the first entry for this fund
                if fund_id not in result:
                    result[fund_id] = []
                    
                result[fund_id].append(formatted_irr)
                
        # Initialize empty arrays for funds with no IRR values
        for fund_id in found_fund_ids:
            if fund_id not in result:
                result[fund_id] = []
                
        logger.info(f"Successfully fetched batch IRR values for {len(result)} funds")
        return {"data": result}
    except Exception as e:
        logger.error(f"Error fetching batch IRR values: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching batch IRR values: {str(e)}")

@router.post("/portfolio_funds/batch/irr-values-by-date", response_model=dict)
async def get_batch_irr_values_by_date(
    fund_ids: List[int] = Body(..., description="List of portfolio fund IDs to fetch IRR values for"),
    target_month: int = Body(..., description="Target month (1-12)"),
    target_year: int = Body(..., description="Target year (e.g., 2024)"),
    db = Depends(get_db)
):
    """
    Fetch IRR values for multiple funds filtered by specific month/year.
    Only considers YYYY-MM from the date column, ignoring day and time.
    """
    try:
        logger.info(f"Fetching IRR values for {len(fund_ids)} funds for {target_month:02d}/{target_year}")
        
        if not fund_ids:
            return {"data": {}}
        
        # Convert fund_ids to ensure they're valid
        found_fund_ids = []
        for fund_id in fund_ids:
            try:
                found_fund_ids.append(int(fund_id))
            except (ValueError, TypeError):
                logger.warning(f"Invalid fund_id: {fund_id}")
                continue
        
        if not found_fund_ids:
            logger.warning("No valid fund IDs provided")
            return {"data": {}}
        
        # Query IRR values with date filtering using PostgreSQL date functions
        # Extract year and month from the date column and match target_year and target_month
        irr_values = await db.fetch("""
            SELECT * FROM portfolio_fund_irr_values 
            WHERE fund_id = ANY($1::int[])
        """, found_fund_ids)
        
        # Filter results in Python to match the target month/year
        filtered_irr_values = []
        if irr_values:
            for irr_record in irr_values:
                irr = dict(irr_record)
                try:
                    # Parse the date string to extract month and year
                    date_str = irr["date"]
                    date_obj = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    
                    # Check if month and year match
                    if date_obj.month == target_month and date_obj.year == target_year:
                        filtered_irr_values.append(irr)
                except Exception as e:
                    logger.warning(f"Error parsing date {irr.get('date', 'unknown')}: {str(e)}")
                    continue
        
        # Group by fund_id and get the latest IRR for each fund in that month/year
        result = {}
        
        for irr in filtered_irr_values:
            fund_id = irr["fund_id"]
            
            # Format as needed for frontend
            formatted_irr = {
                "id": irr["id"],
                "date": irr["date"],
                "irr": float(irr["irr_result"]),
                "fund_id": fund_id,
                "created_at": irr["created_at"],
                "fund_valuation_id": irr["fund_valuation_id"]
            }
            
            # Keep only the latest IRR for each fund in the target month/year
            if fund_id not in result:
                result[fund_id] = formatted_irr
            else:
                # Compare dates and keep the latest one
                existing_date = datetime.fromisoformat(result[fund_id]["date"].replace("Z", "+00:00"))
                current_date = datetime.fromisoformat(irr["date"].replace("Z", "+00:00"))
                if current_date > existing_date:
                    result[fund_id] = formatted_irr
        
        # For funds with no IRR values in the target month/year, set to None
        for fund_id in found_fund_ids:
            if fund_id not in result:
                result[fund_id] = None
                
        logger.info(f"Successfully fetched IRR values for {len([v for v in result.values() if v is not None])} out of {len(found_fund_ids)} funds for {target_month:02d}/{target_year}")
        return {"data": result}
        
    except Exception as e:
        logger.error(f"Error fetching IRR values by date: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching IRR values by date: {str(e)}")

@router.post("/portfolio_funds/aggregated-irr-history", response_model=dict)
async def get_aggregated_irr_history(
    fund_ids: List[int] = Body(None, description="List of portfolio fund IDs to fetch IRR history for"),
    portfolio_id: Optional[int] = Body(None, description="Optional portfolio ID to filter funds"),
    include_fund_details: bool = Body(True, description="Include detailed fund information"),
    include_portfolio_irr: bool = Body(True, description="Include portfolio-level IRR calculations"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves pre-aggregated IRR history for multiple funds, organized by month/year.
    Why it's needed: Reduces frontend processing by providing data already structured for display.
    How it works:
        1. Accepts a list of portfolio fund IDs or portfolio ID
        2. Gets fund information including names, risk levels, and other details
        3. Retrieves all IRR values for the specified funds
        4. Pre-processes the data by extracting all unique month/years
        5. Organizes IRR values by fund and month/year in a table-ready format
        6. Optionally calculates portfolio-level IRR for each month
    Expected output: A JSON object with columns (date labels) and rows (fund data with IRR values)
    """
    try:
        logger.info(f"Fetching aggregated IRR history for {len(fund_ids) if fund_ids else 0} funds, portfolio_id: {portfolio_id}")
        
        # If portfolio_id is provided, get all funds in that portfolio
        if portfolio_id and not fund_ids:
            portfolio_funds = await db.fetch("""
                SELECT * FROM portfolio_funds WHERE portfolio_id = $1
            """, portfolio_id)
            
            if portfolio_funds:
                fund_ids = [dict(fund)["id"] for fund in portfolio_funds]
                logger.info(f"Found {len(fund_ids)} funds in portfolio {portfolio_id}")
            else:
                logger.warning(f"No funds found in portfolio {portfolio_id}")
                return {
                    "columns": [],
                    "funds": [],
                    "portfolio_info": None,
                    "portfolio_irr": {} if include_portfolio_irr else None
                }
                
            # Get the portfolio name for context
            portfolio_info = None
            try:
                portfolio_result = await db.fetchrow("""
                    SELECT id, portfolio_name, target_risk_level FROM portfolios WHERE id = $1
                """, portfolio_id)
                
                if portfolio_result:
                    portfolio_info = dict(portfolio_result)
            except Exception as e:
                logger.warning(f"Error fetching portfolio info: {str(e)}")
        
        if not fund_ids:
            logger.warning("No fund IDs provided for IRR history")
            return {
                "columns": [],
                "funds": [],
                "portfolio_info": None,
                "portfolio_irr": {} if include_portfolio_irr else None
            }
        
        # Get fund details including names
        fund_details = {}
        funds_data = await db.fetch("""
            SELECT * FROM portfolio_funds WHERE id = ANY($1::int[])
        """, fund_ids)
        
        # Collect available_funds_ids
        available_fund_ids = []
        portfolio_fund_map = {}
        
        for fund_record in funds_data if funds_data else []:
            fund = dict(fund_record)
            fund_id = fund["id"]
            available_fund_id = fund["available_funds_id"]
            available_fund_ids.append(available_fund_id)
            portfolio_fund_map[fund_id] = fund
        
        # Get available fund details in a single query
        available_funds_map = {}
        if available_fund_ids:
            available_funds = await db.fetch("""
                SELECT * FROM available_funds WHERE id = ANY($1::int[])
            """, available_fund_ids)
            
            if available_funds:
                available_funds_map = {
                    dict(fund)["id"]: dict(fund) for fund in available_funds
                }
        
        # Merge portfolio_funds with available_funds data
        for fund_id, portfolio_fund in portfolio_fund_map.items():
            available_fund_id = portfolio_fund["available_funds_id"]
            available_fund = available_funds_map.get(available_fund_id, {})
            
            # Add to fund details
            fund_details[fund_id] = {
                "id": fund_id,
                "name": available_fund.get("fund_name", "Unknown Fund"),
                "risk_level": available_fund.get("risk_level", None),
                "fund_type": available_fund.get("fund_type", None),
                "target_weighting": portfolio_fund.get("target_weighting", 0),
                "start_date": portfolio_fund.get("start_date", None),
                "status": portfolio_fund.get("status", "active"),
                "available_fund": {
                    "id": available_fund_id,
                    "name": available_fund.get("fund_name", "Unknown Fund"),
                    "description": available_fund.get("description", None),
                    "provider": available_fund.get("provider", None),
                }
            }
        
        # Get all IRR values for the specified funds
        irr_values = await db.fetch("""
            SELECT * FROM portfolio_fund_irr_values 
            WHERE fund_id = ANY($1::int[]) 
            ORDER BY date
        """, fund_ids)
        
        if not irr_values:
            logger.info("No IRR values found for the specified funds")
            return {
                "columns": [],
                "funds": [
                    {
                        "id": fund_id,
                        "name": fund_details.get(fund_id, {}).get("name", "Unknown Fund"),
                        "details": fund_details.get(fund_id, {}) if include_fund_details else None,
                        "values": {}
                    }
                    for fund_id in fund_ids if fund_id in fund_details
                ],
                "portfolio_info": portfolio_info,
                "portfolio_irr": {} if include_portfolio_irr else None
            }
        
        # Extract all unique month/years from the IRR values
        months_set = set()
        
        # Data structure to hold fund IRR values by month/year
        funds_data = {}
        
        # Process all IRR values
        for irr_record in irr_values:
            irr = dict(irr_record)
            fund_id = irr["fund_id"]
            date_str = irr["date"]
            
            # Format date as month/year (e.g., "Jan 2023")
            date_obj = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            month_year = date_obj.strftime("%b %Y")
            
            # Add to unique months set
            months_set.add(month_year)
            
            # Initialize fund data if not exists
            if fund_id not in funds_data:
                funds_data[fund_id] = {
                    "id": fund_id,
                    "name": fund_details.get(fund_id, {}).get("name", "Unknown Fund"),
                    "details": fund_details.get(fund_id, {}) if include_fund_details else None,
                    "values": {}
                }
            
            # Store IRR value for this month/year
            funds_data[fund_id]["values"][month_year] = float(irr["irr_result"])
        
        # Convert months set to sorted list (newest first)
        months_list = sorted(list(months_set), key=lambda d: datetime.strptime(d, "%b %Y"), reverse=True)
        
        # Fetch stored portfolio-level IRR values from portfolio_irr_values table
        portfolio_irr_values = {}
        if include_portfolio_irr and portfolio_id and months_list:
            logger.info(f"Fetching stored portfolio IRR values for {len(months_list)} months")
            
            # Get all stored portfolio IRR values for this portfolio
            portfolio_irr_result = await db.fetch("""
                SELECT irr_result, date FROM portfolio_irr_values 
                WHERE portfolio_id = $1 
                ORDER BY date DESC
            """, portfolio_id)
                
            if portfolio_irr_result:
                # Convert stored IRR values to month/year format and match with months_list
                for irr_record_row in portfolio_irr_result:
                    irr_record = dict(irr_record_row)
                    try:
                        # Parse the IRR date
                        irr_date = datetime.fromisoformat(irr_record["date"].replace("Z", "+00:00"))
                        irr_month_year = irr_date.strftime("%b %Y")
                        
                        # Only include if it matches one of our month/year periods
                        if irr_month_year in months_list:
                            portfolio_irr_values[irr_month_year] = float(irr_record["irr_result"])
                            
                    except Exception as e:
                        logger.warning(f"Error processing portfolio IRR record {irr_record}: {str(e)}")
                        continue
                            
                logger.info(f"Found {len(portfolio_irr_values)} stored portfolio IRR values matching the requested periods")
            else:
                logger.info("No stored portfolio IRR values found for this portfolio")
                        
        # Add any missing funds (those with no IRR values)
        for fund_id in fund_ids:
            if fund_id in fund_details and fund_id not in funds_data:
                funds_data[fund_id] = {
                    "id": fund_id,
                    "name": fund_details[fund_id]["name"],
                    "details": fund_details.get(fund_id, {}) if include_fund_details else None,
                    "values": {}
                }
        
        # Convert funds_data dict to list
        funds_list = list(funds_data.values())
        
        # Sort funds alphabetically by name
        funds_list.sort(key=lambda f: f["name"])
        
        # Return pre-processed data
        result = {
            "columns": months_list,
            "funds": funds_list,
            "portfolio_info": portfolio_info,
            "portfolio_irr": portfolio_irr_values if include_portfolio_irr else None
        }
        
        logger.info(f"Successfully aggregated IRR history for {len(funds_list)} funds across {len(months_list)} months")
        if include_portfolio_irr:
            logger.info(f"Calculated portfolio IRR for {len(portfolio_irr_values)} months")
        
        return result
        
    except Exception as e:
        logger.error(f"Error aggregating IRR history: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error aggregating IRR history: {str(e)}")

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
        irr_check = await db.fetchrow("SELECT * FROM portfolio_fund_irr_values WHERE id = $1", irr_value_id)
        if not irr_check:
            logger.error(f"IRR value not found with ID: {irr_value_id}")
            raise HTTPException(status_code=404, detail=f"IRR value with ID {irr_value_id} not found")
            
        irr_record = dict(irr_check)
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
                activity_logs = await db.fetch("""
                    SELECT * FROM holding_activity_log 
                    WHERE portfolio_fund_id = $1 
                    ORDER BY activity_timestamp
                """, fund_id)
                
                if activity_logs:
                    logger.info(f"Found {len(activity_logs)} activity logs for recalculation")
                    
                    # Prepare cash flows and dates
                    dates = []
                    amounts = []
                    
                    for log_record in activity_logs:
                        log = dict(log_record)
                        amount = float(log["amount"])
                        # Apply sign convention - TaxUplift separated from investments
                        if log["activity_type"] in ["Investment", "RegularInvestment"]:
                            amount = -amount
                        elif log["activity_type"] in ["TaxUplift"]:
                            amount = -amount  # Tax uplifts are still money going in (negative)
                        elif log["activity_type"] in ["Withdrawal", "RegularWithdrawal", "SwitchOut"]:
                            amount = abs(amount)
                        
                        date = datetime.fromisoformat(log["activity_timestamp"])
                        dates.append(date)
                        amounts.append(amount)
                        logger.info(f"Added cash flow: {log['activity_type']}, date={date}, amount={amount}")
                
                # Add the final valuation as a positive cash flow
                valuation_date = data.get("date", irr_record["date"])


                
                # Convert date string to datetime object if necessary
                if isinstance(valuation_date, str):
                    valuation_date = datetime.fromisoformat(valuation_date.replace('Z', '+00:00'))
                
                if "fund_valuation_id" in data:
                    # Get the valuation amount from the fund_valuation record
                    valuation_record = await db.fetchrow("""
                        SELECT valuation FROM portfolio_fund_valuations WHERE id = $1
                    """, data["fund_valuation_id"])
                    if valuation_record:
                        valuation_amount = dict(valuation_record)["valuation"]
                    else:
                        raise HTTPException(status_code=404, detail=f"Fund valuation with ID {data['fund_valuation_id']} not found")
                else:
                    # Get the valuation amount from the existing fund_valuation record
                    existing_fund_valuation_id = irr_record["fund_valuation_id"]
                    if existing_fund_valuation_id:
                        valuation_record = await db.fetchrow("""
                            SELECT valuation FROM portfolio_fund_valuations WHERE id = $1
                        """, existing_fund_valuation_id)
                        if valuation_record:
                            valuation_amount = dict(valuation_record)["valuation"]
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
                        logger.info(f"Recalculated IRR: {irr_percentage:.4f}%")
                        
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
            
            # Build dynamic UPDATE query
            set_clauses = []
            values = []
            param_counter = 1
            
            for key, value in update_data.items():
                set_clauses.append(f"{key} = ${param_counter}")
                values.append(value)
                param_counter += 1
            
            # Add irr_value_id as the last parameter
            values.append(irr_value_id)
            
            update_query = f"""
                UPDATE portfolio_fund_irr_values 
                SET {', '.join(set_clauses)} 
                WHERE id = ${param_counter}
                RETURNING *
            """
            
            result = await db.fetchrow(update_query, *values)
            
            if result:
                updated_record = dict(result)
                logger.info(f"Successfully updated IRR value: {updated_record}")
                return updated_record
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
        check_result = await db.fetchrow("SELECT * FROM portfolio_fund_irr_values WHERE id = $1", irr_value_id)
        if not check_result:
            logger.error(f"IRR value not found with ID: {irr_value_id}")
            raise HTTPException(status_code=404, detail=f"IRR value with ID {irr_value_id} not found")
            
        # Delete the record
        await db.execute("DELETE FROM portfolio_fund_irr_values WHERE id = $1", irr_value_id)
        logger.info(f"Successfully deleted IRR value with ID: {irr_value_id}")
        
        return None
        
    except Exception as e:
        logger.error(f"Error deleting IRR value: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting IRR value: {str(e)}")

@router.post("/irr-values", response_model=dict)
async def create_irr_value(
    fund_id: int = Body(..., description="Portfolio fund ID"),
    irr_result: float = Body(..., description="IRR result as percentage (e.g., 5.25 for 5.25%)"),
    date: str = Body(..., description="Date for the IRR calculation in YYYY-MM-DD format"),
    fund_valuation_id: Optional[int] = Body(None, description="Optional fund valuation ID reference"),
    db = Depends(get_db)
):
    """
    What it does: Creates a new IRR value record in the irr_values table.
    Why it's needed: Allows saving calculated IRR values to the database for historical tracking.
    How it works:
        1. Validates the portfolio fund exists
        2. Validates the date format
        3. Checks if an IRR value already exists for this fund and date
        4. Creates or updates the IRR value record
    Expected output: A JSON object with the created/updated IRR value information
    """
    try:
        logger.info(f"Creating IRR value for fund {fund_id}, date {date}, IRR {irr_result}%")
        
        # Validate portfolio fund exists
        fund_check = await db.fetchrow("SELECT id FROM portfolio_funds WHERE id = $1", fund_id)
        if not fund_check:
            raise HTTPException(status_code=404, detail=f"Portfolio fund with ID {fund_id} not found")
        
        # Validate date format
        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid date format. Expected YYYY-MM-DD, got: {date}")
        
        # Validate IRR value against database constraints (numeric(7,2) allows max 99999.99)
        if abs(irr_result) > 99999.99:
            logger.warning(f"IRR value {irr_result} exceeds database limits, capping to 99999.99")
            irr_result = 99999.99 if irr_result > 0 else -99999.99
        
        # Check if IRR value already exists for this fund and date
        existing_irr = await db.fetchrow("""
            SELECT * FROM portfolio_fund_irr_values 
            WHERE fund_id = $1 AND date = $2
        """, fund_id, date)
        
        irr_value_data = {
            "fund_id": fund_id,
            "irr_result": float(round(irr_result, 2)),
            "date": date,
            "fund_valuation_id": fund_valuation_id
        }
        
        if existing_irr:
            # Update existing record
            irr_id = existing_irr["id"]
            logger.info(f"Updating existing IRR record {irr_id}")
            
            result = await db.fetchrow("""
                UPDATE portfolio_fund_irr_values 
                SET irr_result = $1, fund_valuation_id = $2 
                WHERE id = $3 
                RETURNING *
            """, float(round(irr_result, 2)), fund_valuation_id, irr_id)
            
            if result:
                updated_record = dict(result)
                logger.info(f"Successfully updated IRR record: {updated_record}")
                return {
                    "action": "updated",
                    "irr_value": updated_record
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update IRR value")
        else:
            # Create new record
            logger.info(f"Creating new IRR record: {irr_value_data}")
            
            result = await db.fetchrow("""
                INSERT INTO portfolio_fund_irr_values (fund_id, irr_result, date, fund_valuation_id) 
                VALUES ($1, $2, $3, $4) 
                RETURNING *
            """, fund_id, float(round(irr_result, 2)), date, fund_valuation_id)
            
            if result:
                created_record = dict(result)
                logger.info(f"Successfully created IRR record: {created_record}")
                return {
                    "action": "created",
                    "irr_value": created_record
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to create IRR value")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating IRR value: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating IRR value: {str(e)}")

async def calculate_portfolio_fund_irr(
    portfolio_fund_id: int,
    month: int,
    year: int,
    valuation: float = None,
    db = None,
    update_only: bool = False
):
    """
    What it does: Calculates the Internal Rate of Return (IRR) for a portfolio fund.
    Why it's needed: Provides performance metrics for funds over time.
    How it works:
        1. Retrieves all activity logs for the fund
        2. Prepares cash flow data for IRR calculation
        3. Calculates monthly IRR using numpy_financial.irr
        4. Converts to annualized IRR
        5. Saves IRR value to database
    Expected output: Dictionary with IRR result and calculation details
    
    Parameters:
        portfolio_fund_id: ID of the portfolio fund to calculate IRR for
        month: Month for the IRR calculation endpoint (1-12)
        year: Year for the IRR calculation endpoint
        valuation: Optional final valuation amount to use (if None, latest valuation will be used)
        db: Database connection
        update_only: If True, only update existing IRR records, don't create new ones
    """
    try:
        # Ensure we have a database connection
        if db is None:
            # This is an internal function call without DB dependency handling
            logger.warning("No database connection provided to calculate_portfolio_fund_irr")
            from app.db.database import get_db_connection
            db = get_db_connection()
        
        logger.info(f"Starting IRR calculation for portfolio_fund_id: {portfolio_fund_id}, month: {month}, year: {year}")
        
        # Determine valuation date
        calculation_date = datetime(year, month, 1)
        
        # If we need to get a valuation for this date
        if valuation is None:
            next_month = calculation_date.replace(month=month+1) if month < 12 else calculation_date.replace(year=year+1, month=1)
            valuation_result = await db.fetchrow("""
                SELECT * FROM portfolio_fund_valuations 
                WHERE portfolio_fund_id = $1 
                  AND valuation_date >= $2 
                  AND valuation_date < $3
                ORDER BY valuation_date LIMIT 1
            """, portfolio_fund_id, calculation_date, next_month)
                
            if not valuation_result:
                logger.warning(f"No valuation found for portfolio_fund_id {portfolio_fund_id} in {year}-{month:02d}")
                return None
                
            # Get valuation
            valuation_dict = dict(valuation_result)
            valuation = float(valuation_dict["valuation"])
            fund_valuation_id = valuation_dict["id"]
        else:
            # Try to find existing valuation record for this month
            next_month = calculation_date.replace(month=month+1) if month < 12 else calculation_date.replace(year=year+1, month=1)
            valuation_result = await db.fetchrow("""
                SELECT id FROM portfolio_fund_valuations 
                WHERE portfolio_fund_id = $1 
                  AND valuation_date >= $2 
                  AND valuation_date < $3
                ORDER BY valuation_date LIMIT 1
            """, portfolio_fund_id, calculation_date, next_month)
                
            if valuation_result:
                fund_valuation_id = dict(valuation_result)["id"]
            else:
                fund_valuation_id = None
                
        # Get all activity logs for this portfolio fund up to the calculation date
        activity_logs = await db.fetch("""
            SELECT * FROM holding_activity_log 
            WHERE portfolio_fund_id = $1 
              AND activity_timestamp <= $2 
            ORDER BY activity_timestamp
        """, portfolio_fund_id, calculation_date)
            
        if not activity_logs:
            logger.warning(f"No activity logs found for portfolio_fund_id {portfolio_fund_id}")
            return None
            
        logger.info(f"Found {len(activity_logs)} activity logs")
        
        # Prepare cash flows for IRR calculation
        dates = []
        amounts = []
        
        # Process activity logs
        for log_record in activity_logs:
            log = dict(log_record)
            # Handle both string and datetime object types for activity_timestamp
            activity_timestamp = log["activity_timestamp"]
            if isinstance(activity_timestamp, str):
                activity_date = datetime.fromisoformat(activity_timestamp).date()
            else:
                # activity_timestamp is already a datetime object
                activity_date = activity_timestamp.date() if hasattr(activity_timestamp, 'date') else activity_timestamp
            activity_type = log["activity_type"]
            amount = float(log["amount"])
            
            # Apply sign convention based on activity type - TaxUplift separated from investments
            if activity_type in ["Investment", "RegularInvestment"]:
                # Investments are money going out (negative)
                amount = -amount
            elif activity_type in ["TaxUplift"]:
                # Tax uplifts are money going in (negative) like investments
                amount = -amount
            elif activity_type in ["Withdrawal", "RegularWithdrawal", "SwitchOut"]:
                # Withdrawals and SwitchOut are money coming in (positive)
                amount = abs(amount)  # Ensure positive
            elif activity_type == "SwitchIn":
                # SwitchIn is money going out (negative) as it's an investment
                amount = -amount
            
            dates.append(activity_date)
            amounts.append(amount)
            logger.info(f"Added {activity_type} cash flow: {amount} on {activity_date}")
        
        # Add the current valuation as a final positive cash flow
        dates.append(calculation_date.date())
        amounts.append(valuation)
        logger.info(f"Added final valuation: {valuation} on {calculation_date.date()}")
        
        # Check if we have enough cash flows for IRR calculation
        if len(amounts) < 2:
            logger.warning(f"Insufficient cash flows for IRR calculation, need at least 2, got {len(amounts)}")
            return None
            
        # Use numpy_financial.irr for calculation
        import numpy_financial as npf
        
        try:
            # Convert dates to months since first date
            base_date = min(dates)
            months = [(d.year - base_date.year) * 12 + d.month - base_date.month for d in dates]
            
            # Create array for monthly cash flows
            total_months = max(months)
            monthly_amounts = [0] * (total_months + 1)
            
            # Map flows to months
            for i, month_idx in enumerate(months):
                monthly_amounts[month_idx] += amounts[i]
                logger.info(f"Mapping flow: date={dates[i]}, amount={amounts[i]}, month_index={month_idx}")
            
            # Round amounts below a pence to zero to handle floating point precision errors
            monthly_amounts = [0.0 if abs(amount) < 0.01 else amount for amount in monthly_amounts]
            
            # Log the cash flow sequence
            logger.info("\nCash flow sequence:")
            logger.info(f"Start date: {base_date.year}-{base_date.month:02d}")
            logger.info(f"End date: {calculation_date.year}-{calculation_date.month:02d}")
            logger.info(f"Total months: {total_months + 1}")
            
            logger.info("\nMonthly cash flows:")
            for i, amount in enumerate(monthly_amounts):
                logger.info(f"Month {i}: {amount}")
            
            # Calculate IRR using numpy_financial
            logger.info("Calculating IRR using numpy_financial.irr...")
            monthly_irr = npf.irr(monthly_amounts)
            
            if monthly_irr is None or np.isnan(monthly_irr):
                logger.warning("IRR calculation failed or returned NaN")
                return None
                
            logger.info(f"Raw monthly IRR calculation result: {monthly_irr}")
            
            # Convert monthly IRR to annualized IRR (simple multiplication method)
            annual_irr = monthly_irr * 12
            logger.info(f"Annualized IRR (monthly_irr * 12): {annual_irr}")
            
            # Calculate days in period for context
            days_in_period = (max(dates) - min(dates)).days
            logger.info(f"Days in period: {days_in_period}")
            
            # Format IRR for display
            monthly_irr_percent = monthly_irr * 100
            annual_irr_percent = annual_irr * 100
            
            logger.info("\nIRR Results:")
            logger.info(f"Monthly IRR: {monthly_irr_percent:.4f}%")
            logger.info(f"Annualized IRR: {annual_irr_percent:.4f}%")
            logger.info(f"Months in period: {total_months + 1}")
            
            # Validate IRR value against database constraints
            if abs(annual_irr_percent) > 99999.99:
                logger.warning(f"IRR value {annual_irr_percent} exceeds database limits, capping to 99999.99")
                annual_irr_percent = 99999.99 if annual_irr_percent > 0 else -99999.99
            
            # Prepare IRR data for database
            irr_value_data = {
                "fund_id": portfolio_fund_id,
                "irr_result": float(round(annual_irr_percent, 2)),
                "date": calculation_date.isoformat(),
                "fund_valuation_id": fund_valuation_id
            }
            
            # If update_only is True, check if an IRR record exists for this fund/date
            if update_only:
                existing_irr = await db.fetchrow("""
                    SELECT id FROM portfolio_fund_irr_values 
                    WHERE fund_id = $1 AND date = $2
                """, portfolio_fund_id, calculation_date)
                    
                if not existing_irr:
                    # Skip creating a new record in update_only mode
                    logger.info(f"No existing IRR record for {calculation_date.isoformat()}, skipping in update_only mode")
                    return {
                        "status": "skipped",
                        "message": "No existing IRR record to update",
                        "portfolio_fund_id": portfolio_fund_id,
                        "irr": round(annual_irr_percent, 2),
                        "irr_decimal": annual_irr,
                        "calculation_date": calculation_date.isoformat()
                    }
                else:
                    # Update existing record
                    irr_id = dict(existing_irr)["id"]
                    await db.execute("""
                        UPDATE portfolio_fund_irr_values 
                        SET irr_result = $1 
                        WHERE id = $2
                    """, float(round(annual_irr_percent, 2)), irr_id)
                    logger.info(f"Updated existing IRR record {irr_id} with value {annual_irr_percent:.4f}%")
            else:
                # Check if IRR already exists for this date
                existing_irr = await db.fetchrow("""
                    SELECT id FROM portfolio_fund_irr_values 
                    WHERE fund_id = $1 AND date = $2
                """, portfolio_fund_id, calculation_date)
                
                if existing_irr:
                    # Update existing
                    irr_id = dict(existing_irr)["id"]
                    await db.execute("""
                        UPDATE portfolio_fund_irr_values 
                        SET irr_result = $1 
                        WHERE id = $2
                    """, float(round(annual_irr_percent, 2)), irr_id)
                    logger.info(f"Updated existing IRR record {irr_id} with value {annual_irr_percent:.4f}%")
                else:
                    # Insert new
                    await db.execute("""
                        INSERT INTO portfolio_fund_irr_values (fund_id, irr_result, date, fund_valuation_id) 
                        VALUES ($1, $2, $3, $4)
                    """, irr_value_data["fund_id"], irr_value_data["irr_result"], irr_value_data["date"], irr_value_data["fund_valuation_id"])
                    logger.info(f"Created new IRR record with value {annual_irr_percent:.4f}%")
            
            # Convert IRR to float for JSON serialization
            logger.info(f"Converted IRR to float: {float(round(annual_irr_percent, 2))}")
            
            # Return IRR calculation results
            result = {
                "portfolio_fund_id": portfolio_fund_id,
                "irr": float(round(annual_irr_percent, 2)),
                "irr_decimal": float(annual_irr),
                "calculation_date": calculation_date.isoformat(),
                "fund_valuation_id": fund_valuation_id
            }
            
            logger.info(f"Returning response: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in IRR calculation: {str(e)}")
            return None
            
    except Exception as e:
        logger.error(f"Error in calculate_portfolio_fund_irr: {str(e)}")
        return None


# ==================== NEW STANDARDIZED IRR ENDPOINTS ====================

@router.post("/portfolio_funds/multiple/irr", response_model=dict)
async def calculate_multiple_portfolio_funds_irr(
    portfolio_fund_ids: List[int] = Body(..., description="List of portfolio fund IDs to include in IRR calculation"),
    irr_date: Optional[str] = Body(None, description="Date for IRR calculation in YYYY-MM-DD format (defaults to latest valuation date)"),
    bypass_cache: bool = Body(False, description="Bypass cache for fresh calculation (used during cascade operations)"),
    db = Depends(get_db)
):
    """
    What it does: Calculates the aggregate IRR for multiple portfolio funds with caching.
    Why it's needed: Allows calculating overall IRR for a portfolio or subset of funds.
    How it works:
        1. Checks cache for existing calculation with same inputs
        2. If cache miss, aggregates all cash flows (activities) for the specified funds
        3. Uses latest valuations as the final cash flow value
        4. Calculates IRR using the Excel-style methodology
        5. Caches the result for future use
        6. Returns both individual fund details and aggregate IRR
    Expected output: IRR percentage and supporting calculation details
    """
    try:
        logger.info(f"Calculating aggregated IRR for {len(portfolio_fund_ids)} portfolio funds{'  (BYPASSING CACHE)' if bypass_cache else ''}")
        
        # Check cache first to avoid redundant calculations (unless bypassing)
        if not bypass_cache:
            cached_result = await _irr_cache.get(
                portfolio_fund_ids=portfolio_fund_ids,
                calculation_date=irr_date
            )
            
            if cached_result is not None:
                logger.info(f"📊 Returning cached IRR result: {cached_result.get('irr_percentage', 'N/A')}%")
                return cached_result
        else:
            logger.info(f"🔄 Bypassing cache for fresh calculation as requested")

        # Parse the date string if provided
        if irr_date is not None:
            try:
                irr_date_obj = datetime.strptime(irr_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=422, detail=f"Invalid date format. Expected YYYY-MM-DD, got: {irr_date}")
        else:
            irr_date_obj = None
        
        # If no IRR date provided, find the latest valuation date across all funds
        if irr_date_obj is None:
            logger.info("No IRR date provided, finding latest valuation date")
            latest_valuations_response = await db.fetchrow("""
                SELECT valuation_date 
                FROM portfolio_fund_valuations 
                WHERE portfolio_fund_id = ANY($1::int[]) 
                ORDER BY valuation_date DESC 
                LIMIT 1
            """, portfolio_fund_ids)
            
            if latest_valuations_response:
                valuation_date_str = latest_valuations_response["valuation_date"]
                # Handle both date-only and datetime formats from the database
                if 'T' in valuation_date_str:
                    # Full datetime string - parse and extract date
                    irr_date_obj = datetime.fromisoformat(valuation_date_str.replace('Z', '+00:00')).date()
                else:
                    # Date-only string
                    irr_date_obj = datetime.strptime(valuation_date_str, "%Y-%m-%d").date()
                logger.info(f"Using latest valuation date: {irr_date_obj}")
            else:
                raise HTTPException(status_code=404, detail="No valuations found for the provided portfolio funds")
        
        logger.info(f"IRR calculation date: {irr_date_obj}")
        
        # ✅ OPTIMIZED: Batch fetch valuations for ALL funds in a single query (eliminates N+1 problem)
        fund_valuations = {}
        
        logger.info(f"🚀 Batch fetching valuations for {len(portfolio_fund_ids)} funds (eliminates {len(portfolio_fund_ids)} individual requests)")
        
        # Single batch query instead of individual requests per fund
        batch_valuation_response = await db.fetch("""
            SELECT portfolio_fund_id, valuation, valuation_date 
            FROM portfolio_fund_valuations 
            WHERE portfolio_fund_id = ANY($1::int[]) 
              AND valuation_date <= $2 
            ORDER BY portfolio_fund_id, valuation_date DESC
        """, portfolio_fund_ids, irr_date_obj)
        
        # Process batch results to get latest valuation per fund
        seen_funds = set()
        if batch_valuation_response:
            for valuation_record_row in batch_valuation_response:
                valuation_record = dict(valuation_record_row)
                fund_id = valuation_record["portfolio_fund_id"]
                
                # Since we ordered by fund_id, valuation_date DESC, first occurrence is latest
                if fund_id not in seen_funds:
                    fund_valuations[fund_id] = float(valuation_record["valuation"])
                    seen_funds.add(fund_id)
        
        # Ensure all requested funds are represented (some might have no valuations)
        for fund_id in portfolio_fund_ids:
            if fund_id not in fund_valuations:
                logger.warning(f"No valuation found for fund {fund_id} as of {irr_date_obj}")
                fund_valuations[fund_id] = None  # Use None instead of 0.0 for missing valuations
        
        logger.info(f"✅ Batch valuation optimization complete - Fund valuations: {fund_valuations}")
        
        # Verify all portfolio funds exist
        funds_response = await db.fetch("SELECT id FROM portfolio_funds WHERE id = ANY($1::int[])", portfolio_fund_ids)
        found_fund_ids = [fund["id"] for fund in funds_response]
        
        if len(found_fund_ids) != len(portfolio_fund_ids):
            missing_ids = set(portfolio_fund_ids) - set(found_fund_ids)
            raise HTTPException(status_code=404, detail=f"Portfolio funds not found: {missing_ids}")
        
        # Fetch all activity logs for these funds up to the IRR date
        activities_response = await db.fetch("""
            SELECT * FROM holding_activity_log 
            WHERE portfolio_fund_id = ANY($1::int[]) 
            AND activity_timestamp <= $2 
            ORDER BY activity_timestamp
        """, portfolio_fund_ids, irr_date_obj)
        
        activities = [dict(record) for record in activities_response]
        
        # 📊 PERFORMANCE: Reduced logging - detailed debugging disabled for production speed
        logger.info(f"📊 Processing {len(activities)} activities across {len(portfolio_fund_ids)} funds")
        
        # Verbose debugging can be enabled by setting DEBUG_IRR_VERBOSE=True in environment
        import os
        if os.getenv('DEBUG_IRR_VERBOSE', 'False').lower() == 'true':
            logger.debug(f"🔴 📊 ACTIVITIES BREAKDOWN BY FUND:")
            activities_by_fund = {}
            for activity in activities:
                fund_id = activity["portfolio_fund_id"]
                if fund_id not in activities_by_fund:
                    activities_by_fund[fund_id] = []
                activities_by_fund[fund_id].append(activity)
            
            for fund_id in portfolio_fund_ids:
                fund_activities = activities_by_fund.get(fund_id, [])
                logger.debug(f"🔴   Fund {fund_id}: {len(fund_activities)} activities")
                for activity in fund_activities[:3]:  # Show first 3 activities per fund
                    logger.debug(f"🔴     - {activity['activity_type']}: £{activity['amount']} on {activity['activity_timestamp'][:10]}")
                if len(fund_activities) > 3:
                    logger.debug(f"🔴     ... and {len(fund_activities) - 3} more activities")
        
        # 🔧 FIXED: Separate cash flows for activities (start of month) and valuations (end of month)
        # This ensures proper IRR calculation even when activities and valuations are in the same calendar month
        cash_flows_by_date = {}
        
        # Process activities - these happen at the START of the month (day 1)
        for activity in activities:
            # Handle both string and datetime object types for activity_timestamp
            activity_timestamp = activity["activity_timestamp"]
            if isinstance(activity_timestamp, str):
                activity_date = datetime.fromisoformat(activity_timestamp.replace('Z', '+00:00')).date()
            else:
                # activity_timestamp is already a datetime object
                activity_date = activity_timestamp.date() if hasattr(activity_timestamp, 'date') else activity_timestamp
            # Activities happen at START of month
            activity_start_key = activity_date.replace(day=1)
            
            if activity_start_key not in cash_flows_by_date:
                cash_flows_by_date[activity_start_key] = 0.0
            
            # Apply sign conventions based on activity type
            amount = float(activity["amount"])
            activity_type = activity["activity_type"]
            
            if any(keyword in activity_type.lower() for keyword in ["investment"]):
                cash_flows_by_date[activity_start_key] -= amount  # Negative for investments
            elif activity_type.lower() in ["taxuplift"]:
                cash_flows_by_date[activity_start_key] -= amount  # Tax uplift = negative (inflow)
            elif activity_type.lower() in ["productswitchin"]:
                cash_flows_by_date[activity_start_key] -= amount  # Product switch in = negative (money out)
            elif activity_type.lower() in ["fundswitchin"]:
                cash_flows_by_date[activity_start_key] -= amount  # Fund switch in = negative (money coming into fund)
            elif any(keyword in activity_type.lower() for keyword in ["withdrawal"]):
                cash_flows_by_date[activity_start_key] += amount  # Positive for withdrawals
            elif activity_type.lower() in ["productswitchout"]:
                cash_flows_by_date[activity_start_key] += amount  # Product switch out = positive (money in)
            elif activity_type.lower() in ["fundswitchout"]:
                cash_flows_by_date[activity_start_key] += amount  # Fund switch out = positive (money leaving fund)
            elif any(keyword in activity_type.lower() for keyword in ["fee", "charge", "expense"]):
                cash_flows_by_date[activity_start_key] += amount  # Positive for fees (money out)
            elif any(keyword in activity_type.lower() for keyword in ["dividend", "interest", "capital gain"]):
                cash_flows_by_date[activity_start_key] -= amount  # Negative for reinvested gains
            else:
                logger.warning(f"Unknown activity type: {activity['activity_type']}, treating as neutral (amount={amount})")
        
        # Process valuations - these happen at the END of the month (last day)
        # Calculate total valuation, treating None values as 0 for calculation purposes
        total_valuation = sum(v for v in fund_valuations.values() if v is not None)
        
        # EDGE CASE HANDLING: For zero total valuation, omit final valuations completely
        # This allows IRR calculation to proceed using only activities for fully exited funds
        if total_valuation > 0:
            # Valuations happen at END of month - use last day of the month for separation
            valuation_month = irr_date_obj.replace(day=1)
            # Find last day of the month
            if valuation_month.month == 12:
                next_month = valuation_month.replace(year=valuation_month.year + 1, month=1)
            else:
                next_month = valuation_month.replace(month=valuation_month.month + 1)
            last_day_of_month = (next_month - timedelta(days=1))
            
            # Use the last day as the key to ensure it's separate from start-of-month activities
            valuation_end_key = last_day_of_month
            
            if valuation_end_key not in cash_flows_by_date:
                cash_flows_by_date[valuation_end_key] = 0.0
            cash_flows_by_date[valuation_end_key] += total_valuation  # Include final value at end of month
        
        logger.info(f"💰 DEBUG: Separated cash flows by date:")
        for date_key, amount in sorted(cash_flows_by_date.items()):
            logger.info(f"💰 DEBUG: {date_key}: £{amount}")
            
        # Convert to the format expected by IRR calculation
        cash_flows = cash_flows_by_date
        
        # Check if we have no activities (only valuations)
        if len(activities) == 0:
            return {
                "success": True,
                "irr_percentage": 0.0,
                "irr_decimal": 0.0,
                "calculation_date": irr_date_obj.isoformat(),
                "portfolio_fund_ids": portfolio_fund_ids,
                "total_valuation": total_valuation,
                "fund_valuations": fund_valuations,
                "cash_flows_count": 0,
                "period_start": irr_date_obj.isoformat(),
                "period_end": irr_date_obj.isoformat(),
                "days_in_period": 0,
                "note": "No activities found - IRR set to 0%"
            }
        
        # Convert to sorted lists for IRR calculation
        sorted_months = sorted(cash_flows.keys())
        amounts = [cash_flows[month] for month in sorted_months]
        dates = [month.strftime("%Y-%m-%dT00:00:00") for month in sorted_months]
        
        # DEBUG: Log the actual data being passed to IRR calculation
        logger.info(f"💰 DEBUG: About to call calculate_excel_style_irr with:")
        logger.info(f"💰 DEBUG: Dates: {dates}")
        logger.info(f"💰 DEBUG: Amounts: {amounts}")
        logger.info(f"💰 DEBUG: First amount: {amounts[0]}, Last amount: {amounts[-1]}")
        
        # Calculate IRR using Excel-style method
        irr_result = calculate_excel_style_irr(dates, amounts)
        
        # Extract the IRR value from the result dictionary
        irr_decimal = irr_result.get('period_irr', 0)
        days_in_period = irr_result.get('days_in_period', 0)
        
        # 📊 PERFORMANCE: Summary logging only (detailed logging available via DEBUG_IRR_VERBOSE)
        logger.info(f"📊 IRR Calculation Complete: {round(irr_decimal * 100, 1)}% over {days_in_period} days ({len(cash_flows)} cash flow periods)")
        
        # Detailed debugging available via environment variable
        if os.getenv('DEBUG_IRR_VERBOSE', 'False').lower() == 'true':
            logger.debug(f"🔴 💰 FINAL CASH FLOWS SUMMARY:")
            logger.debug(f"🔴   Cash Flows by Month: {len(cash_flows)} months")
            for month, amount in sorted(cash_flows.items()):
                logger.debug(f"🔴     {month.strftime('%Y-%m')}: £{amount:,.2f}")
            logger.debug(f"🔴 📊 IRR CALCULATION RESULT:")
            logger.debug(f"🔴   IRR Decimal: {irr_decimal}")
            logger.debug(f"🔴   IRR Percentage: {round(irr_decimal * 100, 1)}%")
            logger.debug(f"🔴   Days in Period: {days_in_period}")
            logger.debug(f"🔴   Total Valuation: £{total_valuation}")
        
        # Prepare the result to return
        result = {
            "success": True,
            "irr_percentage": round(irr_decimal * 100, 1),
            "irr_decimal": irr_decimal,
            "calculation_date": irr_date_obj.isoformat(),
            "portfolio_fund_ids": portfolio_fund_ids,
            "total_valuation": total_valuation,
            "fund_valuations": fund_valuations,
            "cash_flows_count": len(cash_flows),
            "period_start": min(cash_flows.keys()).isoformat(),
            "period_end": max(cash_flows.keys()).isoformat(),
            "days_in_period": days_in_period
        }
        

        # 🔴 DEBUG: Final result
        logger.error(f"🔴 ✅ MULTIPLE FUNDS IRR CALCULATION COMPLETE")
        logger.error(f"🔴 🎯 FINAL RESULT: {result['irr_percentage']}%")
        
        # Cache the result for future use (include cash flows and fund valuations for uniqueness)
        cash_flow_values = [cash_flows[month] for month in sorted(cash_flows.keys())]
        # Round amounts below a pence to zero to handle floating point precision errors
        cash_flow_values = [0.0 if abs(amount) < 0.01 else amount for amount in cash_flow_values]

        await _irr_cache.set(
            portfolio_fund_ids=portfolio_fund_ids,
            calculation_date=irr_date,
            result=result
        )
        
        logger.info(f"✅ Successfully calculated aggregate IRR for {len(portfolio_fund_ids)} portfolio funds: {result['irr_percentage']}%")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating multiple portfolio funds IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate IRR: {str(e)}")


@router.post("/portfolio_funds/{portfolio_fund_id}/irr", response_model=dict)
async def calculate_single_portfolio_fund_irr(
    portfolio_fund_id: int,
    irr_date: Optional[str] = Body(None, description="Date for IRR calculation in YYYY-MM-DD format (defaults to latest valuation date)"),
    bypass_cache: bool = Body(False, description="Bypass cache for fresh calculation (used during cascade operations)"),
    db = Depends(get_db)
):
    """
    Calculate IRR for a single portfolio fund using Excel-style monthly aggregation with caching.
    
    This endpoint:
    1. Checks cache for existing calculation with same inputs
    2. If cache miss, fetches the latest valuation for the fund (or valuation as of irr_date if provided)
    3. Aggregates all cash flows by month
    4. Calculates IRR using the Excel-style method
    5. Caches the result for future use
    
    Args:
        portfolio_fund_id: ID of the portfolio fund
        irr_date: Optional date string for IRR calculation in YYYY-MM-DD format. If not provided, uses latest valuation date
        
    Returns:
        Dictionary containing IRR calculation results
    """
    try:
        logger.info(f"🔍 IRR CALC ENTRY: calculate_single_portfolio_fund_irr called for fund {portfolio_fund_id}, date {irr_date}{'  (BYPASSING CACHE)' if bypass_cache else ''}")
        
        # Check cache first for single fund IRR calculation (unless bypassing)
        if not bypass_cache:
            cached_result = await _irr_cache.get(
                portfolio_fund_ids=[portfolio_fund_id],
                calculation_date=irr_date
            )
            
            if cached_result is not None:
                logger.info(f"📊 Returning cached single fund IRR result: {cached_result.get('irr_percentage', 'N/A')}%")
                return cached_result
        else:
            logger.info(f"🔄 Bypassing cache for fresh single fund calculation as requested")

        # Calculate IRR for portfolio fund
        
        # DEBUG: Get fund details to identify which fund this is
        fund_details = await db.fetchrow("""
            SELECT portfolio_id, available_funds_id FROM portfolio_funds WHERE id = $1
        """, portfolio_fund_id)
        
        if fund_details:
            available_funds_id = dict(fund_details)["available_funds_id"]
            fund_name_result = await db.fetchrow("""
                SELECT fund_name, isin_number FROM available_funds WHERE id = $1
            """, available_funds_id)
            
            if fund_name_result:
                fund_name_dict = dict(fund_name_result)
                fund_name = fund_name_dict["fund_name"]
                isin = fund_name_dict["isin_number"]
            else:
                pass  # Fund name not found
        
        # Verify portfolio fund exists
        fund_response = await db.fetchrow("SELECT id FROM portfolio_funds WHERE id = $1", portfolio_fund_id)
        if not fund_response:
            logger.error(f"💰 DEBUG: ❌ Portfolio fund {portfolio_fund_id} not found")
            raise HTTPException(status_code=404, detail=f"Portfolio fund {portfolio_fund_id} not found")
        
        # Parse the date string if provided
        if irr_date is not None:
            try:
                irr_date_obj = datetime.strptime(irr_date, "%Y-%m-%d").date()
            except ValueError:
                logger.error(f"💰 DEBUG: ❌ Invalid date format. Expected YYYY-MM-DD, got: {irr_date}")
                raise HTTPException(status_code=422, detail=f"Invalid date format. Expected YYYY-MM-DD, got: {irr_date}")
        else:
            irr_date_obj = None
        
        # If no IRR date provided, find the latest valuation date for this fund
        if irr_date_obj is None:
            latest_valuation_response = await db.fetchrow("""
                SELECT valuation_date 
                FROM portfolio_fund_valuations 
                WHERE portfolio_fund_id = $1 
                ORDER BY valuation_date DESC 
                LIMIT 1
            """, portfolio_fund_id)
            
            if latest_valuation_response:
                valuation_date_str = latest_valuation_response["valuation_date"]
                # Handle both date-only and datetime formats from the database
                if 'T' in valuation_date_str:
                    # Full datetime string - parse and extract date
                    irr_date_obj = datetime.fromisoformat(valuation_date_str.replace('Z', '+00:00')).date()
                else:
                    # Date-only string
                    irr_date_obj = datetime.strptime(valuation_date_str, "%Y-%m-%d").date()
                logger.info(f"💰 DEBUG: Using latest valuation date: {irr_date_obj}")
            else:
                logger.error(f"💰 DEBUG: ❌ No valuations found for portfolio fund {portfolio_fund_id}")
                raise HTTPException(status_code=404, detail=f"No valuations found for portfolio fund {portfolio_fund_id}")
        
        logger.info(f"💰 DEBUG: IRR calculation date: {irr_date_obj}")
        
        # Fetch valuation for the fund as of the IRR date
        valuation_response = await db.fetchrow("""
            SELECT valuation 
            FROM portfolio_fund_valuations 
            WHERE portfolio_fund_id = $1 
            AND valuation_date <= $2 
            ORDER BY valuation_date DESC 
            LIMIT 1
        """, portfolio_fund_id, irr_date_obj)
        
        if not valuation_response:
            logger.error(f"💰 DEBUG: ❌ No valuation found for portfolio fund {portfolio_fund_id} as of {irr_date_obj}")
            raise HTTPException(status_code=404, detail=f"No valuation found for portfolio fund {portfolio_fund_id} as of {irr_date_obj}")
        
        valuation_amount = float(valuation_response["valuation"])
        logger.info(f"💰 DEBUG: Fund valuation: £{valuation_amount}")
        
        if valuation_amount == 0:
            logger.warning(f"💰 DEBUG: ⚠️  ZERO VALUATION DETECTED! Fund {portfolio_fund_id} has £0 valuation")
        
        # Fetch all activity logs for this fund up to the IRR date
        activities_response = await db.fetch("""
            SELECT * FROM holding_activity_log 
            WHERE portfolio_fund_id = $1 
            AND activity_timestamp <= $2 
            ORDER BY activity_timestamp
        """, portfolio_fund_id, irr_date_obj)
        
        activities = [dict(record) for record in activities_response]
        logger.info(f"💰 DEBUG: Found {len(activities)} activities for fund {portfolio_fund_id} up to {irr_date_obj}")
        
        # Aggregate cash flows by month
        cash_flows = {}
        
        for activity in activities:
            # Handle both string and datetime object types for activity_timestamp
            activity_timestamp = activity["activity_timestamp"]
            if isinstance(activity_timestamp, str):
                activity_date = datetime.fromisoformat(activity_timestamp.replace('Z', '+00:00')).date()
            else:
                # activity_timestamp is already a datetime object
                activity_date = activity_timestamp.date() if hasattr(activity_timestamp, 'date') else activity_timestamp
            month_key = activity_date.replace(day=1)
            
            if month_key not in cash_flows:
                cash_flows[month_key] = 0.0
            
            # Apply sign conventions based on activity type
            amount = float(activity["amount"])
            activity_type = activity["activity_type"].lower()  # Convert to lowercase for comparison
            
            logger.info(f"💰 DEBUG: Processing activity - Date: {activity_date}, Type: {activity['activity_type']}, Amount: £{amount}")
            
            # Use explicit matching for fund switches and substring matching for other activities
            if any(keyword in activity_type for keyword in ["investment"]):
                cash_flows[month_key] -= amount  # Negative for investments
                logger.info(f"💰 DEBUG: Applied as INVESTMENT (negative): -£{amount}")
            elif activity_type in ["taxuplift", "taxuplift_tax"]:
                cash_flows[month_key] -= amount  # Tax uplift = negative (inflow)
                logger.info(f"💰 DEBUG: Applied as TAX UPLIFT (negative): -£{amount}")
            elif activity_type in ["productswitchin"]:
                cash_flows[month_key] -= amount  # Product switch in = negative (money out)
                logger.info(f"💰 DEBUG: Applied as PRODUCT SWITCH IN (negative): -£{amount}")
            elif activity_type in ["fundswitchin"]:
                cash_flows[month_key] -= amount  # Fund switch in = negative (money coming into fund)
                logger.info(f"💰 DEBUG: Applied as FUND SWITCH IN (negative): -£{amount}")
            elif any(keyword in activity_type for keyword in ["withdrawal"]):
                cash_flows[month_key] += amount  # Positive for withdrawals
                logger.info(f"💰 DEBUG: Applied as WITHDRAWAL (positive): +£{amount}")
            elif activity_type in ["productswitchout"]:
                cash_flows[month_key] += amount  # Product switch out = positive (money in)
                logger.info(f"💰 DEBUG: Applied as PRODUCT SWITCH OUT (positive): +£{amount}")
            elif activity_type in ["fundswitchout"]:
                cash_flows[month_key] += amount  # Fund switch out = positive (money leaving fund)
                logger.info(f"💰 DEBUG: Applied as FUND SWITCH OUT (positive): +£{amount}")
            elif any(keyword in activity_type for keyword in ["fee", "charge", "expense"]):
                cash_flows[month_key] += amount  # Positive for fees (money out)
                logger.info(f"💰 DEBUG: Applied as FEE (positive): +£{amount}")
            elif any(keyword in activity_type for keyword in ["dividend", "interest", "capital gain"]):
                cash_flows[month_key] -= amount  # Negative for reinvested gains
                logger.info(f"💰 DEBUG: Applied as DIVIDEND/GAIN (negative): -£{amount}")
            else:
                logger.warning(f"💰 DEBUG: ⚠️  Unknown activity type: {activity['activity_type']}, treating as neutral (amount=£{amount})")
        
        # Add final valuations to the VALUATION MONTH (same logic as multiple funds IRR)
        # Fixed: Use same month logic as multiple fund IRR to correctly combine activities and valuations
        # Valuations and activities in the same month should be combined, not separated
        
        # EDGE CASE HANDLING: Handle £0 valuations like multiple funds IRR
        if valuation_amount == 0:
            logger.info("💰 DEBUG: ⚠️  Total valuation is zero - omitting final valuations from IRR calculation for fully exited funds")
            # Don't add the zero valuation to cash flows - exclude it entirely
        else:
            # Add final valuations to the valuation month itself, not an artificial later period
            # This ensures correct timing: activities at month start + valuation at month end = combined month cash flow
            valuation_month_key = irr_date_obj.replace(day=1)
            
            if valuation_month_key not in cash_flows:
                cash_flows[valuation_month_key] = 0.0
            cash_flows[valuation_month_key] += valuation_amount  # Include final value in the same month
            logger.info(f"💰 DEBUG: Added final valuation of £{valuation_amount} to same month as activities: {valuation_month_key}")
        
        logger.info(f"💰 DEBUG: Aggregated cash flows: {len(cash_flows)} flows from {min(cash_flows.keys()) if cash_flows else 'N/A'} to {max(cash_flows.keys()) if cash_flows else 'N/A'}")
        logger.info(f"💰 DEBUG: Total valuation: £{valuation_amount}")
        
        # DEBUG: Print all cash flows
        for month, amount in sorted(cash_flows.items()):
            logger.info(f"💰 DEBUG: Cash flow - {month}: £{amount}")
        
        # Check if we have no activities (only valuation)
        if len(activities) == 0:
            logger.info(f"💰 DEBUG: ⚠️  No activities found for fund {portfolio_fund_id}, returning 0% IRR")
            return {
                "success": True,
                "irr_percentage": 0.0,
                "irr_decimal": 0.0,
                "calculation_date": irr_date_obj.isoformat(),
                "portfolio_fund_id": portfolio_fund_id,
                "valuation_amount": valuation_amount,
                "cash_flows_count": 0,
                "period_start": irr_date_obj.isoformat(),
                "period_end": irr_date_obj.isoformat(),
                "days_in_period": 0,
                "note": "No activities found - IRR set to 0%"
            }
        
        # Check if we have no cash flows after processing (possible with zero valuation)
        if len(cash_flows) == 0:
            logger.warning(f"💰 DEBUG: ⚠️  No cash flows generated for fund {portfolio_fund_id} (likely due to zero valuation), returning 0% IRR")
            
            # For zero valuation funds, we still need to store the 0% IRR in the database
            irr_date_iso = irr_date_obj.isoformat()
            
            # Check if IRR already exists for this fund and date
            existing_irr_response = await db.fetch("""
                SELECT id FROM portfolio_fund_irr_values 
                WHERE fund_id = $1 AND date = $2
            """, portfolio_fund_id, irr_date_iso)
            
            # Delete existing IRR values if any (to replace them)
            if existing_irr_response:
                for irr_record in existing_irr_response:
                    await db.execute("DELETE FROM portfolio_fund_irr_values WHERE id = $1", irr_record["id"])
                logger.info(f"💰 DEBUG: Deleted {len(existing_irr_response)} existing IRR value(s) for zero valuation fund {portfolio_fund_id} on {irr_date_iso}")
            
            # Insert the new 0% IRR value for zero valuation fund
            # REMOVED: Database insertion - this function should only calculate, not store
            logger.info(f"💰 DEBUG: IRR calculation completed: 0% for zero valuation fund {portfolio_fund_id} on {irr_date_iso}")
            
            return {
                "success": True,
                "irr_percentage": 0.0,
                "irr_decimal": 0.0,
                "calculation_date": irr_date_iso,
                "portfolio_fund_id": portfolio_fund_id,
                "valuation_amount": valuation_amount,
                "cash_flows_count": 0,
                "period_start": irr_date_iso,
                "period_end": irr_date_iso,
                "days_in_period": 0,
                "note": "No cash flows after processing (zero valuation) - IRR set to 0%"
            }
        
        # SPECIAL CASE: Handle single-month scenario with both activities and valuations
        if len(cash_flows) == 1 and len(activities) > 0 and valuation_amount > 0:
            logger.info(f"💰 DEBUG: Single month scenario detected with activities and valuation - separating cash flows for IRR calculation")
            
            # Get the single month
            single_month = list(cash_flows.keys())[0]
            
            # Create separate cash flows: activities at start of month, valuation at end of month
            separated_cash_flows = {}
            
            # Calculate the total activity amount (excluding valuation)
            # We need to reconstruct the activity amounts from the original activities
            total_activity_amount = 0.0
            logger.info(f"💰 DEBUG: Processing {len(activities)} activities for separation")
            
            for activity in activities:
                activity_timestamp = activity['activity_timestamp']
                logger.info(f"💰 DEBUG: Processing activity: {activity}")
                
                # Parse the activity timestamp (handle both date-only and datetime formats)
                if 'T' in activity_timestamp:
                    # Full datetime format
                    activity_date = datetime.strptime(activity_timestamp, '%Y-%m-%dT%H:%M:%S')
                else:
                    # Date-only format
                    activity_date = datetime.strptime(activity_timestamp, '%Y-%m-%d')
                
                activity_month = activity_date.replace(day=1)
                logger.info(f"💰 DEBUG: Activity month: {activity_month}, Single month: {single_month}")
                
                # Only include activities from the same month
                # Convert both to date objects for comparison
                activity_month_date = activity_month.date()
                single_month_date = single_month.date() if hasattr(single_month, 'date') else single_month
                logger.info(f"💰 DEBUG: Comparing dates - Activity: {activity_month_date}, Single: {single_month_date}")
                
                if activity_month_date == single_month_date:
                    amount = float(activity['amount'])
                    activity_type = activity['activity_type'].lower()
                    logger.info(f"💰 DEBUG: Activity matches month - Amount: £{amount}, Type: {activity_type}")
                    
                    # Apply the same logic as in the main loop to determine cash flow direction
                    if any(keyword in activity_type for keyword in ["investment"]):
                        total_activity_amount -= amount  # Negative for investments
                        logger.info(f"💰 DEBUG: Applied as INVESTMENT (negative): -£{amount}")
                    elif activity_type in ["taxuplift", "taxuplift_tax"]:
                        total_activity_amount -= amount  # Tax uplift = negative (inflow)
                        logger.info(f"💰 DEBUG: Applied as TAX UPLIFT (negative): -£{amount}")
                    elif activity_type in ["productswitchin"]:
                        total_activity_amount -= amount  # Product switch in = negative (money out)
                        logger.info(f"💰 DEBUG: Applied as PRODUCT SWITCH IN (negative): -£{amount}")
                    elif activity_type in ["fundswitchin"]:
                        total_activity_amount -= amount  # Fund switch in = negative (money coming into fund)
                        logger.info(f"💰 DEBUG: Applied as FUND SWITCH IN (negative): -£{amount}")
                    elif any(keyword in activity_type for keyword in ["withdrawal"]):
                        total_activity_amount += amount  # Positive for withdrawals
                        logger.info(f"💰 DEBUG: Applied as WITHDRAWAL (positive): +£{amount}")
                    elif activity_type in ["productswitchout"]:
                        total_activity_amount += amount  # Product switch out = positive (money in)
                        logger.info(f"💰 DEBUG: Applied as PRODUCT SWITCH OUT (positive): +£{amount}")
                    elif activity_type in ["fundswitchout"]:
                        total_activity_amount += amount  # Fund switch out = positive (money leaving fund)
                        logger.info(f"💰 DEBUG: Applied as FUND SWITCH OUT (positive): +£{amount}")
                    elif any(keyword in activity_type for keyword in ["fee", "charge", "expense"]):
                        total_activity_amount += amount  # Positive for fees (money out)
                        logger.info(f"💰 DEBUG: Applied as FEE (positive): +£{amount}")
                    elif any(keyword in activity_type for keyword in ["dividend", "interest", "capital gain"]):
                        total_activity_amount -= amount  # Negative for reinvested gains
                        logger.info(f"💰 DEBUG: Applied as DIVIDEND/GAIN (negative): -£{amount}")
                    else:
                        logger.warning(f"💰 DEBUG: Unknown activity type: {activity_type}, not applied")
                else:
                    logger.info(f"💰 DEBUG: Activity month {activity_month} doesn't match single month {single_month}")
            
            logger.info(f"💰 DEBUG: Total activity amount after processing: £{total_activity_amount}")
            
            # Add activities at the start of the month (1st day) - these are the investments
            if total_activity_amount != 0:
                activity_date = single_month.replace(day=1)
                separated_cash_flows[activity_date] = total_activity_amount
                logger.info(f"💰 DEBUG: Separated activities: £{total_activity_amount} on {activity_date}")
            else:
                logger.warning(f"💰 DEBUG: No activities to separate (total_activity_amount = 0)")
            
            # Add valuation at the end of the month - but in the NEXT month to avoid aggregation
            # This represents one month of growth from the activities to the valuation
            if single_month.month == 12:
                # Handle December -> January transition
                valuation_date = single_month.replace(year=single_month.year + 1, month=1, day=1)
            else:
                # Normal month transition
                valuation_date = single_month.replace(month=single_month.month + 1, day=1)
            
            separated_cash_flows[valuation_date] = valuation_amount
            logger.info(f"💰 DEBUG: Separated valuation: £{valuation_amount} on {valuation_date}")
            
            # Use the separated cash flows for IRR calculation
            cash_flows = separated_cash_flows
            logger.info(f"💰 DEBUG: Using separated cash flows for IRR calculation: {len(cash_flows)} flows")
            
            # Debug: Print the separated cash flows
            for date, amount in sorted(cash_flows.items()):
                logger.info(f"💰 DEBUG: Final separated cash flow - {date}: £{amount}")
        
        # Convert to sorted lists for IRR calculation
        sorted_months = sorted(cash_flows.keys())
        amounts = [cash_flows[month] for month in sorted_months]
        dates = [month.strftime("%Y-%m-%dT00:00:00") for month in sorted_months]
        
        # DEBUG: Log the actual data being passed to IRR calculation
        logger.info(f"💰 DEBUG: About to call calculate_excel_style_irr with:")
        logger.info(f"💰 DEBUG: Dates: {dates}")
        logger.info(f"💰 DEBUG: Amounts: {amounts}")
        logger.info(f"💰 DEBUG: First amount: {amounts[0]}, Last amount: {amounts[-1]}")
        
        # Calculate IRR using Excel-style method
        irr_result = calculate_excel_style_irr(dates, amounts)
        
        # Extract the IRR value from the result dictionary
        irr_decimal = irr_result.get('period_irr', 0)
        days_in_period = irr_result.get('days_in_period', 0)
        
        # Store the calculated IRR in the database (replace existing if any)
        irr_percentage = round(irr_decimal * 100, 1)
        irr_date_iso = irr_date_obj.isoformat()
        
        logger.info(f"💰 DEBUG: Final IRR calculation - Decimal: {irr_decimal}, Percentage: {irr_percentage}%")
        
        # REMOVED: Database insertion - this function should only calculate, not store
        # The calling function (like valuation endpoint) is responsible for storing the IRR
        logger.info(f"💰 DEBUG: IRR calculation completed: {irr_percentage}% for fund {portfolio_fund_id} on {irr_date_iso}")

        final_result = {
            "success": True,
            "irr_percentage": irr_percentage,
            "irr_decimal": irr_decimal,
            "calculation_date": irr_date_iso,
            "portfolio_fund_id": portfolio_fund_id,
            "valuation_amount": valuation_amount,
            "cash_flows_count": len(cash_flows),
            "period_start": sorted_months[0].isoformat() if sorted_months else irr_date_iso,
            "period_end": sorted_months[-1].isoformat() if sorted_months else irr_date_iso,
            "days_in_period": days_in_period
        }
        
        # Cache the single fund IRR result for future use (include cash flows for uniqueness)
        cash_flow_values = [cash_flows[month] for month in sorted(cash_flows.keys())]
        # Round amounts below a pence to zero to handle floating point precision errors
        cash_flow_values = [0.0 if abs(amount) < 0.01 else amount for amount in cash_flow_values]
        await _irr_cache.set(
            portfolio_fund_ids=[portfolio_fund_id],
            result=final_result,
            calculation_date=irr_date,
            cash_flows=cash_flow_values,
            fund_valuations={portfolio_fund_id: valuation_amount},
            ttl_minutes=30
        )
        
        # Cache the single fund IRR result for future use (include cash flows for uniqueness)
        cash_flow_values = [cash_flows[month] for month in sorted(cash_flows.keys())]
        # Round amounts below a pence to zero to handle floating point precision errors
        cash_flow_values = [0.0 if abs(amount) < 0.01 else amount for amount in cash_flow_values]
        await _irr_cache.set(
            portfolio_fund_ids=[portfolio_fund_id],
            result=final_result,
            calculation_date=irr_date,
            cash_flows=cash_flow_values,
            fund_valuations={portfolio_fund_id: valuation_amount},
            ttl_minutes=30
        )
        
        logger.info(f"💰 DEBUG: ✅ IRR calculation completed successfully for fund {portfolio_fund_id}: {final_result}")
        return final_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating portfolio fund IRR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate IRR: {str(e)}")

# ==================== END NEW STANDARDIZED IRR ENDPOINTS ====================

@router.post("/portfolio-funds/batch-valuations", response_model=dict)
async def get_batch_fund_valuations(
    request: BatchValuationsRequest,
    db = Depends(get_db)
):
    """
    Optimized batch endpoint to fetch fund valuations for multiple funds in a single request.
    This eliminates the N+1 query problem where individual valuation requests are made per fund.
    
    Returns the latest valuation for each fund up to the specified date.
    """
    try:
        fund_ids = request.fund_ids
        valuation_date = request.valuation_date
        
        if not fund_ids:
            return {"fund_valuations": {}, "count": 0}
        
        logger.info(f"Batch fetching valuations for {len(fund_ids)} funds up to date: {valuation_date}")
        
        # Build the query for batch valuation fetching
        if valuation_date:
            result = await db.fetch("""
                SELECT portfolio_fund_id, valuation, valuation_date 
                FROM portfolio_fund_valuations 
                WHERE portfolio_fund_id = ANY($1::int[]) 
                  AND valuation_date <= $2 
                ORDER BY portfolio_fund_id, valuation_date DESC
            """, fund_ids, valuation_date)
        else:
            result = await db.fetch("""
                SELECT portfolio_fund_id, valuation, valuation_date 
                FROM portfolio_fund_valuations 
                WHERE portfolio_fund_id = ANY($1::int[]) 
                ORDER BY portfolio_fund_id, valuation_date DESC
            """, fund_ids)
        
        if not result:
            return {"fund_valuations": {}, "count": 0}
        
        # Process results to get latest valuation per fund
        fund_valuations = {}
        seen_funds = set()
        
        # Since we ordered by portfolio_fund_id, valuation_date DESC, 
        # the first occurrence of each fund is its latest valuation
        for valuation_record_row in result:
            valuation_record = dict(valuation_record_row)
            fund_id = valuation_record["portfolio_fund_id"]
            
            if fund_id not in seen_funds:
                fund_valuations[fund_id] = {
                    "valuation": valuation_record["valuation"],
                    "valuation_date": valuation_record["valuation_date"]
                }
                seen_funds.add(fund_id)
        
        # Ensure all requested funds are represented (some might have no valuation)
        for fund_id in fund_ids:
            if fund_id not in fund_valuations:
                fund_valuations[fund_id] = {
                    "valuation": None,  # Use None instead of 0.0 for missing valuations
                    "valuation_date": None
                }
        
        logger.info(f"✅ Batch valuation fetch complete: {len(fund_valuations)} funds processed")
        
        return {
            "fund_valuations": fund_valuations,
            "count": len(fund_valuations),
            "requested_funds": len(fund_ids),
            "source": "batch_optimized"
        }
        
    except Exception as e:
        logger.error(f"Error in batch fund valuations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/portfolio-funds/batch-historical-valuations", response_model=dict)
async def get_batch_historical_fund_valuations(
    request: BatchHistoricalValuationsRequest,
    db = Depends(get_db)
):
    """
    Optimized batch endpoint to fetch ALL historical valuations for multiple funds in a single request.
    This eliminates the N+1 query problem for historical data fetching in the ReportGenerator.
    
    Returns all historical valuations organized by fund ID.
    """
    try:
        fund_ids = request.fund_ids
        
        if not fund_ids:
            return {"fund_historical_valuations": {}, "count": 0}
        
        logger.info(f"🚀 Batch fetching ALL historical valuations for {len(fund_ids)} funds")
        
        # Single batch query to get ALL historical valuations for all funds
        result = await db.fetch("""
            SELECT portfolio_fund_id, valuation, valuation_date 
            FROM portfolio_fund_valuations 
            WHERE portfolio_fund_id = ANY($1::int[]) 
            ORDER BY portfolio_fund_id, valuation_date DESC
        """, fund_ids)
        
        if not result:
            return {"fund_historical_valuations": {}, "count": 0}
        
        # Organize results by fund ID
        fund_historical_valuations = {}
        total_valuations = 0
        
        for valuation_record_row in result:
            valuation_record = dict(valuation_record_row)
            fund_id = valuation_record["portfolio_fund_id"]
            
            if fund_id not in fund_historical_valuations:
                fund_historical_valuations[fund_id] = []
            
            fund_historical_valuations[fund_id].append({
                "valuation": valuation_record["valuation"],
                "valuation_date": valuation_record["valuation_date"]
            })
            total_valuations += 1
        
        # Ensure all requested funds are represented (some might have no valuations)
        for fund_id in fund_ids:
            if fund_id not in fund_historical_valuations:
                fund_historical_valuations[fund_id] = []
        
        logger.info(f"✅ Batch historical valuation fetch complete: {total_valuations} total valuations for {len(fund_historical_valuations)} funds")
        
        return {
            "fund_historical_valuations": fund_historical_valuations,
            "count": len(fund_historical_valuations),
            "total_valuations": total_valuations,
            "requested_funds": len(fund_ids),
            "source": "batch_historical_optimized"
        }
        
    except Exception as e:
        logger.error(f"Error in batch historical fund valuations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Add this after the existing latest-irr endpoint:

# ==================== IRR CACHE MANAGEMENT ENDPOINTS ====================

@router.get("/portfolio-funds/irr-cache/stats", response_model=dict)
async def get_irr_cache_stats():
    """
    Get IRR cache statistics for monitoring performance and cache efficiency.
    
    Returns:
        Dictionary with cache statistics including entry counts, sizes, etc.
    """
    try:
        stats = _irr_cache.get_stats()
        logger.info(f"📊 IRR Cache stats requested: {stats}")
        return {
            "success": True,
            "cache_stats": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting IRR cache stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache stats: {str(e)}")

@router.post("/portfolio-funds/irr-cache/clear-expired", response_model=dict)
async def clear_expired_irr_cache_entries():
    """
    Clear expired IRR cache entries to free up memory.
    
    Returns:
        Number of expired entries removed
    """
    try:
        cleared_count = await _irr_cache.clear_expired()
        logger.info(f"🧹 Cleared {cleared_count} expired IRR cache entries")
        return {
            "success": True,
            "cleared_entries": cleared_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error clearing expired IRR cache entries: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clear expired cache: {str(e)}")

@router.post("/portfolio-funds/irr-cache/invalidate", response_model=dict)
async def invalidate_irr_cache_for_funds(
    fund_ids: List[int] = Body(..., description="List of portfolio fund IDs to invalidate cache for")
):
    """
    Invalidate IRR cache entries for specific portfolio funds.
    Useful when fund data changes (new activities, valuations, etc.)
    
    Args:
        fund_ids: List of portfolio fund IDs to invalidate cache for
        
    Returns:
        Number of cache entries invalidated
    """
    try:
        invalidated_count = await _irr_cache.invalidate_portfolio_funds(fund_ids)
        logger.info(f"🗑️ Invalidated {invalidated_count} IRR cache entries for funds: {fund_ids}")
        return {
            "success": True,
            "invalidated_entries": invalidated_count,
            "fund_ids": fund_ids,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error invalidating IRR cache for funds {fund_ids}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to invalidate cache: {str(e)}")


@router.post("/portfolio_funds/{portfolio_fund_id}/recalculate-irr", response_model=dict)
async def recalculate_irr_after_activity(
    portfolio_fund_id: int,
    request: dict,
    db = Depends(get_db)
):
    """
    Recalculate IRR values after activity changes.
    
    This endpoint is used when activities are saved to recalculate existing IRR values 
    that should include the new activity data. It only recalculates IRR values on or 
    after the specified activity date.
    
    Args:
        portfolio_fund_id: The portfolio fund ID
        request: Request body containing activity_date (YYYY-MM-DD format)
        
    Returns:
        dict: Result of the recalculation operation
    """
    try:
        activity_date = request.get("activity_date")
        
        logger.info(f"Recalculating IRR after activity change for portfolio_fund_id: {portfolio_fund_id}, activity_date: {activity_date}")
        
        # Import the recalculation function from holding_activity_logs
        from app.api.routes.holding_activity_logs import recalculate_irr_after_activity_change
        
        # Call the recalculation function
        result = await recalculate_irr_after_activity_change(
            portfolio_fund_id=portfolio_fund_id,
            db=db,
            activity_date=activity_date
        )
        
        return {
            "success": True,
            "portfolio_fund_id": portfolio_fund_id,
            "activity_date": activity_date,
            "recalculation_result": result
        }
        
    except Exception as e:
        logger.error(f"Error recalculating IRR after activity change for fund {portfolio_fund_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to recalculate IRR: {str(e)}")