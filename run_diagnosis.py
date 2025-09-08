#!/usr/bin/env python3
"""
Diagnostic script to check Product 217 investment data
Run this from the backend directory: python ../run_diagnosis.py
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def run_diagnosis():
    # Load environment variables
    load_dotenv()
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("[ERROR] DATABASE_URL not found in environment variables")
        return
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        print("[OK] Connected to database")
        
        # Query 1: Basic product information
        print("\n" + "="*60)
        print("1. BASIC PRODUCT INFORMATION")
        print("="*60)
        query1 = """
        SELECT 
            cp.id as product_id,
            cp.product_name,
            cp.portfolio_id,
            p.portfolio_name
        FROM client_products cp
        LEFT JOIN portfolios p ON cp.portfolio_id = p.id
        WHERE cp.id = 217;
        """
        result1 = await conn.fetch(query1)
        for row in result1:
            print(f"Product ID: {row['product_id']}")
            print(f"Product Name: {row['product_name']}")
            print(f"Portfolio ID: {row['portfolio_id']}")
            print(f"Portfolio Name: {row['portfolio_name']}")
        
        # Query 2: Portfolio funds
        print("\n" + "="*60)
        print("2. PORTFOLIO FUNDS FOR PRODUCT 217")
        print("="*60)
        query2 = """
        SELECT 
            pf.id as portfolio_fund_id,
            pf.portfolio_id,
            pf.status,
            af.fund_name,
            pf.amount_invested
        FROM client_products cp
        JOIN portfolios p ON cp.portfolio_id = p.id
        JOIN portfolio_funds pf ON p.id = pf.portfolio_id
        JOIN available_funds af ON pf.available_funds_id = af.id
        WHERE cp.id = 217;
        """
        result2 = await conn.fetch(query2)
        for row in result2:
            print(f"Fund: {row['fund_name']} (ID: {row['portfolio_fund_id']})")
            print(f"  Status: {row['status']}")
            print(f"  Amount Invested: {row['amount_invested']}")
        
        # Query 3: Investment activity analysis (KEY QUERY)
        print("\n" + "="*60)
        print("3. INVESTMENT ACTIVITY ANALYSIS (KEY DIAGNOSTIC)")
        print("="*60)
        query3 = """
        SELECT 
            pf.id as portfolio_fund_id,
            af.fund_name,
            COALESCE(SUM(CASE WHEN hal.activity_type = 'Investment' THEN hal.amount ELSE 0 END), 0) as investment_total,
            COALESCE(SUM(CASE WHEN hal.activity_type = 'RegularInvestment' THEN hal.amount ELSE 0 END), 0) as regular_investment_total,
            COALESCE(SUM(CASE WHEN hal.activity_type = 'TaxUplift' THEN hal.amount ELSE 0 END), 0) as tax_uplift_total,
            COALESCE(SUM(CASE WHEN hal.activity_type IN ('Investment', 'RegularInvestment', 'TaxUplift') THEN hal.amount ELSE 0 END), 0) as combined_investment_total,
            STRING_AGG(DISTINCT hal.activity_type, ', ') as activity_types_found,
            COUNT(hal.id) as total_activities
        FROM client_products cp
        JOIN portfolios p ON cp.portfolio_id = p.id
        JOIN portfolio_funds pf ON p.id = pf.portfolio_id
        JOIN available_funds af ON pf.available_funds_id = af.id
        LEFT JOIN holding_activity_log hal ON pf.id = hal.portfolio_fund_id
        WHERE cp.id = 217
        GROUP BY pf.id, af.fund_name;
        """
        result3 = await conn.fetch(query3)
        
        total_investments = 0
        for row in result3:
            print(f"Fund: {row['fund_name']}")
            print(f"  Investment: ${row['investment_total']:,.2f}")
            print(f"  Regular Investment: ${row['regular_investment_total']:,.2f}")
            print(f"  Tax Uplift: ${row['tax_uplift_total']:,.2f}")
            print(f"  COMBINED TOTAL: ${row['combined_investment_total']:,.2f}")
            print(f"  Activity Types: {row['activity_types_found']}")
            print(f"  Total Activities: {row['total_activities']}")
            print()
            total_investments += float(row['combined_investment_total'])
        
        print(f"[RESULT] TOTAL PRODUCT 217 INVESTMENTS: ${total_investments:,.2f}")
        
        # Diagnosis
        print("\n" + "="*60)
        print("DIAGNOSIS")
        print("="*60)
        if total_investments > 0:
            print("[FOUND] Product 217 HAS investment data in the database!")
            print("[ISSUE] Problem is likely in the backend API aggregation logic")
            print("[FIX] Check: backend/app/api/routes/client_groups.py lines 1391-1395")
        else:
            print("[NOT FOUND] Product 217 has NO investment data in holding_activity_log")
            print("[INVESTIGATE] Why does IRR calculation page show data but database doesn't?")
        
        await conn.close()
        print("\n[COMPLETE] Diagnosis complete!")
        
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    asyncio.run(run_diagnosis())