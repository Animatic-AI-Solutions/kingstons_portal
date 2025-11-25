-- ============================================================================
-- COMPLETE Pre-Migration Baseline - ALL PRODUCTS (ACTIVE + INACTIVE)
-- Execute: BEFORE running migration  
-- Purpose: Capture EVERY product's fee data regardless of status
-- ============================================================================

-- ============================================================================
-- STEP 1: Get Total Product Count by Status
-- ============================================================================

SELECT '=== PRODUCT COUNT BY STATUS ===' as section;
SELECT 
    status,
    COUNT(*) as product_count
FROM client_products 
GROUP BY status
ORDER BY status;

SELECT 
    'TOTAL PRODUCTS (ALL STATUSES)' as category,
    COUNT(*) as total_count
FROM client_products;

-- ============================================================================
-- STEP 2: Create Complete Revenue Baseline (ALL PRODUCTS, ALL STATUSES)
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS all_products_baseline AS
SELECT
    cp.id as product_id,
    cp.product_name,
    cp.client_id,
    cg.name as client_name,
    cp.status,
    cp.fixed_cost as baseline_fixed_cost,
    cp.percentage_fee as baseline_percentage_fee,
    
    -- Fund-level FUM calculation
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
    -- Fund-level totals
    SELECT 
        p.id AS portfolio_id,
        SUM(COALESCE(lpfv.valuation, 0)) AS total_fund_value
    FROM portfolios p
    LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id AND pf.status = 'active'
    LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
    GROUP BY p.id
) fund_totals ON cp.portfolio_id = fund_totals.portfolio_id
-- NO WHERE CLAUSE - capture ALL products regardless of status
ORDER BY cp.status, cp.id;

-- ============================================================================
-- STEP 3: Breakdown by Status
-- ============================================================================

SELECT '=== BASELINE BREAKDOWN BY STATUS ===' as section;

SELECT 
    status,
    COUNT(*) as total_products,
    COUNT(CASE WHEN calculated_fixed_revenue > 0 THEN 1 END) as fixed_fee_products,
    COUNT(CASE WHEN calculated_percentage_revenue > 0 THEN 1 END) as percentage_fee_products,
    COUNT(CASE WHEN calculated_total_revenue = 0 THEN 1 END) as zero_revenue_products,
    
    SUM(calculated_fixed_revenue) as total_fixed_revenue,
    SUM(calculated_percentage_revenue) as total_percentage_revenue,
    SUM(calculated_total_revenue) as total_annual_revenue
FROM all_products_baseline
GROUP BY status
ORDER BY status;

-- ============================================================================
-- STEP 4: Show Fixed Fee Products (ALL Statuses)
-- ============================================================================

SELECT '=== ALL FIXED FEE PRODUCTS (ALL STATUSES) ===' as section;
SELECT 
    product_id,
    status,
    client_name,
    product_name,
    baseline_fixed_cost,
    calculated_fixed_revenue
FROM all_products_baseline 
WHERE calculated_fixed_revenue > 0
ORDER BY status, calculated_fixed_revenue DESC;

-- ============================================================================
-- STEP 5: Show Products with NULL/Empty Fixed Cost by Status
-- ============================================================================

SELECT '=== PRODUCTS WITH NULL/EMPTY FIXED COST BY STATUS ===' as section;
SELECT 
    status,
    COUNT(CASE WHEN baseline_fixed_cost IS NULL THEN 1 END) as null_fixed_cost,
    COUNT(CASE WHEN baseline_fixed_cost = '' THEN 1 END) as empty_fixed_cost,
    COUNT(CASE WHEN baseline_fixed_cost IS NULL OR baseline_fixed_cost = '' THEN 1 END) as total_null_empty
FROM all_products_baseline
GROUP BY status
ORDER BY status;

-- ============================================================================
-- STEP 6: Show Products with NULL Percentage Fee by Status
-- ============================================================================

SELECT '=== PRODUCTS WITH NULL PERCENTAGE FEE BY STATUS ===' as section;
SELECT 
    status,
    COUNT(CASE WHEN baseline_percentage_fee IS NULL THEN 1 END) as null_percentage_fee,
    COUNT(CASE WHEN baseline_percentage_fee IS NOT NULL THEN 1 END) as has_percentage_fee
FROM all_products_baseline
GROUP BY status
ORDER BY status;

-- ============================================================================
-- STEP 7: Final Summary - ALL PRODUCTS
-- ============================================================================

SELECT '=== FINAL COMPLETE SUMMARY - ALL PRODUCTS ===' as section;

SELECT 
    COUNT(*) as total_all_products,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
    COUNT(CASE WHEN status = 'lapsed' THEN 1 END) as lapsed_products,
    COUNT(CASE WHEN status NOT IN ('active', 'lapsed') THEN 1 END) as other_status_products,
    
    -- Fixed cost analysis
    COUNT(CASE WHEN baseline_fixed_cost IS NOT NULL AND baseline_fixed_cost != '' THEN 1 END) as has_fixed_cost_data,
    COUNT(CASE WHEN calculated_fixed_revenue > 0 THEN 1 END) as generates_fixed_revenue,
    
    -- Percentage fee analysis  
    COUNT(CASE WHEN baseline_percentage_fee IS NOT NULL THEN 1 END) as has_percentage_fee_data,
    COUNT(CASE WHEN calculated_percentage_revenue > 0 THEN 1 END) as generates_percentage_revenue,
    
    -- Revenue totals
    SUM(calculated_fixed_revenue) as total_fixed_revenue_all,
    SUM(calculated_percentage_revenue) as total_percentage_revenue_all,
    SUM(calculated_total_revenue) as total_annual_revenue_all
FROM all_products_baseline;

SELECT '=== ALL PRODUCTS BASELINE COMPLETE ===' as status;
SELECT 'Every product in client_products table captured regardless of status' as confirmation;