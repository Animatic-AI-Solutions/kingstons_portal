-- =========================================================
-- Kingston's Portal - Create Database Views (Fixed)
-- This script creates all the views needed for analytics (fixed aggregation issues)
-- =========================================================

-- =========================================================
-- Core Performance Views
-- =========================================================

-- Latest portfolio fund IRR values
CREATE OR REPLACE VIEW public.latest_portfolio_fund_irr_values AS
SELECT DISTINCT ON (fund_id) 
    id,
    fund_id,
    date,
    irr_result,
    created_at
FROM portfolio_fund_irr_values
ORDER BY fund_id, date DESC, created_at DESC;

SELECT 'Created latest_portfolio_fund_irr_values view' as status;

-- Latest portfolio fund valuations
CREATE OR REPLACE VIEW public.latest_portfolio_fund_valuations AS
SELECT DISTINCT ON (portfolio_fund_id) 
    id,
    portfolio_fund_id,
    valuation_date,
    valuation,
    created_at
FROM portfolio_fund_valuations
ORDER BY portfolio_fund_id, valuation_date DESC, created_at DESC;

SELECT 'Created latest_portfolio_fund_valuations view' as status;

-- Latest portfolio IRR values
CREATE OR REPLACE VIEW public.latest_portfolio_irr_values AS
SELECT DISTINCT ON (portfolio_id) 
    id,
    portfolio_id,
    date,
    irr_result,
    created_at
FROM portfolio_irr_values
ORDER BY portfolio_id, date DESC, created_at DESC;

SELECT 'Created latest_portfolio_irr_values view' as status;

-- Latest portfolio valuations
CREATE OR REPLACE VIEW public.latest_portfolio_valuations AS
SELECT DISTINCT ON (portfolio_id) 
    id,
    portfolio_id,
    valuation_date,
    valuation,
    created_at
FROM portfolio_valuations
ORDER BY portfolio_id, valuation_date DESC, created_at DESC;

SELECT 'Created latest_portfolio_valuations view' as status;

-- =========================================================
-- Historical Performance Views
-- =========================================================

-- Portfolio historical IRR
CREATE OR REPLACE VIEW public.portfolio_historical_irr AS
SELECT 
    pir.portfolio_id,
    p.portfolio_name,
    pir.date,
    pir.irr_result,
    pir.created_at,
    cp.client_id,
    cg.name as client_name,
    cp.product_name,
    ap.name as provider_name,
    ap.theme_color as provider_color
FROM portfolio_irr_values pir
JOIN portfolios p ON pir.portfolio_id = p.id
JOIN client_products cp ON p.id = cp.portfolio_id
JOIN client_groups cg ON cp.client_id = cg.id
JOIN available_providers ap ON cp.provider_id = ap.id
WHERE p.status = 'active' 
    AND cp.status = 'active'
    AND cg.status = 'active'
ORDER BY pir.date DESC, pir.portfolio_id;

SELECT 'Created portfolio_historical_irr view' as status;

-- Fund historical IRR
CREATE OR REPLACE VIEW public.fund_historical_irr AS
SELECT 
    pfir.fund_id,
    pf.portfolio_id,
    af.fund_name,
    af.isin_number,
    af.risk_factor,
    pfir.date,
    pfir.irr_result,
    pfir.created_at,
    p.portfolio_name,
    cp.client_id,
    cg.name as client_name,
    cp.product_name,
    ap.name as provider_name
FROM portfolio_fund_irr_values pfir
JOIN portfolio_funds pf ON pfir.fund_id = pf.id
JOIN available_funds af ON pf.available_funds_id = af.id
JOIN portfolios p ON pf.portfolio_id = p.id
JOIN client_products cp ON p.id = cp.portfolio_id
JOIN client_groups cg ON cp.client_id = cg.id
JOIN available_providers ap ON cp.provider_id = ap.id
WHERE pf.status = 'active' 
    AND af.status = 'active'
    AND p.status = 'active'
    AND cp.status = 'active'
    AND cg.status = 'active'
ORDER BY pfir.date DESC, pfir.fund_id;

SELECT 'Created fund_historical_irr view' as status;

-- =========================================================
-- Product Owner and Client Views
-- =========================================================

