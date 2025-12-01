-- Test Migration Script for Phase 2 Product Owners Fields
-- This script tests that the migration can be applied successfully
-- Run this in a test database environment only!

-- ===================================================================
-- STEP 1: Show current product_owners structure
-- ===================================================================
SELECT 'STEP 1: Current product_owners table structure' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_owners'
ORDER BY ordinal_position;


-- ===================================================================
-- STEP 2: Apply the migration
-- ===================================================================
SELECT 'STEP 2: Applying Phase 2 migration - Adding new columns' AS test_step;

ALTER TABLE product_owners
  ADD COLUMN gender TEXT,
  ADD COLUMN previous_names TEXT,
  ADD COLUMN dob DATE,
  ADD COLUMN age INTEGER,
  ADD COLUMN place_of_birth TEXT,
  ADD COLUMN email_1 TEXT,
  ADD COLUMN email_2 TEXT,
  ADD COLUMN phone_1 TEXT,
  ADD COLUMN phone_2 TEXT,
  ADD COLUMN moved_in_date DATE,
  ADD COLUMN three_words TEXT,
  ADD COLUMN share_data_with TEXT,
  ADD COLUMN employment_status TEXT,
  ADD COLUMN occupation TEXT,
  ADD COLUMN passport_expiry_date DATE,
  ADD COLUMN ni_number TEXT,
  ADD COLUMN aml_result TEXT,
  ADD COLUMN aml_date DATE;

CREATE INDEX IF NOT EXISTS idx_product_owners_email_1 ON product_owners(email_1);
CREATE INDEX IF NOT EXISTS idx_product_owners_email_2 ON product_owners(email_2);
CREATE INDEX IF NOT EXISTS idx_product_owners_dob ON product_owners(dob);
CREATE INDEX IF NOT EXISTS idx_product_owners_aml_date ON product_owners(aml_date);
CREATE INDEX IF NOT EXISTS idx_product_owners_aml_result ON product_owners(aml_result);


-- ===================================================================
-- STEP 3: Verify new columns exist
-- ===================================================================
SELECT 'STEP 3: Verifying new columns were added' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_owners'
AND column_name IN (
    'gender', 'previous_names', 'dob', 'age', 'place_of_birth',
    'email_1', 'email_2', 'phone_1', 'phone_2',
    'moved_in_date', 'three_words', 'share_data_with',
    'employment_status', 'occupation',
    'passport_expiry_date', 'ni_number', 'aml_result', 'aml_date'
)
ORDER BY column_name;


-- ===================================================================
-- STEP 4: Verify indexes were created
-- ===================================================================
SELECT 'STEP 4: Verifying indexes were created' AS test_step;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'product_owners'
AND indexname LIKE 'idx_product_owners_%';


-- ===================================================================
-- STEP 5: Test inserting data with new fields
-- ===================================================================
SELECT 'STEP 5: Testing data insertion with new fields' AS test_step;
INSERT INTO product_owners (
    firstname,
    surname,
    known_as,
    gender,
    dob,
    email_1,
    phone_1,
    employment_status,
    occupation,
    aml_result,
    aml_date
) VALUES (
    'Test',
    'User',
    'Tester',
    'Non-binary',
    '1990-01-15',
    'test.user@example.com',
    '+44 1234 567890',
    'Employed',
    'Software Developer',
    'Pass',
    CURRENT_DATE
) RETURNING id, firstname, surname, email_1, aml_result;


-- ===================================================================
-- STEP 6: Query the test record
-- ===================================================================
SELECT 'STEP 6: Querying test record to verify data' AS test_step;

SELECT
    id,
    firstname,
    surname,
    gender,
    dob,
    email_1,
    employment_status,
    aml_result
FROM product_owners
WHERE firstname = 'Test' AND surname = 'User';


-- ===================================================================
-- STEP 7: Clean up test record
-- ===================================================================
SELECT 'STEP 7: Cleaning up test record' AS test_step;

DELETE FROM product_owners WHERE firstname = 'Test' AND surname = 'User';


-- ===================================================================
-- Migration test completed successfully
-- ===================================================================
SELECT 'Migration test completed successfully!' AS test_result;
