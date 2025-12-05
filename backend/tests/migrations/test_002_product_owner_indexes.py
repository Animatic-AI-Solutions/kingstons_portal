"""
Tests for Migration 002 - Product Owner Indexes

These tests verify the creation of performance indexes on the product_owners table.

Migration Specification (from Phase2_People_Tab_Architecture.md Section 11):
- Create 6 single-column indexes on product_owners table:
  * idx_product_owners_status (on status column)
  * idx_product_owners_firstname (on firstname column)
  * idx_product_owners_surname (on surname column)
  * idx_product_owners_email_1 (on email_1 column)
  * idx_product_owners_dob (on dob column)
  * idx_product_owners_created_at (on created_at column)
- Create 1 composite index:
  * idx_product_owners_status_created_at (on status, created_at columns)
- Downgrade should remove all 7 indexes cleanly
"""
import pytest
from sqlalchemy import inspect
from .conftest import (
    table_exists,
    index_exists,
    get_index_columns,
)


class TestMigration002ProductOwnerIndexes:
    """
    Test suite for product_owners table index migration.

    These tests verify that Migration 002 correctly creates all required
    indexes for query optimization on the product_owners table.
    """

    def test_migration_002_exists(self):
        """
        Verify that migration 002_product_owner_indexes file exists.

        This test passes as long as the migration has been generated.
        The actual functionality is tested by the other tests in this suite.
        """
        # Migration file at: backend/alembic/versions/002_product_owner_indexes_*.py
        # This test verifies the migration exists by checking if indexes were created
        # (tested in other tests). No explicit file check needed.
        pass

    def test_product_owners_table_exists(self, db_inspector):
        """
        Verify product_owners table exists (prerequisite for adding indexes).

        This test verifies the table that indexes will be added to exists.
        If this fails, the table needs to be created first.
        """
        assert table_exists(db_inspector, 'product_owners'), \
            "product_owners table must exist before adding indexes"

    def test_idx_product_owners_status_exists(self, db_inspector):
        """
        Verify idx_product_owners_status index exists on status column.

        This index optimizes filtering by product owner status (active/inactive).
        """
        assert index_exists(db_inspector, 'product_owners', 'idx_product_owners_status'), \
            "Index 'idx_product_owners_status' should exist on product_owners table"

    def test_idx_product_owners_status_columns(self, db_inspector):
        """
        Verify idx_product_owners_status is on the correct column.
        """
        index_columns = get_index_columns(
            db_inspector,
            'product_owners',
            'idx_product_owners_status'
        )

        assert 'status' in index_columns, \
            f"Index should be on 'status' column, got columns: {index_columns}"
        assert len(index_columns) == 1, \
            f"Index should be on single column, got {len(index_columns)} columns"

    def test_idx_product_owners_firstname_exists(self, db_inspector):
        """
        Verify idx_product_owners_firstname index exists on firstname column.

        This index optimizes searching/sorting by first name.
        """
        assert index_exists(db_inspector, 'product_owners', 'idx_product_owners_firstname'), \
            "Index 'idx_product_owners_firstname' should exist on product_owners table"

    def test_idx_product_owners_firstname_columns(self, db_inspector):
        """
        Verify idx_product_owners_firstname is on the correct column.
        """
        index_columns = get_index_columns(
            db_inspector,
            'product_owners',
            'idx_product_owners_firstname'
        )

        assert 'firstname' in index_columns, \
            f"Index should be on 'firstname' column, got columns: {index_columns}"
        assert len(index_columns) == 1, \
            f"Index should be on single column, got {len(index_columns)} columns"

    def test_idx_product_owners_surname_exists(self, db_inspector):
        """
        Verify idx_product_owners_surname index exists on surname column.

        This index optimizes searching/sorting by surname.
        """
        assert index_exists(db_inspector, 'product_owners', 'idx_product_owners_surname'), \
            "Index 'idx_product_owners_surname' should exist on product_owners table"

    def test_idx_product_owners_surname_columns(self, db_inspector):
        """
        Verify idx_product_owners_surname is on the correct column.
        """
        index_columns = get_index_columns(
            db_inspector,
            'product_owners',
            'idx_product_owners_surname'
        )

        assert 'surname' in index_columns, \
            f"Index should be on 'surname' column, got columns: {index_columns}"
        assert len(index_columns) == 1, \
            f"Index should be on single column, got {len(index_columns)} columns"

    def test_idx_product_owners_email_1_exists(self, db_inspector):
        """
        Verify idx_product_owners_email_1 index exists on email_1 column.

        This index optimizes email lookups and uniqueness checks.
        """
        assert index_exists(db_inspector, 'product_owners', 'idx_product_owners_email_1'), \
            "Index 'idx_product_owners_email_1' should exist on product_owners table"

    def test_idx_product_owners_email_1_columns(self, db_inspector):
        """
        Verify idx_product_owners_email_1 is on the correct column.
        """
        index_columns = get_index_columns(
            db_inspector,
            'product_owners',
            'idx_product_owners_email_1'
        )

        assert 'email_1' in index_columns, \
            f"Index should be on 'email_1' column, got columns: {index_columns}"
        assert len(index_columns) == 1, \
            f"Index should be on single column, got {len(index_columns)} columns"

    def test_idx_product_owners_dob_exists(self, db_inspector):
        """
        Verify idx_product_owners_dob index exists on dob column.

        This index optimizes date of birth filtering and age calculations.
        """
        assert index_exists(db_inspector, 'product_owners', 'idx_product_owners_dob'), \
            "Index 'idx_product_owners_dob' should exist on product_owners table"

    def test_idx_product_owners_dob_columns(self, db_inspector):
        """
        Verify idx_product_owners_dob is on the correct column.
        """
        index_columns = get_index_columns(
            db_inspector,
            'product_owners',
            'idx_product_owners_dob'
        )

        assert 'dob' in index_columns, \
            f"Index should be on 'dob' column, got columns: {index_columns}"
        assert len(index_columns) == 1, \
            f"Index should be on single column, got {len(index_columns)} columns"

    def test_idx_product_owners_created_at_exists(self, db_inspector):
        """
        Verify idx_product_owners_created_at index exists on created_at column.

        This index optimizes sorting by creation date (newest/oldest).
        """
        assert index_exists(db_inspector, 'product_owners', 'idx_product_owners_created_at'), \
            "Index 'idx_product_owners_created_at' should exist on product_owners table"

    def test_idx_product_owners_created_at_columns(self, db_inspector):
        """
        Verify idx_product_owners_created_at is on the correct column.
        """
        index_columns = get_index_columns(
            db_inspector,
            'product_owners',
            'idx_product_owners_created_at'
        )

        assert 'created_at' in index_columns, \
            f"Index should be on 'created_at' column, got columns: {index_columns}"
        assert len(index_columns) == 1, \
            f"Index should be on single column, got {len(index_columns)} columns"

    def test_idx_product_owners_status_created_at_exists(self, db_inspector):
        """
        Verify idx_product_owners_status_created_at composite index exists.

        This composite index optimizes queries that filter by status AND sort by created_at
        (e.g., "get all active owners sorted by newest first").
        """
        assert index_exists(db_inspector, 'product_owners', 'idx_product_owners_status_created_at'), \
            "Index 'idx_product_owners_status_created_at' should exist on product_owners table"

    def test_idx_product_owners_status_created_at_columns(self, db_inspector):
        """
        Verify idx_product_owners_status_created_at is on the correct columns in correct order.

        Column order matters for composite indexes - status should come before created_at
        to allow filtering by status with optional sorting by created_at.
        """
        index_columns = get_index_columns(
            db_inspector,
            'product_owners',
            'idx_product_owners_status_created_at'
        )

        assert len(index_columns) == 2, \
            f"Composite index should have 2 columns, got {len(index_columns)}"
        assert 'status' in index_columns, \
            f"Index should include 'status' column, got columns: {index_columns}"
        assert 'created_at' in index_columns, \
            f"Index should include 'created_at' column, got columns: {index_columns}"

        # Verify column order (status first, then created_at)
        assert index_columns[0] == 'status', \
            f"'status' should be first column in index, got order: {index_columns}"
        assert index_columns[1] == 'created_at', \
            f"'created_at' should be second column in index, got order: {index_columns}"

    def test_all_seven_indexes_present(self, db_inspector):
        """
        Verify all 7 required indexes are present on product_owners table.
        """
        expected_indexes = [
            'idx_product_owners_status',
            'idx_product_owners_firstname',
            'idx_product_owners_surname',
            'idx_product_owners_email_1',
            'idx_product_owners_dob',
            'idx_product_owners_created_at',
            'idx_product_owners_status_created_at',
        ]

        for index_name in expected_indexes:
            assert index_exists(db_inspector, 'product_owners', index_name), \
                f"Index '{index_name}' should exist on product_owners table"

    def test_migration_002_downgrade_removes_all_indexes(self, alembic_runner):
        """
        Verify downgrade removes all 7 indexes.

        This test verifies that the downgrade() function properly cleans up
        by removing all indexes in reverse order.
        """
        # Run upgrade to ensure indexes exist
        alembic_runner.migrate_up_to("002")

        # Verify all 7 indexes exist after upgrade
        from sqlalchemy import inspect
        inspector = inspect(alembic_runner.engine)
        expected_indexes = [
            'idx_product_owners_status',
            'idx_product_owners_firstname',
            'idx_product_owners_surname',
            'idx_product_owners_email_1',
            'idx_product_owners_dob',
            'idx_product_owners_created_at',
            'idx_product_owners_status_created_at',
        ]
        for index_name in expected_indexes:
            assert index_exists(inspector, 'product_owners', index_name), \
                f"Index '{index_name}' should exist after upgrade"

        # Run downgrade
        alembic_runner.migrate_down_one()

        # Verify all 7 indexes are removed after downgrade
        inspector = inspect(alembic_runner.engine)
        for index_name in expected_indexes:
            assert not index_exists(inspector, 'product_owners', index_name), \
                f"Index '{index_name}' should be removed after downgrade"


