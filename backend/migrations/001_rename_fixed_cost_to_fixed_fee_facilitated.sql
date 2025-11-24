-- Migration: Rename fixed_cost to fixed_fee_facilitated
-- Version: 001
-- Created: 2025-11-24
-- Description: Phase 1 of fee type refactoring - rename fixed_cost column and update all dependent views
-- Impact: 1 table column, 3 database views (7 total references)
-- Risk: MEDIUM-HIGH - Affects revenue calculations across entire system
-- Rollback: See 001_rollback_fixed_fee_facilitated.sql

-- ============================================================================
-- VALIDATION: Pre-Migration Baseline Capture
-- ============================================================================
-- Run validation queries from validation/001_pre_migration_baseline.sql BEFORE executing this migration

BEGIN;

-- ============================================================================
-- STEP 1: Rename Column in client_products Table
-- ============================================================================
-- This is the core schema change that all views depend on

ALTER TABLE client_products
RENAME COLUMN fixed_cost TO fixed_fee_facilitated;

COMMENT ON COLUMN client_products.fixed_fee_facilitated IS 'Annual fixed facilitated fee amount in GBP - charged regardless of portfolio value';

-- ============================================================================
-- STEP 2: Update company_revenue_analytics View
-- ============================================================================
-- This view has 4 references to fixed_cost (lines 389, 399, 417, 419 in original)
-- Also renames computed column: total_fixed_revenue → total_fixed_facilitated_revenue

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
            WHEN ((cp.status = 'active'::text) AND (cp.percentage_fee IS NOT NULL) AND (pv.total_value > (0)::numeric))
            THEN (pv.total_value * ((cp.percentage_fee)::numeric / 100.0))
            ELSE (0)::numeric
        END) AS total_percentage_revenue,
    sum(
        CASE
            WHEN (cp.status = 'active'::text)
            THEN (COALESCE((cp.fixed_fee_facilitated)::numeric, (0)::numeric) +
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

COMMENT ON VIEW company_revenue_analytics IS 'Company-wide revenue analytics with renamed fixed facilitated fee fields';

-- ============================================================================
-- STEP 3: Update products_list_view View
-- ============================================================================
-- This view has 2 references to fixed_cost (lines 770, 781 in original)

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
    cp.fixed_fee_facilitated, cp.percentage_fee;

COMMENT ON VIEW products_list_view IS 'Comprehensive product listing with renamed fixed facilitated fee field';

-- ============================================================================
-- STEP 4: Update revenue_analytics_optimized View
-- ============================================================================
-- This view has 1 reference to fixed_cost (line 828 in original)
-- CRITICAL: Must preserve exact JOIN conditions and WHERE clause from original

DROP VIEW IF EXISTS revenue_analytics_optimized CASCADE;

CREATE OR REPLACE VIEW revenue_analytics_optimized AS
SELECT
    cg.id AS client_id,
    cg.name AS client_name,
    cg.status AS client_status,
    cp.id AS product_id,
    cp.fixed_fee_facilitated,
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

COMMENT ON VIEW revenue_analytics_optimized IS 'Optimized revenue analytics with renamed fixed facilitated fee field';

-- ============================================================================
-- VALIDATION CHECKPOINT
-- ============================================================================
-- After migration completes, run validation queries from:
-- validation/001_post_migration_validation.sql
--
-- SUCCESS CRITERIA:
-- 1. All revenue calculations match baseline within £0.01
-- 2. No NULL values where fixed_fee_facilitated previously had values
-- 3. All views return data successfully
-- 4. Zero errors in application logs
--
-- If ANY validation fails, immediately rollback using:
-- 001_rollback_fixed_fee_facilitated.sql

COMMIT;

-- ============================================================================
-- POST-MIGRATION STEPS
-- ============================================================================
-- 1. Deploy updated backend code (API response keys)
-- 2. Deploy updated frontend code (cache invalidation)
-- 3. Monitor application logs for errors
-- 4. Verify revenue reports display correctly
-- 5. Test all product CRUD operations
-- 6. Monitor for 24 hours before declaring success
