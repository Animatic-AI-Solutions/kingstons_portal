from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
from datetime import datetime, date, timedelta
from app.db.database import get_db
from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr
logger = logging.getLogger(__name__)
router = APIRouter()
_active_requests = {}
_request_lock = {}

class IRRHistorySummaryRequest(BaseModel):
    product_ids: List[int]
    selected_dates: List[str]
    client_group_ids: Optional[List[int]] = None

def _generate_request_key(request: IRRHistorySummaryRequest) -> str:
    """Generate a unique key for request deduplication"""
    return f'summary_{sorted(request.product_ids)}_{sorted(request.selected_dates)}_{request.client_group_ids}'

@router.get('/product/{product_id}/portfolio-historical-irr')
async def get_portfolio_historical_irr(product_id: int, limit: Optional[int]=Query(default=12, description='Maximum number of historical IRR records to return'), db=Depends(get_db)):
    """
    Get historical IRR values for a specific product/portfolio.
    Returns up to 'limit' most recent IRR calculations for the portfolio.
    """
    try:
        logger.info(f'Fetching portfolio historical IRR for product {product_id} (limit: {limit})')
        result = await db.fetch('\n            SELECT phi.portfolio_id, phi.portfolio_name, phi.date as irr_date, \n                   phi.irr_result, phi.product_name, phi.provider_name,\n                   phi.created_at, cp.id as product_id\n            FROM portfolio_historical_irr phi\n            JOIN client_products cp ON phi.portfolio_id = cp.portfolio_id\n            WHERE cp.id = $1 \n            ORDER BY phi.date DESC \n            LIMIT $2\n            ', product_id, limit)
        if result:
            logger.info(f'Found {len(result)} portfolio IRR records for product {product_id}')
            historical_irrs = []
            for record in result:
                historical_irrs.append({'irr_id': None, 'portfolio_id': record['portfolio_id'], 'irr_result': float(record['irr_result']) if record['irr_result'] is not None else None, 'irr_date': record['irr_date'], 'portfolio_valuation_id': None, 'portfolio_name': record['portfolio_name'], 'product_name': record['product_name'], 'provider_name': record['provider_name']})
            return {'product_id': product_id, 'portfolio_historical_irr': historical_irrs, 'count': len(historical_irrs)}
        else:
            logger.info(f'No portfolio historical IRR data found for product {product_id}')
            return {'product_id': product_id, 'portfolio_historical_irr': [], 'count': 0}
    except Exception as e:
        logger.error(f'Error fetching portfolio historical IRR for product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to fetch portfolio historical IRR: {str(e)}')

@router.get('/portfolio-irr-values/{portfolio_id}')
async def get_portfolio_irr_values(portfolio_id: int, db=Depends(get_db)):
    """
    Get stored portfolio IRR values directly from portfolio_irr_values table.
    This returns the actual stored portfolio-level IRR calculations, not fund averages.
    """
    try:
        logger.info(f'Fetching stored portfolio IRR values for portfolio {portfolio_id}')
        result = await db.fetch('\n            SELECT id, portfolio_id, date, irr_result, created_at\n            FROM portfolio_irr_values\n            WHERE portfolio_id = $1\n            ORDER BY date DESC\n            ', portfolio_id)
        if result:
            logger.info(f'Found {len(result)} stored portfolio IRR values for portfolio {portfolio_id}')
            irr_values = []
            for record in result:
                irr_values.append({'id': record['id'], 'portfolio_id': record['portfolio_id'], 'date': record['date'], 'irr_result': float(record['irr_result']) if record['irr_result'] is not None else None, 'created_at': record['created_at']})
            return irr_values
        else:
            logger.info(f'No stored portfolio IRR values found for portfolio {portfolio_id}')
            return []
    except Exception as e:
        logger.error(f'Error fetching stored portfolio IRR values for portfolio {portfolio_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to fetch stored portfolio IRR values: {str(e)}')

