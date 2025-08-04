import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()

async def check_table_structure():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    print('🔍 CHECKING template_generation_weighted_risk TABLE')
    print('='*50)
    
    # Check if table exists
    table_exists = await conn.fetchrow("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'template_generation_weighted_risk'
        )
    """)
    
    if table_exists['exists']:
        print('✅ Table exists')
        
        # Get column information
        columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'template_generation_weighted_risk'
            ORDER BY ordinal_position
        """)
        
        print(f'📊 Table has {len(columns)} columns:')
        for col in columns:
            print(f'   - {col["column_name"]} ({col["data_type"]}) - Nullable: {col["is_nullable"]}')
            
        # Check row count
        row_count = await conn.fetchrow('SELECT COUNT(*) FROM template_generation_weighted_risk')
        print(f'\n📈 Row count: {row_count["count"]}')
        
    else:
        print('❌ Table does not exist')
        
        # Check for similar table names
        similar_tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE '%template%' OR table_name LIKE '%generation%' OR table_name LIKE '%risk%'
            ORDER BY table_name
        """)
        
        print(f'\n🔍 Similar table names found: {len(similar_tables)}')
        for table in similar_tables:
            print(f'   - {table["table_name"]}')
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(check_table_structure()) 