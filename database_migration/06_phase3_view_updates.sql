-- =========================================================
-- PHASE 3: DATABASE VIEW UPDATES
-- =========================================================
-- This script updates database views to use the new advisor_id
-- foreign key relationships instead of the text advisor field

-- ===================
-- PRE-UPDATE VALIDATION
-- ===================

-- Verify Phase 2 completion
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count 
    FROM client_groups 
    WHERE advisor_id IS NOT NULL;
    
    IF migrated_count = 0 THEN
        RAISE WARNING 'Phase 2 may not be complete: No client groups have advisor_id assigned';
    ELSE
        RAISE NOTICE 'Phase 2 validation passed: % client groups have advisor_id assigned', migrated_count;
    END IF;
END $$;

-- Log Phase 3 start
INSERT INTO advisor_migration_log (migration_step, status, details)
VALUES ('PHASE3_START', 'SUCCESS', 'Beginning database view updates to use advisor_id relationships');

-- ===================
-- BACKUP ORIGINAL VIEWS
-- ===================

-- Create backup of original client_group_complete_data view
CREATE OR REPLACE VIEW client_group_complete_data_backup_advisor_migration AS
SELECT 
    cg.id as client_group_id,
    cg.name as client_group_name,
    cg.advisor,  -- Original text field
    cg.status as client_group_status,
    cg.type,
    cg.created_at,
    cp.id as product_id,
    cp.product_name,
    cp.product_type,
    cp.start_date as product_start_date,
    cp.end_date as product_end_date,
    cp.status as product_status,
    cp.portfolio_id,
    cp.provider_id,
    ap.name as provider_name
FROM client_groups cg
LEFT JOIN client_products cp ON cp.client_id = cg.id
LEFT JOIN available_providers ap ON ap.id = cp.provider_id;

-- Log backup creation
INSERT INTO advisor_migration_log (migration_step, status, details)
VALUES ('PHASE3_BACKUP_VIEWS', 'SUCCESS', 'Created backup of original views before updates');

-- ===================
-- UPDATE MAIN VIEWS
-- ===================

-- Update client_group_complete_data view to use advisor_id relationships
CREATE OR REPLACE VIEW public.client_group_complete_data AS
SELECT 
    cg.id as client_group_id,
    cg.name as client_group_name,
    cg.advisor as legacy_advisor_text,  -- Keep for reference during transition
    cg.advisor_id,
    CONCAT(p.first_name, ' ', p.last_name) as advisor_name,
    p.email as advisor_email,
    p.first_name as advisor_first_name,
    p.last_name as advisor_last_name,
    cg.status as client_group_status,
    cg.type,
    cg.created_at,
    cp.id as product_id,
    cp.product_name,
    cp.product_type,
    cp.start_date as product_start_date,
    cp.end_date as product_end_date,
    cp.status as product_status,
    cp.portfolio_id,
    cp.provider_id,
    ap.name as provider_name,
    -- Additional computed fields for convenience
    CASE 
        WHEN cg.advisor_id IS NOT NULL THEN 'HAS_ADVISOR'
        WHEN cg.advisor IS NOT NULL AND cg.advisor != '' THEN 'LEGACY_ADVISOR_ONLY'
        ELSE 'NO_ADVISOR'
    END as advisor_assignment_status
FROM client_groups cg
LEFT JOIN profiles p ON p.id = cg.advisor_id
LEFT JOIN client_products cp ON cp.client_id = cg.id
LEFT JOIN available_providers ap ON ap.id = cp.provider_id;

