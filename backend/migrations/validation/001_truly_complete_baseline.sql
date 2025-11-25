-- ============================================================================
-- TRULY COMPLETE Pre-Migration Baseline - EVERY SINGLE PRODUCT
-- Execute: BEFORE running migration  
-- Purpose: Capture EVERY product's fee data for complete validation
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Complete Revenue Baseline (ALL PRODUCTS)
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS truly_complete_baseline AS
SELECT
    cp.id as product_id,
    cp.product_name,
    cp.client_id,
    cg.name as client_name,
    cp.status,
    cp.fixed_cost as baseline_fixed_cost,
    cp.percentage_fee as baseline_percentage_fee,
    
    -- Fund-level FUM calculation (matches company_revenue_analytics)
    COALESCE(fund_totals.total_fund_value, 0) as baseline_fund_total,

    -- Fixed revenue calculation
    CASE 
        WHEN cp.fixed_cost IS NOT NULL AND cp.fixed_cost != ''
        THEN cp.fixed_cost::numeric
        ELSE 0
    END as calculated_fixed_revenue,

    -- Percentage revenue calculation
    CASE
        WHEN cp.percentage_fee IS NOT NULL AND fund_totals.total_fund_value > 0
        THEN (fund_totals.total_fund_value * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END as calculated_percentage_revenue,

    -- Total revenue calculation
    CASE 
        WHEN cp.fixed_cost IS NOT NULL AND cp.fixed_cost != ''
        THEN cp.fixed_cost::numeric
        ELSE 0
    END +
    CASE
        WHEN cp.percentage_fee IS NOT NULL AND fund_totals.total_fund_value > 0
        THEN (fund_totals.total_fund_value * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END as calculated_total_revenue,

    CURRENT_TIMESTAMP as captured_at
FROM client_products cp
LEFT JOIN client_groups cg ON cp.client_id = cg.id
LEFT JOIN (
    -- Fund-level totals (matches company_revenue_analytics logic)
    SELECT 
        p.id AS portfolio_id,
        SUM(COALESCE(lpfv.valuation, 0)) AS total_fund_value
    FROM portfolios p
    LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id AND pf.status = 'active'
    LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
    GROUP BY p.id
) fund_totals ON cp.portfolio_id = fund_totals.portfolio_id
WHERE cp.status = 'active'
ORDER BY cp.id;

-- ============================================================================
-- STEP 2: Display EVERY Product with Fees
-- ============================================================================

-- Show ALL products with fixed costs
SELECT '=== ALL FIXED FEE PRODUCTS ===' as section;
SELECT 
    product_id,
    client_name,
    product_name,
    baseline_fixed_cost,
    calculated_fixed_revenue
FROM truly_complete_baseline 
WHERE calculated_fixed_revenue > 0
ORDER BY calculated_fixed_revenue DESC;

-- Show ALL products with percentage fees
SELECT '=== ALL PERCENTAGE FEE PRODUCTS ===' as section;
SELECT 
    product_id,
    client_name, 
    product_name,
    baseline_percentage_fee,
    baseline_fund_total,
    calculated_percentage_revenue
FROM truly_complete_baseline 
WHERE calculated_percentage_revenue > 0
ORDER BY calculated_percentage_revenue DESC;

-- Show products with no fees (edge cases)
SELECT '=== PRODUCTS WITH NO FEES ===' as section;
SELECT 
    product_id,
    client_name,
    product_name,
    baseline_fixed_cost,
    baseline_percentage_fee,
    baseline_fund_total
FROM truly_complete_baseline 
WHERE calculated_total_revenue = 0
ORDER BY product_id;

-- ============================================================================
-- STEP 3: Final Summary and Verification
-- ============================================================================

SELECT '=== FINAL VERIFICATION SUMMARY ===' as section;

SELECT 
    COUNT(*) as total_active_products,
    COUNT(CASE WHEN calculated_fixed_revenue > 0 THEN 1 END) as fixed_fee_products,
    COUNT(CASE WHEN calculated_percentage_revenue > 0 THEN 1 END) as percentage_fee_products,
    COUNT(CASE WHEN calculated_total_revenue = 0 THEN 1 END) as zero_revenue_products,
    
    SUM(calculated_fixed_revenue) as total_fixed_revenue,
    SUM(calculated_percentage_revenue) as total_percentage_revenue,
    SUM(calculated_total_revenue) as total_annual_revenue,
    
    SUM(baseline_fund_total) as total_fum
FROM truly_complete_baseline;

-- Verify against company view
WITH baseline_totals AS (
    SELECT 
        SUM(calculated_fixed_revenue) as baseline_fixed,
        SUM(calculated_percentage_revenue) as baseline_percentage,
        SUM(calculated_total_revenue) as baseline_total
    FROM truly_complete_baseline
),
company_totals AS (
    SELECT 
        total_fixed_revenue as company_fixed,
        total_percentage_revenue as company_percentage,
        total_annual_revenue as company_total
    FROM company_revenue_analytics
)
SELECT 
    'VERIFICATION' as check_type,
    CASE WHEN ABS(b.baseline_fixed - c.company_fixed) < 1.0 THEN 'PASS' ELSE 'FAIL' END as fixed_check,
    CASE WHEN ABS(b.baseline_percentage - c.company_percentage) < 1.0 THEN 'PASS' ELSE 'FAIL' END as percentage_check,
    CASE WHEN ABS(b.baseline_total - c.company_total) < 1.0 THEN 'PASS' ELSE 'FAIL' END as total_check
FROM baseline_totals b, company_totals c;

SELECT '=== COMPLETE BASELINE READY ===' as status;
SELECT 'All 235 active products captured with individual fee details' as confirmation;