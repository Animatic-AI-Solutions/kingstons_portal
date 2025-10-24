-- Fix IRR Duplicate Issues - Part 1: Database Cleanup and Constraints
-- Run this BEFORE applying code changes

-- Step 1: Find and display duplicate IRR records
SELECT
    fund_id,
    date,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id) as irr_ids,
    ARRAY_AGG(irr_result) as irr_values,
    ARRAY_AGG(created_at ORDER BY created_at DESC) as created_dates
FROM portfolio_fund_irr_values
GROUP BY fund_id, date
HAVING COUNT(*) > 1
ORDER BY date DESC, fund_id;

-- Step 2: Delete duplicate IRRs, keeping only the most recent one for each (fund_id, date)
-- This uses a CTE to identify which records to keep vs delete
WITH ranked_irrs AS (
    SELECT
        id,
        fund_id,
        date,
        irr_result,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY fund_id, date
            ORDER BY created_at DESC, id DESC
        ) as rn
    FROM portfolio_fund_irr_values
),
duplicates_to_delete AS (
    SELECT id, fund_id, date, irr_result, created_at
    FROM ranked_irrs
    WHERE rn > 1  -- Keep rn=1 (most recent), delete rn>1 (older duplicates)
)
DELETE FROM portfolio_fund_irr_values
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Step 3: Display how many duplicates were removed
SELECT
    'Duplicates removed' as status,
    COUNT(*) as records_deleted
FROM (
    SELECT fund_id, date
    FROM portfolio_fund_irr_values
    GROUP BY fund_id, date
    HAVING COUNT(*) > 1
) duplicates;

-- Step 4: Delete orphaned IRR records where the corresponding valuation no longer exists
-- These are stale IRRs that should have been deleted when valuations were removed
DELETE FROM portfolio_fund_irr_values pfv
WHERE pfv.fund_valuation_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM portfolio_fund_valuations pf_val
      WHERE pf_val.id = pfv.fund_valuation_id
  );

-- Step 5: Delete IRRs for dates that don't have corresponding valuations
-- (e.g., May 2025 IRRs when there are no May 2025 valuations)
DELETE FROM portfolio_fund_irr_values pfv
WHERE NOT EXISTS (
    SELECT 1
    FROM portfolio_fund_valuations pf_val
    WHERE pf_val.portfolio_fund_id = pfv.fund_id
      AND pf_val.valuation_date::date = pfv.date
);

-- Step 6: Add UNIQUE constraint to prevent future duplicates
-- This ensures only one IRR record can exist per (fund_id, date) combination
ALTER TABLE portfolio_fund_irr_values
ADD CONSTRAINT unique_fund_date_irr
UNIQUE (fund_id, date);

-- Step 7: Verify no duplicates remain
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✅ SUCCESS: No duplicate IRR records found'
        ELSE '❌ ERROR: Duplicates still exist - run Step 2 again'
    END as validation_result,
    COUNT(*) as remaining_duplicates
FROM (
    SELECT fund_id, date
    FROM portfolio_fund_irr_values
    GROUP BY fund_id, date
    HAVING COUNT(*) > 1
) remaining_dups;

-- Step 8: Display final statistics
SELECT
    COUNT(*) as total_irr_records,
    COUNT(DISTINCT fund_id) as unique_funds,
    COUNT(DISTINCT date) as unique_dates,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM portfolio_fund_irr_values;