-- Product owner details
CREATE OR REPLACE VIEW public.product_owner_details AS
SELECT 
    po.id,
    po.firstname,
    po.surname,
    po.known_as,
    po.status,
    po.created_at,
    COALESCE(po.known_as, CONCAT(po.firstname, ' ', po.surname)) as display_name,
    COUNT(DISTINCT cgpo.client_group_id) as client_group_count,
    COUNT(DISTINCT pop.product_id) as product_count,
    STRING_AGG(DISTINCT cg.name, ', ') as client_groups,
    STRING_AGG(DISTINCT cp.product_name, ', ') as products
FROM product_owners po
LEFT JOIN client_group_product_owners cgpo ON po.id = cgpo.product_owner_id
LEFT JOIN client_groups cg ON cgpo.client_group_id = cg.id AND cg.status = 'active'
LEFT JOIN product_owner_products pop ON po.id = pop.product_owner_id
LEFT JOIN client_products cp ON pop.product_id = cp.id AND cp.status = 'active'
WHERE po.status = 'active'
GROUP BY po.id, po.firstname, po.surname, po.known_as, po.status, po.created_at;

SELECT 'Created product_owner_details view' as status;

-- Advisor client summary
CREATE OR REPLACE VIEW public.advisor_client_summary AS
SELECT 
    advisor,
    COUNT(DISTINCT id) as client_count,
    COUNT(DISTINCT CASE WHEN status = 'active' THEN id END) as active_client_count,
    STRING_AGG(DISTINCT name, ', ') as client_names
FROM client_groups
WHERE advisor IS NOT NULL AND advisor != ''
GROUP BY advisor
ORDER BY active_client_count DESC, advisor;

SELECT 'Created advisor_client_summary view' as status;

-- =========================================================
-- Analytics and Performance Views
-- =========================================================

-- Portfolio performance history
CREATE OR REPLACE VIEW public.portfolio_performance_history AS
SELECT 
    p.id as portfolio_id,
    p.portfolio_name,
    p.status,
    p.start_date,
    cp.client_id,
    cg.name as client_name,
    cp.product_name,
    ap.name as provider_name,
    ap.theme_color as provider_color,
    lpv.valuation as latest_valuation,
    lpv.valuation_date as latest_valuation_date,
    lpir.irr_result as latest_irr,
    lpir.date as latest_irr_date,
    COUNT(DISTINCT pf.id) as fund_count,
    SUM(pf.amount_invested) as total_invested,
    SUM(pf.target_weighting) as total_target_weighting
FROM portfolios p
JOIN client_products cp ON p.id = cp.portfolio_id
JOIN client_groups cg ON cp.client_id = cg.id
JOIN available_providers ap ON cp.provider_id = ap.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id AND pf.status = 'active'
WHERE p.status = 'active' 
    AND cp.status = 'active'
    AND cg.status = 'active'
GROUP BY p.id, p.portfolio_name, p.status, p.start_date, cp.client_id, 
         cg.name, cp.product_name, ap.name, ap.theme_color,
         lpv.valuation, lpv.valuation_date, lpir.irr_result, lpir.date;

SELECT 'Created portfolio_performance_history view' as status;

-- Fund activity summary
CREATE OR REPLACE VIEW public.fund_activity_summary AS
SELECT 
    pf.id as portfolio_fund_id,
    pf.portfolio_id,
    pf.available_funds_id,
    af.fund_name,
    af.isin_number,
    af.risk_factor,
    af.fund_cost,
    pf.target_weighting,
    pf.amount_invested,
    pf.start_date,
    pf.status,
    COUNT(hal.id) as activity_count,
    SUM(CASE WHEN hal.activity_type = 'Investment' THEN hal.amount ELSE 0 END) as total_investments,
    SUM(CASE WHEN hal.activity_type = 'Withdrawal' THEN hal.amount ELSE 0 END) as total_withdrawals,
    SUM(CASE WHEN hal.activity_type = 'FundSwitchIn' THEN hal.amount ELSE 0 END) as total_switch_in,
    SUM(CASE WHEN hal.activity_type = 'FundSwitchOut' THEN hal.amount ELSE 0 END) as total_switch_out,
    MAX(hal.activity_timestamp) as last_activity_date,
    lpfv.valuation as latest_valuation,
    lpfv.valuation_date as latest_valuation_date,
    lpfir.irr_result as latest_irr,
    lpfir.date as latest_irr_date
