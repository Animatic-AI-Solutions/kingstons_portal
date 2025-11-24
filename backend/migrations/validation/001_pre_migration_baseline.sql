-- Pre-Migration Validation: Capture Baseline Revenue Calculations
-- Migration: 001_rename_fixed_cost_to_fixed_fee_facilitated
-- Created: 2025-11-24
-- Purpose: Capture current state BEFORE migration to validate afterward
-- Execute: BEFORE running migration script

-- ============================================================================
-- STEP 1: Capture Baseline Revenue Data
-- ============================================================================
-- This captures all current revenue calculations for comparison after migration

CREATE TEMP TABLE IF NOT EXISTS pre_migration_revenue_baseline AS
SELECT
    cp.id as product_id,
    cp.product_name,
    cp.client_id,
    cg.name as client_name,
    cp.status,
    cp.fixed_cost as baseline_fixed_cost,
    cp.percentage_fee as baseline_percentage_fee,
    lpv.valuation as baseline_portfolio_value,

    -- Fixed revenue calculation
    COALESCE(cp.fixed_cost::numeric, 0) as calculated_fixed_revenue,

    -- Percentage revenue calculation
    CASE
        WHEN cp.percentage_fee IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END as calculated_percentage_revenue,

    -- Total revenue calculation
    COALESCE(cp.fixed_cost::numeric, 0) +
    CASE
        WHEN cp.percentage_fee IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END as calculated_total_revenue,

    CURRENT_TIMESTAMP as captured_at
FROM client_products cp
LEFT JOIN client_groups cg ON cp.client_id = cg.id
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
WHERE cp.status IN ('active', 'lapsed')
ORDER BY cp.id;

-- ============================================================================
-- STEP 2: Capture Company-Wide Revenue Totals
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS pre_migration_company_totals AS
SELECT
    sum(
        CASE
            WHEN cp.status = 'active' AND cp.fixed_cost IS NOT NULL
            THEN cp.fixed_cost::numeric
            ELSE 0
        END
    ) as total_fixed_revenue,

    sum(
        CASE
            WHEN cp.status = 'active' AND cp.percentage_fee IS NOT NULL AND pv.total_value > 0
            THEN (pv.total_value * (cp.percentage_fee::numeric / 100.0))
            ELSE 0
        END
    ) as total_percentage_revenue,

    sum(
        CASE
            WHEN cp.status = 'active'
            THEN COALESCE(cp.fixed_cost::numeric, 0) +
            CASE
                WHEN cp.percentage_fee IS NOT NULL AND pv.total_value > 0
                THEN (pv.total_value * (cp.percentage_fee::numeric / 100.0))
                ELSE 0
            END
            ELSE 0
        END
    ) as total_annual_revenue,

    count(DISTINCT cp.id) as total_active_products,
    count(DISTINCT cp.client_id) as total_active_clients,

    CURRENT_TIMESTAMP as captured_at
FROM client_products cp
LEFT JOIN (
    SELECT
        p.id AS portfolio_id,
        sum(COALESCE(lpfv.valuation, 0)) AS total_value
    FROM portfolios p
    LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id AND pf.status = 'active'
    LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
    GROUP BY p.id
) pv ON cp.portfolio_id = pv.portfolio_id;

-- ============================================================================
-- STEP 3: Capture Edge Cases
-- ============================================================================
-- Products with special conditions that need careful validation

CREATE TEMP TABLE IF NOT EXISTS pre_migration_edge_cases AS
SELECT
    'NULL fixed_cost' as edge_case_type,
    count(*) as product_count,
    CURRENT_TIMESTAMP as captured_at
FROM client_products
WHERE fixed_cost IS NULL AND status = 'active'

UNION ALL

SELECT
    'Zero fixed_cost' as edge_case_type,
    count(*) as product_count,
    CURRENT_TIMESTAMP as captured_at
FROM client_products
WHERE fixed_cost = 0 AND status = 'active'

UNION ALL

SELECT
    'NULL portfolio (no percentage revenue)' as edge_case_type,
    count(*) as product_count,
    CURRENT_TIMESTAMP as captured_at
FROM client_products
WHERE portfolio_id IS NULL AND status = 'active'

UNION ALL

SELECT
    'NULL percentage_fee' as edge_case_type,
    count(*) as product_count,
    CURRENT_TIMESTAMP as captured_at
FROM client_products
WHERE percentage_fee IS NULL AND status = 'active'

UNION ALL

SELECT
    'Both fees NULL' as edge_case_type,
    count(*) as product_count,
    CURRENT_TIMESTAMP as captured_at
FROM client_products
WHERE fixed_cost IS NULL AND percentage_fee IS NULL AND status = 'active'

UNION ALL

SELECT
    'Lapsed products' as edge_case_type,
    count(*) as product_count,
    CURRENT_TIMESTAMP as captured_at
FROM client_products
WHERE status = 'lapsed';

-- ============================================================================
-- STEP 4: Verify Baseline Data
-- ============================================================================
-- Display baseline data for manual review

SELECT '=== BASELINE REVENUE BY PRODUCT ===' as section;
SELECT
    product_id,
    product_name,
    client_name,
    status,
    baseline_fixed_cost,
    baseline_percentage_fee,
    baseline_portfolio_value,
    calculated_fixed_revenue,
    calculated_percentage_revenue,
    calculated_total_revenue
FROM pre_migration_revenue_baseline
ORDER BY calculated_total_revenue DESC
LIMIT 20;

SELECT '=== COMPANY TOTALS ===' as section;
SELECT
    total_fixed_revenue,
    total_percentage_revenue,
    total_annual_revenue,
    total_active_products,
    total_active_clients,
    captured_at
FROM pre_migration_company_totals;

SELECT '=== EDGE CASES ===' as section;
SELECT
    edge_case_type,
    product_count,
    captured_at
FROM pre_migration_edge_cases
ORDER BY product_count DESC;

-- ============================================================================
-- SUCCESS CRITERIA FOR BASELINE CAPTURE
-- ============================================================================
-- ✅ All three temp tables created successfully
-- ✅ Baseline data displays without errors
-- ✅ Company totals match expected values
-- ✅ Edge case counts are reasonable
--
-- If any queries fail, investigate before proceeding with migration
-- Save this output for comparison with post-migration validation

SELECT '=== BASELINE CAPTURE COMPLETE ===' as section;
SELECT 'Baseline data captured successfully. Save this output for post-migration comparison.' as message;
SELECT 'Next step: Execute 001_rename_fixed_cost_to_fixed_fee_facilitated.sql' as next_action;
