-- =========================================================
-- PRE-MIGRATION ANALYSIS: Advisor Field Data Assessment
-- =========================================================
-- This script analyzes the current advisor field data to help plan the migration
-- Run this BEFORE making any schema changes

-- 1. Overview of advisor field usage
SELECT 
    'ADVISOR FIELD OVERVIEW' as analysis_type,
    COUNT(*) as total_client_groups,
    COUNT(advisor) as groups_with_advisor,
    COUNT(*) - COUNT(advisor) as groups_without_advisor,
    ROUND(COUNT(advisor) * 100.0 / COUNT(*), 2) as advisor_coverage_percentage
FROM client_groups;

-- 2. Unique advisor names and their usage frequency
SELECT 
    'UNIQUE ADVISORS' as analysis_type,
    advisor,
    COUNT(*) as client_groups_count,
    MIN(created_at) as first_used,
    MAX(created_at) as last_used,
    STRING_AGG(DISTINCT name, ', ') as sample_client_groups
FROM client_groups 
WHERE advisor IS NOT NULL AND advisor != ''
GROUP BY advisor
ORDER BY COUNT(*) DESC;

-- 3. Advisor name patterns analysis
SELECT 
    'ADVISOR NAME PATTERNS' as analysis_type,
    CASE 
        WHEN advisor ~ '^[A-Za-z]+\s+[A-Za-z]+$' THEN 'First Last'
        WHEN advisor ~ '^[A-Za-z]+$' THEN 'Single Name'
        WHEN advisor ~ '^[A-Za-z]+\s+[A-Za-z]+\s+[A-Za-z]+' THEN 'Three+ Names'
        WHEN advisor IS NULL OR advisor = '' THEN 'Empty/Null'
        ELSE 'Other Pattern'
    END as name_pattern,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM client_groups), 2) as percentage
FROM client_groups
GROUP BY name_pattern
ORDER BY count DESC;

-- 4. Check for potential profile matches
SELECT 
    'POTENTIAL PROFILE MATCHES' as analysis_type,
    cg.advisor,
    COUNT(DISTINCT cg.id) as client_groups_count,
    p.id as matching_profile_id,
    CONCAT(p.first_name, ' ', p.last_name) as profile_full_name,
    p.email as profile_email
FROM client_groups cg
LEFT JOIN profiles p ON (
    CONCAT(p.first_name, ' ', p.last_name) ILIKE cg.advisor
    OR p.first_name ILIKE cg.advisor
    OR p.last_name ILIKE cg.advisor
    OR CONCAT(p.last_name, ', ', p.first_name) ILIKE cg.advisor
)
WHERE cg.advisor IS NOT NULL AND cg.advisor != ''
GROUP BY cg.advisor, p.id, p.first_name, p.last_name, p.email
ORDER BY cg.advisor, matching_profile_id;

-- 5. Advisors with no potential profile matches
SELECT 
    'UNMAPPED ADVISORS' as analysis_type,
    cg.advisor,
    COUNT(*) as client_groups_affected,
    'WILL_CREATE_PROFILE' as migration_action
FROM client_groups cg
WHERE cg.advisor IS NOT NULL 
  AND cg.advisor != ''
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE CONCAT(p.first_name, ' ', p.last_name) ILIKE cg.advisor
       OR p.first_name ILIKE cg.advisor
       OR p.last_name ILIKE cg.advisor
       OR CONCAT(p.last_name, ', ', p.first_name) ILIKE cg.advisor
  )
GROUP BY cg.advisor
ORDER BY COUNT(*) DESC;

-- 6. Current profiles that could be potential advisors
SELECT 
    'AVAILABLE PROFILES' as analysis_type,
    p.id,
    p.first_name,
    p.last_name,
    CONCAT(p.first_name, ' ', p.last_name) as full_name,
    p.email,
    p.created_at,
    'POTENTIAL_ADVISOR' as note
FROM profiles p
ORDER BY p.created_at DESC;

-- 7. Summary statistics for migration planning
SELECT 
    'MIGRATION SUMMARY' as analysis_type,
    (SELECT COUNT(*) FROM client_groups WHERE advisor IS NOT NULL AND advisor != '') as advisors_to_migrate,
    (SELECT COUNT(DISTINCT advisor) FROM client_groups WHERE advisor IS NOT NULL AND advisor != '') as unique_advisor_names,
    (SELECT COUNT(*) FROM profiles) as existing_profiles,
    (SELECT COUNT(DISTINCT cg.advisor) 
     FROM client_groups cg
     WHERE cg.advisor IS NOT NULL 
       AND cg.advisor != ''
       AND NOT EXISTS (
         SELECT 1 FROM profiles p 
         WHERE CONCAT(p.first_name, ' ', p.last_name) ILIKE cg.advisor
            OR p.first_name ILIKE cg.advisor
            OR p.last_name ILIKE cg.advisor
       )
    ) as profiles_to_create; 