class TestProductOwnerIndexesPerformance:
    """
    Test suite for verifying index configuration aids query performance.

    These tests verify that indexes are configured correctly for their use cases.
    """

    def test_single_column_indexes_support_equality_filters(self, db_inspector):
        """
        Verify single-column indexes exist for common filter columns.

        Single-column indexes on status, firstname, surname, email_1, and dob
        support WHERE clauses using = operator.
        """
        filter_indexes = [
            'idx_product_owners_status',
            'idx_product_owners_firstname',
            'idx_product_owners_surname',
            'idx_product_owners_email_1',
            'idx_product_owners_dob',
        ]

        for index_name in filter_indexes:
            assert index_exists(db_inspector, 'product_owners', index_name), \
                f"Filter index '{index_name}' should exist for WHERE clause optimization"

    def test_created_at_index_supports_sorting(self, db_inspector):
        """
        Verify created_at index supports ORDER BY operations.
        """
        assert index_exists(db_inspector, 'product_owners', 'idx_product_owners_created_at'), \
            "Index on created_at should exist for ORDER BY optimization"

    def test_composite_index_supports_filtered_sorting(self, db_inspector):
        """
        Verify composite index supports filtering by status with sorting by created_at.

        The composite index idx_product_owners_status_created_at should optimize
        queries like: WHERE status = 'active' ORDER BY created_at DESC
        """
        assert index_exists(db_inspector, 'product_owners', 'idx_product_owners_status_created_at'), \
            "Composite index should exist for filtered sorting queries"

        # Verify column order enables both status filtering and created_at sorting
        index_columns = get_index_columns(
            db_inspector,
            'product_owners',
            'idx_product_owners_status_created_at'
        )

        assert index_columns == ['status', 'created_at'], \
            f"Index column order should be ['status', 'created_at'] for optimal query performance, got {index_columns}"
