-- Test Script: Verify assigned_meetings and meeting_history tables migration
-- Description: Comprehensive test suite for meeting tracking tables
-- Date: 2024-12-01
-- Author: Claude Code

-- Begin transaction for safe testing
BEGIN;

-- ============================================================================
-- TEST 1: Verify tables exist
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assigned_meetings') THEN
        RAISE EXCEPTION 'TEST FAILED: assigned_meetings table does not exist';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_history') THEN
        RAISE EXCEPTION 'TEST FAILED: meeting_history table does not exist';
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: Both tables exist';
END $$;

-- ============================================================================
-- TEST 2: Verify columns exist with correct types
-- ============================================================================
DO $$
BEGIN
    -- Check assigned_meetings columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assigned_meetings'
        AND column_name = 'client_group_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: assigned_meetings.client_group_id is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assigned_meetings'
        AND column_name = 'expected_month'
        AND data_type = 'integer'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: assigned_meetings.expected_month is missing or has wrong type';
    END IF;

    -- Check meeting_history columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'meeting_history'
        AND column_name = 'assigned_meeting_id'
        AND data_type = 'bigint'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: meeting_history.assigned_meeting_id is missing or has wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'meeting_history'
        AND column_name = 'date_booked_for'
        AND data_type = 'date'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: meeting_history.date_booked_for is missing or has wrong type';
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
        WHERE constraint_name = 'fk_assigned_meetings_client_group'
        AND table_name = 'assigned_meetings'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_assigned_meetings_client_group does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_meeting_history_assigned_meeting'
        AND table_name = 'meeting_history'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: FK constraint fk_meeting_history_assigned_meeting does not exist';
    END IF;

    RAISE NOTICE 'TEST 3 PASSED: All foreign key constraints exist';
END $$;

-- ============================================================================
-- TEST 4: Verify CHECK constraint on expected_month
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_expected_month_range'
        AND table_name = 'assigned_meetings'
        AND constraint_type = 'CHECK'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: CHECK constraint chk_expected_month_range does not exist';
    END IF;

    RAISE NOTICE 'TEST 4 PASSED: CHECK constraint exists';
END $$;

-- ============================================================================
-- TEST 5: Verify all indexes exist
-- ============================================================================
DO $$
DECLARE
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
    idx TEXT;
