-- EXECUTE: Portfolio IRR Cleanup - Actually performs deletions
-- ⚠️ WARNING: This script makes permanent changes to the database
-- ⚠️ Run preview_portfolio_irr_cleanup.sql FIRST to see what will be deleted

-- ========================================
-- STEP 1: Delete duplicate portfolio IRRs (keep most recent)
-- ========================================

-- Show what we're about to delete
SELECT '=== DELETING DUPLICATE PORTFOLIO IRRs ===' as info;

WITH ranked_irrs AS (
    SELECT
        id,
        portfolio_id,
        date,
        irr_result,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY portfolio_id, date
            ORDER BY created_at DESC, id DESC
        ) as rn
    FROM portfolio_irr_values
),
duplicates_to_delete AS (
    SELECT id, portfolio_id, date, irr_result, created_at
    FROM ranked_irrs
    WHERE rn > 1  -- Keep rn=1 (most recent), delete rn>1 (older duplicates)
)
DELETE FROM portfolio_irr_values
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Report how many were deleted
SELECT
    'Step 1 Complete: Deleted duplicate IRRs' as status,
    COUNT(*) as remaining_duplicates
FROM (
    SELECT portfolio_id, date
    FROM portfolio_irr_values
    GROUP BY portfolio_id, date
    HAVING COUNT(*) > 1
) check_duplicates;

-- ========================================
-- STEP 2: Delete orphaned portfolio IRR records
-- ========================================

SELECT '=== DELETING ORPHANED PORTFOLIO IRRs ===' as info;

DELETE FROM portfolio_irr_values piv
WHERE piv.portfolio_valuation_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM portfolio_valuations pv
      WHERE pv.id = piv.portfolio_valuation_id
  );

-- Report how many were deleted
SELECT 'Step 2 Complete: Deleted orphaned IRRs' as status;

-- ========================================
-- STEP 3: Delete stale portfolio IRRs (no valuation for date)
-- ========================================

SELECT '=== DELETING STALE PORTFOLIO IRRs ===' as info;

DELETE FROM portfolio_irr_values piv
WHERE NOT EXISTS (
    SELECT 1
    FROM portfolio_valuations pv
    WHERE pv.portfolio_id = piv.portfolio_id
      AND pv.valuation_date::date = piv.date
);

-- Report how many were deleted
SELECT 'Step 3 Complete: Deleted stale IRRs' as status;

-- ========================================
-- STEP 4: Add UNIQUE constraint
-- ========================================

SELECT '=== ADDING UNIQUE CONSTRAINT ===' as info;

ALTER TABLE portfolio_irr_values
ADD CONSTRAINT unique_portfolio_date_irr
UNIQUE (portfolio_id, date);

SELECT 'Step 4 Complete: Added UNIQUE constraint' as status;

-- ========================================
-- VERIFICATION: Check cleanup results
-- ========================================

SELECT '=== VERIFICATION ===' as info;

-- Check for remaining duplicates
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✅ SUCCESS: No duplicate portfolio IRR records found'
        ELSE '❌ ERROR: Duplicates still exist - investigate further'
    END as validation_result,
    COUNT(*) as remaining_duplicates
FROM (
    SELECT portfolio_id, date
    FROM portfolio_irr_values
    GROUP BY portfolio_id, date
    HAVING COUNT(*) > 1
) remaining_dups;

-- ========================================
-- FINAL STATS: After cleanup
-- ========================================

SELECT '=== FINAL STATE (after cleanup) ===' as info;

SELECT
    COUNT(*) as total_portfolio_irr_records,
    COUNT(DISTINCT portfolio_id) as unique_portfolios,
    COUNT(DISTINCT date) as unique_dates,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM portfolio_irr_values;

SELECT '✅ CLEANUP COMPLETE' as status;
