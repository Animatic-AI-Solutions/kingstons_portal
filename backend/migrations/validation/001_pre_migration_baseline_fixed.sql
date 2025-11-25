-- ============================================================================
-- Pre-Migration Baseline Capture (FIXED VERSION)
-- Execute: BEFORE running migration
-- Purpose: Capture current revenue calculations for comparison
-- Fixed: Type casting issues with fixed_cost field
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Revenue Baseline Table
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
-- STEP 2: Create Company Totals Baseline
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS pre_migration_company_totals AS
SELECT
    -- Fixed revenue total (active products only)
    sum(
        CASE
            WHEN cp.status = 'active' AND cp.fixed_cost IS NOT NULL AND cp.fixed_cost != ''
            THEN cp.fixed_cost::numeric
            ELSE 0
        END
    ) as total_fixed_revenue,

    -- Percentage revenue total (active products only)
    sum(
        CASE
            WHEN cp.status = 'active' AND cp.percentage_fee IS NOT NULL AND pv.total_value > 0
            THEN (pv.total_value * (cp.percentage_fee::numeric / 100.0))
            ELSE 0
        END
    ) as total_percentage_revenue,

    -- Total annual revenue (active products only)
    sum(
        CASE
            WHEN cp.status = 'active'
            THEN 
                COALESCE(
                    CASE 
                        WHEN cp.fixed_cost IS NOT NULL AND cp.fixed_cost != ''
                        THEN cp.fixed_cost::numeric 
                        ELSE 0 
                    END, 0
                ) +
                CASE
                    WHEN cp.percentage_fee IS NOT NULL AND pv.total_value > 0
                    THEN (pv.total_value * (cp.percentage_fee::numeric / 100.0))
                    ELSE 0
                END
            ELSE 0
        END
    ) as total_annual_revenue,

    count(DISTINCT 
        CASE 
            WHEN cp.status = 'active' 
            THEN cp.id 
            ELSE NULL 
        END
    ) as total_active_products,
    
    count(DISTINCT 
        CASE 
            WHEN cp.status = 'active' 
            THEN cp.client_id 
            ELSE NULL 
        END
    ) as total_active_clients,

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
-- STEP 3: Edge Cases Analysis
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS pre_migration_edge_cases AS
SELECT
    'NULL fixed_cost' as edge_case_type,
    count(*) as product_count,
    CURRENT_TIMESTAMP as captured_at
FROM client_products
WHERE (fixed_cost IS NULL OR fixed_cost = '') AND status = 'active'

UNION ALL

SELECT
    'Zero fixed_cost' as edge_case_type,
    count(*) as product_count,
    CURRENT_TIMESTAMP as captured_at
FROM client_products
WHERE fixed_cost IS NOT NULL AND fixed_cost != '' AND fixed_cost::numeric = 0 AND status = 'active'

UNION ALL

SELECT
    'NULL portfolio (no percentage revenue)' as edge_case_type,
    count(*) as product_count,
    CURRENT_TIMESTAMP as captured_at
FROM client_products
WHERE portfolio_id IS NULL AND status = 'active'

UNION ALL

SELECT
    'Both fees NULL/empty' as edge_case_type,
    count(*) as product_count,
    CURRENT_TIMESTAMP as captured_at
FROM client_products
WHERE (fixed_cost IS NULL OR fixed_cost = '') AND percentage_fee IS NULL AND status = 'active'

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
    calculated_fixed_revenue,
    calculated_percentage_revenue,
    calculated_total_revenue
FROM pre_migration_revenue_baseline
WHERE calculated_total_revenue > 0
ORDER BY calculated_total_revenue DESC
LIMIT 10;

SELECT '=== COMPANY TOTALS BASELINE ===' as section;
SELECT * FROM pre_migration_company_totals;

SELECT '=== EDGE CASES ANALYSIS ===' as section;
SELECT * FROM pre_migration_edge_cases ORDER BY product_count DESC;

-- ============================================================================
-- STEP 5: Save Baseline to CSV (Optional)
-- ============================================================================
-- Uncomment the line below if you want to save to CSV
-- \copy (SELECT * FROM pre_migration_revenue_baseline) TO 'pre_migration_baseline.csv' WITH CSV HEADER;

SELECT '=== BASELINE CAPTURE COMPLETED ===' as status;
SELECT 'Review the output above before proceeding with migration' as instruction;