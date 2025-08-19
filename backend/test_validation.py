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

async def test_validation():
    """Test the new validation logic"""
    
    try:
        # Ensure pool is created
        if database._pool is None:
            await database.create_db_pool()
        print("*** TESTING VALIDATION LOGIC ***")
        print("=" * 60)
        
        # Test with portfolio fund 864 (Cash fund for product 196)
        portfolio_fund_id = 864
        
        # Import validation function
        from app.api.routes.holding_activity_logs import validate_activity_date_against_product, log_out_of_range_activity_warning
        
        async with database._pool.acquire() as db:
            
            print("1. TESTING VALID DATE (after product start date):")
            try:
                valid_date = date(2019, 10, 20)  # After product start date (2019-10-15)
                await validate_activity_date_against_product(portfolio_fund_id, valid_date, db)
                print("   ✅ Valid date validation passed")
            except Exception as e:
                print(f"   ❌ Valid date validation failed: {e}")
            
            print("\n2. TESTING INVALID DATE (before product start date):")
            try:
                invalid_date = date(2019, 9, 30)  # Before product start date (2019-10-15)  
                await validate_activity_date_against_product(portfolio_fund_id, invalid_date, db)
                print("   ❌ Invalid date validation should have failed!")
            except Exception as e:
                print(f"   ✅ Invalid date validation correctly failed: {e}")
            
            print("\n3. TESTING WARNING FUNCTION:")
            print("   Testing with out-of-range date (2019-09-30):")
            await log_out_of_range_activity_warning(portfolio_fund_id, date(2019, 9, 30), db)
            
            print("   Testing with valid date (2019-10-20):")
            await log_out_of_range_activity_warning(portfolio_fund_id, date(2019, 10, 20), db)
            
        print("\n" + "=" * 60)
        print("*** VALIDATION TESTING COMPLETE ***")
        
    except Exception as e:
        print(f"Testing error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_validation())