FROM portfolio_funds pf
JOIN available_funds af ON pf.available_funds_id = af.id
LEFT JOIN holding_activity_log hal ON pf.id = hal.portfolio_fund_id
LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
LEFT JOIN latest_portfolio_fund_irr_values lpfir ON pf.id = lpfir.fund_id
WHERE pf.status = 'active' AND af.status = 'active'
GROUP BY pf.id, pf.portfolio_id, pf.available_funds_id, af.fund_name, af.isin_number,
         af.risk_factor, af.fund_cost, pf.target_weighting, pf.amount_invested,
         pf.start_date, pf.status, lpfv.valuation, lpfv.valuation_date,
         lpfir.irr_result, lpfir.date;

SELECT 'Created fund_activity_summary view' as status;

-- =========================================================
-- Complete Data Views (for API efficiency)
-- =========================================================

-- Complete fund data
CREATE OR REPLACE VIEW public.complete_fund_data AS
SELECT 
    af.id,
    af.fund_name,
    af.isin_number,
    af.risk_factor,
    af.fund_cost,
    af.status,
    af.created_at,
    COUNT(DISTINCT pf.id) as portfolio_holdings,
    COUNT(DISTINCT pf.portfolio_id) as portfolio_count,
    SUM(pf.amount_invested) as total_invested,
    AVG(pf.target_weighting) as avg_target_weighting,
    SUM(lpfv.valuation) as total_current_value,
    AVG(lpfir.irr_result) as avg_irr,
    COUNT(DISTINCT hal.id) as total_activities,
    MAX(hal.activity_timestamp) as last_activity_date
FROM available_funds af
LEFT JOIN portfolio_funds pf ON af.id = pf.available_funds_id AND pf.status = 'active'
LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
LEFT JOIN latest_portfolio_fund_irr_values lpfir ON pf.id = lpfir.fund_id
LEFT JOIN holding_activity_log hal ON pf.id = hal.portfolio_fund_id
WHERE af.status = 'active'
GROUP BY af.id, af.fund_name, af.isin_number, af.risk_factor, af.fund_cost, af.status, af.created_at;

SELECT 'Created complete_fund_data view' as status;

-- Client group complete data
CREATE OR REPLACE VIEW public.client_group_complete_data AS
SELECT 
    cg.id,
    cg.name,
    cg.advisor,
    cg.type,
    cg.status,
    cg.created_at,
    COUNT(DISTINCT cp.id) as product_count,
    COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'active') as active_product_count,
    COUNT(DISTINCT po.id) as product_owner_count,
    COUNT(DISTINCT p.id) as portfolio_count,
    COUNT(DISTINCT pf.id) as fund_holdings_count,
    SUM(lpv.valuation) as total_portfolio_value,
    AVG(lpir.irr_result) as avg_portfolio_irr,
    STRING_AGG(DISTINCT po.known_as, ', ') as product_owners,
    STRING_AGG(DISTINCT ap.name, ', ') as providers,
    MAX(lpv.valuation_date) as latest_valuation_date,
    MAX(lpir.date) as latest_irr_date
FROM client_groups cg
LEFT JOIN client_products cp ON cg.id = cp.client_id
LEFT JOIN client_group_product_owners cgpo ON cg.id = cgpo.client_group_id
LEFT JOIN product_owners po ON cgpo.product_owner_id = po.id AND po.status = 'active'
LEFT JOIN available_providers ap ON cp.provider_id = ap.id
LEFT JOIN portfolios p ON cp.portfolio_id = p.id AND p.status = 'active'
LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id AND pf.status = 'active'
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
WHERE cg.status = 'active'
GROUP BY cg.id, cg.name, cg.advisor, cg.type, cg.status, cg.created_at;

SELECT 'Created client_group_complete_data view' as status;

-- =========================================================
-- Template and Risk Analysis Views
-- =========================================================

-- Template generation weighted risk
CREATE OR REPLACE VIEW public.template_generation_weighted_risk AS
SELECT 
    tpg.id,
    tpg.available_portfolio_id,
    tpg.version_number,
    tpg.generation_name,
    tpg.description,
    tpg.status,
    tpg.created_at,
    ap.name as portfolio_name,
    COUNT(apf.id) as fund_count,
    AVG(af.risk_factor) as avg_risk_factor,
    SUM(apf.target_weighting * af.risk_factor) / NULLIF(SUM(apf.target_weighting), 0) as weighted_risk_factor,
    SUM(apf.target_weighting) as total_weighting,
    STRING_AGG(af.fund_name, ', ') as fund_names
