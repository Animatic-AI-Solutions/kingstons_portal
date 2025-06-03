#!/usr/bin/env python3
"""Test script to debug the IRR view issue."""

import os
import sys
from app.db.database import get_db

def test_irr_issue():
    """Test what's happening with the IRR view."""
    db = get_db()
    
    print("=== Testing IRR View Issue ===")
    
    # Test 1: Check if IRR entries exist in the table
    print("\n1. Checking portfolio_fund_irr_values table:")
    irr_table_result = db.table("portfolio_fund_irr_values").select("*").execute()
    print(f"   Found {len(irr_table_result.data)} entries in portfolio_fund_irr_values table")
    
    for entry in irr_table_result.data:
        print(f"   - Fund ID: {entry.get('fund_id')}, Date: {entry.get('date')}, IRR: {entry.get('irr_result')}%")
    
    # Test 2: Check if IRR view works
    print("\n2. Checking latest_portfolio_fund_irr_values view:")
    irr_view_result = db.table("latest_portfolio_fund_irr_values").select("*").execute()
    print(f"   Found {len(irr_view_result.data)} entries in latest_portfolio_fund_irr_values view")
    
    for entry in irr_view_result.data:
        print(f"   - Fund ID: {entry.get('fund_id')}, Date: {entry.get('irr_date')}, IRR: {entry.get('irr_result')}%")
    
    # Test 3: Check specific query for fund 324
    print("\n3. Checking specific query for fund 324:")
    specific_result = db.table("latest_portfolio_fund_irr_values").select("*").eq("fund_id", 324).execute()
    print(f"   Found {len(specific_result.data)} entries for fund 324")
    
    for entry in specific_result.data:
        print(f"   - Fund ID: {entry.get('fund_id')}, Date: {entry.get('irr_date')}, IRR: {entry.get('irr_result')}%")
    
    # Test 4: Check the query that the frontend is making
    print("\n4. Testing frontend-style query:")
    portfolio_fund_ids = [324, 323]  # The IDs from the logs
    frontend_result = db.table("latest_portfolio_fund_irr_values").select("*").in_("fund_id", portfolio_fund_ids).execute()
    print(f"   Frontend query found {len(frontend_result.data)} entries")
    
    for entry in frontend_result.data:
        print(f"   - Fund ID: {entry.get('fund_id')}, Date: {entry.get('irr_date')}, IRR: {entry.get('irr_result')}%")
    
    # Test 5: Check portfolio funds table
    print("\n5. Checking portfolio_funds table for portfolio 48:")
    pf_result = db.table("portfolio_funds").select("id, portfolio_id").eq("portfolio_id", 48).execute()
    print(f"   Found {len(pf_result.data)} portfolio funds")
    
    for pf in pf_result.data:
        print(f"   - Portfolio Fund ID: {pf.get('id')}, Portfolio ID: {pf.get('portfolio_id')}")

if __name__ == "__main__":
    test_irr_issue() 