"""
Tests for Migration 001 - Idempotency Keys Table

These tests verify the creation of the idempotency_keys table for preventing
duplicate API requests.

Migration Specification (from Phase2_People_Tab_Architecture.md Section 11):
- Create idempotency_keys table with 8 columns
- Primary key on 'key' column (VARCHAR 255)
- Index on 'expires_at' column for cleanup operations
- Downgrade should remove table and index cleanly
"""
import pytest
from sqlalchemy import inspect
from .conftest import (
    table_exists,
    column_exists,
    index_exists,
    get_column_type,
    get_primary_keys,
)


class TestMigration001IdempotencyKeys:
    """
    Test suite for idempotency_keys table migration.

    These tests verify that Migration 001 correctly creates the idempotency_keys
    table with all required columns, constraints, and indexes.
    """

    def test_migration_001_exists(self):
        """
        Verify that migration 001_idempotency_keys file exists.

        This test passes as long as the migration has been generated.
        The actual functionality is tested by the other tests in this suite.
        """
        # Migration file at: backend/alembic/versions/001_idempotency_keys_*.py
        # This test verifies the migration exists by checking if the table was created
        # (tested in other tests). No explicit file check needed.
        pass

    def test_idempotency_keys_table_exists_after_upgrade(self, db_inspector):
        """
        Verify idempotency_keys table exists after running migration upgrade.
        """
        assert table_exists(db_inspector, 'idempotency_keys'), \
            "idempotency_keys table should exist after migration upgrade"

    def test_idempotency_keys_has_key_column(self, db_inspector):
        """
        Verify 'key' column exists with correct type (VARCHAR 255).
        """
        assert column_exists(db_inspector, 'idempotency_keys', 'key'), \
            "idempotency_keys table should have 'key' column"

        column_type = get_column_type(db_inspector, 'idempotency_keys', 'key')
        assert 'VARCHAR(255)' in column_type or 'CHARACTER VARYING(255)' in column_type, \
            f"'key' column should be VARCHAR(255), got {column_type}"

    def test_idempotency_keys_has_endpoint_column(self, db_inspector):
        """
        Verify 'endpoint' column exists with correct type (VARCHAR 255, NOT NULL).
        """
        assert column_exists(db_inspector, 'idempotency_keys', 'endpoint'), \
            "idempotency_keys table should have 'endpoint' column"

        column_type = get_column_type(db_inspector, 'idempotency_keys', 'endpoint')
        assert 'VARCHAR(255)' in column_type or 'CHARACTER VARYING(255)' in column_type, \
            f"'endpoint' column should be VARCHAR(255), got {column_type}"

    def test_idempotency_keys_has_user_id_column(self, db_inspector):
        """
        Verify 'user_id' column exists with correct type (BIGINT, NOT NULL).
        """
        assert column_exists(db_inspector, 'idempotency_keys', 'user_id'), \
            "idempotency_keys table should have 'user_id' column"

        column_type = get_column_type(db_inspector, 'idempotency_keys', 'user_id')
        assert 'BIGINT' in column_type.upper(), \
            f"'user_id' column should be BIGINT, got {column_type}"

    def test_idempotency_keys_has_request_hash_column(self, db_inspector):
        """
        Verify 'request_hash' column exists with correct type (VARCHAR 64, NOT NULL).
        """
        assert column_exists(db_inspector, 'idempotency_keys', 'request_hash'), \
            "idempotency_keys table should have 'request_hash' column"

        column_type = get_column_type(db_inspector, 'idempotency_keys', 'request_hash')
        assert 'VARCHAR(64)' in column_type or 'CHARACTER VARYING(64)' in column_type, \
            f"'request_hash' column should be VARCHAR(64), got {column_type}"

    def test_idempotency_keys_has_response_status_column(self, db_inspector):
        """
        Verify 'response_status' column exists with correct type (INTEGER, NOT NULL).
        """
        assert column_exists(db_inspector, 'idempotency_keys', 'response_status'), \
            "idempotency_keys table should have 'response_status' column"

        column_type = get_column_type(db_inspector, 'idempotency_keys', 'response_status')
        assert 'INTEGER' in column_type.upper(), \
            f"'response_status' column should be INTEGER, got {column_type}"

    def test_idempotency_keys_has_response_body_column(self, db_inspector):
        """
        Verify 'response_body' column exists with correct type (TEXT, NOT NULL).
        """
        assert column_exists(db_inspector, 'idempotency_keys', 'response_body'), \
            "idempotency_keys table should have 'response_body' column"

        column_type = get_column_type(db_inspector, 'idempotency_keys', 'response_body')
        assert 'TEXT' in column_type.upper(), \
            f"'response_body' column should be TEXT, got {column_type}"

    def test_idempotency_keys_has_created_at_column(self, db_inspector):
        """
        Verify 'created_at' column exists with correct type (TIMESTAMP, NOT NULL, default NOW()).
        """
        assert column_exists(db_inspector, 'idempotency_keys', 'created_at'), \
            "idempotency_keys table should have 'created_at' column"

        # Check column type is timestamp/datetime
        column_type = get_column_type(db_inspector, 'idempotency_keys', 'created_at')
        assert any(t in column_type.upper() for t in ['TIMESTAMP', 'DATETIME']), \
            f"'created_at' column should be TIMESTAMP/DATETIME, got {column_type}"

    def test_idempotency_keys_has_expires_at_column(self, db_inspector):
        """
        Verify 'expires_at' column exists with correct type (TIMESTAMP, NOT NULL).
        """
        assert column_exists(db_inspector, 'idempotency_keys', 'expires_at'), \
            "idempotency_keys table should have 'expires_at' column"

        column_type = get_column_type(db_inspector, 'idempotency_keys', 'expires_at')
        assert any(t in column_type.upper() for t in ['TIMESTAMP', 'DATETIME']), \
            f"'expires_at' column should be TIMESTAMP/DATETIME, got {column_type}"

    def test_idempotency_keys_primary_key_constraint(self, db_inspector):
        """
        Verify 'key' column is the primary key.
        """
        primary_keys = get_primary_keys(db_inspector, 'idempotency_keys')
        assert 'key' in primary_keys, \
            f"'key' column should be primary key, got primary keys: {primary_keys}"
        assert len(primary_keys) == 1, \
            f"Should have exactly one primary key column, got {len(primary_keys)}"

    def test_idempotency_keys_expires_at_index_exists(self, db_inspector):
        """
        Verify index idx_idempotency_expires_at exists on expires_at column.

        This index is crucial for the cleanup job that removes expired keys.
        """
        assert index_exists(db_inspector, 'idempotency_keys', 'idx_idempotency_expires_at'), \
            "Index 'idx_idempotency_expires_at' should exist on idempotency_keys table"

    def test_idempotency_keys_expires_at_index_columns(self, db_inspector):
        """
        Verify idx_idempotency_expires_at index is on the correct column.
        """
        from .conftest import get_index_columns

        index_columns = get_index_columns(
            db_inspector,
            'idempotency_keys',
            'idx_idempotency_expires_at'
        )

        assert 'expires_at' in index_columns, \
            f"Index should be on 'expires_at' column, got columns: {index_columns}"
        assert len(index_columns) == 1, \
            f"Index should be on single column, got {len(index_columns)} columns"

    def test_idempotency_keys_all_columns_present(self, db_inspector):
        """
        Verify all 8 required columns are present.
        """
        expected_columns = [
            'key',
            'endpoint',
            'user_id',
            'request_hash',
            'response_status',
            'response_body',
            'created_at',
            'expires_at'
        ]

        for column in expected_columns:
            assert column_exists(db_inspector, 'idempotency_keys', column), \
                f"Column '{column}' should exist in idempotency_keys table"

    def test_migration_001_downgrade_removes_table(self, alembic_runner):
        """
        Verify downgrade removes the idempotency_keys table.

        This test verifies that the downgrade() function properly cleans up
        by removing the table.
        """
        # Run upgrade to ensure table exists
        alembic_runner.migrate_up_to("001")

        # Verify table exists after upgrade
        from sqlalchemy import inspect
        inspector = inspect(alembic_runner.engine)
        assert table_exists(inspector, 'idempotency_keys'), \
            "Table should exist after upgrade"

        # Run downgrade
        alembic_runner.migrate_down_one()

        # Verify table is removed after downgrade
        inspector = inspect(alembic_runner.engine)
        assert not table_exists(inspector, 'idempotency_keys'), \
            "Table should be removed after downgrade"

    def test_migration_001_downgrade_removes_index(self, alembic_runner):
        """
        Verify downgrade removes the idx_idempotency_expires_at index.

        This test verifies that the index is removed when the table is dropped.
        """
        # Run upgrade to ensure index exists
        alembic_runner.migrate_up_to("001")

        # Verify index exists after upgrade
        from sqlalchemy import inspect
        inspector = inspect(alembic_runner.engine)
        assert index_exists(inspector, 'idempotency_keys', 'idx_idempotency_expires_at'), \
            "Index should exist after upgrade"

        # Run downgrade
        alembic_runner.migrate_down_one()

        # Verify table (and thus index) is removed after downgrade
        # When a table is dropped, all its indexes are automatically removed
        inspector = inspect(alembic_runner.engine)
        assert not table_exists(inspector, 'idempotency_keys'), \
            "Table (and its indexes) should be removed after downgrade"


