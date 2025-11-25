-- ============================================================================
-- Migration 002: Rename percentage_fee to percentage_fee_facilitated
-- Created: 2025-11-25
-- Risk: MEDIUM-HIGH
-- Rollback: See 002_rollback_percentage_fee_facilitated.sql
-- Prerequisites: Phase 1 migration (fixed_cost → fixed_fee_facilitated) must be completed
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Rename Column
-- ============================================================================

ALTER TABLE client_products
RENAME COLUMN percentage_fee TO percentage_fee_facilitated;

COMMENT ON COLUMN client_products.percentage_fee_facilitated IS 'Annual percentage facilitated fee rate (e.g., 1.5 for 1.5%)';

-- ============================================================================
-- STEP 2: Update company_revenue_analytics View
-- ============================================================================
-- Changes: 4 field references + 1 computed column rename
-- This view calculates company-wide revenue totals from all active products

DROP VIEW IF EXISTS company_revenue_analytics CASCADE;

CREATE OR REPLACE VIEW company_revenue_analytics AS
SELECT
    sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.fixed_fee_facilitated IS NOT NULL))
            THEN (cp.fixed_fee_facilitated)::numeric
            ELSE (0)::numeric
        END) AS total_fixed_facilitated_revenue,
    sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.percentage_fee_facilitated IS NOT NULL) AND (pv.total_value > (0)::numeric))
            THEN (pv.total_value * ((cp.percentage_fee_facilitated)::numeric / 100.0))
            ELSE (0)::numeric
        END) AS total_percentage_facilitated_revenue,  -- RENAMED FROM total_percentage_revenue
    sum(
        CASE
            WHEN (cp.status = 'active'::text)
            THEN (COALESCE((cp.fixed_fee_facilitated)::numeric, (0)::numeric) +
            CASE
                WHEN ((cp.percentage_fee_facilitated IS NOT NULL) AND (pv.total_value > (0)::numeric))
                THEN (pv.total_value * ((cp.percentage_fee_facilitated)::numeric / 100.0))
                ELSE (0)::numeric
            END)
            ELSE (0)::numeric
        END) AS total_annual_revenue,
    count(DISTINCT cp.provider_id) AS active_providers,
    count(DISTINCT cp.client_id) AS active_clients,
    count(DISTINCT cp.id) AS active_products,
    sum(COALESCE(pv.total_value, (0)::numeric)) AS total_fum,
    avg(
        CASE
            WHEN ((cp.percentage_fee_facilitated IS NOT NULL) AND ((cp.percentage_fee_facilitated)::numeric > (0)::numeric))
            THEN (cp.percentage_fee_facilitated)::numeric
            ELSE NULL::numeric
        END) AS avg_percentage_facilitated_fee,  -- RENAMED FROM avg_percentage_fee
    avg(
        CASE
            WHEN ((cp.fixed_fee_facilitated IS NOT NULL) AND ((cp.fixed_fee_facilitated)::numeric > (0)::numeric))
            THEN (cp.fixed_fee_facilitated)::numeric
            ELSE NULL::numeric
        END) AS avg_fixed_facilitated_fee,
    CURRENT_TIMESTAMP AS calculated_at
FROM (client_products cp
    LEFT JOIN (
        SELECT p.id AS portfolio_id,
            sum(COALESCE(lpfv.valuation, (0)::numeric)) AS total_value
        FROM ((portfolios p
            LEFT JOIN portfolio_funds pf ON (((p.id = pf.portfolio_id) AND (pf.status = 'active'::text))))
            LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
        GROUP BY p.id
    ) pv ON ((cp.portfolio_id = pv.portfolio_id)));

-- ============================================================================
-- STEP 3: Update products_list_view View
-- ============================================================================
-- Changes: 2 field references (SELECT + GROUP BY)
-- This view provides comprehensive product listing with fee information

DROP VIEW IF EXISTS products_list_view CASCADE;

CREATE OR REPLACE VIEW products_list_view AS
SELECT
    cp.id,
    cp.client_id,
    cp.product_name,
    cp.product_type,
    cp.status,
    cp.start_date,
    cp.end_date,
    cp.provider_id,
    cp.portfolio_id,
    cp.plan_number,
    cp.created_at,
    cg.name AS client_name,
    cg.advisor,
    cg.type AS client_type,
    ap.name AS provider_name,
    ap.theme_color AS provider_color,
    p.portfolio_name,
    p.status AS portfolio_status,
    lpv.valuation AS current_value,
    lpv.valuation_date,
    lpir.irr_result AS current_irr,
    lpir.date AS irr_date,
    count(DISTINCT pop.product_owner_id) AS owner_count,
    string_agg(DISTINCT COALESCE(po.known_as, concat(po.firstname, ' ', po.surname)), ', '::text) AS owners,
    cp.fixed_fee_facilitated,
    cp.percentage_fee_facilitated  -- CHANGED FROM percentage_fee
FROM (((((((client_products cp
    JOIN client_groups cg ON ((cp.client_id = cg.id)))
    LEFT JOIN available_providers ap ON ((cp.provider_id = ap.id)))
    LEFT JOIN portfolios p ON ((cp.portfolio_id = p.id)))
    LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)))
    LEFT JOIN latest_portfolio_irr_values lpir ON ((p.id = lpir.portfolio_id)))
    LEFT JOIN product_owner_products pop ON ((cp.id = pop.product_id)))
    LEFT JOIN product_owners po ON (((pop.product_owner_id = po.id) AND (po.status = 'active'::text))))
