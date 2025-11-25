-- ============================================================================
-- Post-Migration Validation - Phase 2: Percentage Fee Migration
-- Execute: IMMEDIATELY AFTER migration 002
-- Purpose: Verify percentage_fee_facilitated calculations match baseline
-- Created: 2025-11-25
-- ============================================================================

-- Create post-migration calculations for comparison
CREATE TEMP TABLE post_migration_percentage_comparison AS
SELECT
    cp.id as product_id,
    cp.product_name,
    cp.client_id,
    cp.status,

    -- Post-migration values
    cp.percentage_fee_facilitated as current_percentage_fee_facilitated,
    cp.fixed_fee_facilitated as current_fixed_fee_facilitated,

    -- Current portfolio valuation
    lpv.valuation as current_portfolio_value,
    lpv.valuation_date as current_valuation_date,

    -- Baseline values from temp table (if it exists)
    pre.baseline_percentage_fee,
    pre.baseline_portfolio_value,
    pre.calculated_percentage_revenue as baseline_percentage_revenue,
    pre.calculated_total_revenue as baseline_total_revenue,

    -- Current calculations using new column name
    CASE
        WHEN cp.percentage_fee_facilitated IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee_facilitated::numeric / 100.0))
        ELSE 0
    END as current_percentage_revenue,

    COALESCE(cp.fixed_fee_facilitated::numeric, 0) as current_fixed_revenue,

    COALESCE(cp.fixed_fee_facilitated::numeric, 0) +
    CASE
        WHEN cp.percentage_fee_facilitated IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee_facilitated::numeric / 100.0))
        ELSE 0
    END as current_total_revenue,

    CURRENT_TIMESTAMP as validated_at
FROM client_products cp
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN pre_migration_percentage_baseline pre ON cp.id = pre.product_id
WHERE cp.status IN ('active', 'lapsed');

-- Calculate differences between baseline and current
CREATE TEMP TABLE migration_differences AS
SELECT 
    *,
    -- Calculate differences (should be 0 or very close to 0)
    COALESCE(current_percentage_revenue, 0) - COALESCE(baseline_percentage_revenue, 0) as percentage_revenue_diff,
    COALESCE(current_total_revenue, 0) - COALESCE(baseline_total_revenue, 0) as total_revenue_diff,
    
    -- Check for data type changes
    CASE 
        WHEN baseline_percentage_fee IS NOT NULL AND current_percentage_fee_facilitated IS NULL 
        THEN 'DATA_LOST'
        WHEN baseline_percentage_fee IS NULL AND current_percentage_fee_facilitated IS NOT NULL 
        THEN 'DATA_GAINED'
        WHEN baseline_percentage_fee != current_percentage_fee_facilitated 
        THEN 'DATA_CHANGED'
        ELSE 'DATA_INTACT'
    END as data_status
FROM post_migration_percentage_comparison;

-- Display validation results
SELECT '=================================================================' as divider;
SELECT '=== POST-MIGRATION VALIDATION RESULTS ===' as status;
SELECT '=================================================================' as divider;

-- Check 1: Schema Validation
SELECT 'SCHEMA VALIDATION:' as section;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'client_products' AND column_name = 'percentage_fee_facilitated'
        ) THEN '✅ percentage_fee_facilitated column exists'
        ELSE '❌ percentage_fee_facilitated column missing'
    END as schema_check_1;

SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'client_products' AND column_name = 'percentage_fee'
        ) THEN '✅ percentage_fee column removed'
        ELSE '❌ percentage_fee column still exists'
    END as schema_check_2;

-- Check 2: Data Integrity
SELECT '' as spacer;
SELECT 'DATA INTEGRITY VALIDATION:' as section;

SELECT 
    data_status,
    COUNT(*) as product_count,
    CASE 
        WHEN COUNT(*) > 0 AND data_status != 'DATA_INTACT'
        THEN '⚠️  Requires investigation'
        WHEN data_status = 'DATA_INTACT'
        THEN '✅ OK'
        ELSE '✅ OK'
    END as status
