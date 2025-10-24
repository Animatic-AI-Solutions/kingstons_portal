-- MINIMAL CLEANUP: Only delete duplicates (keep most recent) to add UNIQUE constraint
-- ⚠️ This is the safest approach - only removes what's absolutely necessary
-- ✅ Creates backup table before deletion
-- ✅ Keeps most recent IRR for each (portfolio_id, date)
-- ✅ Skips orphaned and stale IRRs (preserves all data)

-- ========================================
-- STEP 1: Create backup table
-- ========================================

SELECT '=== CREATING BACKUP TABLE ===' as info;

-- Create backup table for duplicates we're about to delete
CREATE TABLE IF NOT EXISTS portfolio_irr_values_deleted_duplicates_backup (
    id BIGINT,
    portfolio_id BIGINT,
    irr_result NUMERIC(8, 4),
    date DATE,
    portfolio_valuation_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP DEFAULT NOW(),
    reason TEXT
);

SELECT 'Backup table created' as status;

-- ========================================
-- STEP 2: Backup duplicates before deletion
-- ========================================

SELECT '=== BACKING UP DUPLICATES ===' as info;

WITH ranked_irrs AS (
    SELECT
        piv.*,
        ROW_NUMBER() OVER (
            PARTITION BY piv.portfolio_id, piv.date
            ORDER BY piv.created_at DESC, piv.id DESC
        ) as rn
    FROM portfolio_irr_values piv
)
INSERT INTO portfolio_irr_values_deleted_duplicates_backup
    (id, portfolio_id, irr_result, date, portfolio_valuation_id, created_at, reason)
SELECT
    id,
    portfolio_id,
    irr_result,
    date,
    portfolio_valuation_id,
    created_at,
    'Duplicate - older than most recent for this portfolio/date'
FROM ranked_irrs
WHERE rn > 1;

-- Report backup count
SELECT
    'Backed up duplicates:' as status,
    COUNT(*) as backup_count
FROM portfolio_irr_values_deleted_duplicates_backup;

-- ========================================
-- STEP 3: Delete duplicate portfolio IRRs (keep most recent)
-- ========================================

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
    'Step 3 Complete: Deleted duplicate IRRs' as status,
    COUNT(*) as remaining_duplicates
FROM (
    SELECT portfolio_id, date
    FROM portfolio_irr_values
    GROUP BY portfolio_id, date
    HAVING COUNT(*) > 1
) check_duplicates;

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

-- Show backup table stats
SELECT
    'Backup table contains:' as info,
    COUNT(*) as deleted_duplicates_count
FROM portfolio_irr_values_deleted_duplicates_backup;

SELECT '✅ MINIMAL CLEANUP COMPLETE' as status;
SELECT '📋 Orphaned and stale IRRs were NOT deleted (preserved for safety)' as note;
SELECT '💾 Deleted duplicates backed up in portfolio_irr_values_deleted_duplicates_backup' as backup_info;
