from app.db.database import get_db

def check_fund_switch_data():
    db = get_db()
    
    # Check FundSwitchIn activities
    fund_switch_in_result = db.table('holding_activity_log').select('*').eq('activity_type', 'FundSwitchIn').execute()
    
    print(f"FundSwitchIn activities: {len(fund_switch_in_result.data)} records")
    
    if fund_switch_in_result.data:
        print("\nFundSwitchIn records:")
        for i, row in enumerate(fund_switch_in_result.data[:10]):  # Show first 10
            print(f"  {i+1}. Portfolio Fund ID: {row.get('portfolio_fund_id')}, Amount: {row.get('amount')}, Date: {row.get('activity_timestamp')}")
    
    # Check FundSwitchOut activities  
    fund_switch_out_result = db.table('holding_activity_log').select('*').eq('activity_type', 'FundSwitchOut').execute()
    
    print(f"\nFundSwitchOut activities: {len(fund_switch_out_result.data)} records")
    
    if fund_switch_out_result.data:
        print("\nFundSwitchOut records:")
        for i, row in enumerate(fund_switch_out_result.data[:10]):  # Show first 10
            print(f"  {i+1}. Portfolio Fund ID: {row.get('portfolio_fund_id')}, Amount: {row.get('amount')}, Date: {row.get('activity_timestamp')}")
    
    # Check if there are any positive amounts for FundSwitchIn
    positive_fund_switch_in = db.table('holding_activity_log').select('*').eq('activity_type', 'FundSwitchIn').gt('amount', 0).execute()
    
    print(f"\nFundSwitchIn with positive amounts: {len(positive_fund_switch_in.data)} records")
    
    if positive_fund_switch_in.data:
        total_amount = sum(float(row.get('amount', 0)) for row in positive_fund_switch_in.data)
        print(f"Total FundSwitchIn amount: {total_amount}")

if __name__ == "__main__":
    check_fund_switch_data() 