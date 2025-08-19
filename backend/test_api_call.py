import asyncio
import os
import sys

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import database
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_api_call():
    """Test the exact API call that the frontend makes for portfolio 157"""
    
    try:
        # Ensure pool is created
        if database._pool is None:
            await database.create_db_pool()
        print("*** TESTING PORTFOLIO 157 API CALL (Product 196) ***")
        print("=" * 70)
        
        portfolio_id = 157
        
        async with database._pool.acquire() as db:
            
            print("1. CHECKING PORTFOLIO EXISTS:")
            portfolio_result = await db.fetchrow("SELECT id FROM portfolios WHERE id = $1", portfolio_id)
            if portfolio_result:
                print(f"   Portfolio {portfolio_id} exists")
            else:
                print(f"   ERROR: Portfolio {portfolio_id} not found!")
                return
            
            print("\n2. GETTING PORTFOLIO FUNDS:")
            portfolio_funds_result = await db.fetch("SELECT id FROM portfolio_funds WHERE portfolio_id = $1", portfolio_id)
            portfolio_fund_ids = [fund["id"] for fund in portfolio_funds_result]
            print(f"   Found portfolio fund IDs: {portfolio_fund_ids}")
            
            print("\n3. TESTING ORIGINAL API QUERY (without timezone fix):")
            original_query = "SELECT * FROM holding_activity_log WHERE portfolio_fund_id = ANY($1::int[]) ORDER BY activity_timestamp DESC"
            original_result = await db.fetch(original_query, portfolio_fund_ids)
            
            # Look for the 3,000 investment
            investment_3000_original = None
            for row in original_result:
                if row['amount'] == 3000 and row['activity_type'] == 'Investment':
                    investment_3000_original = row
                    break
            
            if investment_3000_original:
                print(f"   FOUND 3,000 investment with original query:")
                print(f"   ID: {investment_3000_original['id']}")
                print(f"   UTC timestamp: {investment_3000_original['activity_timestamp']}")
                print(f"   UTC date: {investment_3000_original['activity_timestamp'].date()}")
                print(f"   UTC month: {investment_3000_original['activity_timestamp'].date().month}")
            else:
                print("   No 3,000 investment found with original query")
            
            print("\n4. TESTING NEW API QUERY (with timezone fix):")
            new_query = "SELECT *, DATE(activity_timestamp AT TIME ZONE 'Europe/London') as local_date FROM holding_activity_log WHERE portfolio_fund_id = ANY($1::int[]) ORDER BY activity_timestamp DESC"
            new_result = await db.fetch(new_query, portfolio_fund_ids)
            
            # Look for the 3,000 investment
            investment_3000_new = None
            for row in new_result:
                if row['amount'] == 3000 and row['activity_type'] == 'Investment':
                    investment_3000_new = row
                    break
            
            if investment_3000_new:
                print(f"   FOUND 3,000 investment with new query:")
                print(f"   ID: {investment_3000_new['id']}")
                print(f"   UTC timestamp: {investment_3000_new['activity_timestamp']}")
                print(f"   Local date: {investment_3000_new['local_date']}")
                print(f"   Local month: {investment_3000_new['local_date'].month}")
                
                if investment_3000_new['local_date'].month == 10:
                    print("   SUCCESS: Investment is in October (month 10)")
                else:
                    print(f"   ISSUE: Investment is in month {investment_3000_new['local_date'].month}, expected October")
            else:
                print("   No 3,000 investment found with new query")
            
            print("\n5. CHECKING ALL INVESTMENT ACTIVITIES:")
            investment_query = """
            SELECT id, activity_timestamp, 
                   DATE(activity_timestamp AT TIME ZONE 'Europe/London') as local_date,
                   amount, activity_type, portfolio_fund_id
            FROM holding_activity_log 
            WHERE portfolio_fund_id = ANY($1::int[]) 
            AND activity_type = 'Investment'
            ORDER BY activity_timestamp DESC
            """
            investment_result = await db.fetch(investment_query, portfolio_fund_ids)
            
            print(f"   Found {len(investment_result)} investment activities:")
            for inv in investment_result:
                utc_month = inv['activity_timestamp'].date().month
                local_month = inv['local_date'].month
                print(f"   Amount: {inv['amount']} | UTC month: {utc_month} | Local month: {local_month} | Date: {inv['local_date']}")
            
            print("\n6. CHECKING WHAT WOULD BE FILTERED OUT:")
            # Simulate frontend filtering by product start date (2019-10-15)
            product_start_date = "2019-10-15"
            from datetime import datetime
            start_date = datetime.strptime(product_start_date, "%Y-%m-%d").date()
            start_year_month = (start_date.year, start_date.month)
            
            print(f"   Product start date: {product_start_date} (Year-Month: {start_year_month})")
            print("   Activities that would be included/excluded:")
            
            for inv in investment_result:
                local_year_month = (inv['local_date'].year, inv['local_date'].month)
                utc_year_month = (inv['activity_timestamp'].date().year, inv['activity_timestamp'].date().month)
                
                if local_year_month >= start_year_month:
                    status_local = "INCLUDED (local date)"
                else:
                    status_local = "EXCLUDED (local date)"
                
                if utc_year_month >= start_year_month:
                    status_utc = "INCLUDED (UTC date)"
                else:
                    status_utc = "EXCLUDED (UTC date)"
                
                print(f"   Amount {inv['amount']}: {status_local} | {status_utc}")
                print(f"     Local: {inv['local_date']} ({local_year_month}) | UTC: {inv['activity_timestamp'].date()} ({utc_year_month})")
        
        print("\n" + "=" * 70)
        print("*** API CALL TESTING COMPLETE ***")
        
    except Exception as e:
        print(f"Testing error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_api_call())