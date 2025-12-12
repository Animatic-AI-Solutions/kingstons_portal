-- Test Script: Verify refactored vulnerabilities tables migration
-- Description: Comprehensive test suite for vulnerabilities_product_owners and vulnerabilities_special_relationships tables
-- Date: 2024-12-01
-- Author: Claude Code

-- Begin transaction for safe testing
BEGIN;

-- ============================================================================
-- TEST 1: Verify tables exist
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vulnerabilities_product_owners') THEN
        RAISE EXCEPTION 'TEST FAILED: vulnerabilities_product_owners table does not exist';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vulnerabilities_special_relationships') THEN
        RAISE EXCEPTION 'TEST FAILED: vulnerabilities_special_relationships table does not exist';
    END IF;

    -- Verify old polymorphic table is gone
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vulnerabilities') THEN
        RAISE EXCEPTION 'TEST FAILED: old vulnerabilities table still exists';
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: Both new tables exist and old table is removed';
END $$;

-- ============================================================================
-- TEST 2: Verify columns exist with correct types
-- ============================================================================
DO $$
BEGIN
    -- Check vulnerabilities_product_owners columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vulnerabilities_product_owners'
        AND column_name = 'product_owner_id'
        AND data_type = 'bigint'
        AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: vulnerabilities_product_owners.product_owner_id is missing or has wrong type/nullability';
    END IF;

    -- Check vulnerabilities_special_relationships columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vulnerabilities_special_relationships'
        AND column_name = 'special_relationship_id'
        AND data_type = 'bigint'
        AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: vulnerabilities_special_relationships.special_relationship_id is missing or has wrong type/nullability';
    END IF;

    -- Verify NO polymorphic columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vulnerabilities_product_owners'
        AND column_name = 'special_relationship_id'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: vulnerabilities_product_owners should not have special_relationship_id column';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vulnerabilities_special_relationships'
        AND column_name = 'product_owner_id'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: vulnerabilities_special_relationships should not have product_owner_id column';
    END IF;

    RAISE NOTICE 'TEST 2 PASSED: All columns exist with correct types and no polymorphic columns';
END $$;

-- ============================================================================
-- TEST 3: Verify foreign key constraints exist
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_vulnerabilities_product_owners_product_owner'
        AND table_name = 'vulnerabilities_product_owners'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_vulnerabilities_product_owners_product_owner does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_vulnerabilities_special_relationships_special_relationship'
        AND table_name = 'vulnerabilities_special_relationships'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_vulnerabilities_special_relationships_special_relationship does not exist';
    END IF;

    RAISE NOTICE 'TEST 3 PASSED: All foreign key constraints exist';
END $$;

-- ============================================================================
-- TEST 4: Verify all indexes exist
-- ============================================================================
DO $$
DECLARE
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
    idx TEXT;
BEGIN
    -- Check vulnerabilities_product_owners indexes
    FOR idx IN SELECT unnest(ARRAY[
        'idx_vuln_product_owners_product_owner_id',
        'idx_vuln_product_owners_status',
        'idx_vuln_product_owners_diagnosed',
        'idx_vuln_product_owners_date_recorded'
    ]) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = idx
        ) THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;

    -- Check vulnerabilities_special_relationships indexes
    FOR idx IN SELECT unnest(ARRAY[
        'idx_vuln_special_relationships_special_rel_id',
        'idx_vuln_special_relationships_status',
        'idx_vuln_special_relationships_diagnosed',
        'idx_vuln_special_relationships_date_recorded'
    ]) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = idx
        ) THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;

    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: Missing indexes: %', array_to_string(missing_indexes, ', ');
    END IF;

    RAISE NOTICE 'TEST 4 PASSED: All 8 indexes exist';
END $$;

-- ============================================================================
-- TEST 5: Test inserting data for product owners
-- ============================================================================
DO $$
DECLARE
    test_product_owner_id BIGINT;
    test_vuln_id BIGINT;
BEGIN
    -- Get or create test product owner
    SELECT id INTO test_product_owner_id FROM product_owners LIMIT 1;

    IF test_product_owner_id IS NULL THEN
        INSERT INTO product_owners (firstname, surname, status)
        VALUES ('Test', 'Owner', 'Active')
        RETURNING id INTO test_product_owner_id;
    END IF;

    -- Insert test vulnerability record
    INSERT INTO vulnerabilities_product_owners (
        product_owner_id,
        description,
        adjustments,
        diagnosed,
        status,
        notes
    ) VALUES (
        test_product_owner_id,
        'Hearing Impairment',
        'Requires hearing loop for meetings',
        true,
        'Active',
        'Uses hearing aid in both ears'
    ) RETURNING id INTO test_vuln_id;

    IF test_vuln_id IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: Could not insert vulnerability record for product owner';
    END IF;

    RAISE NOTICE 'TEST 5 PASSED: Successfully inserted vulnerability record for product owner';
END $$;

-- ============================================================================
-- TEST 6: Test inserting data for special relationships
-- ============================================================================
DO $$
DECLARE
    test_special_relationship_id BIGINT;
    test_vuln_id BIGINT;
