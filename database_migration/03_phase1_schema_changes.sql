-- =========================================================
-- PHASE 1: SCHEMA PREPARATION (NON-BREAKING CHANGES)
-- =========================================================
-- This script adds the new advisor_id column and supporting structures
-- WITHOUT modifying or removing existing advisor text field
-- Safe to run on production - no data loss risk

-- ===================
-- SCHEMA CHANGES
-- ===================

-- Add new advisor_id column (nullable, no default)
-- This allows gradual migration without disrupting existing functionality
ALTER TABLE public.client_groups 
ADD COLUMN advisor_id bigint REFERENCES public.profiles(id);

-- Add comment for documentation
COMMENT ON COLUMN public.client_groups.advisor_id IS 
'Foreign key to profiles table. Will replace advisor text field. NULL during migration.';

-- Create index for performance
CREATE INDEX idx_client_groups_advisor_id 
ON public.client_groups USING btree (advisor_id) 
TABLESPACE pg_default;

-- Log Phase 1 completion
INSERT INTO advisor_migration_log (migration_step, status, details)
VALUES ('PHASE1_SCHEMA', 'SUCCESS', 'Added advisor_id column and index');

-- ===================
-- ANALYSIS VIEWS
-- ===================

-- View to analyze current advisor data for migration planning
CREATE OR REPLACE VIEW advisor_migration_analysis AS
SELECT 
    cg.id as client_group_id,
    cg.name as client_group_name,
    cg.advisor as current_advisor_text,
    cg.advisor_id as new_advisor_id,
    CASE 
        WHEN cg.advisor_id IS NOT NULL THEN 'MIGRATED'
        WHEN cg.advisor IS NULL OR cg.advisor = '' THEN 'NO_ADVISOR'
        ELSE 'PENDING_MIGRATION'
    END as migration_status,
    p.id as profile_id,
    CONCAT(p.first_name, ' ', p.last_name) as profile_name,
    p.email as profile_email,
    CASE 
        WHEN cg.advisor_id IS NOT NULL THEN p.id
        WHEN p.id IS NOT NULL THEN p.id
        ELSE NULL
    END as suggested_profile_id
FROM client_groups cg
LEFT JOIN profiles p ON p.id = cg.advisor_id
ORDER BY 
    CASE 
        WHEN cg.advisor_id IS NOT NULL THEN 1  -- Migrated first
        WHEN cg.advisor IS NULL OR cg.advisor = '' THEN 3  -- No advisor last
        ELSE 2  -- Pending migration in middle
    END,
    cg.name;

-- View to show potential profile matches for unmigrated advisors
CREATE OR REPLACE VIEW advisor_profile_matching AS
SELECT DISTINCT
    cg.advisor as advisor_text,
    COUNT(cg.id) as client_groups_count,
    p.id as potential_profile_id,
    CONCAT(p.first_name, ' ', p.last_name) as potential_profile_name,
    p.email as potential_profile_email,
    CASE 
        WHEN CONCAT(p.first_name, ' ', p.last_name) ILIKE cg.advisor THEN 'EXACT_MATCH'
        WHEN p.first_name ILIKE cg.advisor OR p.last_name ILIKE cg.advisor THEN 'PARTIAL_MATCH'
        WHEN CONCAT(p.last_name, ', ', p.first_name) ILIKE cg.advisor THEN 'REVERSED_MATCH'
        ELSE 'NO_MATCH'
    END as match_type
FROM client_groups cg
LEFT JOIN profiles p ON (
    CONCAT(p.first_name, ' ', p.last_name) ILIKE cg.advisor
    OR p.first_name ILIKE cg.advisor
    OR p.last_name ILIKE cg.advisor
    OR CONCAT(p.last_name, ', ', p.first_name) ILIKE cg.advisor
)
WHERE cg.advisor IS NOT NULL 
  AND cg.advisor != ''
  AND cg.advisor_id IS NULL  -- Only unmigrated advisors
GROUP BY cg.advisor, p.id, p.first_name, p.last_name, p.email
ORDER BY cg.advisor, match_type;

-- View to show advisors that need new profiles created
CREATE OR REPLACE VIEW advisors_needing_profiles AS
SELECT 
    cg.advisor as advisor_text,
    COUNT(cg.id) as client_groups_affected,
    split_part(cg.advisor, ' ', 1) as suggested_first_name,
    CASE 
        WHEN position(' ' in cg.advisor) > 0 
        THEN substring(cg.advisor from position(' ' in cg.advisor) + 1)
        ELSE ''
    END as suggested_last_name,
    lower(replace(cg.advisor, ' ', '.')) || '@company.com' as suggested_email
