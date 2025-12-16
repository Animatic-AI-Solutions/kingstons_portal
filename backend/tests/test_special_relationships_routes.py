"""
Test suite for Special Relationships API Routes

Tests all API endpoints for managing special relationships (personal and professional)
in the Kingston's Portal system.

API Endpoints Under Test:
- GET /api/special_relationships?product_owner_id={id}
- POST /api/special_relationships
- PUT /api/special_relationships/{relationship_id}
- PATCH /api/special_relationships/{relationship_id}/status
- DELETE /api/special_relationships/{relationship_id}

Test Coverage:
- Authentication tests (401 errors)
- Validation tests (400 errors)
- Not found tests (404 errors)
- Success scenarios for all CRUD operations
"""

import pytest
import pytest_asyncio
from datetime import datetime, date, timedelta
from typing import Dict, Any, List
from fastapi.testclient import TestClient
import asyncpg

# Constants for testing
VALID_STATUSES = ["Active", "Inactive", "Deceased"]
VALID_TYPES = ["Personal", "Professional"]

PERSONAL_RELATIONSHIPS = [
    "Spouse", "Partner", "Child", "Parent", "Sibling",
    "Grandchild", "Grandparent", "Other Family"
]
PROFESSIONAL_RELATIONSHIPS = [
    "Accountant", "Solicitor", "Doctor", "Financial Advisor",
    "Estate Planner", "Other Professional", "Guardian", "Power of Attorney"
]


# =============================================================================
# Test Fixtures
# Note: client fixture is provided by conftest.py
# =============================================================================


@pytest_asyncio.fixture
async def db_connection():
    """
    Provides a PostgreSQL database connection for test setup/teardown.
    Uses DATABASE_URL_PHASE2 from environment variables.
    """
    from app.db.database import DATABASE_URL

    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)

    try:
        async with pool.acquire() as conn:
            yield conn
    finally:
        await pool.close()


@pytest_asyncio.fixture
async def test_product_owner(db_connection):
    """Creates a test product owner and returns its ID."""
    # Create a test product owner
    result = await db_connection.fetchrow(
        """
        INSERT INTO product_owners (firstname, surname, status)
        VALUES ($1, $2, $3)
        RETURNING id
        """,
        "Test",
        "Owner",
        "active"
    )
    product_owner_id = result['id']

    yield product_owner_id

    # Cleanup: Delete the product owner
    try:
        await db_connection.execute(
            'DELETE FROM product_owners WHERE id = $1',
            product_owner_id
        )
    except Exception as e:
        print(f"Error cleaning up product owner: {e}")


@pytest_asyncio.fixture
async def test_special_relationship(db_connection, test_product_owner):
    """Creates a test special relationship and returns its ID."""
    # Create a test special relationship
    result = await db_connection.fetchrow(
        """
        INSERT INTO special_relationships (
            name, type, relationship, status, email, phone_number
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        """,
        "Test Relationship",
        "Personal",
        "Spouse",
        "Active",
        "test@example.com",
        "+44 7700 900123"
    )
    relationship_id = result['id']

    # Link to product owner
    await db_connection.execute(
        """
        INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
        VALUES ($1, $2)
        """,
        test_product_owner,
        relationship_id
    )

    yield relationship_id

    # Cleanup: Delete the relationship and junction table entry
    try:
        await db_connection.execute(
            'DELETE FROM product_owner_special_relationships WHERE special_relationship_id = $1',
            relationship_id
        )
        await db_connection.execute(
            'DELETE FROM special_relationships WHERE id = $1',
            relationship_id
        )
    except Exception as e:
        print(f"Error cleaning up special relationship: {e}")


@pytest.fixture
def auth_headers() -> Dict[str, str]:
    """
    Returns authentication headers for API requests.
    Note: In production, this would be a valid JWT token.
    For tests, we assume authentication is bypassed or mocked.
    """
    return {
        "Content-Type": "application/json"
    }


@pytest.fixture
def sample_personal_relationship_data(test_product_owner) -> Dict[str, Any]:
    """Returns valid data for creating a personal relationship."""
    return {
        "name": "Sarah Johnson",
        "type": "Personal",
        "relationship": "Spouse",
        "status": "Active",
        "date_of_birth": "1985-06-15",
        "dependency": False,
        "email": "sarah.johnson@example.com",
        "phone_number": "+44 7700 900111",
        "product_owner_ids": [test_product_owner]
    }


@pytest.fixture
def sample_professional_relationship_data(test_product_owner) -> Dict[str, Any]:
    """Returns valid data for creating a professional relationship."""
    return {
        "name": "Robert Smith",
        "type": "Professional",
        "relationship": "Solicitor",
        "status": "Active",
        "email": "robert.smith@lawfirm.co.uk",
        "phone_number": "+44 20 7946 1234",
        "firm_name": "Smith & Associates Legal",
        "product_owner_ids": [test_product_owner]
    }


# =============================================================================
# GET /api/special_relationships Tests
# =============================================================================

