import asyncio
import os
import sys
from datetime import date

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import database
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_month_validation():
    """Test the updated month-based validation logic"""
    
    try:
        # Ensure pool is created
        if database._pool is None:
            await database.create_db_pool()
        print("*** TESTING MONTH-BASED VALIDATION LOGIC ***")
        print("=" * 60)
        
        # Test with portfolio fund 864 (Cash fund for product 196)
        # Product start date: 2019-10-15
        portfolio_fund_id = 864
        
        from app.api.routes.holding_activity_logs import validate_activity_date_against_product
        
        async with database._pool.acquire() as db:
            
            test_cases = [
                # (date, should_pass, description)
                (date(2019, 10, 1), True, "Same month as start date (beginning of month)"),
                (date(2019, 10, 15), True, "Exact start date"),
                (date(2019, 10, 31), True, "Same month as start date (end of month)"),
                (date(2019, 11, 1), True, "Month after start date"),
                (date(2019, 9, 30), False, "Month before start date (September)"),
                (date(2019, 8, 15), False, "Two months before start date"),
                (date(2020, 1, 1), True, "Year after start date"),
            ]
            
            for test_date, should_pass, description in test_cases:
                print(f"\nTesting: {test_date} - {description}")
                try:
                    await validate_activity_date_against_product(portfolio_fund_id, test_date, db)
                    if should_pass:
                        print("   PASS: Validation allowed (correct)")
                    else:
                        print("   FAIL: Validation should have blocked this date!")
                except Exception as e:
                    if not should_pass:
                        print("   PASS: Validation correctly blocked (correct)")
                    else:
                        print(f"   FAIL: Validation should have allowed this date! Error: {e}")
            
        print("\n" + "=" * 60)
        print("*** MONTH-BASED VALIDATION TESTING COMPLETE ***")
        
    except Exception as e:
        print(f"Testing error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_month_validation())