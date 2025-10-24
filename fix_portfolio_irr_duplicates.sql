-- Fix Portfolio IRR Duplicate Issues
-- FOCUSED FIX: Only portfolio_irr_values, not portfolio_fund_irr_values

-- Step 1: Find duplicate PORTFOLIO IRR records (product-level aggregates)
SELECT
    portfolio_id,
    date,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at DESC) as irr_ids,
    ARRAY_AGG(irr_result ORDER BY created_at DESC) as irr_values,
    ARRAY_AGG(created_at ORDER BY created_at DESC) as created_dates
FROM portfolio_irr_values
GROUP BY portfolio_id, date
HAVING COUNT(*) > 1
ORDER BY date DESC, portfolio_id;

-- Step 2: Show which products are affected
SELECT
    cp.id as product_id,
    cp.product_name,
    cp.plan_number,
    piv.date,
    COUNT(*) as duplicate_count
FROM portfolio_irr_values piv
JOIN portfolios p ON piv.portfolio_id = p.id
JOIN client_products cp ON p.id = cp.portfolio_id
GROUP BY cp.id, cp.product_name, cp.plan_number, piv.date
HAVING COUNT(*) > 1
ORDER BY piv.date DESC;

-- Step 3: Delete duplicate portfolio IRRs, keeping only the most recent
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

-- Step 4: Delete orphaned portfolio IRR records where valuation no longer exists
DELETE FROM portfolio_irr_values piv
WHERE piv.portfolio_valuation_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM portfolio_valuations pv
      WHERE pv.id = piv.portfolio_valuation_id
  );

-- Step 5: Delete portfolio IRRs for dates without corresponding portfolio valuations
DELETE FROM portfolio_irr_values piv
WHERE NOT EXISTS (
    SELECT 1
    FROM portfolio_valuations pv
    WHERE pv.portfolio_id = piv.portfolio_id
      AND pv.valuation_date::date = piv.date
);

-- Step 6: Add UNIQUE constraint to prevent future portfolio IRR duplicates
ALTER TABLE portfolio_irr_values
ADD CONSTRAINT unique_portfolio_date_irr
UNIQUE (portfolio_id, date);

-- Step 7: Verify no duplicates remain
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

-- Step 8: Display statistics
SELECT
    'Portfolio IRR Statistics' as info,
    COUNT(*) as total_records,
    COUNT(DISTINCT portfolio_id) as unique_portfolios,
    COUNT(DISTINCT date) as unique_dates,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM portfolio_irr_values;
