-- =========================================================
-- PHASE 2: DATA MIGRATION - Advisor Text to Foreign Key
-- =========================================================
-- This script migrates advisor text data to advisor_id foreign keys
-- Based on specific mapping requirements:
-- - Debbie → debbie@kingstonsfinancial.com
-- - Jan → jan@kingstonsfinancial.com
-- - Others → NULL (no advisor assigned)

-- ===================
-- PRE-MIGRATION VALIDATION
-- ===================

-- Verify Phase 1 completion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'client_groups' AND column_name = 'advisor_id'
    ) THEN
        RAISE EXCEPTION 'Phase 1 not completed: advisor_id column does not exist';
    END IF;
    
    RAISE NOTICE 'Phase 1 validation passed - advisor_id column exists';
END $$;

-- Log Phase 2 start
INSERT INTO advisor_migration_log (migration_step, status, details)
VALUES ('PHASE2_START', 'SUCCESS', 'Beginning data migration with specific advisor mappings');

-- ===================
-- ADVISOR MAPPING FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION execute_advisor_data_migration()
RETURNS TABLE (
    advisor_name TEXT,
    target_email TEXT,
    profile_id BIGINT,
    client_groups_updated INTEGER,
    action_taken TEXT
) AS $$
DECLARE
    debbie_profile_id BIGINT;
    jan_profile_id BIGINT;
    debbie_count INTEGER;
    jan_count INTEGER;
    other_count INTEGER;
BEGIN
    -- Find Debbie's profile
    SELECT id INTO debbie_profile_id 
    FROM profiles 
    WHERE email = 'debbie@kingstonsfinancial.com'
    LIMIT 1;
    
    -- Find Jan's profile
    SELECT id INTO jan_profile_id 
    FROM profiles 
    WHERE email = 'jan@kingstonsfinancial.com'
    LIMIT 1;
    
    -- Update Debbie's client groups
    IF debbie_profile_id IS NOT NULL THEN
        UPDATE client_groups 
        SET advisor_id = debbie_profile_id 
        WHERE advisor ILIKE 'Debbie' 
          AND advisor_id IS NULL;
        GET DIAGNOSTICS debbie_count = ROW_COUNT;
        
        RETURN QUERY SELECT 'Debbie'::TEXT, 'debbie@kingstonsfinancial.com'::TEXT, 
                           debbie_profile_id, debbie_count, 'MAPPED_TO_EXISTING_PROFILE'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Debbie'::TEXT, 'debbie@kingstonsfinancial.com'::TEXT, 
                           NULL::BIGINT, 0, 'PROFILE_NOT_FOUND'::TEXT;
    END IF;
    
    -- Update Jan's client groups
    IF jan_profile_id IS NOT NULL THEN
        UPDATE client_groups 
        SET advisor_id = jan_profile_id 
        WHERE advisor ILIKE 'Jan' 
          AND advisor_id IS NULL;
        GET DIAGNOSTICS jan_count = ROW_COUNT;
        
        RETURN QUERY SELECT 'Jan'::TEXT, 'jan@kingstonsfinancial.com'::TEXT, 
                           jan_profile_id, jan_count, 'MAPPED_TO_EXISTING_PROFILE'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Jan'::TEXT, 'jan@kingstonsfinancial.com'::TEXT, 
                           NULL::BIGINT, 0, 'PROFILE_NOT_FOUND'::TEXT;
    END IF;
    
    -- Set other advisors to NULL (no advisor assigned)
    UPDATE client_groups 
    SET advisor_id = NULL 
    WHERE advisor IS NOT NULL 
      AND advisor != ''
      AND advisor NOT ILIKE 'Debbie'
      AND advisor NOT ILIKE 'Jan'
      AND advisor_id IS NULL;
    GET DIAGNOSTICS other_count = ROW_COUNT;
    
    IF other_count > 0 THEN
        RETURN QUERY SELECT 'Other Advisors'::TEXT, 'N/A - Set to NULL'::TEXT, 
                           NULL::BIGINT, other_count, 'SET_TO_NULL_AS_REQUESTED'::TEXT;
    END IF;
    
END;
$$ LANGUAGE plpgsql;

-- ===================
-- EXECUTE MIGRATION
-- ===================

-- Run the migration and capture results
SELECT * FROM execute_advisor_data_migration();

-- Log migration execution
INSERT INTO advisor_migration_log (migration_step, status, details, affected_rows)
SELECT 'PHASE2_MAPPING', 'SUCCESS', 
       'Advisor mapping completed: ' || 
       (SELECT COUNT(*) FROM client_groups WHERE advisor_id IS NOT NULL)::TEXT || ' groups mapped, ' ||
       (SELECT COUNT(*) FROM client_groups WHERE advisor IS NOT NULL AND advisor != '' AND advisor_id IS NULL)::TEXT || ' groups set to NULL',
       (SELECT COUNT(*) FROM client_groups WHERE advisor IS NOT NULL AND advisor != '');

-- ===================
-- VALIDATION AND VERIFICATION
-- ===================

