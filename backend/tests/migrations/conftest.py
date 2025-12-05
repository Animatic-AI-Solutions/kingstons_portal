"""
Pytest fixtures for migration tests.

These fixtures provide test database setup and utilities for testing Alembic migrations.
"""
import pytest
import asyncio
from typing import AsyncGenerator
import os
from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from dotenv import load_dotenv
from alembic import command
from alembic.config import Config

# Load environment variables
load_dotenv()

# Get test database URL - use Phase 2 database for testing
DATABASE_URL = os.getenv("DATABASE_URL_PHASE2") or os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL or DATABASE_URL_PHASE2 must be set for migration tests")

# Get project root directory (backend/)
PROJECT_ROOT = Path(__file__).parent.parent.parent


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def db_engine() -> Engine:
    """
    Create a SQLAlchemy engine for migration testing.

    Returns:
        Engine: SQLAlchemy engine connected to test database
    """
    engine = create_engine(DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_inspector(db_engine: Engine):
    """
    Create a SQLAlchemy inspector for examining database schema.

    Args:
        db_engine: SQLAlchemy engine fixture

    Returns:
        Inspector: SQLAlchemy inspector for schema introspection
    """
    return inspect(db_engine)


class AlembicRunner:
    """
    Helper class for running Alembic migrations in tests.

    This class provides methods to run migrations up and down for testing
    migration reversibility.
    """

    def __init__(self, engine: Engine):
        """
        Initialize AlembicRunner with a database engine.

        Args:
            engine: SQLAlchemy engine to run migrations against
        """
        self.engine = engine
        self.config = Config(str(PROJECT_ROOT / "alembic.ini"))
        # Override the database URL in alembic config to use test database
        self.config.set_main_option("sqlalchemy.url", str(engine.url))

    def migrate_up_to(self, revision: str):
        """
        Run migrations up to a specific revision.

        Args:
            revision: Target revision (e.g., "001", "002", "head")
        """
        command.upgrade(self.config, revision)

    def migrate_down_one(self):
        """
        Downgrade one migration from current state.
        """
        command.downgrade(self.config, "-1")

    def migrate_down_to(self, revision: str):
        """
        Downgrade to a specific revision.

        Args:
            revision: Target revision (e.g., "001", "base")
        """
        command.downgrade(self.config, revision)

    def get_current_revision(self) -> str:
        """
        Get the current database revision.

        Returns:
            str: Current revision ID
        """
        from alembic.script import ScriptDirectory
        from alembic.runtime.migration import MigrationContext

        script = ScriptDirectory.from_config(self.config)
        with self.engine.connect() as connection:
            context = MigrationContext.configure(connection)
            return context.get_current_revision()


@pytest.fixture(scope="function")
def alembic_runner(db_engine: Engine) -> AlembicRunner:
    """
    Create an AlembicRunner for testing migrations.

    Args:
        db_engine: SQLAlchemy engine fixture

    Returns:
        AlembicRunner: Helper for running migration commands
    """
    runner = AlembicRunner(db_engine)
    yield runner
    # No cleanup needed - db_engine fixture handles engine disposal


def table_exists(inspector, table_name: str) -> bool:
    """
    Check if a table exists in the database.

    Args:
        inspector: SQLAlchemy inspector
        table_name: Name of table to check

    Returns:
        bool: True if table exists, False otherwise
    """
    return table_name in inspector.get_table_names()


def column_exists(inspector, table_name: str, column_name: str) -> bool:
    """
    Check if a column exists in a table.

    Args:
        inspector: SQLAlchemy inspector
        table_name: Name of table
        column_name: Name of column to check

    Returns:
        bool: True if column exists, False otherwise
    """
    if not table_exists(inspector, table_name):
        return False

    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def index_exists(inspector, table_name: str, index_name: str) -> bool:
    """
    Check if an index exists on a table.

    Args:
        inspector: SQLAlchemy inspector
        table_name: Name of table
        index_name: Name of index to check

    Returns:
        bool: True if index exists, False otherwise
    """
    if not table_exists(inspector, table_name):
        return False

    indexes = inspector.get_indexes(table_name)
    return any(idx['name'] == index_name for idx in indexes)


def get_column_type(inspector, table_name: str, column_name: str) -> str:
    """
    Get the type of a column.

    Args:
        inspector: SQLAlchemy inspector
        table_name: Name of table
        column_name: Name of column

    Returns:
        str: String representation of column type
    """
    columns = inspector.get_columns(table_name)
    for col in columns:
        if col['name'] == column_name:
            return str(col['type'])
    return None


def get_primary_keys(inspector, table_name: str) -> list:
    """
    Get primary key columns for a table.

    Args:
        inspector: SQLAlchemy inspector
        table_name: Name of table

    Returns:
        list: List of primary key column names
    """
    pk_constraint = inspector.get_pk_constraint(table_name)
    return pk_constraint.get('constrained_columns', [])


def get_index_columns(inspector, table_name: str, index_name: str) -> list:
    """
    Get columns that are part of an index.

    Args:
        inspector: SQLAlchemy inspector
        table_name: Name of table
        index_name: Name of index

    Returns:
        list: List of column names in the index
    """
    indexes = inspector.get_indexes(table_name)
    for idx in indexes:
        if idx['name'] == index_name:
            return idx['column_names']
    return []