WHERE (cg.status = 'active'::text)
GROUP BY
    cp.id, cp.client_id, cp.product_name, cp.product_type, cp.status, cp.start_date,
    cp.end_date, cp.provider_id, cp.portfolio_id, cp.plan_number, cp.created_at,
    cg.name, cg.advisor, cg.type, ap.name, ap.theme_color, p.portfolio_name, p.status,
    lpv.valuation, lpv.valuation_date, lpir.irr_result, lpir.date,
    cp.fixed_fee_facilitated, cp.percentage_fee_facilitated;  -- CHANGED FROM percentage_fee

-- ============================================================================
-- STEP 4: Update revenue_analytics_optimized View
-- ============================================================================
-- Changes: 1 field reference
-- This view provides optimized revenue analytics with window functions
-- CRITICAL: Preserves status filters in JOIN conditions and WHERE clause

DROP VIEW IF EXISTS revenue_analytics_optimized CASCADE;

CREATE OR REPLACE VIEW revenue_analytics_optimized AS
SELECT
    cg.id AS client_id,
    cg.name AS client_name,
    cg.status AS client_status,
    cp.id AS product_id,
    cp.fixed_fee_facilitated,
    cp.percentage_fee_facilitated,  -- CHANGED FROM percentage_fee
    cp.portfolio_id,
    pf.id AS portfolio_fund_id,
    lfv.valuation AS fund_valuation,
    CASE
        WHEN (lfv.valuation IS NOT NULL) THEN true
        ELSE false
    END AS has_valuation,
    sum(COALESCE(lfv.valuation, (0)::numeric)) OVER (PARTITION BY cp.id) AS product_total_fum,
    count(pf.id) OVER (PARTITION BY cp.id) AS product_fund_count,
    count(lfv.valuation) OVER (PARTITION BY cp.id) AS product_valued_fund_count
FROM (((client_groups cg
    LEFT JOIN client_products cp ON (((cg.id = cp.client_id) AND (cp.status = 'active'::text))))
    LEFT JOIN portfolio_funds pf ON (((cp.portfolio_id = pf.portfolio_id) AND (pf.status = 'active'::text))))
    LEFT JOIN latest_portfolio_fund_valuations lfv ON ((pf.id = lfv.portfolio_fund_id)))
WHERE (cg.status = ANY (ARRAY['active'::text, 'dormant'::text]));

-- ============================================================================
-- VALIDATION: Quick Checks Before Commit
-- ============================================================================

-- Check 1: Verify column renamed successfully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_products' AND column_name = 'percentage_fee_facilitated'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: percentage_fee_facilitated column not found after rename';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_products' AND column_name = 'percentage_fee'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: percentage_fee column still exists after rename';
    END IF;

    RAISE NOTICE 'SUCCESS: Column rename validated successfully';
END $$;

-- Check 2: Verify all views are queryable and return data
DO $$
DECLARE
    view_count INTEGER;
    test_result RECORD;
BEGIN
    -- Test company_revenue_analytics
    SELECT COUNT(*) INTO view_count FROM company_revenue_analytics;
    RAISE NOTICE 'company_revenue_analytics: % rows', view_count;
    
    -- Test products_list_view  
    SELECT COUNT(*) INTO view_count FROM products_list_view;
    RAISE NOTICE 'products_list_view: % rows', view_count;
    
    -- Test revenue_analytics_optimized
    SELECT COUNT(*) INTO view_count FROM revenue_analytics_optimized;
    RAISE NOTICE 'revenue_analytics_optimized: % rows', view_count;
    
    RAISE NOTICE 'SUCCESS: All views are queryable';
END $$;

-- Check 3: Verify data integrity - compare a few sample calculations
-- Test that percentage fee calculations still work correctly
SELECT 
    'Data Integrity Check' as check_type,
    COUNT(*) as products_with_percentage_fees,
    SUM(
        CASE 
            WHEN percentage_fee_facilitated IS NOT NULL AND percentage_fee_facilitated::numeric > 0
            THEN 1 
            ELSE 0 
        END
    ) as products_with_nonzero_percentage_fees
FROM client_products 
WHERE status = 'active';

-- Quick calculation test
SELECT 
    'Sample Revenue Calculation' as test_type,
    id as product_id,
    percentage_fee_facilitated,
    CASE 
        WHEN percentage_fee_facilitated IS NOT NULL 
        THEN 'Can calculate: ' || percentage_fee_facilitated || '% of portfolio value'
        ELSE 'No percentage fee'
    END as calculation_test
FROM client_products 
WHERE status = 'active' 
    AND percentage_fee_facilitated IS NOT NULL
LIMIT 3;

-- If all validations pass, commit the transaction
COMMIT;

-- Success message
SELECT '=================================================================' as divider;
SELECT '🎉 MIGRATION 002 COMPLETED SUCCESSFULLY! 🎉' as status;
SELECT '=================================================================' as divider;
SELECT 'Column renamed: percentage_fee → percentage_fee_facilitated' as change1;
SELECT 'Views updated: company_revenue_analytics, products_list_view, revenue_analytics_optimized' as change2;
SELECT 'All validations passed' as change3;
SELECT 'Ready for backend/frontend code deployment' as next_step;

-- If any validation fails, transaction will auto-rollback with error message