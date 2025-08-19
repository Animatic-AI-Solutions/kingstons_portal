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

async def investigate_product_196():
    """Investigate data inconsistency for product 196 IRR calculations"""
    
    try:
        # Ensure pool is created
        if database._pool is None:
            await database.create_db_pool()
        print("Successfully connected to database")
        print("=" * 80)
        
        # 1. Check basic product info
        print("1. PRODUCT 196 BASIC INFO:")
        product_results = await run_query("""
        SELECT cp.id, cp.product_name, cp.client_id, cp.status, cp.start_date, 
               cp.provider_id, cp.portfolio_id, cp.created_at
        FROM client_products cp 
        WHERE cp.id = 196
        """)
        
        if product_results:
            product_info = product_results[0]
            print(f"   Product ID: {product_info['id']}")
            print(f"   Product Name: {product_info['product_name']}")
            print(f"   Client ID: {product_info['client_id']}")
            print(f"   Status: {product_info['status']}")
            print(f"   Start Date: {product_info['start_date']}")
            print(f"   Portfolio ID: {product_info['portfolio_id']}")
            print(f"   Created: {product_info['created_at']}")
        else:
            print("   ERROR: Product 196 not found!")
            return
        
        print("\n" + "=" * 80)
        
        # 2. Check holding_activity_log for all activities for product 196
        print("2. HOLDING ACTIVITY LOG (All activities for product 196):")
        activities = await run_query("""
        SELECT hal.id, hal.activity_timestamp, hal.activity_type, hal.amount, 
               hal.product_id, hal.portfolio_fund_id, hal.created_at,
               pf.fund_name, af.provider_name
        FROM holding_activity_log hal
        LEFT JOIN portfolio_funds pf ON pf.id = hal.portfolio_fund_id
        LEFT JOIN available_funds af ON af.fund_name = pf.fund_name
        WHERE hal.product_id = 196 
        ORDER BY hal.activity_timestamp DESC, hal.created_at DESC
        LIMIT 20
        """)
        
        if activities:
            total_investment = 0
            cash_investment = 0
            for activity in activities:
                print(f"   ID: {activity['id']} | Date: {activity['activity_timestamp']} | Type: {activity['activity_type']}")
                print(f"   Amount: {activity['amount']} | Fund: {activity['fund_name']} | Provider: {activity['provider_name']}")
                cash_indicator = " (CASH)" if activity['fund_name'] and 'cash' in activity['fund_name'].lower() else ""
                if activity['amount'] == 3500:
                    print(f"   *** FOUND 3,500 AMOUNT!{cash_indicator} ***")
                print("   ---")
                if activity['activity_type'] and 'investment' in activity['activity_type'].lower():
                    total_investment += activity['amount'] or 0
                    if activity['fund_name'] and 'cash' in activity['fund_name'].lower():
                        cash_investment += activity['amount'] or 0
            print(f"   TOTAL INVESTMENTS: {total_investment}")
            print(f"   CASH INVESTMENTS: {cash_investment}")
        else:
            print("   No activities found in holding_activity_log")
        
        print("\n" + "=" * 80)
        
        # 3. Check specifically for 3,500 amounts
        print("3. ACTIVITIES with exactly 3,500 amount:")
        amount_3500_activities = await run_query("""
        SELECT hal.id, hal.activity_timestamp, hal.activity_type, hal.amount, 
               hal.product_id, pf.fund_name, af.provider_name
        FROM holding_activity_log hal
        LEFT JOIN portfolio_funds pf ON pf.id = hal.portfolio_fund_id
        LEFT JOIN available_funds af ON af.fund_name = pf.fund_name
        WHERE hal.product_id = 196 AND hal.amount = 3500
        ORDER BY hal.activity_timestamp DESC
        """)
        
        if amount_3500_activities:
            for activity in amount_3500_activities:
                print(f"   FOUND: ID {activity['id']} | Date: {activity['activity_timestamp']} | Type: {activity['activity_type']}")
                print(f"   Amount: {activity['amount']} | Fund: {activity['fund_name']} | Provider: {activity['provider_name']}")
                print("   ---")
        else:
            print("   No activities with exactly 3,500 amount found")
        
        print("\n" + "=" * 80)
        
        # 4. Check portfolio_fund_valuations for portfolio 157 (product 196's portfolio)
        print("4. PORTFOLIO FUND VALUATIONS (Portfolio 157 - Product 196):")
        valuations = await run_query("""
        SELECT pfv.id, pfv.valuation_date, pfv.fund_value, pfv.fund_name,
               pfv.portfolio_id
        FROM portfolio_fund_valuations pfv
        WHERE pfv.portfolio_id = 157
        AND (pfv.fund_name ILIKE '%cash%' OR pfv.fund_value = 3500)
        ORDER BY pfv.valuation_date DESC
        LIMIT 20
        """)
        
        if valuations:
            for val in valuations:
                marker = "*** 3500 ***" if val['fund_value'] == 3500 else "CASH" if 'cash' in val['fund_name'].lower() else "VALUE"
                print(f"   {marker} Date: {val['valuation_date']} | Value: {val['fund_value']} | Fund: {val['fund_name']}")
                print(f"   Portfolio ID: {val['portfolio_id']}")
                print("   ---")
        else:
            print("   No relevant fund valuations found")
        
        print("\n" + "=" * 80)
        
        # 5. Check portfolio 157 details and its funds
        print("5. PORTFOLIO 157 DETAILS (Product 196's portfolio):")
        portfolios = await run_query("""
        SELECT p.id, p.portfolio_name, p.status, p.start_date, p.created_at,
               COUNT(pf.id) as fund_count
        FROM portfolios p
        LEFT JOIN portfolio_funds pf ON pf.portfolio_id = p.id
        WHERE p.id = 157
        GROUP BY p.id, p.portfolio_name, p.status, p.start_date, p.created_at
        """)
        
        if portfolios:
            for portfolio in portfolios:
                print(f"   Portfolio ID: {portfolio['id']} | Name: {portfolio['portfolio_name']}")
                print(f"   Created: {portfolio['created_at']} | Fund Count: {portfolio['fund_count']}")
                
                # Get funds for this portfolio
                portfolio_funds = await run_query("""
                SELECT pf.id, pf.fund_name, af.provider_name,
                       SUM(pfv.fund_value) as total_value,
                       COUNT(pfv.id) as valuation_count
                FROM portfolio_funds pf
                LEFT JOIN available_funds af ON af.fund_name = pf.fund_name
                LEFT JOIN portfolio_fund_valuations pfv ON pfv.portfolio_id = pf.portfolio_id AND pfv.fund_name = pf.fund_name
                WHERE pf.portfolio_id = $1
                GROUP BY pf.id, pf.fund_name, af.provider_name
                ORDER BY pf.fund_name
                """, (portfolio['id'],))
                
                for fund in portfolio_funds:
                    cash_indicator = "CASH" if 'cash' in fund['fund_name'].lower() else ""
                    print(f"     Fund: {fund['fund_name']} {cash_indicator}")
                    print(f"     Provider: {fund['provider_name']} | Total Value: {fund['total_value']} | Valuations: {fund['valuation_count']}")
                print("   ===")
        else:
            print("   No portfolios found for product 196")
        
        print("\n" + "=" * 80)
        
        # 6. IRR-related tables check
        print("6. IRR VALUES for portfolio 157 (product 196):")
        irr_values = await run_query("""
        SELECT piv.id, piv.portfolio_id, piv.irr_value, piv.calculation_date
        FROM portfolio_irr_values piv
        WHERE piv.portfolio_id = 157
        ORDER BY piv.calculation_date DESC
        LIMIT 10
        """)
        
        if irr_values:
            for irr in irr_values:
                print(f"   Portfolio ID: {irr['portfolio_id']} | IRR Value: {irr['irr_value']} | Date: {irr['calculation_date']}")
                print("   ---")
        else:
            print("   No IRR values found for portfolio 157")
        
        print("\n" + "=" * 80)
        print("INVESTIGATION COMPLETE")
        print("Summary: Searched for product 196 data across all relevant tables")
        print("Focus: Cash funds and 3,500 amounts in activities and valuations")
        
    except Exception as e:
        print(f"Investigation error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(investigate_product_196())