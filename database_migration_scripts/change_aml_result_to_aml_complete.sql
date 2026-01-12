-- Migration: Change aml_result (text) to aml_complete (boolean)
-- Purpose: Convert AML compliance tracking from string-based to boolean flag
-- Date: 2026-01-12
-- Author: Claude Code

-- ============================================================================
-- PRE-MIGRATION CHECKS
-- ============================================================================

-- Check current state of aml_result column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_owners' AND column_name = 'aml_result';

-- View existing data (for backup verification)
SELECT id, firstname, surname, aml_result, aml_date
FROM product_owners
WHERE aml_result IS NOT NULL
LIMIT 10;

-- ============================================================================
-- MIGRATION
-- ============================================================================

-- Step 1: Add new aml_complete column as boolean
ALTER TABLE product_owners
ADD COLUMN IF NOT EXISTS aml_complete BOOLEAN DEFAULT false;

-- Step 2: Migrate existing data from aml_result to aml_complete
-- 'Pass' -> true, anything else -> false
UPDATE product_owners
SET aml_complete = CASE
    WHEN aml_result = 'Pass' THEN true
    ELSE false
END;

-- Step 3: Drop the old aml_result column
ALTER TABLE product_owners
DROP COLUMN IF EXISTS aml_result;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Verify the new column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'product_owners' AND column_name = 'aml_complete';

-- Verify data migration
SELECT id, firstname, surname, aml_complete, aml_date
FROM product_owners
WHERE aml_complete IS NOT NULL
LIMIT 10;

-- Count of records by aml_complete status
SELECT aml_complete, COUNT(*) as count
FROM product_owners
GROUP BY aml_complete;
