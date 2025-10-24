-- PREVIEW: Portfolio IRR Cleanup - Shows EVERY row that will be deleted (no changes made)
-- Run this first to see exactly what will be deleted before running the actual cleanup

-- ========================================
-- PART 1: DUPLICATE IRRs TO DELETE
-- ========================================
SELECT
    '========================================' as divider,
    'PART 1: DUPLICATE PORTFOLIO IRRs TO DELETE' as section,
    '(Keeping most recent, deleting older duplicates)' as note,
    '========================================' as divider2;

-- Show every duplicate IRR that will be deleted
WITH ranked AS (
    SELECT
        piv.id,
        piv.portfolio_id,
        p.id as portfolio_table_id,
        cp.id as product_id,
        cp.product_name,
        cp.plan_number,
        piv.date,
        piv.irr_result,
        piv.created_at,
        piv.portfolio_valuation_id,
        ROW_NUMBER() OVER (PARTITION BY piv.portfolio_id, piv.date ORDER BY piv.created_at DESC, piv.id DESC) as rn
    FROM portfolio_irr_values piv
    JOIN portfolios p ON piv.portfolio_id = p.id
    JOIN client_products cp ON p.id = cp.portfolio_id
)
SELECT
    id as irr_id_to_delete,
    product_id,
    product_name,
    plan_number,
    date as irr_date,
    irr_result as irr_percentage,
    created_at,
    portfolio_valuation_id,
    '❌ DELETE - Older duplicate' as reason
FROM ranked
WHERE rn > 1  -- These are the older duplicates that will be deleted
ORDER BY date DESC, product_name, created_at DESC;

-- Count of duplicates to delete
SELECT
    'TOTAL DUPLICATE IRRs TO DELETE:' as summary,
    COUNT(*) as count
FROM (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY portfolio_id, date ORDER BY created_at DESC, id DESC) as rn
    FROM portfolio_irr_values
) ranked
WHERE rn > 1;

-- ========================================
-- PART 2: ORPHANED IRRs TO DELETE
-- ========================================
SELECT
    '' as blank_line;

SELECT
    '========================================' as divider,
    'PART 2: ORPHANED PORTFOLIO IRRs TO DELETE' as section,
    '(portfolio_valuation_id references deleted valuation)' as note,
    '========================================' as divider2;

-- Show every orphaned IRR that will be deleted
SELECT
    piv.id as irr_id_to_delete,
    cp.id as product_id,
    cp.product_name,
    cp.plan_number,
    piv.date as irr_date,
    piv.irr_result as irr_percentage,
    piv.created_at,
    piv.portfolio_valuation_id as missing_valuation_id,
    '❌ DELETE - Valuation no longer exists' as reason
FROM portfolio_irr_values piv
JOIN portfolios p ON piv.portfolio_id = p.id
JOIN client_products cp ON p.id = cp.portfolio_id
WHERE piv.portfolio_valuation_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM portfolio_valuations pv
      WHERE pv.id = piv.portfolio_valuation_id
  )
ORDER BY piv.date DESC, cp.plan_number;

-- Count of orphaned IRRs to delete
SELECT
    'TOTAL ORPHANED IRRs TO DELETE:' as summary,
    COUNT(*) as count
FROM portfolio_irr_values piv
WHERE piv.portfolio_valuation_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM portfolio_valuations pv
      WHERE pv.id = piv.portfolio_valuation_id
  );

-- ========================================
-- PART 3: STALE IRRs TO DELETE
-- ========================================
SELECT
    '' as blank_line;

SELECT
    '========================================' as divider,
    'PART 3: STALE PORTFOLIO IRRs TO DELETE' as section,
    '(No portfolio valuation exists for this date)' as note,
    '========================================' as divider2;

-- Show every stale IRR that will be deleted
SELECT
    piv.id as irr_id_to_delete,
    cp.id as product_id,
    cp.product_name,
    cp.plan_number,
    piv.date as irr_date,
    piv.irr_result as irr_percentage,
    piv.created_at,
    piv.portfolio_valuation_id,
    '❌ DELETE - No valuation exists for this date' as reason
FROM portfolio_irr_values piv
JOIN portfolios p ON piv.portfolio_id = p.id
JOIN client_products cp ON p.id = cp.portfolio_id
WHERE NOT EXISTS (
    SELECT 1
    FROM portfolio_valuations pv
    WHERE pv.portfolio_id = piv.portfolio_id
      AND pv.valuation_date::date = piv.date
)
ORDER BY piv.date DESC, cp.plan_number;

-- Count of stale IRRs to delete
SELECT
    'TOTAL STALE IRRs TO DELETE:' as summary,
    COUNT(*) as count
FROM portfolio_irr_values piv
WHERE NOT EXISTS (
    SELECT 1
    FROM portfolio_valuations pv
    WHERE pv.portfolio_id = piv.portfolio_id
      AND pv.valuation_date::date = piv.date
);

-- ========================================
-- GRAND TOTAL
-- ========================================
SELECT
    '' as blank_line;

SELECT
    '========================================' as divider,
    'DELETION SUMMARY' as section,
    '========================================' as divider2;

SELECT
    'Duplicate IRRs (older duplicates)' as category,
    COUNT(*) as records_to_delete
FROM (
    SELECT id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY portfolio_id, date ORDER BY created_at DESC, id DESC) as rn
        FROM portfolio_irr_values
    ) ranked
    WHERE rn > 1
) duplicates

UNION ALL

SELECT
    'Orphaned IRRs (valuation missing)' as category,
    COUNT(*) as records_to_delete
FROM portfolio_irr_values piv
WHERE piv.portfolio_valuation_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM portfolio_valuations pv
      WHERE pv.id = piv.portfolio_valuation_id
  )

UNION ALL

SELECT
    'Stale IRRs (no valuation for date)' as category,
    COUNT(*) as records_to_delete
FROM portfolio_irr_values piv
WHERE NOT EXISTS (
    SELECT 1
    FROM portfolio_valuations pv
    WHERE pv.portfolio_id = piv.portfolio_id
      AND pv.valuation_date::date = piv.date
);

-- Grand total
SELECT
    '===================' as divider,
    'GRAND TOTAL TO DELETE' as summary,
    (
        SELECT COUNT(*) FROM (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY portfolio_id, date ORDER BY created_at DESC, id DESC) as rn
                FROM portfolio_irr_values
            ) ranked WHERE rn > 1
        ) dup
    ) +
    (
        SELECT COUNT(*) FROM portfolio_irr_values piv
        WHERE piv.portfolio_valuation_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM portfolio_valuations pv WHERE pv.id = piv.portfolio_valuation_id)
    ) +
    (
        SELECT COUNT(*) FROM portfolio_irr_values piv
        WHERE NOT EXISTS (
            SELECT 1 FROM portfolio_valuations pv
            WHERE pv.portfolio_id = piv.portfolio_id AND pv.valuation_date::date = piv.date
        )
    ) as total_irrs_to_delete;

-- ========================================
-- CURRENT STATE
-- ========================================
SELECT
    '' as blank_line;

SELECT
    '========================================' as divider,
    'CURRENT STATE (before cleanup)' as section,
    '========================================' as divider2;

SELECT
    COUNT(*) as total_portfolio_irr_records,
    COUNT(DISTINCT portfolio_id) as unique_portfolios,
    COUNT(DISTINCT date) as unique_dates,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM portfolio_irr_values;
