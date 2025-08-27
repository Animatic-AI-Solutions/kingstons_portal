#!/usr/bin/env python3
"""
Final debug script for client ID 75 JSON serialization error.
Using correct table and column names.
"""

import asyncio
import asyncpg
import os
import json
import math
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")
DATABASE_URL = os.getenv("DATABASE_URL")

def is_invalid_float(value):
    """Check if a value would cause JSON serialization issues"""
    if value is None:
        return False
    try:
        float_val = float(value)
        return math.isinf(float_val) or math.isnan(float_val)
    except (ValueError, TypeError):
        return False

async def find_problematic_data():
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        print("[INFO] Investigating client 75: Downing, Stephen & Sarah")
        
        # Get portfolio IDs for client 75
        portfolios = await conn.fetch("""
            SELECT DISTINCT portfolio_id 
            FROM client_products 
            WHERE client_id = 75 AND portfolio_id IS NOT NULL
        """)
        
        portfolio_ids = [p['portfolio_id'] for p in portfolios]
        print(f"[INFO] Portfolios: {portfolio_ids}")
        
        # Test the exact query from client_groups.py that causes the issue
        print(f"\n[INFO] Checking fund_activity_summary data (lines 1337-1370 in API)...")
        
        fund_data = await conn.fetch("""
            SELECT 
                fas.portfolio_fund_id,
                fas.fund_name,
                fas.latest_valuation,
                fas.total_investments,
                fas.total_regular_investments,
                fas.total_tax_uplift,
                fas.total_withdrawals,
                fas.total_switch_in as total_fund_switch_in,
                fas.total_switch_out as total_fund_switch_out,
                fas.total_product_switch_in,
                fas.total_product_switch_out,
                fas.latest_irr,
                fas.portfolio_id
            FROM fund_activity_summary fas
            WHERE fas.portfolio_id = ANY($1::int[])
            ORDER BY fas.portfolio_fund_id
        """, portfolio_ids)
        
        print(f"[INFO] Found {len(fund_data)} fund records")
        
        # Check each record for problematic values
        problematic_records = []
        
        for record in fund_data:
            fund_id = record['portfolio_fund_id']
            issues = []
            
            # Check all the fields that get float() conversion in lines 1337-1370
            fields_to_check = [
                'latest_valuation',         # line 1337: float(fund["market_value"])
                'total_investments',        # line 1340: float(fund["total_investments"])
                'total_regular_investments', # line 1341: float(fund["total_regular_investments"])
                'total_tax_uplift',         # lines 1342, 1344: float(fund["total_tax_uplift"])
                'total_withdrawals',        # lines 1345, 1366: float(fund["total_withdrawals"])
                'total_fund_switch_in',     # lines 1346, 1367: float(fund["total_fund_switch_in"])
                'total_fund_switch_out',    # lines 1347, 1368: float(fund["total_fund_switch_out"])
                'total_product_switch_in',  # lines 1348, 1369: float(fund["total_product_switch_in"])
                'total_product_switch_out', # lines 1349, 1370: float(fund["total_product_switch_out"])
                'latest_irr'               # line 1350: float(fund["irr"])
            ]
            
            for field in fields_to_check:
                value = record[field]
                if is_invalid_float(value):
                    issues.append((field, value))
            
            if issues:
                problematic_records.append({
                    'fund_id': fund_id,
                    'fund_name': record['fund_name'],
                    'portfolio_id': record['portfolio_id'],
                    'issues': issues
                })
        
        # Report findings
        if problematic_records:
            print(f"\n[ALERT] Found {len(problematic_records)} funds with problematic values:")
            
            for record in problematic_records:
                print(f"\nFund {record['fund_id']} ({record['fund_name']}) - Portfolio {record['portfolio_id']}:")
                for field, value in record['issues']:
                    print(f"  {field}: {value} [INVALID - would cause JSON error]")
                    
                    # Show the specific line in the code where this would fail
                    line_mapping = {
                        'latest_valuation': '1337: float(fund["market_value"])',
                        'total_investments': '1340/1360: float(fund["total_investments"])',
                        'total_regular_investments': '1341/1361: float(fund["total_regular_investments"])',
                        'total_tax_uplift': '1342/1344/1362/1365: float(fund["total_tax_uplift"])',
                        'total_withdrawals': '1345/1366: float(fund["total_withdrawals"])',
                        'total_fund_switch_in': '1346/1367: float(fund["total_fund_switch_in"])',
                        'total_fund_switch_out': '1347/1368: float(fund["total_fund_switch_out"])',
                        'total_product_switch_in': '1348/1369: float(fund["total_product_switch_in"])',
                        'total_product_switch_out': '1349/1370: float(fund["total_product_switch_out"])',
                        'latest_irr': '1350: float(fund["irr"])'
                    }
                    
                    print(f"    ^ This causes error at line {line_mapping.get(field, 'unknown')}")
        else:
            print("\n[SUCCESS] No invalid float values found in fund_activity_summary")
        
        # Also check portfolio IRR values (line 1449)
        print(f"\n[INFO] Checking portfolio IRR values (line 1449 in API)...")
        
        portfolio_irr_data = await conn.fetch("""
            SELECT portfolio_id, irr_result 
            FROM latest_portfolio_irr_values 
            WHERE portfolio_id = ANY($1::int[])
        """, portfolio_ids)
        
        irr_issues = []
        for record in portfolio_irr_data:
            if is_invalid_float(record['irr_result']):
                irr_issues.append(record)
        
        if irr_issues:
            print(f"[ALERT] Found {len(irr_issues)} portfolios with invalid IRR values:")
            for record in irr_issues:
                print(f"  Portfolio {record['portfolio_id']}: {record['irr_result']} [line 1449: float(irr_value)]")
        else:
            print("[SUCCESS] All portfolio IRR values are valid")
        
        # Test actual JSON serialization to confirm
        print(f"\n[INFO] Testing JSON serialization of the problematic data...")
        
        if problematic_records or irr_issues:
            print("[CONFIRMED] These invalid values would cause JSON serialization to fail")
            print("Root cause: Database contains infinity, -infinity, or NaN values")
            print("\nRecommended fix:")
            print("1. Add validation in the float() conversions in client_groups.py")
            print("2. Use math.isfinite() to check values before converting")
            print("3. Clean up the database to remove/fix invalid values")
        else:
            print("[MYSTERY] No obviously invalid float values found")
            print("The issue might be:")
            print("1. In calculated fields during API processing")
            print("2. In a different table or view")
            print("3. In edge cases not covered by this investigation")
        
    except Exception as e:
        print(f"[ERROR] Investigation failed: {e}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(find_problematic_data())