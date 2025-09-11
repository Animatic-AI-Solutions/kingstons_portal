-- ============================================================================
-- VERIFICATION SCRIPT: Check if Analytics Views Include Inactive Products
-- ============================================================================
-- This script verifies that our updated analytics views now include all products
-- (active and inactive) by comparing counts and showing sample data.

\echo '============================================================================'
\echo 'VERIFICATION: Analytics Views Include All Products (Active + Inactive)'
\echo '============================================================================'

-- 1. VERIFY company_revenue_analytics VIEW
\echo ''
\echo '1. COMPANY REVENUE ANALYTICS VERIFICATION:'
\echo '   - Should now include revenue from ALL products, not just active ones'

-- Show total products breakdown
SELECT 
    'Total Products in Database' AS metric,
    COUNT(*) AS count,
    COUNT(*) FILTER (WHERE status = 'active') AS active_count,
    COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_count
FROM client_products;

-- Show what the view now returns
SELECT 
    'Company Revenue Analytics View' AS metric,
    active_products AS total_products_in_view,
    active_clients AS total_clients_in_view,
    ROUND(total_annual_revenue, 2) AS total_revenue,
    ROUND(total_fum, 2) AS total_fum,
    calculated_at
FROM company_revenue_analytics;

-- 2. VERIFY analytics_dashboard_summary VIEW
\echo ''
\echo '2. ANALYTICS DASHBOARD SUMMARY VERIFICATION:'
\echo '   - Should now include ALL accounts/products, not just active ones'

SELECT 
    'Dashboard Summary View' AS metric,
    total_clients,
    total_accounts AS total_products_in_view,
    total_funds,
    ROUND(total_fum, 2) AS total_fum
FROM analytics_dashboard_summary;

-- Compare with direct count
SELECT 
    'Direct Database Count' AS metric,
    COUNT(DISTINCT cg.id) AS total_clients,
    COUNT(DISTINCT cp.id) AS total_accounts,
    COUNT(DISTINCT af.id) AS total_funds
FROM client_products cp
JOIN client_groups cg ON cp.client_id = cg.id
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id
LEFT JOIN available_funds af ON pf.available_funds_id = af.id;

-- 3. VERIFY fund_distribution_fast VIEW
\echo ''
\echo '3. FUND DISTRIBUTION VERIFICATION:'
\echo '   - Should now include holdings from ALL portfolio funds, not just active ones'

SELECT 
    'Fund Distribution View' AS metric,
    COUNT(*) AS funds_with_holdings,
    SUM(fund_holdings) AS total_fund_holdings,
    ROUND(SUM(amount), 2) AS total_amount
FROM fund_distribution_fast;

-- Show sample funds to verify inactive products are included
SELECT 
    'Sample Fund Holdings' AS note,
    name,
    fund_holdings,
    ROUND(amount, 2) as amount
FROM fund_distribution_fast 
ORDER BY amount DESC 
LIMIT 5;

-- 4. VERIFY provider_distribution_fast VIEW
\echo ''
\echo '4. PROVIDER DISTRIBUTION VERIFICATION:'
\echo '   - Should now include ALL client products for each provider'

SELECT 
    'Provider Distribution View' AS metric,
    COUNT(*) AS providers_with_products,
    SUM(product_count) AS total_product_count,
    ROUND(SUM(amount), 2) AS total_amount
FROM provider_distribution_fast;

-- Show sample providers
SELECT 
    'Sample Provider Holdings' AS note,
    name,
    product_count,
    ROUND(amount, 2) as amount
FROM provider_distribution_fast 
ORDER BY amount DESC 
LIMIT 5;

-- 5. VERIFY revenue_analytics_optimized VIEW
\echo ''
\echo '5. REVENUE ANALYTICS OPTIMIZED VERIFICATION:'
\echo '   - Should now include ALL client products in the analysis'

SELECT 
    'Revenue Analytics Optimized View' AS metric,
    COUNT(DISTINCT client_id) AS total_clients,
    COUNT(DISTINCT product_id) AS total_products,
    COUNT(*) AS total_rows
FROM revenue_analytics_optimized;

-- Show sample data with product status breakdown
SELECT 
    'Sample Revenue Analytics Data' AS note,
    client_name,
    COUNT(*) as product_records,
    ROUND(SUM(COALESCE(product_total_fum, 0)), 2) as total_fum
FROM revenue_analytics_optimized 
WHERE client_name IS NOT NULL
GROUP BY client_id, client_name
ORDER BY total_fum DESC 
LIMIT 5;

-- 6. INACTIVE PRODUCTS VERIFICATION
\echo ''
\echo '6. INACTIVE PRODUCTS VERIFICATION:'
\echo '   - Checking if inactive products are now included in analytics'

-- Count inactive products in database
SELECT 
    'Inactive Products in Database' AS metric,
    COUNT(*) AS inactive_product_count
FROM client_products 
WHERE status = 'inactive';

-- Check if company_revenue_analytics includes revenue from inactive products
-- by comparing with active-only calculation
WITH active_only_revenue AS (
    SELECT 
        SUM(COALESCE(cp.fixed_cost, 0)) +
        SUM(CASE 
            WHEN cp.percentage_fee IS NOT NULL AND pv.total_value > 0 
            THEN pv.total_value * (cp.percentage_fee / 100.0)
            ELSE 0
        END) AS active_only_total
    FROM client_products cp
    LEFT JOIN (
        SELECT p.id AS portfolio_id,
               SUM(COALESCE(lpfv.valuation, 0)) AS total_value
        FROM portfolios p
        LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id
        LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
        GROUP BY p.id
    ) pv ON cp.portfolio_id = pv.portfolio_id
    WHERE cp.status = 'active'
),
all_products_revenue AS (
    SELECT total_annual_revenue as all_products_total
    FROM company_revenue_analytics
)
SELECT 
    'Revenue Comparison' AS metric,
    ROUND(a.active_only_total, 2) AS active_only_revenue,
    ROUND(b.all_products_total, 2) AS all_products_revenue,
    ROUND(b.all_products_total - a.active_only_total, 2) AS inactive_products_revenue_contribution,
    CASE 
        WHEN b.all_products_total > a.active_only_total 
        THEN '✅ INACTIVE PRODUCTS INCLUDED' 
        ELSE '❌ ONLY ACTIVE PRODUCTS' 
    END AS verification_result
FROM active_only_revenue a, all_products_revenue b;

\echo ''
\echo '============================================================================'
\echo 'VERIFICATION COMPLETE'
\echo '============================================================================'
\echo 'If verification shows inactive products are included:'
\echo '- Revenue from inactive products should be > 0'
\echo '- Total product counts should be higher than active-only counts'
\echo '- All analytics views should show complete business picture'
\echo '============================================================================'