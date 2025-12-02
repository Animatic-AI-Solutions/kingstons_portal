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
from app.services.irr_cascade_service import safe_irr_value
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def log_out_of_range_activity_warning(portfolio_fund_id: int, activity_date: date, db) -> None:
    """
    Logs a warning if an existing activity is found to be out of range when fetching data.
    
    Args:
        portfolio_fund_id: The portfolio fund ID
        activity_date: The activity date to check
        db: Database connection
    """
    try:
        query = '\n        SELECT cp.start_date, cp.product_name, cp.id as product_id\n        FROM portfolio_funds pf\n        JOIN portfolios p ON p.id = pf.portfolio_id\n        JOIN client_products cp ON cp.portfolio_id = p.id\n        WHERE pf.id = $1\n        '
        result = await db.fetchrow(query, portfolio_fund_id)
        if result:
            activity_year_month = (activity_date.year, activity_date.month)
            product_start_year_month = (result['start_date'].year, result['start_date'].month)
            if activity_year_month < product_start_year_month:
                logger.warning(f"OUT-OF-RANGE ACTIVITY FOUND: Activity date {activity_date} is in a month before product start date {result['start_date']} for product '{result['product_name']}' (ID: {result['product_id']})")
    except Exception as e:
        logger.error(f'Error checking out-of-range activity: {e}')

class PortfolioFromTemplate(BaseModel):
    template_id: int
    generation_id: Optional[int] = None
    portfolio_name: str
    status: str = 'active'
    start_date: Optional[str] = None
router = APIRouter()

@router.get('/portfolios', response_model=Union[List[Portfolio], Dict[str, int]])
async def get_portfolios(skip: int=Query(0, ge=0, description='Number of records to skip for pagination'), limit: int=Query(100000, ge=1, le=100000, description='Max number of records to return'), status: Optional[str]=None, template_generation_id: Optional[int]=None, count_only: bool=False, db=Depends(get_db)):
    """
    What it does: Retrieves a paginated list of portfolios with optional filtering by status and template.
    Why it's needed: Provides a way to view and filter investment portfolios in the system.
    How it works:
        1. Connects to the PostgreSQL database
        2. Builds a query to the 'portfolios' table with optional filters
        3. If count_only is True, returns just the count of matching records
        4. Otherwise applies pagination parameters to limit result size
        5. Returns the data as a list of Portfolio objects or a count
    Expected output: A JSON array of portfolio objects with all their details or a count
    """
    try:
        where_clauses = []
        params = []
        param_count = 1
        if status is not None:
            where_clauses.append(f'status = ${param_count}')
            params.append(status)
            param_count += 1
        if template_generation_id is not None:
            where_clauses.append(f'template_generation_id = ${param_count}')
            params.append(template_generation_id)
            param_count += 1
        if count_only:
            base_query = 'SELECT COUNT(*) as count FROM portfolios'
        else:
            base_query = 'SELECT * FROM portfolios'
        if where_clauses:
            query = f"{base_query} WHERE {' AND '.join(where_clauses)}"
        else:
            query = base_query
        if count_only:
            result = await db.fetchrow(query, *params)
            return {'count': result['count'] if result else 0}
        skip_val = skip
        limit_val = limit
        if hasattr(skip, 'default'):
            skip_val = skip.default
        if hasattr(limit, 'default'):
            limit_val = limit.default
        query += f' LIMIT {limit_val} OFFSET {skip_val}'
        result = await db.fetch(query, *params)
        return [dict(row) for row in result] if result else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.post('/portfolios', response_model=Portfolio)
async def create_portfolio(portfolio: PortfolioCreate, db=Depends(get_db)):
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
        data_dict = portfolio.model_dump()
        if 'start_date' not in data_dict or data_dict['start_date'] is None:
            data_dict['start_date'] = date.today()
        columns = list(data_dict.keys())
        values = list(data_dict.values())
        placeholders = [f'${i + 1}' for i in range(len(values))]
        query = f"INSERT INTO portfolios ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
        result = await db.fetchrow(query, *values)
        if result:
            new_portfolio = dict(result)
            logger.info(f"Adding Cash fund to portfolio {new_portfolio['id']}")
            cash_fund_result = await db.fetchrow('SELECT * FROM available_funds WHERE fund_name = $1 AND isin_number = $2 LIMIT 1', 'Cash', 'N/A')
            if cash_fund_result:
                cash_fund = dict(cash_fund_result)
                logger.info(f"Found Cash fund with ID {cash_fund['id']}")
                portfolio_start_date = data_dict['start_date']
                cash_fund_data = {'portfolio_id': new_portfolio['id'], 'available_funds_id': cash_fund['id'], 'target_weighting': None, 'start_date': portfolio_start_date, 'amount_invested': 0}
                columns = list(cash_fund_data.keys())
                values = list(cash_fund_data.values())
                placeholders = [f'${i + 1}' for i in range(len(values))]
                query = f"INSERT INTO portfolio_funds ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
                cash_add_result = await db.fetchrow(query, *values)
                if cash_add_result:
                    logger.info(f"Successfully added Cash fund to portfolio {new_portfolio['id']}")
                else:
                    logger.warning(f"Failed to add Cash fund to portfolio {new_portfolio['id']}")
            else:
                logger.warning("Cash fund (name 'Cash', ISIN 'N/A') not found in available_funds table")
            return new_portfolio
        raise HTTPException(status_code=400, detail='Failed to create portfolio')
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating portfolio: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/portfolios/with-template', response_model=List[PortfolioWithTemplate])
async def get_portfolios_with_template(skip: int=Query(0, ge=0, description='Number of records to skip for pagination'), limit: int=Query(100000, ge=1, le=100000, description='Max number of records to return'), status: Optional[str]=None, db=Depends(get_db)):
    """
    What it does: Retrieves a paginated list of portfolios with template information.
    Why it's needed: Provides a way to view and filter investment portfolios with their template origins.
    How it works:
        1. Connects to the PostgreSQL database
        2. Builds a query to the 'portfolios' table with optional filters
        3. Applies pagination parameters to limit result size
        4. For each portfolio with a template_generation_id, fetches the template info
        5. Returns the data as a list of PortfolioWithTemplate objects
    Expected output: A JSON array of portfolio objects with template details where applicable
    """
    try:
        where_clauses = []
        params = []
        param_count = 1
        if status is not None:
            where_clauses.append(f'status = ${param_count}')
            params.append(status)
            param_count += 1
        base_query = 'SELECT * FROM portfolios'
        if where_clauses:
            query = f"{base_query} WHERE {' AND '.join(where_clauses)}"
        else:
            query = base_query
        skip_val = skip
        limit_val = limit
        if hasattr(skip, 'default'):
            skip_val = skip.default
        if hasattr(limit, 'default'):
            limit_val = limit.default
        query += f' LIMIT {limit_val} OFFSET {skip_val}'
        result = await db.fetch(query, *params)
        if not result:
            return []
        portfolios = [dict(row) for row in result]
        template_ids = {p['template_generation_id'] for p in portfolios if p.get('template_generation_id')}
        templates_dict = {}
        if template_ids:
            templates_result = await db.fetch('SELECT * FROM template_portfolio_generations WHERE id = ANY($1::int[])', list(template_ids))
            templates_dict = {t['id']: t for t in templates_result}
        for portfolio in portfolios:
            if portfolio.get('template_generation_id') and portfolio['template_generation_id'] in templates_dict:
                portfolio['template_info'] = templates_dict[portfolio['template_generation_id']]
        return portfolios
    except Exception as e:
        logger.error(f'Error fetching portfolios with template: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/portfolios/{portfolio_id}', response_model=PortfolioWithTemplate)
