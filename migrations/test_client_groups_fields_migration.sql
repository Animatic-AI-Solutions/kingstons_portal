-- Test Migration Script for Client Groups Fields
-- This script tests that the client_groups fields migration can be applied successfully
-- Run this in a test database environment only!

-- ===================================================================
-- STEP 1: Show current client_groups structure before migration
-- ===================================================================
SELECT 'STEP 1: Checking current client_groups structure' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_groups'
ORDER BY ordinal_position;


-- ===================================================================
-- STEP 2: Apply the migration - Add new fields
-- ===================================================================
SELECT 'STEP 2: Adding new fields to client_groups' AS test_step;

ALTER TABLE client_groups
  ADD COLUMN ongoing_start DATE,
  ADD COLUMN client_declaration DATE,
  ADD COLUMN privacy_declaration DATE,
  ADD COLUMN full_fee_agreement DATE,
  ADD COLUMN last_satisfactory_discussion DATE,
  ADD COLUMN notes TEXT;

CREATE INDEX IF NOT EXISTS idx_client_groups_ongoing_start ON client_groups(ongoing_start);
CREATE INDEX IF NOT EXISTS idx_client_groups_client_declaration ON client_groups(client_declaration);
CREATE INDEX IF NOT EXISTS idx_client_groups_privacy_declaration ON client_groups(privacy_declaration);
CREATE INDEX IF NOT EXISTS idx_client_groups_full_fee_agreement ON client_groups(full_fee_agreement);
CREATE INDEX IF NOT EXISTS idx_client_groups_last_satisfactory_discussion ON client_groups(last_satisfactory_discussion);


-- ===================================================================
-- STEP 3: Verify new fields were added
-- ===================================================================
SELECT 'STEP 3: Verifying new fields were added' AS test_step;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_groups'
AND column_name IN (
    'ongoing_start',
    'client_declaration',
    'privacy_declaration',
    'full_fee_agreement',
    'last_satisfactory_discussion',
    'notes'
)
ORDER BY column_name;


-- ===================================================================
-- STEP 4: Create test client group with new fields
-- ===================================================================
SELECT 'STEP 4: Creating test client group with new fields' AS test_step;

INSERT INTO client_groups (
    name,
    type,
    status,
    ongoing_start,
    client_declaration,
    privacy_declaration,
    full_fee_agreement,
    last_satisfactory_discussion,
    notes
)
VALUES (
    'Test Client Group',
    'Family',
    'active',
    '2024-01-15',
    '2024-01-10',
    '2024-01-10',
    '2024-01-12',
    '2024-11-20',
    'Test notes for client group tracking and compliance'
)
RETURNING id, name, ongoing_start, client_declaration, notes;


-- ===================================================================
-- STEP 5: Test updating existing client group with new fields
-- ===================================================================
SELECT 'STEP 5: Testing update of existing fields' AS test_step;

UPDATE client_groups
SET
    ongoing_start = '2024-02-01',
    client_declaration = '2024-01-25',
    privacy_declaration = '2024-01-25',
    full_fee_agreement = '2024-01-28',
    last_satisfactory_discussion = '2024-12-01',
    notes = 'Updated compliance tracking information'
WHERE name = 'Test Client Group'
RETURNING id, name, ongoing_start, last_satisfactory_discussion;


-- ===================================================================
-- STEP 6: Query client group with new fields
-- ===================================================================
SELECT 'STEP 6: Querying client group with new fields' AS test_step;

SELECT
    id,
    name,
    type,
    status,
    ongoing_start,
    client_declaration,
    privacy_declaration,
    full_fee_agreement,
    last_satisfactory_discussion,
    notes
FROM client_groups
WHERE name = 'Test Client Group';


-- ===================================================================
-- STEP 7: Test filtering by date fields
-- ===================================================================
SELECT 'STEP 7: Testing date-based filtering' AS test_step;

-- Find client groups with ongoing start in 2024
SELECT
    COUNT(*) AS groups_with_ongoing_start_2024
FROM client_groups
WHERE ongoing_start >= '2024-01-01'
AND ongoing_start < '2025-01-01';

-- Find client groups with recent satisfactory discussions (last 30 days)
SELECT
    COUNT(*) AS groups_with_recent_discussion
FROM client_groups
WHERE last_satisfactory_discussion >= CURRENT_DATE - INTERVAL '30 days';


-- ===================================================================
-- STEP 8: Test that fields are nullable (existing records ok)
-- ===================================================================
SELECT 'STEP 8: Testing nullable fields with existing records' AS test_step;

INSERT INTO client_groups (
    name,
    type,
    status
)
VALUES (
    'Test Minimal Client Group',
    'Individual',
    'active'
)
RETURNING id, name, ongoing_start, notes;


-- ===================================================================
-- STEP 9: Clean up test records
-- ===================================================================
SELECT 'STEP 9: Cleaning up test records' AS test_step;

DELETE FROM client_groups WHERE name IN ('Test Client Group', 'Test Minimal Client Group');


-- ===================================================================
-- STEP 10: Verify indexes were created
-- ===================================================================
SELECT 'STEP 10: Verifying indexes' AS test_step;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'client_groups'
AND indexname LIKE 'idx_client_groups_%'
ORDER BY indexname;


-- ===================================================================
-- Migration test completed successfully
-- ===================================================================
SELECT 'Client groups fields migration test completed successfully!' AS test_result;
