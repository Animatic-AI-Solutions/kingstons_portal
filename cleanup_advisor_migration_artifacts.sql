-- ===============================================
-- ADVISOR MIGRATION CLEANUP SCRIPT
-- ===============================================
-- This script removes all helper functions, views, and temporary tables
-- created during the advisor migration process.
-- 
-- IMPORTANT: This preserves:
-- - The advisor_id column in client_groups table
-- - All production data and relationships
-- - The updated client_group_complete_data view (production view)
-- 
-- This removes:
-- - Migration helper views and functions
-- - Backup tables created during migration
-- - Migration log tables
-- - Temporary analysis views
-- ===============================================

BEGIN;

-- ===============================================
-- 1. DROP MIGRATION HELPER VIEWS
-- ===============================================

-- Drop advisor management views created during migration
DROP VIEW IF EXISTS advisor_client_summary CASCADE;
DROP VIEW IF EXISTS clients_without_advisors CASCADE;
DROP VIEW IF EXISTS advisor_migration_status_overview CASCADE;

-- Drop migration analysis views
DROP VIEW IF EXISTS advisor_migration_analysis CASCADE;
DROP VIEW IF EXISTS advisor_profile_matching CASCADE;
DROP VIEW IF EXISTS advisors_needing_profiles CASCADE;

-- ===============================================
-- 2. DROP MIGRATION HELPER FUNCTIONS
-- ===============================================

-- Drop rollback functions
DROP FUNCTION IF EXISTS rollback_advisor_migration_phase1() CASCADE;
DROP FUNCTION IF EXISTS rollback_advisor_migration_complete() CASCADE;

-- Drop any other migration helper functions
DROP FUNCTION IF EXISTS migrate_advisor_data() CASCADE;
DROP FUNCTION IF EXISTS create_advisor_profiles() CASCADE;
DROP FUNCTION IF EXISTS analyze_advisor_data() CASCADE;

-- ===============================================
-- 3. DROP MIGRATION BACKUP TABLES
-- ===============================================

-- Drop backup tables created during migration
DROP TABLE IF EXISTS client_groups_backup_advisor_migration CASCADE;
DROP TABLE IF EXISTS profiles_backup_advisor_migration CASCADE;

-- Drop any view backup tables
DROP TABLE IF EXISTS client_group_complete_data_backup_advisor_migration CASCADE;

-- ===============================================
-- 4. DROP MIGRATION LOG AND TRACKING TABLES
-- ===============================================

-- Drop migration log table
DROP TABLE IF EXISTS advisor_migration_log CASCADE;

-- Drop any temporary tracking tables
DROP TABLE IF EXISTS advisor_migration_progress CASCADE;
DROP TABLE IF EXISTS advisor_data_analysis CASCADE;

-- ===============================================
-- 5. DROP MIGRATION-SPECIFIC INDEXES (if any were created)
-- ===============================================

-- Drop any temporary indexes created for migration
DROP INDEX IF EXISTS idx_temp_advisor_migration CASCADE;
DROP INDEX IF EXISTS idx_advisor_text_analysis CASCADE;

-- ===============================================
-- 6. CLEAN UP ANY MIGRATION-SPECIFIC TRIGGERS
-- ===============================================

-- Drop any triggers created during migration
DROP TRIGGER IF EXISTS advisor_migration_audit_trigger ON client_groups CASCADE;
DROP FUNCTION IF EXISTS advisor_migration_audit_function() CASCADE;

-- ===============================================
-- 7. VERIFICATION QUERIES
-- ===============================================

-- Verify cleanup was successful
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'ADVISOR MIGRATION CLEANUP VERIFICATION';
    RAISE NOTICE '===============================================';
    
    -- Check if production advisor_id column still exists (should exist)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'client_groups' 
        AND column_name = 'advisor_id'
    ) THEN
        RAISE NOTICE '✅ Production advisor_id column preserved';
    ELSE
        RAISE NOTICE '❌ WARNING: advisor_id column missing!';
    END IF;
    
    -- Check if production view still exists (should exist)
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'client_group_complete_data'
    ) THEN
        RAISE NOTICE '✅ Production client_group_complete_data view preserved';
    ELSE
        RAISE NOTICE '❌ WARNING: Production view missing!';
    END IF;
    
    -- Check if migration artifacts were removed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name LIKE '%advisor_migration%'
    ) THEN
        RAISE NOTICE '✅ Migration tables cleaned up';
    ELSE
        RAISE NOTICE '⚠️  Some migration tables may still exist';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name LIKE '%advisor%' 
        AND table_name != 'client_group_complete_data'
    ) THEN
        RAISE NOTICE '✅ Migration views cleaned up';
    ELSE
        RAISE NOTICE '⚠️  Some migration views may still exist';
    END IF;
    
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Cleanup completed. Please verify your application';
    RAISE NOTICE 'still works correctly with advisor functionality.';
    RAISE NOTICE '===============================================';
END $$;

-- ===============================================
-- 8. FINAL PRODUCTION DATA VERIFICATION
-- ===============================================

-- Show current advisor assignments to verify data integrity
SELECT 
    'Current advisor assignments:' as info,
    COUNT(*) as total_client_groups,
    COUNT(advisor_id) as groups_with_advisor,
    COUNT(*) - COUNT(advisor_id) as groups_without_advisor
FROM client_groups;

-- Show sample of advisor data to verify it's working
SELECT 
    'Sample advisor data from production view:' as info;

SELECT 
    client_group_name as client_name,
    advisor_name,
    advisor_email,
    CASE 
        WHEN advisor_id IS NOT NULL THEN 'Has Advisor'
        ELSE 'No Advisor'
    END as advisor_status
FROM client_group_complete_data
WHERE client_group_name IS NOT NULL
LIMIT 5;

COMMIT;

-- ===============================================
-- CLEANUP COMPLETE
-- ===============================================
-- 
-- What was preserved:
-- ✅ advisor_id column in client_groups table
-- ✅ All client group data and advisor assignments
-- ✅ Production client_group_complete_data view with advisor information
-- ✅ All indexes needed for production (idx_client_groups_advisor_id)
-- 
-- What was removed:
-- ❌ All migration helper views (advisor_client_summary, etc.)
-- ❌ All migration functions (rollback functions, etc.)
-- ❌ All backup tables (*_backup_advisor_migration)
-- ❌ Migration log tables (advisor_migration_log)
-- ❌ Temporary analysis views and functions
-- 
-- Next steps:
-- 1. Test your application to ensure advisor functionality still works
-- 2. Verify advisor names display correctly in ClientDetails page
-- 3. Confirm advisor dropdowns are populated correctly
-- 4. Check that advisor assignments are saving properly
-- 
-- If you encounter any issues, the core advisor functionality 
-- (advisor_id column and updated views) is preserved.
-- =============================================== 