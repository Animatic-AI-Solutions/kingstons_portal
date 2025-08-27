#!/usr/bin/env python3
"""Check database schema for the problem tables."""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")
DATABASE_URL = os.getenv("DATABASE_URL")

async def check_schema():
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        print("[INFO] Checking table schemas...")
        
        # Check latest_portfolio_fund_valuations columns
        lpfv_columns = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'latest_portfolio_fund_valuations'
            ORDER BY ordinal_position
        """)
        
        print(f"\n[INFO] latest_portfolio_fund_valuations columns:")
        for col in lpfv_columns:
            print(f"  {col['column_name']}: {col['data_type']}")
        
        # Check fund_activity_summary columns
        fas_columns = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'fund_activity_summary'
            ORDER BY ordinal_position
        """)
        
        print(f"\n[INFO] fund_activity_summary columns:")
        for col in fas_columns:
            print(f"  {col['column_name']}: {col['data_type']}")
            
        # Check latest_portfolio_fund_irr_values columns
        lpfirr_columns = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'latest_portfolio_fund_irr_values'
            ORDER BY ordinal_position
        """)
        
        print(f"\n[INFO] latest_portfolio_fund_irr_values columns:")
        for col in lpfirr_columns:
            print(f"  {col['column_name']}: {col['data_type']}")
        
    except Exception as e:
        print(f"[ERROR] Schema check failed: {e}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_schema())