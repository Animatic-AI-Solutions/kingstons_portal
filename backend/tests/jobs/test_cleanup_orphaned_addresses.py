"""
TDD Red Phase: Tests for Orphaned Address Cleanup Job

Tests for cleanup_orphaned_addresses() job that deletes address records
not referenced by any product owners, with a 7-day grace period.

CRITICAL REQUIREMENT: These tests verify the cleanup job that prevents
unbounded growth of the addresses table due to "create new address" strategy.

Reference: docs/specifications/Phase2_People_Tab_Architecture.md Section 9.2

WHY THIS IS REQUIRED:
The "create new address" strategy (used to prevent unintended side effects when
updating addresses) creates orphaned address records over time. Without cleanup,
the addresses table will grow unbounded, impacting query performance.

RED PHASE: All tests should FAIL until cleanup_orphaned_addresses() is implemented.
"""
import pytest
from datetime import datetime, timedelta
from typing import Dict, Any
from unittest.mock import AsyncMock, patch, MagicMock
import time


# =============================================================================
# 1. BASIC CLEANUP (Core Functionality)
# =============================================================================

@pytest.mark.asyncio
async def test_cleanup_deletes_unreferenced_addresses(
    db_connection,
    sample_address_factory
):
    """
    Test that cleanup job deletes addresses not referenced by any product owner.

    This is the core functionality: addresses with no references should be deleted
    if they are older than 7 days.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 3 orphaned addresses (no product owner references)
        - All addresses are 8+ days old (past grace period)
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - All 3 addresses should be deleted from database
        - Return value should equal 3
    """
    # Import the cleanup function (will fail if not implemented)
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create 3 orphaned addresses (8 days old, past grace period)
    orphaned_1 = await sample_address_factory(
        line_1="123 Orphaned St",
        created_at=datetime.utcnow() - timedelta(days=8)
    )
    orphaned_2 = await sample_address_factory(
        line_1="456 Abandoned Ave",
        created_at=datetime.utcnow() - timedelta(days=10)
    )
    orphaned_3 = await sample_address_factory(
        line_1="789 Lonely Ln",
        created_at=datetime.utcnow() - timedelta(days=14)
    )

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify return value
    assert deleted_count == 3, \
        f"Expected 3 addresses deleted, got {deleted_count}"

    # Verify addresses no longer exist in database
    for orphaned_address in [orphaned_1, orphaned_2, orphaned_3]:
        result = await db_connection.fetchrow(
            "SELECT * FROM addresses WHERE id = $1",
            orphaned_address["id"]
        )
        assert result is None, \
            f"Address {orphaned_address['id']} should be deleted but still exists"


@pytest.mark.asyncio
async def test_cleanup_preserves_referenced_addresses(
    db_connection,
    sample_address_factory,
    sample_product_owner_factory
):
    """
    Test that cleanup job preserves addresses referenced by product owners.

    Addresses that are actively referenced should NEVER be deleted, regardless
    of age.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 3 addresses referenced by product owners
        - All addresses are 8+ days old (past grace period)
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - All 3 addresses should remain in database (not deleted)
        - Return value should equal 0 (nothing deleted)
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create 3 addresses with product owner references (8 days old)
    address_1 = await sample_address_factory(
        line_1="100 Referenced St",
        created_at=datetime.utcnow() - timedelta(days=8)
    )
    owner_1 = await sample_product_owner_factory(
        firstname="John",
        surname="Doe",
        address_id=address_1["id"]
    )

    address_2 = await sample_address_factory(
        line_1="200 Active Ave",
        created_at=datetime.utcnow() - timedelta(days=10)
    )
    owner_2 = await sample_product_owner_factory(
        firstname="Jane",
        surname="Smith",
        address_id=address_2["id"]
    )

    address_3 = await sample_address_factory(
        line_1="300 Protected Pl",
        created_at=datetime.utcnow() - timedelta(days=14)
    )
    owner_3 = await sample_product_owner_factory(
        firstname="Bob",
        surname="Johnson",
        address_id=address_3["id"]
    )

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify return value (nothing deleted)
    assert deleted_count == 0, \
        f"Expected 0 addresses deleted (all referenced), got {deleted_count}"

    # Verify all addresses still exist in database
    for address in [address_1, address_2, address_3]:
        result = await db_connection.fetchrow(
            "SELECT * FROM addresses WHERE id = $1",
            address["id"]
        )
        assert result is not None, \
            f"Referenced address {address['id']} should not be deleted"


# =============================================================================
# 2. GRACE PERIOD (7-Day Safety Window)
# =============================================================================

@pytest.mark.asyncio
async def test_cleanup_respects_7_day_grace_period(
    db_connection,
    sample_address_factory
):
    """
    Test that cleanup job respects 7-day grace period for new addresses.

    Orphaned addresses less than 7 days old should NOT be deleted (safety window).

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 3 orphaned addresses that are only 3, 5, and 6 days old
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - All 3 addresses should remain in database (too new to delete)
        - Return value should equal 0
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create orphaned addresses within grace period
    recent_1 = await sample_address_factory(
        line_1="111 Recent St",
        created_at=datetime.utcnow() - timedelta(days=3)
    )
    recent_2 = await sample_address_factory(
        line_1="222 New Ave",
        created_at=datetime.utcnow() - timedelta(days=5)
    )
    recent_3 = await sample_address_factory(
        line_1="333 Fresh Ln",
        created_at=datetime.utcnow() - timedelta(days=6)
    )

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify nothing deleted
    assert deleted_count == 0, \
        f"Expected 0 addresses deleted (within grace period), got {deleted_count}"

    # Verify all addresses still exist
    for address in [recent_1, recent_2, recent_3]:
        result = await db_connection.fetchrow(
            "SELECT * FROM addresses WHERE id = $1",
            address["id"]
        )
        assert result is not None, \
            f"Address {address['id']} within grace period should not be deleted"


