-- Debug Portfolio Completeness Check
-- Run this for portfolio 410 to see what the completeness check sees

-- Show all active funds in portfolio 410
SELECT
    pf.id as portfolio_fund_id,
    af.fund_name,
    af.isin_number,
    pf.status,
    CASE
        WHEN af.fund_name = 'Cash' AND af.isin_number = 'N/A' THEN 'YES - EXCLUDED'
        ELSE 'NO - INCLUDED'
    END as is_cash_fund
FROM portfolio_funds pf
JOIN available_funds af ON pf.available_funds_id = af.id
WHERE pf.portfolio_id = 410
  AND pf.status = 'active'
ORDER BY pf.id;

-- Show non-cash funds only (what completeness check uses)
SELECT
    pf.id as portfolio_fund_id,
    af.fund_name,
    af.isin_number
FROM portfolio_funds pf
JOIN available_funds af ON pf.available_funds_id = af.id
WHERE pf.portfolio_id = 410
  AND pf.status = 'active'
  AND NOT (af.fund_name = 'Cash' AND af.isin_number = 'N/A')
ORDER BY pf.id;

-- Show valuations for Feb 2025 (2025-02-01)
SELECT
    pfv.portfolio_fund_id,
    af.fund_name,
    pfv.valuation_date,
    pfv.valuation
FROM portfolio_fund_valuations pfv
JOIN portfolio_funds pf ON pfv.portfolio_fund_id = pf.id
JOIN available_funds af ON pf.available_funds_id = af.id
WHERE pf.portfolio_id = 410
  AND pfv.valuation_date = '2025-02-01'
ORDER BY pfv.portfolio_fund_id;

-- Show valuations for Mar 2025 (2025-03-01)
SELECT
    pfv.portfolio_fund_id,
    af.fund_name,
    pfv.valuation_date,
    pfv.valuation
FROM portfolio_fund_valuations pfv
JOIN portfolio_funds pf ON pfv.portfolio_fund_id = pf.id
JOIN available_funds af ON pf.available_funds_id = af.id
WHERE pf.portfolio_id = 410
  AND pfv.valuation_date = '2025-03-01'
ORDER BY pfv.portfolio_fund_id;

-- Check completeness for 2025-02-01
SELECT
    'Completeness for 2025-02-01' as check_name,
    COUNT(DISTINCT pf.id) as total_non_cash_funds,
    COUNT(DISTINCT pfv.portfolio_fund_id) as funds_with_valuations,
    CASE
        WHEN COUNT(DISTINCT pf.id) = COUNT(DISTINCT pfv.portfolio_fund_id) THEN 'COMPLETE'
        ELSE 'INCOMPLETE'
    END as status
FROM portfolio_funds pf
JOIN available_funds af ON pf.available_funds_id = af.id
LEFT JOIN portfolio_fund_valuations pfv ON pf.id = pfv.portfolio_fund_id AND pfv.valuation_date = '2025-02-01'
WHERE pf.portfolio_id = 410
  AND pf.status = 'active'
  AND NOT (af.fund_name = 'Cash' AND af.isin_number = 'N/A');

-- Check completeness for 2025-03-01
SELECT
    'Completeness for 2025-03-01' as check_name,
    COUNT(DISTINCT pf.id) as total_non_cash_funds,
    COUNT(DISTINCT pfv.portfolio_fund_id) as funds_with_valuations,
    CASE
        WHEN COUNT(DISTINCT pf.id) = COUNT(DISTINCT pfv.portfolio_fund_id) THEN 'COMPLETE'
        ELSE 'INCOMPLETE'
    END as status
FROM portfolio_funds pf
JOIN available_funds af ON pf.available_funds_id = af.id
LEFT JOIN portfolio_fund_valuations pfv ON pf.id = pfv.portfolio_fund_id AND pfv.valuation_date = '2025-03-01'
WHERE pf.portfolio_id = 410
  AND pf.status = 'active'
  AND NOT (af.fund_name = 'Cash' AND af.isin_number = 'N/A');
