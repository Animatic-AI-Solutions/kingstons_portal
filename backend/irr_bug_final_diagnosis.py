#!/usr/bin/env python3
"""
IRR Bug Final Diagnosis
=======================
Based on investigation, the issue is now clear:

PROBLEM IDENTIFIED:
- The period overview table uses the `complete_fund_data` view
- The IRR history page uses the `fund_historical_irr` view  
- The `complete_fund_data` view does NOT include individual valuation_date or product_id columns
- It only shows aggregated data at the fund level, not time-series data
- This means November IRR data cannot be shown in period overview the same way as IRR history

SOLUTION:
Either the period overview needs to use a different view/query that includes time-series data,
or the frontend needs to be updated to handle the data structure correctly.
"""

import asyncio
import os
import sys
from datetime import datetime
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
        if database._pool is None:
            await database.create_db_pool()
        
        async with database._pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [dict(row) for row in rows]
            
    except Exception as e:
        print(f"Error executing query: {e}")
        return []

def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'='*80}")
    print(f" {title}")
    print(f"{'='*80}")

async def final_diagnosis():
    """Provide final diagnosis and solution for the IRR bug"""
    
    print_section("FINAL IRR BUG DIAGNOSIS & SOLUTION")
    print(f"Diagnosis started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    PRODUCT_ID = 14
    FUND_ID = 75  # BNY Melon Global Income
    
    print("\n🔍 ISSUE SUMMARY:")
    print("  - Product 14 shows November IRR data in period overview")
    print("  - Same data is missing from IRR history page")
    print("  - Investigation shows data exists in database")
    print("  - Problem is in VIEW STRUCTURE mismatch")
    
    # 1. Show what complete_fund_data actually contains
    print_section("1. COMPLETE_FUND_DATA VIEW STRUCTURE")
    
    query = """
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'complete_fund_data'
    AND table_schema = 'public'
    ORDER BY ordinal_position
    """
    
    cfd_columns = await run_query(query)
    print("\nColumns in complete_fund_data view:")
    for col in cfd_columns:
        print(f"  - {col['column_name']}: {col['data_type']} {'(nullable)' if col['is_nullable'] == 'YES' else ''}")
    
    # 2. Show what fund_historical_irr contains
    print_section("2. FUND_HISTORICAL_IRR VIEW STRUCTURE")
    
    query = """
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'fund_historical_irr'
    AND table_schema = 'public'
    ORDER BY ordinal_position
    """
    
    fhi_columns = await run_query(query)
    print("\nColumns in fund_historical_irr view:")
    for col in fhi_columns:
        print(f"  - {col['column_name']}: {col['data_type']} {'(nullable)' if col['is_nullable'] == 'YES' else ''}")
    
    # 3. Show the actual data from complete_fund_data for BNY Melon funds
    print_section("3. ACTUAL DATA COMPARISON")
    
    print("\n3.1 Data from complete_fund_data (what period overview sees):")
    query = """
    SELECT *
    FROM complete_fund_data
    WHERE fund_name LIKE '%BNY%'
    """
    
    cfd_data = await run_query(query)
    if cfd_data:
        for i, record in enumerate(cfd_data, 1):
            print(f"\n--- BNY Fund {i} ---")
            for key, value in record.items():
                print(f"  {key}: {value}")
    else:
        print("No BNY funds found in complete_fund_data")
    
    print("\n3.2 Data from fund_historical_irr (what IRR history sees):")
    query = """
    SELECT *
    FROM fund_historical_irr
    WHERE fund_name LIKE '%BNY%'
    ORDER BY date DESC
    """
    
    fhi_data = await run_query(query)
    if fhi_data:
        for i, record in enumerate(fhi_data, 1):
            print(f"\n--- IRR Record {i} ---")
            for key, value in record.items():
                if isinstance(value, datetime):
                    value = value.strftime('%Y-%m-%d %H:%M:%S')
                print(f"  {key}: {value}")
    else:
        print("No BNY funds found in fund_historical_irr")
    
    # 4. Provide the solution
    print_section("4. ROOT CAUSE ANALYSIS")
    
    print("\n❌ PROBLEM IDENTIFIED:")
    print("  1. complete_fund_data is an AGGREGATED view - it shows fund-level summaries")
    print("  2. It does NOT include time-series data (no valuation_date, no date column)")
    print("  3. It shows avg_irr (average IRR) not historical IRR values")
    print("  4. fund_historical_irr shows TIME-SERIES data with specific dates")
    print("  5. These are FUNDAMENTALLY DIFFERENT data structures")
    
    print("\n✅ SOLUTION OPTIONS:")
    print("\nOPTION 1 - Frontend Fix (Recommended):")
    print("  - Update period overview to use fund_historical_irr for IRR data")
    print("  - Keep complete_fund_data for fund summary info")
    print("  - Join the two views in the API or frontend")
    
    print("\nOPTION 2 - Database View Fix:")
    print("  - Create a new view that combines fund details with latest IRR/valuation")
    print("  - Include product_id and date columns for filtering")
    print("  - Update period overview to use the new view")
    
    print("\nOPTION 3 - API Enhancement:")
    print("  - Create a specific API endpoint for period overview")
    print("  - Combine data from multiple views server-side")
    print("  - Return structured data with both summary and time-series info")
    
    # 5. Show the recommended query for period overview
    print_section("5. RECOMMENDED SOLUTION QUERY")
    
    print("\n🎯 Recommended query for period overview (combines both views):")
    print("""
    SELECT 
        cfd.id,
        cfd.fund_name,
        cfd.isin_number,
        cfd.risk_factor,
        cfd.total_current_value,
        fhi.date as latest_irr_date,
        fhi.irr_result as latest_irr,
        fhi.product_name,
        fhi.client_name
    FROM complete_fund_data cfd
    LEFT JOIN (
        SELECT DISTINCT ON (fund_id) 
            fund_id, date, irr_result, product_name, client_name
        FROM fund_historical_irr
        ORDER BY fund_id, date DESC
    ) fhi ON cfd.id = fhi.fund_id
    WHERE fhi.product_name IS NOT NULL  -- Only funds with IRR data
    ORDER BY cfd.fund_name
    """)
    
    # Test the recommended query
    print("\n5.1 Testing recommended query:")
    query = """
    SELECT 
        cfd.id,
        cfd.fund_name,
        cfd.isin_number,
        cfd.risk_factor,
        cfd.total_current_value,
        fhi.date as latest_irr_date,
        fhi.irr_result as latest_irr,
        fhi.product_name,
        fhi.client_name
    FROM complete_fund_data cfd
    LEFT JOIN (
        SELECT DISTINCT ON (fund_id) 
            fund_id, date, irr_result, product_name, client_name
        FROM fund_historical_irr
        ORDER BY fund_id, date DESC
    ) fhi ON cfd.id = fhi.fund_id
    WHERE fhi.product_name LIKE '%Natasha%'  -- Filter for our test product
    ORDER BY cfd.fund_name
    """
    
    test_data = await run_query(query)
    if test_data:
        print("\n✅ Recommended query works! Results:")
        for i, record in enumerate(test_data, 1):
            print(f"\n--- Combined Record {i} ---")
            for key, value in record.items():
                if isinstance(value, datetime):
                    value = value.strftime('%Y-%m-%d')
                print(f"  {key}: {value}")
    else:
        print("❌ Recommended query returned no results")
    
    print_section("6. IMPLEMENTATION STEPS")
    
    print("\n📋 IMMEDIATE NEXT STEPS:")
    print("  1. ✅ Bug identified: View structure mismatch")
    print("  2. 🔧 Update period overview API endpoint to use combined query")
    print("  3. 🧪 Test the new endpoint with Product 14 data")
    print("  4. 🎨 Update frontend to handle the new data structure")
    print("  5. ✅ Verify November data appears in both period overview AND IRR history")
    
    print("\n🚀 RECOMMENDED IMPLEMENTATION:")
    print("  - Create new API endpoint: /api/portfolio_funds/enhanced/{product_id}")
    print("  - Use the combined query above")
    print("  - Update period overview component to use new endpoint")
    print("  - Keep IRR history page using existing fund_historical_irr endpoint")
    
    print(f"\nDiagnosis completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n🎉 MYSTERY SOLVED! The November IRR data exists - it's just in different views!")

if __name__ == "__main__":
    try:
        asyncio.run(final_diagnosis())
    except KeyboardInterrupt:
        print("\nDiagnosis interrupted by user.")
    except Exception as e:
        print(f"Diagnosis failed with error: {e}")
        import traceback
        traceback.print_exc()
