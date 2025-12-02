from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional
import logging
from datetime import date, datetime
from app.models.client_product import ClientProduct, ClientProductCreate, ClientProductUpdate, ProductRevenueCalculation
from app.db.database import get_db
from app.api.routes.portfolio_funds import calculate_excel_style_irr, calculate_multiple_portfolio_funds_irr
from app.utils.product_owner_utils import get_product_owner_display_name
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
router = APIRouter()

@router.get('/client-products-with-owners', response_model=List[dict])
async def get_client_products_with_owners(skip: int=Query(0, ge=0, description='Number of records to skip for pagination'), limit: int=Query(100000, ge=1, le=100000, description='Max number of records to return'), client_id: Optional[int]=None, provider_id: Optional[int]=None, status: Optional[str]=None, portfolio_type: Optional[str]=None, db=Depends(get_db)):
    """
    What it does: Retrieves a paginated list of client products with their owners using the optimized products_list_view.
    Why it's needed: Improves frontend performance by using a single optimized view with all portfolio information.
    How it works:
        1. Uses the products_list_view which includes portfolio type determination
        2. Adds IRR data from latest_portfolio_irr_values 
        3. Fetches product owners efficiently
        4. Returns complete product list with portfolio type information
    Expected output: A JSON array of client product objects with portfolio type and all related data
    """
    try:
        base_query = 'SELECT * FROM products_list_view'
        conditions = []
        params = []
        param_count = 0
        if client_id is not None:
            param_count += 1
            conditions.append(f'client_id = ${param_count}')
            params.append(client_id)
        if provider_id is not None:
            param_count += 1
            conditions.append(f'provider_id = ${param_count}')
            params.append(provider_id)
        if status is not None:
            param_count += 1
            conditions.append(f'status = ${param_count}')
            params.append(status)
        if portfolio_type is not None:
            param_count += 1
            conditions.append(f'portfolio_type_display = ${param_count}')
            params.append(portfolio_type)
        if conditions:
            base_query += ' WHERE ' + ' AND '.join(conditions)
        param_count += 1
        base_query += f' OFFSET ${param_count}'
        params.append(skip)
        param_count += 1
        base_query += f' LIMIT ${param_count}'
        params.append(limit)
        result = await db.fetch(base_query, *params)
        products = [dict(record) for record in result]
        if not products:
            return []
        product_ids = [p.get('id') for p in products]
        portfolio_ids = [p.get('portfolio_id') for p in products if p.get('portfolio_id') is not None]
        portfolio_irr_map = {}
        irr_dates_map = {}
        if portfolio_ids:
            try:
                portfolio_irr_result = await db.fetch('SELECT portfolio_id, irr_result FROM latest_portfolio_irr_values WHERE portfolio_id = ANY($1::int[])', portfolio_ids)
                portfolio_irr_map = {item.get('portfolio_id'): item.get('irr_result') for item in [dict(record) for record in portfolio_irr_result] if portfolio_irr_result}
                all_portfolio_funds_result = await db.fetch('SELECT id, portfolio_id FROM portfolio_funds WHERE portfolio_id = ANY($1::int[])', portfolio_ids)
                if all_portfolio_funds_result:
                    portfolio_to_funds = {}
                    all_fund_ids = []
                    for pf_record in all_portfolio_funds_result:
                        pf = dict(pf_record)
                        portfolio_id = pf.get('portfolio_id')
                        fund_id = pf.get('id')
                        if portfolio_id not in portfolio_to_funds:
                            portfolio_to_funds[portfolio_id] = []
                        portfolio_to_funds[portfolio_id].append(fund_id)
                        all_fund_ids.append(fund_id)
                    if all_fund_ids:
                        irr_dates_result = await db.fetch('SELECT fund_id, date FROM latest_portfolio_fund_irr_values WHERE fund_id = ANY($1::int[])', all_fund_ids)
                        if irr_dates_result:
                            fund_to_irr_date = {dict(item).get('fund_id'): dict(item).get('date') for item in irr_dates_result if dict(item).get('date')}
                            for portfolio_id, fund_ids in portfolio_to_funds.items():
                                portfolio_irr_dates = [fund_to_irr_date.get(fund_id) for fund_id in fund_ids if fund_to_irr_date.get(fund_id)]
                                if portfolio_irr_dates:
                                    portfolio_irr_dates.sort(reverse=True)
                                    irr_dates_map[portfolio_id] = portfolio_irr_dates[0]
            except Exception as e:
                logger.warning(f'Error fetching IRR data: {str(e)}')
        product_owner_associations = {}
        product_owners_map = {}
        try:
            pop_result = await db.fetch('SELECT * FROM product_owner_products WHERE product_id = ANY($1::int[])', product_ids)
            if pop_result:
                for assoc_record in pop_result:
                    assoc = dict(assoc_record)
                    product_id = assoc.get('product_id')
                    if product_id not in product_owner_associations:
                        product_owner_associations[product_id] = []
                    product_owner_associations[product_id].append(assoc.get('product_owner_id'))
            product_owner_ids = []
            for owners in product_owner_associations.values():
                product_owner_ids.extend(owners)
            if product_owner_ids:
                owners_result = await db.fetch('SELECT id, firstname, surname, known_as, status, created_at FROM product_owners WHERE id = ANY($1::int[])', list(set(product_owner_ids)))
                if owners_result:
                    product_owners_map = {dict(owner).get('id'): dict(owner) for owner in owners_result}
        except Exception as e:
            logger.error(f'Error fetching product owners: {str(e)}')
        enhanced_products = []
        for product in products:
            product_id = product.get('id')
            portfolio_id = product.get('portfolio_id')
            enhanced_product = {'id': product_id, 'client_id': product.get('client_id'), 'client_name': product.get('client_name'), 'product_name': product.get('product_name'), 'status': product.get('status'), 'start_date': product.get('start_date'), 'end_date': product.get('end_date'), 'provider_id': product.get('provider_id'), 'provider_name': product.get('provider_name'), 'provider_theme_color': product.get('provider_color'), 'theme_color': product.get('provider_color'), 'product_type': product.get('product_type'), 'plan_number': product.get('plan_number'), 'portfolio_id': portfolio_id, 'portfolio_name': product.get('portfolio_name'), 'total_value': product.get('total_value', 0), 'template_generation_id': product.get('effective_template_generation_id'), 'portfolio_type_display': product.get('portfolio_type_display'), 'template_info': {'id': product.get('effective_template_generation_id'), 'generation_name': product.get('generation_name'), 'name': product.get('template_name'), 'description': product.get('template_description')} if product.get('effective_template_generation_id') else None, 'generation_name': product.get('generation_name'), 'weighted_risk': product.get('template_weighted_risk')}
            if portfolio_id and portfolio_id in portfolio_irr_map:
                enhanced_product['irr'] = portfolio_irr_map[portfolio_id]
            else:
                enhanced_product['irr'] = '-'
            if portfolio_id and portfolio_id in irr_dates_map:
                enhanced_product['irr_date'] = irr_dates_map[portfolio_id]
            else:
                enhanced_product['irr_date'] = None
            product_owners = []
            product_owner_names = []
            if product_id in product_owner_associations:
                owner_ids = product_owner_associations[product_id]
                for owner_id in owner_ids:
                    if owner_id in product_owners_map:
                        owner = product_owners_map[owner_id]
                        display_name = f"{owner.get('firstname', '')} {owner.get('surname', '')}".strip()
                        if not display_name and owner.get('known_as'):
                            display_name = owner['known_as']
                        enhanced_owner = {**owner, 'name': display_name}
                        product_owners.append(enhanced_owner)
                        owner_name = get_product_owner_display_name(owner)
                        product_owner_names.append(owner_name)
            if len(product_owner_names) > 1:
                product_owner_name = ', '.join(product_owner_names)
            elif len(product_owner_names) == 1:
                product_owner_name = product_owner_names[0]
            else:
                product_owner_name = 'Unknown'
            enhanced_product['product_owners'] = product_owners
            enhanced_product['product_owner_name'] = product_owner_name or 'Unknown'
            enhanced_products.append(enhanced_product)
        logger.info(f'Retrieved {len(enhanced_products)} client products using optimized products_list_view')
        return enhanced_products
    except Exception as e:
        logger.error(f'Error fetching client products with optimized view: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/products-display', response_model=List[dict])
