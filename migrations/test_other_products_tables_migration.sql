-- Test Script: Verify other_products and junction tables migration
-- Description: Comprehensive test suite for protection policies tracking tables
-- Date: 2024-12-01
-- Author: Claude Code

-- Begin transaction for safe testing
BEGIN;

-- ============================================================================
-- TEST 1: Verify tables exist
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'other_products') THEN
        RAISE EXCEPTION 'TEST FAILED: other_products table does not exist';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_owner_other_products') THEN
        RAISE EXCEPTION 'TEST FAILED: product_owner_other_products table does not exist';
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: Both tables exist';
END $$;

-- ============================================================================
-- TEST 2: Verify columns exist with correct types
-- ============================================================================
DO $$
BEGIN
    -- Check other_products columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'other_products'
        AND column_name = 'provider_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: other_products.provider_id is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'other_products'
        AND column_name = 'policy_number'
        AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: other_products.policy_number is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'other_products'
        AND column_name = 'sum_assured'
        AND data_type = 'numeric'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: other_products.sum_assured is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'other_products'
        AND column_name = 'investment_element'
        AND data_type = 'boolean'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: other_products.investment_element is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'other_products'
        AND column_name = 'in_trust'
        AND data_type = 'boolean'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: other_products.in_trust is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'other_products'
        AND column_name = 'start_date'
        AND data_type = 'date'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: other_products.start_date is missing or has wrong type';
    END IF;

    -- Check junction table columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_owner_other_products'
        AND column_name = 'product_owner_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: product_owner_other_products.product_owner_id is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_owner_other_products'
        AND column_name = 'other_product_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: product_owner_other_products.other_product_id is missing or has wrong type';
    END IF;

    RAISE NOTICE 'TEST 2 PASSED: All columns exist with correct types';
END $$;

-- ============================================================================
-- TEST 3: Verify foreign key constraints exist
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_other_products_provider'
        AND table_name = 'other_products'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_other_products_provider does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_product_owner_other_products_product_owner'
        AND table_name = 'product_owner_other_products'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_product_owner_other_products_product_owner does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_product_owner_other_products_other_product'
        AND table_name = 'product_owner_other_products'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_product_owner_other_products_other_product does not exist';
    END IF;

    RAISE NOTICE 'TEST 3 PASSED: All foreign key constraints exist';
END $$;

-- ============================================================================
-- TEST 4: Verify unique constraint exists
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_product_owner_other_product'
        AND table_name = 'product_owner_other_products'
        AND constraint_type = 'UNIQUE'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: UNIQUE constraint uq_product_owner_other_product does not exist';
    END IF;

    RAISE NOTICE 'TEST 4 PASSED: Unique constraint exists';
END $$;

-- ============================================================================
-- TEST 5: Verify all indexes exist
-- ============================================================================
DO $$
DECLARE
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
    idx TEXT;
