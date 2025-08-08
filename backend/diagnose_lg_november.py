import asyncio
import asyncpg
import sys
import os
from datetime import datetime

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db import database

async def diagnose_lg_november():
    """Diagnose L&G fund valuation and IRR status for November"""
    
    # Initialize database connection
    await database.create_db_pool()
    
    try:
        async with database._pool.acquire() as db:
            print("🔍 Diagnosing L&G fund for November...")
            
            # Find L&G fund in portfolio 193
            lg_fund = await db.fetchrow("""
                SELECT pf.id as portfolio_fund_id, af.fund_name, pf.portfolio_id
                FROM portfolio_funds pf
                JOIN available_funds af ON af.id = pf.available_funds_id
                WHERE pf.portfolio_id = 193 
                AND af.fund_name LIKE '%L&G%'
            """)
            
            if not lg_fund:
                print("❌ L&G fund not found in portfolio 193")
                return
                
            print(f"✅ Found L&G fund: {lg_fund['fund_name']} (Portfolio Fund ID: {lg_fund['portfolio_fund_id']})")
            
            # Check November 2024 valuation
            november_valuation = await db.fetchrow("""
                SELECT * FROM portfolio_fund_valuations 
                WHERE portfolio_fund_id = $1 
                AND valuation_date = '2024-11-01'
                ORDER BY created_at DESC
                LIMIT 1
            """, lg_fund['portfolio_fund_id'])
            
            if november_valuation:
                print(f"✅ November 2024 valuation found:")
                print(f"   Value: {november_valuation['valuation']}")
                print(f"   Date: {november_valuation['valuation_date']}")
                print(f"   Created: {november_valuation['created_at']}")
                if 'updated_at' in november_valuation and november_valuation['updated_at']:
                    print(f"   Updated: {november_valuation['updated_at']}")
                else:
                    print(f"   Updated: Not updated")
            else:
                print("❌ No November 2024 valuation found for L&G fund")
                
            # Check November 2024 IRR
            november_irr = await db.fetchrow("""
                SELECT * FROM portfolio_fund_irr_values 
                WHERE fund_id = $1 
                AND date = '2024-11-01'
                ORDER BY created_at DESC
                LIMIT 1
            """, lg_fund['portfolio_fund_id'])
            
            if november_irr:
                print(f"✅ November 2024 IRR found:")
                print(f"   IRR: {november_irr['irr_result']}%")
                print(f"   Date: {november_irr['date']}")
                print(f"   Created: {november_irr['created_at']}")
                if 'updated_at' in november_irr and november_irr['updated_at']:
                    print(f"   Updated: {november_irr['updated_at']}")
                else:
                    print(f"   Updated: Not updated")
            else:
                print("❌ No November 2024 IRR found for L&G fund")
                
            # Check latest valuation from view
            latest_valuation = await db.fetchrow("""
                SELECT * FROM latest_portfolio_fund_valuations 
                WHERE portfolio_fund_id = $1
            """, lg_fund['portfolio_fund_id'])
            
            if latest_valuation:
                print(f"✅ Latest valuation from view:")
                print(f"   Value: {latest_valuation['valuation']}")
                print(f"   Date: {latest_valuation['valuation_date']}")
            else:
                print("❌ No latest valuation found in view")
                
            # Check latest IRR from view
            latest_irr = await db.fetchrow("""
                SELECT * FROM latest_portfolio_fund_irr_values 
                WHERE fund_id = $1
            """, lg_fund['portfolio_fund_id'])
            
            if latest_irr:
                print(f"✅ Latest IRR from view:")
                print(f"   IRR: {latest_irr['irr_result']}%")
                print(f"   Date: {latest_irr['date']}")
            else:
                print("❌ No latest IRR found in view")
                
            # Check all valuations for this fund
            all_valuations = await db.fetch("""
                SELECT valuation_date, valuation, created_at
                FROM portfolio_fund_valuations 
                WHERE portfolio_fund_id = $1 
                ORDER BY valuation_date DESC
            """, lg_fund['portfolio_fund_id'])
            
            print(f"\n📊 All valuations for L&G fund ({len(all_valuations)} total):")
            for val in all_valuations:
                print(f"   {val['valuation_date']}: {val['valuation']} (created: {val['created_at']})")
                
            # Check all IRRs for this fund
            all_irrs = await db.fetch("""
                SELECT date, irr_result, created_at
                FROM portfolio_fund_irr_values 
                WHERE fund_id = $1 
                ORDER BY date DESC
            """, lg_fund['portfolio_fund_id'])
            
            print(f"\n📈 All IRRs for L&G fund ({len(all_irrs)} total):")
            for irr in all_irrs:
                print(f"   {irr['date']}: {irr['irr_result']}% (created: {irr['created_at']})")
                
            # Check portfolio completeness for November 2024
            portfolio_funds = await db.fetch("""
                SELECT pf.id, af.fund_name, 
                       pfv.valuation, pfv.valuation_date,
                       CASE WHEN pfv.valuation IS NOT NULL THEN 'HAS_VALUATION' ELSE 'NO_VALUATION' END as status
                FROM portfolio_funds pf
                JOIN available_funds af ON af.id = pf.available_funds_id
                LEFT JOIN portfolio_fund_valuations pfv ON pfv.portfolio_fund_id = pf.id 
                    AND pfv.valuation_date = '2024-11-01'
                WHERE pf.portfolio_id = 193
                ORDER BY af.fund_name
            """)
            
            print(f"\n🎯 Portfolio 193 completeness for November 2024:")
            funds_with_valuation = 0
            for fund in portfolio_funds:
                status = "✅" if fund['status'] == 'HAS_VALUATION' else "❌"
                print(f"   {status} {fund['fund_name']}: {fund['valuation'] if fund['valuation'] else 'NO VALUATION'}")
                if fund['status'] == 'HAS_VALUATION':
                    funds_with_valuation += 1
                    
            print(f"\nCompleteness: {funds_with_valuation}/{len(portfolio_funds)} funds have November 2024 valuations")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await database._pool.close()

if __name__ == "__main__":
    asyncio.run(diagnose_lg_november())
