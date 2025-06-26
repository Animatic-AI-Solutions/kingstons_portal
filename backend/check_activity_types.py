from app.db.database import get_db

def check_activity_types():
    db = get_db()
    
    # Check all switch-related activity types
    switch_result = db.table('holding_activity_log').select('activity_type').ilike('activity_type', '%switch%').execute()
    
    switch_types = set()
    for row in switch_result.data:
        if row['activity_type']:
            switch_types.add(row['activity_type'])
    
    print("Switch-related activity types:")
    for activity_type in sorted(switch_types):
        print(f"- '{activity_type}'")
    
    # Check all activity types
    all_result = db.table('holding_activity_log').select('activity_type').execute()
    
    all_types = set()
    for row in all_result.data:
        if row['activity_type']:
            all_types.add(row['activity_type'])
    
    print(f"\nAll activity types ({len(all_types)} total):")
    for activity_type in sorted(all_types):
        print(f"- '{activity_type}'")

if __name__ == "__main__":
    check_activity_types() 