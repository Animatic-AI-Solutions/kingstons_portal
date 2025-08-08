import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import database
from datetime import datetime, date

async def debug_portfolio_irr_race():
    """Debug the portfolio IRR race condition issue"""
    
    # Initialize database connection
    await database.create_db_pool()
    
    try:
        portfolio_id = 193
        test_date = date(2025, 7, 1)
        test_irr = 6.2
        
        print(f"🔍 Debugging portfolio IRR race condition for portfolio {portfolio_id} on {test_date}")
        
        # Check if there's already a record
        check_query = """
        SELECT id, portfolio_id, date, irr_result, created_at, portfolio_valuation_id
        FROM portfolio_irr_values
        WHERE portfolio_id = $1 AND date = $2
        """
        
        existing = await database._pool.fetch(check_query, portfolio_id, test_date)
        
        if existing:
            print(f"✅ Found existing portfolio IRR record:")
            for record in existing:
                print(f"   📊 ID: {record['id']}, IRR: {record['irr_result']}%, Created: {record['created_at']}")
                print(f"   📊 Portfolio Valuation ID: {record['portfolio_valuation_id']}")
        else:
            print("❌ No existing portfolio IRR record found")
            
        # Check if there's a portfolio valuation for this date
        print(f"\n🔍 Checking for portfolio valuation on {test_date}...")
        valuation_query = """
        SELECT id, portfolio_id, valuation_date, valuation, created_at
        FROM portfolio_valuations
        WHERE portfolio_id = $1 AND valuation_date = $2
        """
        
        valuations = await database._pool.fetch(valuation_query, portfolio_id, test_date)
        
        if valuations:
            print(f"✅ Found portfolio valuation:")
            for val in valuations:
                print(f"   💰 ID: {val['id']}, Value: {val['valuation']}, Created: {val['created_at']}")
        else:
            print("❌ No portfolio valuation found for this date")
            
        # Try to manually insert/update a portfolio IRR record to test the mechanism
        print(f"\n🧪 Testing manual portfolio IRR insert/update...")
        
        try:
            # First, try to insert
            insert_query = """
            INSERT INTO portfolio_irr_values (portfolio_id, date, irr_result, portfolio_valuation_id, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            """
            
            portfolio_valuation_id = valuations[0]['id'] if valuations else None
            
            await database._pool.execute(insert_query, portfolio_id, test_date, test_irr, portfolio_valuation_id)
            print(f"✅ Successfully inserted portfolio IRR: {test_irr}%")
            
        except Exception as insert_error:
            if "duplicate key" in str(insert_error).lower():
                print(f"⚠️ Duplicate key error (expected): {insert_error}")
                print("🔄 Attempting UPDATE...")
                
                # Try the UPDATE that failed in the race condition
                update_query = """
                UPDATE portfolio_irr_values 
                SET irr_result = $1, portfolio_valuation_id = $2 
                WHERE portfolio_id = $3 AND date = $4
                """
                
                result = await database._pool.execute(update_query, test_irr, portfolio_valuation_id, portfolio_id, test_date)
                print(f"✅ UPDATE result: {result}")
                
                # Check if the update actually worked
                updated_records = await database._pool.fetch(check_query, portfolio_id, test_date)
                if updated_records:
                    print(f"✅ UPDATE successful, new value: {updated_records[0]['irr_result']}%")
                else:
                    print("❌ UPDATE failed - no records found after update")
                    
            else:
                print(f"❌ Unexpected insert error: {insert_error}")
                
        # Final check
        print(f"\n🔍 Final check for portfolio IRR records...")
        final_records = await database._pool.fetch(check_query, portfolio_id, test_date)
        
        if final_records:
            print(f"✅ Final result - Found {len(final_records)} portfolio IRR record(s):")
            for record in final_records:
                print(f"   📊 IRR: {record['irr_result']}%, Created: {record['created_at']}")
        else:
            print("❌ No portfolio IRR records found in final check")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await database.close_db_pool()

if __name__ == "__main__":
    asyncio.run(debug_portfolio_irr_race())
