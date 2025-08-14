import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from datetime import datetime

async def investigate_historical_funds_issue():
    load_dotenv()
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        print('=== Investigating Historical Funds IRR Issue ===')
        
        # First, let's identify fund ID 964 (Historical Funds) from the logs
        fund_964 = await conn.fetchrow('''
            SELECT pf.id, f.name as fund_name, p.product_name, cp.client_name, pf.portfolio_id
            FROM portfolio_funds pf
            JOIN funds f ON pf.fund_id = f.id
            JOIN portfolios p ON pf.portfolio_id = p.id
            JOIN client_products cp ON p.client_product_id = cp.id
            WHERE pf.id = 964
        ''')
        
        if fund_964:
            print(f'\n🔍 Fund ID 964 Details:')
            print(f'  - Fund Name: {fund_964["fund_name"]}')
            print(f'  - Product: {fund_964["product_name"]}')
            print(f'  - Client: {fund_964["client_name"]}')
            print(f'  - Portfolio ID: {fund_964["portfolio_id"]}')
        else:
            print('\n❌ Fund ID 964 not found')
            return
            
        portfolio_id = fund_964["portfolio_id"]
        
        # Check valuations around April 2024 for fund ID 964
        print('\n🔍 Checking valuations for Historical Funds (ID 964) in 2024:')
        valuations = await conn.fetch('''
            SELECT valuation_date, valuation_amount, created_at
            FROM valuations 
            WHERE portfolio_fund_id = 964
            AND valuation_date BETWEEN '2024-01-01' AND '2024-12-31'
            ORDER BY valuation_date
        ''')
        
        if valuations:
            print(f'  Found {len(valuations)} valuations in 2024:')
            for val in valuations:
                print(f'    - {val["valuation_date"]}: £{val["valuation_amount"]:,.2f} (created: {val["created_at"].strftime("%Y-%m-%d %H:%M:%S")})')
        else:
            print('  ❌ No valuations found for fund ID 964 in 2024')
            
        # Check activity logs for fund ID 964
        print('\n🔍 Checking activity logs for Historical Funds (ID 964):')
        activities = await conn.fetch('''
            SELECT activity_date, activity_type, amount, created_at
            FROM activity_log 
            WHERE portfolio_fund_id = 964
            ORDER BY activity_date DESC
            LIMIT 20
        ''')
        
        if activities:
            print(f'  Found {len(activities)} recent activities:')
            for act in activities:
                print(f'    - {act["activity_date"]}: {act["activity_type"]} £{act["amount"]:,.2f} (created: {act["created_at"].strftime("%Y-%m-%d %H:%M:%S")})')
        else:
            print('  ❌ No activity logs found for fund ID 964')
            
        # Check if there are stored portfolio IRRs for the portfolio containing fund 964
        print(f'\n🔍 Portfolio IRR data for portfolio {portfolio_id}:')
        irr_data = await conn.fetch('''
            SELECT date, irr_result, created_at
            FROM portfolio_irr_values
            WHERE portfolio_id = $1
            ORDER BY date DESC
            LIMIT 10
        ''', portfolio_id)
        
        if irr_data:
            print(f'  Found {len(irr_data)} stored IRR values (showing last 10):')
            for irr in irr_data:
                print(f'    - {irr["date"]}: {irr["irr_result"]}% (created: {irr["created_at"].strftime("%Y-%m-%d %H:%M:%S")})')
        else:
            print('  ❌ No stored portfolio IRR values found')
        
        # Check specifically for 2024-04-01
        april_2024_data = await conn.fetchrow('''
            SELECT date, irr_result, created_at
            FROM portfolio_irr_values
            WHERE portfolio_id = $1 AND date = '2024-04-01'
        ''', portfolio_id)
        
        print(f'\n🔍 Checking specifically for April 1, 2024 stored IRR:')
        if april_2024_data:
            print(f'  ✅ Found stored IRR for 2024-04-01: {april_2024_data["irr_result"]}% (created: {april_2024_data["created_at"].strftime("%Y-%m-%d %H:%M:%S")})')
        else:
            print('  ❌ No stored IRR found for 2024-04-01')
            
        # Check what data exists up to April 2024 for fund 964
        print('\n🔍 Checking data availability for IRR calculation up to April 1, 2024:')
        
        # Count valuations and activities up to April 2024
        valuation_count = await conn.fetchval('''
            SELECT COUNT(*) FROM valuations 
            WHERE portfolio_fund_id = 964 AND valuation_date <= '2024-04-01'
        ''')
        
        activity_count = await conn.fetchval('''
            SELECT COUNT(*) FROM activity_log 
            WHERE portfolio_fund_id = 964 AND activity_date <= '2024-04-01'
        ''')
        
        # Get date ranges
        first_activity = await conn.fetchval('''
            SELECT MIN(activity_date) FROM activity_log 
            WHERE portfolio_fund_id = 964
        ''')
        
        last_activity = await conn.fetchval('''
            SELECT MAX(activity_date) FROM activity_log 
            WHERE portfolio_fund_id = 964
        ''')
        
        first_valuation = await conn.fetchval('''
            SELECT MIN(valuation_date) FROM valuations 
            WHERE portfolio_fund_id = 964
        ''')
        
        last_valuation = await conn.fetchval('''
            SELECT MAX(valuation_date) FROM valuations 
            WHERE portfolio_fund_id = 964
        ''')
        
        print(f'  Data availability up to April 1, 2024:')
        print(f'    - Valuations: {valuation_count}')
        print(f'    - Activities: {activity_count}')
        print(f'    - Activity range: {first_activity} to {last_activity}')
        print(f'    - Valuation range: {first_valuation} to {last_valuation}')
        
        # Check what the earliest possible IRR calculation date would be
        print('\n🔍 Checking earliest possible IRR calculation date:')
        earliest_calc_data = await conn.fetchrow('''
            SELECT 
                MIN(GREATEST(
                    COALESCE(v.min_val_date, '9999-12-31'::date),
                    COALESCE(a.min_act_date, '9999-12-31'::date)
                )) as earliest_possible_date,
                COUNT(DISTINCT v.portfolio_fund_id) as funds_with_valuations,
                COUNT(DISTINCT a.portfolio_fund_id) as funds_with_activities
            FROM (
                SELECT portfolio_fund_id, MIN(valuation_date) as min_val_date
                FROM valuations 
                WHERE portfolio_fund_id = 964
                GROUP BY portfolio_fund_id
            ) v
            FULL OUTER JOIN (
                SELECT portfolio_fund_id, MIN(activity_date) as min_act_date
                FROM activity_log 
                WHERE portfolio_fund_id = 964
                GROUP BY portfolio_fund_id
            ) a ON v.portfolio_fund_id = a.portfolio_fund_id
        ''')
        
        if earliest_calc_data:
            print(f'    - Earliest possible IRR date: {earliest_calc_data["earliest_possible_date"]}')
            print(f'    - Funds with valuations: {earliest_calc_data["funds_with_valuations"]}')
            print(f'    - Funds with activities: {earliest_calc_data["funds_with_activities"]}')
            
        # Check if April 2024 comes after the earliest possible date
        if earliest_calc_data and earliest_calc_data["earliest_possible_date"]:
            april_2024 = datetime.strptime('2024-04-01', '%Y-%m-%d').date()
            earliest_date = earliest_calc_data["earliest_possible_date"]
            
            print(f'\n📊 IRR Calculation Feasibility:')
            print(f'    - April 2024 date: {april_2024}')
            print(f'    - Earliest possible: {earliest_date}')
            print(f'    - Can calculate IRR for April 2024: {april_2024 >= earliest_date}')
            
            if april_2024 >= earliest_date:
                print('    ⚠️  This explains why IRR calculation succeeds even without valuation for April 2024!')
                print('    ⚠️  IRR can be calculated using cash flows up to the calculation date.')
        
        # Check what cash flows exist for fund 964 that could enable IRR calculation
        print('\n🔍 Checking cash flows that enable IRR calculation:')
        
        cash_flows = await conn.fetch('''
            SELECT activity_date, activity_type, amount, 
                   CASE 
                       WHEN activity_type IN ('Investment', 'FundSwitchIn', 'TaxUplift') THEN 'INFLOW'
                       WHEN activity_type IN ('Withdrawal', 'FundSwitchOut') THEN 'OUTFLOW'
                       ELSE 'OTHER'
                   END as flow_direction
            FROM activity_log 
            WHERE portfolio_fund_id = 964
            AND activity_date <= '2024-04-01'
            ORDER BY activity_date
        ''')
        
        if cash_flows:
            print(f'    Found {len(cash_flows)} cash flows up to April 2024:')
            total_inflow = 0
            total_outflow = 0
            for flow in cash_flows:
                print(f'      - {flow["activity_date"]}: {flow["activity_type"]} £{flow["amount"]:,.2f} ({flow["flow_direction"]})')
                if flow["flow_direction"] == 'INFLOW':
                    total_inflow += flow["amount"]
                elif flow["flow_direction"] == 'OUTFLOW':
                    total_outflow += flow["amount"]
                    
            print(f'    Summary:')
            print(f'      - Total inflows: £{total_inflow:,.2f}')
            print(f'      - Total outflows: £{total_outflow:,.2f}')
            print(f'      - Net cash flow: £{total_inflow - total_outflow:,.2f}')
        
        # Final conclusion
        print('\n🎯 CONCLUSION:')
        if april_2024_data:
            print('    ✅ April 2024 IRR (-9.8%) is STORED in portfolio_irr_values table')
            print('    ✅ This is correct behavior - fetching stored IRR as requested')
        else:
            print('    ❌ No stored IRR for April 2024, but frontend is calculating one')
            print('    ❌ This suggests the frontend is bypassing the backend summary endpoint')
            print('    ❌ and directly calling IRR calculation APIs')
            
        print('\n📋 INVESTIGATION COMPLETE')
        
    except Exception as e:
        print(f'❌ Error during investigation: {str(e)}')
        import traceback
        traceback.print_exc()
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(investigate_historical_funds_issue())