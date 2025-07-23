# Database Migration Execution Guide
## Advisor Field Migration - Database Preparation Phase

This guide provides step-by-step instructions for executing the database preparation scripts for the advisor field migration.

## Overview

We're migrating the `advisor` field in `client_groups` from a text field to a foreign key relationship with the `profiles` table. This preparation phase is **NON-BREAKING** and safe to run on production.

### What This Phase Accomplishes:
- ✅ Adds new `advisor_id` column alongside existing `advisor` text field
- ✅ Creates backup tables for rollback capability
- ✅ Creates analysis views to understand current data
- ✅ Sets up logging and verification functions
- ✅ Preserves all existing functionality

## Prerequisites

1. **Database Access**: Ensure you have appropriate permissions to:
   - CREATE/ALTER tables
   - CREATE indexes
   - CREATE views and functions
   - INSERT/UPDATE data

2. **Backup**: Consider creating a full database backup before starting:
   ```bash
   pg_dump -h [hostname] -U [username] -d [database] > full_backup_before_advisor_migration.sql
   ```

3. **Connection**: Establish connection to your database using your preferred method:
   - psql command line
   - pgAdmin
   - Supabase dashboard
   - Database management tool

## Execution Steps

### Step 1: Pre-Migration Analysis
**Purpose**: Understand current advisor data before making changes

```sql
-- Execute the analysis script
\i database_migration/01_pre_migration_analysis.sql

-- Or copy and paste the contents directly
```

**Expected Output**:
- Overview of advisor field usage
- List of unique advisors and their frequency
- Name pattern analysis (First Last, Single Name, etc.)
- Potential matches with existing profiles
- Summary of advisors that will need new profiles created

**Review Results**:
- Take note of how many client groups have advisors
- Check if any advisor names match existing profiles
- Understand how many new profiles will need to be created

### Step 2: Create Backups and Rollback Infrastructure
**Purpose**: Set up safety nets before making schema changes

```sql
-- Execute the backup script
\i database_migration/02_backup_and_rollback.sql

-- Or copy and paste the contents directly
```

**Expected Output**:
- Backup tables created: `client_groups_backup_advisor_migration`, `profiles_backup_advisor_migration`
- Migration log table created: `advisor_migration_log`
- Rollback functions created
- Initial backup entries logged

**Verification**:
```sql
-- Check backup tables were created
SELECT * FROM check_migration_status();

-- View migration log
SELECT * FROM advisor_migration_log ORDER BY execution_time;
```

### Step 3: Execute Phase 1 Schema Changes
**Purpose**: Add new column and supporting infrastructure

```sql
-- Execute Phase 1 schema changes
\i database_migration/03_phase1_schema_changes.sql

-- Or copy and paste the contents directly
```

**Expected Output**:
- New `advisor_id` column added to `client_groups`
- Index `idx_client_groups_advisor_id` created
- Analysis views created:
  - `advisor_migration_analysis`
  - `advisor_profile_matching` 
  - `advisors_needing_profiles`
  - `migration_readiness_summary`
- Validation results showing all checks passed

**Critical Verification**:
```sql
-- Verify Phase 1 completion
SELECT * FROM validate_phase1_completion();

-- All checks should show 'PASS' status
-- If any show 'FAIL', investigate before proceeding
```

### Step 4: Analyze Migration Readiness
**Purpose**: Review data analysis to plan Phase 2

```sql
-- View overall migration readiness
SELECT * FROM migration_readiness_summary;

-- Review which advisors can be matched to existing profiles
SELECT * FROM advisor_profile_matching 
WHERE match_type IN ('EXACT_MATCH', 'PARTIAL_MATCH')
ORDER BY advisor_text;

-- Review which advisors will need new profiles
SELECT * FROM advisors_needing_profiles;

-- Check current migration status
SELECT * FROM advisor_migration_analysis
ORDER BY migration_status, client_group_name;
```

## Verification Checklist

After completing all steps, verify the following:

### ✅ Schema Verification
```sql
-- Check column exists
\d client_groups

-- Should show both 'advisor' (text) and 'advisor_id' (bigint) columns
```

### ✅ Data Integrity
```sql
-- Verify no data loss
SELECT 
    (SELECT COUNT(*) FROM client_groups) as current_count,
    (SELECT COUNT(*) FROM client_groups_backup_advisor_migration) as backup_count,
    CASE WHEN (SELECT COUNT(*) FROM client_groups) = 
              (SELECT COUNT(*) FROM client_groups_backup_advisor_migration)
         THEN 'DATA_INTACT' 
         ELSE 'DATA_LOSS_DETECTED' 
    END as integrity_status;
```

### ✅ Foreign Key Constraint
```sql
-- Test foreign key constraint
-- This should fail (which is good - constraint is working)
INSERT INTO client_groups (name, advisor_id) VALUES ('Test', 99999);
-- Expected: ERROR: insert or update on table "client_groups" violates foreign key constraint

-- Clean up test
DELETE FROM client_groups WHERE name = 'Test' AND advisor_id = 99999;
```

### ✅ Application Functionality
- Verify existing application functionality still works
- Client groups should display and function normally
- Existing advisor text should still be visible

## Next Steps

After successful completion:

1. **Review Analysis Results**: Study the output from analysis views to understand:
   - How many advisors need new profiles
   - Which advisors can be matched to existing profiles
   - Any data quality issues that need addressing

2. **Plan Phase 2**: Based on analysis results, plan the data migration approach:
   - Decide on profile creation strategy for unmapped advisors
   - Plan any manual matching for ambiguous cases
   - Schedule Phase 2 execution

3. **Monitor Application**: Ensure existing functionality continues to work normally

## Rollback Instructions

If you need to rollback Phase 1 changes:

```sql
-- Rollback Phase 1 only
SELECT rollback_advisor_migration_phase1();

-- Or complete rollback (if multiple phases were executed)
SELECT rollback_advisor_migration_complete();
```

**Note**: Rollback will:
- Remove `advisor_id` column
- Drop analysis views
- Drop indexes
- Preserve original `advisor` text field
- Log rollback actions

## Troubleshooting

### Common Issues:

1. **Permission Errors**: Ensure database user has CREATE privileges
2. **Foreign Key Violations**: Verify `profiles` table exists and has data
3. **Existing Column**: If `advisor_id` already exists, check if previous migration was attempted

### Support Queries:
```sql
-- Check current migration status
SELECT * FROM advisor_migration_log ORDER BY execution_time DESC;

-- View detailed migration analysis
SELECT * FROM advisor_migration_analysis LIMIT 10;

-- Check system status
SELECT * FROM check_migration_status();
```

## Success Criteria

Phase 1 is complete when:
- ✅ All validation checks pass
- ✅ No data loss detected
- ✅ Application functionality preserved
- ✅ Analysis views provide clear migration insights
- ✅ Rollback capability confirmed

You are now ready to proceed to Phase 2: Data Migration when you're ready to migrate the actual advisor data to the new foreign key relationships. 