import asyncio
import asyncpg

async def check_fund_964_stored_irr():
    DATABASE_URL = 'postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal'
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        print('=== Checking Fund-Level IRR Storage for Fund 964 (Historical Funds) ===')
        
        # Check portfolio_fund_irr_values table for fund 964
        result = await conn.fetch('''
            SELECT date, irr_result, portfolio_fund_id, created_at
            FROM portfolio_fund_irr_values
            WHERE portfolio_fund_id = 964 
            AND date = '2024-04-01'
            ORDER BY date DESC
        ''')
        
        print('Fund 964 (Historical Funds) - April 2024 stored IRR:')
        if result:
            for row in result:
                print('  ✅ FOUND:', row['irr_result'], '% on', row['date'])
                print('  📅 Created:', row['created_at'])
        else:
            print('  ❌ NO fund-level stored IRR found for April 2024')
            
        # Check all stored IRRs for fund 964 in 2024
        all_irrs = await conn.fetch('''
            SELECT date, irr_result, created_at
            FROM portfolio_fund_irr_values
            WHERE portfolio_fund_id = 964 
            AND date BETWEEN '2024-01-01' AND '2024-12-31'
            ORDER BY date DESC
        ''')
        
        print()
        print('All stored IRRs for fund 964 in 2024:')
        if all_irrs:
            print('  Found', len(all_irrs), 'stored fund IRRs in 2024:')
            for irr in all_irrs:
                print('    -', irr['date'], ':', irr['irr_result'], '%')
        else:
            print('  ❌ NO fund-level stored IRRs found for 2024')
            
        print()
        print('🎯 CONCLUSION:')
        print('  Fund 964 (Historical Funds) should be treated like any other fund:')
        print('  - Check portfolio_fund_irr_values table for stored IRR data')
        print('  - If no stored IRR exists for April 2024, show "-"')
        print('  - Do NOT use dynamic IRR calculation for individual funds')
        
    except Exception as e:
        print('Error:', str(e))
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_fund_964_stored_irr())