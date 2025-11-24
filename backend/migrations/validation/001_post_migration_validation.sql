-- Post-Migration Validation: Verify Revenue Calculations Match Baseline
-- Migration: 001_rename_fixed_cost_to_fixed_fee_facilitated
-- Created: 2025-11-24
-- Purpose: Validate migration success by comparing to pre-migration baseline
-- Execute: IMMEDIATELY AFTER running migration script
-- Prerequisite: Must have run 001_pre_migration_baseline.sql first

-- ============================================================================
-- STEP 1: Verify Column Rename Succeeded
-- ============================================================================

DO $$
BEGIN
    -- Check if new column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'client_products'
        AND column_name = 'fixed_fee_facilitated'
    ) THEN
        RAISE EXCEPTION 'VALIDATION FAILED: Column fixed_fee_facilitated does not exist';
    END IF;

    -- Check if old column is gone
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'client_products'
        AND column_name = 'fixed_cost'
    ) THEN
        RAISE EXCEPTION 'VALIDATION FAILED: Column fixed_cost still exists';
    END IF;

    RAISE NOTICE 'SUCCESS: Column rename verified';
END $$;

-- ============================================================================
-- STEP 2: Verify All Views Exist and Are Queryable
-- ============================================================================

DO $$
BEGIN
    -- Test company_revenue_analytics
    PERFORM * FROM company_revenue_analytics LIMIT 1;
    RAISE NOTICE 'SUCCESS: company_revenue_analytics view is queryable';

    -- Test products_list_view
    PERFORM * FROM products_list_view LIMIT 1;
    RAISE NOTICE 'SUCCESS: products_list_view view is queryable';

    -- Test revenue_analytics_optimized
    PERFORM * FROM revenue_analytics_optimized LIMIT 1;
    RAISE NOTICE 'SUCCESS: revenue_analytics_optimized view is queryable';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'VALIDATION FAILED: View query error - %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: Compare Post-Migration Revenue to Baseline
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS post_migration_revenue_comparison AS
SELECT
    cp.id as product_id,
    cp.product_name,
    cp.client_id,
    cg.name as client_name,
    cp.status,

    -- Post-migration values
    cp.fixed_fee_facilitated as current_fixed_fee,
    cp.percentage_fee as current_percentage_fee,
    lpv.valuation as current_portfolio_value,

    -- Current calculations
    COALESCE(cp.fixed_fee_facilitated::numeric, 0) as current_fixed_revenue,
    CASE
        WHEN cp.percentage_fee IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END as current_percentage_revenue,
    COALESCE(cp.fixed_fee_facilitated::numeric, 0) +
    CASE
        WHEN cp.percentage_fee IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END as current_total_revenue,

    -- Baseline values for comparison
    pre.baseline_fixed_cost,
    pre.calculated_fixed_revenue as baseline_fixed_revenue,
    pre.calculated_percentage_revenue as baseline_percentage_revenue,
    pre.calculated_total_revenue as baseline_total_revenue,

    -- Differences (should be 0)
    COALESCE(cp.fixed_fee_facilitated::numeric, 0) - pre.calculated_fixed_revenue as fixed_revenue_diff,
    (CASE
        WHEN cp.percentage_fee IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END - pre.calculated_percentage_revenue) as percentage_revenue_diff,
    (COALESCE(cp.fixed_fee_facilitated::numeric, 0) +
    CASE
        WHEN cp.percentage_fee IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END - pre.calculated_total_revenue) as total_revenue_diff,

    CURRENT_TIMESTAMP as validated_at

FROM client_products cp
LEFT JOIN client_groups cg ON cp.client_id = cg.id
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN pre_migration_revenue_baseline pre ON cp.id = pre.product_id
WHERE cp.status IN ('active', 'lapsed')
ORDER BY cp.id;

-- ============================================================================
-- STEP 4: Compare Company-Wide Totals
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS post_migration_company_comparison AS
SELECT
    -- Current company totals
    cra.total_fixed_facilitated_revenue as current_total_fixed,
    cra.total_percentage_revenue as current_total_percentage,
    cra.total_annual_revenue as current_total_annual,
    cra.active_products as current_active_products,
    cra.active_clients as current_active_clients,

    -- Baseline totals
    pre.total_fixed_revenue as baseline_total_fixed,
    pre.total_percentage_revenue as baseline_total_percentage,
    pre.total_annual_revenue as baseline_total_annual,
    pre.total_active_products as baseline_active_products,
    pre.total_active_clients as baseline_active_clients,

    -- Differences (should be 0)
    cra.total_fixed_facilitated_revenue - pre.total_fixed_revenue as fixed_diff,
    cra.total_percentage_revenue - pre.total_percentage_revenue as percentage_diff,
    cra.total_annual_revenue - pre.total_annual_revenue as annual_diff,
    cra.active_products - pre.total_active_products as products_diff,
    cra.active_clients - pre.total_active_clients as clients_diff,

    CURRENT_TIMESTAMP as validated_at

FROM company_revenue_analytics cra
CROSS JOIN pre_migration_company_totals pre;

-- ============================================================================
-- STEP 5: Display Validation Results
-- ============================================================================

SELECT '=== VALIDATION: REVENUE DIFFERENCES ===' as section;
SELECT
    product_id,
    product_name,
    client_name,
    status,
    fixed_revenue_diff,
    percentage_revenue_diff,
    total_revenue_diff
