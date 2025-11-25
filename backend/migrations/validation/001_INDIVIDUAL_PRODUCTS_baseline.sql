-- ============================================================================
-- INDIVIDUAL PRODUCTS Pre-Migration Baseline - EVERY SINGLE PRODUCT
-- Execute: BEFORE running migration  
-- Purpose: Capture detailed data for EVERY product for validation
-- ============================================================================

-- ============================================================================
-- STEP 1: Create baseline data for ALL products
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS individual_products_baseline AS
SELECT
    cp.id as product_id,
    cp.product_name,
    cp.client_id,
    cg.name as client_name,
    cp.status,
    cp.fixed_cost as baseline_fixed_cost,
    cp.percentage_fee as baseline_percentage_fee,
    
    -- Fixed revenue calculation
    CASE 
        WHEN cp.fixed_cost IS NOT NULL AND cp.fixed_cost != ''
        THEN cp.fixed_cost::numeric
        ELSE 0
    END as calculated_fixed_revenue,

    -- For validation purposes, store as text to preserve exact values
    CASE 
        WHEN cp.fixed_cost IS NULL THEN 'NULL'
        WHEN cp.fixed_cost = '' THEN 'EMPTY'
        ELSE cp.fixed_cost
    END as fixed_cost_exact,
    
    CASE 
        WHEN cp.percentage_fee IS NULL THEN 'NULL'
        ELSE cp.percentage_fee
    END as percentage_fee_exact,

    CURRENT_TIMESTAMP as captured_at
FROM client_products cp
LEFT JOIN client_groups cg ON cp.client_id = cg.id
ORDER BY cp.status, cp.id;

-- ============================================================================
-- STEP 2: Output EVERY SINGLE PRODUCT 
-- ============================================================================

SELECT '=== COMPLETE INDIVIDUAL PRODUCT BASELINE ===' as section;

-- Output every product with exact fee values
SELECT 
    product_id,
    status,
    client_name,
    product_name,
    fixed_cost_exact,
    percentage_fee_exact,
    calculated_fixed_revenue
FROM individual_products_baseline
ORDER BY status, product_id;

-- ============================================================================
-- STEP 3: Summary for verification
-- ============================================================================

SELECT '=== SUMMARY VERIFICATION ===' as section;

SELECT 
    status,
    COUNT(*) as product_count,
    COUNT(CASE WHEN fixed_cost_exact NOT IN ('NULL', 'EMPTY', '0.0') THEN 1 END) as non_zero_fixed,
    COUNT(CASE WHEN percentage_fee_exact != 'NULL' THEN 1 END) as has_percentage_fee,
    SUM(calculated_fixed_revenue) as total_fixed_revenue
FROM individual_products_baseline
GROUP BY status
ORDER BY status;

SELECT 
    'TOTAL PRODUCTS' as category,
    COUNT(*) as count
FROM individual_products_baseline;

SELECT '=== INDIVIDUAL BASELINE COMPLETE ===' as status;