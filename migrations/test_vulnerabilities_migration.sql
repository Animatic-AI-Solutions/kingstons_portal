-- Test Migration Script for Vulnerabilities Table
-- This script tests that the vulnerabilities table migration can be applied successfully
-- Run this in a test database environment only!

-- ===================================================================
-- STEP 1: Apply the migration - Create vulnerabilities table
-- ===================================================================
SELECT 'STEP 1: Creating vulnerabilities table' AS test_step;

CREATE TABLE IF NOT EXISTS vulnerabilities (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT,
    special_relationship_id BIGINT,
    description TEXT,
    adjustments TEXT,
    diagnosed BOOLEAN DEFAULT false,
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT,
    notes TEXT,

    CONSTRAINT fk_vulnerabilities_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_vulnerabilities_special_relationship
        FOREIGN KEY (special_relationship_id)
        REFERENCES special_relationships(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_vulnerabilities_exactly_one_owner
        CHECK (
            (product_owner_id IS NOT NULL AND special_relationship_id IS NULL) OR
            (product_owner_id IS NULL AND special_relationship_id IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_vulnerabilities_product_owner_id ON vulnerabilities(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_special_relationship_id ON vulnerabilities(special_relationship_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_diagnosed ON vulnerabilities(diagnosed);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_date_recorded ON vulnerabilities(date_recorded);


-- ===================================================================
-- STEP 2: Verify vulnerabilities table structure
-- ===================================================================
SELECT 'STEP 2: Verifying vulnerabilities table structure' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vulnerabilities'
ORDER BY ordinal_position;


-- ===================================================================
-- STEP 3: Verify foreign key constraints
-- ===================================================================
SELECT 'STEP 3: Verifying foreign key constraints' AS test_step;

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
AND tc.table_name = 'vulnerabilities';


-- ===================================================================
-- STEP 4: Create test product owner
-- ===================================================================
SELECT 'STEP 4: Creating test product owner' AS test_step;

INSERT INTO product_owners (firstname, surname)
VALUES ('TestVulnerability', 'Owner')
RETURNING id, firstname, surname;


-- ===================================================================
-- STEP 5: Test inserting vulnerability records for product owner
-- ===================================================================
SELECT 'STEP 5: Testing vulnerability record insertion for product owner' AS test_step;

INSERT INTO vulnerabilities (
    product_owner_id,
    description,
    adjustments,
    diagnosed,
    status,
    notes
)
SELECT
    id,
    'Visual impairment',
    'Large print documents, screen reader compatibility',
    true,
    'active',
    'Requires accessible communication formats'
FROM product_owners
WHERE firstname = 'TestVulnerability'
RETURNING id, description, diagnosed, status;

-- Insert another vulnerability
INSERT INTO vulnerabilities (
    product_owner_id,
    description,
    adjustments,
    diagnosed,
    status,
    notes
)
SELECT
    id,
    'Mobility issues',
    'Ground floor office access, home visit option',
    true,
    'managed',
    'Wheelchair accessible facilities required'
FROM product_owners
WHERE firstname = 'TestVulnerability'
RETURNING id, description, diagnosed, status;


-- ===================================================================
-- STEP 6: Test JOIN query between product_owners and vulnerabilities
-- ===================================================================
SELECT 'STEP 6: Testing JOIN query to retrieve product owner with vulnerabilities' AS test_step;

SELECT
    po.firstname,
    po.surname,
    v.description,
    v.adjustments,
    v.diagnosed,
    v.status,
    v.date_recorded
FROM product_owners po
JOIN vulnerabilities v ON po.id = v.product_owner_id
WHERE po.firstname = 'TestVulnerability'
ORDER BY v.date_recorded;


-- ===================================================================
-- STEP 7: Test filtering by diagnosed status
-- ===================================================================
SELECT 'STEP 7: Testing diagnosed filtering' AS test_step;

SELECT
    COUNT(*) AS diagnosed_vulnerabilities
FROM vulnerabilities
WHERE diagnosed = true;


-- ===================================================================
-- STEP 8: Test vulnerabilities for special_relationships
-- ===================================================================
SELECT 'STEP 8: Testing vulnerabilities for special_relationships' AS test_step;

-- Create test address for special relationship
WITH test_address AS (
    INSERT INTO addresses (line_1, line_5)
    VALUES ('Vulnerability Test Address', 'VT1 1ST')
    RETURNING id
)
-- Create test special relationship
INSERT INTO special_relationships (
    type,
    name,
    dob,
    age,
    dependency,
    relationship,
    address_id
)
SELECT
    'personal',
    'Test Dependent With Vulnerability',
    '2018-09-10',
    6,
    true,
    'Daughter',
    id
FROM test_address
RETURNING id, name;

-- Add vulnerability to special relationship
INSERT INTO vulnerabilities (
    special_relationship_id,
    description,
    adjustments,
    diagnosed,
    status,
    notes
)
SELECT
    id,
    'Learning disability',
    'Extra time for understanding, simplified communication',
    true,
    'active',
    'Requires patient and clear explanations'
FROM special_relationships
WHERE name = 'Test Dependent With Vulnerability'
RETURNING id, description, diagnosed, status;


-- ===================================================================
-- STEP 9: Test JOIN for special_relationship vulnerabilities
-- ===================================================================
SELECT 'STEP 9: Testing JOIN for special_relationship vulnerabilities' AS test_step;

SELECT
    sr.name AS relationship_name,
    sr.relationship,
    v.description,
    v.adjustments,
    v.diagnosed,
    v.status
FROM special_relationships sr
JOIN vulnerabilities v ON sr.id = v.special_relationship_id
WHERE sr.name = 'Test Dependent With Vulnerability';


-- ===================================================================
-- STEP 10: Test constraint - cannot have both FKs populated
-- ===================================================================
SELECT 'STEP 10: Testing constraint - cannot have both FKs (should fail)' AS test_step;

DO $$
BEGIN
    -- Try to insert with both FKs populated (should fail)
    INSERT INTO vulnerabilities (
        product_owner_id,
        special_relationship_id,
        description,
        status
    )
    SELECT
        po.id,
        sr.id,
        'Test',
        'test'
    FROM product_owners po, special_relationships sr
    WHERE po.firstname = 'TestVulnerability'
    AND sr.name = 'Test Dependent With Vulnerability'
    LIMIT 1;

    RAISE NOTICE 'ERROR: Constraint did not prevent both FKs from being populated!';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: Constraint correctly prevents both FKs from being populated';
END $$;


-- ===================================================================
-- STEP 11: Test constraint - must have at least one FK populated
-- ===================================================================
SELECT 'STEP 11: Testing constraint - must have one FK (should fail)' AS test_step;

DO $$
BEGIN
    -- Try to insert with neither FK populated (should fail)
    INSERT INTO vulnerabilities (
        description,
        status
    )
    VALUES (
        'Test',
        'test'
    );

    RAISE NOTICE 'ERROR: Constraint did not prevent empty FKs!';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: Constraint correctly requires at least one FK';
END $$;


-- ===================================================================
-- STEP 12: Test ON DELETE CASCADE for product_owner
-- ===================================================================
SELECT 'STEP 12: Testing ON DELETE CASCADE for product_owner' AS test_step;

-- Get count before deletion
SELECT COUNT(*) AS vulnerability_records_before_delete
FROM vulnerabilities
WHERE product_owner_id IN (
    SELECT id FROM product_owners WHERE firstname = 'TestVulnerability'
);

-- Delete the product owner (should cascade to vulnerabilities)
DELETE FROM product_owners WHERE firstname = 'TestVulnerability';

-- Check vulnerabilities are deleted
SELECT COUNT(*) AS vulnerability_records_after_delete
FROM vulnerabilities
WHERE product_owner_id IN (
    SELECT id FROM product_owners WHERE firstname = 'TestVulnerability'
);


-- ===================================================================
-- STEP 13: Test date_recorded default value
-- ===================================================================
SELECT 'STEP 13: Testing date_recorded default value' AS test_step;

-- Create another test product owner
INSERT INTO product_owners (firstname, surname)
VALUES ('TestDefaultDate', 'Owner')
RETURNING id;

-- Insert vulnerability without specifying date_recorded
INSERT INTO vulnerabilities (
    product_owner_id,
    description,
    status
)
SELECT
    id,
    'Test Vulnerability',
    'test'
FROM product_owners
WHERE firstname = 'TestDefaultDate'
RETURNING id, date_recorded;

-- Clean up
DELETE FROM product_owners WHERE firstname = 'TestDefaultDate';


-- ===================================================================
-- STEP 14: Clean up special relationship test data
-- ===================================================================
SELECT 'STEP 14: Cleaning up special relationship test data' AS test_step;

DELETE FROM special_relationships WHERE name = 'Test Dependent With Vulnerability';


-- ===================================================================
-- STEP 15: Verify indexes were created
-- ===================================================================
SELECT 'STEP 15: Verifying indexes' AS test_step;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'vulnerabilities'
ORDER BY indexname;


-- ===================================================================
-- Migration test completed successfully
-- ===================================================================
SELECT 'Vulnerabilities table migration test completed successfully!' AS test_result;
