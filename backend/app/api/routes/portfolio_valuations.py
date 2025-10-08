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
    limit: int = Query(100000, ge=1, le=100000, description="Max number of records to return"),
    portfolio_id: Optional[int] = Query(None, description="Filter by portfolio ID"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves portfolio valuations with optional filtering.
    Why it's needed: Provides access to historical portfolio valuation data.
    """
    try:
        # Build dynamic SQL query
        base_query = "SELECT * FROM portfolio_valuations"
        conditions = []
        params = []
        
        if portfolio_id is not None:
            conditions.append("portfolio_id = $" + str(len(params) + 1))
            params.append(portfolio_id)
        
        # Construct query with WHERE clause if needed
        if conditions:
            query = base_query + " WHERE " + " AND ".join(conditions)
        else:
            query = base_query
            
        # Add ordering and pagination
        query += f" ORDER BY portfolio_id, valuation_date DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
        params.extend([limit, skip])
        
        result = await db.fetch(query, *params)
        return [dict(row) for row in result]
        
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
        # Since latest_portfolio_valuations view is missing, query the table with proper column aliases
        if portfolio_id is not None:
            query = """
                SELECT 
                    portfolio_id,
                    valuation as current_value,
                    valuation_date,
                    id as portfolio_valuation_id
                FROM portfolio_valuations 
                WHERE portfolio_id = $1
                ORDER BY valuation_date DESC 
                LIMIT 1
            """
            result = await db.fetch(query, portfolio_id)
        else:
            query = """
                SELECT DISTINCT ON (portfolio_id)
                    portfolio_id,
                    valuation as current_value,
                    valuation_date,
                    id as portfolio_valuation_id
                FROM portfolio_valuations 
                ORDER BY portfolio_id, valuation_date DESC
            """
            result = await db.fetch(query)
        
        return [dict(row) for row in result]
        
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
        portfolio_check = await db.fetchrow(
            "SELECT id FROM portfolios WHERE id = $1", 
            valuation.portfolio_id
        )
        if not portfolio_check:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {valuation.portfolio_id} not found")
        
        # Prepare data for insertion
        data_dict = valuation.model_dump()
        
        # Handle datetime serialization
        if isinstance(data_dict['valuation_date'], datetime):
            data_dict['valuation_date'] = data_dict['valuation_date'].isoformat()
        
        # Create dynamic INSERT query
        columns = list(data_dict.keys())
        placeholders = [f"${i+1}" for i in range(len(columns))]
        values = list(data_dict.values())
        
        query = f"""
            INSERT INTO portfolio_valuations ({', '.join(columns)}) 
            VALUES ({', '.join(placeholders)}) 
            RETURNING *
        """
        
        result = await db.fetchrow(query, *values)
        if result:
            return dict(result)
        
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
        result = await db.fetchrow(
            "SELECT * FROM portfolio_valuations WHERE id = $1", 
            valuation_id
        )
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Portfolio valuation with ID {valuation_id} not found")
        
        return dict(result)
        
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
        check_result = await db.fetchrow(
            "SELECT id FROM portfolio_valuations WHERE id = $1", 
            valuation_id
        )
        if not check_result:
            raise HTTPException(status_code=404, detail=f"Portfolio valuation with ID {valuation_id} not found")
        
        # Prepare update data
        update_data = valuation_update.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid update data provided")
        
        # Handle datetime serialization
        if 'valuation_date' in update_data and isinstance(update_data['valuation_date'], datetime):
            update_data['valuation_date'] = update_data['valuation_date'].isoformat()
        
        # Build dynamic UPDATE query
        set_clauses = []
        params = []
        for i, (column, value) in enumerate(update_data.items(), 1):
            set_clauses.append(f"{column} = ${i}")
            params.append(value)
        
        query = f"""
            UPDATE portfolio_valuations 
            SET {', '.join(set_clauses)} 
            WHERE id = ${len(params) + 1} 
            RETURNING *
        """
        params.append(valuation_id)
        
        result = await db.fetchrow(query, *params)
        if result:
            return dict(result)
        
        raise HTTPException(status_code=500, detail="Failed to update portfolio valuation")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating portfolio valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/portfolio_valuations/{valuation_id}", response_model=dict)
async def delete_portfolio_valuation(valuation_id: int, db = Depends(get_db)):
    """
    Delete a portfolio valuation with cascade deletion logic.
    
    When a portfolio valuation is deleted:
    1. Delete any portfolio-level IRR records that reference this valuation
    2. Delete any portfolio-level IRR records for the same date
    """
    try:
        # Check if valuation exists and get its details
        check_result = await db.fetchrow(
            "SELECT * FROM portfolio_valuations WHERE id = $1", 
            valuation_id
        )
        if not check_result:
            raise HTTPException(status_code=404, detail=f"Portfolio valuation with ID {valuation_id} not found")
        
        # Get details of the valuation being deleted
        valuation_to_delete = dict(check_result)
        portfolio_id = valuation_to_delete["portfolio_id"]
        valuation_date = valuation_to_delete["valuation_date"]
        
        # Extract just the date part (YYYY-MM-DD) for comparison
        if isinstance(valuation_date, str):
            valuation_date_only = valuation_date.split('T')[0]
        else:
            valuation_date_only = valuation_date.strftime('%Y-%m-%d')
        
        logger.info(f"Deleting portfolio valuation for portfolio {portfolio_id} on date {valuation_date_only}")
        
        # ========================================================================
        # Step 1: Clean up related portfolio-level IRR records before deleting valuation
        # ========================================================================
        cascade_deletions = []
        
        try:
            # Delete any IRR records that reference this valuation
            irr_cleanup_result = await db.execute(
                "DELETE FROM portfolio_irr_values WHERE portfolio_valuation_id = $1",
                valuation_id
            )
            
            # Parse deletion count from result
            if irr_cleanup_result.startswith("DELETE"):
                deleted_count = irr_cleanup_result.split()[1]
                if int(deleted_count) > 0:
                    logger.info(f"Cleaned up {deleted_count} portfolio IRR records that referenced valuation {valuation_id}")
                    cascade_deletions.append(f"Deleted {deleted_count} IRR records by valuation reference")
            
            # Delete related portfolio IRR values for this date
            try:
                # Use date range for timestamp comparison
                date_start = f"{valuation_date_only}T00:00:00"
                date_end = f"{valuation_date_only}T23:59:59"
                
                portfolio_irr_delete_result = await db.execute(
                    "DELETE FROM portfolio_irr_values WHERE portfolio_id = $1 AND date >= $2 AND date <= $3",
                    portfolio_id, date_start, date_end
                )
                
                # Parse deletion count from result
                if portfolio_irr_delete_result.startswith("DELETE"):
                    deleted_count = portfolio_irr_delete_result.split()[1]
                    if int(deleted_count) > 0:
                        logger.info(f"Deleted {deleted_count} related portfolio IRR records for date {valuation_date_only}")
                        cascade_deletions.append(f"Deleted {deleted_count} portfolio IRR records")
                
            except Exception as e:
                logger.warning(f"Failed to delete related portfolio IRR records for date {valuation_date_only}: {str(e)}")
                
        except Exception as e:
            logger.warning(f"Failed to clean up related IRR records for portfolio valuation {valuation_id}: {str(e)}")
        
        # ========================================================================
        # Step 2: Delete the portfolio valuation
        # ========================================================================
        result = await db.execute(
            "DELETE FROM portfolio_valuations WHERE id = $1",
            valuation_id
        )
        
        if not result or not result.startswith("DELETE"):
            logger.error(f"Failed to delete portfolio valuation with ID {valuation_id}")
            raise HTTPException(status_code=500, detail="Failed to delete portfolio valuation")
        
        logger.info(f"Successfully deleted portfolio valuation with ID {valuation_id}")
        
        # ========================================================================
        # Return success with cascade deletion details
        # ========================================================================
        response_message = f"Portfolio valuation {valuation_id} deleted successfully"
        if cascade_deletions:
            response_message += f". Cascade deletions: {'; '.join(cascade_deletions)}"
        
        return {
            "message": response_message,
            "status": "success",
            "cascade_deletions": cascade_deletions,
            "affected_date": valuation_date_only
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting portfolio valuation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/valuations", response_model=List[PortfolioValuation])
async def get_portfolio_valuations_by_portfolio(
    portfolio_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100000, ge=1, le=100000),
    db = Depends(get_db)
):
    """
    What it does: Retrieves all valuations for a specific portfolio.
    """
    try:
        # Verify portfolio exists
        portfolio_check = await db.fetchrow(
            "SELECT id FROM portfolios WHERE id = $1", 
            portfolio_id
        )
        if not portfolio_check:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        result = await db.fetch(
            """
            SELECT * FROM portfolio_valuations 
            WHERE portfolio_id = $1 
            ORDER BY valuation_date DESC 
            LIMIT $2 OFFSET $3
            """,
            portfolio_id, limit, skip
        )
        
        return [dict(row) for row in result]
        
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
        result = await db.fetchrow(
            """
            SELECT 
                portfolio_id,
                valuation as current_value,
                valuation_date,
                id as portfolio_valuation_id
            FROM portfolio_valuations 
            WHERE portfolio_id = $1
            ORDER BY valuation_date DESC 
            LIMIT 1
            """,
            portfolio_id
        )
        
        if not result:
            raise HTTPException(status_code=404, detail=f"No valuations found for portfolio {portfolio_id}")
        
        return dict(result)
        
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
        portfolio_check = await db.fetchrow(
            "SELECT id FROM portfolios WHERE id = $1", 
            portfolio_id
        )
        if not portfolio_check:
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
        portfolio_funds_result = await db.fetch(
            """
            SELECT id, available_funds_id 
            FROM portfolio_funds 
            WHERE portfolio_id = $1 AND status = 'active'
            """,
            portfolio_id
        )
        
        if not portfolio_funds_result:
            logger.warning(f"No active funds found for portfolio {portfolio_id}")
            # Create a zero valuation if no funds
            portfolio_valuation = PortfolioValuationCreate(
                portfolio_id=portfolio_id,
                valuation_date=datetime.combine(target_date, datetime.min.time()),
                value=0.0
            )
        else:
            portfolio_fund_ids = [row["id"] for row in portfolio_funds_result]
            
            # Get fund valuations for the target date (or closest date before)
            total_value = 0.0
            fund_values_found = 0
            
            for pf_id in portfolio_fund_ids:
                # Get the closest valuation on or before the target date
                valuation_result = await db.fetchrow(
                    """
                    SELECT valuation 
                    FROM portfolio_fund_valuations 
                    WHERE portfolio_fund_id = $1 AND valuation_date <= $2
                    ORDER BY valuation_date DESC 
                    LIMIT 1
                    """,
                    pf_id, target_date.isoformat()
                )
                
                if valuation_result:
                    total_value += float(valuation_result["valuation"])
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
        existing_result = await db.fetchrow(
            """
            SELECT id 
            FROM portfolio_valuations 
            WHERE portfolio_id = $1 AND valuation_date = $2
            """,
            portfolio_id, data_dict['valuation_date']
        )
        
        if existing_result:
            # Update existing valuation
            update_result = await db.fetchrow(
                """
                UPDATE portfolio_valuations 
                SET value = $1 
                WHERE id = $2 
                RETURNING *
                """,
                data_dict['value'], existing_result["id"]
            )
            
            if update_result:
                logger.info(f"Updated existing portfolio valuation for {portfolio_id} on {valuation_date}")
                return dict(update_result)
        else:
            # Create new valuation
            columns = list(data_dict.keys())
            placeholders = [f"${i+1}" for i in range(len(columns))]
            values = list(data_dict.values())
            
            query = f"""
                INSERT INTO portfolio_valuations ({', '.join(columns)}) 
                VALUES ({', '.join(placeholders)}) 
                RETURNING *
            """
            
            result = await db.fetchrow(query, *values)
            if result:
                logger.info(f"Created new portfolio valuation for {portfolio_id} on {valuation_date}")
                return dict(result)
        
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
        portfolio_check = await db.fetchrow(
            "SELECT id FROM portfolios WHERE id = $1", 
            portfolio_id
        )
        if not portfolio_check:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        # Get all active portfolio funds
        portfolio_funds_result = await db.fetch(
            """
            SELECT id 
            FROM portfolio_funds 
            WHERE portfolio_id = $1 AND status = 'active'
            """,
            portfolio_id
        )
        
        if not portfolio_funds_result:
            return {
                "portfolio_id": portfolio_id,
                "current_value": 0.0,
                "fund_count": 0,
                "calculation_date": datetime.now().isoformat()
            }
        
        portfolio_fund_ids = [row["id"] for row in portfolio_funds_result]
        
        # Get latest valuations (since latest_portfolio_fund_valuations view is missing)
        latest_valuations_result = await db.fetch(
            """
            SELECT DISTINCT ON (portfolio_fund_id)
                portfolio_fund_id, 
                valuation 
            FROM portfolio_fund_valuations 
            WHERE portfolio_fund_id = ANY($1::int[])
            ORDER BY portfolio_fund_id, valuation_date DESC
            """,
            portfolio_fund_ids
        )
        
        total_value = sum(float(row["valuation"]) for row in latest_valuations_result)
        
        return {
            "portfolio_id": portfolio_id,
            "current_value": total_value,
            "fund_count": len(latest_valuations_result),
            "calculation_date": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating current portfolio value: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") 