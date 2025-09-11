#!/usr/bin/env python3

import asyncio
import asyncpg
import os
from dotenv import load_dotenv
import urllib.request
import json

async def test_simple():
    try:
        load_dotenv()
        database_url = os.getenv('DATABASE_URL')
        conn = await asyncpg.connect(database_url)
        
        # Get all fund IDs
        all_funds = await conn.fetch("SELECT id FROM portfolio_funds ORDER BY id")
        active_funds = await conn.fetch("SELECT id FROM portfolio_funds WHERE status = 'active' ORDER BY id")
        
        all_fund_ids = [f['id'] for f in all_funds]
        active_fund_ids = [f['id'] for f in active_funds]
        
        print(f"Active funds: {len(active_fund_ids)}")
        print(f"Total funds: {len(all_fund_ids)}")
        print(f"Difference: {len(all_fund_ids) - len(active_fund_ids)} inactive funds")
        
        # Test 1: IRR with ALL funds (including inactive) - bypass cache
        print("\n=== Testing ALL funds with cache bypass ===")
        url = "http://127.0.0.1:8001/api/portfolio_funds/multiple/irr"
        data = {
            "portfolio_fund_ids": all_fund_ids,
            "bypass_cache": True
        }
        
        req = urllib.request.Request(url, 
                                   data=json.dumps(data).encode('utf-8'),
                                   headers={'Content-Type': 'application/json'})
        req.get_method = lambda: 'POST'
        
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode())
                all_funds_irr = result.get('irr_percentage', 0)
                print(f"IRR with ALL funds: {all_funds_irr:.6f}%")
                
        except Exception as e:
            print(f"Error with all funds: {e}")
            all_funds_irr = None
            
        # Test 2: IRR with only ACTIVE funds - bypass cache  
        print("\n=== Testing ACTIVE funds only with cache bypass ===")
        data2 = {
            "portfolio_fund_ids": active_fund_ids,
            "bypass_cache": True
        }
        
        req2 = urllib.request.Request(url, 
                                    data=json.dumps(data2).encode('utf-8'),
                                    headers={'Content-Type': 'application/json'})
        req2.get_method = lambda: 'POST'
        
        try:
            with urllib.request.urlopen(req2) as response:
                result = json.loads(response.read().decode())
                active_funds_irr = result.get('irr_percentage', 0)
                print(f"IRR with ACTIVE funds only: {active_funds_irr:.6f}%")
                
        except Exception as e:
            print(f"Error with active funds: {e}")
            active_funds_irr = None
            
        # Compare
        if all_funds_irr is not None and active_funds_irr is not None:
            print(f"\n=== COMPARISON ===")
            print(f"ALL funds IRR:    {all_funds_irr:.6f}%")
            print(f"ACTIVE funds IRR: {active_funds_irr:.6f}%")
            difference = all_funds_irr - active_funds_irr
            print(f"DIFFERENCE:       {difference:+.6f}%")
            
            if abs(difference) > 0.000001:
                print("✓ INACTIVE FUNDS ARE NOW INCLUDED - IRR changed!")
            else:
                print("✗ No difference detected - inactive funds may still be excluded")
        
        await conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_simple())