async def get_portfolio(portfolio_id: int, db=Depends(get_db)):
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
        result = await db.fetchrow('SELECT * FROM portfolios WHERE id = $1', portfolio_id)
        if not result:
            raise HTTPException(status_code=404, detail=f'Portfolio with ID {portfolio_id} not found')
        portfolio = dict(result)
        if portfolio.get('template_generation_id'):
            template_result = await db.fetchrow('SELECT * FROM template_portfolio_generations WHERE id = $1', portfolio['template_generation_id'])
            if template_result:
                portfolio['template_info'] = dict(template_result)
        return portfolio
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error getting portfolio: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.patch('/portfolios/{portfolio_id}', response_model=Portfolio)
async def update_portfolio(portfolio_id: int, portfolio_update: PortfolioUpdate, db=Depends(get_db)):
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
    update_data = portfolio_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail='No valid update data provided')
    try:
        check_result = await db.fetchrow('SELECT id FROM portfolios WHERE id = $1', portfolio_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f'Portfolio with ID {portfolio_id} not found')
        set_clauses = []
        params = []
        param_count = 1
        for key, value in update_data.items():
            set_clauses.append(f'{key} = ${param_count}')
            params.append(value)
            param_count += 1
        params.append(portfolio_id)
        query = f"UPDATE portfolios SET {', '.join(set_clauses)} WHERE id = ${param_count} RETURNING *"
        result = await db.fetchrow(query, *params)
        if result:
            return dict(result)
        raise HTTPException(status_code=400, detail='Failed to update portfolio')
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating portfolio: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

class PortfolioTemplateUpdate(BaseModel):
    template_generation_id: Optional[int] = None

