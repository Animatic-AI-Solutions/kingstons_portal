"""
Test suite for Legal Documents API Routes

Tests all API endpoints for managing legal documents in the Kingston's Portal system.

API Endpoints Under Test:
- GET /api/legal_documents?product_owner_id={id}
- POST /api/legal_documents
- PUT /api/legal_documents/{document_id}
- PATCH /api/legal_documents/{document_id}/status
- DELETE /api/legal_documents/{document_id}

Test Coverage:
- Validation tests (422 errors)
- Not found tests (404 errors)
- Success scenarios for all CRUD operations
- Product owner association management
"""

import pytest
import pytest_asyncio
from datetime import datetime, date, timedelta
from typing import Dict, Any, List
from fastapi.testclient import TestClient
import asyncpg
from main import app
from app.api.routes.auth import get_current_user

# Constants for testing
VALID_STATUSES = ["Signed", "Registered", "Lapsed"]
VALID_DOCUMENT_TYPES = [
    "Will", "LPOA P&F", "LPOA H&W", "EPA",
    "General Power of Attorney", "Advance Directive"
]


# =============================================================================
# Test Fixtures
# Note: client fixture is provided by conftest.py
# =============================================================================


def mock_current_user():
    """Mock user for authentication override."""
    return {"id": 1, "email": "test@example.com", "username": "testuser"}


