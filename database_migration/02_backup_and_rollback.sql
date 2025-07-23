-- =========================================================
-- BACKUP AND ROLLBACK SCRIPTS: Advisor Field Migration
-- =========================================================
-- These scripts provide backup and rollback capabilities for the migration

-- ===================
-- BACKUP COMMANDS
-- ===================
-- Run these commands from the command line before starting migration

/*
-- Full table backup (command line)
pg_dump -h [hostname] -U [username] -d [database] -t client_groups --data-only --inserts > client_groups_data_backup.sql
pg_dump -h [hostname] -U [username] -d [database] -t profiles --data-only --inserts > profiles_data_backup.sql

-- Schema backup for affected tables
pg_dump -h [hostname] -U [username] -d [database] -t client_groups --schema-only > client_groups_schema_backup.sql
pg_dump -h [hostname] -U [username] -d [database] -t profiles --schema-only > profiles_schema_backup.sql

-- Full database backup (recommended)
pg_dump -h [hostname] -U [username] -d [database] > full_database_backup_before_advisor_migration.sql
*/

-- ===================
-- CREATE BACKUP TABLES
-- ===================
-- Create backup tables within the database for quick recovery

-- Backup current client_groups data
CREATE TABLE IF NOT EXISTS client_groups_backup_advisor_migration AS
SELECT * FROM client_groups;

-- Backup current profiles data  
CREATE TABLE IF NOT EXISTS profiles_backup_advisor_migration AS
SELECT * FROM profiles;

-- Create migration log table
CREATE TABLE IF NOT EXISTS advisor_migration_log (
    id SERIAL PRIMARY KEY,
    migration_step TEXT NOT NULL,
    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL, -- 'SUCCESS', 'ERROR', 'ROLLBACK'
    details TEXT,
    affected_rows INTEGER
);

-- Log the backup creation
INSERT INTO advisor_migration_log (migration_step, status, details, affected_rows)
VALUES 
    ('BACKUP_CLIENT_GROUPS', 'SUCCESS', 'Created client_groups_backup_advisor_migration table', 
     (SELECT COUNT(*) FROM client_groups_backup_advisor_migration)),
    ('BACKUP_PROFILES', 'SUCCESS', 'Created profiles_backup_advisor_migration table',
     (SELECT COUNT(*) FROM profiles_backup_advisor_migration));

-- ===================
-- ROLLBACK SCRIPTS
-- ===================

-- Function to rollback Phase 1 changes (schema additions)
CREATE OR REPLACE FUNCTION rollback_advisor_migration_phase1()
RETURNS TEXT AS $$
DECLARE
    result_message TEXT;
BEGIN
    -- Drop new column and index
    ALTER TABLE client_groups DROP COLUMN IF EXISTS advisor_id;
    DROP INDEX IF EXISTS idx_client_groups_advisor_id;
    
    -- Drop analysis views
    DROP VIEW IF EXISTS advisor_migration_analysis;
    
    -- Drop migration helper function if it exists
    DROP FUNCTION IF EXISTS migrate_advisor_data();
    
    -- Log rollback
    INSERT INTO advisor_migration_log (migration_step, status, details)
    VALUES ('ROLLBACK_PHASE1', 'SUCCESS', 'Rolled back Phase 1 schema changes');
    
    result_message := 'Phase 1 rollback completed successfully';
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO advisor_migration_log (migration_step, status, details)
        VALUES ('ROLLBACK_PHASE1', 'ERROR', SQLERRM);
        RETURN 'Error during Phase 1 rollback: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback data migration (Phase 2)
CREATE OR REPLACE FUNCTION rollback_advisor_migration_phase2()
RETURNS TEXT AS $$
DECLARE
    result_message TEXT;
    rows_affected INTEGER;
BEGIN
    -- Reset advisor_id to NULL
    UPDATE client_groups SET advisor_id = NULL;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Remove any profiles created during migration
    -- (This is more complex and should be done carefully)
    -- For now, we'll just log which profiles were created
    
    -- Log rollback
    INSERT INTO advisor_migration_log (migration_step, status, details, affected_rows)
    VALUES ('ROLLBACK_PHASE2', 'SUCCESS', 'Reset all advisor_id values to NULL', rows_affected);
    
    result_message := 'Phase 2 rollback completed. Reset ' || rows_affected || ' advisor_id values';
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO advisor_migration_log (migration_step, status, details)
        VALUES ('ROLLBACK_PHASE2', 'ERROR', SQLERRM);
        RETURN 'Error during Phase 2 rollback: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback view updates (Phase 3)
CREATE OR REPLACE FUNCTION rollback_advisor_migration_phase3()
RETURNS TEXT AS $$
DECLARE
    result_message TEXT;
BEGIN
    -- This would restore original views from backup
    -- For now, we'll just drop the modified views so they can be recreated
    DROP VIEW IF EXISTS client_group_complete_data CASCADE;
    -- Note: Original views would need to be recreated from database.sql
    
    -- Log rollback
    INSERT INTO advisor_migration_log (migration_step, status, details)
    VALUES ('ROLLBACK_PHASE3', 'SUCCESS', 'Dropped modified views - original views need manual recreation');
    
    result_message := 'Phase 3 rollback completed - recreate original views from database.sql';
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO advisor_migration_log (migration_step, status, details)
        VALUES ('ROLLBACK_PHASE3', 'ERROR', SQLERRM);
        RETURN 'Error during Phase 3 rollback: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Complete rollback function
CREATE OR REPLACE FUNCTION rollback_advisor_migration_complete()
RETURNS TEXT AS $$
DECLARE
    result_message TEXT;
    phase1_result TEXT;
    phase2_result TEXT;
    phase3_result TEXT;
BEGIN
    -- Execute rollbacks in reverse order
    SELECT rollback_advisor_migration_phase3() INTO phase3_result;
    SELECT rollback_advisor_migration_phase2() INTO phase2_result;
    SELECT rollback_advisor_migration_phase1() INTO phase1_result;
    
    result_message := 'Complete rollback executed: ' || 
                     'Phase3: ' || phase3_result || '; ' ||
                     'Phase2: ' || phase2_result || '; ' ||
                     'Phase1: ' || phase1_result;
    
    INSERT INTO advisor_migration_log (migration_step, status, details)
    VALUES ('ROLLBACK_COMPLETE', 'SUCCESS', result_message);
    
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO advisor_migration_log (migration_step, status, details)
        VALUES ('ROLLBACK_COMPLETE', 'ERROR', SQLERRM);
        RETURN 'Error during complete rollback: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- VERIFICATION QUERIES
-- ===================

-- Check if migration tables exist
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'advisor_id_column'::TEXT, 
           CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'client_groups' AND column_name = 'advisor_id'
           ) THEN 'EXISTS' ELSE 'NOT_EXISTS' END,
           'advisor_id column in client_groups table'::TEXT
    
    UNION ALL
    
    SELECT 'advisor_id_index'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM pg_indexes 
               WHERE tablename = 'client_groups' AND indexname = 'idx_client_groups_advisor_id'
           ) THEN 'EXISTS' ELSE 'NOT_EXISTS' END,
           'Index on advisor_id column'::TEXT
    
    UNION ALL
    
    SELECT 'backup_tables'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_groups_backup_advisor_migration')
                AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles_backup_advisor_migration')
           THEN 'EXISTS' ELSE 'NOT_EXISTS' END,
           'Backup tables for rollback'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Usage examples:
-- SELECT * FROM check_migration_status();
-- SELECT rollback_advisor_migration_phase1();
-- SELECT rollback_advisor_migration_complete(); 