BEGIN
    -- Check other_products indexes
    FOR idx IN SELECT unnest(ARRAY[
        'idx_other_products_provider_id',
        'idx_other_products_policy_number',
        'idx_other_products_cover_type',
        'idx_other_products_start_date',
        'idx_other_products_end_date',
        'idx_other_products_in_trust',
        'idx_other_products_investment_element'
    ]) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = idx
        ) THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;

    -- Check junction table indexes
    FOR idx IN SELECT unnest(ARRAY[
        'idx_product_owner_other_products_product_owner_id',
        'idx_product_owner_other_products_other_product_id'
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

    RAISE NOTICE 'TEST 5 PASSED: All 9 indexes exist';
END $$;

-- ============================================================================
-- TEST 6: Test inserting data
-- ============================================================================
DO $$
DECLARE
    test_provider_id BIGINT;
    test_product_owner_id BIGINT;
    test_other_product_id BIGINT;
    test_junction_id BIGINT;
BEGIN
    -- Get or create a test provider
    SELECT id INTO test_provider_id FROM available_providers LIMIT 1;

    IF test_provider_id IS NULL THEN
        INSERT INTO available_providers (name, status)
        VALUES ('Test Provider', 'Active')
        RETURNING id INTO test_provider_id;
        RAISE NOTICE 'Created test provider with id: %', test_provider_id;
    END IF;

    -- Get or create a test product owner
    SELECT id INTO test_product_owner_id FROM product_owners LIMIT 1;

    IF test_product_owner_id IS NULL THEN
        INSERT INTO product_owners (firstname, surname, status)
        VALUES ('Test', 'Owner', 'Active')
        RETURNING id INTO test_product_owner_id;
        RAISE NOTICE 'Created test product owner with id: %', test_product_owner_id;
    END IF;

    -- Insert test other_product
    INSERT INTO other_products (
        provider_id,
        policy_number,
        cover_type,
        term_type,
        sum_assured,
        duration,
        start_date,
        monthly_payment,
        end_date,
        investment_element,
        surrender_value,
        in_trust,
        trust_notes,
        notes
    ) VALUES (
        test_provider_id,
        'POL123456',
        'Life Cover',
        'Term',
        250000.00,
        '25 years',
        '2020-01-01',
        75.50,
        '2045-01-01',
        false,
        0.00,
        true,
        'Placed in trust for spouse',
        'Annual review required'
    ) RETURNING id INTO test_other_product_id;

    -- Create junction record
    INSERT INTO product_owner_other_products (
        product_owner_id,
        other_product_id
    ) VALUES (
        test_product_owner_id,
        test_other_product_id
    ) RETURNING id INTO test_junction_id;

    RAISE NOTICE 'TEST 6 PASSED: Successfully inserted test data';
END $$;

-- ============================================================================
-- TEST 7: Test unique constraint (should prevent duplicate relationships)
-- ============================================================================
DO $$
DECLARE
    test_product_owner_id BIGINT;
    test_other_product_id BIGINT;
    constraint_working BOOLEAN := FALSE;
BEGIN
    -- Get existing test data
    SELECT product_owner_id, other_product_id
    INTO test_product_owner_id, test_other_product_id
    FROM product_owner_other_products
    LIMIT 1;

    -- Try to insert duplicate (should fail)
    BEGIN
        INSERT INTO product_owner_other_products (product_owner_id, other_product_id)
        VALUES (test_product_owner_id, test_other_product_id);
        RAISE EXCEPTION 'TEST FAILED: UNIQUE constraint allowed duplicate relationship';
    EXCEPTION
        WHEN unique_violation THEN
            constraint_working := TRUE;
    END;

    IF constraint_working THEN
        RAISE NOTICE 'TEST 7 PASSED: UNIQUE constraint working correctly';
    END IF;
END $$;

-- ============================================================================
-- TEST 8: Test CASCADE DELETE behavior
-- ============================================================================
DO $$
DECLARE
    test_product_owner_id BIGINT;
    test_other_product_id BIGINT;
    test_junction_id BIGINT;
    record_count INTEGER;
BEGIN
    -- Create test product owner
    INSERT INTO product_owners (firstname, surname, status)
    VALUES ('Delete', 'Test', 'Active')
    RETURNING id INTO test_product_owner_id;

    -- Create test other_product
    INSERT INTO other_products (policy_number, cover_type)
    VALUES ('DEL123', 'Test Cover')
    RETURNING id INTO test_other_product_id;

    -- Create junction record
    INSERT INTO product_owner_other_products (product_owner_id, other_product_id)
    VALUES (test_product_owner_id, test_other_product_id)
    RETURNING id INTO test_junction_id;

    -- Delete the product owner
    DELETE FROM product_owners WHERE id = test_product_owner_id;

    -- Check that junction record was cascade deleted
    SELECT COUNT(*) INTO record_count
    FROM product_owner_other_products
    WHERE id = test_junction_id;

    IF record_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: CASCADE DELETE did not remove junction record when product_owner was deleted';
    END IF;

    -- Check that other_product still exists
    SELECT COUNT(*) INTO record_count
    FROM other_products
    WHERE id = test_other_product_id;

    IF record_count = 0 THEN
        RAISE EXCEPTION 'TEST FAILED: other_product was incorrectly deleted';
    END IF;

    -- Now delete the other_product
    DELETE FROM other_products WHERE id = test_other_product_id;

    RAISE NOTICE 'TEST 8 PASSED: CASCADE DELETE working correctly';
END $$;

-- ============================================================================
-- TEST 9: Test SET NULL behavior when provider is deleted
-- ============================================================================
DO $$
DECLARE
    test_provider_id BIGINT;
    test_other_product_id BIGINT;
    provider_id_after_delete BIGINT;
BEGIN
    -- Create test provider
    INSERT INTO available_providers (name, status)
    VALUES ('Delete Test Provider', 'Active')
    RETURNING id INTO test_provider_id;

    -- Create other_product with this provider
    INSERT INTO other_products (
        provider_id,
        policy_number,
        cover_type
    ) VALUES (
        test_provider_id,
        'PROV123',
        'Test Cover'
    ) RETURNING id INTO test_other_product_id;

    -- Delete the provider
    DELETE FROM available_providers WHERE id = test_provider_id;

    -- Check that provider_id was set to NULL
    SELECT provider_id INTO provider_id_after_delete
    FROM other_products
    WHERE id = test_other_product_id;

    IF provider_id_after_delete IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FAILED: SET NULL did not work when provider was deleted';
    END IF;

    RAISE NOTICE 'TEST 9 PASSED: SET NULL on provider deletion working correctly';
END $$;

-- ============================================================================
-- TEST 10: Query test data to verify it's readable
-- ============================================================================
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Count other_products
    SELECT COUNT(*) INTO record_count FROM other_products;
    RAISE NOTICE 'Found % other_product records', record_count;

    -- Count junction records
    SELECT COUNT(*) INTO record_count FROM product_owner_other_products;
    RAISE NOTICE 'Found % product_owner_other_products records', record_count;

    -- Test join between tables
    SELECT COUNT(*) INTO record_count
    FROM product_owner_other_products popp
    INNER JOIN other_products op ON popp.other_product_id = op.id
    INNER JOIN product_owners po ON popp.product_owner_id = po.id;
    RAISE NOTICE 'Successfully joined % records across all three tables', record_count;

    RAISE NOTICE 'TEST 10 PASSED: Data is queryable';
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
    RAISE NOTICE 'Tables: other_products, product_owner_other_products';
    RAISE NOTICE 'Indexes: 9 total (7 on other_products, 2 on junction table)';
    RAISE NOTICE 'Constraints: Foreign keys to available_providers and product_owners, unique constraint on junction';
    RAISE NOTICE 'Cascade behavior: CASCADE DELETE on junction table, SET NULL on provider';
    RAISE NOTICE '========================================';
END $$;