-- Verify migration results
CREATE OR REPLACE FUNCTION validate_phase2_migration()
RETURNS TABLE (
    validation_check TEXT,
    status TEXT,
    details TEXT,
    count_value INTEGER
) AS $$
BEGIN
    RETURN QUERY
    
    -- Check total client groups with advisors
    SELECT 'total_advisor_groups'::TEXT, 'INFO'::TEXT, 
           'Client groups with advisor text'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_groups WHERE advisor IS NOT NULL AND advisor != '');
    
    RETURN QUERY
    -- Check Debbie mappings
    SELECT 'debbie_mappings'::TEXT, 'INFO'::TEXT,
           'Client groups mapped to Debbie profile'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_groups cg 
            JOIN profiles p ON p.id = cg.advisor_id 
            WHERE p.email = 'debbie@kingstonsfinancial.com');
    
    RETURN QUERY
    -- Check Jan mappings  
    SELECT 'jan_mappings'::TEXT, 'INFO'::TEXT,
           'Client groups mapped to Jan profile'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_groups cg 
            JOIN profiles p ON p.id = cg.advisor_id 
            WHERE p.email = 'jan@kingstonsfinancial.com');
    
    RETURN QUERY
    -- Check groups with text but no ID (should be "other" advisors)
    SELECT 'unmapped_advisors'::TEXT, 'INFO'::TEXT,
           'Client groups with advisor text but no advisor_id (others set to NULL)'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_groups 
            WHERE advisor IS NOT NULL AND advisor != '' AND advisor_id IS NULL);
    
    RETURN QUERY
    -- Check for any mapping conflicts
    SELECT 'mapping_conflicts'::TEXT, 
           CASE WHEN (SELECT COUNT(*) FROM client_groups WHERE advisor_id IS NOT NULL AND (advisor IS NULL OR advisor = '')) > 0
                THEN 'WARNING' ELSE 'PASS' END,
           'Groups with advisor_id but no advisor text (potential conflicts)'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_groups WHERE advisor_id IS NOT NULL AND (advisor IS NULL OR advisor = ''));
           
    RETURN QUERY
    -- Data integrity check
    SELECT 'data_integrity'::TEXT,
           CASE WHEN (SELECT COUNT(*) FROM client_groups) = 
                     (SELECT COUNT(*) FROM client_groups_backup_advisor_migration)
                THEN 'PASS' ELSE 'FAIL' END,
           'No data loss during migration'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_groups);
END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_phase2_migration();

-- ===================
-- MIGRATION SUMMARY
-- ===================

-- Show final migration status
CREATE OR REPLACE VIEW phase2_migration_summary AS
SELECT 
    'PHASE2_COMPLETION' as summary_type,
    (SELECT COUNT(*) FROM client_groups) as total_client_groups,
    (SELECT COUNT(*) FROM client_groups WHERE advisor IS NOT NULL AND advisor != '') as groups_with_advisor_text,
    (SELECT COUNT(*) FROM client_groups WHERE advisor_id IS NOT NULL) as groups_with_advisor_id,
    (SELECT COUNT(*) FROM client_groups WHERE advisor ILIKE 'Debbie' AND advisor_id IS NOT NULL) as debbie_mapped,
    (SELECT COUNT(*) FROM client_groups WHERE advisor ILIKE 'Jan' AND advisor_id IS NOT NULL) as jan_mapped,
    (SELECT COUNT(*) FROM client_groups WHERE advisor IS NOT NULL AND advisor != '' AND advisor_id IS NULL) as others_set_to_null,
    (SELECT COUNT(DISTINCT p.email) FROM client_groups cg JOIN profiles p ON p.id = cg.advisor_id) as unique_advisor_profiles;

-- Display summary
SELECT * FROM phase2_migration_summary;

-- ===================
-- DETAILED RESULTS
-- ===================

-- Show which client groups are mapped to which advisors
SELECT 
    'CLIENT GROUP MAPPINGS' as report_type,
    cg.id as client_group_id,
    cg.name as client_group_name,
    cg.advisor as original_advisor_text,
    cg.advisor_id,
    p.email as advisor_email,
    CONCAT(p.first_name, ' ', p.last_name) as advisor_full_name,
    CASE 
        WHEN cg.advisor_id IS NOT NULL THEN 'MAPPED'
        WHEN cg.advisor IS NOT NULL AND cg.advisor != '' THEN 'SET_TO_NULL'
        ELSE 'NO_ADVISOR'
    END as migration_result
FROM client_groups cg
LEFT JOIN profiles p ON p.id = cg.advisor_id
WHERE cg.advisor IS NOT NULL AND cg.advisor != ''
ORDER BY cg.advisor, cg.name;

-- Log Phase 2 completion
INSERT INTO advisor_migration_log (migration_step, status, details, affected_rows)
VALUES ('PHASE2_COMPLETE', 'SUCCESS', 'Phase 2 data migration completed successfully',
        (SELECT COUNT(*) FROM client_groups WHERE advisor IS NOT NULL AND advisor != ''));

-- Display completion message
SELECT 
    'PHASE 2 COMPLETED' as status,
    'Advisor data migration executed per requirements' as message,
    'Debbie and Jan mapped to profiles, others set to NULL' as mapping_strategy,
    'Ready for Phase 3 (Application Updates)' as next_step; 