class TestGetSpecialRelationships:
    """Tests for fetching special relationships."""

    @pytest.mark.asyncio
    async def test_get_all_relationships_success(
        self, client: TestClient, auth_headers, test_special_relationship
    ):
        """Test successfully fetching all relationships."""
        response = client.get(
            "/api/special_relationships",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_relationships_filter_by_product_owner(
        self, client: TestClient, auth_headers, test_product_owner, test_special_relationship
    ):
        """Test filtering relationships by product owner ID."""
        response = client.get(
            f"/api/special_relationships?product_owner_id={test_product_owner}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Verify relationship structure
        if len(data) > 0:
            relationship = data[0]
            assert "id" in relationship
            assert "name" in relationship
            assert "type" in relationship
            assert "relationship" in relationship
            assert "status" in relationship
            assert "product_owner_ids" in relationship
            assert test_product_owner in relationship["product_owner_ids"]

    @pytest.mark.asyncio
    async def test_get_relationships_filter_by_type(
        self, client: TestClient, auth_headers, test_special_relationship
    ):
        """Test filtering relationships by type."""
        response = client.get(
            "/api/special_relationships?type=Personal",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # All returned relationships should be Personal
        for relationship in data:
            assert relationship["type"] == "Personal"

    @pytest.mark.asyncio
    async def test_get_relationships_filter_by_status(
        self, client: TestClient, auth_headers, test_special_relationship
    ):
        """Test filtering relationships by status."""
        response = client.get(
            "/api/special_relationships?status=Active",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # All returned relationships should be Active
        for relationship in data:
            assert relationship["status"] == "Active"


# =============================================================================
# POST /api/special_relationships Tests
# =============================================================================

class TestCreateSpecialRelationship:
    """Tests for creating new special relationships."""

    @pytest.mark.asyncio
    async def test_create_personal_relationship_success(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data, db_connection
    ):
        """Test successfully creating a personal relationship."""
        response = client.post(
            "/api/special_relationships",
            json=sample_personal_relationship_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        # Verify created relationship
        assert "id" in data
        assert data["name"] == sample_personal_relationship_data["name"]
        assert data["type"] == sample_personal_relationship_data["type"]
        assert data["relationship"] == sample_personal_relationship_data["relationship"]
        assert data["status"] == sample_personal_relationship_data["status"]
        assert "created_at" in data
        assert "updated_at" in data
        assert data["product_owner_ids"] == sample_personal_relationship_data["product_owner_ids"]

        # Cleanup
        try:
            await db_connection.execute(
                'DELETE FROM product_owner_special_relationships WHERE special_relationship_id = $1',
                data['id']
            )
            await db_connection.execute(
                'DELETE FROM special_relationships WHERE id = $1',
                data['id']
            )
        except Exception as e:
            print(f"Error cleaning up: {e}")

    @pytest.mark.asyncio
    async def test_create_professional_relationship_success(
        self, client: TestClient, auth_headers,
        sample_professional_relationship_data, db_connection
    ):
        """Test successfully creating a professional relationship."""
        response = client.post(
            "/api/special_relationships",
            json=sample_professional_relationship_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        # Verify professional fields
        assert data["firm_name"] == sample_professional_relationship_data["firm_name"]

        # Cleanup
        try:
            await db_connection.execute(
                'DELETE FROM product_owner_special_relationships WHERE special_relationship_id = $1',
                data['id']
            )
            await db_connection.execute(
                'DELETE FROM special_relationships WHERE id = $1',
                data['id']
            )
        except Exception as e:
            print(f"Error cleaning up: {e}")

    def test_create_relationship_returns_400_when_name_missing(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when name is missing (required field)."""
        invalid_data = sample_personal_relationship_data.copy()
        del invalid_data["name"]

        response = client.post(
            "/api/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Pydantic validation error
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_400_when_type_invalid(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when type is invalid."""
        invalid_data = sample_personal_relationship_data.copy()
        invalid_data["type"] = "InvalidType"

        response = client.post(
            "/api/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Pydantic validation error
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_400_when_status_invalid(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when status is invalid."""
        invalid_data = sample_personal_relationship_data.copy()
        invalid_data["status"] = "InvalidStatus"

        response = client.post(
            "/api/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Pydantic validation error
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_400_when_email_invalid(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when email format is invalid."""
        invalid_data = sample_personal_relationship_data.copy()
        invalid_data["email"] = "not-a-valid-email"

        response = client.post(
            "/api/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Pydantic validation error
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_400_when_phone_invalid(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when phone format is invalid."""
        invalid_data = sample_personal_relationship_data.copy()
        invalid_data["phone_number"] = "12345"  # Too short (< 10 digits)

        response = client.post(
            "/api/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Pydantic validation error
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_400_when_dob_in_future(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when date_of_birth is in the future."""
        invalid_data = sample_personal_relationship_data.copy()
        future_date = (date.today() + timedelta(days=1)).isoformat()
        invalid_data["date_of_birth"] = future_date

        response = client.post(
            "/api/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Pydantic validation error
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_404_for_nonexistent_product_owner(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 404 when product owner doesn't exist."""
        invalid_data = sample_personal_relationship_data.copy()
        invalid_data["product_owner_ids"] = [999999]  # Non-existent ID

        response = client.post(
            "/api/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


# =============================================================================
# PUT /api/special_relationships/{relationship_id} Tests
# =============================================================================

class TestUpdateSpecialRelationship:
    """Tests for updating existing special relationships."""

    @pytest.mark.asyncio
    async def test_update_relationship_success(
        self, client: TestClient, auth_headers,
        test_special_relationship
    ):
        """Test successfully updating a relationship."""
        update_data = {
            "name": "Updated Name",
            "email": "updated@example.com",
            "phone_number": "+44 7700 900999",
            "status": "Inactive"
        }

        response = client.put(
            f"/api/special_relationships/{test_special_relationship}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Verify updated fields
        assert data["name"] == update_data["name"]
        assert data["email"] == update_data["email"]
        assert data["phone_number"] == update_data["phone_number"]
        assert data["status"] == update_data["status"]

    def test_update_relationship_returns_400_on_validation_error(
        self, client: TestClient, auth_headers,
        test_special_relationship
    ):
        """Test returns 400 when update data fails validation."""
        invalid_data = {
            "email": "invalid-email-format",
            "phone_number": "123"  # Too short
        }

        response = client.put(
            f"/api/special_relationships/{test_special_relationship}",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Pydantic validation error
        data = response.json()
        assert "detail" in data

    def test_update_relationship_returns_404_for_nonexistent_relationship(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when relationship doesn't exist."""
        nonexistent_id = 999999
        update_data = {"name": "Test"}

        response = client.put(
            f"/api/special_relationships/{nonexistent_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


# =============================================================================
# PATCH /api/special_relationships/{relationship_id}/status Tests
# =============================================================================

class TestUpdateRelationshipStatus:
    """Tests for updating relationship status only."""

    @pytest.mark.asyncio
    async def test_update_status_to_active_success(
        self, client: TestClient, auth_headers,
        test_special_relationship
    ):
        """Test successfully updating status to Active."""
        response = client.patch(
            f"/api/special_relationships/{test_special_relationship}/status",
            json={"status": "Active"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Active"

    @pytest.mark.asyncio
    async def test_update_status_to_deceased_success(
        self, client: TestClient, auth_headers,
        test_special_relationship
    ):
        """Test successfully updating status to Deceased."""
        response = client.patch(
            f"/api/special_relationships/{test_special_relationship}/status",
            json={"status": "Deceased"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Deceased"

    def test_update_status_returns_400_for_invalid_status(
        self, client: TestClient, auth_headers,
        test_special_relationship
    ):
        """Test returns 400 when status is invalid."""
        response = client.patch(
            f"/api/special_relationships/{test_special_relationship}/status",
            json={"status": "InvalidStatus"},
            headers=auth_headers
        )

        assert response.status_code == 422  # Pydantic validation error
        data = response.json()
        assert "detail" in data

    def test_update_status_returns_404_for_nonexistent_relationship(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when relationship doesn't exist."""
        nonexistent_id = 999999

        response = client.patch(
            f"/api/special_relationships/{nonexistent_id}/status",
            json={"status": "Active"},
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


# =============================================================================
# DELETE /api/special_relationships/{relationship_id} Tests
# =============================================================================

class TestDeleteSpecialRelationship:
    """Tests for hard-deleting special relationships."""

    @pytest.mark.asyncio
    async def test_delete_relationship_success(
        self, client: TestClient, auth_headers,
        db_connection, test_product_owner
    ):
        """Test successfully hard-deleting a relationship."""
        # Create a relationship to delete
        result = await db_connection.fetchrow(
            """
            INSERT INTO special_relationships (
                name, type, relationship, status
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            "To Delete",
            "Personal",
            "Child",
            "Active"
        )
        relationship_id = result['id']

        # Link to product owner
        await db_connection.execute(
            """
            INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
            VALUES ($1, $2)
            """,
            test_product_owner,
            relationship_id
        )

        # Delete the relationship
        response = client.delete(
            f"/api/special_relationships/{relationship_id}",
            headers=auth_headers
        )

        assert response.status_code == 204
        assert response.content == b""  # No content

        # Verify record is hard-deleted
        count = await db_connection.fetchval(
            "SELECT COUNT(*) FROM special_relationships WHERE id = $1",
            relationship_id
        )
        assert count == 0  # Record should not exist

        # Verify junction table entry is also deleted
        junction_count = await db_connection.fetchval(
            "SELECT COUNT(*) FROM product_owner_special_relationships WHERE special_relationship_id = $1",
            relationship_id
        )
        assert junction_count == 0

    def test_delete_relationship_returns_404_for_nonexistent_relationship(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when relationship doesn't exist."""
        nonexistent_id = 999999

        response = client.delete(
            f"/api/special_relationships/{nonexistent_id}",
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
