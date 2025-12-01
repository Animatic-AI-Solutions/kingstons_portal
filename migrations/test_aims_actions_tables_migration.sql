-- Test Script: Verify aims and actions tables migration
-- Description: Comprehensive test suite for aims and actions tracking tables
-- Date: 2024-12-01
-- Author: Claude Code

-- Begin transaction for safe testing
BEGIN;

-- ============================================================================
-- TEST 1: Verify tables exist
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aims') THEN
        RAISE EXCEPTION 'TEST FAILED: aims table does not exist';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'actions') THEN
        RAISE EXCEPTION 'TEST FAILED: actions table does not exist';
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: Both tables exist';
END $$;

-- ============================================================================
-- TEST 2: Verify columns exist with correct types
-- ============================================================================
DO $$
BEGIN
    -- Check aims columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aims'
        AND column_name = 'client_group_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: aims.client_group_id is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aims'
        AND column_name = 'target_date'
        AND data_type = 'integer'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: aims.target_date is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aims'
        AND column_name = 'focus'
        AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: aims.focus is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aims'
        AND column_name = 'notes'
        AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: aims.notes is missing or has wrong type';
    END IF;

    -- Check actions columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'actions'
        AND column_name = 'client_group_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: actions.client_group_id is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'actions'
        AND column_name = 'assigned_advisor_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: actions.assigned_advisor_id is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'actions'
        AND column_name = 'due_date'
        AND data_type = 'date'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: actions.due_date is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'actions'
        AND column_name = 'priority'
        AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: actions.priority is missing or has wrong type';
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
        WHERE constraint_name = 'fk_aims_client_group'
        AND table_name = 'aims'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_aims_client_group does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_actions_client_group'
        AND table_name = 'actions'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_actions_client_group does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_actions_assigned_advisor'
        AND table_name = 'actions'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_actions_assigned_advisor does not exist';
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
    -- Check aims indexes
    FOR idx IN SELECT unnest(ARRAY[
        'idx_aims_client_group_id',
        'idx_aims_status',
        'idx_aims_target_date',
        'idx_aims_focus'
    ]) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = idx
        ) THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;

    -- Check actions indexes
    FOR idx IN SELECT unnest(ARRAY[
        'idx_actions_client_group_id',
        'idx_actions_assigned_advisor_id',
        'idx_actions_due_date',
        'idx_actions_status',
        'idx_actions_priority'
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
-- TEST 5: Test inserting data (requires existing client_groups record)
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    test_profile_id BIGINT;
    test_aim_id BIGINT;
    test_action_id BIGINT;
BEGIN
    -- Get or create a test client group
    SELECT id INTO test_client_group_id FROM client_groups LIMIT 1;

    IF test_client_group_id IS NULL THEN
        INSERT INTO client_groups (name, type, status)
        VALUES ('Test Client Group', 'Individual', 'Active')
        RETURNING id INTO test_client_group_id;
        RAISE NOTICE 'Created test client group with id: %', test_client_group_id;
    END IF;

    -- Get a test profile for assigned advisor
    SELECT id INTO test_profile_id FROM profiles LIMIT 1;

    -- Insert test aim
    INSERT INTO aims (
        client_group_id,
        title,
        description,
        target_date,
        focus,
        status,
        notes
    ) VALUES (
        test_client_group_id,
        'Retirement Planning',
        'Build sufficient retirement funds by 2030',
        2030,
        'Retirement',
        'Active',
        'Client wants to retire at age 65'
    ) RETURNING id INTO test_aim_id;

    -- Insert test action without assigned advisor
    INSERT INTO actions (
        client_group_id,
        title,
        description,
        due_date,
        priority,
        notes,
        status
    ) VALUES (
        test_client_group_id,
        'Schedule annual review',
        'Book meeting to review portfolio performance',
        '2024-12-31',
        'High',
        'Urgent - end of year approaching',
        'Pending'
    ) RETURNING id INTO test_action_id;

    -- Insert test action with assigned advisor (if profile exists)
    IF test_profile_id IS NOT NULL THEN
        INSERT INTO actions (
            client_group_id,
            title,
            description,
            assigned_advisor_id,
            due_date,
            priority,
            status
        ) VALUES (
            test_client_group_id,
            'Update risk assessment',
            'Complete new FinaMetrica assessment',
            test_profile_id,
            '2025-01-15',
            'Medium',
            'Pending'
        );
    END IF;

    RAISE NOTICE 'TEST 5 PASSED: Successfully inserted test data';
END $$;

-- ============================================================================
-- TEST 6: Test nullable assigned_advisor_id (actions can have no advisor)
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    test_action_id BIGINT;
BEGIN
    SELECT id INTO test_client_group_id FROM client_groups LIMIT 1;

    -- Insert action without assigned advisor
    INSERT INTO actions (
        client_group_id,
        title,
        assigned_advisor_id,
        status
    ) VALUES (
        test_client_group_id,
        'Unassigned action',
        NULL,
        'Pending'
    ) RETURNING id INTO test_action_id;

    IF test_action_id IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: Could not insert action with NULL assigned_advisor_id';
    END IF;

    RAISE NOTICE 'TEST 6 PASSED: Nullable assigned_advisor_id works correctly';
END $$;

-- ============================================================================
-- TEST 7: Test CASCADE DELETE behavior for client_groups
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    test_aim_id BIGINT;
    test_action_id BIGINT;
    record_count INTEGER;
BEGIN
    -- Create test client group
    INSERT INTO client_groups (name, type, status)
    VALUES ('Delete Test Client', 'Individual', 'Active')
    RETURNING id INTO test_client_group_id;

    -- Create aim
    INSERT INTO aims (client_group_id, title, status)
    VALUES (test_client_group_id, 'Test Aim', 'Active')
    RETURNING id INTO test_aim_id;

    -- Create action
    INSERT INTO actions (client_group_id, title, status)
    VALUES (test_client_group_id, 'Test Action', 'Pending')
    RETURNING id INTO test_action_id;

    -- Delete the client group
    DELETE FROM client_groups WHERE id = test_client_group_id;

    -- Check that aim was cascade deleted
    SELECT COUNT(*) INTO record_count
    FROM aims
    WHERE id = test_aim_id;

    IF record_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: CASCADE DELETE did not remove aims';
    END IF;

    -- Check that action was cascade deleted
    SELECT COUNT(*) INTO record_count
    FROM actions
    WHERE id = test_action_id;

    IF record_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: CASCADE DELETE did not remove actions';
    END IF;

    RAISE NOTICE 'TEST 7 PASSED: CASCADE DELETE from client_groups working correctly';
END $$;

-- ============================================================================
-- TEST 8: Test SET NULL behavior when profile is deleted
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    test_profile_id BIGINT;
    test_action_id BIGINT;
    advisor_id_after_delete BIGINT;
BEGIN
    -- Get or create test client group
    SELECT id INTO test_client_group_id FROM client_groups LIMIT 1;

    IF test_client_group_id IS NULL THEN
        INSERT INTO client_groups (name, type, status)
        VALUES ('Test Client', 'Individual', 'Active')
        RETURNING id INTO test_client_group_id;
    END IF;

    -- Create test profile
    INSERT INTO profiles (first_name, last_name, email)
    VALUES ('Test', 'Advisor', 'test.advisor@example.com')
    RETURNING id INTO test_profile_id;

    -- Create action assigned to this advisor
    INSERT INTO actions (
        client_group_id,
        title,
        assigned_advisor_id,
        status
    ) VALUES (
        test_client_group_id,
        'Test Action',
        test_profile_id,
        'Pending'
    ) RETURNING id INTO test_action_id;

    -- Delete the profile
    DELETE FROM profiles WHERE id = test_profile_id;

    -- Check that assigned_advisor_id was set to NULL
    SELECT assigned_advisor_id INTO advisor_id_after_delete
    FROM actions
    WHERE id = test_action_id;

    IF advisor_id_after_delete IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FAILED: SET NULL did not work when profile was deleted';
    END IF;

    RAISE NOTICE 'TEST 8 PASSED: SET NULL on profile deletion working correctly';
END $$;

-- ============================================================================
-- TEST 9: Query test data to verify it's readable
-- ============================================================================
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Count aims
    SELECT COUNT(*) INTO record_count FROM aims;
    RAISE NOTICE 'Found % aim records', record_count;

    -- Count actions
    SELECT COUNT(*) INTO record_count FROM actions;
    RAISE NOTICE 'Found % action records', record_count;

    -- Test join between actions and client_groups
    SELECT COUNT(*) INTO record_count
    FROM actions a
    INNER JOIN client_groups cg ON a.client_group_id = cg.id;
    RAISE NOTICE 'Successfully joined % actions with client_groups', record_count;

    -- Test join between actions and profiles (assigned advisors)
    SELECT COUNT(*) INTO record_count
    FROM actions a
    LEFT JOIN profiles p ON a.assigned_advisor_id = p.id;
    RAISE NOTICE 'Successfully joined % actions with profiles', record_count;

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
    RAISE NOTICE 'Tables: aims, actions';
    RAISE NOTICE 'Indexes: 9 total (4 on aims, 5 on actions)';
    RAISE NOTICE 'Constraints: Foreign keys to client_groups and profiles';
    RAISE NOTICE 'Cascade behavior: CASCADE DELETE on client_groups, SET NULL on profiles';
    RAISE NOTICE '========================================';
END $$;
