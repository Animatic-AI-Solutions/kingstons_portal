"""
Pytest fixtures for middleware tests.

These fixtures provide database connections, middleware instances, and test data
for testing middleware components.
"""
import pytest
import pytest_asyncio
import asyncpg
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv


# Load environment variables
load_dotenv()


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
async def db_with_idempotency_table(db_connection):
    """
    Provides a database connection with the idempotency_keys table available.

    This fixture ensures the idempotency_keys table exists and is cleaned up
    before and after each test.
    """
    # Clean up any existing test data
    await db_connection.execute("""
        DELETE FROM idempotency_keys
        WHERE endpoint LIKE '%test%' OR endpoint LIKE '/api/client-groups/%/product-owners'
    """)

    yield db_connection

    # Cleanup after test
    await db_connection.execute("""
        DELETE FROM idempotency_keys
        WHERE endpoint LIKE '%test%' OR endpoint LIKE '/api/client-groups/%/product-owners'
    """)


@pytest_asyncio.fixture(scope="function")
async def test_client_group(db_connection):
    """
    Creates a test client group in the database.

    This fixture provides a clean client group for each test and ensures
    proper cleanup after the test completes.

    Returns:
        Dictionary containing client group data including id, name, status
    """
    # Create a test client group
    client_group = await db_connection.fetchrow(
        """
        INSERT INTO client_groups (name, status, type, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, status, type, created_at
        """,
        f"Test Client Group {datetime.utcnow().timestamp()}",
        "active",
        "Family",
        datetime.utcnow()
    )

    client_group_dict = dict(client_group)

    yield client_group_dict

    # Cleanup: Delete the test client group and all associations
    await db_connection.execute(
        "DELETE FROM client_group_product_owners WHERE client_group_id = $1",
        client_group_dict["id"]
    )
    await db_connection.execute(
        "DELETE FROM client_groups WHERE id = $1",
        client_group_dict["id"]
    )


@pytest_asyncio.fixture(scope="function")
async def authenticated_user(db_connection):
    """
    Creates a test user with authentication credentials.

    This fixture provides a valid user for authentication testing and
    generates a JWT token for API requests.

    Returns:
        Dictionary containing user data and authentication token
    """
    from app.utils.security import create_access_token

    # Create a test user (profiles table doesn't have password_hash)
    user = await db_connection.fetchrow(
        """
        INSERT INTO profiles (email, first_name, last_name, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, first_name, last_name
        """,
        f"test_{datetime.utcnow().timestamp()}@example.com",
        "Test",
        "User",
        datetime.utcnow()
    )

    user_dict = dict(user)

    # Generate JWT token
    token = create_access_token({"sub": str(user_dict["id"])})
    user_dict["token"] = token

    yield user_dict

    # Cleanup: Delete the test user
    await db_connection.execute(
        "DELETE FROM profiles WHERE id = $1",
        user_dict["id"]
    )


@pytest_asyncio.fixture(scope="function")
async def second_authenticated_user(db_connection):
    """
    Creates a second test user for multi-user testing scenarios.

    Returns:
        Dictionary containing user data and authentication token
    """
    from app.utils.security import create_access_token

    # Create a second test user
    user = await db_connection.fetchrow(
        """
        INSERT INTO profiles (email, first_name, last_name, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, first_name, last_name
        """,
        f"test2_{datetime.utcnow().timestamp()}@example.com",
        "Test2",
        "User2",
        datetime.utcnow()
    )

    user_dict = dict(user)

    # Generate JWT token
    token = create_access_token({"sub": str(user_dict["id"])})
    user_dict["token"] = token

    yield user_dict

    # Cleanup: Delete the test user
    await db_connection.execute(
        "DELETE FROM profiles WHERE id = $1",
        user_dict["id"]
    )
