"""
Pytest fixtures for job tests.

These fixtures provide database connections and factory functions for creating
test data needed by cleanup job tests.
"""
import pytest
import pytest_asyncio
import asyncio
import asyncpg
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv


# Load environment variables
load_dotenv()


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_connection():
    """
    Provides a clean database connection for each test.

    This fixture creates a new database connection and ensures proper cleanup
    after each test to maintain test isolation.
    """
    database_url = os.getenv("DATABASE_URL_PHASE2") or os.getenv("DATABASE_URL")

    if not database_url:
        pytest.fail("DATABASE_URL or DATABASE_URL_PHASE2 must be set")

    conn = await asyncpg.connect(database_url)

    yield conn

    await conn.close()


@pytest_asyncio.fixture(scope="function")
async def sample_address_factory(db_connection):
    """
    Factory fixture for creating test addresses.

    This factory creates address records in the database with customizable
    creation dates for testing the 7-day grace period.

    Args:
        line_1: First line of address (default: "123 Test St")
        created_at: Creation timestamp (default: now - 8 days, i.e., old enough to delete)

    Returns:
        Function that creates addresses and returns address record dict
    """
    created_addresses = []

    async def _create_address(
        line_1: str = "123 Test St",
        line_2: Optional[str] = None,
        line_3: Optional[str] = None,
        line_4: Optional[str] = None,
        line_5: Optional[str] = None,
        created_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Create a test address with optional timestamp override."""
        if created_at is None:
            # Default to 8 days old (past grace period)
            created_at = datetime.utcnow() - timedelta(days=8)

        address = await db_connection.fetchrow(
            """
            INSERT INTO addresses (line_1, line_2, line_3, line_4, line_5, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, line_1, line_2, line_3, line_4, line_5, created_at
            """,
            line_1, line_2, line_3, line_4, line_5, created_at
        )

        address_dict = dict(address)
        created_addresses.append(address_dict["id"])
        return address_dict

    yield _create_address

    # Cleanup: Delete all created addresses
    for address_id in created_addresses:
        await db_connection.execute(
            "DELETE FROM addresses WHERE id = $1",
            address_id
        )


@pytest_asyncio.fixture(scope="function")
async def sample_product_owner_factory(db_connection):
    """
    Factory fixture for creating test product owners.

    This factory creates product owner records in the database, optionally
    linked to addresses for testing reference cleanup logic.

    Args:
        firstname: First name (default: "Test")
        surname: Surname (default: "Owner")
        address_id: Foreign key to addresses table (default: None)

    Returns:
        Function that creates product owners and returns product owner record dict
    """
    created_owners = []

    async def _create_product_owner(
        firstname: str = "Test",
        surname: str = "Owner",
        address_id: Optional[int] = None,
        status: str = "active",
        email_1: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a test product owner with optional address reference."""
        owner = await db_connection.fetchrow(
            """
            INSERT INTO product_owners (firstname, surname, address_id, status, email_1, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, firstname, surname, address_id, status, email_1, created_at
            """,
            firstname, surname, address_id, status, email_1, datetime.utcnow()
        )

        owner_dict = dict(owner)
        created_owners.append(owner_dict["id"])
        return owner_dict

    yield _create_product_owner

    # Cleanup: Delete all created product owners
    for owner_id in created_owners:
        await db_connection.execute(
            "DELETE FROM product_owners WHERE id = $1",
            owner_id
        )
