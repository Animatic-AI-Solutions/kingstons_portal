-- ===============================================
-- ADVISOR MIGRATION CLEANUP SCRIPT (SIMPLIFIED)
-- ===============================================
-- This script removes all helper functions, views, and temporary tables
-- created during the advisor migration process - simplified version.
-- 
-- PRESERVES: advisor_id column, production data, production views
-- REMOVES: All migration helper artifacts
-- ===============================================

BEGIN;

-- Drop migration helper views
DROP VIEW IF EXISTS advisor_client_summary CASCADE;
DROP VIEW IF EXISTS clients_without_advisors CASCADE;
DROP VIEW IF EXISTS advisor_migration_status_overview CASCADE;
DROP VIEW IF EXISTS advisor_migration_analysis CASCADE;
DROP VIEW IF EXISTS advisor_profile_matching CASCADE;
DROP VIEW IF EXISTS advisors_needing_profiles CASCADE;

-- Drop migration helper functions
DROP FUNCTION IF EXISTS rollback_advisor_migration_phase1() CASCADE;
DROP FUNCTION IF EXISTS rollback_advisor_migration_complete() CASCADE;
DROP FUNCTION IF EXISTS migrate_advisor_data() CASCADE;
DROP FUNCTION IF EXISTS create_advisor_profiles() CASCADE;
DROP FUNCTION IF EXISTS analyze_advisor_data() CASCADE;
DROP FUNCTION IF EXISTS advisor_migration_audit_function() CASCADE;

-- Drop backup tables
DROP TABLE IF EXISTS client_groups_backup_advisor_migration CASCADE;
DROP TABLE IF EXISTS profiles_backup_advisor_migration CASCADE;
DROP TABLE IF EXISTS client_group_complete_data_backup_advisor_migration CASCADE;

-- Drop migration log and tracking tables
DROP TABLE IF EXISTS advisor_migration_log CASCADE;
DROP TABLE IF EXISTS advisor_migration_progress CASCADE;
DROP TABLE IF EXISTS advisor_data_analysis CASCADE;

-- Drop temporary indexes
DROP INDEX IF EXISTS idx_temp_advisor_migration CASCADE;
DROP INDEX IF EXISTS idx_advisor_text_analysis CASCADE;

-- Drop migration triggers
DROP TRIGGER IF EXISTS advisor_migration_audit_trigger ON client_groups CASCADE;

COMMIT;

-- Simple verification - just show completion message
SELECT 'Advisor migration artifacts cleanup completed!' as status; 