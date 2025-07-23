-- =========================================================
-- PHASE 2 ROLLBACK: Undo Data Migration
-- =========================================================
-- This script can rollback ONLY the data migration from Phase 2
-- while preserving the schema changes from Phase 1

-- ===================
-- PHASE 2 SPECIFIC ROLLBACK
-- ===================

CREATE OR REPLACE FUNCTION rollback_phase2_data_migration()
RETURNS TEXT AS $$
DECLARE
    result_message TEXT;
    rows_affected INTEGER;
BEGIN
    -- Reset all advisor_id values to NULL (undo the mapping)
    UPDATE client_groups SET advisor_id = NULL 
    WHERE advisor_id IS NOT NULL;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Log the rollback
    INSERT INTO advisor_migration_log (migration_step, status, details, affected_rows)
    VALUES ('PHASE2_ROLLBACK', 'SUCCESS', 
            'Rolled back Phase 2 data migration - reset all advisor_id to NULL', 
            rows_affected);
    
    result_message := 'Phase 2 rollback completed successfully. ' || 
                     'Reset ' || rows_affected || ' advisor_id values to NULL. ' ||
                     'Original advisor text preserved. Schema from Phase 1 intact.';
    
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO advisor_migration_log (migration_step, status, details)
        VALUES ('PHASE2_ROLLBACK', 'ERROR', 'Phase 2 rollback failed: ' || SQLERRM);
        RETURN 'Error during Phase 2 rollback: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- VERIFICATION AFTER ROLLBACK
-- ===================

CREATE OR REPLACE FUNCTION verify_phase2_rollback()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT,
    count_value INTEGER
) AS $$
BEGIN
    RETURN QUERY
    
    -- Check that all advisor_id values are NULL
    SELECT 'advisor_id_reset'::TEXT,
           CASE WHEN (SELECT COUNT(*) FROM client_groups WHERE advisor_id IS NOT NULL) = 0
                THEN 'PASS' ELSE 'FAIL' END,
           'All advisor_id values should be NULL after rollback'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_groups WHERE advisor_id IS NOT NULL);
    
    RETURN QUERY
    -- Check that original advisor text is preserved
    SELECT 'advisor_text_preserved'::TEXT,
           CASE WHEN (SELECT COUNT(*) FROM client_groups WHERE advisor IS NOT NULL AND advisor != '') > 0
                THEN 'PASS' ELSE 'WARNING' END,
           'Original advisor text should be preserved'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_groups WHERE advisor IS NOT NULL AND advisor != '');
    
    RETURN QUERY
    -- Check that schema is still intact (Phase 1)
    SELECT 'schema_intact'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'client_groups' AND column_name = 'advisor_id'
           ) THEN 'PASS' ELSE 'FAIL' END,
           'advisor_id column should still exist after Phase 2 rollback'::TEXT,
           1;
    
    RETURN QUERY
    -- Check data integrity
    SELECT 'data_integrity'::TEXT,
           CASE WHEN (SELECT COUNT(*) FROM client_groups) = 
                     (SELECT COUNT(*) FROM client_groups_backup_advisor_migration)
                THEN 'PASS' ELSE 'FAIL' END,
           'No data loss during rollback'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_groups);
END;
$$ LANGUAGE plpgsql;

-- ===================
-- USAGE EXAMPLES
-- ===================

/*
-- To rollback Phase 2 data migration only:
SELECT rollback_phase2_data_migration();

-- To verify rollback was successful:
SELECT * FROM verify_phase2_rollback();

-- To see current state after rollback:
SELECT 
    COUNT(*) as total_groups,
    COUNT(advisor) as groups_with_advisor_text,
    COUNT(advisor_id) as groups_with_advisor_id
FROM client_groups;

-- This should show:
-- - total_groups: [your total]
-- - groups_with_advisor_text: [should match original]
-- - groups_with_advisor_id: 0 (all should be NULL after rollback)
*/ 