import asyncio
import asyncpg

async def check_fund_964_irr():
    DATABASE_URL = 'postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal'
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        print('=== Fund 964 (Historical Funds) IRR Storage Check ===')
        
        # Check fund 964 stored IRR for April 2024
        result = await conn.fetch('''
            SELECT date, irr_result, fund_id, created_at
            FROM portfolio_fund_irr_values
            WHERE fund_id = 964 
            AND date = '2024-04-01'
            ORDER BY date DESC
        ''')
        
        print('Fund 964 - April 2024 stored IRR:')
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
            WHERE fund_id = 964 
            AND date BETWEEN '2024-01-01' AND '2024-12-31'
            ORDER BY date DESC
        ''')
        
        print()
        print('Fund 964 - All stored IRRs in 2024:')
        if all_irrs:
            print('  Found', len(all_irrs), 'stored fund IRRs in 2024:')
            for irr in all_irrs:
                print('    -', irr['date'], ':', irr['irr_result'], '%')
        else:
            print('  ❌ NO fund-level stored IRRs found for 2024')
            
        print()
        print('🎯 FINAL DIAGNOSIS:')
        if not result and not all_irrs:
            print('  ❌ Fund 964 has NO stored fund-level IRR data for April 2024')
            print('  ❌ Frontend shows -9.8% which is from dynamic calculation')
            print('  ❌ This violates stored IRR architecture')
            print('  ✅ Solution: Remove Historical Funds from dynamic calculation in IRRHistoryTab')
        elif result:
            print('  ✅ Fund 964 has stored IRR data - frontend should use this')
        else:
            print('  ⚠️  Fund 964 has some stored data but not for April 2024')
            print('  ✅ Solution: Show "-" for April 2024, not calculated value')
        
    except Exception as e:
        print('Error:', str(e))
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_fund_964_irr())