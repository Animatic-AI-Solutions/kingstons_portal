-- Fix for Historical IRR Views
-- Issue: WHERE clause on LEFT JOINed table was preventing IRR records from being returned
-- Solution: Move the status filter to the JOIN condition

-- Fix portfolio_historical_irr view
CREATE OR REPLACE VIEW public.portfolio_historical_irr AS
SELECT 
    piv.id AS irr_id,
    piv.portfolio_id,
    piv.irr_result,
    piv.date AS irr_date,
    piv.portfolio_valuation_id,
    -- Portfolio details
    p.portfolio_name,
    p.status AS portfolio_status,
    -- Product details
    cp.id AS product_id,
    cp.product_name,
    cp.client_id,
    cp.provider_id,
    cp.status AS product_status,
    -- Provider details
    ap.name AS provider_name,
    ap.theme_color AS provider_theme_color,
    -- Client group details
    cg.name AS client_group_name
FROM portfolio_irr_values piv
LEFT JOIN portfolios p ON p.id = piv.portfolio_id
LEFT JOIN client_products cp ON cp.portfolio_id = piv.portfolio_id AND cp.status = 'active'
LEFT JOIN available_providers ap ON ap.id = cp.provider_id
LEFT JOIN client_groups cg ON cg.id = cp.client_id
ORDER BY piv.portfolio_id, piv.date DESC;

-- Fix fund_historical_irr view
CREATE OR REPLACE VIEW public.fund_historical_irr AS
SELECT 
    pfiv.id AS irr_id,
    pfiv.fund_id AS portfolio_fund_id,
    pfiv.irr_result,
    pfiv.date AS irr_date,
    pfiv.fund_valuation_id,
    -- Portfolio fund details
    pf.portfolio_id,
    pf.available_funds_id,
    pf.status AS fund_status,
    pf.start_date AS fund_start_date,
    pf.end_date AS fund_end_date,
    pf.target_weighting,
    -- Available fund details
    af.fund_name,
    af.isin_number,
    af.risk_factor,
    af.fund_cost,
    -- Portfolio details
    p.portfolio_name,
    p.status AS portfolio_status,
    -- Product details
    cp.id AS product_id,
    cp.product_name,
    cp.client_id,
    cp.provider_id,
    cp.status AS product_status,
    -- Provider details
    ap.name AS provider_name,
    ap.theme_color AS provider_theme_color,
    -- Client group details
    cg.name AS client_group_name
FROM portfolio_fund_irr_values pfiv
LEFT JOIN portfolio_funds pf ON pf.id = pfiv.fund_id
LEFT JOIN available_funds af ON af.id = pf.available_funds_id
LEFT JOIN portfolios p ON p.id = pf.portfolio_id
LEFT JOIN client_products cp ON cp.portfolio_id = pf.portfolio_id AND cp.status = 'active'
LEFT JOIN available_providers ap ON ap.id = cp.provider_id
LEFT JOIN client_groups cg ON cg.id = cp.client_id
ORDER BY pfiv.fund_id, pfiv.date DESC; 