@router.get('/funds/{product_id}')
async def get_funds_historical_irr(product_id: int, limit: Optional[int]=Query(default=12, description='Maximum number of historical IRR records per fund'), db=Depends(get_db)):
    """
    Get historical IRR values for all funds within a specific product/portfolio.
    Returns up to 'limit' most recent IRR calculations for each fund.
    """
    try:
        logger.info(f'Fetching funds historical IRR for product {product_id} (limit: {limit})')
        result = await db.fetch('\n            SELECT fhi.fund_id, fhi.portfolio_id, fhi.fund_name, fhi.isin_number, \n                   fhi.risk_factor, fhi.date as irr_date, fhi.irr_result,\n                   fhi.portfolio_name, fhi.product_name, fhi.provider_name,\n                   cp.id as product_id\n            FROM fund_historical_irr fhi\n            JOIN client_products cp ON fhi.portfolio_id = cp.portfolio_id\n            WHERE cp.id = $1 \n            ORDER BY fhi.fund_id, fhi.date DESC\n            ', product_id)
        if result:
            logger.info(f'Found {len(result)} fund IRR records for product {product_id}')
            funds_irr = {}
            for record in result:
                fund_id = record['fund_id']
                if fund_id not in funds_irr:
                    funds_irr[fund_id] = {'portfolio_fund_id': fund_id, 'fund_name': record['fund_name'], 'isin_number': record['isin_number'], 'risk_factor': record['risk_factor'], 'fund_status': None, 'target_weighting': None, 'historical_irr': []}
                if len(funds_irr[fund_id]['historical_irr']) < limit:
                    funds_irr[fund_id]['historical_irr'].append({'irr_id': None, 'irr_result': float(record['irr_result']) if record['irr_result'] is not None else None, 'irr_date': record['irr_date'], 'fund_valuation_id': None})
            funds_list = list(funds_irr.values())
            funds_list.sort(key=lambda x: x['fund_name'] or '')
            return {'product_id': product_id, 'funds_historical_irr': funds_list, 'total_funds': len(funds_list), 'total_records': len(result)}
        else:
            logger.info(f'No funds historical IRR data found for product {product_id}')
            return {'product_id': product_id, 'funds_historical_irr': [], 'total_funds': 0, 'total_records': 0}
    except Exception as e:
        logger.error(f'Error fetching funds historical IRR for product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to fetch funds historical IRR: {str(e)}')

