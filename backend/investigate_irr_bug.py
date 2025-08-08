#!/usr/bin/env python3
"""
IRR Bug Investigation Script
============================
Investigating the discrepancy where product 14 shows November IRR data in the period overview 
but not in the IRR history page. Focus on BNY Melon fund.

Usage: python investigate_irr_bug.py
"""

import asyncio
import os
import sys
from datetime import datetime
from typing import Dict, List, Any
import json

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
        print(f"Query: {query}")
        print(f"Params: {params}")
        return []

def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

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

async def investigate_product_14():
    """Main investigation function for product 14 IRR bug"""
    
    print_section("IRR Bug Investigation - Product 14")
    print(f"Investigation started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Get basic product information
    print_section("1. Product 14 Basic Information")
    query = """
    SELECT 
        cp.id,
        cp.product_name,
        cp.product_type,
        cp.status,
        cp.start_date,
        cp.end_date,
        cp.client_id,
        cg.name as client_name,
        cp.provider_id,
        ap.name as provider_name,
        cp.portfolio_id,
        p.portfolio_name
    FROM client_products cp
    JOIN client_groups cg ON cp.client_id = cg.id
    JOIN available_providers ap ON cp.provider_id = ap.id
    JOIN portfolios p ON cp.portfolio_id = p.id
    WHERE cp.id = $1
    """
    
    product_info = await run_query(query, (14,))
    print_results(product_info, "Product 14 Information")
    
    if not product_info:
        print("ERROR: Product 14 not found!")
        # Let's check what products exist
        print("\nChecking what products exist...")
        all_products_query = """
        SELECT cp.id, cp.product_name, cp.client_id, cg.name as client_name
        FROM client_products cp
        JOIN client_groups cg ON cp.client_id = cg.id
        ORDER BY cp.id
        LIMIT 10
        """
        all_products = await run_query(all_products_query)
        print_results(all_products, "Available Products (first 10)")
        return
    
    portfolio_id = product_info[0]['portfolio_id']
    
    # 2. Get all funds in this portfolio
    print_section("2. Portfolio Funds for Product 14")
    query = """
    SELECT 
        pf.id as portfolio_fund_id,
        pf.portfolio_id,
        pf.available_funds_id,
        af.fund_name,
        af.isin_number,
        pf.status,
        pf.start_date,
        pf.end_date,
        pf.amount_invested,
        pf.target_weighting
    FROM portfolio_funds pf
    JOIN available_funds af ON pf.available_funds_id = af.id
    WHERE pf.portfolio_id = $1
    ORDER BY af.fund_name
    """
    
    portfolio_funds = await run_query(query, (portfolio_id,))
    print_results(portfolio_funds, f"Portfolio {portfolio_id} Funds")
    
    # Find BNY Melon fund
    bny_melon_fund = None
    for fund in portfolio_funds:
        if 'BNY' in fund['fund_name'].upper() or 'MELON' in fund['fund_name'].upper():
            bny_melon_fund = fund
            break
    
    if not bny_melon_fund:
        print("\nWARNING: No BNY Melon fund found. Looking for funds with similar names...")
        for fund in portfolio_funds:
            print(f"  - {fund['fund_name']}")
        
        # Use the first fund for investigation if BNY Melon not found
        if portfolio_funds:
            bny_melon_fund = portfolio_funds[0]
            print(f"\nUsing first fund for investigation: {bny_melon_fund['fund_name']}")
    else:
        print(f"\nFound BNY Melon fund: {bny_melon_fund['fund_name']}")
    
    if not bny_melon_fund:
        print("ERROR: No funds found in portfolio!")
        return
    
    fund_id = bny_melon_fund['portfolio_fund_id']
    
    # 3. Check fund valuations (especially November)
    print_section("3. Fund Valuations - Focus on November")
    query = """
    SELECT 
        pfv.id,
        pfv.portfolio_fund_id,
        pfv.valuation_date,
        pfv.valuation,
        pfv.created_at,
        EXTRACT(YEAR FROM pfv.valuation_date) as year,
        EXTRACT(MONTH FROM pfv.valuation_date) as month
    FROM portfolio_fund_valuations pfv
    WHERE pfv.portfolio_fund_id = $1
    AND pfv.valuation_date >= '2024-01-01'
    ORDER BY pfv.valuation_date DESC
    """
    
    fund_valuations = await run_query(query, (fund_id,))
    print_results(fund_valuations, f"Fund Valuations for {bny_melon_fund['fund_name']}")
    
    # Check specifically for November data
    november_valuations = [v for v in fund_valuations if v.get('month') == 11]
    if november_valuations:
        print(f"\nNovember Valuations Found: {len(november_valuations)}")
        for val in november_valuations:
            print(f"  - {val['valuation_date']}: £{val['valuation']:,.2f}")
    else:
        print("\nNo November valuations found!")
    
    # 4. Check fund IRR values (especially November)
    print_section("4. Fund IRR Values - Focus on November")
    query = """
    SELECT 
        pfir.id,
        pfir.fund_id,
        pfir.date,
        pfir.irr_result,
        pfir.created_at,
        EXTRACT(YEAR FROM pfir.date) as year,
        EXTRACT(MONTH FROM pfir.date) as month
    FROM portfolio_fund_irr_values pfir
    WHERE pfir.fund_id = $1
    AND pfir.date >= '2024-01-01'
    ORDER BY pfir.date DESC
    """
    
    fund_irr_values = await run_query(query, (fund_id,))
    print_results(fund_irr_values, f"Fund IRR Values for {bny_melon_fund['fund_name']}")
    
    # Check specifically for November IRR data
    november_irr = [irr for irr in fund_irr_values if irr.get('month') == 11]
    if november_irr:
        print(f"\nNovember IRR Found: {len(november_irr)}")
        for irr in november_irr:
            print(f"  - {irr['date']}: {irr['irr_result']:.4f}%")
    else:
        print("\nNo November IRR found!")
    
    # 5. Check what the fund_historical_irr view returns
    print_section("5. Fund Historical IRR View Results")
    query = """
    SELECT 
        fhi.fund_id,
        fhi.fund_name,
        fhi.date,
        fhi.irr_result,
        fhi.client_id,
        fhi.client_name,
        fhi.product_name,
        EXTRACT(YEAR FROM fhi.date) as year,
        EXTRACT(MONTH FROM fhi.date) as month
    FROM fund_historical_irr fhi
    WHERE fhi.fund_id = $1
    AND fhi.date >= '2024-01-01'
    ORDER BY fhi.date DESC
    """
    
    historical_irr = await run_query(query, (fund_id,))
    print_results(historical_irr, f"Historical IRR View for {bny_melon_fund['fund_name']}")
    
    # Check specifically for November in historical view
    november_historical = [h for h in historical_irr if h.get('month') == 11]
    if november_historical:
        print(f"\nNovember Historical IRR Found: {len(november_historical)}")
        for h in november_historical:
            print(f"  - {h['date']}: {h['irr_result']:.4f}%")
    else:
        print("\nNo November Historical IRR found!")
    
    # 6. Check portfolio-level IRR values
    print_section("6. Portfolio-Level IRR Values")
    query = """
    SELECT 
        pir.id,
        pir.portfolio_id,
        pir.date,
        pir.irr_result,
        pir.created_at,
        EXTRACT(YEAR FROM pir.date) as year,
        EXTRACT(MONTH FROM pir.date) as month
    FROM portfolio_irr_values pir
    WHERE pir.portfolio_id = $1
    AND pir.date >= '2024-01-01'
    ORDER BY pir.date DESC
    """
    
    portfolio_irr = await run_query(query, (portfolio_id,))
    print_results(portfolio_irr, f"Portfolio IRR Values for Portfolio {portfolio_id}")
    
    # Check for November portfolio IRR
    november_portfolio_irr = [p for p in portfolio_irr if p.get('month') == 11]
    if november_portfolio_irr:
        print(f"\nNovember Portfolio IRR Found: {len(november_portfolio_irr)}")
        for p in november_portfolio_irr:
            print(f"  - {p['date']}: {p['irr_result']:.4f}%")
    else:
        print("\nNo November Portfolio IRR found!")
    
    # 7. Check activity logs for November
    print_section("7. Activity Logs - November Analysis")
    query = """
    SELECT 
        hal.id,
        hal.product_id,
        hal.portfolio_fund_id,
        hal.activity_type,
        hal.amount,
        hal.activity_timestamp,
        DATE(hal.activity_timestamp) as activity_date,
        EXTRACT(YEAR FROM hal.activity_timestamp) as year,
        EXTRACT(MONTH FROM hal.activity_timestamp) as month
    FROM holding_activity_log hal
    WHERE hal.product_id = 14
    AND hal.portfolio_fund_id = $1
    AND hal.activity_timestamp >= '2024-01-01'
    ORDER BY hal.activity_timestamp DESC
    """
    
    activity_logs = await run_query(query, (fund_id,))
    print_results(activity_logs, f"Activity Logs for Product 14, Fund {fund_id}")
    
    # Check for November activities
    november_activities = [a for a in activity_logs if a.get('month') == 11]
    if november_activities:
        print(f"\nNovember Activities Found: {len(november_activities)}")
        for a in november_activities:
            print(f"  - {a['activity_date']}: {a['activity_type']} £{a['amount']:,.2f}")
    else:
        print("\nNo November activities found!")
    
    # 8. Summary and Analysis
    print_section("8. ANALYSIS SUMMARY")
    print(f"Product 14: {product_info[0]['product_name']}")
    print(f"Portfolio ID: {portfolio_id}")
    print(f"Investigated Fund: {bny_melon_fund['fund_name']} (ID: {fund_id})")
    print(f"\nData Summary:")
    print(f"  - Total Fund Valuations: {len(fund_valuations)}")
    print(f"  - November Fund Valuations: {len(november_valuations)}")
    print(f"  - Total Fund IRR Values: {len(fund_irr_values)}")
    print(f"  - November Fund IRR Values: {len(november_irr)}")
    print(f"  - Historical IRR View Records: {len(historical_irr)}")
    print(f"  - November Historical IRR: {len(november_historical)}")
    print(f"  - Portfolio IRR Records: {len(portfolio_irr)}")
    print(f"  - November Portfolio IRR: {len(november_portfolio_irr)}")
    print(f"  - Activity Log Records: {len(activity_logs)}")
    print(f"  - November Activities: {len(november_activities)}")
    
    # Identify the discrepancy
    print(f"\nDISCREPANCY ANALYSIS:")
    if november_valuations and not november_irr:
        print("❌ ISSUE FOUND: November valuations exist but no November IRR values!")
        print("   This suggests the IRR calculation process may have failed or been skipped for November.")
    elif november_irr and not november_historical:
        print("❌ ISSUE FOUND: November IRR values exist but not showing in historical view!")
        print("   This suggests a problem with the fund_historical_irr view or its filtering.")
    elif november_valuations and november_irr and november_historical:
        print("✅ Data appears complete - issue may be in frontend processing")
    else:
        print("⚠️  Complex issue - need to check data flow and calculation logic")
    
    # 9. Additional diagnostic queries
    print_section("9. Additional Diagnostics")
    
    # Check if there are any status issues
    query = """
    SELECT 
        'portfolio_fund' as table_name,
        pf.id,
        pf.status,
        pf.start_date,
        pf.end_date
    FROM portfolio_funds pf
    WHERE pf.id = $1
    
    UNION ALL
    
    SELECT 
        'available_fund' as table_name,
        af.id,
        af.status,
        null as start_date,
        null as end_date
    FROM available_funds af
    JOIN portfolio_funds pf ON af.id = pf.available_funds_id
    WHERE pf.id = $1
    
    UNION ALL
    
    SELECT 
        'portfolio' as table_name,
        p.id,
        p.status,
        p.start_date,
        p.end_date
    FROM portfolios p
    WHERE p.id = $1
    
    UNION ALL
    
    SELECT 
        'client_product' as table_name,
        cp.id,
        cp.status,
        cp.start_date,
        cp.end_date
    FROM client_products cp
    WHERE cp.id = 14
    """
    
    status_check = await run_query(query, (fund_id, fund_id, portfolio_id))
    print_results(status_check, "Status Check for All Related Entities")
    
    print(f"\nInvestigation completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    try:
        asyncio.run(investigate_product_14())
    except KeyboardInterrupt:
        print("\nInvestigation interrupted by user.")
    except Exception as e:
        print(f"Investigation failed with error: {e}")
        import traceback
        traceback.print_exc()