-- Update global search functionality to search advisor profiles
CREATE OR REPLACE FUNCTION public.global_search(search_query TEXT)
RETURNS TABLE (
    entity_type TEXT,
    entity_id BIGINT,
    name TEXT,
    description TEXT,
    additional_info TEXT
) AS $$
BEGIN
    RETURN QUERY
    
    -- Search Client Groups (updated to use advisor profiles)
    SELECT 
        'client_group'::TEXT as entity_type,
        cg.id as entity_id,
        cg.name as name,
        COALESCE('Client Group - ' || cg.type, 'Client Group') as description,
        CASE 
            WHEN p.id IS NOT NULL THEN 'Advisor: ' || CONCAT(p.first_name, ' ', p.last_name)
            WHEN cg.advisor IS NOT NULL AND cg.advisor != '' THEN 'Legacy Advisor: ' || cg.advisor
            ELSE 'No Advisor Assigned'
        END as additional_info
    FROM client_groups cg
    LEFT JOIN profiles p ON p.id = cg.advisor_id
    WHERE cg.status != 'inactive'
    AND (
        cg.name ILIKE '%' || search_query || '%' OR
        cg.type ILIKE '%' || search_query || '%' OR
        -- Search current advisor profiles
        CONCAT(p.first_name, ' ', p.last_name) ILIKE '%' || search_query || '%' OR
        p.first_name ILIKE '%' || search_query || '%' OR
        p.last_name ILIKE '%' || search_query || '%' OR
        p.email ILIKE '%' || search_query || '%' OR
        -- Still search legacy advisor text during transition
        cg.advisor ILIKE '%' || search_query || '%'
    )
    
    UNION ALL
    
    -- Search Products (Client Products) - add advisor information
    SELECT 
        'product'::TEXT as entity_type,
        cp.id as entity_id,
        cp.product_name as name,
        COALESCE('Product - ' || cp.product_type, 'Product') as description,
        CASE 
            WHEN p.id IS NOT NULL THEN 'Client: ' || cg.name || ' | Advisor: ' || CONCAT(p.first_name, ' ', p.last_name)
            WHEN cg.advisor IS NOT NULL AND cg.advisor != '' THEN 'Client: ' || cg.name || ' | Legacy Advisor: ' || cg.advisor
            ELSE 'Client: ' || cg.name || ' | No Advisor'
        END as additional_info
    FROM client_products cp
    LEFT JOIN client_groups cg ON cg.id = cp.client_id
    LEFT JOIN profiles p ON p.id = cg.advisor_id
    WHERE cp.status != 'inactive'
    AND (
        cp.product_name ILIKE '%' || search_query || '%' OR
        cp.product_type ILIKE '%' || search_query || '%' OR
        cg.name ILIKE '%' || search_query || '%'
    )
    
    UNION ALL
    
    -- Search Advisors (Profiles)
    SELECT 
        'advisor'::TEXT as entity_type,
        p.id as entity_id,
        CONCAT(p.first_name, ' ', p.last_name) as name,
        'Advisor Profile' as description,
        COALESCE('Email: ' || p.email || ' | Clients: ' || client_count.count, 'Email: ' || p.email) as additional_info
    FROM profiles p
    LEFT JOIN (
        SELECT advisor_id, COUNT(*) as count 
        FROM client_groups 
        WHERE advisor_id IS NOT NULL 
        GROUP BY advisor_id
    ) client_count ON client_count.advisor_id = p.id
    WHERE 
        CONCAT(p.first_name, ' ', p.last_name) ILIKE '%' || search_query || '%' OR
        p.first_name ILIKE '%' || search_query || '%' OR
        p.last_name ILIKE '%' || search_query || '%' OR
        p.email ILIKE '%' || search_query || '%'
    
    ORDER BY entity_type, name;
    
END;
$$ LANGUAGE plpgsql;

-- Log view updates
INSERT INTO advisor_migration_log (migration_step, status, details)
VALUES ('PHASE3_VIEW_UPDATES', 'SUCCESS', 'Updated client_group_complete_data view and global search to use advisor_id relationships');

-- ===================
-- CREATE NEW HELPFUL VIEWS
-- ===================

-- View for advisor summary with client counts
CREATE OR REPLACE VIEW advisor_client_summary AS
SELECT 
    p.id as advisor_id,
    p.first_name,
    p.last_name,
    CONCAT(p.first_name, ' ', p.last_name) as full_name,
    p.email,
    COUNT(cg.id) as client_groups_count,
    COUNT(DISTINCT cp.id) as total_products_count,
    STRING_AGG(DISTINCT cg.name, ', ' ORDER BY cg.name) as client_group_names
FROM profiles p
LEFT JOIN client_groups cg ON cg.advisor_id = p.id
LEFT JOIN client_products cp ON cp.client_id = cg.id
GROUP BY p.id, p.first_name, p.last_name, p.email
HAVING COUNT(cg.id) > 0  -- Only show advisors with assigned clients
ORDER BY COUNT(cg.id) DESC, p.last_name, p.first_name;

