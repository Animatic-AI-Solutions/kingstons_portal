-- Test Migration Script for Special Relationships Table
-- This script tests that the special_relationships migration can be applied successfully
-- Run this in a test database environment only!

-- ===================================================================
-- STEP 1: Apply the migration - Create special_relationships table
-- ===================================================================
SELECT 'STEP 1: Creating special_relationships table' AS test_step;

CREATE TABLE IF NOT EXISTS special_relationships (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    type TEXT,
    dob DATE,
    name TEXT,
    age INTEGER,
    dependency BOOLEAN DEFAULT false,
    address_id BIGINT,
    status TEXT DEFAULT 'active',
    email TEXT,
    phone TEXT,
    relationship TEXT,
    notes TEXT,

    CONSTRAINT fk_special_relationships_address
        FOREIGN KEY (address_id)
        REFERENCES addresses(id)
        ON DELETE SET NULL
);


-- ===================================================================
-- STEP 2: Create junction table
-- ===================================================================
SELECT 'STEP 2: Creating product_owner_special_relationships junction table' AS test_step;

CREATE TABLE IF NOT EXISTS product_owner_special_relationships (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT NOT NULL,
    special_relationship_id BIGINT NOT NULL,

    CONSTRAINT fk_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_special_relationship
        FOREIGN KEY (special_relationship_id)
        REFERENCES special_relationships(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_product_owner_special_relationship
        UNIQUE (product_owner_id, special_relationship_id)
);

CREATE INDEX IF NOT EXISTS idx_special_relationships_type ON special_relationships(type);
CREATE INDEX IF NOT EXISTS idx_special_relationships_name ON special_relationships(name);
CREATE INDEX IF NOT EXISTS idx_special_relationships_address_id ON special_relationships(address_id);
CREATE INDEX IF NOT EXISTS idx_special_relationships_status ON special_relationships(status);
CREATE INDEX IF NOT EXISTS idx_product_owner_special_relationships_product_owner_id ON product_owner_special_relationships(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_product_owner_special_relationships_special_relationship_id ON product_owner_special_relationships(special_relationship_id);


-- ===================================================================
-- STEP 3: Verify special_relationships table structure
-- ===================================================================
SELECT 'STEP 3: Verifying special_relationships table structure' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'special_relationships'
ORDER BY ordinal_position;


-- ===================================================================
-- STEP 4: Verify junction table structure
-- ===================================================================
SELECT 'STEP 4: Verifying junction table structure' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_owner_special_relationships'
ORDER BY ordinal_position;


-- ===================================================================
-- STEP 5: Verify foreign key constraints
-- ===================================================================
SELECT 'STEP 5: Verifying foreign key constraints' AS test_step;

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
AND tc.table_name IN ('special_relationships', 'product_owner_special_relationships')
ORDER BY tc.table_name;


-- ===================================================================
-- STEP 6: Test inserting a special relationship with address
-- ===================================================================
SELECT 'STEP 6: Testing special relationship insertion with address' AS test_step;

-- Insert test address
WITH test_address AS (
    INSERT INTO addresses (line_1, line_2, line_5)
    VALUES ('789 Relationship Lane', 'Flat 3', 'REL 1AT')
    RETURNING id
)
-- Insert special relationship
INSERT INTO special_relationships (
    type,
    dob,
    name,
    age,
    dependency,
    address_id,
    email,
    phone,
    relationship,
    notes
)
SELECT
    'personal',
    '1995-03-20',
    'Test Dependent',
    29,
    true,
    id,
    'test@email.com',
    '+44 7777 888999',
    'Daughter',
    'Test relationship record'
FROM test_address
RETURNING id, name, type, relationship, dependency;


-- ===================================================================
-- STEP 7: Test linking special relationship to product owner
-- ===================================================================
SELECT 'STEP 7: Testing many-to-many relationship' AS test_step;

-- Create test product owner
WITH test_product_owner AS (
    INSERT INTO product_owners (firstname, surname)
    VALUES ('TestRelationship', 'Owner')
    RETURNING id
),
test_special_rel AS (
    SELECT id FROM special_relationships WHERE name = 'Test Dependent' LIMIT 1
)
-- Link them in junction table
INSERT INTO product_owner_special_relationships (
    product_owner_id,
    special_relationship_id
)
SELECT po.id, sr.id
FROM test_product_owner po, test_special_rel sr
RETURNING id, product_owner_id, special_relationship_id;


-- ===================================================================
-- STEP 8: Test JOIN query across all three tables
-- ===================================================================
SELECT 'STEP 8: Testing JOIN query to retrieve product owner with special relationships' AS test_step;

SELECT
    po.firstname,
    po.surname,
    sr.name AS relationship_name,
    sr.type AS relationship_type,
    sr.relationship,
    sr.dependency,
    a.line_1 AS address_line_1
FROM product_owners po
JOIN product_owner_special_relationships posr ON po.id = posr.product_owner_id
JOIN special_relationships sr ON posr.special_relationship_id = sr.id
LEFT JOIN addresses a ON sr.address_id = a.id
WHERE po.firstname = 'TestRelationship';


-- ===================================================================
-- STEP 9: Test unique constraint on junction table
-- ===================================================================
SELECT 'STEP 9: Testing unique constraint (should fail gracefully)' AS test_step;

-- This should fail due to unique constraint
DO $$
BEGIN
    INSERT INTO product_owner_special_relationships (
        product_owner_id,
        special_relationship_id
    )
    SELECT
        po.id,
        sr.id
    FROM product_owners po, special_relationships sr
    WHERE po.firstname = 'TestRelationship'
    AND sr.name = 'Test Dependent'
    LIMIT 1;

    RAISE NOTICE 'ERROR: Unique constraint did not work!';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'SUCCESS: Unique constraint working correctly';
END $$;


-- ===================================================================
-- STEP 10: Test ON DELETE CASCADE behavior
-- ===================================================================
SELECT 'STEP 10: Testing ON DELETE CASCADE' AS test_step;

-- Get count before deletion
SELECT COUNT(*) AS junction_records_before_delete
FROM product_owner_special_relationships;

-- Delete the special relationship (should cascade to junction table)
DELETE FROM special_relationships WHERE name = 'Test Dependent';

-- Check junction table is empty now
SELECT COUNT(*) AS junction_records_after_delete
FROM product_owner_special_relationships;


-- ===================================================================
-- STEP 11: Clean up test records
-- ===================================================================
SELECT 'STEP 11: Cleaning up test records' AS test_step;

DELETE FROM product_owners WHERE firstname = 'TestRelationship';
DELETE FROM addresses WHERE line_1 LIKE '%Relationship Lane%';


-- ===================================================================
-- STEP 12: Verify indexes were created
-- ===================================================================
SELECT 'STEP 12: Verifying indexes' AS test_step;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('special_relationships', 'product_owner_special_relationships')
ORDER BY tablename, indexname;


-- ===================================================================
-- Migration test completed successfully
-- ===================================================================
SELECT 'Special relationships migration test completed successfully!' AS test_result;