FROM template_portfolio_generations tpg
JOIN available_portfolios ap ON tpg.available_portfolio_id = ap.id
LEFT JOIN available_portfolio_funds apf ON tpg.id = apf.template_portfolio_generation_id
LEFT JOIN available_funds af ON apf.fund_id = af.id AND af.status = 'active'
WHERE tpg.status = 'active'
GROUP BY tpg.id, tpg.available_portfolio_id, tpg.version_number, tpg.generation_name,
         tpg.description, tpg.status, tpg.created_at, ap.name;

SELECT 'Created template_generation_weighted_risk view' as status;

-- =========================================================
-- Product and Revenue Views
-- =========================================================

-- Products list view
CREATE OR REPLACE VIEW public.products_list_view AS
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
    cg.name as client_name,
    cg.advisor,
    cg.type as client_type,
    ap.name as provider_name,
    ap.theme_color as provider_color,
    p.portfolio_name,
    p.status as portfolio_status,
    lpv.valuation as current_value,
    lpv.valuation_date as valuation_date,
    lpir.irr_result as current_irr,
    lpir.date as irr_date,
    COUNT(DISTINCT pop.product_owner_id) as owner_count,
    STRING_AGG(DISTINCT COALESCE(po.known_as, CONCAT(po.firstname, ' ', po.surname)), ', ') as owners
FROM client_products cp
JOIN client_groups cg ON cp.client_id = cg.id
LEFT JOIN available_providers ap ON cp.provider_id = ap.id
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
LEFT JOIN product_owner_products pop ON cp.id = pop.product_id
LEFT JOIN product_owners po ON pop.product_owner_id = po.id AND po.status = 'active'
WHERE cp.status = 'active' AND cg.status = 'active'
GROUP BY cp.id, cp.client_id, cp.product_name, cp.product_type, cp.status, cp.start_date,
         cp.end_date, cp.provider_id, cp.portfolio_id, cp.plan_number, cp.created_at,
         cg.name, cg.advisor, cg.type, ap.name, ap.theme_color, p.portfolio_name,
         p.status, lpv.valuation, lpv.valuation_date, lpir.irr_result, lpir.date;

SELECT 'Created products_list_view view' as status;

-- =========================================================
-- Revenue and Analytics Views
-- =========================================================

-- Company revenue analytics
CREATE OR REPLACE VIEW public.company_revenue_analytics AS
SELECT 
    'total_fum' as metric,
    SUM(lpv.valuation) as value,
    COUNT(DISTINCT cp.id) as product_count,
    COUNT(DISTINCT cg.id) as client_count,
    AVG(lpir.irr_result) as avg_irr,
    MAX(lpv.valuation_date) as as_of_date
FROM client_products cp
JOIN client_groups cg ON cp.client_id = cg.id
JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
WHERE cp.status = 'active' 
    AND cg.status = 'active' 
    AND p.status = 'active'

UNION ALL

SELECT 
    'provider_' || LOWER(REPLACE(ap.name, ' ', '_')) as metric,
    SUM(lpv.valuation) as value,
    COUNT(DISTINCT cp.id) as product_count,
    COUNT(DISTINCT cg.id) as client_count,
    AVG(lpir.irr_result) as avg_irr,
    MAX(lpv.valuation_date) as as_of_date
FROM client_products cp
JOIN client_groups cg ON cp.client_id = cg.id
JOIN available_providers ap ON cp.provider_id = ap.id
JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
WHERE cp.status = 'active' 
    AND cg.status = 'active' 
    AND p.status = 'active'
    AND ap.status = 'active'
GROUP BY ap.id, ap.name;

SELECT 'Created company_revenue_analytics view' as status;

-- Provider revenue breakdown
CREATE OR REPLACE VIEW public.provider_revenue_breakdown AS
SELECT 
    ap.id,
    ap.name,
    ap.status,
    ap.theme_color,
    COUNT(DISTINCT cp.id) as product_count,
    COUNT(DISTINCT cg.id) as client_count,
    COUNT(DISTINCT p.id) as portfolio_count,
    SUM(lpv.valuation) as total_value,
    AVG(lpir.irr_result) as avg_irr,
    MAX(lpv.valuation_date) as latest_valuation_date,
    MIN(cp.start_date) as first_product_date,
    MAX(cp.start_date) as latest_product_date
