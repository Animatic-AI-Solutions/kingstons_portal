import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()

async def check_portfolio_sequence():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    print('🔍 CHECKING PORTFOLIO SEQUENCE ISSUE')
    print('='*50)
    
    # Check current sequence value
    try:
        seq_result = await conn.fetchrow("SELECT nextval(pg_get_serial_sequence('portfolios', 'id')) as next_id")
        next_id = seq_result['next_id']
        print(f'📈 Next sequence ID will be: {next_id}')
    except Exception as e:
        print(f'❌ Error getting sequence: {e}')
        # Check if there's a sequence at all
        seq_check = await conn.fetch("SELECT * FROM information_schema.sequences WHERE sequence_name LIKE '%portfolio%'")
        print(f'🔍 Available sequences: {len(seq_check)}')
        for seq in seq_check:
            print(f'   - {seq["sequence_name"]}')
    
    # Check existing portfolio IDs
    existing_ids = await conn.fetch('SELECT id FROM portfolios ORDER BY id DESC LIMIT 10')
    print(f'\n📊 Last 10 portfolio IDs:')
    for row in existing_ids:
        print(f'   - ID: {row["id"]}')
    
    # Check if ID 8 exists
    id_8_check = await conn.fetchrow('SELECT id, portfolio_name FROM portfolios WHERE id = 8')
    if id_8_check:
        print(f'\n❌ ID 8 exists: {id_8_check["portfolio_name"]}')
    else:
        print(f'\n✅ ID 8 does not exist')
    
    # Check table structure
    table_info = await conn.fetch("""
        SELECT column_name, column_default, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'portfolios' AND column_name = 'id'
    """)
    for col in table_info:
        print(f'\n🏗️ Column info: {col["column_name"]} | Default: {col["column_default"]} | Nullable: {col["is_nullable"]}')
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(check_portfolio_sequence()) 