#!/usr/bin/env python3
"""
Test the /holding_activity_logs endpoint for Product 217 funds
"""

import asyncio
import aiohttp
import asyncpg
import os
from dotenv import load_dotenv

async def test_activity_logs():
    load_dotenv()
    database_url = os.getenv('DATABASE_URL')
    
    try:
        conn = await asyncpg.connect(database_url)
        print("[OK] Connected to database")
        
        # Get Product 217's portfolio fund IDs from database
        query = """
        SELECT pf.id as portfolio_fund_id, af.fund_name
        FROM client_products cp
        JOIN portfolios p ON cp.portfolio_id = p.id
        JOIN portfolio_funds pf ON p.id = pf.portfolio_id
        JOIN available_funds af ON pf.available_funds_id = af.id
        WHERE cp.id = 217;
        """
        result = await conn.fetch(query)
        fund_ids = [(row['portfolio_fund_id'], row['fund_name']) for row in result]
        
        print(f"\n[INFO] Product 217 has {len(fund_ids)} funds:")
        for fund_id, fund_name in fund_ids:
            print(f"  Fund ID {fund_id}: {fund_name}")
        
        await conn.close()
        
        # Test the API endpoint for each fund
        print("\n" + "="*60)
        print("TESTING /holding_activity_logs ENDPOINT")
        print("="*60)
        
        async with aiohttp.ClientSession() as session:
            for fund_id, fund_name in fund_ids:
                print(f"\nFund: {fund_name} (ID: {fund_id})")
                print("-" * 40)
                
                url = f"http://127.0.0.1:8001/holding_activity_logs?portfolio_fund_id={fund_id}"
                
                try:
                    async with session.get(url) as response:
                        if response.status == 200:
                            data = await response.json()
                            print(f"  Status: 200 OK")
                            print(f"  Records returned: {len(data)}")
                            
                            # Analyze activity types and amounts
                            if data:
                                activity_types = {}
                                total_investments = 0
                                
                                for log in data:
                                    activity_type = log.get('activity_type')
                                    amount = float(log.get('amount', 0))
                                    
                                    if activity_type not in activity_types:
                                        activity_types[activity_type] = {'count': 0, 'total': 0}
                                    
                                    activity_types[activity_type]['count'] += 1
                                    activity_types[activity_type]['total'] += amount
                                    
                                    if activity_type in ['Investment', 'RegularInvestment']:
                                        total_investments += amount
                                
                                print(f"  Investment Types Found:")
                                for activity_type, data in activity_types.items():
                                    if activity_type in ['Investment', 'RegularInvestment', 'TaxUplift']:
                                        print(f"    {activity_type}: {data['count']} records, ${data['total']:,.2f}")
                                
                                print(f"  TOTAL INVESTMENTS: ${total_investments:,.2f}")
                            else:
                                print("  No activity logs returned")
                        else:
                            print(f"  Status: {response.status} - {response.reason}")
                            error_text = await response.text()
                            print(f"  Error: {error_text[:200]}...")
                
                except Exception as e:
                    print(f"  Error calling API: {e}")
        
        print("\n[COMPLETE] API endpoint testing complete!")
        
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    asyncio.run(test_activity_logs())