FROM available_providers ap
LEFT JOIN client_products cp ON ap.id = cp.provider_id AND cp.status = 'active'
LEFT JOIN client_groups cg ON cp.client_id = cg.id AND cg.status = 'active'
LEFT JOIN portfolios p ON cp.portfolio_id = p.id AND p.status = 'active'
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
WHERE ap.status = 'active'
GROUP BY ap.id, ap.name, ap.status, ap.theme_color
ORDER BY total_value DESC NULLS LAST;

SELECT 'Created provider_revenue_breakdown view' as status;

-- =========================================================
-- Ultra-Fast Analytics Views (for dashboard performance)
-- =========================================================

-- Company IRR cache (simulated - will be populated with actual data)
CREATE OR REPLACE VIEW public.company_irr_cache AS
SELECT 
    'company_irr' as calculation_type,
    AVG(lpir.irr_result) as irr_value,
    NOW() as cache_timestamp,
    'active' as status
FROM client_products cp
JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
WHERE cp.status = 'active' AND p.status = 'active'

UNION ALL

SELECT 
    'last_update' as calculation_type,
    NULL as irr_value,
    NOW() as cache_timestamp,
    'active' as status;

SELECT 'Created company_irr_cache view' as status;

-- Analytics dashboard summary
CREATE OR REPLACE VIEW public.analytics_dashboard_summary AS
SELECT 
    SUM(lpv.valuation) as total_fum,
    (SELECT irr_value FROM company_irr_cache WHERE calculation_type = 'company_irr' LIMIT 1) as company_irr,
    COUNT(DISTINCT cg.id) as total_clients,
    COUNT(DISTINCT cp.id) as total_accounts,
    COUNT(DISTINCT af.id) as total_funds,
    (SELECT cache_timestamp FROM company_irr_cache WHERE calculation_type = 'last_update' LIMIT 1) as last_irr_calculation
FROM client_products cp
JOIN client_groups cg ON cp.client_id = cg.id
JOIN portfolios p ON cp.portfolio_id = p.id
JOIN portfolio_funds pf ON p.id = pf.portfolio_id
JOIN available_funds af ON pf.available_funds_id = af.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
WHERE cp.status = 'active' 
    AND cg.status = 'active' 
    AND p.status = 'active'
    AND pf.status = 'active'
    AND af.status = 'active';

SELECT 'Created analytics_dashboard_summary view' as status;

-- Fast fund distribution view
CREATE OR REPLACE VIEW public.fund_distribution_fast AS
SELECT 
    af.id,
    af.fund_name as name,
    COALESCE(SUM(lpfv.valuation), SUM(pf.amount_invested), 0) as amount,
    COUNT(pf.id) as fund_holdings
FROM available_funds af
LEFT JOIN portfolio_funds pf ON af.id = pf.available_funds_id AND pf.status = 'active'
LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
GROUP BY af.id, af.fund_name
HAVING COALESCE(SUM(lpfv.valuation), SUM(pf.amount_invested), 0) > 0
ORDER BY amount DESC;

SELECT 'Created fund_distribution_fast view' as status;

-- Fast provider distribution view
CREATE OR REPLACE VIEW public.provider_distribution_fast AS
SELECT 
    ap.id,
    ap.name,
    COALESCE(SUM(lpfv.valuation), SUM(pf.amount_invested), 0) as amount,
    COUNT(DISTINCT cp.id) as product_count
FROM available_providers ap
LEFT JOIN client_products cp ON ap.id = cp.provider_id AND cp.status = 'active'
LEFT JOIN portfolios p ON cp.portfolio_id = p.id AND p.status = 'active'
LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id AND pf.status = 'active'
LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
GROUP BY ap.id, ap.name
HAVING COALESCE(SUM(lpfv.valuation), SUM(pf.amount_invested), 0) > 0
ORDER BY amount DESC;

SELECT 'Created provider_distribution_fast view' as status;

-- =========================================================
-- Success Message
-- =========================================================
SELECT 'All database views created successfully!' as status;
SELECT 'View count:' as info;
SELECT COUNT(*) as view_count 
FROM information_schema.views 
WHERE table_schema = 'public';