@router.patch('/portfolios/{portfolio_id}/template', response_model=Portfolio)
async def update_portfolio_template(portfolio_id: int, template_update: PortfolioTemplateUpdate, db=Depends(get_db)):
    """
    Updates a portfolio's template generation ID
    """
    try:
        portfolio_result = await db.fetchrow('SELECT id, portfolio_name FROM portfolios WHERE id = $1', portfolio_id)
        if not portfolio_result:
            raise HTTPException(status_code=404, detail=f'Portfolio with ID {portfolio_id} not found')
        template_generation_id = template_update.template_generation_id
        if template_generation_id is not None:
            template_result = await db.fetchrow('SELECT id, generation_name, status FROM template_portfolio_generations WHERE id = $1', template_generation_id)
            if not template_result:
                raise HTTPException(status_code=404, detail=f'Template generation with ID {template_generation_id} not found')
            if template_result['status'] == 'inactive':
                raise HTTPException(status_code=400, detail='Cannot assign inactive template generation to portfolio')
        update_result = await db.fetchrow('UPDATE portfolios SET template_generation_id = $1 WHERE id = $2 RETURNING *', template_generation_id, portfolio_id)
        if update_result:
            logger.info(f'Updated portfolio {portfolio_id} template to generation {template_generation_id}')
            return dict(update_result)
        raise HTTPException(status_code=400, detail='Failed to update portfolio template')
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating portfolio template: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.delete('/portfolios/{portfolio_id}', response_model=dict)
async def delete_portfolio(portfolio_id: int, db=Depends(get_db)):
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
        5. Deletes the portfolio record
        7. Returns a success message
    Expected output: A JSON object with a success message confirmation and deletion counts
    """
    try:
        check_result = await db.fetchrow('SELECT id FROM portfolios WHERE id = $1', portfolio_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f'Portfolio with ID {portfolio_id} not found')
        logger.info(f'Deleting portfolio with ID: {portfolio_id} and all related data')
        portfolio_funds = await db.fetch('SELECT id FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
        irr_values_deleted = 0
        activity_logs_deleted = 0
        portfolio_funds_deleted = len(portfolio_funds) if portfolio_funds else 0
        if portfolio_funds:
            for fund in portfolio_funds:
                fund_id = fund['id']
                irr_result = await db.fetch('DELETE FROM portfolio_fund_irr_values WHERE fund_id = $1 RETURNING *', fund_id)
                deleted_count = len(irr_result) if irr_result else 0
                irr_values_deleted += deleted_count
                logger.info(f'Deleted {deleted_count} IRR values for portfolio fund {fund_id}')
                activity_result = await db.fetch('DELETE FROM holding_activity_log WHERE portfolio_fund_id = $1 RETURNING *', fund_id)
                deleted_count = len(activity_result) if activity_result else 0
                activity_logs_deleted += deleted_count
                logger.info(f'Deleted {deleted_count} activity logs for portfolio fund {fund_id}')
        await db.execute('DELETE FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
        logger.info(f'Deleted {portfolio_funds_deleted} portfolio funds for portfolio {portfolio_id}')
        result = await db.fetchrow('DELETE FROM portfolios WHERE id = $1 RETURNING *', portfolio_id)
        return {'message': f'Portfolio with ID {portfolio_id} deleted successfully', 'details': {'portfolio_funds_deleted': portfolio_funds_deleted, 'irr_values_deleted': irr_values_deleted, 'activity_logs_deleted': activity_logs_deleted}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting portfolio: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.post('/portfolios/from-template', response_model=Portfolio)
async def create_portfolio_from_template(template_data: PortfolioFromTemplate, db=Depends(get_db)):
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
        logger.info(f'Creating portfolio from template {template_data.template_id} with generation {template_data.generation_id}')
        template_response = await db.fetchrow('SELECT * FROM available_portfolios WHERE id = $1', template_data.template_id)
        if not template_response:
            raise HTTPException(status_code=404, detail=f'Template with ID {template_data.template_id} not found')
        template = dict(template_response)
        generation = None
        if template_data.generation_id:
            generation_response = await db.fetchrow('SELECT * FROM template_portfolio_generations WHERE id = $1', template_data.generation_id)
            if not generation_response:
                raise HTTPException(status_code=404, detail=f'Generation with ID {template_data.generation_id} not found')
            generation = dict(generation_response)
            logger.info(f"Using specified generation: {generation['id']}")
        else:
            latest_generation_response = await db.fetchrow('SELECT * FROM template_portfolio_generations WHERE available_portfolio_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1', template_data.template_id, 'active')
            if not latest_generation_response:
                raise HTTPException(status_code=404, detail='No active generations found for this template')
            generation = dict(latest_generation_response)
            logger.info(f"Using latest generation: {generation['id']}")
        portfolio_data = {'portfolio_name': f"{template['name']} - {generation['generation_name']}", 'status': 'active', 'start_date': date.today(), 'template_generation_id': generation['id']}
        columns = list(portfolio_data.keys())
        values = list(portfolio_data.values())
        placeholders = [f'${i + 1}' for i in range(len(values))]
        query = f"INSERT INTO portfolios ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
        portfolio_result = await db.fetchrow(query, *values)
        if not portfolio_result:
            raise HTTPException(status_code=500, detail='Failed to create portfolio from template')
        new_portfolio = dict(portfolio_result)
        template_funds_response = await db.fetch('SELECT * FROM available_portfolio_funds WHERE template_portfolio_generation_id = $1', generation['id'])
        if not template_funds_response:
            return new_portfolio
        fund_ids = [fund['fund_id'] for fund in template_funds_response]
        unique_fund_ids = set(fund_ids)
        if len(fund_ids) != len(unique_fund_ids):
            duplicate_funds = {}
            for fund_id in fund_ids:
                if fund_id in duplicate_funds:
                    duplicate_funds[fund_id] += 1
                else:
                    duplicate_funds[fund_id] = 1
            duplicates = {fund_id: count for fund_id, count in duplicate_funds.items() if count > 1}
            logger.warning(f"Found duplicate funds in template generation {generation['id']}: {duplicates}")
            for fund_id in duplicates.keys():
                fund_details = await db.fetchrow('SELECT fund_name FROM available_funds WHERE id = $1', fund_id)
                if fund_details:
                    logger.warning(f"Fund ID {fund_id} ({fund_details.get('fund_name', 'Unknown')}) appears {duplicates[fund_id]} times in template")
        added_fund_ids = set()
        for fund in template_funds_response:
            fund_id = fund['fund_id']
            if fund_id in added_fund_ids:
                logger.info(f'Skipping duplicate fund ID {fund_id} in template')
                continue
            fund_data = {'portfolio_id': new_portfolio['id'], 'available_funds_id': fund_id, 'target_weighting': fund['target_weighting'], 'start_date': date.today(), 'amount_invested': 0}
            columns = list(fund_data.keys())
            values = list(fund_data.values())
            placeholders = [f'${i + 1}' for i in range(len(values))]
            query = f"INSERT INTO portfolio_funds ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
            await db.fetchrow(query, *values)
            added_fund_ids.add(fund_id)
        cash_fund_included = False
        for fund in template_funds_response:
            fund_details = await db.fetchrow('SELECT * FROM available_funds WHERE id = $1', fund['fund_id'])
            if fund_details:
                if fund_details.get('fund_name') == 'Cash':
                    cash_fund_included = True
                    logger.info(f'Cash fund already included in template {template_data.template_id}')
                    break
        if not cash_fund_included:
            logger.info(f"Adding Cash fund to portfolio {new_portfolio['id']}")
            cash_fund_result = await db.fetchrow('SELECT * FROM available_funds WHERE fund_name = $1 AND isin_number = $2 LIMIT 1', 'Cash', 'N/A')
            if cash_fund_result:
                cash_fund = dict(cash_fund_result)
                logger.info(f"Found Cash fund with ID {cash_fund['id']}")
                cash_fund_data = {'portfolio_id': new_portfolio['id'], 'available_funds_id': cash_fund['id'], 'target_weighting': None, 'start_date': date.today(), 'amount_invested': 0}
                columns = list(cash_fund_data.keys())
                values = list(cash_fund_data.values())
                placeholders = [f'${i + 1}' for i in range(len(values))]
                query = f"INSERT INTO portfolio_funds ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
                cash_add_result = await db.fetchrow(query, *values)
                if cash_add_result:
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
        logger.error(f'Error creating portfolio from template: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.post('/portfolios/{portfolio_id}/calculate-irr', response_model=dict)
async def calculate_portfolio_irr(portfolio_id: int, db=Depends(get_db)):
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
        portfolio_result = await db.fetchrow('SELECT * FROM portfolios WHERE id = $1', portfolio_id)
        if not portfolio_result:
            raise HTTPException(status_code=404, detail=f'Portfolio with ID {portfolio_id} not found')
        portfolio_funds_result = await db.fetch('SELECT * FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
        if not portfolio_funds_result:
            raise HTTPException(status_code=404, detail='No portfolio funds found in this portfolio')
        portfolio_funds = [dict(row) for row in portfolio_funds_result]
        logger.info(f'Found {len(portfolio_funds)} funds in portfolio {portfolio_id}')
        all_fund_data = []
        active_funds_with_valuations = []
        for fund in portfolio_funds:
            fund_id = fund['id']
            fund_status = fund.get('status', 'active')
            logger.info(f'Processing fund {fund_id} (status: {fund_status})')
            if fund_status == 'active':
                latest_valuation = await db.fetchrow('SELECT * FROM portfolio_fund_valuations WHERE portfolio_fund_id = $1 ORDER BY valuation_date DESC LIMIT 1', fund_id)
                if not latest_valuation:
                    logger.error(f'Active fund {fund_id} has no valuations - this is required for portfolio valuation')
                    raise HTTPException(status_code=400, detail=f'Active portfolio fund ID {fund_id} has no valuations. Active funds must have valuations to calculate portfolio value.')
                else:
                    from datetime import datetime as dt
                    valuation_date = dt.fromisoformat(latest_valuation['valuation_date'])
                    active_funds_with_valuations.append({'portfolio_fund_id': fund_id, 'date': valuation_date, 'valuation': latest_valuation['valuation'], 'valuation_id': latest_valuation['id'], 'status': fund_status})
                    logger.info(f"Active fund {fund_id} has valuation {latest_valuation['valuation']} on {valuation_date.isoformat()}")
            else:
                logger.info(f'Inactive fund {fund_id} - assuming zero valuation but including for IRR calculation')
        if not active_funds_with_valuations:
            raise HTTPException(status_code=400, detail='No active funds with valuations found')
        active_funds_with_valuations.sort(key=lambda x: x['date'])
        common_date = active_funds_with_valuations[0]['date']
        common_date_iso = common_date.isoformat()
        logger.info(f'Using common date for calculations: {common_date_iso}')
        most_recent_valuation_dates = []
        for fund in portfolio_funds:
            fund_id = fund['id']
            fund_status = fund.get('status', 'active')
            if fund_status == 'active':
                fund_data = next((f for f in active_funds_with_valuations if f['portfolio_fund_id'] == fund_id), None)
                if fund_data:
                    most_recent_valuation_dates.append(fund_data)
            else:
                most_recent_valuation_dates.append({'portfolio_fund_id': fund_id, 'date': common_date, 'valuation': 0.0, 'valuation_id': None, 'status': fund_status})
                logger.info(f'Including inactive fund {fund_id} with zero valuation for IRR calculation')
        active_funds = [f for f in most_recent_valuation_dates if f['status'] == 'active']
        inactive_funds = [f for f in most_recent_valuation_dates if f['status'] != 'active']
        logger.info(f'Fund summary: {len(active_funds)} active funds with actual valuations, {len(inactive_funds)} inactive funds with zero valuations')
        logger.info(f'Total funds for IRR calculation: {len(most_recent_valuation_dates)}')
        year = common_date.year
        month = common_date.month
        calculation_results = []
        funds_to_calculate = []
        funds_with_existing_irr = []
        for fund_data in most_recent_valuation_dates:
            portfolio_fund_id = fund_data['portfolio_fund_id']
            valuation = fund_data['valuation']
            logger.info(f'Checking fund {portfolio_fund_id} for IRR calculation, valuation: {valuation}')
            existing_irr = await db.fetchrow('SELECT * FROM portfolio_fund_irr_values WHERE fund_id = $1 AND date = $2', portfolio_fund_id, common_date_iso)
            logger.info(f'Found {(1 if existing_irr else 0)} existing IRR record(s) for fund {portfolio_fund_id}')
            if valuation < 0:
                logger.error(f'Cannot calculate IRR for negative valuation: {valuation}')
                calculation_results.append({'portfolio_fund_id': portfolio_fund_id, 'status': 'error', 'message': f'Cannot calculate IRR for negative valuation: {valuation}'})
                continue
            if existing_irr:
                existing_record = dict(existing_irr)
                created_at = existing_record.get('created_at', '')
                updated_recently = False
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
                calculation_results.append({'portfolio_fund_id': portfolio_fund_id, 'status': 'skipped', 'message': f"IRR already exists for this date{(' (recently updated)' if updated_recently else '')}", 'existing_irr': existing_record['irr_result'], 'recently_updated': updated_recently})
                logger.info(f"Skipping IRR calculation for fund {portfolio_fund_id} - already exists with value {existing_record['irr_result']}{(' (recently updated)' if updated_recently else '')}")
            else:
                funds_to_calculate.append({'portfolio_fund_id': portfolio_fund_id, 'valuation': valuation, 'valuation_id': fund_data.get('valuation_id')})
                logger.info(f'Fund {portfolio_fund_id} needs IRR calculation')
        logger.info(f'Found {len(funds_to_calculate)} funds needing IRR calculation and {len(funds_with_existing_irr)} funds with existing IRR')
        for fund_info in funds_to_calculate:
            portfolio_fund_id = fund_info['portfolio_fund_id']
            valuation = fund_info['valuation']
            try:
                logger.info(f'Calculating IRR for fund {portfolio_fund_id} using standardized endpoint')
                from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
                irr_result = await calculate_single_portfolio_fund_irr(portfolio_fund_id=portfolio_fund_id, irr_date=common_date_iso.split('T')[0], db=db)
                logger.info(f'Standardized IRR calculation result for fund {portfolio_fund_id}: {irr_result}')
                if irr_result.get('success'):
                    irr_percentage = irr_result.get('irr_percentage', 0.0)
                    irr_value_data = {'fund_id': portfolio_fund_id, 'irr_result': float(irr_percentage), 'date': common_date_iso, 'fund_valuation_id': fund_info.get('valuation_id')}
                    existing_irr = await db.fetchrow('SELECT * FROM portfolio_fund_irr_values WHERE fund_id = $1 AND date = $2', portfolio_fund_id, common_date_iso)
                    if existing_irr:
                        await db.execute('UPDATE portfolio_fund_irr_values SET irr_result = $1 WHERE id = $2', safe_irr_value(irr_percentage), existing_irr['id'])
                    else:
                        columns = list(irr_value_data.keys())
                        values = list(irr_value_data.values())
                        placeholders = [f'${i + 1}' for i in range(len(values))]
                        query = f"INSERT INTO portfolio_fund_irr_values ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
                        await db.fetchrow(query, *values)
                    calculation_results.append({'portfolio_fund_id': portfolio_fund_id, 'status': 'calculated', 'irr_value': irr_percentage, 'calculation_date': common_date_iso, 'method': 'standardized'})
                else:
                    error_msg = f'Standardized IRR calculation failed: {irr_result}'
                    logger.error(error_msg)
                    calculation_results.append({'portfolio_fund_id': portfolio_fund_id, 'status': 'error', 'message': error_msg})
            except Exception as e:
                error_msg = f'Error calculating IRR for fund {portfolio_fund_id}: {str(e)}'
                logger.error(error_msg)
                calculation_results.append({'portfolio_fund_id': portfolio_fund_id, 'status': 'error', 'message': error_msg})
        successful = sum((1 for r in calculation_results if r['status'] == 'calculated'))
        skipped = sum((1 for r in calculation_results if r['status'] == 'skipped'))
        failed = sum((1 for r in calculation_results if r['status'] == 'error'))
        logger.info(f"IRR calculation complete for {successful} funds on {common_date.strftime('%d/%m/%Y')}. Skipped {skipped} funds with existing IRR values.")
        portfolio_valuation_result = None
        portfolio_irr_result = None
        try:
            logger.info('Calculating portfolio-level valuation and IRR...')
            all_fund_ids = [pf['id'] for pf in portfolio_funds]
            active_fund_ids = [pf['id'] for pf in portfolio_funds if pf.get('status', 'active') == 'active']
            inactive_fund_ids = [pf['id'] for pf in portfolio_funds if pf.get('status', 'active') != 'active']
            funds_with_valuations = [fd['portfolio_fund_id'] for fd in most_recent_valuation_dates]
            if all_fund_ids:
                total_portfolio_value = 0.0
                for fund_data in most_recent_valuation_dates:
                    if fund_data['portfolio_fund_id'] in active_fund_ids:
                        total_portfolio_value += fund_data['valuation']
                portfolio_valuation_data = {'portfolio_id': portfolio_id, 'valuation_date': common_date_iso, 'valuation': total_portfolio_value}
                existing_portfolio_valuation = await db.fetchrow('SELECT id FROM portfolio_valuations WHERE portfolio_id = $1 AND valuation_date = $2', portfolio_id, common_date_iso)
                if existing_portfolio_valuation:
                    await db.execute('UPDATE portfolio_valuations SET valuation = $1 WHERE id = $2', total_portfolio_value, existing_portfolio_valuation['id'])
                    portfolio_valuation_id = existing_portfolio_valuation['id']
                    logger.info(f'Updated existing portfolio valuation for {portfolio_id}')
                else:
                    portfolio_valuation_result = await db.fetchrow('INSERT INTO portfolio_valuations (portfolio_id, valuation_date, valuation) VALUES ($1, $2, $3) RETURNING id', portfolio_id, common_date_iso, total_portfolio_value)
                    portfolio_valuation_id = portfolio_valuation_result['id'] if portfolio_valuation_result else None
                    logger.info(f'Created new portfolio valuation for {portfolio_id}')
                portfolio_irr_response = await calculate_multiple_portfolio_funds_irr(portfolio_fund_ids=all_fund_ids, irr_date=common_date_iso.split('T')[0], db=db)
                if portfolio_irr_response.get('success'):
                    portfolio_irr_percentage = safe_irr_value(portfolio_irr_response.get('irr_percentage', 0.0))
                    logger.info(f'Portfolio IRR calculated (all funds): {portfolio_irr_percentage}%')
                    portfolio_irr_data = {'portfolio_id': portfolio_id, 'irr_result': portfolio_irr_percentage, 'date': common_date_iso, 'portfolio_valuation_id': portfolio_valuation_id}
                    existing_portfolio_irr = await db.fetchrow('SELECT id FROM portfolio_irr_values WHERE portfolio_id = $1 AND date = $2', portfolio_id, common_date_iso)
                    if existing_portfolio_irr:
                        await db.execute('UPDATE portfolio_irr_values SET irr_result = $1, portfolio_valuation_id = $2 WHERE id = $3', portfolio_irr_percentage, portfolio_valuation_id, existing_portfolio_irr['id'])
                        logger.info(f'Updated existing portfolio IRR for {portfolio_id}')
                    else:
                        columns = list(portfolio_irr_data.keys())
                        values = list(portfolio_irr_data.values())
                        placeholders = [f'${i + 1}' for i in range(len(values))]
                        query = f"INSERT INTO portfolio_irr_values ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
                        await db.fetchrow(query, *values)
                        logger.info(f'Created new portfolio IRR for {portfolio_id}')
                else:
                    logger.warning(f'Portfolio IRR calculation failed: {portfolio_irr_response}')
            else:
                logger.warning('No funds found for portfolio-level calculations')
        except Exception as e:
            logger.error(f'Error calculating portfolio-level valuation and IRR: {str(e)}')
        return {'portfolio_id': portfolio_id, 'calculation_date': common_date_iso, 'total_funds': len(portfolio_funds), 'successful': successful, 'skipped': skipped, 'failed': failed, 'details': calculation_results, 'portfolio_valuation': {'calculated': portfolio_valuation_result is not None, 'total_value': sum((fund_data['valuation'] for fund_data in most_recent_valuation_dates if fund_data['portfolio_fund_id'] in active_fund_ids)) if portfolio_funds else 0.0}, 'portfolio_irr': {'calculated': portfolio_irr_result is not None, 'irr_value': portfolio_irr_response.get('irr_result') if 'portfolio_irr_response' in locals() and portfolio_irr_response.get('success') else None}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Portfolio-wide IRR calculation error: {str(e)}')
        import traceback
        logger.error(f'Stack trace: {traceback.format_exc()}')
        raise HTTPException(status_code=500, detail=f'Error calculating portfolio IRR: {str(e)}')

@router.post('/portfolios/{portfolio_id}/calculate-irr-for-date', response_model=dict)
async def calculate_portfolio_irr_for_date(portfolio_id: int, date: str, db=Depends(get_db)):
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
        logger.info(f'Calculating IRR for portfolio {portfolio_id} on date {date}')
        try:
            calculation_date = datetime.fromisoformat(date)
            logger.info(f'Parsed date: {calculation_date}')
        except ValueError:
            logger.error(f'Invalid date format: {date}')
            raise HTTPException(status_code=400, detail='Invalid date format. Expected YYYY-MM-DD')
        year = calculation_date.year
        month = calculation_date.month
        portfolio = await db.fetchrow('SELECT * FROM portfolios WHERE id = $1', portfolio_id)
        if not portfolio:
            raise HTTPException(status_code=404, detail=f'Portfolio {portfolio_id} not found')
        portfolio_funds = await db.fetch('SELECT * FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
        if not portfolio_funds:
            raise HTTPException(status_code=404, detail=f'No funds found in portfolio {portfolio_id}')
        missing_valuations = []
        funds_with_valuations = []
        for fund in portfolio_funds:
            fund_id = fund['id']
            valuation_date_start = calculation_date.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            valuation_date_end = calculation_date.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
            logger.info(f'Looking for valuation for fund {fund_id} between {valuation_date_start} and {valuation_date_end}')
            valuation = await db.fetchrow('SELECT * FROM portfolio_fund_valuations WHERE portfolio_fund_id = $1 AND valuation_date >= $2 AND valuation_date <= $3 LIMIT 1', fund_id, valuation_date_start, valuation_date_end)
            if not valuation:
                missing_valuations.append({'portfolio_fund_id': fund_id, 'fund_name': fund.get('name', f'Fund {fund_id}')})
                logger.info(f'No valuation found for fund {fund_id} on date {date}')
            else:
                logger.info(f'Found valuation for fund {fund_id}: {dict(valuation)}')
                funds_with_valuations.append({'portfolio_fund_id': fund_id, 'valuation': float(valuation['valuation']), 'valuation_id': valuation['id'], 'valuation_date': valuation['valuation_date']})
        if not funds_with_valuations:
            return {'status': 'error', 'message': 'No valuations found for any funds on the specified date', 'missing_valuations': missing_valuations, 'portfolio_id': portfolio_id, 'date': date, 'calculation_results': []}
        calculation_results = []
        for fund_info in funds_with_valuations:
            portfolio_fund_id = fund_info['portfolio_fund_id']
            valuation = fund_info['valuation']
            try:
                if valuation < 0:
                    logger.error(f'Cannot calculate IRR for negative valuation: {valuation}')
                    calculation_results.append({'status': 'error', 'error': f'Cannot calculate IRR for negative valuation: {valuation}', 'portfolio_fund_id': portfolio_fund_id})
                    continue
                from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
                logger.info(f'Calculating IRR for fund {portfolio_fund_id} using standardized endpoint for date {date}')
                irr_result = await calculate_single_portfolio_fund_irr(portfolio_fund_id=portfolio_fund_id, irr_date=date, db=db)
                logger.info(f'Standardized IRR calculation result for fund {portfolio_fund_id}: {irr_result}')
                if irr_result.get('success'):
                    irr_percentage = irr_result.get('irr_percentage', 0.0)
                    irr_value_data = {'fund_id': portfolio_fund_id, 'irr_result': float(irr_percentage), 'date': calculation_date.isoformat(), 'fund_valuation_id': fund_info.get('valuation_id')}
                    existing_irr = await db.fetchrow('SELECT * FROM portfolio_fund_irr_values WHERE fund_id = $1 AND date = $2', portfolio_fund_id, calculation_date.isoformat())
                    if existing_irr:
                        await db.execute('UPDATE portfolio_fund_irr_values SET irr_result = $1 WHERE id = $2', safe_irr_value(irr_percentage), existing_irr['id'])
                    else:
                        columns = list(irr_value_data.keys())
                        values = list(irr_value_data.values())
                        placeholders = [f'${i + 1}' for i in range(len(values))]
                        query = f"INSERT INTO portfolio_fund_irr_values ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
                        await db.fetchrow(query, *values)
                    calculation_results.append({'portfolio_fund_id': portfolio_fund_id, 'status': 'calculated', 'irr_value': irr_percentage, 'calculation_date': calculation_date.isoformat(), 'method': 'standardized'})
                    logger.info(f'Successfully calculated IRR for fund {portfolio_fund_id}: {irr_percentage}%')
                else:
                    error_msg = f'Standardized IRR calculation failed: {irr_result}'
                    logger.error(error_msg)
                    calculation_results.append({'portfolio_fund_id': portfolio_fund_id, 'status': 'error', 'message': error_msg})
            except Exception as e:
                logger.error(f'Error calculating IRR for fund {portfolio_fund_id}: {str(e)}')
                calculation_results.append({'status': 'error', 'error': str(e), 'portfolio_fund_id': portfolio_fund_id})
        return {'status': 'success' if all((r.get('status') == 'success' for r in calculation_results)) else 'partial', 'message': 'IRR calculation completed' if not missing_valuations else 'Some funds missing valuations', 'portfolio_id': portfolio_id, 'date': date, 'missing_valuations': missing_valuations, 'calculation_results': calculation_results}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error calculating IRR: {str(e)}')
        logger.error(f'Traceback: {traceback.format_exc()}')
        raise HTTPException(status_code=500, detail=f'Failed to calculate IRR: {str(e)}')

@router.post('/portfolios/{portfolio_id}/calculate-total-irr', response_model=dict)
async def calculate_portfolio_total_irr(portfolio_id: int, year: int=Query(..., ge=1900, le=2100, description='Year for the calculations'), db=Depends(get_db)):
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
        portfolio_result = await db.fetchrow('SELECT id FROM portfolios WHERE id = $1', portfolio_id)
        if not portfolio_result:
            raise HTTPException(status_code=404, detail=f'Portfolio with ID {portfolio_id} not found')
        portfolio_irr_result = await db.fetchrow('SELECT irr_result, date FROM latest_portfolio_irr_values WHERE portfolio_id = $1', portfolio_id)
        if not portfolio_irr_result:
            logger.info(f'No portfolio IRR found for portfolio {portfolio_id}')
            return {'status': 'success', 'portfolio_id': portfolio_id, 'irr_percentage': 0.0, 'valuation_date': datetime.now().isoformat(), 'note': 'No portfolio IRR found - returning 0%'}
        irr_percentage = float(portfolio_irr_result.get('irr_result', 0))
        irr_date = portfolio_irr_result.get('date')
        logger.info(f'Retrieved portfolio IRR for portfolio {portfolio_id}: {irr_percentage}%')
        return {'status': 'success', 'portfolio_id': portfolio_id, 'irr_percentage': irr_percentage, 'valuation_date': irr_date if irr_date else datetime.now().isoformat(), 'note': 'Retrieved from latest_portfolio_irr_values'}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error retrieving portfolio total IRR: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to retrieve portfolio IRR: {str(e)}')

@router.get('/portfolios/{portfolio_id}/complete', response_model=dict)
async def get_complete_portfolio(portfolio_id: int, db=Depends(get_db)):
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
        portfolio_result = await db.fetchrow('SELECT * FROM portfolios WHERE id = $1', portfolio_id)
        if not portfolio_result:
            raise HTTPException(status_code=404, detail='Portfolio not found')
        portfolio = dict(portfolio_result)
        template_generation = None
        if portfolio.get('template_generation_id') is not None:
            template_result = await db.fetchrow('SELECT * FROM template_portfolio_generations WHERE id = $1', portfolio['template_generation_id'])
            template_generation = dict(template_result) if template_result else None
        portfolio_funds_result = await db.fetch('SELECT * FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
        if not portfolio_funds_result:
            return {'portfolio': portfolio, 'template_generation': template_generation, 'funds': [], 'valuations': [], 'irr_values': []}
        portfolio_funds = [dict(row) for row in portfolio_funds_result]
        fund_ids = [pf['id'] for pf in portfolio_funds]
        available_fund_ids = list(set([pf['available_funds_id'] for pf in portfolio_funds]))
        available_funds_result = await db.fetch('SELECT * FROM available_funds WHERE id = ANY($1::int[])', available_fund_ids)
        available_funds_lookup = {af['id']: dict(af) for af in available_funds_result} if available_funds_result else {}
        valuations_result = await db.fetch('SELECT * FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])', fund_ids)
        irr_result = await db.fetch('SELECT * FROM latest_portfolio_fund_irr_values WHERE fund_id = ANY($1::int[])', fund_ids)
        if not irr_result:
            irr_values = []
        else:
            irr_values = [dict(row) for row in irr_result]
        valuations_lookup = {val['portfolio_fund_id']: dict(val) for val in valuations_result or []}
        irr_lookup = {irr['fund_id']: irr for irr in irr_values}
        for fund in portfolio_funds:
            fund_id = fund['id']
            available_funds_id = fund.get('available_funds_id')
            if available_funds_id and available_funds_id in available_funds_lookup:
                fund_details = available_funds_lookup[available_funds_id]
                fund['fund_details'] = fund_details
                fund['fund_name'] = fund_details.get('fund_name')
                fund['isin_number'] = fund_details.get('isin_number')
                fund['risk_factor'] = fund_details.get('risk_factor')
            if fund_id in valuations_lookup:
                valuation = valuations_lookup[fund_id]
                fund['latest_valuation'] = valuation
                fund['market_value'] = valuation.get('valuation')
                fund['valuation_date'] = valuation.get('valuation_date')
            if fund_id in irr_lookup:
                irr_data = irr_lookup[fund_id]
                fund['irr_result'] = irr_data.get('irr_result')
                fund['irr_date'] = irr_data.get('date')
            else:
                fund['irr_result'] = None
                fund['irr_date'] = None
        response = {'portfolio': portfolio, 'template_info': template_generation, 'portfolio_funds': portfolio_funds, 'valuations_map': valuations_lookup, 'irr_map': irr_lookup}

        def convert_records_to_dicts(obj):
            if hasattr(obj, '__class__') and 'asyncpg' in str(obj.__class__):
                return dict(obj)
            elif isinstance(obj, dict):
                return {k: convert_records_to_dicts(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_records_to_dicts(item) for item in obj]
            else:
                return obj
        safe_response = convert_records_to_dicts(response)
        return safe_response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching complete portfolio data: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/portfolios/{portfolio_id}/latest-irr', response_model=dict)
async def get_latest_portfolio_irr(portfolio_id: int, db=Depends(get_db)):
    """
    Optimized endpoint to fetch stored portfolio IRR from latest_portfolio_irr_values view.
    This eliminates the need to recalculate IRR when the stored value is sufficient.
    """
    try:
        logger.info(f'🔍 [IRR FETCH DEBUG] ==================== FETCHING LATEST IRR ====================')
        logger.info(f'🔍 [IRR FETCH DEBUG] Portfolio ID: {portfolio_id}')
        result = await db.fetchrow('SELECT portfolio_id, irr_result, date FROM latest_portfolio_irr_values WHERE portfolio_id = $1', portfolio_id)
        logger.info(f'🔍 [IRR FETCH DEBUG] View query result: {result}')
        raw_result = await db.fetchrow('SELECT portfolio_id, irr_result, date FROM portfolio_irr_values WHERE portfolio_id = $1 ORDER BY date DESC LIMIT 1', portfolio_id)
        logger.info(f'🔍 [IRR FETCH DEBUG] Raw table query result: {raw_result}')
        if result:
            irr_value = None
            if result['irr_result'] is not None:
                try:
                    irr_value = float(result['irr_result'])
                except (ValueError, TypeError):
                    irr_value = None
            response_data = {'portfolio_id': portfolio_id, 'irr_result': irr_value, 'irr_date': result['date'], 'source': 'stored'}
            return response_data
        else:
            response_data = {'portfolio_id': portfolio_id, 'irr_result': None, 'irr_date': None, 'source': 'not_found'}
            return response_data
    except Exception as e:
        logger.error(f'❌ [IRR DEBUG] Error fetching stored IRR for portfolio {portfolio_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/portfolios/{portfolio_id}/irr-history', response_model=dict)
async def get_portfolio_irr_history(portfolio_id: int, months: int=Query(12, ge=1, le=60, description='Number of months of history to return'), db=Depends(get_db)):
    """
    Get historical IRR values for portfolio comparison reporting.
    Used when historical IRR analysis is specifically requested.
    """
    try:
        result = await db.fetch('SELECT irr_result, date FROM portfolio_irr_values WHERE portfolio_id = $1 ORDER BY date DESC LIMIT $2', portfolio_id, months)
        return {'portfolio_id': portfolio_id, 'history': [dict(row) for row in result] if result else [], 'count': len(result) if result else 0}
    except Exception as e:
        logger.error(f'Error fetching IRR history for portfolio {portfolio_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/portfolios/{portfolio_id}/activity-logs', response_model=dict)
async def get_portfolio_activity_logs(portfolio_id: int, year: Optional[int]=None, month: Optional[int]=None, activity_type: Optional[str]=None, summary: bool=False, db=Depends(get_db)):
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
        portfolio_result = await db.fetchrow('SELECT id FROM portfolios WHERE id = $1', portfolio_id)
        if not portfolio_result:
            raise HTTPException(status_code=404, detail=f'Portfolio with ID {portfolio_id} not found')
        portfolio_funds_result = await db.fetch('SELECT id FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
        if not portfolio_funds_result:
            return {'activity_logs': [], 'summary': {}}
        portfolio_fund_ids = [fund['id'] for fund in portfolio_funds_result]
        where_clauses = ['portfolio_fund_id = ANY($1::int[])']
        params = [portfolio_fund_ids]
        param_count = 2
        if year:
            start_date = datetime(year, 1, 1)
            end_date = datetime(year + 1, 1, 1)
            where_clauses.append(f'activity_timestamp >= ${param_count}')
            where_clauses.append(f'activity_timestamp < ${param_count + 1}')
            params.extend([start_date, end_date])
            param_count += 2
        if month and year:
            if year and (not month):
                where_clauses = where_clauses[:-2]
                params = params[:-2]
                param_count -= 2
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)
            where_clauses.append(f'activity_timestamp >= ${param_count}')
            where_clauses.append(f'activity_timestamp < ${param_count + 1}')
            params.extend([start_date, end_date])
            param_count += 2
        if activity_type:
            where_clauses.append(f'activity_type = ${param_count}')
            params.append(activity_type)
            param_count += 1
        query = f"SELECT *, DATE(activity_timestamp AT TIME ZONE 'Europe/London') as local_date FROM holding_activity_log WHERE {' AND '.join(where_clauses)} ORDER BY activity_timestamp DESC"
        activity_result = await db.fetch(query, *params)
        activity_logs = [dict(row) for row in activity_result] if activity_result else []
        for log in activity_logs:
            portfolio_fund_id = log.get('portfolio_fund_id')
            local_date = log.get('local_date')
            if portfolio_fund_id and local_date:
                await log_out_of_range_activity_warning(portfolio_fund_id, local_date, db)
        response = {'activity_logs': activity_logs, 'summary': {}}
        if summary and activity_logs:
            activity_type_counts = {}
            for log in activity_logs:
                activity_type = log.get('activity_type', 'Unknown')
                activity_type_counts[activity_type] = activity_type_counts.get(activity_type, 0) + 1
            activity_type_totals = {}
            for log in activity_logs:
                activity_type = log.get('activity_type', 'Unknown')
                amount = log.get('amount', 0)
                activity_type_totals[activity_type] = activity_type_totals.get(activity_type, 0) + amount
            fund_activity_summary = {}
            for log in activity_logs:
                fund_id = log.get('portfolio_fund_id')
                activity_type = log.get('activity_type', 'Unknown')
                amount = log.get('amount', 0)
                if fund_id not in fund_activity_summary:
                    fund_activity_summary[fund_id] = {}
                if activity_type not in fund_activity_summary[fund_id]:
                    fund_activity_summary[fund_id][activity_type] = 0
                fund_activity_summary[fund_id][activity_type] += amount
            response['summary'] = {'activity_type_counts': activity_type_counts, 'activity_type_totals': activity_type_totals, 'fund_activity_summary': fund_activity_summary}
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching portfolio activity logs: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')