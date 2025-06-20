import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.api.routes.portfolios import calculate_portfolio_irr

async def test_portfolio_fund_count():
    """Test that portfolio IRR calculation includes inactive funds"""
    db = next(get_db())
    
    # Check portfolio 1 funds
    portfolio_funds = db.table('portfolio_funds').select('id, name, status').eq('portfolio_id', 1).execute()
    
    print("=== Portfolio 1 Fund Analysis ===")
    print(f"Total funds in portfolio 1: {len(portfolio_funds.data)}")
    
    active_funds = [f for f in portfolio_funds.data if f.get('status', 'active') == 'active']
    inactive_funds = [f for f in portfolio_funds.data if f.get('status', 'active') != 'active']
    
    print(f"Active funds: {len(active_funds)}")
    for fund in active_funds:
        print(f"  - Fund {fund['id']}: {fund['name']} (status: {fund['status']})")
    
    print(f"Inactive funds: {len(inactive_funds)}")
    for fund in inactive_funds:
        print(f"  - Fund {fund['id']}: {fund['name']} (status: {fund['status']})")
    
    # Test portfolio IRR calculation
    try:
        print("\n=== Testing Portfolio IRR Calculation ===")
        result = await calculate_portfolio_irr(portfolio_id=1, db=db)
        print(f"Portfolio IRR calculation completed")
        print(f"Total funds processed: {result.get('total_funds', 'N/A')}")
        print(f"Successful calculations: {result.get('successful', 'N/A')}")
        
        # Check if the calculation included all funds
        expected_total = len(portfolio_funds.data)
        actual_total = result.get('total_funds', 0)
        
        if actual_total == expected_total:
            print(f"✅ SUCCESS: Portfolio IRR calculation included all {expected_total} funds")
        else:
            print(f"❌ ISSUE: Expected {expected_total} funds but only processed {actual_total}")
            
    except Exception as e:
        print(f"❌ ERROR in portfolio IRR calculation: {e}")

if __name__ == "__main__":
    asyncio.run(test_portfolio_fund_count()) 