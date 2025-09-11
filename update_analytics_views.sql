-- ============================================================================
-- UPDATE ANALYTICS VIEWS TO INCLUDE ALL PRODUCTS (ACTIVE AND INACTIVE)
-- ============================================================================
-- This script CAREFULLY updates key analytics views to include all products rather than
-- just active ones, by ONLY removing status filters while preserving all other logic.

-- 1. UPDATE company_revenue_analytics VIEW
-- ONLY CHANGE: Remove all status = 'active' conditions while keeping all other logic identical
CREATE OR REPLACE VIEW company_revenue_analytics AS
 SELECT sum(
        CASE
            WHEN (cp.fixed_cost IS NOT NULL) THEN (cp.fixed_cost)::numeric
            ELSE (0)::numeric
        END) AS total_fixed_revenue,
    sum(
        CASE
            WHEN ((cp.percentage_fee IS NOT NULL) AND (pv.total_value > (0)::numeric)) THEN (pv.total_value * ((cp.percentage_fee)::numeric / 100.0))
            ELSE (0)::numeric
        END) AS total_percentage_revenue,
    sum(
        CASE
            WHEN TRUE THEN (COALESCE((cp.fixed_cost)::numeric, (0)::numeric) +
            CASE
                WHEN ((cp.percentage_fee IS NOT NULL) AND (pv.total_value > (0)::numeric)) THEN (pv.total_value * ((cp.percentage_fee)::numeric / 100.0))
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
            WHEN ((cp.percentage_fee IS NOT NULL) AND ((cp.percentage_fee)::numeric > (0)::numeric)) THEN (cp.percentage_fee)::numeric
            ELSE NULL::numeric
        END) AS avg_percentage_fee,
    avg(
        CASE
            WHEN ((cp.fixed_cost IS NOT NULL) AND ((cp.fixed_cost)::numeric > (0)::numeric)) THEN (cp.fixed_cost)::numeric
            ELSE NULL::numeric
        END) AS avg_fixed_cost,
    CURRENT_TIMESTAMP AS calculated_at
   FROM (client_products cp
     LEFT JOIN ( SELECT p.id AS portfolio_id,
            sum(COALESCE(lpfv.valuation, (0)::numeric)) AS total_value
           FROM ((portfolios p
             LEFT JOIN portfolio_funds pf ON ((p.id = pf.portfolio_id)))
             LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
          GROUP BY p.id) pv ON ((cp.portfolio_id = pv.portfolio_id)));

-- 2. UPDATE analytics_dashboard_summary VIEW  
-- ONLY CHANGE: Remove all status = 'active' filters while keeping JOIN structure identical
CREATE OR REPLACE VIEW analytics_dashboard_summary AS
 SELECT sum(lpv.valuation) AS total_fum,
    ( SELECT company_irr_cache.irr_value
           FROM company_irr_cache
          WHERE (company_irr_cache.calculation_type = 'company_irr'::text)
         LIMIT 1) AS company_irr,
    count(DISTINCT cg.id) AS total_clients,
    count(DISTINCT cp.id) AS total_accounts,
    count(DISTINCT af.id) AS total_funds,
    ( SELECT company_irr_cache.cache_timestamp
           FROM company_irr_cache
          WHERE (company_irr_cache.calculation_type = 'last_update'::text)
         LIMIT 1) AS last_irr_calculation
   FROM (((((client_products cp
     JOIN client_groups cg ON ((cp.client_id = cg.id)))
     JOIN portfolios p ON ((cp.portfolio_id = p.id)))
     JOIN portfolio_funds pf ON ((p.id = pf.portfolio_id)))
     JOIN available_funds af ON ((pf.available_funds_id = af.id)))
     LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)));

-- 3. UPDATE fund_distribution_fast VIEW
-- ONLY CHANGE: Remove (pf.status = 'active'::text) filter while keeping all other logic identical
CREATE OR REPLACE VIEW fund_distribution_fast AS
 SELECT af.id,
    af.fund_name AS name,
    COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) AS amount,
    count(pf.id) AS fund_holdings
   FROM ((available_funds af
     LEFT JOIN portfolio_funds pf ON ((af.id = pf.available_funds_id)))
     LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
  GROUP BY af.id, af.fund_name
 HAVING (COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) > (0)::numeric)
  ORDER BY COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) DESC;

-- 4. UPDATE provider_distribution_fast VIEW
-- ONLY CHANGE: Remove (cp.status = 'active'::text) and (p.status = 'active'::text) and (pf.status = 'active'::text) filters
CREATE OR REPLACE VIEW provider_distribution_fast AS
 SELECT ap.id,
    ap.name,
    COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) AS amount,
    count(DISTINCT cp.id) AS product_count
   FROM ((((available_providers ap
     LEFT JOIN client_products cp ON ((ap.id = cp.provider_id)))
     LEFT JOIN portfolios p ON ((cp.portfolio_id = p.id)))
     LEFT JOIN portfolio_funds pf ON ((p.id = pf.portfolio_id)))
     LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
  GROUP BY ap.id, ap.name
 HAVING (COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) > (0)::numeric)
  ORDER BY COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) DESC;

-- 5. UPDATE revenue_analytics_optimized VIEW
-- ONLY CHANGE: Remove (cp.status = 'active'::text) and (pf.status = 'active'::text) filters
CREATE OR REPLACE VIEW revenue_analytics_optimized AS
 SELECT cg.id AS client_id,
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
     LEFT JOIN client_products cp ON ((cg.id = cp.client_id)))
     LEFT JOIN portfolio_funds pf ON ((cp.portfolio_id = pf.portfolio_id)))
     LEFT JOIN latest_portfolio_fund_valuations lfv ON ((pf.id = lfv.portfolio_fund_id)))
  WHERE (cg.status = ANY (ARRAY['active'::text, 'dormant'::text]));

-- Add helpful comments
COMMENT ON VIEW company_revenue_analytics IS 'Company-wide revenue analytics including all products (active and inactive) - Updated to provide complete business view';
COMMENT ON VIEW analytics_dashboard_summary IS 'Dashboard summary metrics including all products and funds - Updated to show complete business scope';
COMMENT ON VIEW fund_distribution_fast IS 'Fund distribution including all fund holdings - Updated for complete portfolio analysis';
COMMENT ON VIEW provider_distribution_fast IS 'Provider distribution including all client relationships - Updated for complete provider analysis';
COMMENT ON VIEW revenue_analytics_optimized IS 'Optimized revenue analytics including all client products - Updated for complete revenue analysis';

-- Verify the updates worked
SELECT 'company_revenue_analytics' AS view_name, COUNT(*) AS row_count FROM company_revenue_analytics
UNION ALL
SELECT 'analytics_dashboard_summary' AS view_name, COUNT(*) AS row_count FROM analytics_dashboard_summary
UNION ALL
SELECT 'fund_distribution_fast' AS view_name, COUNT(*) AS row_count FROM fund_distribution_fast
UNION ALL
SELECT 'provider_distribution_fast' AS view_name, COUNT(*) AS row_count FROM provider_distribution_fast;