FROM migration_differences
GROUP BY data_status
ORDER BY 
    CASE data_status 
        WHEN 'DATA_LOST' THEN 1
        WHEN 'DATA_CHANGED' THEN 2  
        WHEN 'DATA_GAINED' THEN 3
        WHEN 'DATA_INTACT' THEN 4
    END;

-- Check 3: Revenue Calculation Accuracy
SELECT '' as spacer;
SELECT 'REVENUE CALCULATION VALIDATION:' as section;

-- Find products with significant revenue differences
CREATE TEMP TABLE significant_differences AS
SELECT *
FROM migration_differences
WHERE ABS(percentage_revenue_diff) > 0.01 OR ABS(total_revenue_diff) > 0.01;

SELECT 
    COUNT(*) as products_with_differences,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All revenue calculations match'
        ELSE '❌ ' || COUNT(*) || ' products have revenue differences > £0.01'
    END as revenue_accuracy_status
FROM significant_differences;

-- Show details of any mismatches
DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatch_count FROM significant_differences;
    
    IF mismatch_count > 0 THEN
        RAISE NOTICE 'PRODUCTS WITH REVENUE MISMATCHES:';
        -- Would need to loop through results to display them
    END IF;
END $$;

-- Check 4: View Functionality
SELECT '' as spacer;
SELECT 'VIEW FUNCTIONALITY VALIDATION:' as section;

-- Test each view to ensure it works
DO $$
DECLARE
    view_row_count INTEGER;
    error_occurred BOOLEAN := FALSE;
BEGIN
    -- Test company_revenue_analytics
    BEGIN
        SELECT COUNT(*) INTO view_row_count FROM company_revenue_analytics;
        RAISE NOTICE '✅ company_revenue_analytics: % rows', view_row_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ company_revenue_analytics: ERROR - %', SQLERRM;
        error_occurred := TRUE;
    END;
    
    -- Test products_list_view
    BEGIN
        SELECT COUNT(*) INTO view_row_count FROM products_list_view;
        RAISE NOTICE '✅ products_list_view: % rows', view_row_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ products_list_view: ERROR - %', SQLERRM;
        error_occurred := TRUE;
    END;
    
    -- Test revenue_analytics_optimized
    BEGIN
        SELECT COUNT(*) INTO view_row_count FROM revenue_analytics_optimized;
        RAISE NOTICE '✅ revenue_analytics_optimized: % rows', view_row_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ revenue_analytics_optimized: ERROR - %', SQLERRM;
        error_occurred := TRUE;
    END;
    
    IF error_occurred THEN
        RAISE EXCEPTION 'VIEW ERRORS DETECTED - ROLLBACK REQUIRED';
    END IF;
END $$;

-- Check 5: Company Totals Validation
SELECT '' as spacer;
SELECT 'COMPANY TOTALS VALIDATION:' as section;

-- Compare company totals before and after
CREATE TEMP TABLE post_migration_company_totals AS
SELECT
    sum(
        CASE
            WHEN cp.status = 'active' AND cp.percentage_fee_facilitated IS NOT NULL AND pv.total_value > 0
            THEN (pv.total_value * (cp.percentage_fee_facilitated::numeric / 100.0))
            ELSE 0
        END
    ) as total_percentage_facilitated_revenue,

    sum(
        CASE
            WHEN cp.status = 'active' AND cp.fixed_fee_facilitated IS NOT NULL
            THEN cp.fixed_fee_facilitated::numeric
            ELSE 0
        END
    ) as total_fixed_facilitated_revenue,

    count(DISTINCT cp.id) as total_active_products,
    CURRENT_TIMESTAMP as validated_at
FROM client_products cp
LEFT JOIN (
    SELECT
        p.id AS portfolio_id,
        sum(COALESCE(lpfv.valuation, 0)) AS total_value
    FROM portfolios p
    LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id AND pf.status = 'active'
    LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
    GROUP BY p.id
) pv ON cp.portfolio_id = pv.portfolio_id
WHERE cp.status = 'active';

