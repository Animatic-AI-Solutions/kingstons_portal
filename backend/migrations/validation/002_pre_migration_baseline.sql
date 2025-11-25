-- ============================================================================
-- Pre-Migration Baseline Capture - Phase 2: Percentage Fee Migration
-- Execute: BEFORE running migration 002
-- Purpose: Capture current percentage_fee data for comparison
-- Created: 2025-11-25
-- ============================================================================

-- Capture product-level percentage fee data
CREATE TEMP TABLE pre_migration_percentage_baseline AS
SELECT
    cp.id as product_id,
    cp.product_name,
    cp.client_id,
    cg.name as client_name,
    cp.status,
    cp.fixed_fee_facilitated as current_fixed_fee_facilitated,
    cp.percentage_fee as baseline_percentage_fee,
    lpv.valuation as baseline_portfolio_value,
    lpv.valuation_date as baseline_valuation_date,

    -- Calculate percentage revenue
    CASE
        WHEN cp.percentage_fee IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END as calculated_percentage_revenue,

    -- Calculate fixed revenue
    COALESCE(cp.fixed_fee_facilitated::numeric, 0) as calculated_fixed_revenue,

    -- Calculate total revenue
    COALESCE(cp.fixed_fee_facilitated::numeric, 0) +
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

-- Capture company totals for verification
CREATE TEMP TABLE pre_migration_percentage_company_totals AS
SELECT
    -- Total percentage revenue (active products only)
    sum(
        CASE
            WHEN cp.status = 'active' AND cp.percentage_fee IS NOT NULL AND pv.total_value > 0
            THEN (pv.total_value * (cp.percentage_fee::numeric / 100.0))
            ELSE 0
        END
    ) as total_percentage_revenue,

    -- Total fixed facilitated revenue (active products only)
    sum(
        CASE
            WHEN cp.status = 'active' AND cp.fixed_fee_facilitated IS NOT NULL
            THEN cp.fixed_fee_facilitated::numeric
            ELSE 0
        END
    ) as total_fixed_facilitated_revenue,

    -- Total annual revenue (active products only)
    sum(
        CASE
            WHEN cp.status = 'active'
            THEN COALESCE(cp.fixed_fee_facilitated::numeric, 0) +
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
    count(DISTINCT cp.provider_id) as total_active_providers,
    sum(COALESCE(pv.total_value, 0)) as total_fum,

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
) pv ON cp.portfolio_id = pv.portfolio_id
WHERE cp.status = 'active';

-- Capture edge cases and data quality information
CREATE TEMP TABLE pre_migration_percentage_edge_cases AS
SELECT
    'NULL percentage_fee (active)' as edge_case_type,
    count(*) as product_count,
    array_agg(id ORDER BY id) as product_ids
FROM client_products
WHERE percentage_fee IS NULL AND status = 'active'

UNION ALL

SELECT 'Zero percentage_fee (active)', count(*), array_agg(id ORDER BY id)
FROM client_products
WHERE percentage_fee = 0 AND status = 'active'

UNION ALL

SELECT 'NULL portfolio (active)', count(*), array_agg(id ORDER BY id)
FROM client_products
WHERE portfolio_id IS NULL AND status = 'active'

UNION ALL

SELECT 'Both fees NULL (active)', count(*), array_agg(id ORDER BY id)
FROM client_products
WHERE fixed_fee_facilitated IS NULL AND percentage_fee IS NULL AND status = 'active'

UNION ALL

SELECT 'High percentage_fee (>5%)', count(*), array_agg(id ORDER BY id)
FROM client_products
WHERE percentage_fee > 5 AND status = 'active'

UNION ALL

SELECT 'Products with valuations', count(*), array_agg(cp.id ORDER BY cp.id)
FROM client_products cp
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
WHERE lpv.valuation IS NOT NULL AND cp.status = 'active';

-- Display baseline summary
SELECT '=================================================================' as divider;
SELECT '=== PRE-MIGRATION PERCENTAGE FEE BASELINE CAPTURED ===' as status;
SELECT '=================================================================' as divider;

SELECT 'COMPANY TOTALS:' as section;
SELECT 
    'Total Percentage Revenue' as metric,
    '£' || to_char(total_percentage_revenue, 'FM999,999,999.00') as amount
FROM pre_migration_percentage_company_totals
UNION ALL
SELECT 
    'Total Fixed Facilitated Revenue',
    '£' || to_char(total_fixed_facilitated_revenue, 'FM999,999,999.00')
FROM pre_migration_percentage_company_totals
UNION ALL
SELECT 
    'Total Annual Revenue',
    '£' || to_char(total_annual_revenue, 'FM999,999,999.00')
FROM pre_migration_percentage_company_totals
UNION ALL
SELECT 
    'Total FUM',
    '£' || to_char(total_fum, 'FM999,999,999.00')
FROM pre_migration_percentage_company_totals
UNION ALL
SELECT 
    'Active Products',
    total_active_products::text
FROM pre_migration_percentage_company_totals
UNION ALL
SELECT 
    'Active Clients',
    total_active_clients::text
FROM pre_migration_percentage_company_totals;

SELECT '' as spacer;
SELECT 'EDGE CASES & DATA QUALITY:' as section;
SELECT 
    edge_case_type,
    product_count,
    CASE 
        WHEN product_count > 0 AND product_count <= 5 
        THEN product_ids::text
        WHEN product_count > 5
        THEN (product_ids[1:5])::text || '... (showing first 5)'
        ELSE 'None'
    END as sample_product_ids
FROM pre_migration_percentage_edge_cases
ORDER BY 
    CASE 
        WHEN edge_case_type LIKE '%NULL%' THEN 1
        WHEN edge_case_type LIKE '%Zero%' THEN 2
        ELSE 3
    END;

-- Sample of products with percentage fees for manual verification
SELECT '' as spacer;
SELECT 'SAMPLE PRODUCTS FOR VERIFICATION:' as section;
SELECT 
    product_id,
    product_name,
    client_name,
    status,
    baseline_percentage_fee || '%' as percentage_fee_rate,
    CASE 
        WHEN baseline_portfolio_value IS NOT NULL 
        THEN '£' || to_char(baseline_portfolio_value, 'FM999,999.00')
        ELSE 'No valuation'
    END as portfolio_value,
    CASE 
        WHEN calculated_percentage_revenue > 0 
        THEN '£' || to_char(calculated_percentage_revenue, 'FM999,999.00')
        ELSE '£0.00'
    END as calculated_percentage_revenue
FROM pre_migration_percentage_baseline
WHERE baseline_percentage_fee IS NOT NULL 
    AND baseline_percentage_fee > 0
    AND status = 'active'
ORDER BY calculated_percentage_revenue DESC
LIMIT 10;

-- Save baseline data to CSV for external verification
SELECT '' as spacer;
SELECT 'Saving baseline data to CSV files...' as action;

-- Note: These \copy commands should be run if executing via psql command line
-- If running through application, save the temp table data manually

\copy (SELECT * FROM pre_migration_percentage_baseline) TO 'percentage_fee_baseline_20251125.csv' WITH CSV HEADER;
\copy (SELECT * FROM pre_migration_percentage_company_totals) TO 'percentage_fee_company_totals_20251125.csv' WITH CSV HEADER;

SELECT 'Baseline capture completed successfully!' as final_status;
SELECT 'Files created:' as note;
SELECT '  - percentage_fee_baseline_20251125.csv' as file1;
SELECT '  - percentage_fee_company_totals_20251125.csv' as file2;
SELECT 'Ready to proceed with migration.' as ready_status;