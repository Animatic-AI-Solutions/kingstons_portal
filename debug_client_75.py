#!/usr/bin/env python3
"""
Debug script to investigate JSON serialization errors for client ID 75.
Specifically looking for invalid float values (infinity, -infinity, NaN).
"""

import asyncio
import asyncpg
import os
import json
import math
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=".env")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment variables")
    exit(1)

def is_invalid_float(value):
    """Check if a float value is invalid for JSON serialization"""
    if value is None:
        return False
    try:
        float_val = float(value)
        return math.isinf(float_val) or math.isnan(float_val)
    except (ValueError, TypeError):
        return False

def check_json_serializable(data):
    """Test if data can be JSON serialized"""
    try:
        json.dumps(data)
        return True
    except (TypeError, ValueError) as e:
        return False, str(e)

async def investigate_client_75():
    """Investigate database values for client ID 75 that might cause JSON errors"""
    
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        print("[INFO] Starting investigation for client ID 75...")
        
        # 1. Check if client group 75 exists
        client_info = await conn.fetchrow("""
            SELECT id, name, status 
            FROM client_groups 
            WHERE id = 75
        """)
        
        if not client_info:
            print("[ERROR] Client ID 75 not found in database")
            return
            
        print(f"[SUCCESS] Client found: {dict(client_info)}")
        
        # 2. Check IRR values for client 75's portfolios
        print("\n[INFO] Checking IRR values...")
        irr_records = await conn.fetch("""
            SELECT 
                lpiv.portfolio_id,
                lpiv.irr_value,
                lpiv.calculation_date,
                p.portfolio_name
            FROM latest_portfolio_irr_values lpiv
            JOIN portfolios p ON lpiv.portfolio_id = p.portfolio_id
            WHERE lpiv.portfolio_id IN (
                SELECT cp.portfolio_id 
                FROM client_products cp 
                WHERE cp.client_group_id = 75
            )
            ORDER BY lpiv.portfolio_id
        """)
        
        print(f"Found {len(irr_records)} IRR records")
        for record in irr_records:
            irr_val = record['irr_value']
            is_invalid = is_invalid_float(irr_val)
            status = "[INVALID]" if is_invalid else "[Valid]"
            print(f"  Portfolio {record['portfolio_id']} ({record['portfolio_name']}): {irr_val} {status}")
            
            if is_invalid:
                print(f"    [ALERT] Found problematic IRR value: {irr_val}")
        
        # 3. Check fund valuations for client 75's portfolios
        print("\n[INFO] Checking fund valuations...")
        fund_records = await conn.fetch("""
            SELECT 
                lpfv.portfolio_fund_id,
                lpfv.market_value,
                lpfv.valuation_date,
                pf.portfolio_id,
                f.fund_name
            FROM latest_portfolio_fund_valuations lpfv
            JOIN portfolio_funds pf ON lpfv.portfolio_fund_id = pf.id
            JOIN funds f ON pf.fund_id = f.fund_id
            WHERE pf.portfolio_id IN (
                SELECT cp.portfolio_id 
                FROM client_products cp 
                WHERE cp.client_group_id = 75
            )
            ORDER BY pf.portfolio_id, f.fund_name
        """)
        
        print(f"Found {len(fund_records)} fund valuation records")
        invalid_funds = []
        for record in fund_records:
            market_val = record['market_value']
            is_invalid = is_invalid_float(market_val)
            if is_invalid:
                invalid_funds.append(record)
                print(f"  [INVALID] - Portfolio {record['portfolio_id']}, Fund: {record['fund_name']}, Value: {market_val}")
            else:
                print(f"  [Valid] - Portfolio {record['portfolio_id']}, Fund: {record['fund_name']}, Value: {market_val}")
        
        # 4. Check fund activity summary for problematic values
        print("\n[INFO] Checking fund activity summary...")
        activity_records = await conn.fetch("""
            SELECT 
                fas.portfolio_fund_id,
                fas.total_investment,
                fas.total_withdrawal,
                fas.net_investment,
                pf.portfolio_id,
                f.fund_name
            FROM fund_activity_summary fas
            JOIN portfolio_funds pf ON fas.portfolio_fund_id = pf.id
            JOIN funds f ON pf.fund_id = f.fund_id
            WHERE pf.portfolio_id IN (
                SELECT cp.portfolio_id 
                FROM client_products cp 
                WHERE cp.client_group_id = 75
            )
            ORDER BY pf.portfolio_id, f.fund_name
        """)
        
        print(f"Found {len(activity_records)} activity summary records")
        invalid_activities = []
        for record in activity_records:
            values_to_check = [
                ('total_investment', record['total_investment']),
                ('total_withdrawal', record['total_withdrawal']),
                ('net_investment', record['net_investment'])
            ]
            
            for field_name, value in values_to_check:
                if is_invalid_float(value):
                    invalid_activities.append((record, field_name, value))
                    print(f"  [INVALID] - Portfolio {record['portfolio_id']}, Fund: {record['fund_name']}, {field_name}: {value}")
        
        # 5. Check comprehensive fund data that causes the JSON error
        print("\n[INFO] Testing comprehensive client fund data view...")
        
        try:
            # Query the exact data that causes the problem in get_complete_client_group_details
            complete_data = await conn.fetch("""
                SELECT 
                    lpfv.portfolio_fund_id,
                    lpfv.fund_name,
                    lpfv.market_value,
                    lpfv.valuation_date,
                    fas.total_investments,
                    fas.total_regular_investments,
                    fas.total_tax_uplift,
                    fas.total_withdrawals,
                    fas.total_fund_switch_in,
                    fas.total_fund_switch_out,
                    fas.total_product_switch_in,
                    fas.total_product_switch_out,
                    lpfirr.irr as fund_irr
                FROM latest_portfolio_fund_valuations lpfv
                JOIN portfolio_funds pf ON lpfv.portfolio_fund_id = pf.id
                LEFT JOIN fund_activity_summary fas ON lpfv.portfolio_fund_id = fas.portfolio_fund_id
                LEFT JOIN latest_portfolio_fund_irr_values lpfirr ON lpfv.portfolio_fund_id = lpfirr.fund_id
                WHERE pf.portfolio_id IN (
                    SELECT cp.portfolio_id 
                    FROM client_products cp 
                    WHERE cp.client_group_id = 75
                )
                LIMIT 20
            """)
            
            # Convert to dict and test JSON serialization
            data_dicts = [dict(record) for record in complete_data]
            
            for i, data_dict in enumerate(data_dicts):
                result = check_json_serializable(data_dict)
                if result is True:
                    print(f"  [SUCCESS] Record {i+1}: JSON serializable")
                else:
                    print(f"  [ERROR] Record {i+1}: JSON serialization failed - {result[1]}")
                    print(f"     Data: {data_dict}")
                    
                    # Check individual fields
                    for key, value in data_dict.items():
                        if is_invalid_float(value):
                            print(f"     [ALERT] Invalid float in field '{key}': {value}")
        
        except Exception as e:
            print(f"[ERROR] Error during complete data test: {e}")
        
        # 6. Summary
        print("\n[SUMMARY] INVESTIGATION SUMMARY:")
        print(f"Client ID 75: {client_info['name']}")
        print(f"IRR records checked: {len(irr_records)}")
        print(f"Fund valuation records checked: {len(fund_records)}")
        print(f"Activity summary records checked: {len(activity_records)}")
        
        total_invalid = len(invalid_funds) + len(invalid_activities)
        if total_invalid > 0:
            print(f"[ALERT] FOUND {total_invalid} PROBLEMATIC VALUES")
            print("These are likely causing the JSON serialization errors.")
        else:
            print("[SUCCESS] No obviously invalid float values found in main tables")
            print("The issue might be in calculated fields or view logic.")
            
    except Exception as e:
        print(f"[ERROR] Database connection error: {e}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(investigate_client_75())