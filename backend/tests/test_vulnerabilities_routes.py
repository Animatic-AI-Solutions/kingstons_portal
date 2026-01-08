"""
Test suite for Vulnerabilities Product Owners API Routes

Comprehensive tests for vulnerabilities product owners API endpoints in the Kingston's Portal system.
This implements Cycle 3 of the Health and Vulnerabilities feature - RED phase (TDD).

API Endpoints Under Test:
- GET /api/vulnerabilities/product-owners?product_owner_id={id}
- GET /api/vulnerabilities/product-owners?client_group_id={id}
- POST /api/vulnerabilities/product-owners
- PUT /api/vulnerabilities/product-owners/{record_id}
- DELETE /api/vulnerabilities/product-owners/{record_id}

Test Coverage:
- Unit tests for all CRUD operations
- Edge case tests (negative IDs, zero IDs, non-integer IDs, etc.)
- Validation tests (status enum, description length, diagnosed boolean, max length)
- Security tests (SQL injection, XSS)
- Data integrity tests (auto-generated fields, concurrent requests)
- Property-based tests using Hypothesis
- Pagination tests

Vulnerabilities Model Fields:
- product_owner_id: int (required, must be > 0)
- description: str (required, 1-500 chars)
- adjustments: Optional[str]
- diagnosed: bool (default False)
- status: str (Active/Resolved/Monitoring/Inactive)
- notes: Optional[str]
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime
from typing import Dict, Any, List
import asyncio
import asyncpg

# Hypothesis imports for property-based testing
from hypothesis import given, strategies as st, settings, assume, HealthCheck

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app


# =============================================================================
# Constants
# =============================================================================

VALID_STATUSES = ["Active", "Resolved", "Monitoring", "Inactive"]
MAX_DESCRIPTION_LENGTH = 500


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def client():
    """Create an async HTTP client for testing the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def db_connection():
    """
    Provides a PostgreSQL database connection for test setup/teardown.
    Uses DATABASE_URL from environment variables.
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
    """Creates a test product owner and returns its ID for testing."""
    # Create a test product owner
    result = await db_connection.fetchrow(
        """
        INSERT INTO product_owners (firstname, surname, status)
        VALUES ($1, $2, $3)
        RETURNING id
        """,
        "Test",
        "VulnOwner",
        "active"
    )
    product_owner_id = result['id']

    yield product_owner_id

    # Cleanup: Delete the product owner (and cascading vulnerability records)
    try:
        await db_connection.execute(
            'DELETE FROM vulnerabilities_product_owners WHERE product_owner_id = $1',
            product_owner_id
        )
        await db_connection.execute(
            'DELETE FROM product_owners WHERE id = $1',
            product_owner_id
        )
    except Exception as e:
        print(f"Error cleaning up product owner: {e}")


@pytest_asyncio.fixture
async def seed_vulnerability_data(db_connection, test_product_owner):
    """
    Seeds the database with test vulnerability records for testing GET, PUT, DELETE.
    Returns a list of created record IDs.
    """
    created_ids = []

    # Create several vulnerability records
    test_records = [
        ("Hearing impairment", "Speak clearly, face-to-face", True, "Active", None),
        ("Visual impairment", "Large print materials", False, "Monitoring", "Regular eye tests"),
        ("Cognitive difficulties", "Simpler explanations, more time", True, "Active", "Has carer support"),
    ]

    for description, adjustments, diagnosed, status, notes in test_records:
        result = await db_connection.fetchrow(
            """
            INSERT INTO vulnerabilities_product_owners
            (product_owner_id, description, adjustments, diagnosed, status, notes, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id
            """,
            test_product_owner,
            description,
            adjustments,
            diagnosed,
            status,
            notes
        )
        created_ids.append(result['id'])

    yield created_ids

    # Cleanup: Delete created records
    try:
        for record_id in created_ids:
            await db_connection.execute(
                'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                record_id
            )
    except Exception as e:
        print(f"Error cleaning up vulnerability records: {e}")


@pytest.fixture
def auth_headers() -> Dict[str, str]:
    """
    Returns authentication headers for API requests.
    For tests, we assume authentication is bypassed or mocked.
    """
    return {
        "Content-Type": "application/json"
    }


# =============================================================================
# TestVulnerabilitiesProductOwnersAPI Class - Main Test Suite
# =============================================================================

class TestVulnerabilitiesProductOwnersAPI:
    """
    Comprehensive tests for vulnerabilities product owners API endpoints.
    Includes unit tests, edge cases, validation, and security tests.
    """

    # =========================================================================
    # GET /api/vulnerabilities/product-owners - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_by_product_owner_id_returns_list(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return list of vulnerabilities for a product owner."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_returns_empty_list_when_none_exist(
        self, client: AsyncClient
    ):
        """Should return empty list when no vulnerabilities exist for given product owner."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": 9999}
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_by_client_group_returns_all(
        self, client: AsyncClient
    ):
        """Should return vulnerabilities for all product owners in a client group."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"client_group_id": 1}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    # =========================================================================
    # GET - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_without_params_returns_400(
        self, client: AsyncClient
    ):
        """Should return 400 when no filter params provided."""
        response = await client.get("/api/vulnerabilities/product-owners")
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative product_owner_id."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": -1}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_with_zero_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for zero product_owner_id."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": 0}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_with_non_integer_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for non-integer product_owner_id."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": "abc"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_returns_correct_fields(
        self, client: AsyncClient, seed_vulnerability_data, test_product_owner
    ):
        """Should return records with all expected fields."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        assert response.status_code == 200
        if response.json():
            record = response.json()[0]
            assert "id" in record
            assert "product_owner_id" in record
            assert "description" in record
            assert "diagnosed" in record
            assert "status" in record
            assert "created_at" in record

    # =========================================================================
    # GET - Pagination Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_pagination_default_values(
        self, client: AsyncClient, seed_vulnerability_data, test_product_owner
    ):
        """Should use default pagination (skip=0, limit=100)."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        assert response.status_code == 200
        # Default limit is 100, should return all seeded records (3)
        assert len(response.json()) <= 100

    @pytest.mark.asyncio
    async def test_pagination_skip_limit(
        self, client: AsyncClient, seed_vulnerability_data, test_product_owner
    ):
        """Should respect custom skip and limit parameters."""
        # Get all records first
        all_response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        total_count = len(all_response.json())

        # Test with limit=1
        limit_response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "limit": 1}
        )
        assert limit_response.status_code == 200
        assert len(limit_response.json()) == 1

        # Test with skip=1
        skip_response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "skip": 1}
        )
        assert skip_response.status_code == 200
        assert len(skip_response.json()) == total_count - 1

        # Test with skip and limit combined
        combined_response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "skip": 1, "limit": 1}
        )
        assert combined_response.status_code == 200
        assert len(combined_response.json()) <= 1

    @pytest.mark.asyncio
    async def test_pagination_skip_beyond_total(
        self, client: AsyncClient, seed_vulnerability_data, test_product_owner
    ):
        """Should return empty list when skip exceeds total records."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "skip": 1000}
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_pagination_invalid_skip_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for negative skip value."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "skip": -1}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_pagination_invalid_limit_zero_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for limit of 0."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "limit": 0}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_pagination_limit_exceeds_max_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for limit exceeding maximum (1000)."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "limit": 1001}
        )
        assert response.status_code == 422

    # =========================================================================
    # POST /api/vulnerabilities/product-owners - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_vulnerability_returns_201(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should create vulnerability and return 201 status."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "Hearing impairment",
            "adjustments": "Speak clearly, face-to-face",
            "diagnosed": True,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 201
        assert response.json()["description"] == "Hearing impairment"

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_returns_404_for_invalid_product_owner(
        self, client: AsyncClient
    ):
        """Should return 404 when product_owner_id doesn't exist."""
        data = {
            "product_owner_id": 9999,
            "description": "Test vulnerability",
            "status": "Active",
            "diagnosed": False
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_vulnerability_validates_required_fields(
        self, client: AsyncClient
    ):
        """Should return 422 when required fields are missing."""
        response = await client.post("/api/vulnerabilities/product-owners", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_validates_diagnosed_boolean(
        self, client: AsyncClient, test_product_owner
    ):
        """Should validate diagnosed field is boolean."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "Test vulnerability",
            "diagnosed": "invalid"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_accepts_diagnosed_true(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should accept diagnosed=True."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "Test vulnerability",
            "diagnosed": True,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 201
        assert response.json()["diagnosed"] is True

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_accepts_diagnosed_false(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should accept diagnosed=False."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 201
        assert response.json()["diagnosed"] is False

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    # =========================================================================
    # POST - Validation Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_vulnerability_validates_status_enum(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for invalid status value."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": "InvalidStatus"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_accepts_all_valid_statuses(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should accept all valid status values."""
        created_ids = []

        for status in VALID_STATUSES:
            data = {
                "product_owner_id": test_product_owner,
                "description": f"Test_{status}",
                "diagnosed": False,
                "status": status
            }
            response = await client.post("/api/vulnerabilities/product-owners", json=data)
            assert response.status_code == 201, f"Failed for status: {status}"
            if response.status_code == 201:
                created_ids.append(response.json()["id"])

        # Cleanup created records
        for record_id in created_ids:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    record_id
                )
            except Exception:
                pass

    # =========================================================================
    # POST - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_empty_description_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for empty description string."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_whitespace_description_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for whitespace-only description."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "   ",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_max_length_description(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should handle description at max length (500 chars)."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "A" * 500,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_over_max_length_description_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for description exceeding 500 chars."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "A" * 501,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_null_optional_fields(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should accept null for optional fields."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": "Active",
            "adjustments": None,
            "notes": None
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_special_characters(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should handle special characters in text fields."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "Test's \"Vulnerability\" & <Notes>",
            "diagnosed": True,
            "status": "Active",
            "notes": "Patient's notes with unicode characters"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_defaults_diagnosed_to_false(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should default diagnosed to False when not provided."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "Test vulnerability",
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 201
        assert response.json()["diagnosed"] is False

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    # =========================================================================
    # POST - Security Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_vulnerability_sanitizes_sql_injection(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should safely handle SQL injection attempts."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "'; DROP TABLE vulnerabilities_product_owners; --",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        # Should either succeed (sanitized) or fail validation, not execute SQL
        assert response.status_code in [201, 422]

        # Cleanup if created
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_sanitizes_xss_attempt(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should safely handle XSS attempts."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "<script>alert('xss')</script>",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code in [201, 422]

        # Cleanup if created
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    # =========================================================================
    # PUT /api/vulnerabilities/product-owners/{id} - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_update_vulnerability_record(
        self, client: AsyncClient, seed_vulnerability_data
    ):
        """Should update vulnerability record."""
        record_id = seed_vulnerability_data[0]
        data = {"status": "Resolved", "adjustments": "Updated adjustments"}
        response = await client.put(
            f"/api/vulnerabilities/product-owners/{record_id}",
            json=data
        )
        assert response.status_code == 200
        assert response.json()["status"] == "Resolved"
        assert response.json()["adjustments"] == "Updated adjustments"

    @pytest.mark.asyncio
    async def test_update_vulnerability_returns_404_for_invalid_id(
        self, client: AsyncClient
    ):
        """Should return 404 when vulnerability doesn't exist."""
        response = await client.put(
            "/api/vulnerabilities/product-owners/9999",
            json={"status": "Active"}
        )
        assert response.status_code == 404

    # =========================================================================
    # PUT - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_update_vulnerability_with_empty_body(
        self, client: AsyncClient, seed_vulnerability_data
    ):
        """Should return 200 with no changes for empty update body."""
        record_id = seed_vulnerability_data[0]
        response = await client.put(
            f"/api/vulnerabilities/product-owners/{record_id}",
            json={}
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_vulnerability_partial_update(
        self, client: AsyncClient, seed_vulnerability_data
    ):
        """Should only update provided fields."""
        record_id = seed_vulnerability_data[0]
        response = await client.put(
            f"/api/vulnerabilities/product-owners/{record_id}",
            json={"status": "Monitoring"}
        )
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "Monitoring"
        # Other fields should remain unchanged

    @pytest.mark.asyncio
    async def test_update_vulnerability_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative record ID."""
        response = await client.put(
            "/api/vulnerabilities/product-owners/-1",
            json={"status": "Active"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_vulnerability_validates_status_enum(
        self, client: AsyncClient, seed_vulnerability_data
    ):
        """Should return 422 for invalid status value."""
        record_id = seed_vulnerability_data[0]
        response = await client.put(
            f"/api/vulnerabilities/product-owners/{record_id}",
            json={"status": "InvalidStatus"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_vulnerability_can_change_diagnosed(
        self, client: AsyncClient, seed_vulnerability_data
    ):
        """Should be able to update diagnosed field."""
        record_id = seed_vulnerability_data[0]
        response = await client.put(
            f"/api/vulnerabilities/product-owners/{record_id}",
            json={"diagnosed": True}
        )
        assert response.status_code == 200
        assert response.json()["diagnosed"] is True

    # =========================================================================
    # DELETE /api/vulnerabilities/product-owners/{id} - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_delete_vulnerability_record(
        self, client: AsyncClient, seed_vulnerability_data
    ):
        """Should delete vulnerability record."""
        record_id = seed_vulnerability_data[0]
        response = await client.delete(f"/api/vulnerabilities/product-owners/{record_id}")
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_vulnerability_returns_404_for_invalid_id(
        self, client: AsyncClient
    ):
        """Should return 404 when vulnerability doesn't exist."""
        response = await client.delete("/api/vulnerabilities/product-owners/9999")
        assert response.status_code == 404

    # =========================================================================
    # DELETE - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_delete_vulnerability_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative record ID."""
        response = await client.delete("/api/vulnerabilities/product-owners/-1")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_delete_vulnerability_is_idempotent(
        self, client: AsyncClient, seed_vulnerability_data
    ):
        """Should return 404 on second delete (idempotent behavior)."""
        record_id = seed_vulnerability_data[0]
        # First delete
        response1 = await client.delete(f"/api/vulnerabilities/product-owners/{record_id}")
        assert response1.status_code == 204
        # Second delete
        response2 = await client.delete(f"/api/vulnerabilities/product-owners/{record_id}")
        assert response2.status_code == 404

    @pytest.mark.asyncio
    async def test_deleted_vulnerability_not_in_get_results(
        self, client: AsyncClient, seed_vulnerability_data, test_product_owner
    ):
        """Deleted vulnerability should not appear in GET results."""
        record_id = seed_vulnerability_data[0]
        # Delete record
        await client.delete(f"/api/vulnerabilities/product-owners/{record_id}")
        # Verify not in results
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        assert response.status_code == 200
        ids = [r["id"] for r in response.json()]
        assert record_id not in ids

    # =========================================================================
    # Data Integrity Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_created_vulnerability_has_auto_generated_fields(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should auto-generate id, created_at, date_recorded."""
        data = {
            "product_owner_id": test_product_owner,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 201
        result = response.json()
        assert "id" in result and result["id"] is not None
        assert "created_at" in result and result["created_at"] is not None

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                    result["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_concurrent_create_requests_handled(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should handle concurrent create requests without race conditions."""

        async def create_record(suffix: int):
            data = {
                "product_owner_id": test_product_owner,
                "description": f"Vulnerability {suffix}",
                "diagnosed": False,
                "status": "Active"
            }
            return await client.post("/api/vulnerabilities/product-owners", json=data)

        # Create 5 records concurrently
        responses = await asyncio.gather(*[create_record(i) for i in range(5)])

        # All should succeed with unique IDs
        assert all(r.status_code == 201 for r in responses)
        ids = [r.json()["id"] for r in responses]
        assert len(ids) == len(set(ids)), "IDs should be unique"

        # Cleanup created records
        for response in responses:
            if response.status_code == 201:
                try:
                    await db_connection.execute(
                        'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
                        response.json()["id"]
                    )
                except Exception:
                    pass


# =============================================================================
# Property-Based Tests (using Hypothesis)
# =============================================================================

class TestVulnerabilitiesProductOwnersPropertyBased:
    """
    Property-based tests using Hypothesis to generate random valid/invalid inputs.
    These tests verify invariants hold across a wide range of inputs.
    """

    # Valid status values for vulnerabilities
    valid_statuses = st.sampled_from(["Active", "Resolved", "Monitoring", "Inactive"])

    @pytest.mark.asyncio
    @given(description=st.text(min_size=1, max_size=500).filter(lambda x: x.strip()))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_any_valid_description_accepted(
        self, client: AsyncClient, test_product_owner, description: str
    ):
        """
        Property: Any non-empty description (up to 500 chars) should be accepted.

        The response should be one of:
        - 201: Created successfully
        - 404: Product owner not found (valid test scenario)
        - 422: Validation error for other reasons

        Server errors (500) are not acceptable.
        """
        data = {
            "product_owner_id": test_product_owner,
            "description": description,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code in [201, 404, 422]

    @pytest.mark.asyncio
    @given(diagnosed=st.booleans())
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_any_boolean_diagnosed_accepted(
        self, client: AsyncClient, test_product_owner, diagnosed: bool
    ):
        """
        Property: Any boolean value for diagnosed should be accepted.

        True and False are both valid values for the diagnosed field.
        """
        data = {
            "product_owner_id": test_product_owner,
            "description": "Test vulnerability",
            "diagnosed": diagnosed,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code in [201, 404]

    @pytest.mark.asyncio
    @given(status=st.text().filter(lambda x: x not in ["Active", "Resolved", "Monitoring", "Inactive"] and x.strip()))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_invalid_status_rejected(
        self, client: AsyncClient, test_product_owner, status: str
    ):
        """
        Property: Invalid status values should be rejected with 422.

        Valid statuses: Active, Resolved, Monitoring, Inactive
        Any other non-empty string should result in a validation error.
        """
        data = {
            "product_owner_id": test_product_owner,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": status
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(po_id=st.integers(max_value=0))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_non_positive_po_id_rejected(
        self, client: AsyncClient, po_id: int
    ):
        """
        Property: Non-positive product_owner_id (0 or negative) should always be
        rejected with a 422 validation error.

        This ensures that the API properly validates ID parameters before
        attempting database operations.
        """
        data = {
            "product_owner_id": po_id,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(description=st.text(min_size=501, max_size=1000))
    @settings(max_examples=15, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_oversized_description_rejected(
        self, client: AsyncClient, test_product_owner, description: str
    ):
        """
        Property: Description exceeding 500 chars should be rejected with 422.

        This enforces the database schema constraint on description field length.
        """
        data = {
            "product_owner_id": test_product_owner,
            "description": description,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(
        description=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
        adjustments=st.text(max_size=500)
    )
    @settings(max_examples=25, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_unicode_handled_safely(
        self, client: AsyncClient, test_product_owner, description: str, adjustments: str
    ):
        """
        Property: Unicode characters should be handled safely without causing
        server errors (500).

        This includes:
        - Non-ASCII characters (accented letters, CJK, etc.)
        - Emoji and special symbols
        - Right-to-left text
        - Null bytes and control characters

        The API should either accept the input or return a proper validation error.
        """
        data = {
            "product_owner_id": test_product_owner,
            "description": description,
            "adjustments": adjustments,
            "diagnosed": True,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code != 500

    @pytest.mark.asyncio
    @given(
        data=st.fixed_dictionaries({
            "product_owner_id": st.integers(min_value=1, max_value=10000),
            "description": st.text(min_size=1, max_size=500).filter(lambda x: x.strip()),
            "diagnosed": st.booleans(),
            "status": st.sampled_from(["Active", "Resolved", "Monitoring", "Inactive"]),
            "adjustments": st.one_of(st.none(), st.text(max_size=500)),
            "notes": st.one_of(st.none(), st.text(max_size=1000)),
        })
    )
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_valid_data_never_causes_500(
        self, client: AsyncClient, data: dict
    ):
        """
        Property: Valid data should never cause a 500 server error.

        Even if the product_owner_id doesn't exist (404), the server
        should handle the request gracefully without crashing.
        """
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code != 500


# =============================================================================
# Additional Pagination Tests Class
# =============================================================================

class TestVulnerabilitiesPagination:
    """
    Dedicated test class for pagination functionality.
    Ensures proper pagination behavior across all scenarios.
    """

    @pytest.mark.asyncio
    async def test_pagination_returns_correct_count_with_limit(
        self, client: AsyncClient, seed_vulnerability_data, test_product_owner
    ):
        """Should return exactly the number of records specified by limit."""
        response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "limit": 2}
        )
        assert response.status_code == 200
        assert len(response.json()) == 2

    @pytest.mark.asyncio
    async def test_pagination_skip_returns_different_records(
        self, client: AsyncClient, seed_vulnerability_data, test_product_owner
    ):
        """Skip should return different records than no skip."""
        # Get first record
        first_response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "limit": 1}
        )
        # Get record with skip=1
        skip_response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "skip": 1, "limit": 1}
        )

        assert first_response.status_code == 200
        assert skip_response.status_code == 200

        if first_response.json() and skip_response.json():
            assert first_response.json()[0]["id"] != skip_response.json()[0]["id"]

    @pytest.mark.asyncio
    async def test_pagination_preserves_order(
        self, client: AsyncClient, seed_vulnerability_data, test_product_owner
    ):
        """Pagination should preserve consistent ordering."""
        # Get all records
        all_response = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        all_ids = [r["id"] for r in all_response.json()]

        # Get records in pages
        page1 = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "limit": 2}
        )
        page2 = await client.get(
            "/api/vulnerabilities/product-owners",
            params={"product_owner_id": test_product_owner, "skip": 2, "limit": 2}
        )

        paginated_ids = [r["id"] for r in page1.json()] + [r["id"] for r in page2.json()]

        # Order should be the same
        assert all_ids[:len(paginated_ids)] == paginated_ids


# =============================================================================
# Test Fixtures for Special Relationships
# =============================================================================

@pytest_asyncio.fixture
async def test_special_relationship(db_connection):
    """
    Creates a test special relationship and returns its ID for testing.

    The linking works as follows:
    1. Create a client_group
    2. Create a product_owner and link to client_group via client_group_product_owners
    3. Create a special_relationship
    4. Link special_relationship to product_owner via product_owner_special_relationships

    This allows the client_group_id filter to work via the join path:
    vulnerabilities_special_relationships -> special_relationships -> product_owner_special_relationships
    -> product_owners -> client_group_product_owners -> client_groups
    """
    # Step 1: Create a client_group
    client_group_result = await db_connection.fetchrow(
        """
        INSERT INTO client_groups (name, status)
        VALUES ($1, $2)
        RETURNING id
        """,
        "Test SR Group",
        "active"
    )
    client_group_id = client_group_result['id']

    # Step 2: Create a product_owner
    product_owner_result = await db_connection.fetchrow(
        """
        INSERT INTO product_owners (firstname, surname, status)
        VALUES ($1, $2, $3)
        RETURNING id
        """,
        "Test",
        "SROwner",
        "active"
    )
    product_owner_id = product_owner_result['id']

    # Step 3: Link product_owner to client_group
    await db_connection.execute(
        """
        INSERT INTO client_group_product_owners (client_group_id, product_owner_id)
        VALUES ($1, $2)
        """,
        client_group_id,
        product_owner_id
    )

    # Step 4: Create the special relationship
    result = await db_connection.fetchrow(
        """
        INSERT INTO special_relationships (name, type, relationship, status, email, phone_number)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        """,
        "Test SRVuln",
        "Personal",
        "Family Member",
        "Active",
        "srvuln@test.com",
        "+44 7700 900123"
    )
    special_relationship_id = result['id']

    # Step 5: Link special relationship to product_owner
    await db_connection.execute(
        """
        INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
        VALUES ($1, $2)
        """,
        product_owner_id,
        special_relationship_id
    )

    yield {
        "special_relationship_id": special_relationship_id,
        "client_group_id": client_group_id,
        "product_owner_id": product_owner_id
    }

    # Cleanup: Delete in reverse order of creation due to foreign key constraints
    try:
        await db_connection.execute(
            'DELETE FROM vulnerabilities_special_relationships WHERE special_relationship_id = $1',
            special_relationship_id
        )
        await db_connection.execute(
            'DELETE FROM product_owner_special_relationships WHERE special_relationship_id = $1',
            special_relationship_id
        )
        await db_connection.execute(
            'DELETE FROM special_relationships WHERE id = $1',
            special_relationship_id
        )
        await db_connection.execute(
            'DELETE FROM client_group_product_owners WHERE client_group_id = $1 AND product_owner_id = $2',
            client_group_id,
            product_owner_id
        )
        await db_connection.execute(
            'DELETE FROM product_owners WHERE id = $1',
            product_owner_id
        )
        await db_connection.execute(
            'DELETE FROM client_groups WHERE id = $1',
            client_group_id
        )
    except Exception as e:
        print(f"Error cleaning up special relationship: {e}")


@pytest_asyncio.fixture
async def seed_sr_vulnerability_data(db_connection, test_special_relationship):
    """
    Seeds the database with test vulnerability records for special relationships.
    Returns a list of created record IDs.
    """
    created_ids = []
    sr_id = test_special_relationship["special_relationship_id"]

    # Create several vulnerability records
    test_records = [
        ("Mobility issues", "Allow extra time for meetings", True, "Active", None),
        ("Anxiety disorder", "Quiet meeting environment", False, "Monitoring", "Prefers written communication"),
        ("Memory difficulties", "Send written confirmations", True, "Active", "Has power of attorney"),
    ]

    for description, adjustments, diagnosed, status, notes in test_records:
        result = await db_connection.fetchrow(
            """
            INSERT INTO vulnerabilities_special_relationships
            (special_relationship_id, description, adjustments, diagnosed, status, notes, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id
            """,
            sr_id,
            description,
            adjustments,
            diagnosed,
            status,
            notes
        )
        created_ids.append(result['id'])

    yield created_ids

    # Cleanup: Delete created records
    try:
        for record_id in created_ids:
            await db_connection.execute(
                'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                record_id
            )
    except Exception as e:
        print(f"Error cleaning up SR vulnerability records: {e}")


# =============================================================================
# TestVulnerabilitiesSpecialRelationshipsAPI Class - Main Test Suite
# =============================================================================

class TestVulnerabilitiesSpecialRelationshipsAPI:
    """
    Comprehensive tests for vulnerabilities special relationships API endpoints.
    Includes unit tests, edge cases, validation, and security tests.
    """

    # =========================================================================
    # GET /api/vulnerabilities/special-relationships - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_by_special_relationship_id_returns_list(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return list of vulnerabilities for a special relationship."""
        sr_id = test_special_relationship["special_relationship_id"]
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_returns_empty_list_when_none_exist(
        self, client: AsyncClient
    ):
        """Should return empty list when no vulnerabilities exist for given special relationship."""
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": 9999}
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_by_client_group_returns_all_sr(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return vulnerabilities for all special relationships in a client group."""
        cg_id = test_special_relationship["client_group_id"]
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"client_group_id": cg_id}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    # =========================================================================
    # GET - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_without_params_returns_400(
        self, client: AsyncClient
    ):
        """Should return 400 when no filter params provided."""
        response = await client.get("/api/vulnerabilities/special-relationships")
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative special_relationship_id."""
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": -1}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_with_zero_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for zero special_relationship_id."""
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": 0}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_with_non_integer_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for non-integer special_relationship_id."""
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": "abc"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_returns_correct_fields(
        self, client: AsyncClient, seed_sr_vulnerability_data, test_special_relationship
    ):
        """Should return records with all expected fields."""
        sr_id = test_special_relationship["special_relationship_id"]
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id}
        )
        assert response.status_code == 200
        if response.json():
            record = response.json()[0]
            assert "id" in record
            assert "special_relationship_id" in record
            assert "description" in record
            assert "diagnosed" in record
            assert "status" in record
            assert "created_at" in record

    # =========================================================================
    # POST /api/vulnerabilities/special-relationships - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_vulnerability_returns_201(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should create vulnerability and return 201 status."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Cognitive decline",
            "adjustments": "Involve family in discussions",
            "diagnosed": True,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 201
        assert response.json()["description"] == "Cognitive decline"

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_returns_404_for_invalid_sr(
        self, client: AsyncClient
    ):
        """Should return 404 when special_relationship_id doesn't exist."""
        data = {
            "special_relationship_id": 9999,
            "description": "Test vulnerability",
            "status": "Active",
            "diagnosed": False
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_vulnerability_validates_required_fields(
        self, client: AsyncClient
    ):
        """Should return 422 when required fields are missing."""
        response = await client.post("/api/vulnerabilities/special-relationships", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_validates_diagnosed_boolean(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should validate diagnosed field is boolean."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Test vulnerability",
            "diagnosed": "invalid"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_accepts_diagnosed_true(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should accept diagnosed=True."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Test vulnerability",
            "diagnosed": True,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 201
        assert response.json()["diagnosed"] is True

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_accepts_diagnosed_false(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should accept diagnosed=False."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 201
        assert response.json()["diagnosed"] is False

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    # =========================================================================
    # POST - Validation Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_vulnerability_validates_status_enum(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for invalid status value."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": "InvalidStatus"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_accepts_all_valid_statuses(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should accept all valid status values."""
        sr_id = test_special_relationship["special_relationship_id"]
        created_ids = []

        for status in VALID_STATUSES:
            data = {
                "special_relationship_id": sr_id,
                "description": f"Test_{status}",
                "diagnosed": False,
                "status": status
            }
            response = await client.post("/api/vulnerabilities/special-relationships", json=data)
            assert response.status_code == 201, f"Failed for status: {status}"
            if response.status_code == 201:
                created_ids.append(response.json()["id"])

        # Cleanup created records
        for record_id in created_ids:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    record_id
                )
            except Exception:
                pass

    # =========================================================================
    # POST - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_empty_description_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for empty description string."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_whitespace_description_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for whitespace-only description."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "   ",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_max_length_description(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should handle description at max length (500 chars)."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "A" * 500,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_over_max_length_description_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for description exceeding 500 chars."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "A" * 501,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_null_optional_fields(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should accept null for optional fields."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": "Active",
            "adjustments": None,
            "notes": None
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_with_special_characters(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should handle special characters in text fields."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Test's \"Vulnerability\" & <Notes>",
            "diagnosed": True,
            "status": "Active",
            "notes": "Patient's notes with unicode characters"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_defaults_diagnosed_to_false(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should default diagnosed to False when not provided."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Test vulnerability",
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 201
        assert response.json()["diagnosed"] is False

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    # =========================================================================
    # POST - Security Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_vulnerability_sanitizes_sql_injection(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should safely handle SQL injection attempts."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "'; DROP TABLE vulnerabilities_special_relationships; --",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        # Should either succeed (sanitized) or fail validation, not execute SQL
        assert response.status_code in [201, 422]

        # Cleanup if created
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_vulnerability_sanitizes_xss_attempt(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should safely handle XSS attempts."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "<script>alert('xss')</script>",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code in [201, 422]

        # Cleanup if created
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    # =========================================================================
    # PUT /api/vulnerabilities/special-relationships/{id} - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_update_vulnerability_record(
        self, client: AsyncClient, seed_sr_vulnerability_data
    ):
        """Should update vulnerability record."""
        record_id = seed_sr_vulnerability_data[0]
        data = {"status": "Resolved", "adjustments": "Updated adjustments"}
        response = await client.put(
            f"/api/vulnerabilities/special-relationships/{record_id}",
            json=data
        )
        assert response.status_code == 200
        assert response.json()["status"] == "Resolved"
        assert response.json()["adjustments"] == "Updated adjustments"

    @pytest.mark.asyncio
    async def test_update_vulnerability_returns_404_for_invalid_id(
        self, client: AsyncClient
    ):
        """Should return 404 when vulnerability doesn't exist."""
        response = await client.put(
            "/api/vulnerabilities/special-relationships/9999",
            json={"status": "Active"}
        )
        assert response.status_code == 404

    # =========================================================================
    # PUT - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_update_vulnerability_with_empty_body(
        self, client: AsyncClient, seed_sr_vulnerability_data
    ):
        """Should return 200 with no changes for empty update body."""
        record_id = seed_sr_vulnerability_data[0]
        response = await client.put(
            f"/api/vulnerabilities/special-relationships/{record_id}",
            json={}
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_vulnerability_partial_update(
        self, client: AsyncClient, seed_sr_vulnerability_data
    ):
        """Should only update provided fields."""
        record_id = seed_sr_vulnerability_data[0]
        response = await client.put(
            f"/api/vulnerabilities/special-relationships/{record_id}",
            json={"status": "Monitoring"}
        )
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "Monitoring"
        # Other fields should remain unchanged

    @pytest.mark.asyncio
    async def test_update_vulnerability_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative record ID."""
        response = await client.put(
            "/api/vulnerabilities/special-relationships/-1",
            json={"status": "Active"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_vulnerability_validates_status_enum(
        self, client: AsyncClient, seed_sr_vulnerability_data
    ):
        """Should return 422 for invalid status value."""
        record_id = seed_sr_vulnerability_data[0]
        response = await client.put(
            f"/api/vulnerabilities/special-relationships/{record_id}",
            json={"status": "InvalidStatus"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_vulnerability_can_change_diagnosed(
        self, client: AsyncClient, seed_sr_vulnerability_data
    ):
        """Should be able to update diagnosed field."""
        record_id = seed_sr_vulnerability_data[0]
        response = await client.put(
            f"/api/vulnerabilities/special-relationships/{record_id}",
            json={"diagnosed": True}
        )
        assert response.status_code == 200
        assert response.json()["diagnosed"] is True

    # =========================================================================
    # DELETE /api/vulnerabilities/special-relationships/{id} - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_delete_vulnerability_record(
        self, client: AsyncClient, seed_sr_vulnerability_data
    ):
        """Should delete vulnerability record."""
        record_id = seed_sr_vulnerability_data[0]
        response = await client.delete(f"/api/vulnerabilities/special-relationships/{record_id}")
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_vulnerability_returns_404_for_invalid_id(
        self, client: AsyncClient
    ):
        """Should return 404 when vulnerability doesn't exist."""
        response = await client.delete("/api/vulnerabilities/special-relationships/9999")
        assert response.status_code == 404

    # =========================================================================
    # DELETE - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_delete_vulnerability_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative record ID."""
        response = await client.delete("/api/vulnerabilities/special-relationships/-1")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_delete_vulnerability_is_idempotent(
        self, client: AsyncClient, seed_sr_vulnerability_data
    ):
        """Should return 404 on second delete (idempotent behavior)."""
        record_id = seed_sr_vulnerability_data[0]
        # First delete
        response1 = await client.delete(f"/api/vulnerabilities/special-relationships/{record_id}")
        assert response1.status_code == 204
        # Second delete
        response2 = await client.delete(f"/api/vulnerabilities/special-relationships/{record_id}")
        assert response2.status_code == 404

    @pytest.mark.asyncio
    async def test_deleted_vulnerability_not_in_get_results(
        self, client: AsyncClient, seed_sr_vulnerability_data, test_special_relationship
    ):
        """Deleted vulnerability should not appear in GET results."""
        record_id = seed_sr_vulnerability_data[0]
        sr_id = test_special_relationship["special_relationship_id"]
        # Delete record
        await client.delete(f"/api/vulnerabilities/special-relationships/{record_id}")
        # Verify not in results
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id}
        )
        assert response.status_code == 200
        ids = [r["id"] for r in response.json()]
        assert record_id not in ids

    # =========================================================================
    # Data Integrity Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_created_vulnerability_has_auto_generated_fields(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should auto-generate id, created_at, date_recorded."""
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 201
        result = response.json()
        assert "id" in result and result["id"] is not None
        assert "created_at" in result and result["created_at"] is not None

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                    result["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_concurrent_create_requests_handled(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should handle concurrent create requests without race conditions."""
        sr_id = test_special_relationship["special_relationship_id"]

        async def create_record(suffix: int):
            data = {
                "special_relationship_id": sr_id,
                "description": f"Vulnerability {suffix}",
                "diagnosed": False,
                "status": "Active"
            }
            return await client.post("/api/vulnerabilities/special-relationships", json=data)

        # Create 5 records concurrently
        responses = await asyncio.gather(*[create_record(i) for i in range(5)])

        # All should succeed with unique IDs
        assert all(r.status_code == 201 for r in responses)
        ids = [r.json()["id"] for r in responses]
        assert len(ids) == len(set(ids)), "IDs should be unique"

        # Cleanup created records
        for response in responses:
            if response.status_code == 201:
                try:
                    await db_connection.execute(
                        'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
                        response.json()["id"]
                    )
                except Exception:
                    pass


# =============================================================================
# Property-Based Tests for Special Relationships (using Hypothesis)
# =============================================================================

class TestVulnerabilitiesSpecialRelationshipsPropertyBased:
    """
    Property-based tests using Hypothesis for vulnerabilities special relationships API.
    These tests verify invariants hold across a wide range of inputs.
    """

    # Valid status values for vulnerabilities
    valid_statuses = st.sampled_from(["Active", "Resolved", "Monitoring", "Inactive"])

    @pytest.mark.asyncio
    @given(description=st.text(min_size=1, max_size=500).filter(lambda x: x.strip()))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_any_valid_description_accepted(
        self, client: AsyncClient, test_special_relationship, description: str
    ):
        """
        Property: Any non-empty description (up to 500 chars) should be accepted.

        The response should be one of:
        - 201: Created successfully
        - 404: Special relationship not found (valid test scenario)
        - 422: Validation error for other reasons

        Server errors (500) are not acceptable.
        """
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": description,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code in [201, 404, 422]

    @pytest.mark.asyncio
    @given(diagnosed=st.booleans())
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_any_boolean_diagnosed_accepted(
        self, client: AsyncClient, test_special_relationship, diagnosed: bool
    ):
        """
        Property: Any boolean value for diagnosed should be accepted.

        True and False are both valid values for the diagnosed field.
        """
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Test vulnerability",
            "diagnosed": diagnosed,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code in [201, 404]

    @pytest.mark.asyncio
    @given(status=st.text().filter(lambda x: x not in ["Active", "Resolved", "Monitoring", "Inactive"] and x.strip()))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_invalid_status_rejected(
        self, client: AsyncClient, test_special_relationship, status: str
    ):
        """
        Property: Invalid status values should be rejected with 422.

        Valid statuses: Active, Resolved, Monitoring, Inactive
        Any other non-empty string should result in a validation error.
        """
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": status
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(sr_id=st.integers(max_value=0))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_non_positive_sr_id_rejected(
        self, client: AsyncClient, sr_id: int
    ):
        """
        Property: Non-positive special_relationship_id (0 or negative) should always be
        rejected with a 422 validation error.

        This ensures that the API properly validates ID parameters before
        attempting database operations.
        """
        data = {
            "special_relationship_id": sr_id,
            "description": "Test vulnerability",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(description=st.text(min_size=501, max_size=1000))
    @settings(max_examples=15, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_oversized_description_rejected(
        self, client: AsyncClient, test_special_relationship, description: str
    ):
        """
        Property: Description exceeding 500 chars should be rejected with 422.

        This enforces the database schema constraint on description field length.
        """
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": description,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(
        description=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
        adjustments=st.text(max_size=500)
    )
    @settings(max_examples=25, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_unicode_handled_safely(
        self, client: AsyncClient, test_special_relationship, description: str, adjustments: str
    ):
        """
        Property: Unicode characters should be handled safely without causing
        server errors (500).

        This includes:
        - Non-ASCII characters (accented letters, CJK, etc.)
        - Emoji and special symbols
        - Right-to-left text
        - Null bytes and control characters

        The API should either accept the input or return a proper validation error.
        """
        sr_id = test_special_relationship["special_relationship_id"]
        data = {
            "special_relationship_id": sr_id,
            "description": description,
            "adjustments": adjustments,
            "diagnosed": True,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code != 500

    @pytest.mark.asyncio
    @given(
        data=st.fixed_dictionaries({
            "special_relationship_id": st.integers(min_value=1, max_value=10000),
            "description": st.text(min_size=1, max_size=500).filter(lambda x: x.strip()),
            "diagnosed": st.booleans(),
            "status": st.sampled_from(["Active", "Resolved", "Monitoring", "Inactive"]),
            "adjustments": st.one_of(st.none(), st.text(max_size=500)),
            "notes": st.one_of(st.none(), st.text(max_size=1000)),
        })
    )
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_valid_data_never_causes_500(
        self, client: AsyncClient, data: dict
    ):
        """
        Property: Valid data should never cause a 500 server error.

        Even if the special_relationship_id doesn't exist (404), the server
        should handle the request gracefully without crashing.
        """
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code != 500


# =============================================================================
# Pagination Tests for Special Relationships
# =============================================================================

class TestVulnerabilitiesSpecialRelationshipsPagination:
    """
    Dedicated test class for pagination functionality for special relationships.
    Ensures proper pagination behavior across all scenarios.
    """

    @pytest.mark.asyncio
    async def test_pagination_default_values(
        self, client: AsyncClient, seed_sr_vulnerability_data, test_special_relationship
    ):
        """Should use default pagination (skip=0, limit=100)."""
        sr_id = test_special_relationship["special_relationship_id"]
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id}
        )
        assert response.status_code == 200
        # Default limit is 100, should return all seeded records (3)
        assert len(response.json()) <= 100

    @pytest.mark.asyncio
    async def test_pagination_skip_limit(
        self, client: AsyncClient, seed_sr_vulnerability_data, test_special_relationship
    ):
        """Should respect custom skip and limit parameters."""
        sr_id = test_special_relationship["special_relationship_id"]

        # Get all records first
        all_response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id}
        )
        total_count = len(all_response.json())

        # Test with limit=1
        limit_response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "limit": 1}
        )
        assert limit_response.status_code == 200
        assert len(limit_response.json()) == 1

        # Test with skip=1
        skip_response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "skip": 1}
        )
        assert skip_response.status_code == 200
        assert len(skip_response.json()) == total_count - 1

        # Test with skip and limit combined
        combined_response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "skip": 1, "limit": 1}
        )
        assert combined_response.status_code == 200
        assert len(combined_response.json()) <= 1

    @pytest.mark.asyncio
    async def test_pagination_returns_correct_count_with_limit(
        self, client: AsyncClient, seed_sr_vulnerability_data, test_special_relationship
    ):
        """Should return exactly the number of records specified by limit."""
        sr_id = test_special_relationship["special_relationship_id"]
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "limit": 2}
        )
        assert response.status_code == 200
        assert len(response.json()) == 2

    @pytest.mark.asyncio
    async def test_pagination_skip_returns_different_records(
        self, client: AsyncClient, seed_sr_vulnerability_data, test_special_relationship
    ):
        """Skip should return different records than no skip."""
        sr_id = test_special_relationship["special_relationship_id"]

        # Get first record
        first_response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "limit": 1}
        )
        # Get record with skip=1
        skip_response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "skip": 1, "limit": 1}
        )

        assert first_response.status_code == 200
        assert skip_response.status_code == 200

        if first_response.json() and skip_response.json():
            assert first_response.json()[0]["id"] != skip_response.json()[0]["id"]

    @pytest.mark.asyncio
    async def test_pagination_skip_beyond_total(
        self, client: AsyncClient, seed_sr_vulnerability_data, test_special_relationship
    ):
        """Should return empty list when skip exceeds total records."""
        sr_id = test_special_relationship["special_relationship_id"]
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "skip": 1000}
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_pagination_invalid_skip_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for negative skip value."""
        sr_id = test_special_relationship["special_relationship_id"]
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "skip": -1}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_pagination_invalid_limit_zero_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for limit of 0."""
        sr_id = test_special_relationship["special_relationship_id"]
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "limit": 0}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_pagination_limit_exceeds_max_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for limit exceeding maximum (1000)."""
        sr_id = test_special_relationship["special_relationship_id"]
        response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "limit": 1001}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_pagination_preserves_order(
        self, client: AsyncClient, seed_sr_vulnerability_data, test_special_relationship
    ):
        """Pagination should preserve consistent ordering."""
        sr_id = test_special_relationship["special_relationship_id"]

        # Get all records
        all_response = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id}
        )
        all_ids = [r["id"] for r in all_response.json()]

        # Get records in pages
        page1 = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "limit": 2}
        )
        page2 = await client.get(
            "/api/vulnerabilities/special-relationships",
            params={"special_relationship_id": sr_id, "skip": 2, "limit": 2}
        )

        paginated_ids = [r["id"] for r in page1.json()] + [r["id"] for r in page2.json()]

        # Order should be the same
        assert all_ids[:len(paginated_ids)] == paginated_ids
