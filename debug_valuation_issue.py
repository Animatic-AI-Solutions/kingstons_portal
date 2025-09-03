#!/usr/bin/env python3
"""
Debug script to investigate the valuation display issue.

This script checks if there's a mismatch between IRR data and valuation data
that's causing "Latest valuation needed" to show when valuations exist.
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def debug_valuation_issue():
    """
    Investigate the valuation display issue by comparing:
    1. IRR data availability
    2. Valuation data availability 
    3. Data source consistency between the two
    """
    
    # Connect to database
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("[ERROR] DATABASE_URL not found in environment variables")
        return
    
    try:
        conn = await asyncpg.connect(database_url)
        print("[OK] Connected to database")
        
        # Test query to find products with IRR but no valuation data
        print("\n[DEBUG] Checking for products with IRR data but missing valuation data...")
        
        mismatch_query = """
        SELECT 
            cp.id as product_id,
            cp.product_name,
            cg.name as client_group_name,
            -- IRR data
            COUNT(lpfirr.irr_result) as irr_records_count,
            MAX(lpfirr.irr_result) as latest_irr,
            -- Valuation data 
            COUNT(lpfv.valuation) as valuation_records_count,
            MAX(lpfv.valuation) as latest_valuation,
            -- Fund count
            COUNT(pf.id) as total_fund_count
        FROM client_products cp
        LEFT JOIN client_groups cg ON cg.id = cp.client_id
        LEFT JOIN portfolios p ON cp.portfolio_id = p.id
        LEFT JOIN portfolio_funds pf ON pf.portfolio_id = p.id
        LEFT JOIN latest_portfolio_fund_irr_values lpfirr ON lpfirr.fund_id = pf.id
        LEFT JOIN latest_portfolio_fund_valuations lpfv ON lpfv.portfolio_fund_id = pf.id
        WHERE cp.status = 'active' AND cg.status = 'active'
        GROUP BY cp.id, cp.product_name, cg.name
        HAVING 
            -- Products with IRR data but no valuation data
            COUNT(lpfirr.irr_result) > 0 AND 
            (COUNT(lpfv.valuation) = 0 OR MAX(lpfv.valuation) IS NULL OR MAX(lpfv.valuation) = 0)
        ORDER BY client_group_name, product_name
        LIMIT 10;
        """
        
        mismatches = await conn.fetch(mismatch_query)
        
        if mismatches:
            print(f"[ALERT] Found {len(mismatches)} products with IRR data but missing/zero valuations:")
            print("-" * 100)
            for row in mismatches:
                print(f"Client: {row['client_group_name']}")
                print(f"Product: {row['product_name']} (ID: {row['product_id']})")
                print(f"IRR Records: {row['irr_records_count']}, Latest IRR: {row['latest_irr']}")
                print(f"Valuation Records: {row['valuation_records_count']}, Latest Valuation: {row['latest_valuation']}")
                print(f"Total Funds: {row['total_fund_count']}")
                print("-" * 50)
        else:
            print("[OK] No IRR/valuation data mismatches found")
            
        # Check for products that should have valuations but show zero total_value
        print("\n[DEBUG] Checking products with zero calculated total_value but active funds...")
        
        zero_value_query = """
        WITH fund_values AS (
            SELECT 
                cp.id as product_id,
                cp.product_name,
                cg.name as client_group_name,
                pf.id as fund_id,
                pf.status as fund_status,
                lpfv.valuation as fund_market_value,
                lpfirr.irr_result as fund_irr,
                pf.amount_invested
            FROM client_products cp
            LEFT JOIN client_groups cg ON cg.id = cp.client_id
            LEFT JOIN portfolios p ON cp.portfolio_id = p.id
            LEFT JOIN portfolio_funds pf ON pf.portfolio_id = p.id
            LEFT JOIN latest_portfolio_fund_valuations lpfv ON lpfv.portfolio_fund_id = pf.id
            LEFT JOIN latest_portfolio_fund_irr_values lpfirr ON lpfirr.fund_id = pf.id
            WHERE cp.status = 'active' AND cg.status = 'active' AND pf.id IS NOT NULL
        )
        SELECT 
            product_id,
            product_name,
            client_group_name,
            COUNT(*) as total_funds,
            COUNT(CASE WHEN fund_status = 'active' THEN 1 END) as active_funds,
            COALESCE(SUM(COALESCE(fund_market_value, 0)), 0) as calculated_total_value,
            COUNT(CASE WHEN fund_market_value IS NOT NULL AND fund_market_value > 0 THEN 1 END) as funds_with_valuation,
            COUNT(CASE WHEN fund_irr IS NOT NULL THEN 1 END) as funds_with_irr,
            ARRAY_AGG(fund_market_value) as all_fund_values
        FROM fund_values
        GROUP BY product_id, product_name, client_group_name
        HAVING 
            -- Products with active funds but zero calculated value
            COUNT(CASE WHEN fund_status = 'active' THEN 1 END) > 0 AND
            COALESCE(SUM(COALESCE(fund_market_value, 0)), 0) = 0 AND
            COUNT(CASE WHEN fund_irr IS NOT NULL THEN 1 END) > 0
        ORDER BY client_group_name, product_name
        LIMIT 5;
        """
        
        zero_value_products = await conn.fetch(zero_value_query)
        
        if zero_value_products:
            print(f"[ALERT] Found {len(zero_value_products)} products with active funds but zero calculated value:")
            print("-" * 100)
            for row in zero_value_products:
                print(f"Client: {row['client_group_name']}")
                print(f"Product: {row['product_name']} (ID: {row['product_id']})")
                print(f"Total Funds: {row['total_funds']}, Active: {row['active_funds']}")
                print(f"Calculated Total Value: {row['calculated_total_value']}")
                print(f"Funds with Valuation: {row['funds_with_valuation']}")
                print(f"Funds with IRR: {row['funds_with_irr']}")
                print(f"Fund Values: {row['all_fund_values']}")
                print("-" * 50)
        else:
            print("[OK] No products found with active funds but zero calculated value")
            
    except Exception as e:
        print(f"[ERROR] Database error: {e}")
        
    finally:
        await conn.close()
        print("\n[INFO] Database connection closed")

if __name__ == "__main__":
    asyncio.run(debug_valuation_issue())