@pytest.mark.asyncio
async def test_cleanup_deletes_addresses_older_than_7_days(
    db_connection,
    sample_address_factory
):
    """
    Test that cleanup job deletes orphaned addresses older than 7 days.

    Orphaned addresses 8+ days old should be deleted.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 3 orphaned addresses that are 8, 10, and 14 days old
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - All 3 addresses should be deleted
        - Return value should equal 3
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create old orphaned addresses (past grace period)
    old_1 = await sample_address_factory(
        line_1="444 Old St",
        created_at=datetime.utcnow() - timedelta(days=8)
    )
    old_2 = await sample_address_factory(
        line_1="555 Ancient Ave",
        created_at=datetime.utcnow() - timedelta(days=10)
    )
    old_3 = await sample_address_factory(
        line_1="666 Vintage Ln",
        created_at=datetime.utcnow() - timedelta(days=14)
    )

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify all deleted
    assert deleted_count == 3, \
        f"Expected 3 addresses deleted (past grace period), got {deleted_count}"

    # Verify addresses no longer exist
    for address in [old_1, old_2, old_3]:
        result = await db_connection.fetchrow(
            "SELECT * FROM addresses WHERE id = $1",
            address["id"]
        )
        assert result is None, \
            f"Old orphaned address {address['id']} should be deleted"


# =============================================================================
# 3. NULL ADDRESS HANDLING
# =============================================================================

@pytest.mark.asyncio
async def test_cleanup_handles_null_address_ids(
    db_connection,
    sample_address_factory,
    sample_product_owner_factory
):
    """
    Test that cleanup job handles product owners with NULL address_id.

    Product owners with address_id = NULL should not protect any addresses
    from deletion.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 2 product owners with address_id = NULL
        - 2 orphaned addresses (not referenced)
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - Both orphaned addresses should be deleted (NULL doesn't protect them)
        - Return value should equal 2
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create product owners with NULL address_id
    owner_1 = await sample_product_owner_factory(
        firstname="Null",
        surname="One",
        address_id=None
    )
    owner_2 = await sample_product_owner_factory(
        firstname="Null",
        surname="Two",
        address_id=None
    )

    # Create orphaned addresses (not referenced by anyone)
    orphaned_1 = await sample_address_factory(
        line_1="777 Orphaned St",
        created_at=datetime.utcnow() - timedelta(days=8)
    )
    orphaned_2 = await sample_address_factory(
        line_1="888 Unlinked Ave",
        created_at=datetime.utcnow() - timedelta(days=10)
    )

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify both orphaned addresses deleted
    assert deleted_count == 2, \
        f"Expected 2 addresses deleted (NULL address_id doesn't protect), got {deleted_count}"

    # Verify addresses no longer exist
    for address in [orphaned_1, orphaned_2]:
        result = await db_connection.fetchrow(
            "SELECT * FROM addresses WHERE id = $1",
            address["id"]
        )
        assert result is None, \
            f"Orphaned address {address['id']} should be deleted (NULL doesn't protect)"


# =============================================================================
# 4. MULTIPLE PRODUCT OWNERS SHARING ADDRESS
# =============================================================================

@pytest.mark.asyncio
async def test_cleanup_preserves_shared_addresses(
    db_connection,
    sample_address_factory,
    sample_product_owner_factory
):
    """
    Test that cleanup job preserves addresses shared by multiple product owners.

    An address referenced by multiple owners should NOT be deleted, even if old.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 1 address referenced by 3 product owners (shared address)
        - Address is 10 days old (past grace period)
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - Address should remain in database (still referenced)
        - Return value should equal 0
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create shared address (10 days old)
    shared_address = await sample_address_factory(
        line_1="999 Family Home",
        created_at=datetime.utcnow() - timedelta(days=10)
    )

    # Create 3 product owners sharing the same address
    owner_1 = await sample_product_owner_factory(
        firstname="Husband",
        surname="Smith",
        address_id=shared_address["id"]
    )
    owner_2 = await sample_product_owner_factory(
        firstname="Wife",
        surname="Smith",
        address_id=shared_address["id"]
    )
    owner_3 = await sample_product_owner_factory(
        firstname="Child",
        surname="Smith",
        address_id=shared_address["id"]
    )

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify nothing deleted
    assert deleted_count == 0, \
        f"Expected 0 addresses deleted (shared address), got {deleted_count}"

    # Verify shared address still exists
    result = await db_connection.fetchrow(
        "SELECT * FROM addresses WHERE id = $1",
        shared_address["id"]
    )
    assert result is not None, \
        f"Shared address {shared_address['id']} should not be deleted"


@pytest.mark.asyncio
async def test_cleanup_deletes_address_when_last_reference_removed(
    db_connection,
    sample_address_factory,
    sample_product_owner_factory
):
    """
    Test that cleanup job deletes address when last reference is removed.

    When the last product owner referencing an address is deleted or updated,
    the address should become eligible for cleanup after grace period.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 1 address referenced by 1 product owner (8 days old)
        - Product owner is deleted (reference removed)
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - Address should be deleted (no longer referenced, past grace period)
        - Return value should equal 1
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create address with one reference (8 days old)
    address = await sample_address_factory(
        line_1="101 Last Reference St",
        created_at=datetime.utcnow() - timedelta(days=8)
    )

    # Create product owner referencing the address
    owner = await sample_product_owner_factory(
        firstname="Last",
        surname="Owner",
        address_id=address["id"]
    )

    # Verify address is referenced (should NOT be deleted yet)
    deleted_count_before = await cleanup_orphaned_addresses(db_connection)
    assert deleted_count_before == 0, \
        "Address should not be deleted while referenced"

    # Remove the last reference by deleting the product owner
    await db_connection.execute(
        "DELETE FROM product_owners WHERE id = $1",
        owner["id"]
    )

    # Run cleanup job again (address is now orphaned)
    deleted_count_after = await cleanup_orphaned_addresses(db_connection)

    # Verify address deleted
    assert deleted_count_after == 1, \
        f"Expected 1 address deleted (last reference removed), got {deleted_count_after}"

    # Verify address no longer exists
    result = await db_connection.fetchrow(
        "SELECT * FROM addresses WHERE id = $1",
        address["id"]
    )
    assert result is None, \
        f"Address {address['id']} should be deleted after last reference removed"


# =============================================================================
# 5. RETURN VALUE & LOGGING
# =============================================================================

@pytest.mark.asyncio
async def test_cleanup_returns_deleted_count(
    db_connection,
    sample_address_factory
):
    """
    Test that cleanup job returns correct count of deleted addresses.

    The function should return an integer representing the number of addresses
    deleted in the cleanup operation.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 5 orphaned addresses (all 8+ days old)
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - Return value should equal 5
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create 5 orphaned addresses (past grace period)
    addresses = []
    for i in range(5):
        address = await sample_address_factory(
            line_1=f"{200 + i} Orphaned St",
            created_at=datetime.utcnow() - timedelta(days=8)
        )
        addresses.append(address)

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify exact count
    assert deleted_count == 5, \
        f"Expected exactly 5 addresses deleted, got {deleted_count}"


@pytest.mark.asyncio
async def test_cleanup_logs_deleted_count(db_connection, sample_address_factory):
    """
    Test that cleanup job logs the number of deleted addresses.

    The function should log an info message with the deleted count for
    monitoring and audit purposes.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 3 orphaned addresses (all 8+ days old)
        - Mock logger
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - logger.info should be called with message containing deleted count
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create 3 orphaned addresses
    for i in range(3):
        await sample_address_factory(
            line_1=f"{300 + i} Logged St",
            created_at=datetime.utcnow() - timedelta(days=8)
        )

    # Mock logger
    with patch('app.jobs.cleanup_orphaned_addresses.logger') as mock_logger:
        # Run cleanup job
        deleted_count = await cleanup_orphaned_addresses(db_connection)

        # Verify logger.info called
        assert mock_logger.info.called, "logger.info should be called"

        # Verify log message contains deleted count
        log_message = mock_logger.info.call_args[0][0]
        assert "3" in log_message or str(deleted_count) in log_message, \
            f"Log message should contain deleted count: {log_message}"
        assert "orphaned" in log_message.lower() or "address" in log_message.lower(), \
            f"Log message should mention addresses: {log_message}"


# =============================================================================
# 6. PERFORMANCE & SCALE
# =============================================================================

@pytest.mark.asyncio
async def test_cleanup_handles_large_number_of_addresses(
    db_connection,
    sample_address_factory
):
    """
    Test that cleanup job handles large number of addresses efficiently.

    The cleanup job should scale efficiently and complete within reasonable
    time even with many orphaned addresses.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 1000 orphaned addresses (all 8+ days old)
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - All 1000 addresses should be deleted
        - Operation should complete in < 5 seconds
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create 1000 orphaned addresses (use batch insert for test performance)
    address_ids = []
    created_at = datetime.utcnow() - timedelta(days=8)

    # Batch insert for test efficiency
    for i in range(1000):
        address = await sample_address_factory(
            line_1=f"{i} Performance Test St",
            created_at=created_at
        )
        address_ids.append(address["id"])

    # Measure cleanup performance
    start_time = time.time()
    deleted_count = await cleanup_orphaned_addresses(db_connection)
    duration = time.time() - start_time

    # Verify all deleted
    assert deleted_count == 1000, \
        f"Expected 1000 addresses deleted, got {deleted_count}"

    # Verify performance (< 5 seconds)
    assert duration < 5.0, \
        f"Cleanup took {duration:.2f}s, should complete in < 5s for 1000 addresses"


# =============================================================================
# 7. EDGE CASES
# =============================================================================

@pytest.mark.asyncio
async def test_cleanup_handles_no_orphaned_addresses(
    db_connection,
    sample_address_factory,
    sample_product_owner_factory
):
    """
    Test that cleanup job handles case where no orphaned addresses exist.

    When all addresses are referenced, cleanup should complete successfully
    without errors.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 5 addresses, all referenced by product owners
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - Return value should equal 0 (nothing to delete)
        - No errors should occur
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create 5 addresses with references
    for i in range(5):
        address = await sample_address_factory(
            line_1=f"{400 + i} Referenced St",
            created_at=datetime.utcnow() - timedelta(days=8)
        )
        await sample_product_owner_factory(
            firstname=f"Owner{i}",
            surname="Test",
            address_id=address["id"]
        )

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify nothing deleted
    assert deleted_count == 0, \
        f"Expected 0 addresses deleted (all referenced), got {deleted_count}"


@pytest.mark.asyncio
async def test_cleanup_handles_all_addresses_orphaned(
    db_connection,
    sample_address_factory
):
    """
    Test that cleanup job handles case where all addresses are orphaned.

    When all addresses are orphaned and past grace period, all should be deleted.

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 10 addresses, all orphaned (no references)
        - All addresses are 10 days old
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - Return value should equal 10 (all deleted)
        - No addresses should remain
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create 10 orphaned addresses
    address_ids = []
    for i in range(10):
        address = await sample_address_factory(
            line_1=f"{500 + i} All Orphaned St",
            created_at=datetime.utcnow() - timedelta(days=10)
        )
        address_ids.append(address["id"])

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify all deleted
    assert deleted_count == 10, \
        f"Expected 10 addresses deleted (all orphaned), got {deleted_count}"

    # Verify no addresses remain
    for address_id in address_ids:
        result = await db_connection.fetchrow(
            "SELECT * FROM addresses WHERE id = $1",
            address_id
        )
        assert result is None, \
            f"Address {address_id} should be deleted"


# =============================================================================
# 8. MIXED SCENARIOS (Real-World Combinations)
# =============================================================================

@pytest.mark.asyncio
async def test_cleanup_mixed_scenario_some_referenced_some_orphaned(
    db_connection,
    sample_address_factory,
    sample_product_owner_factory
):
    """
    Test cleanup with realistic mix of referenced and orphaned addresses.

    This test simulates a real-world scenario with a mix of:
    - Orphaned addresses (should be deleted)
    - Referenced addresses (should be preserved)
    - Recent orphaned addresses (should be preserved due to grace period)

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 3 orphaned addresses (8+ days old) -> should be DELETED
        - 2 referenced addresses (8+ days old) -> should be PRESERVED
        - 2 recent orphaned addresses (3 days old) -> should be PRESERVED
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - Only 3 old orphaned addresses deleted
        - Return value should equal 3
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create 3 old orphaned addresses (should be deleted)
    orphaned_old_1 = await sample_address_factory(
        line_1="100 Old Orphaned St",
        created_at=datetime.utcnow() - timedelta(days=8)
    )
    orphaned_old_2 = await sample_address_factory(
        line_1="101 Old Orphaned St",
        created_at=datetime.utcnow() - timedelta(days=10)
    )
    orphaned_old_3 = await sample_address_factory(
        line_1="102 Old Orphaned St",
        created_at=datetime.utcnow() - timedelta(days=14)
    )

    # Create 2 referenced addresses (should be preserved)
    referenced_1 = await sample_address_factory(
        line_1="200 Referenced St",
        created_at=datetime.utcnow() - timedelta(days=8)
    )
    await sample_product_owner_factory(
        firstname="John",
        surname="Doe",
        address_id=referenced_1["id"]
    )

    referenced_2 = await sample_address_factory(
        line_1="201 Referenced St",
        created_at=datetime.utcnow() - timedelta(days=10)
    )
    await sample_product_owner_factory(
        firstname="Jane",
        surname="Smith",
        address_id=referenced_2["id"]
    )

    # Create 2 recent orphaned addresses (should be preserved - grace period)
    orphaned_recent_1 = await sample_address_factory(
        line_1="300 Recent Orphaned St",
        created_at=datetime.utcnow() - timedelta(days=3)
    )
    orphaned_recent_2 = await sample_address_factory(
        line_1="301 Recent Orphaned St",
        created_at=datetime.utcnow() - timedelta(days=5)
    )

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify only 3 old orphaned addresses deleted
    assert deleted_count == 3, \
        f"Expected 3 addresses deleted (old orphaned only), got {deleted_count}"

    # Verify old orphaned addresses deleted
    for address in [orphaned_old_1, orphaned_old_2, orphaned_old_3]:
        result = await db_connection.fetchrow(
            "SELECT * FROM addresses WHERE id = $1",
            address["id"]
        )
        assert result is None, \
            f"Old orphaned address {address['id']} should be deleted"

    # Verify referenced addresses preserved
    for address in [referenced_1, referenced_2]:
        result = await db_connection.fetchrow(
            "SELECT * FROM addresses WHERE id = $1",
            address["id"]
        )
        assert result is not None, \
            f"Referenced address {address['id']} should be preserved"

    # Verify recent orphaned addresses preserved
    for address in [orphaned_recent_1, orphaned_recent_2]:
        result = await db_connection.fetchrow(
            "SELECT * FROM addresses WHERE id = $1",
            address["id"]
        )
        assert result is not None, \
            f"Recent orphaned address {address['id']} should be preserved (grace period)"


@pytest.mark.asyncio
async def test_cleanup_boundary_exactly_7_days_old(
    db_connection,
    sample_address_factory
):
    """
    Test cleanup behavior for addresses exactly 7 days old (boundary condition).

    The grace period is "> 7 days", so addresses EXACTLY 7 days old should NOT
    be deleted yet (must be OLDER than 7 days).

    RED PHASE: This test should FAIL until cleanup job is implemented.

    Given:
        - 1 orphaned address exactly 7 days old (created_at = now - 7 days)
    When:
        - cleanup_orphaned_addresses() is called
    Then:
        - Address should NOT be deleted (boundary case: needs to be OLDER than 7 days)
        - Return value should equal 0
    """
    from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses

    # Create address exactly 7 days old
    boundary_address = await sample_address_factory(
        line_1="Exactly 7 Days Old St",
        created_at=datetime.utcnow() - timedelta(days=7, hours=0, minutes=0, seconds=0)
    )

    # Run cleanup job
    deleted_count = await cleanup_orphaned_addresses(db_connection)

    # Verify NOT deleted (needs to be OLDER than 7 days)
    assert deleted_count == 0, \
        f"Expected 0 addresses deleted (exactly 7 days is not > 7 days), got {deleted_count}"

    # Verify address still exists
    result = await db_connection.fetchrow(
        "SELECT * FROM addresses WHERE id = $1",
        boundary_address["id"]
    )
    assert result is not None, \
        "Address exactly 7 days old should NOT be deleted (needs to be OLDER than 7 days)"
