import asyncio
import asyncpg

async def check_schema():
    conn = await asyncpg.connect('postgresql://kingstons_user:Kingstons2024!@localhost:5432/kingstons_db')
    
    # Check the primary key constraint on available_portfolio_funds
    result = await conn.fetch('''
        SELECT 
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'available_portfolio_funds'
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
        ORDER BY tc.constraint_type, kcu.ordinal_position;
    ''')
    
    print('=== available_portfolio_funds constraints ===')
    for row in result:
        print(f'{row["constraint_name"]} ({row["constraint_type"]}): {row["column_name"]}')
    
    # Check table structure
    result2 = await conn.fetch('''
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'available_portfolio_funds'
        ORDER BY ordinal_position;
    ''')
    
    print('\n=== available_portfolio_funds structure ===')
    for row in result2:
        print(f'{row["column_name"]}: {row["data_type"]} (nullable: {row["is_nullable"]}, default: {row["column_default"]})')
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_schema())