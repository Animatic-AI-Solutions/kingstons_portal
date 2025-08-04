import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()

async def debug_product_217():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    print('🔍 DEBUGGING PRODUCT 217 IRR LOOKUP')
    print('='*50)
    
    # 1. Check product 217 details
    product = await conn.fetchrow('SELECT id, portfolio_id, product_name FROM client_products WHERE id = 217')
    if product:
        print('✅ Product 217 found:')
        print('   - ID:', product['id'])
        print('   - Portfolio ID:', product['portfolio_id'])
        print('   - Name:', product['product_name'])
        portfolio_id = product['portfolio_id']
    else:
        print('❌ Product 217 not found!')
        await conn.close()
        return
    
    # 2. Check what IRR data exists for this portfolio
    irr_data = await conn.fetch('SELECT portfolio_id, date, irr_result FROM portfolio_historical_irr WHERE portfolio_id = $1 ORDER BY date DESC', portfolio_id)
    print('\n📊 IRR data for portfolio', portfolio_id, ':')
    for row in irr_data:
        print('   - Date:', row['date'], ', IRR:', row['irr_result'], '%')
    
    # 3. Test the exact query that's failing
    print('\n🔍 Testing the failing query with date 2025-03-01:')
    from datetime import datetime, timedelta
    normalized_date = datetime.strptime('2025-03-01', '%Y-%m-%d').date()
    next_day = normalized_date + timedelta(days=1)
    print('   - Looking for date >=', normalized_date, 'AND <', next_day)
    
    failing_query_result = await conn.fetchrow('''
        SELECT phi.irr_result FROM portfolio_historical_irr phi
        JOIN client_products cp ON phi.portfolio_id = cp.portfolio_id
        WHERE cp.id = $1 
          AND phi.date >= $2 
          AND phi.date < $3 
        ORDER BY phi.date DESC 
        LIMIT 1
    ''', 217, normalized_date, next_day)
    
    if failing_query_result:
        print('✅ Query found result:', failing_query_result['irr_result'], '%')
    else:
        print('❌ Query returned no results')
        
        # Let's see if the join is the problem
        print('\n🔍 Testing without date constraints:')
        join_test = await conn.fetchrow('''
            SELECT phi.portfolio_id, phi.date, phi.irr_result, cp.id as product_id
            FROM portfolio_historical_irr phi
            JOIN client_products cp ON phi.portfolio_id = cp.portfolio_id
            WHERE cp.id = $1 
            ORDER BY phi.date DESC 
            LIMIT 1
        ''', 217)
        
        if join_test:
            print('✅ Join works - Latest IRR:', join_test['irr_result'], '% on', join_test['date'])
        else:
            print('❌ Join itself is broken')
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(debug_product_217())