@pytest.fixture(autouse=True)
def override_auth_dependency():
    """Override authentication dependency for all tests in this module."""
    app.dependency_overrides[get_current_user] = mock_current_user
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def db_connection():
    """
    Provides a PostgreSQL database connection for test setup/teardown.
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

    # Cleanup
    try:
        await db_connection.execute(
            'DELETE FROM product_owners WHERE id = $1',
            product_owner_id
        )
    except Exception as e:
        print(f"Error cleaning up product owner: {e}")


@pytest_asyncio.fixture
async def test_legal_document(db_connection, test_product_owner):
    """Creates a test legal document and returns its ID."""
    result = await db_connection.fetchrow(
        """
        INSERT INTO legal_documents (type, document_date, status, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        """,
        "Will",
        date(2024, 1, 15),
        "Signed",
        "Test document notes"
    )
    document_id = result['id']

    # Link to product owner
    await db_connection.execute(
        """
        INSERT INTO product_owner_legal_documents (product_owner_id, legal_document_id)
        VALUES ($1, $2)
        """,
        test_product_owner,
        document_id
    )

    yield document_id

    # Cleanup
    try:
        await db_connection.execute(
            'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
            document_id
        )
        await db_connection.execute(
            'DELETE FROM legal_documents WHERE id = $1',
            document_id
        )
    except Exception as e:
        print(f"Error cleaning up legal document: {e}")


@pytest.fixture
def auth_headers() -> Dict[str, str]:
    """Returns headers for API requests."""
    return {
        "Content-Type": "application/json"
    }


@pytest.fixture
def sample_legal_document_data(test_product_owner) -> Dict[str, Any]:
    """Returns valid data for creating a legal document."""
    return {
        "type": "Will",
        "document_date": "2024-06-15",
        "status": "Signed",
        "notes": "Last Will and Testament for John Doe",
        "product_owner_ids": [test_product_owner]
    }


# =============================================================================
# GET /api/legal_documents Tests
# =============================================================================


class TestGetLegalDocuments:
    """Tests for fetching legal documents."""

    @pytest.mark.asyncio
    async def test_get_all_documents_success(
        self, client: TestClient, auth_headers, test_legal_document
    ):
        """Test successfully fetching all documents."""
        response = client.get(
            "/api/legal_documents",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_documents_filter_by_product_owner(
        self, client: TestClient, auth_headers,
        test_product_owner, test_legal_document
    ):
        """Test filtering documents by product owner ID."""
        response = client.get(
            f"/api/legal_documents?product_owner_id={test_product_owner}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Verify document structure
        if len(data) > 0:
            document = data[0]
            assert "id" in document
            assert "type" in document
            assert "status" in document
            assert "document_date" in document
            assert "notes" in document
            assert "product_owner_ids" in document
            assert "created_at" in document
            assert "updated_at" in document
            assert test_product_owner in document["product_owner_ids"]

    @pytest.mark.asyncio
    async def test_get_documents_filter_by_multiple_product_owners(
        self, client: TestClient, auth_headers,
        test_product_owner, test_legal_document
    ):
        """Test filtering documents by multiple product owner IDs."""
        response = client.get(
            f"/api/legal_documents?product_owner_ids={test_product_owner}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_documents_filter_by_client_group(
        self, client: TestClient, auth_headers, test_legal_document
    ):
        """Test filtering documents by client_group_id."""
        # This tests the filter exists - actual filtering depends on data
        response = client.get(
            "/api/legal_documents?client_group_id=1",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_documents_filter_by_type(
        self, client: TestClient, auth_headers, test_legal_document
    ):
        """Test filtering documents by type."""
        response = client.get(
            "/api/legal_documents?type=Will",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        for document in data:
            assert document["type"] == "Will"

    @pytest.mark.asyncio
    async def test_get_documents_filter_by_status(
        self, client: TestClient, auth_headers, test_legal_document
    ):
        """Test filtering documents by status."""
        response = client.get(
            "/api/legal_documents?status=Signed",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        for document in data:
            assert document["status"] == "Signed"

    @pytest.mark.asyncio
    async def test_get_documents_with_combined_filters(
        self, client: TestClient, auth_headers, test_legal_document
    ):
        """Test filtering documents with multiple filters combined."""
        response = client.get(
            "/api/legal_documents?type=Will&status=Signed",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        for document in data:
            assert document["type"] == "Will"
            assert document["status"] == "Signed"


# =============================================================================
# POST /api/legal_documents Tests
# =============================================================================


class TestCreateLegalDocument:
    """Tests for creating new legal documents."""

    @pytest.mark.asyncio
    async def test_create_document_success(
        self, client: TestClient, auth_headers,
        sample_legal_document_data, db_connection
    ):
        """Test successfully creating a legal document."""
        response = client.post(
            "/api/legal_documents",
            json=sample_legal_document_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert data["type"] == sample_legal_document_data["type"]
        assert data["status"] == sample_legal_document_data["status"]
        assert data["notes"] == sample_legal_document_data["notes"]
        assert "created_at" in data
        assert "updated_at" in data
        assert data["product_owner_ids"] == sample_legal_document_data["product_owner_ids"]

        # Cleanup
        try:
            await db_connection.execute(
                'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
                data['id']
            )
            await db_connection.execute(
                'DELETE FROM legal_documents WHERE id = $1',
                data['id']
            )
        except Exception as e:
            print(f"Error cleaning up: {e}")

    @pytest.mark.asyncio
    async def test_create_document_with_custom_type(
        self, client: TestClient, auth_headers,
        sample_legal_document_data, db_connection
    ):
        """Test creating a document with custom type (prefixed with 'Custom:')."""
        custom_data = sample_legal_document_data.copy()
        custom_data["type"] = "Custom: Family Trust Agreement"

        response = client.post(
            "/api/legal_documents",
            json=custom_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "Custom: Family Trust Agreement"

        # Cleanup
        try:
            await db_connection.execute(
                'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
                data['id']
            )
            await db_connection.execute(
                'DELETE FROM legal_documents WHERE id = $1',
                data['id']
            )
        except Exception as e:
            print(f"Error cleaning up: {e}")

    @pytest.mark.asyncio
    async def test_create_document_with_registered_status(
        self, client: TestClient, auth_headers,
        sample_legal_document_data, db_connection
    ):
        """Test creating a document with Registered status."""
        registered_data = sample_legal_document_data.copy()
        registered_data["status"] = "Registered"

        response = client.post(
            "/api/legal_documents",
            json=registered_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "Registered"

        # Cleanup
        try:
            await db_connection.execute(
                'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
                data['id']
            )
            await db_connection.execute(
                'DELETE FROM legal_documents WHERE id = $1',
                data['id']
            )
        except Exception as e:
            print(f"Error cleaning up: {e}")

    @pytest.mark.asyncio
    async def test_create_document_without_notes(
        self, client: TestClient, auth_headers,
        sample_legal_document_data, db_connection
    ):
        """Test creating a document without notes (optional field)."""
        data_without_notes = sample_legal_document_data.copy()
        del data_without_notes["notes"]

        response = client.post(
            "/api/legal_documents",
            json=data_without_notes,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data.get("notes") is None or data.get("notes") == ""

        # Cleanup
        try:
            await db_connection.execute(
                'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
                data['id']
            )
            await db_connection.execute(
                'DELETE FROM legal_documents WHERE id = $1',
                data['id']
            )
        except Exception as e:
            print(f"Error cleaning up: {e}")

    @pytest.mark.asyncio
    async def test_create_document_without_document_date(
        self, client: TestClient, auth_headers,
        sample_legal_document_data, db_connection
    ):
        """Test creating a document without document_date (optional field)."""
        data_without_date = sample_legal_document_data.copy()
        del data_without_date["document_date"]

        response = client.post(
            "/api/legal_documents",
            json=data_without_date,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data.get("document_date") is None

        # Cleanup
        try:
            await db_connection.execute(
                'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
                data['id']
            )
            await db_connection.execute(
                'DELETE FROM legal_documents WHERE id = $1',
                data['id']
            )
        except Exception as e:
            print(f"Error cleaning up: {e}")

    def test_create_document_returns_422_when_type_missing(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when type is missing (required field)."""
        invalid_data = sample_legal_document_data.copy()
        del invalid_data["type"]

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_create_document_returns_422_when_type_empty(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when type is empty string."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["type"] = ""

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_document_returns_422_when_status_invalid(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when status is invalid."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["status"] = "InvalidStatus"

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_create_document_returns_422_when_notes_too_long(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when notes exceed 2000 characters."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["notes"] = "x" * 2001

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_document_returns_422_when_product_owner_ids_missing(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when product_owner_ids is missing."""
        invalid_data = sample_legal_document_data.copy()
        del invalid_data["product_owner_ids"]

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_document_returns_422_when_product_owner_ids_empty(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when product_owner_ids is empty."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["product_owner_ids"] = []

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_document_returns_422_when_document_date_invalid(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when document_date format is invalid."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["document_date"] = "not-a-date"

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_document_returns_404_for_nonexistent_product_owner(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 404 when product owner doesn't exist."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["product_owner_ids"] = [999999]

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


# =============================================================================
# PUT /api/legal_documents/{document_id} Tests
# =============================================================================


class TestUpdateLegalDocument:
    """Tests for updating existing legal documents."""

    @pytest.mark.asyncio
    async def test_update_document_success(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test successfully updating a document."""
        update_data = {
            "type": "EPA",
            "notes": "Updated notes",
            "status": "Lapsed"
        }

        response = client.put(
            f"/api/legal_documents/{test_legal_document}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert data["type"] == update_data["type"]
        assert data["notes"] == update_data["notes"]
        assert data["status"] == update_data["status"]

    @pytest.mark.asyncio
    async def test_update_document_partial_update(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test updating only some fields of a document."""
        update_data = {
            "notes": "Only updating notes"
        }

        response = client.put(
            f"/api/legal_documents/{test_legal_document}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == update_data["notes"]
        # Other fields should remain unchanged
        assert data["type"] == "Will"

    @pytest.mark.asyncio
    async def test_update_document_change_status_to_registered(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test updating document status to Registered."""
        update_data = {
            "status": "Registered"
        }

        response = client.put(
            f"/api/legal_documents/{test_legal_document}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Registered"

    @pytest.mark.asyncio
    async def test_update_document_change_document_date(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test updating document_date."""
        update_data = {
            "document_date": "2025-01-01"
        }

        response = client.put(
            f"/api/legal_documents/{test_legal_document}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["document_date"] == "2025-01-01"

    def test_update_document_returns_422_on_validation_error(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test returns 422 when update data fails validation."""
        invalid_data = {
            "notes": "x" * 2001  # Too long
        }

        response = client.put(
            f"/api/legal_documents/{test_legal_document}",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_update_document_returns_422_when_status_invalid(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test returns 422 when status is invalid."""
        invalid_data = {
            "status": "InvalidStatus"
        }

        response = client.put(
            f"/api/legal_documents/{test_legal_document}",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_update_document_returns_422_when_type_empty(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test returns 422 when type is set to empty string."""
        invalid_data = {
            "type": ""
        }

        response = client.put(
            f"/api/legal_documents/{test_legal_document}",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_update_document_returns_404_for_nonexistent_document(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when document doesn't exist."""
        nonexistent_id = 999999
        update_data = {"type": "Will"}

        response = client.put(
            f"/api/legal_documents/{nonexistent_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


# =============================================================================
# PATCH /api/legal_documents/{document_id}/status Tests
# =============================================================================


class TestUpdateDocumentStatus:
    """Tests for updating document status only."""

    @pytest.mark.asyncio
    async def test_update_status_to_signed_success(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test successfully updating status to Signed."""
        response = client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": "Signed"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Signed"

    @pytest.mark.asyncio
    async def test_update_status_to_registered_success(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test successfully updating status to Registered."""
        response = client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": "Registered"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Registered"

    @pytest.mark.asyncio
    async def test_update_status_to_lapsed_success(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test successfully updating status to Lapsed."""
        response = client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": "Lapsed"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Lapsed"

    @pytest.mark.asyncio
    async def test_update_status_reactivate_from_lapsed(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test successfully reactivating a document (status Lapsed to Signed)."""
        # First lapse it
        client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": "Lapsed"},
            headers=auth_headers
        )

        # Then reactivate
        response = client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": "Signed"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Signed"

    def test_update_status_returns_422_for_invalid_status(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test returns 422 when status is invalid."""
        response = client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": "InvalidStatus"},
            headers=auth_headers
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_update_status_returns_422_for_empty_status(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test returns 422 when status is empty string."""
        response = client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": ""},
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_update_status_returns_422_when_status_missing(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test returns 422 when status field is missing from body."""
        response = client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={},
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_update_status_returns_404_for_nonexistent_document(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when document doesn't exist."""
        nonexistent_id = 999999

        response = client.patch(
            f"/api/legal_documents/{nonexistent_id}/status",
            json={"status": "Signed"},
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


# =============================================================================
# DELETE /api/legal_documents/{document_id} Tests
# =============================================================================


class TestDeleteLegalDocument:
    """Tests for hard-deleting legal documents."""

    @pytest.mark.asyncio
    async def test_delete_document_success(
        self, client: TestClient, auth_headers,
        db_connection, test_product_owner
    ):
        """Test successfully hard-deleting a document."""
        # Create a document to delete
        result = await db_connection.fetchrow(
            """
            INSERT INTO legal_documents (type, status)
            VALUES ($1, $2)
            RETURNING id
            """,
            "Will",
            "Signed"
        )
        document_id = result['id']

        # Link to product owner
        await db_connection.execute(
            """
            INSERT INTO product_owner_legal_documents (product_owner_id, legal_document_id)
            VALUES ($1, $2)
            """,
            test_product_owner,
            document_id
        )

        # Delete the document
        response = client.delete(
            f"/api/legal_documents/{document_id}",
            headers=auth_headers
        )

        assert response.status_code == 204
        assert response.content == b""

        # Verify record is hard-deleted
        count = await db_connection.fetchval(
            "SELECT COUNT(*) FROM legal_documents WHERE id = $1",
            document_id
        )
        assert count == 0

        # Verify junction table entry is also deleted
        junction_count = await db_connection.fetchval(
            "SELECT COUNT(*) FROM product_owner_legal_documents WHERE legal_document_id = $1",
            document_id
        )
        assert junction_count == 0

    @pytest.mark.asyncio
    async def test_delete_document_removes_all_product_owner_links(
        self, client: TestClient, auth_headers,
        db_connection, test_product_owner
    ):
        """Test that deleting a document removes all product owner associations."""
        # Create a second product owner
        result2 = await db_connection.fetchrow(
            """
            INSERT INTO product_owners (firstname, surname, status)
            VALUES ($1, $2, $3)
            RETURNING id
            """,
            "Second",
            "Owner",
            "active"
        )
        second_product_owner_id = result2['id']

        # Create a document linked to both product owners
        result = await db_connection.fetchrow(
            """
            INSERT INTO legal_documents (type, status)
            VALUES ($1, $2)
            RETURNING id
            """,
            "Will",
            "Signed"
        )
        document_id = result['id']

        # Link to first product owner
        await db_connection.execute(
            """
            INSERT INTO product_owner_legal_documents (product_owner_id, legal_document_id)
            VALUES ($1, $2)
            """,
            test_product_owner,
            document_id
        )

        # Link to second product owner
        await db_connection.execute(
            """
            INSERT INTO product_owner_legal_documents (product_owner_id, legal_document_id)
            VALUES ($1, $2)
            """,
            second_product_owner_id,
            document_id
        )

        # Delete the document
        response = client.delete(
            f"/api/legal_documents/{document_id}",
            headers=auth_headers
        )

        assert response.status_code == 204

        # Verify all junction table entries are deleted
        junction_count = await db_connection.fetchval(
            "SELECT COUNT(*) FROM product_owner_legal_documents WHERE legal_document_id = $1",
            document_id
        )
        assert junction_count == 0

        # Cleanup second product owner
        try:
            await db_connection.execute(
                'DELETE FROM product_owners WHERE id = $1',
                second_product_owner_id
            )
        except Exception as e:
            print(f"Error cleaning up second product owner: {e}")

    def test_delete_document_returns_404_for_nonexistent_document(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when document doesn't exist."""
        nonexistent_id = 999999

        response = client.delete(
            f"/api/legal_documents/{nonexistent_id}",
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_delete_document_is_idempotent_returns_404_on_second_delete(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test that deleting an already deleted document returns 404."""
        # First delete should succeed
        response1 = client.delete(
            f"/api/legal_documents/{test_legal_document}",
            headers=auth_headers
        )
        assert response1.status_code == 204

        # Second delete should return 404
        response2 = client.delete(
            f"/api/legal_documents/{test_legal_document}",
            headers=auth_headers
        )
        assert response2.status_code == 404
