from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import List, Optional
import logging
from datetime import date
from app.models.fund import FundBase, FundCreate, FundUpdate, FundInDB, FundWithProvider
from app.db.database import get_db
from app.utils.product_owner_utils import get_product_owner_display_name
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
router = APIRouter()

@router.get('/funds', response_model=List[FundInDB])
async def get_funds(db=Depends(get_db), skip: int=Query(0, ge=0, description='Number of records to skip for pagination'), limit: int=Query(100000, ge=1, le=100000, description='Max number of records to return'), search: Optional[str]=None):
    """Get all funds with optional search"""
    try:
        base_query = 'SELECT * FROM available_funds'
        conditions = []
        params = []
        if search:
            conditions.append('(fund_name ILIKE $1 OR isin_number ILIKE $1)')
            params.append(f'%{search}%')
        if conditions:
            query = base_query + ' WHERE ' + ' AND '.join(conditions)
        else:
            query = base_query
        query += f' ORDER BY id LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}'
        params.extend([limit, skip])
        result = await db.fetch(query, *params)
        if not result:
            return []
        funds = []
        for idx, fund_row in enumerate(result):
            try:
                fund = dict(fund_row)
                if 'id' not in fund or 'created_at' not in fund:
                    logger.error(f'Fund {idx} missing required fields')
                    continue
                fund_model = FundInDB(id=int(fund['id']), created_at=fund['created_at'], fund_name=fund.get('fund_name'), isin_number=fund.get('isin_number'), risk_factor=fund.get('risk_factor'), fund_cost=fund.get('fund_cost'), status=fund.get('status', 'active'))
                funds.append(fund_model)
            except Exception as e:
                logger.error(f'Error processing fund {idx}: {str(e)}')
                continue
        return funds
    except Exception as e:
        logger.error(f'Failed to retrieve funds: {str(e)}')
        raise HTTPException(status_code=500, detail='Failed to retrieve funds')

