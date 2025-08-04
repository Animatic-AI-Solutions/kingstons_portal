import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()

async def fix_portfolio_sequence():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    print('🔧 FIXING PORTFOLIO SEQUENCE')
    print('='*30)
    
    # Get the current max ID
    max_id_result = await conn.fetchrow('SELECT MAX(id) as max_id FROM portfolios')
    max_id = max_id_result['max_id'] or 0
    next_id = max_id + 1
    
    print(f'📊 Current max portfolio ID: {max_id}')
    print(f'🎯 Setting sequence to: {next_id}')
    
    # Update the sequence to the correct value
    await conn.execute(f"SELECT setval(pg_get_serial_sequence('portfolios', 'id'), {next_id}, false)")
    
    # Verify the fix
    seq_result = await conn.fetchrow("SELECT nextval(pg_get_serial_sequence('portfolios', 'id')) as next_id")
    new_next_id = seq_result['next_id']
    
    print(f'✅ Sequence now set to: {new_next_id}')
    print('🎉 Portfolio creation should now work!')
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(fix_portfolio_sequence()) 