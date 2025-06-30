from app.db.database import get_db

def update_complete_fund_data_view():
    # Get database connection
    db = get_db()
    
    # Updated view SQL to include total_tax_uplift column
    view_sql = """
    CREATE OR REPLACE VIEW public.complete_fund_data AS
    SELECT 
        pf.id as portfolio_fund_id,
        pf.portfolio_id,
        pf.available_funds_id,
        pf.status,
        pf.target_weighting,
        pf.start_date,
        pf.end_date,
        pf.amount_invested,
        af.fund_name,
        af.isin_number,
        af.risk_factor,
        af.fund_cost,
        lfv.valuation as market_value,
        lfv.valuation_date,
        liv.irr_result as irr,
        liv.irr_date,
        fas.total_investments,
        fas.total_tax_uplift,
        fas.total_withdrawals,
        fas.total_fund_switch_in,
        fas.total_fund_switch_out,
        fas.total_product_switch_in,
        fas.total_product_switch_out
    FROM portfolio_funds pf
    LEFT JOIN available_funds af ON af.id = pf.available_funds_id
    LEFT JOIN latest_portfolio_fund_valuations lfv ON lfv.portfolio_fund_id = pf.id
    LEFT JOIN latest_portfolio_fund_irr_values liv ON liv.fund_id = pf.id
    LEFT JOIN fund_activity_summary fas ON fas.portfolio_fund_id = pf.id;
    """
    
    try:
        # Execute the view update
        result = db.rpc('execute_sql', {'sql_query': view_sql}).execute()
        print("Successfully updated complete_fund_data view to include total_tax_uplift!")
        print(f"Result: {result}")
        
        # Test the updated view with a sample query
        print("\nTesting updated view...")
        test_result = db.table('complete_fund_data').select('*').limit(3).execute()
        
        print(f"Sample records from updated view:")
        for record in test_result.data:
            print(f"  Portfolio Fund ID: {record['portfolio_fund_id']}")
            print(f"    Investments: {record['total_investments']}")
            print(f"    Tax Uplift: {record['total_tax_uplift']}")
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
    update_complete_fund_data_view() 