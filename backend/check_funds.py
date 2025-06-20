import asyncio
from app.database import get_db

async def check_portfolio_funds():
    db = next(get_db())
    
    # Check portfolio funds in portfolio 1
    portfolio_funds = db.table('portfolio_funds').select('id, name, status, portfolio_id').eq('portfolio_id', 1).execute()
    print('Portfolio 1 funds:')
    for fund in portfolio_funds.data:
        fund_id = fund["id"]
        fund_name = fund["name"]
        fund_status = fund["status"]
        print(f'  Fund ID: {fund_id}, Name: {fund_name}, Status: {fund_status}')
    
    print(f'Total funds: {len(portfolio_funds.data)}')
    
    # Check active vs inactive
    active_funds = [f for f in portfolio_funds.data if f.get("status", "active") == "active"]
    inactive_funds = [f for f in portfolio_funds.data if f.get("status", "active") != "active"]
    
    print(f'Active funds: {len(active_funds)}')
    print(f'Inactive funds: {len(inactive_funds)}')

asyncio.run(check_portfolio_funds()) 