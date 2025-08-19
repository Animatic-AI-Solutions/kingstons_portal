import asyncio
import os
import sys
from typing import Dict, List, Any

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import database
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def run_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute a query and return results as list of dictionaries"""
    try:
        # Ensure pool is created
        if database._pool is None:
            await database.create_db_pool()
        
        # Acquire connection from pool
        async with database._pool.acquire() as conn:
            # Execute query
            rows = await conn.fetch(query, *params)
            # Convert to list of dictionaries
            results = [dict(row) for row in rows]
            return results
    except Exception as e:
        print(f"Error executing query: {e}")
        return []

async def check_more_tables():
    """Check structure of remaining tables"""
    
    try:
        # Ensure pool is created
        if database._pool is None:
            await database.create_db_pool()
        print("Successfully connected to database")
        print("=" * 80)
        
        # Check portfolio_funds table structure
        print("1. PORTFOLIO_FUNDS TABLE STRUCTURE:")
        portfolio_funds_columns = await run_query("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'portfolio_funds'
        ORDER BY ordinal_position
        """)
        
        for col in portfolio_funds_columns:
            print(f"   {col['column_name']} - {col['data_type']} - nullable: {col['is_nullable']}")
        
        print("\n" + "=" * 80)
        
        # Check portfolio_fund_valuations table structure  
        print("2. PORTFOLIO_FUND_VALUATIONS TABLE STRUCTURE:")
        valuations_columns = await run_query("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'portfolio_fund_valuations'
        ORDER BY ordinal_position
        """)
        
        for col in valuations_columns:
            print(f"   {col['column_name']} - {col['data_type']} - nullable: {col['is_nullable']}")
        
        print("\n" + "=" * 80)
        
        # Check portfolio_irr_values table structure
        print("3. PORTFOLIO_IRR_VALUES TABLE STRUCTURE:")
        irr_columns = await run_query("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'portfolio_irr_values'
        ORDER BY ordinal_position
        """)
        
        for col in irr_columns:
            print(f"   {col['column_name']} - {col['data_type']} - nullable: {col['is_nullable']}")
        
        print("\n" + "=" * 80)
        
        # Check available_funds table structure
        print("4. AVAILABLE_FUNDS TABLE STRUCTURE:")
        available_funds_columns = await run_query("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'available_funds'
        ORDER BY ordinal_position
        """)
        
        for col in available_funds_columns:
            print(f"   {col['column_name']} - {col['data_type']} - nullable: {col['is_nullable']}")
        
        print("\n" + "=" * 80)
        
        # Show some sample data from portfolio 157
        print("5. PORTFOLIO 157 FUNDS:")
        portfolio_funds = await run_query("""
        SELECT * FROM portfolio_funds WHERE portfolio_id = 157 LIMIT 5
        """)
        
        for fund in portfolio_funds:
            print(f"   Fund ID: {fund.get('id')} | Portfolio ID: {fund.get('portfolio_id')}")
            for key, value in fund.items():
                if key not in ['id', 'portfolio_id']:
                    print(f"     {key}: {value}")
            print("   ---")
        
        print("\n" + "=" * 80)
        
        # Check for any data in portfolio_fund_valuations for portfolio 157
        print("6. PORTFOLIO FUND VALUATIONS SAMPLE:")
        valuations = await run_query("""
        SELECT * FROM portfolio_fund_valuations WHERE portfolio_id = 157 LIMIT 5
        """)
        
        if valuations:
            for val in valuations:
                print(f"   Valuation for portfolio {val.get('portfolio_id')}:")
                for key, value in val.items():
                    if value == 3500:
                        print(f"     {key}: {value} *** FOUND 3500! ***")
                    else:
                        print(f"     {key}: {value}")
                print("   ---")
        else:
            print("   No valuations found for portfolio 157")
        
    except Exception as e:
        print(f"Investigation error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_more_tables())