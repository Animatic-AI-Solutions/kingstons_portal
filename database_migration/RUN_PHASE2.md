# Phase 2: Data Migration - Quick Execution Guide

## What Phase 2 Does

Migrates advisor text data to foreign key relationships based on your specific requirements:
- **Debbie** → maps to `debbie@kingstonsfinancial.com`
- **Jan** → maps to `jan@kingstonsfinancial.com`  
- **All other advisors** → set to NULL (no advisor assigned)

## Prerequisites

✅ **Phase 1 must be completed** - advisor_id column exists  
✅ **Profiles exist** - `debbie@kingstonsfinancial.com` and `jan@kingstonsfinancial.com` profiles in database  
✅ **Backup completed** - rollback capability available

## Quick Execution

### Option 1: Supabase Dashboard
1. Open Supabase → SQL Editor
2. Copy and paste the entire contents of `04_phase2_data_migration.sql`
3. Execute the script
4. Review the results

### Option 2: Command Line
```bash
# Execute Phase 2 data migration
psql -h db.your-project.supabase.co -U postgres -d postgres -f database_migration/04_phase2_data_migration.sql
```

## What You'll See

The script will show several result tables:

### 1. Migration Execution Results
```
| advisor_name | target_email                      | profile_id | client_groups_updated | action_taken            |
|-------------|-----------------------------------|------------|----------------------|------------------------|
| Debbie      | debbie@kingstonsfinancial.com     | 5          | 8                    | MAPPED_TO_EXISTING_PROFILE |
| Jan         | jan@kingstonsfinancial.com        | 3          | 6                    | MAPPED_TO_EXISTING_PROFILE |
| Other Advisors | N/A - Set to NULL              | NULL       | 3                    | SET_TO_NULL_AS_REQUESTED |
```

### 2. Validation Results
Shows counts for:
- Total client groups with advisor text
- Groups mapped to Debbie profile
- Groups mapped to Jan profile  
- Groups set to NULL (other advisors)
- Data integrity checks

### 3. Migration Summary
```
| summary_type     | total_client_groups | groups_with_advisor_text | groups_with_advisor_id | debbie_mapped | jan_mapped | others_set_to_null |
|------------------|--------------------|-----------------------|----------------------|---------------|------------|-------------------|
| PHASE2_COMPLETION| 18                 | 17                    | 14                   | 8             | 6          | 3                 |
```

### 4. Detailed Client Group Mappings
Shows each client group with:
- Original advisor text
- New advisor_id (if mapped)
- Advisor email and full name
- Migration result (MAPPED or SET_TO_NULL)

## Expected Results

Based on your data:
- **~8-10 client groups** assigned to Debbie profile
- **~6-8 client groups** assigned to Jan profile
- **~3-4 client groups** with other advisors set to NULL
- **Total: 17 client groups** with advisor text processed

## Verification Commands

After execution, verify success:

```sql
-- Quick status check
SELECT * FROM phase2_migration_summary;

-- Detailed validation
SELECT * FROM validate_phase2_migration();

-- See which groups are mapped where
SELECT 
    advisor as original_text,
    advisor_id,
    COUNT(*) as group_count
FROM client_groups 
WHERE advisor IS NOT NULL AND advisor != ''
GROUP BY advisor, advisor_id
ORDER BY advisor;
```

## Safety Features

✅ **Full Rollback Available**:
```sql
-- Rollback Phase 2 only (keeps schema from Phase 1)
SELECT rollback_phase2_data_migration();

-- Complete rollback (removes everything back to original state)
SELECT rollback_advisor_migration_complete();
```

✅ **Data Validation**: Script includes comprehensive validation checks  
✅ **Audit Trail**: All operations logged in `advisor_migration_log`  
✅ **Original Data Preserved**: Advisor text field kept unchanged

## What Happens

1. **Finds profiles** for `debbie@kingstonsfinancial.com` and `jan@kingstonsfinancial.com`
2. **Maps client groups** with advisor "Debbie" to Debbie's profile ID
3. **Maps client groups** with advisor "Jan" to Jan's profile ID  
4. **Sets advisor_id = NULL** for all other advisor names
5. **Validates** all mappings are correct
6. **Reports** detailed results and summary

## Next Steps After Phase 2

1. **Review Results**: Confirm mappings look correct
2. **Test Application**: Verify existing functionality still works
3. **Plan Phase 3**: Prepare application code updates to use advisor_id
4. **Update Database Views**: Modify views to join with profiles table

## Support

If something goes wrong:
- **Check migration log**: `SELECT * FROM advisor_migration_log ORDER BY execution_time DESC;`
- **Rollback if needed**: `SELECT rollback_phase2_data_migration();`
- **Verify profiles exist**: 
  ```sql
  SELECT * FROM profiles WHERE email IN ('debbie@kingstonsfinancial.com', 'jan@kingstonsfinancial.com');
  ```

---

**This migration follows your exact requirements: Debbie and Jan get mapped to their respective profiles, everyone else gets set to no advisor (NULL).** 