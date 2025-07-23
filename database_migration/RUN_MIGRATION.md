# Quick Start: Run Database Migration

## Files Created

The database preparation phase includes these files:

1. **`01_pre_migration_analysis.sql`** - Analyzes current advisor data
2. **`02_backup_and_rollback.sql`** - Creates backups and rollback functions  
3. **`03_phase1_schema_changes.sql`** - Adds advisor_id column (non-breaking)
4. **`README_EXECUTION_GUIDE.md`** - Detailed execution instructions

## Quick Execution (Command Line)

### Option 1: Using psql with Supabase
```bash
# Replace with your actual Supabase connection details
export PGPASSWORD="your_password"

# Step 1: Analyze current data
psql -h db.your-project.supabase.co -U postgres -d postgres -f database_migration/01_pre_migration_analysis.sql

# Step 2: Create backups and rollback infrastructure
psql -h db.your-project.supabase.co -U postgres -d postgres -f database_migration/02_backup_and_rollback.sql

# Step 3: Execute schema changes (adds advisor_id column)
psql -h db.your-project.supabase.co -U postgres -d postgres -f database_migration/03_phase1_schema_changes.sql
```

### Option 2: Using Supabase Dashboard
1. Open Supabase dashboard → SQL Editor
2. Copy and paste contents of each file in order:
   - `01_pre_migration_analysis.sql`
   - `02_backup_and_rollback.sql` 
   - `03_phase1_schema_changes.sql`
3. Execute each script and review results

### Option 3: Using pgAdmin or other GUI
1. Connect to your database
2. Open SQL query window
3. Run each script in order (copy/paste contents)

## Verification Commands

After running all scripts, verify success:

```sql
-- Check migration status
SELECT * FROM validate_phase1_completion();

-- View migration summary
SELECT * FROM migration_readiness_summary;

-- Check what advisors need profiles created
SELECT * FROM advisors_needing_profiles;
```

## What Happens

### ✅ SAFE Changes (No Data Loss Risk):
- Adds `advisor_id` column to `client_groups` table
- Creates backup tables for rollback
- Creates analysis views to understand current data
- **Preserves existing `advisor` text field**
- Application continues working normally

### 📊 Analysis Results:
After running, you'll see:
- How many client groups have advisors
- Which advisor names might match existing profiles
- Which advisors will need new profiles created
- Migration readiness assessment

## Next Steps

1. **Review Results**: Check the analysis output to understand your data
2. **Plan Phase 2**: Decide how to handle advisor-to-profile mapping
3. **Test Application**: Verify everything still works normally
4. **Proceed to Phase 2**: When ready, execute data migration

## Emergency Rollback

If something goes wrong:
```sql
SELECT rollback_advisor_migration_phase1();
```

This removes all changes and restores original state.

## Support

If you encounter issues:
1. Check the migration log: `SELECT * FROM advisor_migration_log;`
2. Verify permissions for CREATE/ALTER operations
3. Ensure `profiles` table exists and has data
4. Review detailed execution guide in `README_EXECUTION_GUIDE.md` 