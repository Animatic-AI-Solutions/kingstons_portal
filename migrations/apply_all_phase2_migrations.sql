-- Apply All Phase 2 Migrations
-- Description: Applies all Phase 2 database migrations in correct order
-- Date: 2024-12-01
-- Author: Claude Code
-- WARNING: Always backup your database before running migrations!

-- ===================================================================
-- MIGRATION 1: Add Phase 2 fields to product_owners
-- ===================================================================
SELECT 'Applying Migration 1: Adding Phase 2 fields to product_owners...' AS status;

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

SELECT 'Migration 1 completed successfully!' AS status;


-- ===================================================================
-- MIGRATION 2: Create addresses table and add foreign key
-- ===================================================================
SELECT 'Applying Migration 2: Creating addresses table...' AS status;

CREATE TABLE IF NOT EXISTS addresses (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    line_1 TEXT,
    line_2 TEXT,
    line_3 TEXT,
    line_4 TEXT,
    line_5 TEXT
);

ALTER TABLE product_owners
  ADD COLUMN address_id BIGINT;

ALTER TABLE product_owners
  ADD CONSTRAINT fk_product_owners_address
  FOREIGN KEY (address_id)
  REFERENCES addresses(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_owners_address_id ON product_owners(address_id);

SELECT 'Migration 2 completed successfully!' AS status;


-- ===================================================================
-- Verification
-- ===================================================================
SELECT 'Verifying all migrations...' AS status;

-- Count new columns in product_owners
SELECT
    'product_owners table' AS table_name,
    COUNT(*) AS new_columns_added
FROM information_schema.columns
WHERE table_name = 'product_owners'
AND column_name IN (
    'gender', 'previous_names', 'dob', 'age', 'place_of_birth',
    'email_1', 'email_2', 'phone_1', 'phone_2',
    'moved_in_date', 'three_words', 'share_data_with',
    'employment_status', 'occupation',
    'passport_expiry_date', 'ni_number', 'aml_result', 'aml_date',
    'address_id'
);

-- Verify addresses table exists
SELECT
    'addresses table' AS table_name,
    COUNT(*) AS columns_count
FROM information_schema.columns
WHERE table_name = 'addresses';

-- Verify indexes
SELECT
    'indexes' AS object_type,
    COUNT(*) AS indexes_created
FROM pg_indexes
WHERE tablename IN ('product_owners', 'addresses')
AND (indexname LIKE 'idx_product_owners_%' OR indexname LIKE 'addresses_pkey');

-- Verify foreign key constraint
SELECT
    'foreign keys' AS object_type,
    COUNT(*) AS constraints_created
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_name = 'product_owners'
AND constraint_name = 'fk_product_owners_address';


-- ===================================================================
-- All Phase 2 migrations completed successfully!
-- ===================================================================
SELECT '✓ All Phase 2 migrations completed successfully!' AS final_status;
