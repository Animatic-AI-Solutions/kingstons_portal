-- PREVIEW MINIMAL: Shows ONLY duplicate IRRs that will be deleted
-- Run this first to see what duplicates will be removed
-- ✅ Only shows duplicates (keeps most recent for each portfolio/date)
-- ✅ Does NOT show orphaned or stale IRRs (those will be preserved)

-- ========================================
-- DUPLICATE IRRs TO DELETE
-- ========================================
SELECT
    '========================================' as divider,
    'DUPLICATE PORTFOLIO IRRs TO DELETE' as section,
    '(Keeping most recent, deleting older duplicates)' as note,
    '========================================' as divider2;

-- Show every duplicate IRR that will be deleted
WITH ranked AS (
    SELECT
        piv.id,
        piv.portfolio_id,
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
    '' as blank_line;

SELECT
    '========================================' as divider,
    'SUMMARY' as section,
    '========================================' as divider2;

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

-- Show which ones we're KEEPING (most recent)
SELECT
    '' as blank_line;

SELECT
    '========================================' as divider,
    'DUPLICATE IRRs TO KEEP (most recent)' as section,
    '========================================' as divider2;

WITH ranked AS (
    SELECT
        piv.id,
        piv.portfolio_id,
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
    id as irr_id_to_keep,
    product_id,
    product_name,
    plan_number,
    date as irr_date,
    irr_result as irr_percentage,
    created_at,
    portfolio_valuation_id,
    '✅ KEEP - Most recent' as reason
FROM ranked
WHERE rn = 1  -- These are the most recent that will be kept
  AND portfolio_id IN (
      -- Only show the ones where duplicates exist
      SELECT portfolio_id
      FROM (
          SELECT portfolio_id, date, COUNT(*) as dup_count
          FROM portfolio_irr_values
          GROUP BY portfolio_id, date
          HAVING COUNT(*) > 1
      ) dups
  )
ORDER BY date DESC, product_name;

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

-- Show count of portfolios with duplicates
SELECT
    'Portfolios with duplicate IRRs:' as info,
    COUNT(DISTINCT portfolio_id) as portfolios_affected
FROM (
    SELECT portfolio_id, date
    FROM portfolio_irr_values
    GROUP BY portfolio_id, date
    HAVING COUNT(*) > 1
) duplicates;

SELECT
    '' as blank_line;

SELECT '📋 NOTE: Orphaned and stale IRRs will NOT be deleted (preserved for safety)' as important_note;
SELECT '💾 Deleted duplicates will be backed up before deletion' as backup_note;
