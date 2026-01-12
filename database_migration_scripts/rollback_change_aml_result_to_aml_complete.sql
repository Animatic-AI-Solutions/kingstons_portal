-- Rollback: Revert aml_complete (boolean) back to aml_result (text)
-- Purpose: Undo the AML field type change if needed
-- Date: 2026-01-12
-- Author: Claude Code

-- ============================================================================
-- ROLLBACK
-- ============================================================================

-- Step 1: Add back the old aml_result column
ALTER TABLE product_owners
ADD COLUMN IF NOT EXISTS aml_result VARCHAR(50);

-- Step 2: Migrate data back from aml_complete to aml_result
-- true -> 'Pass', false/null -> NULL
UPDATE product_owners
SET aml_result = CASE
    WHEN aml_complete = true THEN 'Pass'
    ELSE NULL
END;

-- Step 3: Drop the aml_complete column
ALTER TABLE product_owners
DROP COLUMN IF EXISTS aml_complete;

-- ============================================================================
-- POST-ROLLBACK VERIFICATION
-- ============================================================================

-- Verify the old column is restored
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_owners' AND column_name = 'aml_result';

-- Verify data rollback
SELECT id, firstname, surname, aml_result, aml_date
FROM product_owners
WHERE aml_result IS NOT NULL
LIMIT 10;