FROM post_migration_revenue_comparison
WHERE
    ABS(fixed_revenue_diff) > 0.01
    OR ABS(percentage_revenue_diff) > 0.01
    OR ABS(total_revenue_diff) > 0.01
ORDER BY ABS(total_revenue_diff) DESC;

SELECT '=== VALIDATION: COMPANY TOTALS COMPARISON ===' as section;
SELECT
    current_total_fixed,
    baseline_total_fixed,
    fixed_diff,
    current_total_percentage,
    baseline_total_percentage,
    percentage_diff,
    current_total_annual,
    baseline_total_annual,
    annual_diff,
    current_active_products,
    baseline_active_products,
    products_diff,
    current_active_clients,
    baseline_active_clients,
    clients_diff
FROM post_migration_company_comparison;

-- ============================================================================
-- STEP 6: Check for NULL Values Where They Shouldn't Be
-- ============================================================================

SELECT '=== VALIDATION: NULL VALUE CHECK ===' as section;
SELECT
    cp.id as product_id,
    cp.product_name,
    cg.name as client_name,
    cp.fixed_fee_facilitated,
    pre.baseline_fixed_cost
FROM client_products cp
LEFT JOIN client_groups cg ON cp.client_id = cg.id
LEFT JOIN pre_migration_revenue_baseline pre ON cp.id = pre.product_id
WHERE
    pre.baseline_fixed_cost IS NOT NULL
    AND cp.fixed_fee_facilitated IS NULL;

-- ============================================================================
-- STEP 7: Verify View Computed Columns
-- ============================================================================

SELECT '=== VALIDATION: VIEW COMPUTED COLUMN CHECK ===' as section;
SELECT
    'company_revenue_analytics' as view_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'company_revenue_analytics'
            AND column_name = 'total_fixed_facilitated_revenue'
        ) THEN 'PASS: total_fixed_facilitated_revenue exists'
        ELSE 'FAIL: total_fixed_facilitated_revenue missing'
    END as status

UNION ALL

SELECT
    'company_revenue_analytics' as view_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'company_revenue_analytics'
            AND column_name = 'avg_fixed_facilitated_fee'
        ) THEN 'PASS: avg_fixed_facilitated_fee exists'
        ELSE 'FAIL: avg_fixed_facilitated_fee missing'
    END as status

UNION ALL

SELECT
    'products_list_view' as view_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'products_list_view'
            AND column_name = 'fixed_fee_facilitated'
        ) THEN 'PASS: fixed_fee_facilitated exists'
        ELSE 'FAIL: fixed_fee_facilitated missing'
    END as status

UNION ALL

SELECT
    'revenue_analytics_optimized' as view_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'revenue_analytics_optimized'
            AND column_name = 'fixed_fee_facilitated'
        ) THEN 'PASS: fixed_fee_facilitated exists'
        ELSE 'FAIL: fixed_fee_facilitated missing'
    END as status;

-- ============================================================================
-- STEP 8: Final Validation Summary
-- ============================================================================

DO $$
DECLARE
    revenue_diff_count INTEGER;
    null_mismatch_count INTEGER;
    company_total_diff NUMERIC;
BEGIN
    -- Count products with revenue differences > £0.01
    SELECT COUNT(*) INTO revenue_diff_count
    FROM post_migration_revenue_comparison
    WHERE
        ABS(fixed_revenue_diff) > 0.01
        OR ABS(percentage_revenue_diff) > 0.01
        OR ABS(total_revenue_diff) > 0.01;

    -- Count NULL mismatches
    SELECT COUNT(*) INTO null_mismatch_count
    FROM client_products cp
    LEFT JOIN pre_migration_revenue_baseline pre ON cp.id = pre.product_id
    WHERE
        pre.baseline_fixed_cost IS NOT NULL
        AND cp.fixed_fee_facilitated IS NULL;

    -- Check company total difference
    SELECT ABS(annual_diff) INTO company_total_diff
    FROM post_migration_company_comparison;

    -- Display final verdict
    IF revenue_diff_count = 0 AND null_mismatch_count = 0 AND company_total_diff < 0.01 THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE 'VALIDATION PASSED ✅';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'All revenue calculations match baseline';
        RAISE NOTICE 'No NULL value mismatches found';
        RAISE NOTICE 'Company totals match within tolerance';
        RAISE NOTICE 'Migration is SUCCESSFUL';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Deploy updated backend code';
        RAISE NOTICE '2. Deploy updated frontend code';
        RAISE NOTICE '3. Invalidate React Query cache';
        RAISE NOTICE '4. Monitor application logs';
    ELSE
        RAISE EXCEPTION 'VALIDATION FAILED ❌ - Products with differences: %, NULL mismatches: %, Company total diff: £%',
            revenue_diff_count, null_mismatch_count, company_total_diff;
        RAISE NOTICE 'IMMEDIATE ROLLBACK REQUIRED';
        RAISE NOTICE 'Execute: 001_rollback_fixed_fee_facilitated.sql';
    END IF;
END $$;

-- ============================================================================
-- CLEANUP TEMP TABLES (Optional - keep for debugging if needed)
-- ============================================================================
-- DROP TABLE IF EXISTS pre_migration_revenue_baseline;
-- DROP TABLE IF EXISTS pre_migration_company_totals;
-- DROP TABLE IF EXISTS pre_migration_edge_cases;
-- DROP TABLE IF EXISTS post_migration_revenue_comparison;
-- DROP TABLE IF EXISTS post_migration_company_comparison;
