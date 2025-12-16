"""
Test suite for Special Relationships API Routes (Cycle 9)

Tests all API endpoints for managing special relationships (personal and professional)
in the Kingston's Portal system.

This is the TDD RED phase - all tests should FAIL initially because the API routes
don't exist yet. This test suite defines the expected behavior of the API.

API Endpoints Under Test:
- GET /api/client_groups/{client_group_id}/special_relationships
- POST /api/client_groups/{client_group_id}/special_relationships
- PUT /api/special_relationships/{relationship_id}
- PATCH /api/special_relationships/{relationship_id}/status
- DELETE /api/special_relationships/{relationship_id}

Test Coverage:
- 30+ test cases covering all endpoints
- Authentication tests (401 errors)
- Validation tests (400 errors)
- Not found tests (404 errors)
- Database error scenarios (500 errors)
- Soft delete behavior verification
- Data filtering and querying
"""

import pytest
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from fastapi.testclient import TestClient
import asyncpg

# Constants for testing
VALID_STATUSES = ["Active", "Inactive", "Deceased"]
PERSONAL_RELATIONSHIP_TYPES = [
    "Spouse", "Partner", "Child", "Parent", "Sibling",
    "Grandchild", "Grandparent", "Other Family"
]
PROFESSIONAL_RELATIONSHIP_TYPES = [
    "Accountant", "Solicitor", "Doctor", "Financial Advisor",
    "Estate Planner", "Other Professional", "Guardian", "Power of Attorney"
]


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture(scope="module")
def client():
    """
    Creates a test client for the FastAPI app.
    Uses the existing conftest pattern.
    """
    import sys
    import os
    # Add the backend directory to the path
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

    from main import app
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def db_connection():
    """
    Provides a PostgreSQL database connection for test setup/teardown.

    Uses DATABASE_URL_PHASE2 from environment variables.
    Creates connection pool and yields connection for tests.
    Cleans up after tests complete.
    """
    from app.db.database import DATABASE_URL

    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)

    try:
        async with pool.acquire() as conn:
            yield conn
    finally:
        await pool.close()


@pytest.fixture
def test_client_group():
    """
    Returns a test client group ID for use in tests.
    Note: This assumes a client group exists in the test database.
    In production tests, this would create and clean up the test data.
    """
    # For TDD RED phase, we use a placeholder UUID
    # When implementing, this should create actual test data
    return str(uuid.uuid4())


@pytest.fixture
def test_special_relationship():
    """
    Returns a test special relationship ID for use in tests.
    Note: This assumes a relationship exists in the test database.
    In production tests, this would create and clean up the test data.
    """
    # For TDD RED phase, we use a placeholder UUID
    # When implementing, this should create actual test data
    return str(uuid.uuid4())


@pytest.fixture
def auth_headers() -> Dict[str, str]:
    """
    Returns authentication headers for API requests.

    In production, this would be a valid JWT token.
    For tests, we mock the authentication.
    """
    # TODO: Replace with actual JWT token generation when auth is implemented
    return {
        "Authorization": "Bearer test_token_123",
        "Content-Type": "application/json"
    }


@pytest.fixture
def sample_personal_relationship_data(test_client_group) -> Dict[str, Any]:
    """Returns valid data for creating a personal relationship."""
    return {
        "client_group_id": test_client_group,
        "relationship_type": "Spouse",
        "status": "Active",
        "title": "Mrs",
        "first_name": "Sarah",
        "last_name": "Johnson",
        "date_of_birth": "1985-06-15",
        "email": "sarah.johnson@example.com",
        "mobile_phone": "+44 7700 900111",
        "home_phone": "+44 20 7946 0958",
        "address_line1": "123 Oak Street",
        "city": "London",
        "postcode": "SW1A 1AA",
        "country": "United Kingdom",
    }