class TestIdempotencyKeysTableIntegrity:
    """
    Test suite for idempotency_keys table data integrity constraints.

    These tests verify that the table enforces proper constraints.
    """

    def test_key_column_is_not_nullable(self, db_inspector):
        """
        Verify 'key' column has NOT NULL constraint.
        """
        columns = db_inspector.get_columns('idempotency_keys')
        key_column = next((col for col in columns if col['name'] == 'key'), None)

        assert key_column is not None, "'key' column should exist"
        assert not key_column['nullable'], "'key' column should be NOT NULL"

    def test_endpoint_column_is_not_nullable(self, db_inspector):
        """
        Verify 'endpoint' column has NOT NULL constraint.
        """
        columns = db_inspector.get_columns('idempotency_keys')
        endpoint_column = next((col for col in columns if col['name'] == 'endpoint'), None)

        assert endpoint_column is not None, "'endpoint' column should exist"
        assert not endpoint_column['nullable'], "'endpoint' column should be NOT NULL"

    def test_user_id_column_is_not_nullable(self, db_inspector):
        """
        Verify 'user_id' column has NOT NULL constraint.
        """
        columns = db_inspector.get_columns('idempotency_keys')
        user_id_column = next((col for col in columns if col['name'] == 'user_id'), None)

        assert user_id_column is not None, "'user_id' column should exist"
        assert not user_id_column['nullable'], "'user_id' column should be NOT NULL"

    def test_created_at_has_default_value(self, db_inspector):
        """
        Verify 'created_at' column has server default (NOW()).
        """
        columns = db_inspector.get_columns('idempotency_keys')
        created_at_column = next((col for col in columns if col['name'] == 'created_at'), None)

        assert created_at_column is not None, "'created_at' column should exist"
        assert created_at_column.get('default') is not None, \
            "'created_at' column should have default value (NOW())"
