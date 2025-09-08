-- Diagnostic queries for Product 217 investment issue
-- Run these queries to investigate the missing investment data

-- 1. Check basic product information
SELECT 
    cp.id as product_id,
    cp.product_name,
    cp.portfolio_id,
    p.portfolio_name
FROM client_products cp
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
WHERE cp.id = 217;

-- 2. Check portfolio funds for Product 217
SELECT 
    pf.id as portfolio_fund_id,
    pf.portfolio_id,
    pf.status,
    af.fund_name,
    pf.amount_invested
FROM client_products cp
JOIN portfolios p ON cp.portfolio_id = p.id
JOIN portfolio_funds pf ON p.id = pf.portfolio_id
JOIN available_funds af ON pf.available_funds_id = af.id
WHERE cp.id = 217;

-- 3. Check holding_activity_log for Product 217 portfolio funds
SELECT 
    hal.id,
    hal.portfolio_fund_id,
    hal.activity_type,
    hal.amount,
    hal.activity_timestamp,
    af.fund_name
FROM client_products cp
JOIN portfolios p ON cp.portfolio_id = p.id
JOIN portfolio_funds pf ON p.id = pf.portfolio_id
JOIN available_funds af ON pf.available_funds_id = af.id
JOIN holding_activity_log hal ON pf.id = hal.portfolio_fund_id
WHERE cp.id = 217
ORDER BY hal.activity_timestamp DESC;

-- 4. Check fund_activity_summary view for Product 217
SELECT 
    fas.portfolio_fund_id,
    fas.fund_name,
    fas.total_investments,
    fas.total_regular_investments,
    fas.total_tax_uplift,
    fas.total_withdrawals,
    fas.activity_count,
    fas.last_activity_date
FROM client_products cp
JOIN portfolios p ON cp.portfolio_id = p.id
JOIN portfolio_funds pf ON p.id = pf.portfolio_id
JOIN fund_activity_summary fas ON pf.id = fas.portfolio_fund_id
WHERE cp.id = 217;

-- 5. Check what the backend API should return for Product 217 investments
SELECT 
    pf.id as portfolio_fund_id,
    af.fund_name,
    COALESCE(SUM(CASE WHEN hal.activity_type = 'Investment' THEN hal.amount ELSE 0 END), 0) as investment_total,
    COALESCE(SUM(CASE WHEN hal.activity_type = 'RegularInvestment' THEN hal.amount ELSE 0 END), 0) as regular_investment_total,
    COALESCE(SUM(CASE WHEN hal.activity_type = 'TaxUplift' THEN hal.amount ELSE 0 END), 0) as tax_uplift_total,
    COALESCE(SUM(CASE WHEN hal.activity_type IN ('Investment', 'RegularInvestment', 'TaxUplift') THEN hal.amount ELSE 0 END), 0) as combined_investment_total,
    STRING_AGG(DISTINCT hal.activity_type, ', ') as activity_types_found
FROM client_products cp
JOIN portfolios p ON cp.portfolio_id = p.id
JOIN portfolio_funds pf ON p.id = pf.portfolio_id
JOIN available_funds af ON pf.available_funds_id = af.id
LEFT JOIN holding_activity_log hal ON pf.id = hal.portfolio_fund_id
WHERE cp.id = 217
GROUP BY pf.id, af.fund_name;

-- 6. Compare with working Product 216
SELECT 
    'Product 216' as product,
    COUNT(hal.id) as transaction_count,
    COUNT(DISTINCT hal.activity_type) as activity_types,
    STRING_AGG(DISTINCT hal.activity_type, ', ') as activity_type_list
FROM client_products cp
JOIN portfolios p ON cp.portfolio_id = p.id
JOIN portfolio_funds pf ON p.id = pf.portfolio_id
JOIN holding_activity_log hal ON pf.id = hal.portfolio_fund_id
WHERE cp.id = 216
UNION ALL
SELECT 
    'Product 217' as product,
    COUNT(hal.id) as transaction_count,
    COUNT(DISTINCT hal.activity_type) as activity_types,
    STRING_AGG(DISTINCT hal.activity_type, ', ') as activity_type_list
FROM client_products cp
JOIN portfolios p ON cp.portfolio_id = p.id
JOIN portfolio_funds pf ON p.id = pf.portfolio_id
JOIN holding_activity_log hal ON pf.id = hal.portfolio_fund_id
WHERE cp.id = 217;