import asyncio
import asyncpg

async def check_table_structure():
    DATABASE_URL = 'postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal'
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        print('=== Checking Fund IRR Table Structure ===')
        
        # Check all tables with 'irr' in the name
        print('Tables with "irr" in the name:')
        irr_tables = await conn.fetch('''
            SELECT table_name
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE '%irr%'
            ORDER BY table_name
        ''')
        for table in irr_tables:
            print('  -', table['table_name'])
            
        # Check if there's a fund-level IRR table
        portfolio_fund_irr_exists = await conn.fetchval('''
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'portfolio_fund_irr_values'
            )
        ''')
        print()
        print('portfolio_fund_irr_values table exists:', portfolio_fund_irr_exists)
        
        if portfolio_fund_irr_exists:
            columns = await conn.fetch('''
                SELECT column_name, data_type
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'portfolio_fund_irr_values'
                ORDER BY ordinal_position
            ''')
            print('portfolio_fund_irr_values structure:')
            for col in columns:
                print('  -', col['column_name'], ':', col['data_type'])
        
    except Exception as e:
        print('Error:', str(e))
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_table_structure())