@router.get('/funds/{fund_id}', response_model=FundWithProvider)
async def get_fund(fund_id: int, portfolio_id: Optional[int]=None, db=Depends(get_db)):
    """Get a specific fund"""
    try:
        fund_result = await db.fetchrow('SELECT * FROM available_funds WHERE id = $1', fund_id)
        if not fund_result:
            raise HTTPException(status_code=404, detail=f'Fund with ID {fund_id} not found')
        fund_data = dict(fund_result)
        return {**fund_data, 'portfolio_id': portfolio_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching fund {fund_id}: {str(e)}')
        raise HTTPException(status_code=500, detail='Failed to fetch fund')

@router.post('/funds', response_model=FundInDB)
async def create_fund(fund: FundCreate, db=Depends(get_db)):
    """Create a new fund"""
    try:
        fund_data = fund.model_dump()
        columns = list(fund_data.keys())
        placeholders = [f'${i + 1}' for i in range(len(columns))]
        values = list(fund_data.values())
        query = f"\n            INSERT INTO available_funds ({', '.join(columns)}) \n            VALUES ({', '.join(placeholders)}) \n            RETURNING *\n        "
        result = await db.fetchrow(query, *values)
        if result:
            return dict(result)
        raise HTTPException(status_code=400, detail='Failed to create fund')
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch('/funds/{fund_id}', response_model=FundInDB)
async def update_fund(fund_id: int, fund_update: FundUpdate, db=Depends(get_db)):
    """
    What it does: Updates an existing fund's information.
    Why it's needed: Allows modifying fund details when they change.
    How it works:
        1. Takes the fund_id from the URL path and update data from request body
        2. Verifies the fund exists
        3. Updates the fund with the new data
        4. Returns the updated fund information
    Expected output: A JSON object containing the updated fund's details
    """
    try:
        update_data = fund_update.model_dump(exclude_unset=True)
        if not update_data:
            result = await db.fetchrow('SELECT * FROM available_funds WHERE id = $1', fund_id)
            if not result:
                raise HTTPException(status_code=404, detail=f'Fund with ID {fund_id} not found')
            return dict(result)
        set_clauses = []
        params = []
        for i, (column, value) in enumerate(update_data.items(), 1):
            set_clauses.append(f'{column} = ${i}')
            params.append(value)
        query = f"\n            UPDATE available_funds \n            SET {', '.join(set_clauses)} \n            WHERE id = ${len(params) + 1} \n            RETURNING *\n        "
        params.append(fund_id)
        result = await db.fetchrow(query, *params)
        if not result:
            raise HTTPException(status_code=404, detail=f'Fund with ID {fund_id} not found')
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete('/funds/{fund_id}')
async def delete_fund(fund_id: int, db=Depends(get_db)):
    """Delete a fund"""
    try:
        fund_check = await db.fetchrow('SELECT id FROM available_funds WHERE id = $1', fund_id)
        if not fund_check:
            raise HTTPException(status_code=404, detail=f'Fund with ID {fund_id} not found')
        try:
            portfolio_funds = await db.fetch('SELECT id FROM portfolio_funds WHERE available_funds_id = $1 LIMIT 1', fund_id)
            if portfolio_funds:
                raise HTTPException(status_code=400, detail='Cannot delete fund: it is currently used in one or more portfolios')
        except Exception as e:
            logger.warning(f'Could not check portfolio_funds table: {str(e)}')
        await db.execute('DELETE FROM available_funds WHERE id = $1', fund_id)
        return {'message': f'Fund with ID {fund_id} deleted successfully'}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting fund {fund_id}: {str(e)}')
        raise HTTPException(status_code=500, detail='Failed to delete fund')

@router.get('/funds/{fund_id}/products-with-owners', response_model=List[dict])
async def get_fund_products_with_owners(fund_id: int=Path(..., description='The ID of the fund'), db=Depends(get_db)):
    """
    What it does: Gets all products and their owners that use a specific fund
    Why it's needed: Shows which products are using a particular fund and who owns them
    How it works:
        1. Gets all portfolio_funds that use this fund
        2. Gets the portfolios for these portfolio_funds
        3. Gets the products using these portfolios
        4. Gets the owners for each product
        5. Returns a combined list with all information
    Expected output: A list of products with their owners that use this fund
    """
    try:
        fund_result = await db.fetchrow('SELECT * FROM available_funds WHERE id = $1', fund_id)
        if not fund_result:
            raise HTTPException(status_code=404, detail=f'Fund with ID {fund_id} not found')
        portfolio_funds = await db.fetch("\n            WITH portfolio_totals AS (\n                SELECT\n                    pf.portfolio_id,\n                    SUM(lpfv.valuation) as total_valuation\n                FROM portfolio_funds pf\n                LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id\n                WHERE pf.status = 'active'\n                GROUP BY pf.portfolio_id\n            )\n            SELECT\n                pf.portfolio_id,\n                CASE\n                    WHEN pt.total_valuation > 0 AND lpfv.valuation IS NOT NULL\n                    THEN ROUND((lpfv.valuation / pt.total_valuation * 100)::numeric, 2)\n                    ELSE 0\n                END as actual_weighting\n            FROM portfolio_funds pf\n            LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id\n            LEFT JOIN portfolio_totals pt ON pf.portfolio_id = pt.portfolio_id\n            WHERE pf.available_funds_id = $1 AND pf.status = 'active'\n            ", fund_id)
        if not portfolio_funds:
            return []
        portfolio_ids = [pf['portfolio_id'] for pf in portfolio_funds]
        products_result = await db.fetch('\n            SELECT cp.*, ap.name as provider_name, cg.name as client_group_name\n            FROM client_products cp\n            LEFT JOIN available_providers ap ON cp.provider_id = ap.id\n            LEFT JOIN client_groups cg ON cp.client_id = cg.id\n            WHERE cp.portfolio_id = ANY($1)\n            ', portfolio_ids)
        if not products_result:
            return []
        product_ids = [p['id'] for p in products_result]
        owner_assocs = await db.fetch('SELECT * FROM product_owner_products WHERE product_id = ANY($1)', product_ids)
        product_owner_map = {}
        if owner_assocs:
            for assoc in owner_assocs:
                product_id = assoc['product_id']
                if product_id not in product_owner_map:
                    product_owner_map[product_id] = []
                product_owner_map[product_id].append(assoc['product_owner_id'])
        owner_ids = []
        for owners in product_owner_map.values():
            owner_ids.extend(owners)
        owner_ids = list(set(owner_ids))
        owners_result = await db.fetch('SELECT id, firstname, surname, known_as, status, created_at FROM product_owners WHERE id = ANY($1)', owner_ids)
        owner_map = {owner['id']: owner for owner in owners_result} if owners_result else {}
        portfolios_result = await db.fetch('SELECT * FROM portfolios WHERE id = ANY($1)', portfolio_ids)
        portfolio_map = {p['id']: p for p in portfolios_result} if portfolios_result else {}
        products_with_owners = []
        for product in products_result:
            product_id = product['id']
            portfolio_id = product['portfolio_id']
            portfolio = portfolio_map.get(portfolio_id, {})
            portfolio_fund = next((pf for pf in portfolio_funds if pf['portfolio_id'] == portfolio_id), {})
            owner_ids = product_owner_map.get(product_id, [])
            owners = [owner_map.get(owner_id) for owner_id in owner_ids if owner_id in owner_map]
            product_owner_name = 'Unknown'
            if owners:
                owner = owners[0]
                product_owner_name = get_product_owner_display_name(owner)
            product_entry = {'product_id': product_id, 'product_name': product['product_name'], 'product_type': product['product_type'], 'status': product['status'], 'portfolio_name': portfolio.get('portfolio_name', ''), 'actual_weighting': portfolio_fund.get('actual_weighting', 0), 'start_date': product['start_date'], 'product_owner_name': product_owner_name, 'provider_name': product.get('provider_name', 'Unknown'), 'client_group_name': product.get('client_group_name', 'Unknown')}
            products_with_owners.append(product_entry)
        return products_with_owners
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error getting products with owners for fund {fund_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/funds/check-isin/{isin_number}')
async def check_isin_duplicate(isin_number: str=Path(..., description='ISIN number to check for duplicates'), exclude_fund_id: Optional[int]=Query(None, description='Fund ID to exclude from duplicate check (for updates)'), db=Depends(get_db)):
    """
    Check if an ISIN number already exists in the database
    
    What it does: Searches for existing funds with the same ISIN number
    Why it's needed: Provides duplicate warning to users before saving
    How it works:
        1. Searches available_funds table for matching ISIN
        2. Optionally excludes a specific fund ID (for updates)
        3. Returns information about any duplicate found
    Expected output: JSON object with duplicate status and details
    """
    try:
        isin_upper = isin_number.upper().strip()
        query = 'SELECT id, fund_name, isin_number, status FROM available_funds WHERE isin_number = $1'
        params = [isin_upper]
        if exclude_fund_id:
            query += ' AND id != $2'
            params.append(exclude_fund_id)
        response = await db.fetch(query, *params)
        if not response:
            return {'is_duplicate': False, 'isin_number': isin_upper, 'message': 'ISIN is unique'}
        duplicate_fund = response[0]
        return {'is_duplicate': True, 'isin_number': isin_upper, 'duplicate_fund': {'id': duplicate_fund['id'], 'name': duplicate_fund['fund_name'], 'status': duplicate_fund['status']}, 'message': f"ISIN already exists for fund: {duplicate_fund['fund_name']}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error checking ISIN duplicate for {isin_number}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')