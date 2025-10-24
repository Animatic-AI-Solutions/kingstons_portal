-- Check for current duplicate portfolio IRRs
-- Run this to see if any duplicates exist

SELECT
    '=== CHECKING FOR DUPLICATE PORTFOLIO IRRs ===' as info;

-- Show any portfolios with duplicate IRRs
SELECT
    p.id as portfolio_id,
    cp.id as product_id,
    cp.product_name,
    cp.plan_number,
    piv.date,
    COUNT(*) as irr_count,
    STRING_AGG(piv.id::TEXT, ', ') as irr_ids,
    STRING_AGG(piv.irr_result::TEXT, ', ') as irr_values
FROM portfolio_irr_values piv
JOIN portfolios p ON piv.portfolio_id = p.id
JOIN client_products cp ON p.id = cp.portfolio_id
GROUP BY p.id, cp.id, cp.product_name, cp.plan_number, piv.date
HAVING COUNT(*) > 1
ORDER BY piv.date DESC, cp.plan_number;

-- Count of duplicates
SELECT
    'Total portfolios with duplicate IRRs:' as summary,
    COUNT(*) as duplicate_count
FROM (
    SELECT portfolio_id, date
    FROM portfolio_irr_values
    GROUP BY portfolio_id, date
    HAVING COUNT(*) > 1
) dups;

-- Check GIBX002486 specifically
SELECT
    '=== GIBX002486 PORTFOLIO IRRs ===' as info;

SELECT
    piv.id as irr_id,
    piv.portfolio_id,
    piv.date,
    piv.irr_result,
    piv.created_at,
    piv.portfolio_valuation_id
FROM portfolio_irr_values piv
JOIN portfolios p ON piv.portfolio_id = p.id
JOIN client_products cp ON p.id = cp.portfolio_id
WHERE cp.plan_number = 'GIBX002486'
ORDER BY piv.date DESC, piv.created_at DESC;
