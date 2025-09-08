#!/usr/bin/env python3
"""
Check what fund_activity_summary view returns for Product 217
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def check_view():
    load_dotenv()
    database_url = os.getenv('DATABASE_URL')
    
    try:
        conn = await asyncpg.connect(database_url)
        print("[OK] Connected to database")
        
        # Check fund_activity_summary view for Product 217
        print("\nChecking fund_activity_summary view for Product 217:")
        print("="*70)
        
        query = """
        SELECT 
            fas.portfolio_fund_id,
            fas.fund_name,
            fas.total_investments,
            fas.total_regular_investments,
            fas.total_tax_uplift,
            fas.total_withdrawals,
            fas.activity_count,
            fas.last_activity_date
        FROM client_products cp
        JOIN portfolios p ON cp.portfolio_id = p.id
        JOIN portfolio_funds pf ON p.id = pf.portfolio_id
        JOIN fund_activity_summary fas ON pf.id = fas.portfolio_fund_id
        WHERE cp.id = 217;
        """
        
        result = await conn.fetch(query)
        
        for row in result:
            print(f"Fund: {row['fund_name']} (ID: {row['portfolio_fund_id']})")
            print(f"  total_investments: {row['total_investments']}")
            print(f"  total_regular_investments: {row['total_regular_investments']}")  
            print(f"  total_tax_uplift: {row['total_tax_uplift']}")
            print(f"  total_withdrawals: {row['total_withdrawals']}")
            print(f"  activity_count: {row['activity_count']}")
            print(f"  last_activity_date: {row['last_activity_date']}")
            print()
        
        await conn.close()
        print("[COMPLETE] View check complete!")
        
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    asyncio.run(check_view())