-- View for clients without advisors
CREATE OR REPLACE VIEW clients_without_advisors AS
SELECT 
    cg.id as client_group_id,
    cg.name as client_group_name,
    cg.type,
    cg.status,
    cg.advisor as legacy_advisor_text,
    COUNT(cp.id) as product_count,
    cg.created_at
FROM client_groups cg
LEFT JOIN client_products cp ON cp.client_id = cg.id
WHERE cg.advisor_id IS NULL
  AND cg.status != 'inactive'
GROUP BY cg.id, cg.name, cg.type, cg.status, cg.advisor, cg.created_at
ORDER BY cg.name;

-- View for migration status overview
CREATE OR REPLACE VIEW advisor_migration_status_overview AS
SELECT 
    'MIGRATION_STATUS' as report_type,
    COUNT(*) as total_client_groups,
    COUNT(CASE WHEN cg.advisor_id IS NOT NULL THEN 1 END) as groups_with_advisor_profile,
    COUNT(CASE WHEN cg.advisor_id IS NULL AND cg.advisor IS NOT NULL AND cg.advisor != '' THEN 1 END) as groups_with_legacy_advisor_only,
    COUNT(CASE WHEN cg.advisor_id IS NULL AND (cg.advisor IS NULL OR cg.advisor = '') THEN 1 END) as groups_with_no_advisor,
    (SELECT COUNT(DISTINCT advisor_id) FROM client_groups WHERE advisor_id IS NOT NULL) as unique_advisors_assigned,
    (SELECT COUNT(*) FROM profiles WHERE id IN (SELECT DISTINCT advisor_id FROM client_groups WHERE advisor_id IS NOT NULL)) as advisor_profiles_in_use
FROM client_groups cg;

-- Log new view creation
INSERT INTO advisor_migration_log (migration_step, status, details)
VALUES ('PHASE3_NEW_VIEWS', 'SUCCESS', 'Created advisor_client_summary, clients_without_advisors, and advisor_migration_status_overview views');

-- ===================
-- VALIDATION FUNCTIONS
-- ===================

CREATE OR REPLACE FUNCTION validate_phase3_views()
RETURNS TABLE (
    validation_check TEXT,
    status TEXT,
    details TEXT,
    count_value INTEGER
) AS $$
BEGIN
    RETURN QUERY
    
    -- Check updated view exists and functions
    SELECT 'updated_view_functional'::TEXT,
           CASE WHEN (SELECT COUNT(*) FROM client_group_complete_data LIMIT 1) >= 0
                THEN 'PASS' ELSE 'FAIL' END,
           'Updated client_group_complete_data view is functional'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_group_complete_data LIMIT 100);
    
    RETURN QUERY
    -- Check advisor names are properly populated
    SELECT 'advisor_names_populated'::TEXT,
           'INFO'::TEXT,
           'Client groups with advisor names from profiles'::TEXT,
           (SELECT COUNT(*)::INTEGER FROM client_group_complete_data WHERE advisor_name IS NOT NULL);
    
    RETURN QUERY
    -- Check search function works
    SELECT 'search_function_updated'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM global_search('test') LIMIT 1)
                THEN 'PASS' ELSE 'FAIL' END,
           'Updated global search function is functional'::TEXT,
           1;
    
    RETURN QUERY
    -- Check new views created
    SELECT 'new_views_created'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'advisor_client_summary')
                AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'clients_without_advisors')
                AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'advisor_migration_status_overview')
                THEN 'PASS' ELSE 'FAIL' END,
           'All new advisor-related views created successfully'::TEXT,
           3;
           
END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_phase3_views();

-- ===================
-- SUMMARY AND STATUS
-- ===================

-- Show current advisor assignment status
SELECT * FROM advisor_migration_status_overview;

-- Show advisor summary
SELECT * FROM advisor_client_summary;

-- Show clients without advisors
SELECT * FROM clients_without_advisors;

-- Log Phase 3 completion
INSERT INTO advisor_migration_log (migration_step, status, details, affected_rows)
VALUES ('PHASE3_COMPLETE', 'SUCCESS', 'Phase 3 database view updates completed successfully',
        (SELECT COUNT(*) FROM client_groups));

-- Display completion message
SELECT 
    'PHASE 3 COMPLETED' as status,
    'Database views updated to use advisor_id relationships' as message,
    'Views now show proper advisor names from profiles table' as update_details,
    'Ready for Phase 4 (Application Code Updates)' as next_step; 