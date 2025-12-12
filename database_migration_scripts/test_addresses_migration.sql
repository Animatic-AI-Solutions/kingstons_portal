-- Test Migration Script for Addresses Table
-- This script tests that the addresses migration can be applied successfully
-- Run this in a test database environment only!

-- ===================================================================
-- STEP 1: Show current product_owners structure (check for address_id)
-- ===================================================================
SELECT 'STEP 1: Checking current product_owners structure' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_owners'
AND column_name = 'address_id';


-- ===================================================================
-- STEP 2: Apply the migration - Create addresses table
-- ===================================================================
SELECT 'STEP 2: Creating addresses table' AS test_step;

CREATE TABLE IF NOT EXISTS addresses (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    line_1 TEXT,
    line_2 TEXT,
    line_3 TEXT,
    line_4 TEXT,
    line_5 TEXT
);


-- ===================================================================
-- STEP 3: Add foreign key to product_owners
-- ===================================================================
SELECT 'STEP 3: Adding address_id foreign key to product_owners' AS test_step;

ALTER TABLE product_owners
  ADD COLUMN address_id BIGINT;

ALTER TABLE product_owners
  ADD CONSTRAINT fk_product_owners_address
  FOREIGN KEY (address_id)
  REFERENCES addresses(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_owners_address_id ON product_owners(address_id);


-- ===================================================================
-- STEP 4: Verify addresses table was created
-- ===================================================================
SELECT 'STEP 4: Verifying addresses table structure' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'addresses'
ORDER BY ordinal_position;


-- ===================================================================
-- STEP 5: Verify foreign key was added to product_owners
-- ===================================================================
SELECT 'STEP 5: Verifying address_id column in product_owners' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_owners'
AND column_name = 'address_id';


-- ===================================================================
-- STEP 6: Verify foreign key constraint exists
-- ===================================================================
SELECT 'STEP 6: Verifying foreign key constraint' AS test_step;

SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'product_owners'
AND kcu.column_name = 'address_id';


-- ===================================================================
-- STEP 7: Test inserting an address
-- ===================================================================
SELECT 'STEP 7: Testing address insertion' AS test_step;

INSERT INTO addresses (
    line_1,
    line_2,
    line_3,
    line_4,
    line_5
) VALUES (
    '123 Test Street',
    'Apartment 4B',
    'Test District',
    'Test City',
    'TE5T 1NG'
) RETURNING id, line_1, line_2, line_5;


-- ===================================================================
-- STEP 8: Test linking address to product owner
-- ===================================================================
SELECT 'STEP 8: Testing product owner with address relationship' AS test_step;

-- Insert test product owner with address
WITH new_address AS (
    INSERT INTO addresses (line_1, line_2, line_5)
    VALUES ('456 Demo Road', 'Suite 200', 'DM1 0ST')
    RETURNING id
)
INSERT INTO product_owners (
    firstname,
    surname,
    address_id
)
SELECT
    'AddressTest',
    'User',
    id
FROM new_address
RETURNING id, firstname, surname, address_id;


-- ===================================================================
-- STEP 9: Test JOIN query between product_owners and addresses
-- ===================================================================
SELECT 'STEP 9: Testing JOIN query to retrieve product owner with address' AS test_step;

SELECT
    po.id,
    po.firstname,
    po.surname,
    a.line_1,
    a.line_2,
    a.line_5
FROM product_owners po
LEFT JOIN addresses a ON po.address_id = a.id
WHERE po.firstname = 'AddressTest';


-- ===================================================================
-- STEP 10: Test ON DELETE SET NULL behavior
-- ===================================================================
SELECT 'STEP 10: Testing ON DELETE SET NULL constraint' AS test_step;

-- Get the address_id to delete
WITH test_address AS (
    SELECT a.id
    FROM product_owners po
    JOIN addresses a ON po.address_id = a.id
    WHERE po.firstname = 'AddressTest'
    LIMIT 1
)
DELETE FROM addresses
WHERE id IN (SELECT id FROM test_address);

-- Verify address_id was set to NULL
SELECT
    id,
    firstname,
    surname,
    address_id
FROM product_owners
WHERE firstname = 'AddressTest';


-- ===================================================================
-- STEP 11: Clean up test records
-- ===================================================================
SELECT 'STEP 11: Cleaning up test records' AS test_step;

DELETE FROM product_owners WHERE firstname = 'AddressTest';
DELETE FROM addresses WHERE line_1 LIKE '%Test%' OR line_1 LIKE '%Demo%';


-- ===================================================================
-- STEP 12: Verify indexes were created
-- ===================================================================
SELECT 'STEP 12: Verifying indexes' AS test_step;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('addresses', 'product_owners')
AND (indexname LIKE 'idx_product_owners_address%' OR indexname LIKE '%pkey%')
ORDER BY tablename, indexname;


-- ===================================================================
-- Migration test completed successfully
-- ===================================================================
SELECT 'Addresses migration test completed successfully!' AS test_result;