async def get_products_display(skip: int=Query(0, ge=0, description='Number of records to skip for pagination'), limit: int=Query(100000, ge=1, le=100000, description='Max number of records to return'), client_id: Optional[int]=None, provider_id: Optional[int]=None, status: Optional[str]=None, portfolio_type: Optional[str]=None, db=Depends(get_db)):
    """
    OPTIMIZED ENDPOINT FOR PRODUCTS PAGE
    What it does: Fast retrieval of product data for the Products page using the optimized products_display_view.
    Why it's needed: Reduces loading time from 4-8 seconds to under 1 second by eliminating expensive calculations.
    How it works:
        1. Uses products_display_view which has pre-calculated values and optimized JOINs
        2. Only fetches essential data: product name, provider, client, value, IRR
        3. Efficiently handles product owners with bulk queries
        4. Returns minimal data structure for fast frontend rendering
    Expected output: A JSON array of product objects with only essential display data
    """
    try:
        basic_result = await db.fetchrow('SELECT id, product_name, status, client_id FROM client_products LIMIT 1')
        if basic_result:
            logger.info(f'DEBUG - Basic client_products result: {dict(basic_result)}')
        else:
            logger.warning('DEBUG - No results from client_products table!')
        base_query = "\n        SELECT\n            cp.id as product_id,\n            cp.product_name,\n            cp.product_type,\n            cp.plan_number,\n            cp.status,\n            cp.client_id,\n            cg.name as client_name,\n            cp.provider_id,\n            ap.name as provider_name,\n            ap.theme_color as provider_theme_color,\n            ap.theme_color as theme_color,\n            cp.portfolio_id,\n\n            -- Portfolio value calculation (same logic as view but more explicit)\n            COALESCE(pv_agg.total_portfolio_value, 0) as total_value,\n\n            -- IRR information from latest portfolio IRR values\n            lpiv.irr_result as irr,\n            lpiv.date as irr_date,\n\n            -- Portfolio type display\n            CASE\n                WHEN cp.portfolio_id IS NOT NULL THEN 'Portfolio'\n                ELSE 'No Portfolio'\n            END as portfolio_type_display\n\n        FROM client_products cp\n        LEFT JOIN client_groups cg ON cg.id = cp.client_id\n        LEFT JOIN available_providers ap ON ap.id = cp.provider_id\n        \n        -- Portfolio value aggregation (same as in the view)\n        LEFT JOIN (\n            SELECT \n                pf.portfolio_id,\n                SUM(COALESCE(lfv.valuation, 0)) as total_portfolio_value\n            FROM portfolio_funds pf\n            LEFT JOIN latest_portfolio_fund_valuations lfv ON lfv.portfolio_fund_id = pf.id\n            WHERE pf.status = 'active'\n            GROUP BY pf.portfolio_id\n        ) pv_agg ON pv_agg.portfolio_id = cp.portfolio_id\n        \n        -- IRR data from latest portfolio IRR values\n        LEFT JOIN latest_portfolio_irr_values lpiv ON lpiv.portfolio_id = cp.portfolio_id\n        "
        conditions = []
        params = []
        param_count = 0
        if client_id is not None:
            param_count += 1
            conditions.append(f'client_id = ${param_count}')
            params.append(client_id)
        if provider_id is not None:
            param_count += 1
            conditions.append(f'provider_id = ${param_count}')
            params.append(provider_id)
        if status is not None:
            param_count += 1
            conditions.append(f'status = ${param_count}')
            params.append(status)
        if portfolio_type is not None:
            param_count += 1
            conditions.append(f'portfolio_type_display = ${param_count}')
            params.append(portfolio_type)
        if conditions:
            base_query += ' WHERE ' + ' AND '.join(conditions)
        param_count += 1
        base_query += f' OFFSET ${param_count}'
        params.append(skip)
        param_count += 1
        base_query += f' LIMIT ${param_count}'
        params.append(limit)
        result = await db.fetch(base_query, *params)
        products = [dict(record) for record in result]
        if not products:
            return []
        product_ids = [p.get('product_id') for p in products if p.get('product_id') is not None]
        product_owner_associations = {}
        product_owners_map = {}
        try:
            pop_result = await db.fetch('SELECT * FROM product_owner_products WHERE product_id = ANY($1::int[])', product_ids)
            if pop_result:
                for assoc_record in pop_result:
                    assoc = dict(assoc_record)
                    product_id = assoc.get('product_id')
                    if product_id not in product_owner_associations:
                        product_owner_associations[product_id] = []
                    product_owner_associations[product_id].append(assoc.get('product_owner_id'))
            product_owner_ids = []
            for owners in product_owner_associations.values():
                product_owner_ids.extend(owners)
            if product_owner_ids:
                owners_result = await db.fetch('SELECT id, firstname, surname, known_as, status FROM product_owners WHERE id = ANY($1::int[])', list(set(product_owner_ids)))
                if owners_result:
                    product_owners_map = {owner.get('id'): dict(owner) for owner in owners_result}
        except Exception as e:
            logger.error(f'Error fetching product owners: {str(e)}')
        enhanced_products = []
        for product in products:
            product_id = product.get('product_id')
            raw_irr = product.get('irr')
            raw_total_value = product.get('total_value')
            irr_value = None
            if raw_irr is not None:
                try:
                    irr_value = float(raw_irr)
                except (ValueError, TypeError):
                    irr_value = None
            total_value = 0.0
            if raw_total_value is not None:
                try:
                    total_value = float(raw_total_value)
                except (ValueError, TypeError):
                    total_value = 0.0
            enhanced_product = {'product_id': product_id, 'product_name': product.get('product_name'), 'product_type': product.get('product_type'), 'plan_number': product.get('plan_number'), 'status': product.get('status'), 'client_id': product.get('client_id'), 'client_name': product.get('client_name'), 'provider_id': product.get('provider_id'), 'provider_name': product.get('provider_name'), 'provider_theme_color': product.get('provider_theme_color'), 'theme_color': product.get('provider_theme_color'), 'portfolio_id': product.get('portfolio_id'), 'total_value': total_value, 'irr': irr_value, 'irr_date': product.get('irr_date'), 'portfolio_type_display': product.get('portfolio_type_display')}
            product_owners = []
            product_owner_name = None
            if product_id in product_owner_associations:
                owner_ids = product_owner_associations[product_id]
                owner_names = []
                for owner_id in owner_ids:
                    if owner_id in product_owners_map:
                        owner = product_owners_map[owner_id]
                        display_name = f"{owner.get('firstname', '')} {owner.get('surname', '')}".strip()
                        if not display_name and owner.get('known_as'):
                            display_name = owner['known_as']
                        enhanced_owner = {**owner, 'name': display_name}
                        product_owners.append(enhanced_owner)
                        owner_names.append(display_name)
                if owner_names:
                    product_owner_name = ', '.join(owner_names)
            enhanced_product['product_owners'] = product_owners
            enhanced_product['product_owner_name'] = product_owner_name
            enhanced_products.append(enhanced_product)
        return enhanced_products
    except Exception as e:
        logger.error(f'Error in get_products_display: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.get('/portfolio-types', response_model=List[str])
async def get_portfolio_types(db=Depends(get_db)):
    """
    What it does: Retrieves distinct portfolio types for filtering.
    Why it's needed: Provides filter options for the portfolio type dropdown.
    How it works:
        1. Queries the products_list_view to get distinct portfolio_type_display values
        2. Returns them as a list for frontend filtering
    Expected output: A JSON array of distinct portfolio type strings
    """
    try:
        try:
            result = await db.fetch('SELECT DISTINCT portfolio_type_display FROM products_list_view WHERE portfolio_type_display IS NOT NULL')
            if result:
                portfolio_types = list(set((record.get('portfolio_type_display') for record in result if record.get('portfolio_type_display'))))
            else:
                portfolio_types = []
        except Exception as e:
            logger.warning(f'Could not query products_list_view for portfolio types: {e}')
            result = await db.fetch("\n                SELECT DISTINCT \n                    CASE \n                        WHEN template_generation_id IS NOT NULL THEN 'Template'\n                        ELSE 'Bespoke'\n                    END as portfolio_type\n                FROM portfolios \n                WHERE id IN (SELECT DISTINCT portfolio_id FROM client_products WHERE portfolio_id IS NOT NULL)\n            ")
            portfolio_types = list(set((record.get('portfolio_type') for record in result if record.get('portfolio_type'))))
        portfolio_types.sort()
        if 'Bespoke' in portfolio_types:
            portfolio_types.remove('Bespoke')
            portfolio_types.insert(0, 'Bespoke')
        logger.info(f'Retrieved {len(portfolio_types)} distinct portfolio types')
        return portfolio_types
    except Exception as e:
        logger.error(f'Error fetching portfolio types: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/client-products', response_model=List[ClientProduct])
async def get_client_products(skip: int=Query(0, ge=0, description='Number of records to skip for pagination'), limit: int=Query(100000, ge=1, le=100000, description='Max number of records to return'), client_id: Optional[int]=None, provider_id: Optional[int]=None, status: Optional[str]=None, db=Depends(get_db)):
    """
    What it does: Retrieves a paginated list of client products with optional filtering.
    Why it's needed: Provides a way to view client products in the system.
    How it works:
        1. Connects to the PostgreSQL database
        2. Builds a query to the 'client_products' table with optional filters
        3. Separately fetches provider data, client data, and template data
        4. Combines the data in Python 
        5. Returns the data as a list of ClientProduct objects
    Expected output: A JSON array of client product objects with all their details including provider theme colors and template info
    """
    try:
        base_query = '\n        SELECT\n            -- Client product fields\n            cp.id, cp.client_id, cp.provider_id, cp.portfolio_id, cp.product_name,\n            cp.status, cp.start_date, cp.end_date, cp.plan_number, cp.product_type,\n            cp.notes, cp.fixed_fee_direct, cp.fixed_fee_facilitated, cp.percentage_fee_facilitated, cp.created_at,\n            \n            -- Joined data\n            cg.name as client_name,\n            ap.name as provider_name,\n            ap.theme_color as provider_theme_color,\n            \n            -- Portfolio IRR data\n            lpiv.irr_result as irr,\n            lpiv.date as irr_date,\n            \n            -- Portfolio valuation data  \n            COALESCE(lpv.valuation, 0) as total_value,\n            \n            -- Template info\n            tpg.generation_name as template_info_name\n            \n        FROM client_products cp\n        LEFT JOIN client_groups cg ON cg.id = cp.client_id\n        LEFT JOIN available_providers ap ON ap.id = cp.provider_id\n        LEFT JOIN portfolios p ON p.id = cp.portfolio_id\n        LEFT JOIN latest_portfolio_irr_values lpiv ON lpiv.portfolio_id = cp.portfolio_id\n        LEFT JOIN latest_portfolio_valuations lpv ON lpv.portfolio_id = cp.portfolio_id\n        LEFT JOIN template_portfolio_generations tpg ON tpg.id = p.template_generation_id\n        '
        params = []
        where_conditions = []
        param_count = 1
        if client_id is not None:
            where_conditions.append(f'cp.client_id = ${param_count}')
            params.append(client_id)
            param_count += 1
        if provider_id is not None:
            where_conditions.append(f'cp.provider_id = ${param_count}')
            params.append(provider_id)
            param_count += 1
        if status is not None:
            where_conditions.append(f'cp.status = ${param_count}')
            params.append(status)
            param_count += 1
        if where_conditions:
            base_query += ' WHERE ' + ' AND '.join(where_conditions)
        base_query += f' ORDER BY cp.created_at DESC OFFSET ${param_count} LIMIT ${param_count + 1}'
        params.extend([skip, limit])
        result = await db.fetch(base_query, *params)
        client_products = [dict(record) for record in result]
        logger.info(f'Retrieved {len(client_products)} client products with IRR data via direct JOIN query')
        for product in client_products:
            if product.get('irr') is not None:
                try:
                    product['irr'] = float(product['irr'])
                except (ValueError, TypeError):
                    product['irr'] = None
            if product.get('total_value') is not None:
                try:
                    product['total_value'] = float(product['total_value'])
                except (ValueError, TypeError):
                    product['total_value'] = 0.0
        return client_products
        providers_map = {}
        if provider_ids:
            providers_result = await db.fetch('SELECT * FROM available_providers WHERE id = ANY($1::int[])', provider_ids)
            providers_map = {p.get('id'): dict(p) for p in providers_result}
        clients_map = {}
        if client_ids:
            clients_result = await db.fetch('SELECT * FROM client_groups WHERE id = ANY($1::int[])', client_ids)
            clients_map = {c.get('id'): dict(c) for c in clients_result}
        portfolios_map = {}
        template_generation_ids = set()
        if portfolio_ids:
            portfolios_result = await db.fetch('SELECT * FROM portfolios WHERE id = ANY($1::int[])', portfolio_ids)
            if portfolios_result:
                portfolios_map = {p.get('id'): dict(p) for p in portfolios_result}
                template_generation_ids = {p.get('template_generation_id') for p in portfolios_result if p.get('template_generation_id') is not None}
        template_generations_map = {}
        if template_generation_ids:
            template_generations_result = await db.fetch('SELECT * FROM template_portfolio_generations WHERE id = ANY($1::int[])', list(template_generation_ids))
            if template_generations_result:
                template_generations_map = {t.get('id'): dict(t) for t in template_generations_result}
        irr_dates_map = {}
        try:
            if portfolio_ids:
                all_portfolio_funds_result = await db.fetch('SELECT id, portfolio_id FROM portfolio_funds WHERE portfolio_id = ANY($1::int[])', portfolio_ids)
                if all_portfolio_funds_result:
                    portfolio_to_funds = {}
                    all_fund_ids = []
                    for pf_record in all_portfolio_funds_result:
                        pf = dict(pf_record)
                        portfolio_id = pf.get('portfolio_id')
                        fund_id = pf.get('id')
                        if portfolio_id not in portfolio_to_funds:
                            portfolio_to_funds[portfolio_id] = []
                        portfolio_to_funds[portfolio_id].append(fund_id)
                        all_fund_ids.append(fund_id)
                        irr_dates_result = await db.fetch('SELECT fund_id, date FROM latest_portfolio_fund_irr_values WHERE fund_id = ANY($1::int[])', all_fund_ids)
                        if irr_dates_result:
                            fund_to_irr_date = {dict(item).get('fund_id'): dict(item).get('date') for item in irr_dates_result if dict(item).get('date')}
                        for portfolio_id, fund_ids in portfolio_to_funds.items():
                            portfolio_irr_dates = [fund_to_irr_date.get(fund_id) for fund_id in fund_ids if fund_to_irr_date.get(fund_id)]
                            if portfolio_irr_dates:
                                portfolio_irr_dates.sort(reverse=True)
                                irr_dates_map[portfolio_id] = portfolio_irr_dates[0]
        except Exception as e:
            logger.warning(f'Error fetching IRR dates in bulk: {str(e)}')
        portfolio_fum_map = {}
        portfolio_irr_map = {}
        try:
            if portfolio_ids:
                logger.info(f'🔍 Processing IRR data for portfolio IDs: {portfolio_ids}')
                portfolio_irr_result = await db.fetch('SELECT portfolio_id, irr_result FROM latest_portfolio_irr_values WHERE portfolio_id = ANY($1::int[])', portfolio_ids)
                portfolio_irr_map = {dict(item).get('portfolio_id'): dict(item).get('irr_result') for item in portfolio_irr_result}
                logger.info(f'✅ IRR SUCCESS: Retrieved IRR data for {len(portfolio_irr_map)} portfolios: {portfolio_irr_map}')
            else:
                logger.warning('❌ No portfolio_ids found - skipping IRR data fetch')
        except Exception as irr_error:
            logger.error(f'❌ IRR ERROR: Failed to fetch IRR data: {str(irr_error)}')
            portfolio_irr_map = {}
        try:
            if portfolio_ids:
                all_portfolio_funds_result = await db.fetch('SELECT id, portfolio_id FROM portfolio_funds WHERE portfolio_id = ANY($1::int[])', portfolio_ids)
                if all_portfolio_funds_result:
                    portfolio_to_funds = {}
                    all_fund_ids = []
                    for pf_record in all_portfolio_funds_result:
                        pf = dict(pf_record)
                        portfolio_id = pf.get('portfolio_id')
                        fund_id = pf.get('id')
                        if portfolio_id not in portfolio_to_funds:
                            portfolio_to_funds[portfolio_id] = []
                        portfolio_to_funds[portfolio_id].append(fund_id)
                        all_fund_ids.append(fund_id)
                    if all_fund_ids:
                        valuations_result = await db.fetch('SELECT portfolio_fund_id, valuation FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])', all_fund_ids)
                        if valuations_result:
                            fund_to_value = {dict(item).get('portfolio_fund_id'): float(dict(item).get('valuation', 0)) for item in valuations_result}
                            for portfolio_id, fund_ids in portfolio_to_funds.items():
                                portfolio_fum = sum((fund_to_value.get(fund_id, 0) for fund_id in fund_ids))
                                portfolio_fum_map[portfolio_id] = portfolio_fum
        except Exception as e:
            logger.warning(f'Error calculating portfolio FUM and IRR: {str(e)}')
        product_owner_associations = {}
        try:
            pop_result = await db.fetch('SELECT * FROM product_owner_products WHERE product_id = ANY($1::int[])', product_ids)
            if pop_result:
                for assoc_record in pop_result:
                    assoc = dict(assoc_record)
                    product_id = assoc.get('product_id')
                    if product_id not in product_owner_associations:
                        product_owner_associations[product_id] = []
                    product_owner_associations[product_id].append(assoc.get('product_owner_id'))
        except Exception as e:
            logger.error(f'Error fetching product owner associations: {str(e)}')
        product_owner_ids = []
        for owners in product_owner_associations.values():
            product_owner_ids.extend(owners)
        product_owners_map = {}
        if product_owner_ids:
            try:
                owners_result = await db.fetch('SELECT id, firstname, surname, known_as, status, created_at FROM product_owners WHERE id = ANY($1::int[])', list(set(product_owner_ids)))
                if owners_result:
                    product_owners_map = {dict(owner).get('id'): dict(owner) for owner in owners_result}
            except Exception as e:
                logger.error(f'Error fetching product owners: {str(e)}')
        enhanced_data = []
        for product in client_products:
            product_id = product.get('id')
            provider_id = product.get('provider_id')
            if provider_id and provider_id in providers_map:
                provider = providers_map[provider_id]
                product['provider_name'] = provider.get('name')
                product['provider_theme_color'] = provider.get('theme_color')
            client_id = product.get('client_id')
            logger.info(f"Processing product {product.get('id')} with client_id: {client_id}")
            if client_id and client_id in clients_map:
                client = clients_map[client_id]
                client_name = client.get('name')
                logger.info(f"Found client {client_id} with name: '{client_name}'")
                if not client_name or client_name.strip() == '':
                    product['client_name'] = f'Client Group {client_id}'
                    logger.info(f'Using fallback name: Client Group {client_id}')
                else:
                    product['client_name'] = client_name
                    logger.info(f'Using client name: {client_name}')
            else:
                logger.warning(f'Client {client_id} not found in clients_map')
                product['client_name'] = f'Client Group {client_id}' if client_id else 'Unknown Client'
            portfolio_id = product.get('portfolio_id')
            if portfolio_id and portfolio_id in portfolios_map:
                portfolio = portfolios_map[portfolio_id]
                template_generation_id = portfolio.get('template_generation_id')
                if template_generation_id and template_generation_id in template_generations_map:
                    template = template_generations_map[template_generation_id]
                    product['template_generation_id'] = template_generation_id
                    product['template_info'] = template
            try:
                if portfolio_id and portfolio_id in portfolio_fum_map:
                    product['total_value'] = portfolio_fum_map[portfolio_id]
                else:
                    product['total_value'] = 0
                product['irr'] = 999.99
                product['test_portfolio_id'] = portfolio_id
                product['test_portfolio_irr_map_keys'] = str(list(portfolio_irr_map.keys()))
            except Exception as test_error:
                logger.error(f'❌ EXCEPTION in IRR test section: {str(test_error)}')
                product['irr'] = 'ERROR'
            if portfolio_id and portfolio_id in portfolio_irr_map:
                irr_value = portfolio_irr_map[portfolio_id]
                product['irr'] = float(irr_value) if irr_value is not None else None
            else:
                product['irr'] = None
            if portfolio_id and portfolio_id in irr_dates_map:
                product['irr_date'] = irr_dates_map[portfolio_id]
            else:
                product['irr_date'] = None
            product_owners = []
            product_owner_name = None
            if product_id in product_owner_associations:
                owner_ids = product_owner_associations[product_id]
                for owner_id in owner_ids:
                    if owner_id in product_owners_map:
                        owner = product_owners_map[owner_id]
                        display_name = f"{owner.get('firstname', '')} {owner.get('surname', '')}".strip()
                        if not display_name and owner.get('known_as'):
                            display_name = owner['known_as']
                        enhanced_owner = {**owner, 'name': display_name}
                        product_owners.append(enhanced_owner)
                        if product_owner_name is None:
                            product_owner_name = get_product_owner_display_name(owner)
            product['product_owners'] = product_owners
            product['product_owner_name'] = product_owner_name or 'Unknown'
            enhanced_data.append(product)
        logger.info(f'Retrieved {len(enhanced_data)} client products with all related data including owners')
        return enhanced_data
    except Exception as e:
        logger.error(f'Error fetching client products: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.post('/client-products', response_model=ClientProduct)
async def create_client_product(client_product: ClientProductCreate, db=Depends(get_db)):
    """
    What it does: Creates a new client product in the database.
    Why it's needed: Allows users to create new products for clients.
    How it works:
        1. Validates the input data
        2. Inserts the new product into the database
        3. Creates a portfolio for the product if none is specified
        4. Returns the created product
    Expected output: The newly created client product object
    """
    try:
        today = date.today()
        start_date = client_product.start_date if client_product.start_date else today
        logger.info(f'Creating client product with client_id={client_product.client_id}')
        logger.info(f'Skip portfolio creation flag: {client_product.skip_portfolio_creation}')
        logger.info(f'Portfolio ID provided: {client_product.portfolio_id}')
        logger.info(f'Full client product data: {client_product}')
        product_data = {'client_id': client_product.client_id, 'product_name': client_product.product_name, 'status': client_product.status, 'start_date': start_date, 'plan_number': client_product.plan_number, 'provider_id': client_product.provider_id, 'product_type': client_product.product_type, 'template_generation_id': client_product.template_generation_id, 'fixed_fee_direct': str(client_product.fixed_fee_direct) if client_product.fixed_fee_direct is not None else None, 'fixed_fee_facilitated': str(client_product.fixed_fee_facilitated) if client_product.fixed_fee_facilitated is not None else None, 'percentage_fee_facilitated': str(client_product.percentage_fee_facilitated) if client_product.percentage_fee_facilitated is not None else None}
        if client_product.portfolio_id:
            portfolio_check = await db.fetchrow('SELECT id FROM portfolios WHERE id = $1', client_product.portfolio_id)
            if not portfolio_check:
                raise HTTPException(status_code=404, detail=f'Portfolio with ID {client_product.portfolio_id} not found')
            product_data['portfolio_id'] = client_product.portfolio_id
            logger.info(f'Using provided portfolio_id {client_product.portfolio_id}')
        columns = list(product_data.keys())
        values = list(product_data.values())
        placeholders = [f'${i + 1}' for i in range(len(values))]
        insert_query = f"\n            INSERT INTO client_products ({', '.join(columns)}) \n            VALUES ({', '.join(placeholders)}) \n            RETURNING *\n        "
        created_product = await db.fetchrow(insert_query, *values)
        if not created_product:
            raise HTTPException(status_code=500, detail='Failed to create client product')
        created_product = dict(created_product)
        logger.info(f"Successfully created client product with ID {created_product['id']}")
        skip_portfolio = getattr(client_product, 'skip_portfolio_creation', False)
        logger.info(f'Retrieved skip_portfolio_creation value: {skip_portfolio}')
        if client_product.portfolio_id or skip_portfolio:
            return created_product
        logger.info(f"No portfolio_id provided - creating default portfolio for product {created_product['id']}")
        portfolio_name = f"Portfolio for {(created_product['product_name'] if created_product['product_name'] else 'product ' + str(created_product['id']))}"
        portfolio = await db.fetchrow('\n            INSERT INTO portfolios (portfolio_name, status, start_date) \n            VALUES ($1, $2, $3) \n            RETURNING *\n        ', portfolio_name, 'active', start_date_iso)
        if not portfolio:
            raise HTTPException(status_code=500, detail='Failed to create portfolio for client product')
        portfolio = dict(portfolio)
        logger.info(f"Successfully created portfolio with ID {portfolio['id']} for product {created_product['id']}")
        updated_product = await db.fetchrow('\n            UPDATE client_products \n            SET portfolio_id = $1 \n            WHERE id = $2 \n            RETURNING *\n        ', portfolio['id'], created_product['id'])
        if not updated_product:
            raise HTTPException(status_code=500, detail='Failed to update client product with portfolio ID')
        logger.info(f"Successfully updated product {created_product['id']} with portfolio_id {portfolio['id']}")
        return dict(updated_product)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating client product: {str(e)}')
        import traceback
        logger.error(f'Traceback: {traceback.format_exc()}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/client-products/{client_product_id}', response_model=ClientProduct)
async def get_client_product(client_product_id: int, db=Depends(get_db)):
    """
    What it does: Retrieves a single client product by ID.
    Why it's needed: Allows viewing detailed information about a specific client product.
    How it works:
        1. Takes the client_product_id from the URL path
        2. Queries the 'client_products' table for the main record
        3. Makes separate queries to get client, provider, and portfolio information
        4. If the portfolio has a template, adds the template info
        5. Combines all data and returns it
    Expected output: A JSON object containing the requested client product's details including provider theme color and template info
    """
    try:
        result = await db.fetchrow('SELECT * FROM client_products WHERE id = $1', client_product_id)
        if not result:
            raise HTTPException(status_code=404, detail=f'Client product with ID {client_product_id} not found')
        client_product = dict(result)
        provider_id = client_product.get('provider_id')
        if provider_id:
            provider_result = await db.fetchrow('SELECT * FROM available_providers WHERE id = $1', provider_id)
            if provider_result:
                provider = dict(provider_result)
                client_product['provider_name'] = provider.get('name')
                client_product['provider_theme_color'] = provider.get('theme_color')
                logger.info(f"Added provider data: {provider.get('name')} with theme color: {provider.get('theme_color')}")
        client_id = client_product.get('client_id')
        if client_id:
            client_result = await db.fetchrow('SELECT * FROM client_groups WHERE id = $1', client_id)
            if client_result:
                client = dict(client_result)
                client_name = client.get('name')
                if not client_name or client_name.strip() == '':
                    client_product['client_name'] = f'Client Group {client_id}'
                else:
                    client_product['client_name'] = client_name
                logger.info(f"Added client name: {client_product['client_name']}")
        portfolio_id = client_product.get('portfolio_id')
        if portfolio_id:
            portfolio_result = await db.fetchrow('SELECT * FROM portfolios WHERE id = $1', portfolio_id)
            if portfolio_result:
                portfolio = dict(portfolio_result)
                if portfolio.get('template_generation_id'):
                    template_result = await db.fetchrow('SELECT * FROM template_portfolio_generations WHERE id = $1', portfolio.get('template_generation_id'))
                    if template_result:
                        template = dict(template_result)
                        client_product['template_generation_id'] = portfolio.get('template_generation_id')
                        client_product['template_info'] = template
        portfolio_id = client_product.get('portfolio_id')
        total_value = 0
        portfolio_irr = '-'
        if portfolio_id:
            try:
                portfolio_irr_result = await db.fetchrow('SELECT irr_result FROM latest_portfolio_irr_values WHERE portfolio_id = $1', portfolio_id)
                if portfolio_irr_result:
                    portfolio_irr = dict(portfolio_irr_result).get('irr_result')
                funds_result = await db.fetch('SELECT id FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
                if funds_result:
                    portfolio_fund_ids = [dict(fund).get('id') for fund in funds_result]
                    valuations_result = await db.fetch('SELECT valuation FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])', portfolio_fund_ids)
                    if valuations_result:
                        for valuation_record in valuations_result:
                            valuation = dict(valuation_record)
                            value = valuation.get('valuation', 0)
                            if value:
                                total_value += float(value)
                        logger.info(f'Calculated total_value={total_value} for product {client_product_id}')
                    else:
                        logger.info(f'No valuations found for portfolio funds: {portfolio_fund_ids}')
                else:
                    logger.info(f'No active funds found for portfolio {portfolio_id}')
            except Exception as e:
                logger.error(f'Error calculating total value and IRR for product {client_product_id}: {str(e)}')
        client_product['total_value'] = total_value
        client_product['irr'] = portfolio_irr
        return client_product
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching client product: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.patch('/client-products/{client_product_id}', response_model=ClientProduct)
async def update_client_product(client_product_id: int, client_product_update: ClientProductUpdate, db=Depends(get_db)):
    """
    What it does: Updates an existing client product's information.
    Why it's needed: Allows modifying client product details when they change.
    How it works:
        1. Validates the update data using the ClientProductUpdate model
        2. Removes any None values from the input (fields that aren't being updated)
        3. Verifies the client product exists
        4. Validates that referenced client_id exists if provided
        5. Updates only the provided fields in the database
        6. Returns the updated client product information
    Expected output: A JSON object containing the updated client product's details
    """
    all_data = client_product_update.model_dump(exclude_unset=True)
    update_data = all_data
    if not update_data:
        raise HTTPException(status_code=400, detail='No valid update data provided')
    try:
        check_result = await db.fetchrow('SELECT id FROM client_products WHERE id = $1', client_product_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f'Client product with ID {client_product_id} not found')
        if 'client_id' in update_data and update_data['client_id'] is not None:
            client_check = await db.fetchrow('SELECT id FROM client_groups WHERE id = $1', update_data['client_id'])
            if not client_check:
                raise HTTPException(status_code=404, detail=f"Client with ID {update_data['client_id']} not found")
        set_clauses = []
        values = []
        param_counter = 1
        for key, value in update_data.items():
            set_clauses.append(f'{key} = ${param_counter}')
            if key in ['fixed_fee_direct', 'fixed_fee_facilitated', 'percentage_fee_facilitated']:
                if value is not None:
                    values.append(str(float(value)))
                else:
                    logger.info(f'Setting {key} to NULL for product {client_product_id}')
                    values.append(value)
            else:
                values.append(value)
            param_counter += 1
        values.append(client_product_id)
        update_query = f"\n            UPDATE client_products \n            SET {', '.join(set_clauses)} \n            WHERE id = ${param_counter}\n            RETURNING *\n        "
        logger.info(f'Update query: {update_query}')
        logger.info(f'Values: {values}')
        logger.info(f'Value types: {[type(v).__name__ for v in values]}')
        result = await db.fetchrow(update_query, *values)
        if result:
            return dict(result)
        raise HTTPException(status_code=400, detail='Failed to update client product')
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating client product: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.delete('/client-products/{client_product_id}', response_model=dict)
async def delete_client_product(client_product_id: int, db=Depends(get_db)):
    """
    What it does: Deletes a client product and all its associated records from the database.
    Why it's needed: Allows removing client products that are no longer relevant to the business.
    How it works:
        1. Verifies the client product exists
        2. Gets the portfolio_id directly from the client product
        3. For the linked portfolio:
           a. Gets all portfolio_funds for this portfolio
           b. For each portfolio fund:
              - Deletes all IRR values associated with the fund first (to remove foreign key dependency)
              - Deletes all fund_valuations associated with the fund
              - Deletes all holding_activity_log entries associated with the fund
           c. Deletes all portfolio_funds for this portfolio
        4. Deletes the client product record
        5. Deletes the portfolio itself
        6. Returns a success message with deletion counts
    Expected output: A JSON object with a success message confirmation and deletion counts
    """
    try:
        check_result = await db.fetchrow('SELECT * FROM client_products WHERE id = $1', client_product_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f'Client product with ID {client_product_id} not found')
        client_product = dict(check_result)
        portfolio_id = client_product.get('portfolio_id')
        logger.info(f'Deleting client product with ID {client_product_id} and all associated records')
        portfolio_funds_deleted = 0
        fund_valuations_deleted = 0
        irr_values_deleted = 0
        activity_logs_deleted = 0
        portfolio_irr_deleted = 0
        portfolio_val_deleted = 0
        if portfolio_id:
            logger.info(f'Processing portfolio with ID {portfolio_id}')
            portfolio_funds_result = await db.fetch('SELECT id FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
            if portfolio_funds_result:
                portfolio_funds_data = [dict(fund) for fund in portfolio_funds_result]
                portfolio_funds_count = len(portfolio_funds_data)
                portfolio_funds_deleted = portfolio_funds_count
                for fund in portfolio_funds_data:
                    fund_id = fund['id']
                    irr_result = await db.execute('DELETE FROM portfolio_fund_irr_values WHERE fund_id = $1', fund_id)
                    deleted_count = int(irr_result.split()[-1]) if isinstance(irr_result, str) and 'DELETE' in irr_result else 0
                    irr_values_deleted += deleted_count
                    logger.info(f'Deleted {deleted_count} IRR values for portfolio fund {fund_id}')
                    fund_valuation_ids_result = await db.fetch('SELECT id FROM portfolio_fund_valuations WHERE portfolio_fund_id = $1', fund_id)
                    if fund_valuation_ids_result:
                        valuation_ids = [dict(v)['id'] for v in fund_valuation_ids_result]
                        for val_id in valuation_ids:
                            val_irr_result = await db.execute('DELETE FROM portfolio_fund_irr_values WHERE fund_valuation_id = $1', val_id)
                            deleted_count = int(val_irr_result.split()[-1]) if isinstance(val_irr_result, str) and 'DELETE' in val_irr_result else 0
                            irr_values_deleted += deleted_count
                            logger.info(f'Deleted {deleted_count} IRR values for fund valuation {val_id}')
                    fund_val_result = await db.execute('DELETE FROM portfolio_fund_valuations WHERE portfolio_fund_id = $1', fund_id)
                    deleted_count = int(fund_val_result.split()[-1]) if isinstance(fund_val_result, str) and 'DELETE' in fund_val_result else 0
                    fund_valuations_deleted += deleted_count
                    logger.info(f'Deleted {deleted_count} fund valuations for portfolio fund {fund_id}')
                    activity_result = await db.execute('DELETE FROM holding_activity_log WHERE portfolio_fund_id = $1', fund_id)
                    deleted_count = int(activity_result.split()[-1]) if isinstance(activity_result, str) and 'DELETE' in activity_result else 0
                    activity_logs_deleted += deleted_count
                    logger.info(f'Deleted {deleted_count} activity logs for portfolio fund {fund_id}')
                await db.execute('DELETE FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
                logger.info(f'Deleted {portfolio_funds_count} portfolio funds for portfolio {portfolio_id}')
        await db.execute('DELETE FROM client_products WHERE id = $1', client_product_id)
        logger.info(f'Deleted client product {client_product_id}')
        if portfolio_id:
            portfolio_irr_result = await db.execute('DELETE FROM portfolio_irr_values WHERE portfolio_id = $1', portfolio_id)
            portfolio_irr_deleted = int(portfolio_irr_result.split()[-1]) if isinstance(portfolio_irr_result, str) and 'DELETE' in portfolio_irr_result else 0
            logger.info(f'Deleted {portfolio_irr_deleted} portfolio IRR values for portfolio {portfolio_id}')
            portfolio_val_result = await db.execute('DELETE FROM portfolio_valuations WHERE portfolio_id = $1', portfolio_id)
            portfolio_val_deleted = int(portfolio_val_result.split()[-1]) if isinstance(portfolio_val_result, str) and 'DELETE' in portfolio_val_result else 0
            logger.info(f'Deleted {portfolio_val_deleted} portfolio valuations for portfolio {portfolio_id}')
            await db.execute('DELETE FROM portfolios WHERE id = $1', portfolio_id)
            logger.info(f'Deleted portfolio {portfolio_id}')
        return {'message': f'Client product with ID {client_product_id} and all associated records deleted successfully', 'details': {'portfolio_deleted': 1 if portfolio_id else 0, 'portfolio_funds_deleted': portfolio_funds_deleted, 'fund_valuations_deleted': fund_valuations_deleted, 'irr_values_deleted': irr_values_deleted, 'activity_logs_deleted': activity_logs_deleted, 'portfolio_irr_values_deleted': portfolio_irr_deleted if portfolio_id else 0, 'portfolio_valuations_deleted': portfolio_val_deleted if portfolio_id else 0}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting client product and associated records: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/client-products/{product_id}/fum', response_model=dict)
async def get_product_fum(product_id: int, db=Depends(get_db)):
    """
    What it does: Calculates the total funds under management for a specific product
    Why it's needed: Provides an accurate sum of all valuations for a product's portfolio funds
    How it works:
        1. Gets the product to find its associated portfolio
        2. Gets all active portfolio funds for that portfolio
        3. Uses the latest_portfolio_fund_valuations view to get current values
        4. Sums up the valuations
    Expected output: A JSON object with the total FUM value
    """
    try:
        product_result = await db.fetchrow('SELECT portfolio_id FROM client_products WHERE id = $1', product_id)
        if not product_result:
            raise HTTPException(status_code=404, detail=f'Product with ID {product_id} not found')
        portfolio_id = product_result.get('portfolio_id')
        if not portfolio_id:
            logger.info(f'Product {product_id} has no associated portfolio')
            return {'product_id': product_id, 'fum': 0}
        funds_result = await db.fetch('SELECT id FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
        if not funds_result:
            logger.info(f'No funds found for portfolio {portfolio_id}')
            return {'product_id': product_id, 'fum': 0}
        portfolio_fund_ids = [fund.get('id') for fund in funds_result]
        valuations_result = await db.fetch('SELECT valuation FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])', portfolio_fund_ids)
        total_fum = 0
        if valuations_result:
            for valuation_record in valuations_result:
                valuation = dict(valuation_record)
                value = valuation.get('valuation', 0)
                if value:
                    total_fum += float(value)
            logger.info(f'Total FUM calculated from {len(valuations_result)} fund valuations')
        else:
            logger.info(f'No valuations found for portfolio funds: {portfolio_fund_ids}')
        logger.info(f'Total FUM for product {product_id}: {total_fum}')
        return {'product_id': product_id, 'fum': total_fum}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error calculating FUM for product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/client-products/{product_id}/irr', response_model=dict)
async def get_product_irr(product_id: int, db=Depends(get_db)):
    """
    What it does: Calculates the true portfolio IRR for a product based on all cash flows across all portfolio funds
    Why it's needed: Provides an accurate IRR calculation from actual cash flows, not weighted averages
    How it works:
        1. Gets the product to find its associated portfolio
        2. Gets all portfolio funds for that portfolio
        3. Aggregates all cash flows (deposits, withdrawals, fees) from all funds
        4. Gets latest valuations as the final cash flow
        5. Calculates IRR from the combined cash flow series using the Excel-style IRR function
    Expected output: A JSON object with the calculated portfolio IRR value
    """
    try:
        logger.info(f'Calculating portfolio IRR from cash flows for product {product_id}')
        product_result = await db.fetchrow('SELECT portfolio_id, product_name FROM client_products WHERE id = $1', product_id)
        if not product_result:
            raise HTTPException(status_code=404, detail=f'Product with ID {product_id} not found')
        portfolio_id = product_result.get('portfolio_id')
        product_name = product_result.get('product_name', 'Unknown Product')
        if not portfolio_id:
            logger.info(f'Product {product_id} ({product_name}) has no associated portfolio')
            return {'product_id': product_id, 'product_name': product_name, 'irr': 0, 'irr_decimal': 0}
        funds_result = await db.fetch('SELECT id FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
        if not funds_result:
            logger.info(f'No funds found for portfolio {portfolio_id} (product {product_id})')
            return {'product_id': product_id, 'product_name': product_name, 'irr': 0, 'irr_decimal': 0}
        portfolio_fund_ids = [fund.get('id') for fund in funds_result]
        logger.info(f'Found {len(portfolio_fund_ids)} portfolio funds for IRR calculation')
        all_cash_flows = {}
        if portfolio_fund_ids:
            activities_result = await db.fetch('SELECT * FROM holding_activity_log WHERE portfolio_fund_id = ANY($1::int[]) ORDER BY activity_timestamp', portfolio_fund_ids)
            if activities_result:
                logger.info(f'Found {len(activities_result)} activities across all funds')
                for activity_record in activities_result:
                    activity = dict(activity_record)
                    activity_date = activity.get('activity_timestamp')
                    activity_type = activity.get('activity_type', '').lower()
                    amount = float(activity.get('amount', 0))
                    if activity_date:
                        from datetime import datetime
                        if isinstance(activity_date, str):
                            if 'T' in activity_date:
                                parsed_date = datetime.strptime(activity_date, '%Y-%m-%dT%H:%M:%S')
                            else:
                                parsed_date = datetime.strptime(activity_date, '%Y-%m-%d')
                        else:
                            parsed_date = activity_date
                        normalized_date = f'{parsed_date.year}-{parsed_date.month:02d}-01'
                        if normalized_date not in all_cash_flows:
                            all_cash_flows[normalized_date] = 0
                        if activity_type in ['deposit', 'investment', 'contribution']:
                            all_cash_flows[normalized_date] -= amount
                        elif activity_type in ['withdrawal', 'redemption', 'distribution']:
                            all_cash_flows[normalized_date] += amount
                        elif activity_type in ['fee', 'charge', 'expense']:
                            all_cash_flows[normalized_date] -= amount
            total_current_value = 0
            latest_valuation_date = None
            if portfolio_fund_ids:
                valuations_result = await db.fetch('SELECT valuation, valuation_date FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])', portfolio_fund_ids)
                if valuations_result:
                    for valuation_record in valuations_result:
                        valuation = dict(valuation_record)
                        current_value = float(valuation.get('valuation', 0))
                        total_current_value += current_value
                        val_date = valuation.get('valuation_date')
                        if val_date:
                            from datetime import datetime, date
                            if isinstance(val_date, date):
                                val_date_obj = val_date
                            elif isinstance(val_date, str):
                                if 'T' in val_date:
                                    val_date_obj = datetime.strptime(val_date, '%Y-%m-%dT%H:%M:%S').date()
                                else:
                                    val_date_obj = datetime.strptime(val_date, '%Y-%m-%d').date()
                            else:
                                val_date_obj = None
                        else:
                            val_date_obj = None
                        if latest_valuation_date is None or val_date_obj > latest_valuation_date:
                            latest_valuation_date = val_date_obj
            if total_current_value > 0 and latest_valuation_date:
                from datetime import date
                val_month = latest_valuation_date.month
                val_year = latest_valuation_date.year
                if val_month == 12:
                    next_month = date(val_year + 1, 1, 1)
                else:
                    next_month = date(val_year, val_month + 1, 1)
                from datetime import timedelta
                end_of_val_month = next_month - timedelta(days=1)
                end_of_val_month_str = end_of_val_month.strftime('%Y-%m-%d')
                all_cash_flows[end_of_val_month_str] = all_cash_flows.get(end_of_val_month_str, 0) + total_current_value
                logger.info(f'Added total current value {total_current_value} as final cash flow at end of valuation month: {end_of_val_month_str}')
        if not all_cash_flows:
            logger.info(f'No cash flows found for portfolio {portfolio_id}')
            return {'product_id': product_id, 'product_name': product_name, 'irr': 0, 'irr_decimal': 0}
        sorted_dates = sorted(all_cash_flows.keys())
        cash_flow_values = [all_cash_flows[date] for date in sorted_dates]
        logger.info(f'Portfolio cash flows for IRR calculation:')
        for i, date in enumerate(sorted_dates):
            logger.info(f'  {date}: {cash_flow_values[i]}')
        try:
            from datetime import datetime
            date_objects = []
            for date_str in sorted_dates:
                if isinstance(date_str, str):
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                    date_objects.append(date_obj)
                elif hasattr(date_str, 'date'):
                    date_objects.append(date_str)
                else:
                    date_obj = datetime.combine(date_str, datetime.min.time())
                    date_objects.append(date_obj)
            portfolio_irr = calculate_excel_style_irr(date_objects, cash_flow_values)
            logger.info(f'IRR calculation result: {portfolio_irr}')
            irr_decimal = portfolio_irr.get('period_irr', 0)
            irr_percentage = irr_decimal * 100
            logger.info(f'Calculated portfolio IRR: {irr_percentage}%')
            return {'product_id': product_id, 'product_name': product_name, 'irr': irr_percentage, 'irr_decimal': irr_decimal, 'cash_flows_count': len(cash_flow_values), 'total_current_value': total_current_value, 'days_in_period': portfolio_irr.get('days_in_period', 0)}
        except Exception as irr_error:
            logger.error(f'Error calculating IRR: {str(irr_error)}')
            return {'product_id': product_id, 'product_name': product_name, 'irr': 0, 'irr_decimal': 0, 'error': f'IRR calculation failed: {str(irr_error)}'}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error calculating portfolio IRR for product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/client-products/{client_product_id}/complete', response_model=dict)
async def get_complete_product_details(client_product_id: int, db=Depends(get_db)):
    """
    What it does: Retrieves a single product with all its related data in one query.
    Why it's needed: Dramatically improves frontend performance by eliminating multiple sequential API calls.
    How it works:
        1. Fetches the product details
        2. Fetches all related data in parallel:
           - Provider details
           - Client details
           - Product owners
           - Portfolio details including funds
           - Fund valuations
           - IRR values
        3. Combines all data into a single response object
    Expected output: A complete product object with all related data nested within it
    """
    try:
        logger.info(f'Fetching complete product details for product ID: {client_product_id}')
        product_result = await db.fetchrow('SELECT * FROM client_products WHERE id = $1', client_product_id)
        if not product_result:
            raise HTTPException(status_code=404, detail=f'Product with ID {client_product_id} not found')
        product = dict(product_result)
        logger.info(f"Found product: {product['product_name']} (ID: {product['id']})")
        provider_id = product.get('provider_id')
        client_id = product.get('client_id')
        portfolio_id = product.get('portfolio_id')
        response = {**product, 'provider_details': None, 'client_details': None, 'product_owners': [], 'portfolio_details': None, 'portfolio_funds': [], 'fund_valuations': {}, 'irr_values': {}, 'summary': {'total_value': 0, 'irr_weighted': None}}
        if provider_id:
            provider_result = await db.fetchrow('SELECT * FROM available_providers WHERE id = $1', provider_id)
            if provider_result:
                provider_dict = dict(provider_result)
                response['provider_details'] = provider_dict
                response['provider_name'] = provider_dict.get('name')
                response['provider_theme_color'] = provider_dict.get('theme_color')
        if client_id:
            client_result = await db.fetchrow('SELECT * FROM client_groups WHERE id = $1', client_id)
            if client_result:
                client = dict(client_result)
                response['client_details'] = client
                client_name = client.get('name')
                if not client_name or client_name.strip() == '':
                    response['client_name'] = f'Client Group {client_id}'
                else:
                    response['client_name'] = client_name
        try:
            pop_result = await db.fetch('SELECT * FROM product_owner_products WHERE product_id = $1', client_product_id)
            if pop_result:
                owner_ids = [dict(pop).get('product_owner_id') for pop in pop_result]
                owners_result = await db.fetch('SELECT id, firstname, surname, known_as, status, created_at FROM product_owners WHERE id = ANY($1::int[])', owner_ids)
                if owners_result:
                    enhanced_owners = []
                    for owner_record in owners_result:
                        owner = dict(owner_record)
                        display_name = f"{owner.get('firstname', '')} {owner.get('surname', '')}".strip()
                        if not display_name and owner.get('known_as'):
                            display_name = owner['known_as']
                        enhanced_owner = {**owner, 'name': display_name}
                        enhanced_owners.append(enhanced_owner)
                    response['product_owners'] = enhanced_owners
        except Exception as e:
            logger.error(f'Error fetching product owners: {str(e)}')
        if portfolio_id:
            portfolio_result = await db.fetchrow('SELECT * FROM portfolios WHERE id = $1', portfolio_id)
            if portfolio_result:
                portfolio = dict(portfolio_result)
                response['portfolio_details'] = portfolio
                original_template_generation_id = portfolio.get('template_generation_id')
                if original_template_generation_id:
                    generation_result = await db.fetchrow('SELECT * FROM template_portfolio_generations WHERE id = $1', original_template_generation_id)
                    if generation_result:
                        generation_info = dict(generation_result)
                        response['template_info'] = generation_info
                        response['template_generation_id'] = original_template_generation_id
                        if generation_info.get('template_portfolio_generations') and isinstance(generation_info.get('template_portfolio_generations'), dict):
                            response['parent_template_name'] = generation_info.get('template_portfolio_generations').get('name')
                        else:
                            response['parent_template_name'] = None
                funds_result = await db.fetch('SELECT * FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
                if funds_result:
                    portfolio_funds = [dict(fund) for fund in funds_result]
                    fund_ids = [pf.get('available_funds_id') for pf in portfolio_funds if pf.get('available_funds_id')]
                    portfolio_fund_ids = [pf.get('id') for pf in portfolio_funds]
                    funds_map = {}
                    if fund_ids:
                        funds_details_result = await db.fetch('SELECT * FROM available_funds WHERE id = ANY($1::int[])', fund_ids)
                        if funds_details_result:
                            funds_map = {dict(f).get('id'): dict(f) for f in funds_details_result}
                    valuations_map = {}
                    if portfolio_fund_ids:
                        latest_valuations_result = await db.fetch('SELECT * FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])', portfolio_fund_ids)
                        if latest_valuations_result:
                            valuations_map = {dict(v).get('portfolio_fund_id'): dict(v) for v in latest_valuations_result}
                    irr_map = {}
                    if portfolio_fund_ids:
                        latest_irr_result = await db.fetch('SELECT * FROM latest_portfolio_fund_irr_values WHERE fund_id = ANY($1::int[])', portfolio_fund_ids)
                        if latest_irr_result:
                            irr_map = {dict(irr).get('fund_id'): dict(irr) for irr in latest_irr_result}
                    enhanced_funds = []
                    for pf in portfolio_funds:
                        fund_id = pf.get('available_funds_id')
                        portfolio_fund_id = pf.get('id')
                        if fund_id and fund_id in funds_map:
                            fund_details = funds_map[fund_id]
                            pf['fund_details'] = fund_details
                            pf['fund_name'] = fund_details.get('fund_name')
                            pf['isin_number'] = fund_details.get('isin_number')
                            pf['risk_factor'] = fund_details.get('risk_factor')
                        if portfolio_fund_id and portfolio_fund_id in valuations_map:
                            valuation = valuations_map[portfolio_fund_id]
                            pf['latest_valuation'] = valuation
                            pf['market_value'] = valuation.get('valuation')
                            pf['valuation_date'] = valuation.get('valuation_date')
                        if portfolio_fund_id and portfolio_fund_id in irr_map:
                            irr = irr_map[portfolio_fund_id]
                            pf['latest_irr'] = irr
                            pf['irr_result'] = irr.get('irr_result')
                            pf['irr_date'] = irr.get('date')
                        else:
                            pf['latest_irr'] = None
                            pf['irr_result'] = None
                            pf['irr_date'] = None
                        enhanced_funds.append(pf)
                    response['portfolio_funds'] = enhanced_funds
                    response['fund_valuations'] = valuations_map
                    response['irr_values'] = irr_map
        portfolio_id = product.get('portfolio_id')
        summary_total_value = 0
        portfolio_irr = '-'
        if portfolio_id:
            try:
                portfolio_irr_result = await db.fetchrow('SELECT irr_result FROM latest_portfolio_irr_values WHERE portfolio_id = $1', portfolio_id)
                if portfolio_irr_result:
                    portfolio_irr = dict(portfolio_irr_result).get('irr_result')
                funds_result = await db.fetch('SELECT id FROM portfolio_funds WHERE portfolio_id = $1', portfolio_id)
                if funds_result:
                    portfolio_fund_ids = [dict(fund).get('id') for fund in funds_result]
                    valuations_result = await db.fetch('SELECT valuation FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])', portfolio_fund_ids)
                    if valuations_result:
                        for valuation_record in valuations_result:
                            valuation = dict(valuation_record)
                            value = valuation.get('valuation', 0)
                            if value:
                                summary_total_value += float(value)
            except Exception as e:
                logger.error(f'Error calculating product summary: {str(e)}')
        response['summary'] = {'total_value': summary_total_value, 'irr_weighted': portfolio_irr}
        response['total_value'] = summary_total_value
        response['irr'] = portfolio_irr
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching complete product details: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.post('/client-products/{client_product_id}/notes')
async def update_product_notes(client_product_id: int, request: Request, db=Depends(get_db)):
    """
    What it does: Updates notes for a specific client product.
    Why it's needed: Allows users to add/edit notes for products from the frontend.
    How it works:
        1. Parses the request body to get the notes
        2. Updates the notes field in the client_products table
        3. Returns success response
    Expected output: Confirmation of notes update
    """
    try:
        body = await request.json()
        notes = body.get('notes', '')
        result = await db.fetchrow('\n            UPDATE client_products \n            SET notes = $1 \n            WHERE id = $2 \n            RETURNING *\n        ', notes, client_product_id)
        if not result:
            raise HTTPException(status_code=404, detail='Product not found')
        logger.info(f'Updated notes for product {client_product_id}')
        return {'message': 'Notes updated successfully'}
    except Exception as e:
        logger.error(f'Error updating product notes: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to update notes: {str(e)}')

@router.patch('/client-products/{product_id}/lapse')
async def lapse_product(product_id: int, db=Depends(get_db)):
    """
    What it does: Lapse a product by changing its status from 'active' to 'inactive' when total value is zero.
    Why it's needed: Allows users to properly lapse products that have zero value instead of deleting them.
    How it works:
        1. Verify product exists and is currently active
        2. Calculate total value from portfolio fund valuations
        3. Check if total value is zero (within tolerance)
        4. Update status to 'inactive' if validation passes
        5. Return updated product data
    Expected output: Updated product object with inactive status
    """
    try:
        product_result = await db.fetchrow('SELECT * FROM client_products WHERE id = $1', product_id)
        if not product_result:
            raise HTTPException(status_code=404, detail='Product not found')
        product = dict(product_result)
        if product.get('status') != 'active':
            raise HTTPException(status_code=400, detail='Product is not active and cannot be lapsed')
        portfolio_id = product.get('portfolio_id')
        if not portfolio_id:
            raise HTTPException(status_code=400, detail='Product has no associated portfolio')
        portfolio_funds_result = await db.fetch('SELECT id FROM portfolio_funds WHERE portfolio_id = $1 AND status = $2', portfolio_id, 'active')
        logger.info(f'Lapse check for product {product_id}: Found {(len(portfolio_funds_result) if portfolio_funds_result else 0)} active portfolio funds')
        if not portfolio_funds_result:
            total_value = 0
            logger.info(f'Lapse check for product {product_id}: No active funds, total value = 0')
        else:
            fund_ids = [pf['id'] for pf in portfolio_funds_result]
            valuations_result = await db.fetch('SELECT valuation FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])', fund_ids)
            logger.info(f'Lapse check for product {product_id}: Found {(len(valuations_result) if valuations_result else 0)} valuations for fund IDs: {fund_ids}')
            total_value = 0
            if valuations_result:
                for v_record in valuations_result:
                    v = dict(v_record)
                    valuation = v.get('valuation')
                    if valuation is not None:
                        try:
                            value = float(valuation)
                            total_value += value
                            logger.debug(f'Added valuation: {value}, running total: {total_value}')
                        except (ValueError, TypeError):
                            logger.warning(f'Skipping invalid valuation value: {valuation}')
                            continue
            logger.info(f'Lapse check for product {product_id}: Final calculated total value = {total_value}')
        tolerance = 0.01
        if total_value > tolerance:
            raise HTTPException(status_code=400, detail=f'Product cannot be lapsed as it has a total value of £{total_value:.2f}. Only products with zero value can be lapsed.')
        update_result = await db.fetchrow('\n            UPDATE client_products \n            SET status = $1, end_date = $2 \n            WHERE id = $3 \n            RETURNING *\n        ', 'inactive', datetime.now().date(), product_id)
        if not update_result:
            raise HTTPException(status_code=500, detail='Failed to update product status')
        updated_product = dict(update_result)
        logger.info(f'Successfully lapsed product {product_id}')
        return {'message': 'Product successfully lapsed', 'product': updated_product}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error lapsing product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to lapse product: {str(e)}')

@router.patch('/client-products/{product_id}/reactivate')
async def reactivate_product(product_id: int, db=Depends(get_db)):
    """
    What it does: Reactivate a lapsed product by changing its status from 'inactive' to 'active'.
    Why it's needed: Allows users to restore previously lapsed products that need to be made active again.
    How it works:
        1. Verify product exists and is currently inactive (lapsed)
        2. Update status to 'active' and clear the end_date
        3. Return updated product data
    Expected output: Updated product object with active status
    """
    try:
        product_result = await db.fetchrow('SELECT * FROM client_products WHERE id = $1', product_id)
        if not product_result:
            raise HTTPException(status_code=404, detail='Product not found')
        product = dict(product_result)
        if product.get('status') != 'inactive':
            raise HTTPException(status_code=400, detail='Product is not inactive and cannot be reactivated')
        update_result = await db.fetchrow('\n            UPDATE client_products \n            SET status = $1, end_date = $2 \n            WHERE id = $3 \n            RETURNING *\n        ', 'active', None, product_id)
        if not update_result:
            raise HTTPException(status_code=500, detail='Failed to update product status')
        updated_product = dict(update_result)
        logger.info(f'Successfully reactivated product {product_id}')
        return {'message': 'Product successfully reactivated', 'product': updated_product}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error reactivating product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to reactivate product: {str(e)}')

@router.get('/client-products/{product_id}/revenue', response_model=ProductRevenueCalculation)
async def calculate_product_revenue(product_id: int, db=Depends(get_db)):
    """
    What it does: Calculates estimated annual revenue for a product based on all three fee types.
    Why it's needed: Allows advisors to estimate how much revenue they're making from each product.
    How it works:
        1. Retrieves the product with its fixed_fee_direct, fixed_fee_facilitated and percentage_fee_facilitated
        2. Gets the latest portfolio valuation for the product
        3. Calculates: fixed_fee_direct + fixed_fee_facilitated + (latest_valuation × percentage_fee_facilitated/100) = total revenue
        4. Returns detailed breakdown of the calculation
    Expected output: JSON object with revenue calculation breakdown
    """
    try:
        product_result = await db.fetchrow('SELECT * FROM client_products WHERE id = $1', product_id)
        if not product_result:
            raise HTTPException(status_code=404, detail='Product not found')
        product = dict(product_result)
        logger.info(f"Calculating revenue for product {product_id}: {product.get('product_name')}")
        response = ProductRevenueCalculation(product_id=product_id, product_name=product.get('product_name'), fixed_fee_direct=product.get('fixed_fee_direct'), fixed_fee_facilitated=product.get('fixed_fee_facilitated'), percentage_fee_facilitated=product.get('percentage_fee_facilitated'), latest_portfolio_valuation=None, valuation_date=None, calculated_percentage_fee_facilitated=None, total_estimated_annual_revenue=None, has_revenue_data=False)
        has_fixed_fee_direct = product.get('fixed_fee_direct') is not None
        has_fixed_fee_facilitated = product.get('fixed_fee_facilitated') is not None
        has_percentage_fee_facilitated = product.get('percentage_fee_facilitated') is not None
        if not has_fixed_fee_direct and (not has_fixed_fee_facilitated) and (not has_percentage_fee_facilitated):
            logger.info(f'Product {product_id} has no revenue data configured')
            return response
        response.has_revenue_data = True
        portfolio_id = product.get('portfolio_id')
        latest_valuation = 0
        valuation_date = None
        if has_percentage_fee_facilitated and portfolio_id:
            try:
                portfolio_funds_result = await db.fetch('SELECT id FROM portfolio_funds WHERE portfolio_id = $1 AND status = $2', portfolio_id, 'active')
                if portfolio_funds_result:
                    fund_ids = [pf['id'] for pf in portfolio_funds_result]
                    valuations_result = await db.fetch('SELECT valuation, valuation_date FROM latest_portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])', fund_ids)
                    if valuations_result:
                        total_value = 0
                        latest_date = None
                        for valuation_record in valuations_result:
                            valuation = dict(valuation_record)
                            value = valuation.get('valuation', 0)
                            date_str = valuation.get('valuation_date')
                            if value:
                                total_value += float(value)
                            if date_str:
                                try:
                                    val_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                                    if latest_date is None or val_date > latest_date:
                                        latest_date = val_date
                                except Exception as e:
                                    logger.warning(f'Error parsing valuation date {date_str}: {str(e)}')
                        latest_valuation = total_value
                        valuation_date = latest_date
                        logger.info(f'Portfolio {portfolio_id} latest valuation: £{latest_valuation:.2f}')
                    else:
                        logger.info(f'No valuations found for portfolio {portfolio_id}')
                else:
                    logger.info(f'No active portfolio funds found for portfolio {portfolio_id}')
            except Exception as e:
                logger.error(f'Error getting portfolio valuation: {str(e)}')
        raw_fixed_fee_direct = product.get('fixed_fee_direct')
        raw_fixed_fee_facilitated = product.get('fixed_fee_facilitated')
        raw_percentage_fee_facilitated = product.get('percentage_fee_facilitated')
        try:
            fixed_fee_direct_amount = float(raw_fixed_fee_direct) if raw_fixed_fee_direct is not None else 0.0
        except (ValueError, TypeError):
            fixed_fee_direct_amount = 0.0
        try:
            fixed_fee_facilitated_amount = float(raw_fixed_fee_facilitated) if raw_fixed_fee_facilitated is not None else 0.0
        except (ValueError, TypeError):
            fixed_fee_facilitated_amount = 0.0
        try:
            percentage_fee_facilitated_rate = float(raw_percentage_fee_facilitated) if raw_percentage_fee_facilitated is not None else 0.0
        except (ValueError, TypeError):
            percentage_fee_facilitated_rate = 0.0
        calculated_percentage_fee_facilitated = 0.0
        if has_percentage_fee_facilitated and latest_valuation > 0 and (percentage_fee_facilitated_rate > 0):
            try:
                calculated_percentage_fee_facilitated = latest_valuation * (percentage_fee_facilitated_rate / 100.0)
            except Exception:
                calculated_percentage_fee_facilitated = 0.0
        try:
            total_revenue = fixed_fee_direct_amount + fixed_fee_facilitated_amount + calculated_percentage_fee_facilitated
            import math
            if math.isnan(total_revenue) or math.isinf(total_revenue):
                total_revenue = 0.0
        except Exception:
            total_revenue = 0.0
        response.latest_portfolio_valuation = latest_valuation if latest_valuation > 0 else None
        response.valuation_date = valuation_date
        response.calculated_percentage_fee_facilitated = calculated_percentage_fee_facilitated if calculated_percentage_fee_facilitated > 0 else None
        response.total_estimated_annual_revenue = total_revenue if total_revenue > 0 else None
        logger.info(f'Revenue calculation for product {product_id}:')
        logger.info(f'  Fixed direct fee: £{fixed_fee_direct_amount:.2f}')
        logger.info(f'  Fixed facilitated fee: £{fixed_fee_facilitated_amount:.2f}')
        logger.info(f'  Portfolio value: £{latest_valuation:.2f}')
        logger.info(f'  Percentage fee rate: {percentage_fee_facilitated_rate}%')
        logger.info(f'  Calculated percentage fee: £{calculated_percentage_fee_facilitated:.2f}')
        logger.info(f'  Total estimated annual revenue: £{total_revenue:.2f}')
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error calculating revenue for product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to calculate revenue: {str(e)}')

@router.patch('/client-products/{product_id}/owners', response_model=dict)
async def update_product_owners(product_id: int, request_data: dict, db=Depends(get_db)):
    """
    Update the product owners for a specific client product.
    This endpoint manages the relationships in the product_owner_products table.
    """
    try:
        owner_ids = request_data.get('selected_owner_ids', [])
        logger.info(f'Updating product owners for product {product_id} with owners: {owner_ids}')
        product_check = await db.fetchrow('SELECT id FROM client_products WHERE id = $1', product_id)
        if not product_check:
            raise HTTPException(status_code=404, detail=f'Client product {product_id} not found')
        await db.execute('DELETE FROM product_owner_products WHERE product_id = $1', product_id)
        logger.info(f'Deleted existing product owner relationships for product {product_id}')
        if owner_ids:
            for owner_id in owner_ids:
                owner_check = await db.fetchrow('SELECT id FROM product_owners WHERE id = $1', owner_id)
                if not owner_check:
                    logger.warning(f'Product owner {owner_id} not found, skipping')
                    continue
                await db.execute('INSERT INTO product_owner_products (product_id, product_owner_id) VALUES ($1, $2)', product_id, owner_id)
            logger.info(f'Added {len(owner_ids)} product owner relationships for product {product_id}')
        updated_owners = await db.fetch('SELECT po.id, po.firstname, po.surname, po.known_as \n               FROM product_owners po \n               JOIN product_owner_products pop ON po.id = pop.product_owner_id \n               WHERE pop.product_id = $1', product_id)
        return {'success': True, 'product_id': product_id, 'owner_count': len(updated_owners), 'owners': [dict(owner) for owner in updated_owners]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating product owners for product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to update product owners: {str(e)}')