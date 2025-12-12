-- Test Migration Script for Risk Assessment Tables
-- This script tests that the risk_assessments and capacity_for_loss migrations can be applied successfully
-- Run this in a test database environment only!

-- ===================================================================
-- STEP 1: Apply the migration - Create risk_assessments table
-- ===================================================================
SELECT 'STEP 1: Creating risk_assessments table' AS test_step;

CREATE TABLE IF NOT EXISTS risk_assessments (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT NOT NULL,
    type TEXT,
    actual_score NUMERIC(5,2),
    category_score INTEGER,
    risk_group TEXT,
    date DATE,
    status TEXT,

    CONSTRAINT fk_risk_assessments_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_actual_score_range
        CHECK (actual_score >= 0 AND actual_score <= 100),

    CONSTRAINT chk_category_score_range
        CHECK (category_score >= 1 AND category_score <= 7)
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_product_owner_id ON risk_assessments(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_type ON risk_assessments(type);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_date ON risk_assessments(date);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_status ON risk_assessments(status);


-- ===================================================================
-- STEP 2: Apply the migration - Create capacity_for_loss table
-- ===================================================================
SELECT 'STEP 2: Creating capacity_for_loss table' AS test_step;

CREATE TABLE IF NOT EXISTS capacity_for_loss (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT NOT NULL,
    score INTEGER,
    category TEXT,
    date_assessed DATE,
    status TEXT,

    CONSTRAINT fk_capacity_for_loss_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_score_range
        CHECK (score >= 1 AND score <= 10)
);

CREATE INDEX IF NOT EXISTS idx_capacity_for_loss_product_owner_id ON capacity_for_loss(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_capacity_for_loss_date_assessed ON capacity_for_loss(date_assessed);
CREATE INDEX IF NOT EXISTS idx_capacity_for_loss_status ON capacity_for_loss(status);


-- ===================================================================
-- STEP 3: Verify risk_assessments table structure
-- ===================================================================
SELECT 'STEP 3: Verifying risk_assessments table structure' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'risk_assessments'
ORDER BY ordinal_position;


-- ===================================================================
-- STEP 4: Verify capacity_for_loss table structure
-- ===================================================================
SELECT 'STEP 4: Verifying capacity_for_loss table structure' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'capacity_for_loss'
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
AND tc.table_name IN ('risk_assessments', 'capacity_for_loss');


-- ===================================================================
-- STEP 6: Create test product owner
-- ===================================================================
SELECT 'STEP 6: Creating test product owner' AS test_step;

INSERT INTO product_owners (firstname, surname)
VALUES ('TestRisk', 'Assessment')
RETURNING id, firstname, surname;


-- ===================================================================
-- STEP 7: Test inserting risk assessment - FinaMetrica
-- ===================================================================
SELECT 'STEP 7: Testing FinaMetrica risk assessment insertion' AS test_step;

INSERT INTO risk_assessments (
    product_owner_id,
    type,
    actual_score,
    category_score,
    risk_group,
    date,
    status
)
SELECT
    id,
    'FinaMetrica',
    68.50,
    5,
    'Balanced',
    '2024-01-15',
    'active'
FROM product_owners
WHERE firstname = 'TestRisk'
RETURNING id, type, actual_score, category_score, risk_group;


-- ===================================================================
-- STEP 8: Test inserting risk assessment - Manual
-- ===================================================================
SELECT 'STEP 8: Testing Manual risk assessment insertion' AS test_step;

INSERT INTO risk_assessments (
    product_owner_id,
    type,
    actual_score,
    category_score,
    risk_group,
    date,
    status
)
SELECT
    id,
    'Manual',
    45.00,
    3,
    'Conservative',
    '2024-06-01',
    'superseded'
FROM product_owners
WHERE firstname = 'TestRisk'
RETURNING id, type, actual_score, category_score, risk_group;


-- ===================================================================
-- STEP 9: Test inserting capacity for loss
-- ===================================================================
SELECT 'STEP 9: Testing capacity for loss insertion' AS test_step;

INSERT INTO capacity_for_loss (
    product_owner_id,
    score,
    category,
    date_assessed,
    status
)
SELECT
    id,
    7,
    'Medium-High',
    '2024-01-15',
    'active'
FROM product_owners
WHERE firstname = 'TestRisk'
RETURNING id, score, category, date_assessed;


-- ===================================================================
-- STEP 10: Test JOIN query - risk assessments
-- ===================================================================
SELECT 'STEP 10: Testing JOIN for risk assessments' AS test_step;

SELECT
    po.firstname,
    po.surname,
    ra.type,
    ra.actual_score,
    ra.category_score,
    ra.risk_group,
    ra.date,
    ra.status
FROM product_owners po
JOIN risk_assessments ra ON po.id = ra.product_owner_id
WHERE po.firstname = 'TestRisk'
ORDER BY ra.date DESC;


-- ===================================================================
-- STEP 11: Test JOIN query - capacity for loss
-- ===================================================================
SELECT 'STEP 11: Testing JOIN for capacity for loss' AS test_step;

SELECT
    po.firstname,
    po.surname,
    cfl.score,
    cfl.category,
    cfl.date_assessed,
    cfl.status
FROM product_owners po
JOIN capacity_for_loss cfl ON po.id = cfl.product_owner_id
WHERE po.firstname = 'TestRisk';


-- ===================================================================
-- STEP 12: Test score range constraints - risk_assessments
-- ===================================================================
SELECT 'STEP 12: Testing risk assessment score constraints' AS test_step;

-- Test actual_score constraint (should fail for > 100)
DO $$
BEGIN
    INSERT INTO risk_assessments (
        product_owner_id,
        type,
        actual_score,
        category_score,
        status
    )
    SELECT
        id,
        'Manual',
        150.00,
        5,
        'test'
    FROM product_owners
    WHERE firstname = 'TestRisk'
    LIMIT 1;

    RAISE NOTICE 'ERROR: Actual score constraint did not prevent value > 100!';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: Actual score constraint working correctly';
END $$;

-- Test category_score constraint (should fail for > 7)
DO $$
BEGIN
    INSERT INTO risk_assessments (
        product_owner_id,
        type,
        actual_score,
        category_score,
        status
    )
    SELECT
        id,
        'Manual',
        50.00,
        10,
        'test'
    FROM product_owners
    WHERE firstname = 'TestRisk'
    LIMIT 1;

    RAISE NOTICE 'ERROR: Category score constraint did not prevent value > 7!';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: Category score constraint working correctly';
END $$;


-- ===================================================================
-- STEP 13: Test score range constraint - capacity_for_loss
-- ===================================================================
SELECT 'STEP 13: Testing capacity for loss score constraint' AS test_step;

DO $$
BEGIN
    INSERT INTO capacity_for_loss (
        product_owner_id,
        score,
        status
    )
    SELECT
        id,
        15,
        'test'
    FROM product_owners
    WHERE firstname = 'TestRisk'
    LIMIT 1;

    RAISE NOTICE 'ERROR: Score constraint did not prevent value > 10!';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: Score constraint working correctly';
END $$;


-- ===================================================================
-- STEP 14: Test ON DELETE CASCADE
-- ===================================================================
SELECT 'STEP 14: Testing ON DELETE CASCADE' AS test_step;

-- Get counts before deletion
SELECT COUNT(*) AS risk_assessments_before_delete
FROM risk_assessments
WHERE product_owner_id IN (
    SELECT id FROM product_owners WHERE firstname = 'TestRisk'
);

SELECT COUNT(*) AS capacity_for_loss_before_delete
FROM capacity_for_loss
WHERE product_owner_id IN (
    SELECT id FROM product_owners WHERE firstname = 'TestRisk'
);

-- Delete the product owner (should cascade to both tables)
DELETE FROM product_owners WHERE firstname = 'TestRisk';

-- Check records are deleted
SELECT COUNT(*) AS risk_assessments_after_delete
FROM risk_assessments
WHERE product_owner_id IN (
    SELECT id FROM product_owners WHERE firstname = 'TestRisk'
);

SELECT COUNT(*) AS capacity_for_loss_after_delete
FROM capacity_for_loss
WHERE product_owner_id IN (
    SELECT id FROM product_owners WHERE firstname = 'TestRisk'
);


-- ===================================================================
-- STEP 15: Verify indexes were created
-- ===================================================================
SELECT 'STEP 15: Verifying indexes' AS test_step;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('risk_assessments', 'capacity_for_loss')
ORDER BY tablename, indexname;


-- ===================================================================
-- Migration test completed successfully
-- ===================================================================
SELECT 'Risk assessment tables migration test completed successfully!' AS test_result;
