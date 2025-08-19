import asyncio
import os
import sys

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import database
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_timezone_fix():
    """Test the timezone conversion fix for activity 1708"""
    
    try:
        # Ensure pool is created
        if database._pool is None:
            await database.create_db_pool()
        print("*** TESTING TIMEZONE FIX FOR ACTIVITY 1708 ***")
        print("=" * 60)
        
        async with database._pool.acquire() as db:
            
            print("1. CHECKING ACTIVITY 1708 (The problematic 3,000 investment):")
            
            # Original query (shows UTC conversion issue)
            original_query = """
            SELECT id, activity_timestamp, amount, product_id
            FROM holding_activity_log 
            WHERE id = 1708
            """
            original_result = await db.fetchrow(original_query)
            
            if original_result:
                print(f"   Original timestamp (UTC): {original_result['activity_timestamp']}")
                print(f"   Amount: {original_result['amount']}")
                print(f"   Product ID: {original_result['product_id']}")
            
            # Fixed query (with timezone conversion)
            fixed_query = """
            SELECT id, activity_timestamp, 
                   DATE(activity_timestamp AT TIME ZONE 'Europe/London') as local_date,
                   amount, product_id
            FROM holding_activity_log 
            WHERE id = 1708
            """
            fixed_result = await db.fetchrow(fixed_query)
            
            if fixed_result:
                print(f"   Local date (UK time): {fixed_result['local_date']}")
                
                # Check if the local date is in October (month 10)
                if fixed_result['local_date'].month == 10:
                    print("   SUCCESS: Local date is in October! This should now appear in Monthly Activities.")
                else:
                    print(f"   ISSUE: Local date is in month {fixed_result['local_date'].month}, expected October (10)")
            
            print("\n2. TESTING API ENDPOINT QUERY:")
            
            # Test the portfolio API query for portfolio 157
            portfolio_fund_ids = [864, 865, 866, 867, 868, 869, 870, 871, 872, 873]  # Portfolio 157 funds
            
            api_query = """
            SELECT *, DATE(activity_timestamp AT TIME ZONE 'Europe/London') as local_date 
            FROM holding_activity_log 
            WHERE portfolio_fund_id = ANY($1::int[]) 
            AND amount = 3000
            ORDER BY activity_timestamp DESC
            """
            api_result = await db.fetch(api_query, portfolio_fund_ids)
            
            if api_result:
                for row in api_result:
                    print(f"   Found 3,000 investment:")
                    print(f"   ID: {row['id']} | UTC timestamp: {row['activity_timestamp']}")
                    print(f"   Local date: {row['local_date']} | Month: {row['local_date'].month}")
                    print(f"   Portfolio Fund ID: {row['portfolio_fund_id']}")
            else:
                print("   No 3,000 investment found with API query")
        
        print("\n" + "=" * 60)
        print("*** TIMEZONE FIX TESTING COMPLETE ***")
        
    except Exception as e:
        print(f"Testing error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_timezone_fix())