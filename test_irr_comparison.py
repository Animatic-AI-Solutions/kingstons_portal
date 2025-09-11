#!/usr/bin/env python3

"""
Test script to compare IRR calculations with and without inactive funds
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv
import sys
import urllib.request
import json

# Add the backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

async def test_irr_comparison():
    try:
        # Load environment
        load_dotenv()
        database_url = os.getenv('DATABASE_URL')
        conn = await asyncpg.connect(database_url)
        
        print("=== IRR COMPARISON TEST ===")
        
        # Get fund IDs
        active_funds = await conn.fetch("SELECT id FROM portfolio_funds WHERE status = 'active'")
        all_funds = await conn.fetch("SELECT id FROM portfolio_funds")
        
        active_fund_ids = [dict(f)['id'] for f in active_funds]
        all_fund_ids = [dict(f)['id'] for f in all_funds]
        inactive_fund_ids = [fid for fid in all_fund_ids if fid not in active_fund_ids]
        
        print(f"Active funds: {len(active_fund_ids)}")
        print(f"Inactive funds: {len(inactive_fund_ids)}")
        print(f"Total funds: {len(all_fund_ids)}")
        
        # Import the IRR calculation function directly
        from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr
        from app.db.database import get_db
        
        # Test 1: Calculate IRR with ONLY active funds
        print("\n=== TEST 1: ACTIVE FUNDS ONLY ===")
        try:
            # Create a mock database connection
            db = await get_db().__anext__()
            
            active_irr_result = await calculate_multiple_portfolio_funds_irr(
                portfolio_fund_ids=active_fund_ids,
                irr_date=None,
                bypass_cache=True,
                db=db
            )
            
            active_irr = active_irr_result.get('irr_percentage', 0)
            print(f"IRR with active funds only: {active_irr:.6f}%")
            
        except Exception as e:
            print(f"Error calculating active-only IRR: {e}")
            active_irr = None
        
        # Test 2: Calculate IRR with ALL funds
        print("\n=== TEST 2: ALL FUNDS ===")
        try:
            all_irr_result = await calculate_multiple_portfolio_funds_irr(
                portfolio_fund_ids=all_fund_ids,
                irr_date=None,
                bypass_cache=True,
                db=db
            )
            
            all_irr = all_irr_result.get('irr_percentage', 0)
            print(f"IRR with all funds: {all_irr:.6f}%")
            
        except Exception as e:
            print(f"Error calculating all-funds IRR: {e}")
            all_irr = None
        
        # Compare results
        if active_irr is not None and all_irr is not None:
            print(f"\n=== COMPARISON ===")
            print(f"Active funds IRR: {active_irr:.6f}%")
            print(f"All funds IRR: {all_irr:.6f}%")
            
            difference = all_irr - active_irr
            print(f"Difference: {difference:+.6f}%")
            
            if abs(difference) < 0.000001:
                print("✓ IRR virtually identical - inactive funds have negligible impact")
                print("  This suggests inactive funds were either:")
                print("  - Small relative to total portfolio")
                print("  - Fully exited with balanced cash flows")  
                print("  - Short-term positions")
            elif difference < 0:
                print("✓ IRR decreased with inactive funds - includes poor performers")
            else:
                print("? IRR increased with inactive funds - unexpected")
        
        await conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_irr_comparison())