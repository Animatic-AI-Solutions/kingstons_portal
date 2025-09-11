#!/usr/bin/env python3

"""
Test script to document and verify zero valuation behavior in IRR calculations
across all system usages before making any changes to core function.

This ensures we understand current behavior and can verify any changes
don't break existing functionality across the site.
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv
import sys
import json

# Add the backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

async def test_zero_valuation_behavior():
    try:
        # Load environment
        load_dotenv()
        database_url = os.getenv('DATABASE_URL')
        conn = await asyncpg.connect(database_url)
        
        print("=== ZERO VALUATION BEHAVIOR TEST ===" + "="*20)
        
        # Import required modules
        from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr
        from app.db.database import get_db
        
        # Create database connection
        db = await get_db().__anext__()
        
        # Get fund data for analysis
        all_funds = await conn.fetch("""
            SELECT id, status, name, 
                   COALESCE((SELECT SUM(valuation) FROM portfolio_fund_valuations pfv 
                            WHERE pfv.portfolio_fund_id = pf.id 
                            AND pfv.valuation_date = (
                                SELECT MAX(valuation_date) FROM portfolio_fund_valuations 
                                WHERE portfolio_fund_id = pf.id
                            )), 0) as latest_valuation
            FROM portfolio_funds pf
            ORDER BY status, name
        """)
        
        active_funds = [f for f in all_funds if f['status'] == 'active']
        inactive_funds = [f for f in all_funds if f['status'] != 'active']
        zero_val_active = [f for f in active_funds if f['latest_valuation'] == 0]
        zero_val_inactive = [f for f in inactive_funds if f['latest_valuation'] == 0]
        
        print(f"Total funds: {len(all_funds)}")
        print(f"Active funds: {len(active_funds)}")
        print(f"Inactive funds: {len(inactive_funds)}")
        print(f"Active funds with £0 valuation: {len(zero_val_active)}")
        print(f"Inactive funds with £0 valuation: {len(zero_val_inactive)}")
        
        # Test Case 1: Current behavior - active funds only
        print(f"\n{'='*15} TEST CASE 1: CURRENT BEHAVIOR {'='*15}")
        print("Testing current analytics.py behavior (active funds only)")
        
        active_fund_ids = [f['id'] for f in active_funds]
        try:
            result1 = await calculate_multiple_portfolio_funds_irr(
                portfolio_fund_ids=active_fund_ids,
                irr_date=None,
                bypass_cache=True,
                db=db
            )
            
            print(f"✓ Active funds IRR: {result1.get('irr_percentage', 0):.6f}%")
            print(f"  Funds processed: {len(active_fund_ids)}")
            print(f"  Zero-val active funds that would be excluded: {len(zero_val_active)}")
            
        except Exception as e:
            print(f"✗ Error with active funds: {e}")
            result1 = None
        
        # Test Case 2: All funds behavior (proposed change)
        print(f"\n{'='*15} TEST CASE 2: ALL FUNDS BEHAVIOR {'='*15}")
        print("Testing proposed behavior (all funds including inactive)")
        
        all_fund_ids = [f['id'] for f in all_funds]
        try:
            result2 = await calculate_multiple_portfolio_funds_irr(
                portfolio_fund_ids=all_fund_ids,
                irr_date=None,
                bypass_cache=True,
                db=db
            )
            
            print(f"✓ All funds IRR: {result2.get('irr_percentage', 0):.6f}%")
            print(f"  Funds processed: {len(all_fund_ids)}")
            print(f"  Zero-val funds that would be excluded: {len(zero_val_active) + len(zero_val_inactive)}")
            
        except Exception as e:
            print(f"✗ Error with all funds: {e}")
            result2 = None
        
        # Test Case 3: Specific zero valuation fund test
        print(f"\n{'='*15} TEST CASE 3: ZERO VALUATION EXCLUSION TEST {'='*15}")
        
        if zero_val_inactive:
            # Test with just zero-valuation inactive funds
            zero_val_ids = [f['id'] for f in zero_val_inactive[:5]]  # Test first 5
            try:
                result3 = await calculate_multiple_portfolio_funds_irr(
                    portfolio_fund_ids=zero_val_ids,
                    irr_date=None,
                    bypass_cache=True,
                    db=db
                )
                
                print(f"Zero-valuation funds test:")
                print(f"  Fund IDs tested: {zero_val_ids}")
                print(f"  IRR result: {result3.get('irr_percentage', 'N/A')}")
                print(f"  Expected: Should be excluded due to zero valuation filter")
                
            except Exception as e:
                print(f"✗ Error with zero-val funds: {e}")
        
        # Test Case 4: Historical activity verification for inactive funds
        print(f"\n{'='*15} TEST CASE 4: HISTORICAL ACTIVITY VERIFICATION {'='*15}")
        
        if inactive_funds:
            # Check if inactive funds have historical activities
            inactive_activities = await conn.fetch("""
                SELECT pf.id, pf.name, pf.status,
                       COUNT(hal.id) as activity_count,
                       SUM(hal.cash_amount) as total_cash_flow
                FROM portfolio_funds pf
                LEFT JOIN holding_activity_log hal ON hal.portfolio_fund_id = pf.id
                WHERE pf.status != 'active'
                GROUP BY pf.id, pf.name, pf.status
                HAVING COUNT(hal.id) > 0
                ORDER BY total_cash_flow DESC
                LIMIT 10
            """)
            
            print("Top 10 inactive funds by historical activity:")
            total_inactive_cash = 0
            for activity in inactive_activities:
                cash_flow = activity['total_cash_flow'] or 0
                total_inactive_cash += cash_flow
                print(f"  {activity['name']}: {activity['activity_count']} activities, £{cash_flow:,.2f} cash flow")
            
            print(f"\nTotal cash flow from inactive funds: £{total_inactive_cash:,.2f}")
            print("^ This represents historical performance data being excluded")
        
        # Test Case 5: Function behavior analysis
        print(f"\n{'='*15} TEST CASE 5: FUNCTION BEHAVIOR ANALYSIS {'='*15}")
        
        # Read the actual function to document current logic
        print("Current zero valuation logic in calculate_multiple_portfolio_funds_irr:")
        print("  Line ~712: if total_valuation > 0:")
        print("    This excludes ANY fund with £0 current valuation")
        print("    Impact: Inactive funds (fully exited) are excluded from IRR")
        print("    Business impact: Historical performance not reflected in IRR")
        
        # Summary and recommendations
        print(f"\n{'='*20} SUMMARY AND ANALYSIS {'='*20}")
        
        if result1 and result2:
            if abs(result1['irr_percentage'] - result2['irr_percentage']) < 0.000001:
                print("⚠️  IRR identical despite including inactive funds")
                print("   This confirms zero valuation filter is excluding inactive funds")
            else:
                print(f"✓ IRR difference detected: {result2['irr_percentage'] - result1['irr_percentage']:+.6f}%")
        
        print(f"\nCurrent system behavior:")
        print(f"  - Zero valuation filter excludes {len(zero_val_inactive)} inactive funds")
        print(f"  - £{total_inactive_cash:,.2f} in historical cash flows ignored")
        print(f"  - This affects historical accuracy of company-wide IRR")
        
        print(f"\nRecommendations:")
        print(f"  1. Modify zero valuation logic to include funds with historical activities")
        print(f"  2. Test across all 8+ usage locations before deployment")
        print(f"  3. Consider separate logic for company-wide vs fund-specific IRR")
        
        await conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_zero_valuation_behavior())