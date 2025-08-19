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

async def check_table_structures():
    """Check the structure of key tables for product 196 investigation"""
    
    try:
        # Ensure pool is created
        if database._pool is None:
            await database.create_db_pool()
        print("Successfully connected to database")
        print("=" * 80)
        
        # Check client_products table structure
        print("1. CLIENT_PRODUCTS TABLE STRUCTURE:")
        client_products_columns = await run_query("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'client_products'
        ORDER BY ordinal_position
        """)
        
        for col in client_products_columns:
            print(f"   {col['column_name']} - {col['data_type']} - nullable: {col['is_nullable']}")
        
        print("\n" + "=" * 80)
        
        # Check holding_activity_log table structure  
        print("2. HOLDING_ACTIVITY_LOG TABLE STRUCTURE:")
        activity_log_columns = await run_query("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'holding_activity_log'
        ORDER BY ordinal_position
        """)
        
        for col in activity_log_columns:
            print(f"   {col['column_name']} - {col['data_type']} - nullable: {col['is_nullable']}")
        
        print("\n" + "=" * 80)
        
        # Check portfolios table structure
        print("3. PORTFOLIOS TABLE STRUCTURE:")
        portfolios_columns = await run_query("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'portfolios'
        ORDER BY ordinal_position
        """)
        
        for col in portfolios_columns:
            print(f"   {col['column_name']} - {col['data_type']} - nullable: {col['is_nullable']}")
        
        print("\n" + "=" * 80)
        
        # Now try to find product 196 with correct column names
        print("4. FINDING PRODUCT 196 WITH CORRECT COLUMNS:")
        product_results = await run_query("""
        SELECT * FROM client_products WHERE id = 196
        """)
        
        if product_results:
            product = product_results[0]
            print("   FOUND PRODUCT 196:")
            for key, value in product.items():
                print(f"   {key}: {value}")
        else:
            print("   Product 196 not found")
            
            # Let's check what products exist around that range
            print("\n   Products around ID 196:")
            nearby_products = await run_query("""
            SELECT id, product_name FROM client_products 
            WHERE id BETWEEN 190 AND 200
            ORDER BY id
            """)
            
            for prod in nearby_products:
                print(f"   ID {prod['id']}: {prod['product_name']}")
        
    except Exception as e:
        print(f"Investigation error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_table_structures())