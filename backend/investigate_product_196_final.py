import asyncio
import os
import sys
from datetime import datetime
from typing import Dict, List, Any

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import database
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def run_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute a query and return results as list of dictionaries"""
    try:
        # Ensure pool is created
        if database._pool is None:
            await database.create_db_pool()
        
        # Acquire connection from pool
        async with database._pool.acquire() as conn:
            # Execute query
            rows = await conn.fetch(query, *params)
            # Convert to list of dictionaries
            results = [dict(row) for row in rows]
            return results
    except Exception as e:
        print(f"Error executing query: {e}")
        return []

async def investigate_product_196_final():
    """Investigate data inconsistency for product 196 IRR calculations - FINAL VERSION"""
    
    try:
        # Ensure pool is created
        if database._pool is None:
            await database.create_db_pool()
        print("*** FINAL INVESTIGATION FOR PRODUCT 196 - IRR DATA INCONSISTENCY ***")
        print("=" * 80)
        
        # 1. Product 196 basic info
        print("1. PRODUCT 196 DETAILS:")
        product_results = await run_query("""
        SELECT cp.id, cp.product_name, cp.client_id, cp.status, cp.start_date, 
               cp.provider_id, cp.portfolio_id, cp.created_at
        FROM client_products cp 
        WHERE cp.id = 196
        """)
        
        if product_results:
            product = product_results[0]
            print(f"   ID: {product['id']} | Name: {product['product_name']}")
            print(f"   Client ID: {product['client_id']} | Portfolio ID: {product['portfolio_id']}")
            print(f"   Status: {product['status']} | Start: {product['start_date']}")
            portfolio_id = product['portfolio_id']
        else:
            print("   ERROR: Product 196 not found!")
            return
        
        print("\n" + "=" * 80)
        
        # 2. Check all holding activities for product 196 (correct schema)
        print("2. HOLDING ACTIVITY LOG for product 196:")
        activities = await run_query("""
        SELECT hal.id, hal.activity_timestamp, hal.activity_type, hal.amount, 
               hal.product_id, hal.portfolio_fund_id, hal.created_at,
               af.fund_name, af.risk_factor
        FROM holding_activity_log hal
        LEFT JOIN portfolio_funds pf ON pf.id = hal.portfolio_fund_id
        LEFT JOIN available_funds af ON af.id = pf.available_funds_id
        WHERE hal.product_id = 196 
        ORDER BY hal.activity_timestamp DESC, hal.created_at DESC
        LIMIT 30
        """)
        
        if activities:
            print(f"   FOUND {len(activities)} activities:")
            total_investment = 0
            cash_investment = 0
            three_five_hundred_found = False
            
            for activity in activities:
                cash_indicator = " (CASH FUND)" if activity['fund_name'] and 'cash' in activity['fund_name'].lower() else ""
                amount_str = f"{activity['amount']}"
                
                if activity['amount'] == 3500:
                    amount_str += " *** THIS IS THE 3,500 INVESTMENT! ***"
                    three_five_hundred_found = True
                
                print(f"   [{activity['activity_timestamp']}] {activity['activity_type']}")
                print(f"   Amount: {amount_str} | Fund: {activity['fund_name']}{cash_indicator}")
                print(f"   Activity ID: {activity['id']} | Portfolio Fund ID: {activity['portfolio_fund_id']}")
                print("   ---")
                
                if activity['activity_type'] and 'investment' in activity['activity_type'].lower():
                    total_investment += activity['amount'] or 0
                    if activity['fund_name'] and 'cash' in activity['fund_name'].lower():
                        cash_investment += activity['amount'] or 0
            
            print(f"\n   SUMMARY:")
            print(f"   Total activities: {len(activities)}")
            print(f"   Total investments: {total_investment}")
            print(f"   Cash investments: {cash_investment}")
            print(f"   3,500 amount found: {'YES' if three_five_hundred_found else 'NO'}")
        else:
            print("   No activities found for product 196")
        
        print("\n" + "=" * 80)
        
        # 3. Check portfolio fund valuations (correct schema)
        print(f"3. PORTFOLIO FUND VALUATIONS for portfolio {portfolio_id}:")
        
        # First get the portfolio fund IDs for this portfolio
        portfolio_funds = await run_query("""
        SELECT pf.id, pf.portfolio_id, pf.available_funds_id, pf.target_weighting,
               pf.amount_invested, af.fund_name, af.risk_factor
        FROM portfolio_funds pf
        JOIN available_funds af ON af.id = pf.available_funds_id
        WHERE pf.portfolio_id = $1
        ORDER BY af.fund_name
        """, (portfolio_id,))
        
        print(f"   Portfolio has {len(portfolio_funds)} funds:")
        cash_fund_ids = []
        
        for fund in portfolio_funds:
            cash_indicator = " (CASH)" if 'cash' in fund['fund_name'].lower() else ""
            print(f"   Fund ID: {fund['id']} | {fund['fund_name']}{cash_indicator}")
            print(f"   Target: {fund['target_weighting']}% | Invested: {fund['amount_invested']}")
            if 'cash' in fund['fund_name'].lower():
                cash_fund_ids.append(fund['id'])
            print("   ---")
        
        # Now check valuations for these funds
        if portfolio_funds:
            print(f"\n   CHECKING VALUATIONS (looking for 3,500):")
            for pf in portfolio_funds:
                valuations = await run_query("""
                SELECT pfv.id, pfv.portfolio_fund_id, pfv.valuation_date, pfv.valuation,
                       pfv.created_at
                FROM portfolio_fund_valuations pfv
                WHERE pfv.portfolio_fund_id = $1
                AND pfv.valuation = 3500
                ORDER BY pfv.valuation_date DESC
                """, (pf['id'],))
                
                if valuations:
                    for val in valuations:
                        print(f"   *** FOUND 3,500 VALUATION! ***")
                        print(f"   Fund: {pf['fund_name']} (Portfolio Fund ID: {val['portfolio_fund_id']})")
                        print(f"   Date: {val['valuation_date']} | Value: {val['valuation']}")
                        print(f"   Created: {val['created_at']}")
                        print("   ---")
        
        print("\n" + "=" * 80)
        
        # 4. Check IRR values (correct schema)
        print(f"4. IRR VALUES for portfolio {portfolio_id}:")
        irr_values = await run_query("""
        SELECT piv.id, piv.portfolio_id, piv.date, piv.irr_result, piv.created_at
        FROM portfolio_irr_values piv
        WHERE piv.portfolio_id = $1
        ORDER BY piv.date DESC
        LIMIT 10
        """, (portfolio_id,))
        
        if irr_values:
            for irr in irr_values:
                print(f"   Date: {irr['date']} | IRR: {irr['irr_result']} | Created: {irr['created_at']}")
        else:
            print("   No IRR values found")
        
        print("\n" + "=" * 80)
        
        # 5. SUMMARY ANALYSIS
        print("5. DATA INCONSISTENCY ANALYSIS:")
        print("   ISSUE: Period overview shows 3,500 cash investment but monthly activities don't")
        print("\n   FINDINGS:")
        
        if activities and any(a['amount'] == 3500 for a in activities):
            print("   [YES] Found 3,500 amount in holding_activity_log")
        else:
            print("   [NO] No 3,500 amount found in holding_activity_log")
        
        # Check if any valuations have 3,500
        all_valuations_3500 = []
        if portfolio_funds:
            for pf in portfolio_funds:
                vals = await run_query("""
                SELECT COUNT(*) as count FROM portfolio_fund_valuations pfv
                WHERE pfv.portfolio_fund_id = $1 AND pfv.valuation = 3500
                """, (pf['id'],))
                if vals and vals[0]['count'] > 0:
                    all_valuations_3500.append(pf['fund_name'])
        
        if all_valuations_3500:
            print(f"   ✓ Found 3,500 valuations in: {', '.join(all_valuations_3500)}")
        else:
            print("   ✗ No 3,500 valuations found")
        
        print("\n   NEXT STEPS:")
        print("   1. Check which data source the Period Overview table uses")
        print("   2. Check which data source the Monthly Activities table uses")
        print("   3. Compare the two data sources to identify the discrepancy")
        
        print("\n" + "=" * 80)
        print("*** INVESTIGATION COMPLETE ***")
        
    except Exception as e:
        print(f"Investigation error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(investigate_product_196_final())