-- =========================================================
-- DETAILED ANALYSIS: Review Pre-Migration Results
-- =========================================================
-- Run these queries after the pre-migration analysis to understand
-- exactly which advisors can be matched and which need new profiles

-- 1. Show which advisor names exist and their usage
SELECT 
    'ADVISOR USAGE BREAKDOWN' as report_section,
    advisor as advisor_name,
    COUNT(*) as client_groups_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM client_groups WHERE advisor IS NOT NULL), 1) as percentage_of_total
FROM client_groups 
WHERE advisor IS NOT NULL AND advisor != ''
GROUP BY advisor
ORDER BY COUNT(*) DESC;

-- 2. Show existing profiles that could be potential matches
SELECT 
    'AVAILABLE PROFILES FOR MATCHING' as report_section,
    id as profile_id,
    first_name,
    last_name,
    CONCAT(first_name, ' ', last_name) as full_name,
    email,
    created_at
FROM profiles
ORDER BY CONCAT(first_name, ' ', last_name);

-- 3. Show potential matches between advisors and profiles
SELECT 
    'ADVISOR TO PROFILE MATCHING' as report_section,
    advisor_text,
    client_groups_count,
    potential_profile_id,
    potential_profile_name,
    potential_profile_email,
    match_type
FROM advisor_profile_matching
WHERE potential_profile_id IS NOT NULL
ORDER BY advisor_text, match_type;

-- 4. Show advisors that need new profiles created
SELECT 
    'ADVISORS NEEDING NEW PROFILES' as report_section,
    advisor_text,
    client_groups_affected,
    suggested_first_name,
    suggested_last_name,
    suggested_email
FROM advisors_needing_profiles
ORDER BY client_groups_affected DESC;

-- 5. Detailed client group breakdown by advisor
SELECT 
    'CLIENT GROUPS BY ADVISOR' as report_section,
    cg.advisor,
    cg.id as client_group_id,
    cg.name as client_group_name,
    cg.type as client_group_type,
    cg.created_at
FROM client_groups cg
WHERE cg.advisor IS NOT NULL AND cg.advisor != ''
ORDER BY cg.advisor, cg.name;

-- 6. Migration readiness assessment
SELECT 
    'MIGRATION READINESS ASSESSMENT' as report_section,
    total_client_groups,
    groups_with_advisors,
    groups_migrated,
    unique_advisors_pending,
    available_profiles,
    profiles_to_create,
    CASE 
        WHEN profiles_to_create = 0 THEN 'PERFECT - All advisors match existing profiles'
        WHEN profiles_to_create <= 2 THEN 'EXCELLENT - Very few new profiles needed'
        WHEN profiles_to_create <= 5 THEN 'GOOD - Manageable number of new profiles'
        ELSE 'MODERATE - Several new profiles needed'
    END as migration_complexity
FROM migration_readiness_summary; 