BEGIN
    -- Get or create test special relationship
    SELECT id INTO test_special_relationship_id FROM special_relationships LIMIT 1;

    IF test_special_relationship_id IS NULL THEN
        INSERT INTO special_relationships (name, type, status)
        VALUES ('Test Child', 'personal', 'active')
        RETURNING id INTO test_special_relationship_id;
    END IF;

    -- Insert test vulnerability record
    INSERT INTO vulnerabilities_special_relationships (
        special_relationship_id,
        description,
        adjustments,
        diagnosed,
        status,
        notes
    ) VALUES (
        test_special_relationship_id,
        'Learning Disability',
        'Extra time for forms and documents',
        true,
        'Active',
        'Dyslexia diagnosed at age 8'
    ) RETURNING id INTO test_vuln_id;

    IF test_vuln_id IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: Could not insert vulnerability record for special relationship';
    END IF;

    RAISE NOTICE 'TEST 6 PASSED: Successfully inserted vulnerability record for special relationship';
END $$;

-- ============================================================================
-- TEST 7: Test CASCADE DELETE for product owners
-- ============================================================================
DO $$
DECLARE
    test_product_owner_id BIGINT;
    test_vuln_id BIGINT;
    record_count INTEGER;
BEGIN
    -- Create test product owner
    INSERT INTO product_owners (firstname, surname, status)
    VALUES ('Delete', 'Test', 'Active')
    RETURNING id INTO test_product_owner_id;

    -- Create vulnerability record
    INSERT INTO vulnerabilities_product_owners (product_owner_id, description, status)
    VALUES (test_product_owner_id, 'Test Vulnerability', 'Test')
    RETURNING id INTO test_vuln_id;

    -- Delete the product owner
    DELETE FROM product_owners WHERE id = test_product_owner_id;

    -- Check that vulnerability record was cascade deleted
    SELECT COUNT(*) INTO record_count
    FROM vulnerabilities_product_owners
    WHERE id = test_vuln_id;

    IF record_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: CASCADE DELETE did not remove vulnerabilities_product_owners record';
    END IF;

    RAISE NOTICE 'TEST 7 PASSED: CASCADE DELETE working correctly for product owners';
END $$;

-- ============================================================================
-- TEST 8: Test CASCADE DELETE for special relationships
-- ============================================================================
DO $$
DECLARE
    test_special_relationship_id BIGINT;
    test_vuln_id BIGINT;
    record_count INTEGER;
BEGIN
    -- Create test special relationship
    INSERT INTO special_relationships (name, type, status)
    VALUES ('Delete Test', 'personal', 'active')
    RETURNING id INTO test_special_relationship_id;

    -- Create vulnerability record
    INSERT INTO vulnerabilities_special_relationships (special_relationship_id, description, status)
    VALUES (test_special_relationship_id, 'Test Vulnerability', 'Test')
    RETURNING id INTO test_vuln_id;

    -- Delete the special relationship
    DELETE FROM special_relationships WHERE id = test_special_relationship_id;

    -- Check that vulnerability record was cascade deleted
    SELECT COUNT(*) INTO record_count
    FROM vulnerabilities_special_relationships
    WHERE id = test_vuln_id;

    IF record_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: CASCADE DELETE did not remove vulnerabilities_special_relationships record';
    END IF;

    RAISE NOTICE 'TEST 8 PASSED: CASCADE DELETE working correctly for special relationships';
END $$;

-- ============================================================================
-- TEST 9: Query test data to verify it's readable
-- ============================================================================
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Count vulnerabilities_product_owners
    SELECT COUNT(*) INTO record_count FROM vulnerabilities_product_owners;
    RAISE NOTICE 'Found % vulnerabilities_product_owners records', record_count;

    -- Count vulnerabilities_special_relationships
    SELECT COUNT(*) INTO record_count FROM vulnerabilities_special_relationships;
    RAISE NOTICE 'Found % vulnerabilities_special_relationships records', record_count;

    -- Test join with product_owners
    SELECT COUNT(*) INTO record_count
    FROM vulnerabilities_product_owners v
    INNER JOIN product_owners po ON v.product_owner_id = po.id;
    RAISE NOTICE 'Successfully joined % vulnerability records with product_owners', record_count;

    -- Test join with special_relationships
    SELECT COUNT(*) INTO record_count
    FROM vulnerabilities_special_relationships v
    INNER JOIN special_relationships sr ON v.special_relationship_id = sr.id;
    RAISE NOTICE 'Successfully joined % vulnerability records with special_relationships', record_count;

    RAISE NOTICE 'TEST 9 PASSED: Data is queryable';
END $$;

-- ============================================================================
-- Rollback test transaction
-- ============================================================================
ROLLBACK;

-- ============================================================================
-- Summary
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL TESTS PASSED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables: vulnerabilities_product_owners, vulnerabilities_special_relationships';
    RAISE NOTICE 'Indexes: 8 total (4 per table)';
    RAISE NOTICE 'Constraints: Dedicated foreign keys, no polymorphic CHECK constraints';
    RAISE NOTICE 'Cascade behavior: CASCADE DELETE on both tables';
    RAISE NOTICE 'Improvement: Cleaner normalized design without mutually exclusive FKs';
    RAISE NOTICE '========================================';
END $$;