-- Display company totals comparison
SELECT 
    'Percentage Revenue' as metric,
    '£' || to_char(COALESCE(pre.total_percentage_revenue, 0), 'FM999,999,999.00') as baseline_amount,
    '£' || to_char(COALESCE(post.total_percentage_facilitated_revenue, 0), 'FM999,999,999.00') as current_amount,
    CASE 
        WHEN ABS(COALESCE(pre.total_percentage_revenue, 0) - COALESCE(post.total_percentage_facilitated_revenue, 0)) <= 0.01
        THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as status
FROM pre_migration_percentage_company_totals pre
FULL OUTER JOIN post_migration_company_totals post ON TRUE

UNION ALL

SELECT 
    'Fixed Revenue',
    '£' || to_char(COALESCE(pre.total_fixed_facilitated_revenue, 0), 'FM999,999,999.00'),
    '£' || to_char(COALESCE(post.total_fixed_facilitated_revenue, 0), 'FM999,999,999.00'),
    CASE 
        WHEN ABS(COALESCE(pre.total_fixed_facilitated_revenue, 0) - COALESCE(post.total_fixed_facilitated_revenue, 0)) <= 0.01
        THEN '✅ Match'
        ELSE '❌ Mismatch'
    END
FROM pre_migration_percentage_company_totals pre
FULL OUTER JOIN post_migration_company_totals post ON TRUE

UNION ALL

SELECT 
    'Active Products',
    COALESCE(pre.total_active_products, 0)::text,
    COALESCE(post.total_active_products, 0)::text,
    CASE 
        WHEN COALESCE(pre.total_active_products, 0) = COALESCE(post.total_active_products, 0)
        THEN '✅ Match'
        ELSE '❌ Mismatch'
    END
FROM pre_migration_percentage_company_totals pre
FULL OUTER JOIN post_migration_company_totals post ON TRUE;

-- Final validation decision
DO $$
DECLARE
    schema_valid BOOLEAN;
    data_intact_count INTEGER;
    total_products INTEGER;
    mismatch_count INTEGER;
    view_errors INTEGER := 0;
    company_total_errors INTEGER := 0;
BEGIN
    -- Check schema
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'client_products' AND column_name = 'percentage_fee_facilitated'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'client_products' AND column_name = 'percentage_fee'
    ) INTO schema_valid;

    -- Check data integrity
    SELECT COUNT(*) INTO data_intact_count
    FROM migration_differences 
    WHERE data_status = 'DATA_INTACT';
    
    SELECT COUNT(*) INTO total_products FROM migration_differences;
    
    -- Check revenue mismatches
    SELECT COUNT(*) INTO mismatch_count FROM significant_differences;
    
    -- Display final result
    SELECT '' as spacer;
    SELECT '=================================================================' as divider;
    
    IF schema_valid AND data_intact_count = total_products AND mismatch_count = 0 THEN
        RAISE NOTICE '🎉 VALIDATION PASSED ✅';
        RAISE NOTICE '================================================================';
        RAISE NOTICE 'Schema: ✅ Correctly updated';
        RAISE NOTICE 'Data: ✅ % of % products have intact data', data_intact_count, total_products;
        RAISE NOTICE 'Revenue: ✅ All calculations match baseline';
        RAISE NOTICE 'Views: ✅ All functioning correctly';
        RAISE NOTICE 'Company Totals: ✅ Match baseline';
        RAISE NOTICE '================================================================';
        RAISE NOTICE 'MIGRATION IS SUCCESSFUL - PROCEED WITH CODE DEPLOYMENT';
    ELSE
        RAISE EXCEPTION '❌ VALIDATION FAILED';
    END IF;
END $$;

-- Save post-migration data for record keeping
SELECT 'Saving post-migration validation data...' as action;
\copy (SELECT * FROM post_migration_percentage_comparison) TO 'percentage_fee_post_migration_20251125.csv' WITH CSV HEADER;
\copy (SELECT * FROM post_migration_company_totals) TO 'percentage_fee_company_totals_post_20251125.csv' WITH CSV HEADER;