@pytest.fixture
def sample_professional_relationship_data(test_client_group) -> Dict[str, Any]:
    """Returns valid data for creating a professional relationship."""
    return {
        "client_group_id": test_client_group,
        "relationship_type": "Solicitor",
        "status": "Active",
        "title": "Mr",
        "first_name": "Robert",
        "last_name": "Smith",
        "email": "robert.smith@lawfirm.co.uk",
        "work_phone": "+44 20 7946 1234",
        "company_name": "Smith & Associates Legal",
        "position": "Senior Partner",
        "professional_id": "SOL12345",
        "address_line1": "45 Legal Lane",
        "city": "London",
        "postcode": "EC4A 1AA",
        "country": "United Kingdom",
    }


# =============================================================================
# GET /api/client_groups/{client_group_id}/special_relationships Tests
# =============================================================================

class TestGetSpecialRelationships:
    """Tests for fetching special relationships for a client group."""

    def test_get_all_relationships_success(
        self, client: TestClient, auth_headers, test_client_group,
        test_special_relationship
    ):
        """Test successfully fetching all relationships for a client group."""
        response = client.get(
            f"/api/client_groups/{test_client_group}/special_relationships",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Verify relationship structure
        relationship = data[0]
        assert "id" in relationship
        assert "client_group_id" in relationship
        assert "relationship_type" in relationship
        assert "status" in relationship
        assert "first_name" in relationship
        assert "last_name" in relationship
        assert "created_at" in relationship
        assert "updated_at" in relationship
        assert relationship["deleted_at"] is None  # Not soft-deleted

    def test_get_relationships_filter_by_status_active(
        self, client: TestClient, auth_headers, test_client_group
    ):
        """Test filtering relationships by Active status."""
        response = client.get(
            f"/api/client_groups/{test_client_group}/special_relationships",
            params={"status": "Active"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # All returned relationships should be Active
        for relationship in data:
            assert relationship["status"] == "Active"

    def test_get_relationships_filter_by_status_inactive(
        self, client: TestClient, auth_headers, test_client_group
    ):
        """Test filtering relationships by Inactive status."""
        response = client.get(
            f"/api/client_groups/{test_client_group}/special_relationships",
            params={"status": "Inactive"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        for relationship in data:
            assert relationship["status"] == "Inactive"

    def test_get_relationships_filter_by_status_deceased(
        self, client: TestClient, auth_headers, test_client_group
    ):
        """Test filtering relationships by Deceased status."""
        response = client.get(
            f"/api/client_groups/{test_client_group}/special_relationships",
            params={"status": "Deceased"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        for relationship in data:
            assert relationship["status"] == "Deceased"

    def test_get_relationships_empty_list_when_none_exist(
        self, client: TestClient, auth_headers, test_client_group
    ):
        """Test returns empty list when no relationships exist for client group."""
        # Use a different client group with no relationships
        new_client_group_id = str(uuid.uuid4())

        response = client.get(
            f"/api/client_groups/{new_client_group_id}/special_relationships",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    @pytest.mark.asyncio
    async def test_get_relationships_excludes_soft_deleted(
        self, client: TestClient, auth_headers, test_client_group,
        db_connection
    ):
        """Test that soft-deleted relationships are excluded from results."""
        # Create a relationship and soft-delete it
        deleted_id = str(uuid.uuid4())

        await db_connection.execute(
            """
            INSERT INTO special_relationships (
                id, client_group_id, relationship_type, status,
                first_name, last_name, deleted_at, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            deleted_id,
            test_client_group,
            "Child",
            "Active",
            "Deleted",
            "Person",
            datetime.utcnow(),  # deleted_at is set
            datetime.utcnow(),
            datetime.utcnow()
        )

        response = client.get(
            f"/api/client_groups/{test_client_group}/special_relationships",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Verify deleted relationship is not in results
        relationship_ids = [r["id"] for r in data]
        assert deleted_id not in relationship_ids

    def test_get_relationships_returns_404_for_nonexistent_client_group(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when client group doesn't exist."""
        nonexistent_id = str(uuid.uuid4())

        response = client.get(
            f"/api/client_groups/{nonexistent_id}/special_relationships",
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_get_relationships_returns_401_when_not_authenticated(
        self, client: TestClient, test_client_group
    ):
        """Test returns 401 when no authentication provided."""
        response = client.get(
            f"/api/client_groups/{test_client_group}/special_relationships"
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


# =============================================================================
# POST /api/client_groups/{client_group_id}/special_relationships Tests
# =============================================================================

class TestCreateSpecialRelationship:
    """Tests for creating new special relationships."""

    def test_create_personal_relationship_success(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test successfully creating a personal relationship."""
        client_group_id = sample_personal_relationship_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=sample_personal_relationship_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        # Verify created relationship
        assert "id" in data
        assert data["client_group_id"] == client_group_id
        assert data["first_name"] == sample_personal_relationship_data["first_name"]
        assert data["last_name"] == sample_personal_relationship_data["last_name"]
        assert data["relationship_type"] == sample_personal_relationship_data["relationship_type"]
        assert data["status"] == sample_personal_relationship_data["status"]
        assert "created_at" in data
        assert "updated_at" in data
        assert data["deleted_at"] is None

    def test_create_professional_relationship_success(
        self, client: TestClient, auth_headers,
        sample_professional_relationship_data
    ):
        """Test successfully creating a professional relationship."""
        client_group_id = sample_professional_relationship_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=sample_professional_relationship_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        # Verify professional fields
        assert data["company_name"] == sample_professional_relationship_data["company_name"]
        assert data["position"] == sample_professional_relationship_data["position"]
        assert data["professional_id"] == sample_professional_relationship_data["professional_id"]

    def test_create_relationship_returns_400_when_first_name_missing(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when first_name is missing (required field)."""
        invalid_data = sample_personal_relationship_data.copy()
        del invalid_data["first_name"]

        client_group_id = invalid_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_400_when_last_name_missing(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when last_name is missing (required field)."""
        invalid_data = sample_personal_relationship_data.copy()
        del invalid_data["last_name"]

        client_group_id = invalid_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_400_when_first_name_too_long(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when first_name exceeds 200 characters."""
        invalid_data = sample_personal_relationship_data.copy()
        invalid_data["first_name"] = "A" * 201  # Exceeds 200 char limit

        client_group_id = invalid_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_400_when_relationship_type_missing(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when relationship_type is missing (required field)."""
        invalid_data = sample_personal_relationship_data.copy()
        del invalid_data["relationship_type"]

        client_group_id = invalid_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_400_when_status_missing(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when status is missing (required field)."""
        invalid_data = sample_personal_relationship_data.copy()
        del invalid_data["status"]

        client_group_id = invalid_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_400_when_email_invalid(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when email format is invalid."""
        invalid_data = sample_personal_relationship_data.copy()
        invalid_data["email"] = "not-a-valid-email"

        client_group_id = invalid_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "email" in data["detail"].lower()

    def test_create_relationship_returns_400_when_phone_invalid(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when phone format is invalid."""
        invalid_data = sample_personal_relationship_data.copy()
        invalid_data["mobile_phone"] = "12345"  # Too short (< 10 digits)

        client_group_id = invalid_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "phone" in data["detail"].lower()

    def test_create_relationship_returns_400_when_date_of_birth_in_future(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 400 when date_of_birth is in the future."""
        invalid_data = sample_personal_relationship_data.copy()
        future_date = (date.today() + timedelta(days=1)).isoformat()
        invalid_data["date_of_birth"] = future_date

        client_group_id = invalid_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_404_for_nonexistent_client_group(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 404 when client group doesn't exist."""
        nonexistent_id = str(uuid.uuid4())
        invalid_data = sample_personal_relationship_data.copy()
        invalid_data["client_group_id"] = nonexistent_id

        response = client.post(
            f"/api/client_groups/{nonexistent_id}/special_relationships",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_create_relationship_returns_401_when_not_authenticated(
        self, client: TestClient, sample_personal_relationship_data
    ):
        """Test returns 401 when no authentication provided."""
        client_group_id = sample_personal_relationship_data["client_group_id"]

        response = client.post(
            f"/api/client_groups/{client_group_id}/special_relationships",
            json=sample_personal_relationship_data
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


# =============================================================================
# PUT /api/special_relationships/{relationship_id} Tests
# =============================================================================

class TestUpdateSpecialRelationship:
    """Tests for updating existing special relationships."""

    def test_update_relationship_success(
        self, client: TestClient, auth_headers,
        test_special_relationship
    ):
        """Test successfully updating all fields of a relationship."""
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "email": "updated@example.com",
            "mobile_phone": "+44 7700 900999",
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
        assert data["first_name"] == update_data["first_name"]
        assert data["last_name"] == update_data["last_name"]
        assert data["email"] == update_data["email"]
        assert data["mobile_phone"] == update_data["mobile_phone"]
        assert data["status"] == update_data["status"]
        assert "updated_at" in data

    def test_update_relationship_returns_400_on_validation_error(
        self, client: TestClient, auth_headers,
        test_special_relationship
    ):
        """Test returns 400 when update data fails validation."""
        invalid_data = {
            "email": "invalid-email-format",
            "mobile_phone": "123"  # Too short
        }

        response = client.put(
            f"/api/special_relationships/{test_special_relationship}",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_update_relationship_returns_404_for_nonexistent_relationship(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when relationship doesn't exist."""
        nonexistent_id = str(uuid.uuid4())
        update_data = {"first_name": "Test"}

        response = client.put(
            f"/api/special_relationships/{nonexistent_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_update_relationship_returns_401_when_not_authenticated(
        self, client: TestClient, test_special_relationship
    ):
        """Test returns 401 when no authentication provided."""
        update_data = {"first_name": "Test"}

        response = client.put(
            f"/api/special_relationships/{test_special_relationship}",
            json=update_data
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


# =============================================================================
# PATCH /api/special_relationships/{relationship_id}/status Tests
# =============================================================================

class TestUpdateRelationshipStatus:
    """Tests for updating relationship status only."""

    def test_update_status_to_active_success(
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

    def test_update_status_to_inactive_success(
        self, client: TestClient, auth_headers,
        test_special_relationship
    ):
        """Test successfully updating status to Inactive."""
        response = client.patch(
            f"/api/special_relationships/{test_special_relationship}/status",
            json={"status": "Inactive"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Inactive"

    def test_update_status_to_deceased_success(
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

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_update_status_returns_404_for_nonexistent_relationship(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when relationship doesn't exist."""
        nonexistent_id = str(uuid.uuid4())

        response = client.patch(
            f"/api/special_relationships/{nonexistent_id}/status",
            json={"status": "Active"},
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_update_status_returns_401_when_not_authenticated(
        self, client: TestClient, test_special_relationship
    ):
        """Test returns 401 when no authentication provided."""
        response = client.patch(
            f"/api/special_relationships/{test_special_relationship}/status",
            json={"status": "Active"}
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


# =============================================================================
# DELETE /api/special_relationships/{relationship_id} Tests
# =============================================================================

class TestDeleteSpecialRelationship:
    """Tests for soft-deleting special relationships."""

    @pytest.mark.asyncio
    async def test_delete_relationship_success(
        self, client: TestClient, auth_headers,
        test_special_relationship, db_connection
    ):
        """Test successfully soft-deleting a relationship."""
        response = client.delete(
            f"/api/special_relationships/{test_special_relationship}",
            headers=auth_headers
        )

        assert response.status_code == 204
        assert response.content == b""  # No content

        # Verify record is soft-deleted (deleted_at is set)
        row = await db_connection.fetchrow(
            "SELECT deleted_at FROM special_relationships WHERE id = $1",
            test_special_relationship
        )

        assert row is not None  # Record still exists
        assert row["deleted_at"] is not None  # deleted_at is set

    @pytest.mark.asyncio
    async def test_delete_relationship_record_not_hard_deleted(
        self, client: TestClient, auth_headers,
        test_special_relationship, db_connection
    ):
        """Test verifies record is NOT hard-deleted from database."""
        # Delete the relationship
        response = client.delete(
            f"/api/special_relationships/{test_special_relationship}",
            headers=auth_headers
        )

        assert response.status_code == 204

        # Verify record still exists in database
        count = await db_connection.fetchval(
            "SELECT COUNT(*) FROM special_relationships WHERE id = $1",
            test_special_relationship
        )

        assert count == 1  # Record still exists

    @pytest.mark.asyncio
    async def test_delete_relationship_sets_deleted_at_timestamp(
        self, client: TestClient, auth_headers,
        test_special_relationship, db_connection
    ):
        """Test verifies deleted_at timestamp is set correctly."""
        before_delete = datetime.utcnow()

        response = client.delete(
            f"/api/special_relationships/{test_special_relationship}",
            headers=auth_headers
        )

        assert response.status_code == 204

        after_delete = datetime.utcnow()

        # Verify deleted_at is within expected range
        row = await db_connection.fetchrow(
            "SELECT deleted_at FROM special_relationships WHERE id = $1",
            test_special_relationship
        )

        deleted_at = row["deleted_at"]
        assert deleted_at is not None
        assert before_delete <= deleted_at <= after_delete

    def test_delete_relationship_excluded_from_get_endpoint(
        self, client: TestClient, auth_headers,
        test_client_group, test_special_relationship
    ):
        """Test soft-deleted relationships are excluded from GET endpoint."""
        # First, delete the relationship
        delete_response = client.delete(
            f"/api/special_relationships/{test_special_relationship}",
            headers=auth_headers
        )
        assert delete_response.status_code == 204

        # Try to fetch relationships for the client group
        get_response = client.get(
            f"/api/client_groups/{test_client_group}/special_relationships",
            headers=auth_headers
        )

        assert get_response.status_code == 200
        data = get_response.json()

        # Verify deleted relationship is not in results
        relationship_ids = [r["id"] for r in data]
        assert test_special_relationship not in relationship_ids

    def test_delete_relationship_returns_404_when_already_deleted(
        self, client: TestClient, auth_headers,
        test_special_relationship
    ):
        """Test returns 404 when trying to delete already deleted relationship."""
        # Delete once
        first_response = client.delete(
            f"/api/special_relationships/{test_special_relationship}",
            headers=auth_headers
        )
        assert first_response.status_code == 204

        # Try to delete again
        second_response = client.delete(
            f"/api/special_relationships/{test_special_relationship}",
            headers=auth_headers
        )

        assert second_response.status_code == 404
        data = second_response.json()
        assert "detail" in data

    def test_delete_relationship_returns_404_for_nonexistent_relationship(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when relationship doesn't exist."""
        nonexistent_id = str(uuid.uuid4())

        response = client.delete(
            f"/api/special_relationships/{nonexistent_id}",
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_delete_relationship_returns_401_when_not_authenticated(
        self, client: TestClient, test_special_relationship
    ):
        """Test returns 401 when no authentication provided."""
        response = client.delete(
            f"/api/special_relationships/{test_special_relationship}"
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


# =============================================================================
# Database Error Scenarios (500 errors)
# =============================================================================

class TestDatabaseErrorHandling:
    """Tests for handling database errors gracefully."""

    @pytest.mark.skip(reason="Requires database connection mocking")
    def test_get_relationships_returns_500_on_database_error(
        self, client: TestClient, auth_headers, test_client_group
    ):
        """Test returns 500 when database query fails."""
        # This test would require mocking the database to simulate failure
        # Deferred to implementation phase
        pass

    @pytest.mark.skip(reason="Requires database connection mocking")
    def test_create_relationship_returns_500_on_database_error(
        self, client: TestClient, auth_headers,
        sample_personal_relationship_data
    ):
        """Test returns 500 when database insert fails."""
        # This test would require mocking the database to simulate failure
        # Deferred to implementation phase
        pass

    @pytest.mark.skip(reason="Requires database connection mocking")
    def test_delete_relationship_returns_500_on_database_error(
        self, client: TestClient, auth_headers,
        test_special_relationship
    ):
        """Test returns 500 when database update fails."""
        # This test would require mocking the database to simulate failure
        # Deferred to implementation phase
        pass