FROM client_groups cg
WHERE cg.advisor IS NOT NULL 
  AND cg.advisor != ''
  AND cg.advisor_id IS NULL  -- Only unmigrated advisors
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE CONCAT(p.first_name, ' ', p.last_name) ILIKE cg.advisor
       OR p.first_name ILIKE cg.advisor
       OR p.last_name ILIKE cg.advisor
       OR CONCAT(p.last_name, ', ', p.first_name) ILIKE cg.advisor
  )
GROUP BY cg.advisor
ORDER BY COUNT(cg.id) DESC, cg.advisor;

-- Log view creation
INSERT INTO advisor_migration_log (migration_step, status, details)
VALUES ('PHASE1_VIEWS', 'SUCCESS', 'Created analysis views for migration planning');

-- ===================
-- VERIFICATION QUERIES
-- ===================

-- Function to validate Phase 1 completion
CREATE OR REPLACE FUNCTION validate_phase1_completion()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    
    -- Check if advisor_id column exists
    SELECT 'advisor_id_column'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'client_groups' 
                 AND column_name = 'advisor_id'
                 AND data_type = 'bigint'
           ) THEN 'PASS' ELSE 'FAIL' END,
           'advisor_id column exists with correct type'::TEXT
    
    UNION ALL
    
    -- Check foreign key constraint
    SELECT 'foreign_key_constraint'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.table_constraints tc
               JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
               WHERE tc.table_name = 'client_groups'
                 AND kcu.column_name = 'advisor_id'
                 AND tc.constraint_type = 'FOREIGN KEY'
           ) THEN 'PASS' ELSE 'FAIL' END,
           'Foreign key constraint to profiles table exists'::TEXT
    
    UNION ALL
    
    -- Check index exists
    SELECT 'advisor_id_index'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM pg_indexes 
               WHERE tablename = 'client_groups' 
                 AND indexname = 'idx_client_groups_advisor_id'
           ) THEN 'PASS' ELSE 'FAIL' END,
           'Index on advisor_id column exists'::TEXT
    
    UNION ALL
    
    -- Check original advisor column still exists
    SELECT 'original_advisor_column'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'client_groups' 
                 AND column_name = 'advisor'
                 AND data_type = 'text'
           ) THEN 'PASS' ELSE 'FAIL' END,
           'Original advisor text column preserved'::TEXT
    
    UNION ALL
    
    -- Check analysis views exist
    SELECT 'analysis_views'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'advisor_migration_analysis')
                AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'advisor_profile_matching')
                AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'advisors_needing_profiles')
           THEN 'PASS' ELSE 'FAIL' END,
           'All analysis views created successfully'::TEXT
    
    UNION ALL
    
    -- Check data integrity
    SELECT 'data_integrity'::TEXT,
           CASE WHEN (SELECT COUNT(*) FROM client_groups) = 
                     (SELECT COUNT(*) FROM client_groups_backup_advisor_migration)
           THEN 'PASS' ELSE 'FAIL' END,
           'No data loss during schema changes'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- SUMMARY INFORMATION
-- ===================

-- Show migration readiness summary
CREATE OR REPLACE VIEW migration_readiness_summary AS
SELECT 
    'PHASE_1_COMPLETION' as summary_type,
    (SELECT COUNT(*) FROM client_groups) as total_client_groups,
    (SELECT COUNT(*) FROM client_groups WHERE advisor IS NOT NULL AND advisor != '') as groups_with_advisors,
    (SELECT COUNT(*) FROM client_groups WHERE advisor_id IS NOT NULL) as groups_migrated,
    (SELECT COUNT(DISTINCT advisor) FROM client_groups WHERE advisor IS NOT NULL AND advisor != '' AND advisor_id IS NULL) as unique_advisors_pending,
    (SELECT COUNT(*) FROM profiles) as available_profiles,
    (SELECT COUNT(*) FROM advisors_needing_profiles) as profiles_to_create;

-- Log Phase 1 completion
INSERT INTO advisor_migration_log (migration_step, status, details, affected_rows)
VALUES ('PHASE1_COMPLETE', 'SUCCESS', 'Phase 1 schema preparation completed successfully', 
        (SELECT COUNT(*) FROM client_groups));

-- Display completion message
SELECT 
    'PHASE 1 COMPLETED' as status,
    'advisor_id column added successfully' as message,
    'Ready for data migration (Phase 2)' as next_step;

-- Show validation results
SELECT * FROM validate_phase1_completion(); 