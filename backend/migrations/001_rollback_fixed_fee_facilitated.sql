-- Rollback: Rename fixed_fee_facilitated back to fixed_cost
-- Migration: 001_rename_fixed_cost_to_fixed_fee_facilitated
-- Created: 2025-11-24
-- Description: Complete rollback of Phase 1 fee type refactoring
-- Use case: Execute if post-migration validation fails or critical issues discovered
-- Risk: LOW - Reverting to known good state

-- ============================================================================
-- ROLLBACK TRIGGER CONDITIONS
-- ============================================================================
-- Execute this rollback if ANY of these conditions are met:
-- 1. Post-migration validation fails (revenue differences > £0.01)
-- 2. NULL values appear where fixed costs previously existed
-- 3. Application errors related to fixed_fee_facilitated field
-- 4. Revenue reports show incorrect calculations
-- 5. Critical production issue discovered within 24 hours of deployment

-- ============================================================================
-- PRE-ROLLBACK VALIDATION
-- ============================================================================
-- Verify current state before rollback

DO $$
BEGIN
    -- Confirm we're in the post-migration state
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'client_products'
        AND column_name = 'fixed_fee_facilitated'
    ) THEN
        RAISE EXCEPTION 'ROLLBACK ABORTED: Column fixed_fee_facilitated does not exist. Already rolled back or migration never ran.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'client_products'
        AND column_name = 'fixed_cost'
    ) THEN
        RAISE EXCEPTION 'ROLLBACK ABORTED: Column fixed_cost already exists. Already rolled back.';
    END IF;

    RAISE NOTICE 'Pre-rollback validation passed. Proceeding with rollback...';
END $$;

BEGIN;

-- ============================================================================
-- STEP 1: Rollback Column Rename
-- ============================================================================
-- Rename fixed_fee_facilitated back to fixed_cost

ALTER TABLE client_products
RENAME COLUMN fixed_fee_facilitated TO fixed_cost;

COMMENT ON COLUMN client_products.fixed_cost IS 'Annual fixed cost/fee amount in GBP';

-- ============================================================================
-- STEP 2: Rollback company_revenue_analytics View
-- ============================================================================
-- Restore original view with fixed_cost and total_fixed_revenue

DROP VIEW IF EXISTS company_revenue_analytics CASCADE;

CREATE OR REPLACE VIEW company_revenue_analytics AS
SELECT
    sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.fixed_cost IS NOT NULL))
            THEN (cp.fixed_cost)::numeric
            ELSE (0)::numeric
        END) AS total_fixed_revenue,
    sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.percentage_fee IS NOT NULL) AND (pv.total_value > (0)::numeric))
            THEN (pv.total_value * ((cp.percentage_fee)::numeric / 100.0))
            ELSE (0)::numeric
        END) AS total_percentage_revenue,
    sum(
        CASE
            WHEN (cp.status = 'active'::text)
            THEN (COALESCE((cp.fixed_cost)::numeric, (0)::numeric) +
            CASE
                WHEN ((cp.percentage_fee IS NOT NULL) AND (pv.total_value > (0)::numeric))
                THEN (pv.total_value * ((cp.percentage_fee)::numeric / 100.0))
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
            WHEN ((cp.percentage_fee IS NOT NULL) AND ((cp.percentage_fee)::numeric > (0)::numeric))
            THEN (cp.percentage_fee)::numeric
            ELSE NULL::numeric
        END) AS avg_percentage_fee,
    avg(
        CASE
            WHEN ((cp.fixed_cost IS NOT NULL) AND ((cp.fixed_cost)::numeric > (0)::numeric))
            THEN (cp.fixed_cost)::numeric
            ELSE NULL::numeric
        END) AS avg_fixed_cost,
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

COMMENT ON VIEW company_revenue_analytics IS 'Company-wide revenue analytics';

-- ============================================================================
-- STEP 3: Rollback products_list_view View
-- ============================================================================
-- Restore original view with fixed_cost

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
    cp.fixed_cost,
    cp.percentage_fee
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
    cp.fixed_cost, cp.percentage_fee;

COMMENT ON VIEW products_list_view IS 'Comprehensive product listing';

-- ============================================================================
-- STEP 4: Rollback revenue_analytics_optimized View
-- ============================================================================
-- Restore original view with fixed_cost
-- CRITICAL: Must preserve exact original JOIN conditions and WHERE clause

DROP VIEW IF EXISTS revenue_analytics_optimized CASCADE;

CREATE OR REPLACE VIEW revenue_analytics_optimized AS
SELECT
    cg.id AS client_id,
    cg.name AS client_name,
    cg.status AS client_status,
    cp.id AS product_id,
    cp.fixed_cost,
    cp.percentage_fee,
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

COMMENT ON VIEW revenue_analytics_optimized IS 'Optimized revenue analytics';

-- ============================================================================
-- POST-ROLLBACK VALIDATION
-- ============================================================================

DO $$
BEGIN
    -- Verify column rename succeeded
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'client_products'
        AND column_name = 'fixed_cost'
    ) THEN
        RAISE EXCEPTION 'ROLLBACK FAILED: Column fixed_cost does not exist after rollback';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'client_products'
        AND column_name = 'fixed_fee_facilitated'
    ) THEN
        RAISE EXCEPTION 'ROLLBACK FAILED: Column fixed_fee_facilitated still exists after rollback';
    END IF;

    -- Test all views are queryable
    PERFORM * FROM company_revenue_analytics LIMIT 1;
    PERFORM * FROM products_list_view LIMIT 1;
    PERFORM * FROM revenue_analytics_optimized LIMIT 1;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'ROLLBACK SUCCESSFUL ✅';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database schema restored to pre-migration state';
    RAISE NOTICE 'Column: fixed_fee_facilitated → fixed_cost';
    RAISE NOTICE 'All views restored to original state';
    RAISE NOTICE '';
    RAISE NOTICE 'REQUIRED ACTIONS:';
    RAISE NOTICE '1. Rollback/redeploy previous backend code';
    RAISE NOTICE '2. Rollback/redeploy previous frontend code';
    RAISE NOTICE '3. Clear React Query cache (users refresh browsers)';
    RAISE NOTICE '4. Verify application functionality';
    RAISE NOTICE '5. Investigate root cause of migration failure';
    RAISE NOTICE '6. Document lessons learned';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ROLLBACK VALIDATION FAILED: %', SQLERRM;
END $$;

COMMIT;

-- ============================================================================
-- POST-ROLLBACK CHECKLIST
-- ============================================================================
-- ☐ Verify application loads without errors
-- ☐ Test product creation with fixed costs
-- ☐ Verify revenue reports display correctly
-- ☐ Check company analytics page
-- ☐ Verify all API endpoints return correct data
-- ☐ Monitor application logs for 1 hour
-- ☐ Document root cause analysis
-- ☐ Update refactoring plan based on findings
-- ☐ Schedule retrospective to improve migration process
