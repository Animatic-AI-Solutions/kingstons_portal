from app.db.database import get_db

def check_activity_types():
    # Get database connection
    db = get_db()
    
    # Query distinct activity types
    result = db.table('holding_activity_log').select('activity_type').execute()
    
    print('Activity types in the database:')
    unique_types = set()
    for row in result.data:
        if row['activity_type']:
            unique_types.add(row['activity_type'])
    
    for activity_type in sorted(unique_types):
        print(f'  - {activity_type}')
    
    # Check specifically for fund switch activities with amounts > 0
    print('\nFund switch activities with amounts > 0:')
    switch_result = db.table('holding_activity_log').select('activity_type, amount').gt('amount', 0).ilike('activity_type', '%switch%').execute()
    
    switch_types = {}
    for row in switch_result.data:
        activity_type = row['activity_type']
        amount = row['amount']
        if activity_type not in switch_types:
            switch_types[activity_type] = []
        switch_types[activity_type].append(amount)
    
    for activity_type, amounts in switch_types.items():
        print(f'  - {activity_type}: {len(amounts)} records, example amounts: {amounts[:3]}')
    
    # Check specific fund switch amounts for debugging
    print('\nChecking for 1000 fund switch amount:')
    specific_result = db.table('holding_activity_log').select('*').eq('amount', 1000).ilike('activity_type', '%switch%').execute()
    
    for row in specific_result.data:
        print(f"  Found: {row['activity_type']} = {row['amount']} on {row.get('activity_timestamp', 'no date')}")

if __name__ == "__main__":
    check_activity_types() 