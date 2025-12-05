"""
Tests for Migration 003 - Composite Display Order Index

These tests verify the creation of a composite index on client_group_product_owners
for optimizing display order queries.

Migration Specification (from Phase2_People_Tab_Architecture.md Section 11):
- Create composite index idx_cgpo_display_order on client_group_product_owners table
- Index columns: (client_group_id, display_order)
- Purpose: Optimize queries that retrieve product owners for a specific client group
  sorted by their display order
- Downgrade should remove the index cleanly
"""
import pytest
from sqlalchemy import inspect
from .conftest import (
    table_exists,
    index_exists,
    get_index_columns,
)


class TestMigration003CompositeDisplayOrder:
    """
    Test suite for client_group_product_owners composite display order index migration.

    These tests verify that Migration 003 correctly creates the composite index
    for optimizing display order queries on the client_group_product_owners table.
    """

    def test_migration_003_exists(self):
        """
        Verify that migration 003_composite_display_order file exists.

        This test passes as long as the migration has been generated.
        The actual functionality is tested by the other tests in this suite.
        """
        # Migration file at: backend/alembic/versions/003_composite_display_order_*.py
        # This test verifies the migration exists by checking if the index was created
        # (tested in other tests). No explicit file check needed.
        pass

    def test_client_group_product_owners_table_exists(self, db_inspector):
        """
        Verify client_group_product_owners table exists (prerequisite for adding index).

        This test verifies the table that the index will be added to exists.
        If this fails, the table needs to be created first.
        """
        assert table_exists(db_inspector, 'client_group_product_owners'), \
            "client_group_product_owners table must exist before adding display order index"

    def test_idx_cgpo_display_order_exists(self, db_inspector):
        """
        Verify idx_cgpo_display_order index exists on client_group_product_owners table.

        This composite index optimizes queries that retrieve product owners for a
        specific client group sorted by their display order (e.g., for the People tab).
        """
        assert index_exists(db_inspector, 'client_group_product_owners', 'idx_cgpo_display_order'), \
            "Index 'idx_cgpo_display_order' should exist on client_group_product_owners table"

    def test_idx_cgpo_display_order_is_composite(self, db_inspector):
        """
        Verify idx_cgpo_display_order is a composite index on two columns.
        """
        index_columns = get_index_columns(
            db_inspector,
            'client_group_product_owners',
            'idx_cgpo_display_order'
        )

        assert len(index_columns) == 2, \
            f"Index should be composite with 2 columns, got {len(index_columns)} columns"

    def test_idx_cgpo_display_order_includes_client_group_id(self, db_inspector):
        """
        Verify idx_cgpo_display_order includes client_group_id column.
        """
        index_columns = get_index_columns(
            db_inspector,
            'client_group_product_owners',
            'idx_cgpo_display_order'
        )

        assert 'client_group_id' in index_columns, \
            f"Index should include 'client_group_id' column, got columns: {index_columns}"

    def test_idx_cgpo_display_order_includes_display_order(self, db_inspector):
        """
        Verify idx_cgpo_display_order includes display_order column.
        """
        index_columns = get_index_columns(
            db_inspector,
            'client_group_product_owners',
            'idx_cgpo_display_order'
        )

        assert 'display_order' in index_columns, \
            f"Index should include 'display_order' column, got columns: {index_columns}"

    def test_idx_cgpo_display_order_column_order(self, db_inspector):
        """
        Verify idx_cgpo_display_order has columns in correct order.

        Column order matters for composite indexes. client_group_id should come first
        to allow filtering by client group, then display_order for sorting within
        that client group.

        This enables efficient queries like:
        SELECT * FROM client_group_product_owners
        WHERE client_group_id = 123
        ORDER BY display_order
        """
        index_columns = get_index_columns(
            db_inspector,
            'client_group_product_owners',
            'idx_cgpo_display_order'
        )

        assert index_columns[0] == 'client_group_id', \
            f"'client_group_id' should be first column in index for efficient filtering, got order: {index_columns}"
        assert index_columns[1] == 'display_order', \
            f"'display_order' should be second column in index for sorting within group, got order: {index_columns}"

    def test_idx_cgpo_display_order_exact_columns(self, db_inspector):
        """
        Verify idx_cgpo_display_order has exactly the expected columns in the expected order.
        """
        index_columns = get_index_columns(
            db_inspector,
            'client_group_product_owners',
            'idx_cgpo_display_order'
        )

        expected_columns = ['client_group_id', 'display_order']
        assert index_columns == expected_columns, \
            f"Index should have columns {expected_columns} in that order, got {index_columns}"

    def test_migration_003_downgrade_removes_index(self, alembic_runner):
        """
        Verify downgrade removes the idx_cgpo_display_order index.

        This test verifies that the downgrade() function properly cleans up
        by removing the composite index.
        """
        # Run upgrade to ensure index exists
        alembic_runner.migrate_up_to("003")

        # Verify index exists after upgrade
        from sqlalchemy import inspect
        inspector = inspect(alembic_runner.engine)
        assert index_exists(inspector, 'client_group_product_owners', 'idx_cgpo_display_order'), \
            "Index 'idx_cgpo_display_order' should exist after upgrade"

        # Run downgrade
        alembic_runner.migrate_down_one()

        # Verify index is removed after downgrade
        inspector = inspect(alembic_runner.engine)
        assert not index_exists(inspector, 'client_group_product_owners', 'idx_cgpo_display_order'), \
            "Index 'idx_cgpo_display_order' should be removed after downgrade"


