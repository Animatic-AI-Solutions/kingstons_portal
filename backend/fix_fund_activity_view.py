from app.db.database import get_db

def fix_fund_activity_view():
    # Get database connection
    db = get_db()
    
    # Updated view SQL with correct activity types - GovernmentUplift separated from investments
    view_sql = """
    CREATE OR REPLACE VIEW public.fund_activity_summary AS
    SELECT 
        portfolio_fund_id,
        SUM(CASE WHEN activity_type IN ('Investment', 'RegularInvestment') THEN amount ELSE 0 END) as total_investments,
        SUM(CASE WHEN activity_type IN ('GovernmentUplift') THEN amount ELSE 0 END) as total_government_uplift,
        SUM(CASE WHEN activity_type IN ('Withdrawal', 'RegularWithdrawal') THEN amount ELSE 0 END) as total_withdrawals,
        SUM(CASE WHEN activity_type IN ('SwitchIn', 'FundSwitchIn') THEN amount ELSE 0 END) as total_switch_in,
        SUM(CASE WHEN activity_type IN ('SwitchOut', 'FundSwitchOut') THEN amount ELSE 0 END) as total_switch_out,
        SUM(CASE WHEN activity_type IN ('Product Switch In', 'ProductSwitchIn') THEN amount ELSE 0 END) as total_product_switch_in,
        SUM(CASE WHEN activity_type IN ('Product Switch Out', 'ProductSwitchOut') THEN amount ELSE 0 END) as total_product_switch_out
    FROM holding_activity_log
    GROUP BY portfolio_fund_id;
    """
    
    try:
        # Execute the view update
        result = db.rpc('execute_sql', {'sql_query': view_sql}).execute()
        print("Successfully updated fund_activity_summary view!")
        print(f"Result: {result}")
        
        # Test the updated view with a sample query
        print("\nTesting updated view...")
        test_result = db.table('fund_activity_summary').select('*').limit(5).execute()
        
        print(f"Sample records from updated view:")
        for record in test_result.data:
            print(f"  Portfolio Fund ID: {record['portfolio_fund_id']}")
            print(f"    Switch In: {record['total_switch_in']}")
            print(f"    Switch Out: {record['total_switch_out']}")
            print(f"    Product Switch In: {record['total_product_switch_in']}")
            print(f"    Product Switch Out: {record['total_product_switch_out']}")
            print()
        
    except Exception as e:
        print(f"Error updating view: {e}")
        
        # Try alternative approach using direct SQL execution
        print("Trying alternative approach...")
        try:
            # Execute directly
            db.postgrest.session.execute(view_sql)
            print("Successfully updated view using alternative method!")
        except Exception as e2:
            print(f"Alternative approach also failed: {e2}")

if __name__ == "__main__":
    fix_fund_activity_view() 