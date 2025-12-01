-- Test Migration Script for Health Table
-- This script tests that the health table migration can be applied successfully
-- Run this in a test database environment only!

-- ===================================================================
-- STEP 1: Apply the migration - Create health table
-- ===================================================================
SELECT 'STEP 1: Creating health table' AS test_step;

CREATE TABLE IF NOT EXISTS health (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT,
    special_relationship_id BIGINT,
    condition TEXT,
    name TEXT,
    date_of_diagnosis DATE,
    status TEXT,
    medication TEXT,
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    CONSTRAINT fk_health_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_health_special_relationship
        FOREIGN KEY (special_relationship_id)
        REFERENCES special_relationships(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_health_exactly_one_owner
        CHECK (
            (product_owner_id IS NOT NULL AND special_relationship_id IS NULL) OR
            (product_owner_id IS NULL AND special_relationship_id IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_health_product_owner_id ON health(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_health_special_relationship_id ON health(special_relationship_id);
CREATE INDEX IF NOT EXISTS idx_health_status ON health(status);
CREATE INDEX IF NOT EXISTS idx_health_date_of_diagnosis ON health(date_of_diagnosis);
CREATE INDEX IF NOT EXISTS idx_health_date_recorded ON health(date_recorded);


-- ===================================================================
-- STEP 2: Verify health table structure
-- ===================================================================
SELECT 'STEP 2: Verifying health table structure' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'health'
ORDER BY ordinal_position;


-- ===================================================================
-- STEP 3: Verify foreign key constraint
-- ===================================================================
SELECT 'STEP 3: Verifying foreign key constraint' AS test_step;

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
AND tc.table_name = 'health';


-- ===================================================================
-- STEP 4: Create test product owner
-- ===================================================================
SELECT 'STEP 4: Creating test product owner' AS test_step;

INSERT INTO product_owners (firstname, surname)
VALUES ('TestHealth', 'Patient')
RETURNING id, firstname, surname;


-- ===================================================================
-- STEP 5: Test inserting health records
-- ===================================================================
SELECT 'STEP 5: Testing health record insertion' AS test_step;

INSERT INTO health (
    product_owner_id,
    condition,
    name,
    date_of_diagnosis,
    status,
    medication,
    notes
)
SELECT
    id,
    'Diabetes Type 2',
    'Type 2 Diabetes Mellitus',
    '2020-05-15',
    'active',
    'Metformin 500mg twice daily',
    'Regular monitoring required'
FROM product_owners
WHERE firstname = 'TestHealth'
RETURNING id, name, condition, status;

-- Insert another health record for the same person
INSERT INTO health (
    product_owner_id,
    condition,
    name,
    date_of_diagnosis,
    status,
    medication,
    notes
)
SELECT
    id,
    'Hypertension',
    'High Blood Pressure',
    '2019-03-10',
    'managed',
    'Lisinopril 10mg daily',
    'Blood pressure controlled'
FROM product_owners
WHERE firstname = 'TestHealth'
RETURNING id, name, condition, status;


-- ===================================================================
-- STEP 6: Test JOIN query between product_owners and health
-- ===================================================================
SELECT 'STEP 6: Testing JOIN query to retrieve product owner with health records' AS test_step;

SELECT
    po.firstname,
    po.surname,
    h.name AS health_condition,
    h.condition,
    h.status,
    h.medication,
    h.date_of_diagnosis,
    h.date_recorded
FROM product_owners po
JOIN health h ON po.id = h.product_owner_id
WHERE po.firstname = 'TestHealth'
ORDER BY h.date_of_diagnosis;


-- ===================================================================
-- STEP 7: Test filtering by status
-- ===================================================================
SELECT 'STEP 7: Testing status filtering' AS test_step;

SELECT
    COUNT(*) AS active_conditions
FROM health
WHERE status = 'active';


-- ===================================================================
-- STEP 8: Test ON DELETE CASCADE behavior
-- ===================================================================
SELECT 'STEP 8: Testing ON DELETE CASCADE' AS test_step;

-- Get count before deletion
SELECT COUNT(*) AS health_records_before_delete
FROM health
WHERE product_owner_id IN (
    SELECT id FROM product_owners WHERE firstname = 'TestHealth'
);

-- Delete the product owner (should cascade to health records)
DELETE FROM product_owners WHERE firstname = 'TestHealth';

-- Check health records are deleted
SELECT COUNT(*) AS health_records_after_delete
FROM health
WHERE product_owner_id IN (
    SELECT id FROM product_owners WHERE firstname = 'TestHealth'
);


-- ===================================================================
-- STEP 9: Test date_recorded default value
-- ===================================================================
SELECT 'STEP 9: Testing date_recorded default value' AS test_step;

-- Create another test product owner
INSERT INTO product_owners (firstname, surname)
VALUES ('TestDefaultDate', 'Patient')
RETURNING id;

-- Insert health record without specifying date_recorded
INSERT INTO health (
    product_owner_id,
    condition,
    name,
    date_of_diagnosis,
    status
)
SELECT
    id,
    'Test Condition',
    'Test',
    '2024-01-01',
    'test'
FROM product_owners
WHERE firstname = 'TestDefaultDate'
RETURNING id, date_recorded;

-- Clean up
DELETE FROM product_owners WHERE firstname = 'TestDefaultDate';


-- ===================================================================
-- STEP 10: Test health records for special_relationships
-- ===================================================================
SELECT 'STEP 10: Testing health records for special_relationships' AS test_step;

-- Create test address for special relationship
WITH test_address AS (
    INSERT INTO addresses (line_1, line_5)
    VALUES ('Health Test Address', 'HT1 1ST')
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
    'Test Dependent With Health',
    '2015-06-15',
    9,
    true,
    'Son',
    id
FROM test_address
RETURNING id, name;

-- Add health record to special relationship
INSERT INTO health (
    special_relationship_id,
    condition,
    name,
    date_of_diagnosis,
    status,
    medication,
    notes
)
SELECT
    id,
    'Asthma',
    'Childhood Asthma',
    '2018-03-10',
    'managed',
    'Albuterol inhaler as needed',
    'Triggered by exercise and cold weather'
FROM special_relationships
WHERE name = 'Test Dependent With Health'
RETURNING id, name, condition, status;


-- ===================================================================
-- STEP 11: Test JOIN query for special_relationship health records
-- ===================================================================
SELECT 'STEP 11: Testing JOIN for special_relationship health records' AS test_step;

SELECT
    sr.name AS relationship_name,
    sr.relationship,
    h.name AS health_condition,
    h.status,
    h.medication
FROM special_relationships sr
JOIN health h ON sr.id = h.special_relationship_id
WHERE sr.name = 'Test Dependent With Health';


-- ===================================================================
-- STEP 12: Test constraint - cannot have both FKs populated
-- ===================================================================
SELECT 'STEP 12: Testing constraint - cannot have both FKs (should fail)' AS test_step;

DO $$
BEGIN
    -- Try to insert with both FKs populated (should fail)
    INSERT INTO health (
        product_owner_id,
        special_relationship_id,
        condition,
        name,
        status
    )
    SELECT
        po.id,
        sr.id,
        'Test',
        'Test',
        'test'
    FROM product_owners po, special_relationships sr
    WHERE po.firstname = 'TestHealth'
    AND sr.name = 'Test Dependent With Health'
    LIMIT 1;

    RAISE NOTICE 'ERROR: Constraint did not prevent both FKs from being populated!';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: Constraint correctly prevents both FKs from being populated';
END $$;


-- ===================================================================
-- STEP 13: Test constraint - must have at least one FK populated
-- ===================================================================
SELECT 'STEP 13: Testing constraint - must have one FK (should fail)' AS test_step;

DO $$
BEGIN
    -- Try to insert with neither FK populated (should fail)
    INSERT INTO health (
        condition,
        name,
        status
    )
    VALUES (
        'Test',
        'Test',
        'test'
    );

    RAISE NOTICE 'ERROR: Constraint did not prevent empty FKs!';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: Constraint correctly requires at least one FK';
END $$;


-- ===================================================================
-- STEP 14: Clean up special relationship test data
-- ===================================================================
SELECT 'STEP 14: Cleaning up special relationship test data' AS test_step;

DELETE FROM special_relationships WHERE name = 'Test Dependent With Health';


-- ===================================================================
-- STEP 15: Verify indexes were created
-- ===================================================================
SELECT 'STEP 15: Verifying indexes' AS test_step;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'health'
ORDER BY indexname;


-- ===================================================================
-- Migration test completed successfully
-- ===================================================================
SELECT 'Health table migration test completed successfully!' AS test_result;
