-- ============================================================================
-- COMPLETE Pre-Migration Baseline Capture - ALL PRODUCTS
-- Execute: BEFORE running migration  
-- Purpose: Capture EVERY product's fee data for detailed comparison
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Complete Revenue Baseline (ALL PRODUCTS)
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS complete_product_baseline AS
SELECT
    cp.id as product_id,
    cp.product_name,
    cp.client_id,
    cg.name as client_name,
    cp.status,
    cp.fixed_cost as baseline_fixed_cost,
    cp.percentage_fee as baseline_percentage_fee,
    
    -- Portfolio value from portfolio-level aggregation
    lpv.valuation as baseline_portfolio_value,
    
    -- Fund-level FUM calculation (matches company_revenue_analytics)
    COALESCE(fund_totals.total_fund_value, 0) as baseline_fund_total,

    -- Fixed revenue calculation
    CASE 
        WHEN cp.fixed_cost IS NOT NULL AND cp.fixed_cost != ''
        THEN cp.fixed_cost::numeric
        ELSE 0
    END as calculated_fixed_revenue,

    -- Percentage revenue calculation (using fund totals like company view)
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
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
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
WHERE cp.status IN ('active', 'lapsed')
ORDER BY cp.id;

-- ============================================================================
-- STEP 2: Display ALL Products with Fees
-- ============================================================================

SELECT '=== ALL ACTIVE PRODUCTS WITH FEES ===' as section;

-- Show products with fixed costs
SELECT 
    'FIXED FEE PRODUCTS' as category,
    product_id,
    client_name,
    product_name,
    baseline_fixed_cost,
    calculated_fixed_revenue
FROM complete_product_baseline 
WHERE calculated_fixed_revenue > 0 AND status = 'active'
ORDER BY calculated_fixed_revenue DESC;

-- Show products with percentage fees  
SELECT 'PERCENTAGE FEE PRODUCTS (Top 20)' as category;
SELECT 
    product_id,
    client_name, 
    product_name,
    baseline_percentage_fee,
    baseline_fund_total,
    calculated_percentage_revenue
FROM complete_product_baseline 
WHERE calculated_percentage_revenue > 0 AND status = 'active'
ORDER BY calculated_percentage_revenue DESC
LIMIT 20;

-- ============================================================================
-- STEP 3: Summary Statistics
-- ============================================================================

SELECT '=== COMPLETE BASELINE SUMMARY ===' as section;

SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN calculated_fixed_revenue > 0 THEN 1 END) as products_with_fixed_fees,
    COUNT(CASE WHEN calculated_percentage_revenue > 0 THEN 1 END) as products_with_percentage_fees,
    COUNT(CASE WHEN calculated_total_revenue > 0 THEN 1 END) as products_with_any_revenue,
    
    SUM(calculated_fixed_revenue) as total_fixed_revenue,
    SUM(calculated_percentage_revenue) as total_percentage_revenue,
    SUM(calculated_total_revenue) as total_annual_revenue,
    
    SUM(baseline_fund_total) as total_fum
FROM complete_product_baseline
WHERE status = 'active';

-- ============================================================================
-- STEP 4: Verification Against Company View
-- ============================================================================

SELECT '=== VERIFICATION AGAINST COMPANY VIEW ===' as section;

WITH baseline_totals AS (
    SELECT 
        SUM(calculated_fixed_revenue) as baseline_fixed,
        SUM(calculated_percentage_revenue) as baseline_percentage,
        SUM(calculated_total_revenue) as baseline_total
    FROM complete_product_baseline
    WHERE status = 'active'
),
company_totals AS (
    SELECT 
        total_fixed_revenue as company_fixed,
        total_percentage_revenue as company_percentage,
        total_annual_revenue as company_total
    FROM company_revenue_analytics
)
SELECT 
    b.baseline_fixed,
    c.company_fixed,
    (b.baseline_fixed - c.company_fixed) as fixed_diff,
    
    b.baseline_percentage,  
    c.company_percentage,
    (b.baseline_percentage - c.company_percentage) as percentage_diff,
    
    b.baseline_total,
    c.company_total,
    (b.baseline_total - c.company_total) as total_diff
FROM baseline_totals b, company_totals c;

SELECT '=== BASELINE READY FOR MIGRATION ===' as status;