BEGIN
    -- Check assigned_meetings indexes
    FOR idx IN SELECT unnest(ARRAY[
        'idx_assigned_meetings_client_group_id',
        'idx_assigned_meetings_meeting_type',
        'idx_assigned_meetings_expected_month',
        'idx_assigned_meetings_status'
    ]) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = idx
        ) THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;

    -- Check meeting_history indexes
    FOR idx IN SELECT unnest(ARRAY[
        'idx_meeting_history_assigned_meeting_id',
        'idx_meeting_history_date_booked_for',
        'idx_meeting_history_date_actually_held',
        'idx_meeting_history_year',
        'idx_meeting_history_status'
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
-- TEST 6: Test inserting data (requires existing client_groups record)
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    test_assigned_meeting_id BIGINT;
BEGIN
    -- Get or create a test client group
    SELECT id INTO test_client_group_id FROM client_groups LIMIT 1;

    IF test_client_group_id IS NULL THEN
        INSERT INTO client_groups (name, type, status)
        VALUES ('Test Client Group', 'Individual', 'Active')
        RETURNING id INTO test_client_group_id;
        RAISE NOTICE 'Created test client group with id: %', test_client_group_id;
    END IF;

    -- Insert test assigned meeting
    INSERT INTO assigned_meetings (
        client_group_id,
        meeting_type,
        expected_month,
        status,
        notes
    ) VALUES (
        test_client_group_id,
        'Annual Review',
        6,
        'Scheduled',
        'Mid-year portfolio review'
    ) RETURNING id INTO test_assigned_meeting_id;

    -- Insert test meeting history
    INSERT INTO meeting_history (
        assigned_meeting_id,
        date_booked_for,
        date_actually_held,
        status,
        year,
        notes
    ) VALUES (
        test_assigned_meeting_id,
        '2024-06-15',
        '2024-06-15',
        'Completed',
        2024,
        'Successful review meeting'
    );

    RAISE NOTICE 'TEST 6 PASSED: Successfully inserted test data';
END $$;

-- ============================================================================
-- TEST 7: Test expected_month constraint (should fail for invalid months)
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    constraint_working BOOLEAN := FALSE;
BEGIN
    SELECT id INTO test_client_group_id FROM client_groups LIMIT 1;

    -- Try to insert invalid month (should fail)
    BEGIN
        INSERT INTO assigned_meetings (client_group_id, expected_month)
        VALUES (test_client_group_id, 13);
        RAISE EXCEPTION 'TEST FAILED: CHECK constraint allowed month value of 13';
    EXCEPTION
        WHEN check_violation THEN
            constraint_working := TRUE;
    END;

    -- Try to insert another invalid month (should fail)
    BEGIN
        INSERT INTO assigned_meetings (client_group_id, expected_month)
        VALUES (test_client_group_id, 0);
        RAISE EXCEPTION 'TEST FAILED: CHECK constraint allowed month value of 0';
    EXCEPTION
        WHEN check_violation THEN
            constraint_working := TRUE;
    END;

    IF constraint_working THEN
        RAISE NOTICE 'TEST 7 PASSED: expected_month CHECK constraint working correctly';
    END IF;
END $$;

-- ============================================================================
-- TEST 8: Test CASCADE DELETE behavior
-- ============================================================================
DO $$
DECLARE
    test_client_group_id BIGINT;
    test_assigned_meeting_id BIGINT;
    meeting_count INTEGER;
BEGIN
    -- Create test client group
    INSERT INTO client_groups (name, type, status)
    VALUES ('Delete Test Client', 'Individual', 'Active')
    RETURNING id INTO test_client_group_id;

    -- Create assigned meeting
    INSERT INTO assigned_meetings (client_group_id, meeting_type, expected_month)
    VALUES (test_client_group_id, 'Test Meeting', 6)
    RETURNING id INTO test_assigned_meeting_id;

    -- Create meeting history
    INSERT INTO meeting_history (assigned_meeting_id, status, year)
    VALUES (test_assigned_meeting_id, 'Test', 2024);

    -- Delete the client group
    DELETE FROM client_groups WHERE id = test_client_group_id;

    -- Check that assigned meeting was cascade deleted
    SELECT COUNT(*) INTO meeting_count
    FROM assigned_meetings
    WHERE id = test_assigned_meeting_id;

    IF meeting_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: CASCADE DELETE did not remove assigned_meetings';
    END IF;

    -- Check that meeting history was cascade deleted
    SELECT COUNT(*) INTO meeting_count
    FROM meeting_history
    WHERE assigned_meeting_id = test_assigned_meeting_id;

    IF meeting_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: CASCADE DELETE did not remove meeting_history';
    END IF;

    RAISE NOTICE 'TEST 8 PASSED: CASCADE DELETE working correctly';
END $$;

-- ============================================================================
-- TEST 9: Query test data to verify it's readable
-- ============================================================================
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Count assigned meetings
    SELECT COUNT(*) INTO record_count FROM assigned_meetings;
    RAISE NOTICE 'Found % assigned meeting records', record_count;

    -- Count meeting history
    SELECT COUNT(*) INTO record_count FROM meeting_history;
    RAISE NOTICE 'Found % meeting history records', record_count;

    -- Test join between tables
    SELECT COUNT(*) INTO record_count
    FROM meeting_history mh
    INNER JOIN assigned_meetings am ON mh.assigned_meeting_id = am.id;
    RAISE NOTICE 'Successfully joined % meeting history records with assigned meetings', record_count;

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
    RAISE NOTICE 'Tables: assigned_meetings, meeting_history';
    RAISE NOTICE 'Indexes: 9 total (4 on assigned_meetings, 5 on meeting_history)';
    RAISE NOTICE 'Constraints: Foreign keys, CHECK constraint on expected_month';
    RAISE NOTICE 'Cascade behavior: Verified';
    RAISE NOTICE '========================================';
END $$;
