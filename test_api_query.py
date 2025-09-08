#!/usr/bin/env python3
"""
Test the same SQL query that the /holding_activity_logs endpoint uses
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def test_api_query():
    load_dotenv()
    database_url = os.getenv('DATABASE_URL')
    
    try:
        conn = await asyncpg.connect(database_url)
        print("[OK] Connected to database")
        
        # Test the query for Product 217 fund IDs (1007, 1008, 1009)
        fund_ids = [1007, 1008, 1009]  # Product 217's fund IDs from our earlier check
        
        print("\nTesting the /holding_activity_logs endpoint query for each Product 217 fund:")
        print("="*70)
        
        for fund_id in fund_ids:
            print(f"\nFund ID: {fund_id}")
            print("-" * 30)
            
            # This is the same query the API endpoint uses
            query = """
            SELECT * FROM holding_activity_log 
            WHERE portfolio_fund_id = $1
            ORDER BY activity_timestamp DESC
            """
            
            result = await conn.fetch(query, fund_id)
            
            print(f"  Records found: {len(result)}")
            
            if result:
                # Analyze investment activity types
                investment_total = 0
                regular_investment_total = 0
                activity_summary = {}
                
                for row in result:
                    activity_type = row['activity_type']
                    amount = float(row['amount'])
                    
                    if activity_type not in activity_summary:
                        activity_summary[activity_type] = {'count': 0, 'total': 0}
                    
                    activity_summary[activity_type]['count'] += 1
                    activity_summary[activity_type]['total'] += amount
                    
                    if activity_type == 'Investment':
                        investment_total += amount
                    elif activity_type == 'RegularInvestment':
                        regular_investment_total += amount
                
                print(f"  Activity Types:")
                for activity_type, data in activity_summary.items():
                    if activity_type in ['Investment', 'RegularInvestment', 'TaxUplift']:
                        print(f"    {activity_type}: {data['count']} records, ${data['total']:,.2f}")
                
                print(f"  Investment Total: ${investment_total:,.2f}")
                print(f"  Regular Investment Total: ${regular_investment_total:,.2f}")
                print(f"  COMBINED INVESTMENT TOTAL: ${investment_total + regular_investment_total:,.2f}")
                
                # Show sample records
                print(f"  Sample records:")
                for i, row in enumerate(result[:3]):
                    print(f"    {i+1}. {row['activity_type']}: ${row['amount']} on {row['activity_timestamp']}")
            else:
                print("  No records found")
        
        await conn.close()
        print(f"\n[COMPLETE] Query testing complete!")
        
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    asyncio.run(test_api_query())