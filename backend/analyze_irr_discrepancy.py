#!/usr/bin/env python3
"""
IRR Discrepancy Analysis Script
===============================
Focused analysis of why BNY Melon fund shows in period overview but not IRR history page.

Key findings from initial investigation:
- Product 14: AJ Bell Stocks & Shares JISA - Natasha 
- Portfolio ID: 193
- BNY Melon Global Income Fund (ID: 75)
- November 2024 data exists: Valuation £1,701.94, IRR 7.6%
- fund_historical_irr view shows the data correctly
- No portfolio-level IRR or activity logs

This suggests the issue is in how the frontend processes or displays the data.
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

def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'='*80}")
    print(f" {title}")
    print(f"{'='*80}")

def print_results(results: List[Dict[str, Any]], title: str = "Results"):
    """Print query results in a formatted way"""
    print(f"\n{title}:")
    print(f"Found {len(results)} records")
    
    if not results:
        print("No data found.")
        return
    
    # Print each result
    for i, result in enumerate(results, 1):
        print(f"\n--- Record {i} ---")
        for key, value in result.items():
            if isinstance(value, datetime):
                value = value.strftime('%Y-%m-%d %H:%M:%S')
            print(f"  {key}: {value}")

async def analyze_irr_discrepancy():
    """Analyze the IRR data discrepancy for Product 14"""
    
    print_section("IRR DISCREPANCY ANALYSIS - Product 14 BNY Melon Fund")
    print(f"Analysis started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Constants from investigation
    PRODUCT_ID = 14
    PORTFOLIO_ID = 193
    FUND_ID = 75  # BNY Melon Global Income
    
    # 1. Test the specific API endpoints that the frontend would call
    print_section("1. API Endpoint Analysis")
    
    # Check what the period overview would see (likely from complete_fund_data or similar view)
    print("\n1.1 Testing complete_fund_data view (used by period overview):")
    query = """
    SELECT 
        cfd.*,
        EXTRACT(YEAR FROM cfd.valuation_date) as year,
        EXTRACT(MONTH FROM cfd.valuation_date) as month
    FROM complete_fund_data cfd
    WHERE cfd.product_id = $1
    AND cfd.fund_id = $2
    ORDER BY cfd.valuation_date DESC
    """
    
    complete_fund_data = await run_query(query, (PRODUCT_ID, FUND_ID))
    print_results(complete_fund_data, "Complete Fund Data View Results")
    
    # 2. Check what the IRR history page would see
    print("\n1.2 Testing fund_historical_irr view (used by IRR history page):")
    query = """
    SELECT 
        fhi.*,
        EXTRACT(YEAR FROM fhi.date) as year,
        EXTRACT(MONTH FROM fhi.date) as month
    FROM fund_historical_irr fhi
    WHERE fhi.fund_id = $1
    ORDER BY fhi.date DESC
    """
    
    historical_irr_data = await run_query(query, (FUND_ID,))
    print_results(historical_irr_data, "Fund Historical IRR View Results")
    
    # 3. Check the latest views that might be used
    print_section("2. Latest Views Analysis")
    
    print("\n2.1 Testing latest_portfolio_fund_irr_values:")
    query = """
    SELECT *
    FROM latest_portfolio_fund_irr_values
    WHERE fund_id = $1
    """
    
    latest_fund_irr = await run_query(query, (FUND_ID,))
    print_results(latest_fund_irr, "Latest Portfolio Fund IRR Values")
    
    print("\n2.2 Testing latest_portfolio_fund_valuations:")
    query = """
    SELECT *
    FROM latest_portfolio_fund_valuations
    WHERE portfolio_fund_id = $1
    """
    
    latest_fund_valuations = await run_query(query, (FUND_ID,))
    print_results(latest_fund_valuations, "Latest Portfolio Fund Valuations")
    
    # 4. Check if there are any date/time filtering issues
    print_section("3. Date Filtering Analysis")
    
    print("\n3.1 All IRR data for this fund (no date filters):")
    query = """
    SELECT 
        pfir.id,
        pfir.fund_id,
        pfir.date,
        pfir.irr_result,
        pfir.created_at,
        DATE_TRUNC('month', pfir.date) as month_start
    FROM portfolio_fund_irr_values pfir
    WHERE pfir.fund_id = $1
    ORDER BY pfir.date DESC
    """
    
    all_irr_data = await run_query(query, (FUND_ID,))
    print_results(all_irr_data, "All IRR Data for Fund 75")
    
    print("\n3.2 All valuation data for this fund (no date filters):")
    query = """
    SELECT 
        pfv.id,
        pfv.portfolio_fund_id,
        pfv.valuation_date,
        pfv.valuation,
        pfv.created_at,
        DATE_TRUNC('month', pfv.valuation_date) as month_start
    FROM portfolio_fund_valuations pfv
    WHERE pfv.portfolio_fund_id = $1
    ORDER BY pfv.valuation_date DESC
    """
    
    all_valuation_data = await run_query(query, (FUND_ID,))
    print_results(all_valuation_data, "All Valuation Data for Fund 75")
    
    # 5. Check the specific API endpoints the frontend might be calling
    print_section("4. Frontend API Endpoint Simulation")
    
    # Simulate what the historical IRR API endpoint would return
    print("\n4.1 Simulating /api/historical-irr/fund/{fund_id} endpoint:")
    query = """
    SELECT 
        fhi.date,
        fhi.irr_result,
        fhi.fund_name,
        fhi.client_name,
        fhi.product_name
    FROM fund_historical_irr fhi
    WHERE fhi.fund_id = $1
    ORDER BY fhi.date DESC
    """
    
    api_historical_irr = await run_query(query, (FUND_ID,))
    print_results(api_historical_irr, "Historical IRR API Simulation")
    
    # Check what product-level data would show
    print("\n4.2 Simulating product-level IRR data:")
    query = """
    SELECT 
        cp.id as product_id,
        cp.product_name,
        pf.id as fund_id,
        af.fund_name,
        pfir.date,
        pfir.irr_result,
        pfv.valuation_date,
        pfv.valuation
    FROM client_products cp
    JOIN portfolios p ON cp.portfolio_id = p.id
    JOIN portfolio_funds pf ON p.id = pf.portfolio_id
    JOIN available_funds af ON pf.available_funds_id = af.id
    LEFT JOIN portfolio_fund_irr_values pfir ON pf.id = pfir.fund_id
    LEFT JOIN portfolio_fund_valuations pfv ON pf.id = pfv.portfolio_fund_id AND pfv.valuation_date = pfir.date
    WHERE cp.id = $1
    AND af.fund_name LIKE '%BNY%'
    ORDER BY pfir.date DESC NULLS LAST
    """
    
    product_level_data = await run_query(query, (PRODUCT_ID,))
    print_results(product_level_data, "Product-Level Data Simulation")
    
    # 6. Check for any potential status or filtering issues
    print_section("5. Status and Filter Analysis")
    
    print("\n5.1 Checking all statuses in the chain:")
    query = """
    SELECT 
        'client_product' as entity_type,
        cp.id,
        cp.status,
        cp.start_date,
        cp.end_date
    FROM client_products cp
    WHERE cp.id = $1
    
    UNION ALL
    
    SELECT 
        'portfolio' as entity_type,
        p.id,
        p.status,
        p.start_date,
        p.end_date
    FROM portfolios p
    JOIN client_products cp ON p.id = cp.portfolio_id
    WHERE cp.id = $1
    
    UNION ALL
    
    SELECT 
        'portfolio_fund' as entity_type,
        pf.id,
        pf.status,
        pf.start_date,
        pf.end_date
    FROM portfolio_funds pf
    JOIN portfolios p ON pf.portfolio_id = p.id
    JOIN client_products cp ON p.id = cp.portfolio_id
    WHERE cp.id = $1 AND pf.id = $2
    
    UNION ALL
    
    SELECT 
        'available_fund' as entity_type,
        af.id,
        af.status,
        null as start_date,
        null as end_date
    FROM available_funds af
    JOIN portfolio_funds pf ON af.id = pf.available_funds_id
    JOIN portfolios p ON pf.portfolio_id = p.id
    JOIN client_products cp ON p.id = cp.portfolio_id
    WHERE cp.id = $1 AND pf.id = $2
    """
    
    status_chain = await run_query(query, (PRODUCT_ID, FUND_ID))
    print_results(status_chain, "Status Chain Analysis")
    
    # 7. Final analysis and recommendations
    print_section("6. FINAL ANALYSIS & RECOMMENDATIONS")
    
    print(f"\n📊 DATA SUMMARY:")
    print(f"  - Complete Fund Data records: {len(complete_fund_data)}")
    print(f"  - Historical IRR View records: {len(historical_irr_data)}")
    print(f"  - Latest Fund IRR records: {len(latest_fund_irr)}")
    print(f"  - Latest Fund Valuations: {len(latest_fund_valuations)}")
    print(f"  - All IRR Data: {len(all_irr_data)}")
    print(f"  - All Valuation Data: {len(all_valuation_data)}")
    print(f"  - API Historical IRR: {len(api_historical_irr)}")
    print(f"  - Product Level Data: {len(product_level_data)}")
    
    print(f"\n🔍 DISCREPANCY ANALYSIS:")
    
    # Check if data exists in both views
    has_complete_fund_data = len(complete_fund_data) > 0
    has_historical_irr = len(historical_irr_data) > 0
    has_november_data = any(
        item.get('month') == 11 for item in (complete_fund_data + historical_irr_data + all_irr_data)
    )
    
    if has_complete_fund_data and has_historical_irr and has_november_data:
        print("✅ DATABASE DATA IS COMPLETE")
        print("   - November data exists in all relevant tables")
        print("   - Both period overview and IRR history views have data")
        print("   - Issue is likely in FRONTEND processing or API filtering")
        print("\n🎯 RECOMMENDED INVESTIGATION:")
        print("   1. Check frontend API calls to /api/historical-irr endpoints")
        print("   2. Verify date filtering logic in IRR history page")
        print("   3. Check if frontend is using different date ranges")
        print("   4. Verify React Query cache invalidation")
        print("   5. Check browser console for API errors")
    elif has_complete_fund_data and not has_historical_irr:
        print("❌ HISTORICAL IRR VIEW ISSUE")
        print("   - Data exists in base tables but not in fund_historical_irr view")
        print("   - Check view definition and joins")
    elif not has_complete_fund_data and has_historical_irr:
        print("❌ COMPLETE FUND DATA VIEW ISSUE")
        print("   - Historical data exists but not in complete_fund_data view")
    else:
        print("❌ COMPLEX DATA ISSUE")
        print("   - Need deeper investigation of data flow")
    
    print(f"\nAnalysis completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    try:
        asyncio.run(analyze_irr_discrepancy())
    except KeyboardInterrupt:
        print("\nAnalysis interrupted by user.")
    except Exception as e:
        print(f"Analysis failed with error: {e}")
        import traceback
        traceback.print_exc()