@router.post('/irr-history-summary')
async def get_irr_history_summary(request: IRRHistorySummaryRequest, db=Depends(get_db)):
    """
    Get IRR history summary table data for multiple products across selected dates.
    Returns product-level IRR values for each date plus portfolio totals.
    """
    try:
        request_key = _generate_request_key(request)
        if request_key in _active_requests:
            logger.info(f'🔄 Request {request_key} already in progress, waiting for result...')
            return await _active_requests[request_key]
        import asyncio
        future = asyncio.Future()
        _active_requests[request_key] = future
        try:
            logger.info(f'🚀 Processing new IRR history summary request: {request_key}')
            logger.info(f'Products: {request.product_ids}, Dates: {len(request.selected_dates)}')
            if not request.product_ids or not request.selected_dates:
                result = {'success': True, 'data': {'product_irr_history': [], 'portfolio_irr_history': []}}
                future.set_result(result)
                return result
            product_irr_history = []
            portfolio_irr_history = []
            logger.info(f'Querying products for IDs: {request.product_ids}')
            products = await db.fetch('SELECT id, product_name, provider_id, status FROM client_products WHERE id = ANY($1::int[])', request.product_ids)
            logger.info(f'Found {len(products)} products')
            provider_ids = [p['provider_id'] for p in products if p['provider_id']]
            providers = {}
            if provider_ids:
                provider_results = await db.fetch('SELECT id, name, theme_color FROM available_providers WHERE id = ANY($1::int[])', provider_ids)
                providers = {p['id']: p for p in provider_results}
            product_info_map = {}
            for product in products:
                provider_info = providers.get(product['provider_id'], {})
                product_info_map[product['id']] = {'product_name': product['product_name'], 'provider_name': provider_info.get('name', 'Unknown Provider'), 'provider_theme_color': provider_info.get('theme_color', '#6B7280'), 'status': product.get('status', 'unknown')}
            portfolio_irr_history = []
            if not request.selected_dates:
                result = {'success': True, 'portfolio_history': portfolio_irr_history, 'products': product_info_map, 'product_ids': request.product_ids, 'selected_dates': request.selected_dates, 'message': 'No dates selected for IRR history calculation'}
                future.set_result(result)
                return result
            valid_dates = [date for date in request.selected_dates if date and date.strip()]
            if not valid_dates:
                result = {'success': True, 'portfolio_history': portfolio_irr_history, 'products': product_info_map, 'product_ids': request.product_ids, 'selected_dates': request.selected_dates, 'message': 'No valid dates found for IRR history calculation'}
                future.set_result(result)
                return result
            if not products:
                result = {'success': True, 'portfolio_history': portfolio_irr_history, 'products': product_info_map, 'product_ids': request.product_ids, 'selected_dates': request.selected_dates, 'message': 'No valid products found'}
                future.set_result(result)
                return result
            for product_id in request.product_ids:
                if product_id not in product_info_map:
                    continue
                product_info = product_info_map[product_id]
                portfolio_id_result = await db.fetchrow('SELECT portfolio_id FROM client_products WHERE id = $1', product_id)
                if not portfolio_id_result or not portfolio_id_result['portfolio_id']:
                    for date_str in request.selected_dates:
                        product_irr_history.append({'product_id': product_id, 'product_name': product_info['product_name'], 'provider_name': product_info['provider_name'], 'provider_theme_color': product_info['provider_theme_color'], 'status': product_info['status'], 'irr_date': date_str, 'irr_result': None, 'valuation': None, 'profit': None, 'investments': None, 'withdrawals': None})
                    continue
                portfolio_id = portfolio_id_result['portfolio_id']
                for date_str in request.selected_dates:
                    try:
                        normalized_date_str = date_str.split('T')[0] if 'T' in date_str else date_str
                        normalized_date = datetime.strptime(normalized_date_str, '%Y-%m-%d').date()
                        stored_irr_result = await db.fetchrow('\n                            SELECT irr_result, date\n                            FROM portfolio_historical_irr\n                            WHERE portfolio_id = $1 AND date = $2\n                            ', portfolio_id, normalized_date)
                        logger.info(f"🔍 [SUMMARY ENDPOINT DEBUG] Product {product_id} (portfolio {portfolio_id}) for date {normalized_date}: {(stored_irr_result['irr_result'] if stored_irr_result else None)}% (from portfolio_historical_irr table)")
                        irr_value = None
                        if stored_irr_result and stored_irr_result['irr_result'] is not None:
                            irr_value = float(stored_irr_result['irr_result'])
                        logger.info(f'🔍 [SUMMARY ENDPOINT RESULT] Product {product_id} for date {date_str}: storing irr_result = {irr_value}% in response')
                        valuation = 0.0
                        valuation_result = await db.fetchrow('\n                            SELECT SUM(fv.valuation) as total_valuation\n                            FROM portfolio_fund_valuations fv\n                            JOIN portfolio_funds pf ON pf.id = fv.portfolio_fund_id\n                            WHERE pf.portfolio_id = $1 AND fv.valuation_date = $2\n                            ', portfolio_id, normalized_date)
                        if valuation_result and valuation_result['total_valuation']:
                            valuation = float(valuation_result['total_valuation'])
                        activities = await db.fetch('\n                            SELECT activity_type, SUM(amount) as total_amount\n                            FROM holding_activity_log\n                            WHERE portfolio_fund_id IN (\n                                SELECT id FROM portfolio_funds WHERE portfolio_id = $1\n                            )\n                            AND activity_timestamp <= $2\n                            GROUP BY activity_type\n                            ', portfolio_id, normalized_date)
                        investments = 0.0
                        withdrawals = 0.0
                        for activity in activities:
                            activity_type = activity['activity_type'].lower()
                            amount = float(activity['total_amount'])
                            if any((keyword in activity_type for keyword in ['investment', 'taxuplift', 'fundswitchin', 'productswitchin'])):
                                investments += amount
                            elif any((keyword in activity_type for keyword in ['withdrawal', 'fundswitchout', 'productswitchout'])):
                                withdrawals += amount
                        profit = valuation - investments - withdrawals
                        product_irr_history.append({'product_id': product_id, 'product_name': product_info['product_name'], 'provider_name': product_info['provider_name'], 'provider_theme_color': product_info['provider_theme_color'], 'status': product_info['status'], 'irr_date': date_str, 'irr_result': irr_value, 'valuation': valuation, 'profit': profit, 'investments': investments, 'withdrawals': withdrawals})
                    except Exception as product_date_error:
                        logger.error(f'Error fetching stored IRR for product {product_id} on date {date_str}: {str(product_date_error)}')
                        product_irr_history.append({'product_id': product_id, 'product_name': product_info['product_name'], 'provider_name': product_info['provider_name'], 'provider_theme_color': product_info['provider_theme_color'], 'status': product_info['status'], 'irr_date': date_str, 'irr_result': None, 'valuation': None, 'profit': None, 'investments': None, 'withdrawals': None})
            for date_str in request.selected_dates:
                try:
                    normalized_date_str = date_str.split('T')[0] if 'T' in date_str else date_str
                    logger.debug(f'📅 Processing portfolio total for date: {date_str} -> normalized: {normalized_date_str}')
                    normalized_date = datetime.strptime(normalized_date_str, '%Y-%m-%d').date()
                    portfolio_ids = await db.fetch('\n                        SELECT portfolio_id FROM client_products\n                        WHERE id = ANY($1::int[]) AND portfolio_id IS NOT NULL\n                        ', request.product_ids)
                    portfolio_id_list = [row['portfolio_id'] for row in portfolio_ids if row['portfolio_id']]
                    if not portfolio_id_list:
                        logger.warning(f'No portfolio IDs found for products {request.product_ids}')
                        portfolio_irr_history.append({'date': date_str, 'portfolio_irr': None, 'valuation': None, 'profit': None, 'investments': None, 'withdrawals': None})
                        continue
                    portfolio_irr = None
                    all_portfolio_fund_ids = await db.fetch('\n                        SELECT pf.id\n                        FROM portfolio_funds pf\n                        WHERE pf.portfolio_id = ANY($1::int[])\n                        ', portfolio_id_list)
                    if all_portfolio_fund_ids:
                        fund_ids_list = [int(row['id']) for row in all_portfolio_fund_ids]
                        logger.debug(f'📊 Found {len(fund_ids_list)} portfolio funds across {len(portfolio_id_list)} portfolios for IRR calculation')
                        try:
                            from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr
                            irr_result = await calculate_multiple_portfolio_funds_irr(portfolio_fund_ids=fund_ids_list, irr_date=normalized_date.strftime('%Y-%m-%d'), bypass_cache=True, db=db)
                            if irr_result.get('success') and irr_result.get('irr_percentage') is not None:
                                portfolio_irr = float(irr_result['irr_percentage'])
                                logger.debug(f'📊 Calculated aggregated portfolio IRR for date {date_str}: {portfolio_irr}%')
                                logger.debug(f"📊 IRR calculation details: {irr_result.get('message', 'N/A')}")
                            else:
                                logger.debug(f"📊 Portfolio IRR calculation returned no result for date {date_str}: {irr_result.get('message', 'N/A')}")
                        except Exception as calc_error:
                            logger.error(f'Error calculating aggregated portfolio IRR for date {date_str}: {str(calc_error)}')
                            portfolio_irr = None
                    else:
                        logger.warning(f'No portfolio funds found for portfolios {portfolio_id_list} on date {date_str}')
                    total_valuation = 0.0
                    valuation_result = await db.fetchrow('\n                        SELECT SUM(fv.valuation) as total_valuation\n                        FROM portfolio_fund_valuations fv\n                        JOIN portfolio_funds pf ON pf.id = fv.portfolio_fund_id\n                        WHERE pf.portfolio_id = ANY($1::int[]) AND fv.valuation_date = $2\n                        ', portfolio_id_list, normalized_date)
                    if valuation_result and valuation_result['total_valuation']:
                        total_valuation = float(valuation_result['total_valuation'])
                    activities = await db.fetch('\n                        SELECT activity_type, SUM(amount) as total_amount\n                        FROM holding_activity_log\n                        WHERE portfolio_fund_id IN (\n                            SELECT id FROM portfolio_funds WHERE portfolio_id = ANY($1::int[])\n                        )\n                        AND activity_timestamp <= $2\n                        GROUP BY activity_type\n                        ', portfolio_id_list, normalized_date)
                    total_investments = 0.0
                    total_withdrawals = 0.0
                    for activity in activities:
                        activity_type = activity['activity_type'].lower()
                        amount = float(activity['total_amount'])
                        if any((keyword in activity_type for keyword in ['investment', 'taxuplift', 'fundswitchin', 'productswitchin'])):
                            total_investments += amount
                        elif any((keyword in activity_type for keyword in ['withdrawal', 'fundswitchout', 'productswitchout'])):
                            total_withdrawals += amount
                    total_profit = total_valuation - total_investments - total_withdrawals
                    portfolio_irr_history.append({'date': date_str, 'portfolio_irr': portfolio_irr, 'valuation': total_valuation, 'profit': total_profit, 'investments': total_investments, 'withdrawals': total_withdrawals})
                except Exception as date_error:
                    logger.error(f'Error calculating aggregated portfolio IRR for date {date_str}: {str(date_error)}')
                    portfolio_irr_history.append({'date': date_str, 'portfolio_irr': None, 'valuation': None, 'profit': None, 'investments': None, 'withdrawals': None})
            logger.info(f'Successfully fetched IRR history summary: {len(product_irr_history)} product rows, {len(portfolio_irr_history)} date totals')
            result = {'success': True, 'data': {'product_irr_history': product_irr_history, 'portfolio_irr_history': portfolio_irr_history}}
            future.set_result(result)
            return result
        except Exception as e:
            logger.error(f'Error processing IRR history summary request {request_key}: {str(e)}')
            result = {'success': False, 'detail': f'Failed to process IRR history summary: {str(e)}'}
            future.set_result(result)
            return result
        finally:
            if request_key in _active_requests:
                del _active_requests[request_key]
    except Exception as e:
        logger.error(f'Error fetching IRR history summary: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to fetch IRR history summary: {str(e)}')

@router.get('/combined/{product_id}')
async def get_combined_historical_irr(product_id: int, limit: Optional[int]=Query(default=12, description='Maximum number of historical IRR records'), db=Depends(get_db)):
    """
    Get both portfolio-level and fund-level historical IRR data for a product.
    This is a convenience endpoint that combines both queries.
    """
    try:
        logger.info(f'Fetching combined historical IRR for product {product_id}')
        portfolio_data = await get_portfolio_historical_irr(product_id, limit, db)
        funds_data = await get_funds_historical_irr(product_id, limit, db)
        return {'product_id': product_id, 'portfolio_historical_irr': portfolio_data['portfolio_historical_irr'], 'funds_historical_irr': funds_data['funds_historical_irr'], 'portfolio_count': portfolio_data['count'], 'funds_count': funds_data['total_funds'], 'total_fund_records': funds_data['total_records']}
    except Exception as e:
        logger.error(f'Error fetching combined historical IRR for product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to fetch combined historical IRR: {str(e)}')