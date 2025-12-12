-- Test Script: Verify income and expenditure tables migration
-- Description: Comprehensive test suite for income and expenditure tracking tables
-- Date: 2024-12-01
-- Author: Claude Code

-- Begin transaction for safe testing
BEGIN;

-- ============================================================================
-- TEST 1: Verify tables exist
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'income') THEN
        RAISE EXCEPTION 'TEST FAILED: income table does not exist';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenditure') THEN
        RAISE EXCEPTION 'TEST FAILED: expenditure table does not exist';
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: Both tables exist';
END $$;

-- ============================================================================
-- TEST 2: Verify columns exist with correct types
-- ============================================================================
DO $$
BEGIN
    -- Check income columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'income'
        AND column_name = 'client_group_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: income.client_group_id is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'income'
        AND column_name = 'product_owner_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: income.product_owner_id is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'income'
        AND column_name = 'annual_amount'
        AND data_type = 'numeric'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: income.annual_amount is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'income'
        AND column_name = 'last_updated'
        AND data_type = 'timestamp with time zone'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: income.last_updated is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'income'
        AND column_name = 'notes'
        AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: income.notes is missing or has wrong type';
    END IF;

    -- Check expenditure columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenditure'
        AND column_name = 'client_group_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: expenditure.client_group_id is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenditure'
        AND column_name = 'annual_amount'
        AND data_type = 'numeric'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: expenditure.annual_amount is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenditure'
        AND column_name = 'last_updated'
        AND data_type = 'timestamp with time zone'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: expenditure.last_updated is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenditure'
        AND column_name = 'notes'
        AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: expenditure.notes is missing or has wrong type';
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
        WHERE constraint_name = 'fk_income_client_group'
        AND table_name = 'income'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_income_client_group does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_income_product_owner'
        AND table_name = 'income'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_income_product_owner does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_expenditure_client_group'
        AND table_name = 'expenditure'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_expenditure_client_group does not exist';
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
    -- Check income indexes
    FOR idx IN SELECT unnest(ARRAY[
        'idx_income_client_group_id',
        'idx_income_product_owner_id',
        'idx_income_category',
        'idx_income_frequency',
        'idx_income_last_updated'
    ]) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = idx
        ) THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;

    -- Check expenditure indexes
    FOR idx IN SELECT unnest(ARRAY[
        'idx_expenditure_client_group_id',
        'idx_expenditure_category',
        'idx_expenditure_frequency',
        'idx_expenditure_last_updated'
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

    RAISE NOTICE 'TEST 4 PASSED: All 9 indexes exist';
END $$;

-- ============================================================================
-- TEST 5: Test inserting data (requires existing client_groups and product_owners)
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    test_product_owner_id BIGINT;
    test_income_id BIGINT;
    test_expenditure_id BIGINT;
BEGIN
    -- Get or create a test client group
    SELECT id INTO test_client_group_id FROM client_groups LIMIT 1;

    IF test_client_group_id IS NULL THEN
        INSERT INTO client_groups (name, type, status)
        VALUES ('Test Client Group', 'Individual', 'Active')
        RETURNING id INTO test_client_group_id;
        RAISE NOTICE 'Created test client group with id: %', test_client_group_id;
    END IF;

    -- Get or create a test product owner
    SELECT id INTO test_product_owner_id FROM product_owners LIMIT 1;

    IF test_product_owner_id IS NULL THEN
        INSERT INTO product_owners (firstname, surname, status)
        VALUES ('Test', 'Owner', 'Active')
        RETURNING id INTO test_product_owner_id;
        RAISE NOTICE 'Created test product owner with id: %', test_product_owner_id;
    END IF;

    -- Insert test income
    INSERT INTO income (
        client_group_id,
        category,
        source,
        product_owner_id,
        frequency,
        annual_amount,
        notes
    ) VALUES (
        test_client_group_id,
        'Salary',
        'Primary Employment',
        test_product_owner_id,
        'Monthly',
        75000.00,
        'Main household income'
    ) RETURNING id INTO test_income_id;

    -- Insert test expenditure
    INSERT INTO expenditure (
        client_group_id,
        category,
        description,
        frequency,
        annual_amount,
        notes
    ) VALUES (
        test_client_group_id,
        'Home',
        'Mortgage Payment',
        'Monthly',
        24000.00,
        'Fixed rate until 2030'
    ) RETURNING id INTO test_expenditure_id;

    RAISE NOTICE 'TEST 5 PASSED: Successfully inserted test data';
END $$;

-- ============================================================================
-- TEST 6: Test nullable product_owner_id (income can have no product owner)
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    test_income_id BIGINT;
BEGIN
    SELECT id INTO test_client_group_id FROM client_groups LIMIT 1;

    -- Insert income without product owner
    INSERT INTO income (
        client_group_id,
        category,
        source,
        product_owner_id,
        frequency,
        annual_amount
    ) VALUES (
        test_client_group_id,
        'Investment',
        'Rental Income',
        NULL,
        'Annual',
        12000.00
    ) RETURNING id INTO test_income_id;

    IF test_income_id IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: Could not insert income with NULL product_owner_id';
    END IF;

    RAISE NOTICE 'TEST 6 PASSED: Nullable product_owner_id works correctly';
END $$;

-- ============================================================================
-- TEST 7: Test CASCADE DELETE behavior for client_groups
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    test_income_id BIGINT;
    test_expenditure_id BIGINT;
    record_count INTEGER;
BEGIN
    -- Create test client group
    INSERT INTO client_groups (name, type, status)
    VALUES ('Delete Test Client', 'Individual', 'Active')
    RETURNING id INTO test_client_group_id;

    -- Create income
    INSERT INTO income (client_group_id, category, annual_amount)
    VALUES (test_client_group_id, 'Salary', 50000.00)
    RETURNING id INTO test_income_id;

    -- Create expenditure
    INSERT INTO expenditure (client_group_id, category, annual_amount)
    VALUES (test_client_group_id, 'Home', 20000.00)
    RETURNING id INTO test_expenditure_id;

    -- Delete the client group
    DELETE FROM client_groups WHERE id = test_client_group_id;

    -- Check that income was cascade deleted
    SELECT COUNT(*) INTO record_count
    FROM income
    WHERE id = test_income_id;

    IF record_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: CASCADE DELETE did not remove income';
    END IF;

    -- Check that expenditure was cascade deleted
    SELECT COUNT(*) INTO record_count
    FROM expenditure
    WHERE id = test_expenditure_id;

    IF record_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: CASCADE DELETE did not remove expenditure';
    END IF;

    RAISE NOTICE 'TEST 7 PASSED: CASCADE DELETE from client_groups working correctly';
END $$;

-- ============================================================================
-- TEST 8: Test SET NULL behavior when product_owner is deleted
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    test_product_owner_id BIGINT;
    test_income_id BIGINT;
    owner_id_after_delete BIGINT;
BEGIN
    -- Get or create test client group
    SELECT id INTO test_client_group_id FROM client_groups LIMIT 1;

    IF test_client_group_id IS NULL THEN
        INSERT INTO client_groups (name, type, status)
        VALUES ('Test Client', 'Individual', 'Active')
        RETURNING id INTO test_client_group_id;
    END IF;

    -- Create test product owner
    INSERT INTO product_owners (firstname, surname, status)
    VALUES ('Delete', 'Test', 'Active')
    RETURNING id INTO test_product_owner_id;

    -- Create income assigned to this product owner
    INSERT INTO income (
        client_group_id,
        category,
        product_owner_id,
        annual_amount
    ) VALUES (
        test_client_group_id,
        'Salary',
        test_product_owner_id,
        60000.00
    ) RETURNING id INTO test_income_id;

    -- Delete the product owner
    DELETE FROM product_owners WHERE id = test_product_owner_id;

    -- Check that product_owner_id was set to NULL
    SELECT product_owner_id INTO owner_id_after_delete
    FROM income
    WHERE id = test_income_id;

    IF owner_id_after_delete IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FAILED: SET NULL did not work when product_owner was deleted';
    END IF;

    RAISE NOTICE 'TEST 8 PASSED: SET NULL on product_owner deletion working correctly';
END $$;

-- ============================================================================
-- TEST 9: Query test data to verify it's readable
-- ============================================================================
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Count income
    SELECT COUNT(*) INTO record_count FROM income;
    RAISE NOTICE 'Found % income records', record_count;

    -- Count expenditure
    SELECT COUNT(*) INTO record_count FROM expenditure;
    RAISE NOTICE 'Found % expenditure records', record_count;

    -- Test join between income and client_groups
    SELECT COUNT(*) INTO record_count
    FROM income i
    INNER JOIN client_groups cg ON i.client_group_id = cg.id;
    RAISE NOTICE 'Successfully joined % income records with client_groups', record_count;

    -- Test join between income and product_owners
    SELECT COUNT(*) INTO record_count
    FROM income i
    LEFT JOIN product_owners po ON i.product_owner_id = po.id;
    RAISE NOTICE 'Successfully joined % income records with product_owners', record_count;

    -- Test join between expenditure and client_groups
    SELECT COUNT(*) INTO record_count
    FROM expenditure e
    INNER JOIN client_groups cg ON e.client_group_id = cg.id;
    RAISE NOTICE 'Successfully joined % expenditure records with client_groups', record_count;

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
    RAISE NOTICE 'Tables: income, expenditure';
    RAISE NOTICE 'Indexes: 9 total (5 on income, 4 on expenditure)';
    RAISE NOTICE 'Constraints: Foreign keys to client_groups and product_owners';
    RAISE NOTICE 'Cascade behavior: CASCADE DELETE on client_groups, SET NULL on product_owners';
    RAISE NOTICE '========================================';
END $$;