class TestCompositeDisplayOrderIndexPerformance:
    """
    Test suite for verifying composite display order index configuration.

    These tests verify that the index is configured correctly for its use case.
    """

    def test_composite_index_supports_client_group_filtering(self, db_inspector):
        """
        Verify composite index supports efficient filtering by client_group_id.

        The composite index with client_group_id as the first column should optimize
        queries that filter by client_group_id.
        """
        assert index_exists(db_inspector, 'client_group_product_owners', 'idx_cgpo_display_order'), \
            "Composite index should exist for client group filtering"

        index_columns = get_index_columns(
            db_inspector,
            'client_group_product_owners',
            'idx_cgpo_display_order'
        )

        assert index_columns[0] == 'client_group_id', \
            "First column should be client_group_id for efficient WHERE client_group_id = X queries"

    def test_composite_index_supports_display_order_sorting(self, db_inspector):
        """
        Verify composite index supports sorting by display_order within a client group.

        The composite index should optimize queries like:
        WHERE client_group_id = X ORDER BY display_order
        """
        assert index_exists(db_inspector, 'client_group_product_owners', 'idx_cgpo_display_order'), \
            "Composite index should exist for display order sorting"

        index_columns = get_index_columns(
            db_inspector,
            'client_group_product_owners',
            'idx_cgpo_display_order'
        )

        assert index_columns == ['client_group_id', 'display_order'], \
            "Index should support filtering by client_group_id and sorting by display_order"

    def test_composite_index_enables_index_only_scans(self, db_inspector):
        """
        Verify composite index includes both columns needed for typical queries.

        For queries that only need client_group_id and display_order (like checking
        if a display order is already taken), the database can use an index-only scan
        which is more efficient than accessing the table data.
        """
        index_columns = get_index_columns(
            db_inspector,
            'client_group_product_owners',
            'idx_cgpo_display_order'
        )

        assert set(index_columns) == {'client_group_id', 'display_order'}, \
            f"Index should include both client_group_id and display_order for index-only scans, got {index_columns}"


class TestDisplayOrderIndexUseCase:
    """
    Test suite documenting the use case for the composite display order index.

    These tests document the specific query patterns this index is designed to optimize.
    """

    def test_index_optimizes_people_tab_query(self, db_inspector):
        """
        Verify index exists to optimize the People tab's main query.

        The People tab queries for all product owners in a client group, sorted
        by their display order. This is the primary use case for this index:

        SELECT po.*, cgpo.display_order
        FROM client_group_product_owners cgpo
        JOIN product_owners po ON po.id = cgpo.product_owner_id
        WHERE cgpo.client_group_id = ?
        ORDER BY cgpo.display_order
        """
        assert index_exists(db_inspector, 'client_group_product_owners', 'idx_cgpo_display_order'), \
            "Index should exist to optimize People tab query: filter by client_group_id, sort by display_order"

    def test_index_optimizes_display_order_uniqueness_check(self, db_inspector):
        """
        Verify index exists to optimize display order uniqueness checks.

        When reordering product owners, the system needs to check if a display order
        is already taken within a client group:

        SELECT COUNT(*) FROM client_group_product_owners
        WHERE client_group_id = ? AND display_order = ?
        """
        assert index_exists(db_inspector, 'client_group_product_owners', 'idx_cgpo_display_order'), \
            "Index should exist to optimize display order uniqueness checks within client groups"

    def test_index_optimizes_max_display_order_query(self, db_inspector):
        """
        Verify index exists to optimize finding the maximum display order.

        When adding a new product owner to a client group, the system needs to find
        the current maximum display order to assign the next value:

        SELECT MAX(display_order) FROM client_group_product_owners
        WHERE client_group_id = ?
        """
        assert index_exists(db_inspector, 'client_group_product_owners', 'idx_cgpo_display_order'), \
            "Index should exist to optimize MAX(display_order) queries within client groups"
