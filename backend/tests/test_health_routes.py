"""
Test suite for Health Product Owners API Routes

Comprehensive tests for health product owners API endpoints in the Kingston's Portal system.
This implements Cycle 1 of the Health and Vulnerabilities feature - RED phase (TDD).

API Endpoints Under Test:
- GET /api/health/product-owners?product_owner_id={id}
- GET /api/health/product-owners?client_group_id={id}
- POST /api/health/product-owners
- PUT /api/health/product-owners/{record_id}
- DELETE /api/health/product-owners/{record_id}

Test Coverage:
- Unit tests for all CRUD operations
- Edge case tests (negative IDs, zero IDs, non-integer IDs, etc.)
- Validation tests (status enum, date format, empty/whitespace conditions, max length)
- Security tests (SQL injection, XSS)
- Data integrity tests (auto-generated fields, concurrent requests)
- Property-based tests using Hypothesis
- Stateful state machine tests
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import date, datetime, timedelta
from typing import Dict, Any, List
import asyncio
import asyncpg

# Hypothesis imports for property-based testing
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app


# =============================================================================
# Constants
# =============================================================================

VALID_STATUSES = ["Active", "Resolved", "Monitoring", "Inactive"]
VALID_CONDITIONS = [
    "Smoking", "Diabetes", "Heart Disease", "Cancer", "Asthma",
    "High Blood Pressure", "Mental Health", "Other"
]


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
        "HealthOwner",
        "active"
    )
    product_owner_id = result['id']

    yield product_owner_id

    # Cleanup: Delete the product owner (and cascading health records)
    try:
        await db_connection.execute(
            'DELETE FROM health_product_owners WHERE product_owner_id = $1',
            product_owner_id
        )
        await db_connection.execute(
            'DELETE FROM product_owners WHERE id = $1',
            product_owner_id
        )
    except Exception as e:
        print(f"Error cleaning up product owner: {e}")


@pytest_asyncio.fixture
async def seed_health_data(db_connection, test_product_owner):
    """
    Seeds the database with test health records for testing GET, PUT, DELETE.
    Returns a list of created record IDs.
    """
    created_ids = []

    # Create several health records
    test_records = [
        ("Smoking", "Current Smoker", "Active", None),
        ("Diabetes", "Type 2 Diabetes", "Monitoring", "2020-01-15"),
        ("Heart Disease", "Mild Condition", "Resolved", "2019-06-01"),
    ]

    for condition, name, status, diagnosis_date in test_records:
        result = await db_connection.fetchrow(
            """
            INSERT INTO health_product_owners
            (product_owner_id, condition, name, status, date_of_diagnosis, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id
            """,
            test_product_owner,
            condition,
            name,
            status,
            date.fromisoformat(diagnosis_date) if diagnosis_date else None
        )
        created_ids.append(result['id'])

    yield created_ids

    # Cleanup: Delete created records
    try:
        for record_id in created_ids:
            await db_connection.execute(
                'DELETE FROM health_product_owners WHERE id = $1',
                record_id
            )
    except Exception as e:
        print(f"Error cleaning up health records: {e}")


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
# TestHealthProductOwnersAPI Class - Main Test Suite
# =============================================================================

class TestHealthProductOwnersAPI:
    """
    Comprehensive tests for health product owners API endpoints.
    Includes unit tests, edge cases, validation, and security tests.
    """

    # =========================================================================
    # GET /api/health/product-owners - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_health_records_by_product_owner_id_returns_list(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return list of health records for a product owner."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_get_health_records_returns_empty_list_when_none_exist(
        self, client: AsyncClient
    ):
        """Should return empty list when no health records exist for given product owner."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": 9999}
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_health_records_by_client_group_returns_all_owner_records(
        self, client: AsyncClient
    ):
        """Should return health records for all product owners in a client group."""
        response = await client.get(
            "/api/health/product-owners",
            params={"client_group_id": 1}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    # =========================================================================
    # GET - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_health_records_without_params_returns_400(
        self, client: AsyncClient
    ):
        """Should return 400 when no filter params provided."""
        response = await client.get("/api/health/product-owners")
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_health_records_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative product_owner_id."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": -1}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_health_records_with_zero_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for zero product_owner_id."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": 0}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_health_records_with_non_integer_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for non-integer product_owner_id."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": "abc"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_health_records_returns_correct_fields(
        self, client: AsyncClient, seed_health_data, test_product_owner
    ):
        """Should return records with all expected fields."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        assert response.status_code == 200
        if response.json():
            record = response.json()[0]
            assert "id" in record
            assert "product_owner_id" in record
            assert "condition" in record
            assert "status" in record
            assert "created_at" in record

    # =========================================================================
    # GET - Pagination Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_health_records_default_pagination(
        self, client: AsyncClient, seed_health_data, test_product_owner
    ):
        """Should use default pagination (skip=0, limit=100)."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        assert response.status_code == 200
        # Default limit is 100, should return all seeded records (3)
        assert len(response.json()) <= 100

    @pytest.mark.asyncio
    async def test_get_health_records_with_custom_limit(
        self, client: AsyncClient, seed_health_data, test_product_owner
    ):
        """Should respect custom limit parameter."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner, "limit": 1}
        )
        assert response.status_code == 200
        assert len(response.json()) == 1

    @pytest.mark.asyncio
    async def test_get_health_records_with_skip(
        self, client: AsyncClient, seed_health_data, test_product_owner
    ):
        """Should skip records correctly."""
        # Get all records first
        all_response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        total_count = len(all_response.json())

        # Now skip 1
        skip_response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner, "skip": 1}
        )
        assert skip_response.status_code == 200
        assert len(skip_response.json()) == total_count - 1

    @pytest.mark.asyncio
    async def test_get_health_records_skip_beyond_total(
        self, client: AsyncClient, seed_health_data, test_product_owner
    ):
        """Should return empty list when skip exceeds total records."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner, "skip": 1000}
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_health_records_pagination_combined(
        self, client: AsyncClient, seed_health_data, test_product_owner
    ):
        """Should combine skip and limit correctly."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner, "skip": 1, "limit": 1}
        )
        assert response.status_code == 200
        assert len(response.json()) <= 1

    @pytest.mark.asyncio
    async def test_get_health_records_invalid_skip_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for negative skip value."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner, "skip": -1}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_health_records_invalid_limit_zero_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for limit of 0."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner, "limit": 0}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_health_records_limit_exceeds_max_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for limit exceeding maximum (1000)."""
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner, "limit": 1001}
        )
        assert response.status_code == 422

    # =========================================================================
    # POST /api/health/product-owners - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_health_record_returns_201_with_valid_data(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should create health record and return 201 status."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Smoking",
            "name": "Current Smoker",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201
        assert response.json()["condition"] == "Smoking"

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_returns_404_for_invalid_product_owner(
        self, client: AsyncClient
    ):
        """Should return 404 when product_owner_id doesn't exist."""
        data = {
            "product_owner_id": 9999,
            "condition": "Test",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_health_record_validates_required_fields(
        self, client: AsyncClient
    ):
        """Should return 422 when required fields are missing."""
        response = await client.post("/api/health/product-owners", json={})
        assert response.status_code == 422

    # =========================================================================
    # POST - Validation Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_health_record_validates_status_enum(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for invalid status value."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Smoking",
            "status": "InvalidStatus"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_health_record_accepts_all_valid_statuses(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should accept all valid status values."""
        valid_statuses = ["Active", "Resolved", "Monitoring", "Inactive"]
        created_ids = []

        for status in valid_statuses:
            data = {
                "product_owner_id": test_product_owner,
                "condition": f"Test_{status}",
                "status": status
            }
            response = await client.post("/api/health/product-owners", json=data)
            assert response.status_code == 201, f"Failed for status: {status}"
            if response.status_code == 201:
                created_ids.append(response.json()["id"])

        # Cleanup created records
        for record_id in created_ids:
            try:
                await db_connection.execute(
                    'DELETE FROM health_product_owners WHERE id = $1',
                    record_id
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_validates_date_format(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for invalid date format."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Smoking",
            "status": "Active",
            "date_of_diagnosis": "not-a-date"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_health_record_accepts_valid_date(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should accept valid ISO date format."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Diabetes",
            "status": "Active",
            "date_of_diagnosis": "2023-06-15"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_rejects_future_diagnosis_date(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for diagnosis date in the future."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Test",
            "status": "Active",
            "date_of_diagnosis": "2099-01-01"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    # =========================================================================
    # POST - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_health_record_with_empty_condition_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for empty condition string."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_health_record_with_whitespace_condition_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for whitespace-only condition."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "   ",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_health_record_with_max_length_condition(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should handle condition at max length (255 chars)."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "A" * 255,
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_with_over_max_length_returns_422(
        self, client: AsyncClient, test_product_owner
    ):
        """Should return 422 for condition exceeding max length."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "A" * 256,
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_health_record_with_null_optional_fields(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should accept null for optional fields."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Smoking",
            "status": "Active",
            "name": None,
            "medication": None,
            "notes": None
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_with_special_characters(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should handle special characters in text fields."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Test's \"Condition\" & <Notes>",
            "status": "Active",
            "notes": "Patient's notes with unicode characters"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    # =========================================================================
    # POST - Security Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_health_record_sanitizes_sql_injection(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should safely handle SQL injection attempts."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "'; DROP TABLE health_product_owners; --",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        # Should either succeed (sanitized) or fail validation, not execute SQL
        assert response.status_code in [201, 422]

        # Cleanup if created
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_sanitizes_xss_attempt(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should safely handle XSS attempts."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "<script>alert('xss')</script>",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code in [201, 422]

        # Cleanup if created
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_product_owners WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    # =========================================================================
    # PUT /api/health/product-owners/{id} - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_update_health_record_returns_updated_record(
        self, client: AsyncClient, seed_health_data
    ):
        """Should update and return the modified record."""
        record_id = seed_health_data[0]
        data = {"condition": "Updated Condition", "status": "Resolved"}
        response = await client.put(
            f"/api/health/product-owners/{record_id}",
            json=data
        )
        assert response.status_code == 200
        assert response.json()["status"] == "Resolved"

    @pytest.mark.asyncio
    async def test_update_health_record_returns_404_for_invalid_id(
        self, client: AsyncClient
    ):
        """Should return 404 when health record doesn't exist."""
        response = await client.put(
            "/api/health/product-owners/9999",
            json={"status": "Active"}
        )
        assert response.status_code == 404

    # =========================================================================
    # PUT - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_update_health_record_with_empty_body(
        self, client: AsyncClient, seed_health_data
    ):
        """Should return 200 with no changes for empty update body."""
        record_id = seed_health_data[0]
        response = await client.put(
            f"/api/health/product-owners/{record_id}",
            json={}
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_health_record_partial_update(
        self, client: AsyncClient, seed_health_data
    ):
        """Should only update provided fields."""
        record_id = seed_health_data[0]
        response = await client.put(
            f"/api/health/product-owners/{record_id}",
            json={"status": "Monitoring"}
        )
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "Monitoring"
        # Other fields should remain unchanged

    @pytest.mark.asyncio
    async def test_update_health_record_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative record ID."""
        response = await client.put(
            "/api/health/product-owners/-1",
            json={"status": "Active"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_health_record_validates_status_enum(
        self, client: AsyncClient, seed_health_data
    ):
        """Should return 422 for invalid status value."""
        record_id = seed_health_data[0]
        response = await client.put(
            f"/api/health/product-owners/{record_id}",
            json={"status": "InvalidStatus"}
        )
        assert response.status_code == 422

    # =========================================================================
    # DELETE /api/health/product-owners/{id} - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_delete_health_record_returns_204(
        self, client: AsyncClient, seed_health_data
    ):
        """Should delete record and return 204 No Content."""
        record_id = seed_health_data[0]
        response = await client.delete(f"/api/health/product-owners/{record_id}")
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_health_record_returns_404_for_invalid_id(
        self, client: AsyncClient
    ):
        """Should return 404 when health record doesn't exist."""
        response = await client.delete("/api/health/product-owners/9999")
        assert response.status_code == 404

    # =========================================================================
    # DELETE - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_delete_health_record_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative record ID."""
        response = await client.delete("/api/health/product-owners/-1")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_delete_health_record_is_idempotent(
        self, client: AsyncClient, seed_health_data
    ):
        """Should return 404 on second delete (idempotent behavior)."""
        record_id = seed_health_data[0]
        # First delete
        response1 = await client.delete(f"/api/health/product-owners/{record_id}")
        assert response1.status_code == 204
        # Second delete
        response2 = await client.delete(f"/api/health/product-owners/{record_id}")
        assert response2.status_code == 404

    @pytest.mark.asyncio
    async def test_deleted_record_not_in_get_results(
        self, client: AsyncClient, seed_health_data, test_product_owner
    ):
        """Deleted record should not appear in GET results."""
        record_id = seed_health_data[0]
        # Delete record
        await client.delete(f"/api/health/product-owners/{record_id}")
        # Verify not in results
        response = await client.get(
            "/api/health/product-owners",
            params={"product_owner_id": test_product_owner}
        )
        assert response.status_code == 200
        ids = [r["id"] for r in response.json()]
        assert record_id not in ids

    # =========================================================================
    # Data Integrity Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_created_record_has_auto_generated_fields(
        self, client: AsyncClient, test_product_owner, db_connection
    ):
        """Should auto-generate id, created_at, date_recorded."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Test",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201
        result = response.json()
        assert "id" in result and result["id"] is not None
        assert "created_at" in result and result["created_at"] is not None

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_product_owners WHERE id = $1',
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
                "condition": f"Condition {suffix}",
                "status": "Active"
            }
            return await client.post("/api/health/product-owners", json=data)

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
                        'DELETE FROM health_product_owners WHERE id = $1',
                        response.json()["id"]
                    )
                except Exception:
                    pass


# =============================================================================
# Property-Based Tests (using Hypothesis)
# =============================================================================

class TestHealthProductOwnersPropertyBased:
    """
    Property-based tests using Hypothesis to generate random valid/invalid inputs.
    These tests verify invariants hold across a wide range of inputs.
    """

    # Valid status values for health conditions
    valid_statuses = st.sampled_from(["Active", "Resolved", "Monitoring", "Inactive"])

    # Valid condition types
    valid_conditions = st.sampled_from([
        "Smoking", "Diabetes", "Heart Disease", "Cancer", "Asthma",
        "High Blood Pressure", "Mental Health", "Other"
    ])

    # Strategy for valid health record data
    valid_health_record = st.fixed_dictionaries({
        "product_owner_id": st.integers(min_value=1, max_value=10000),
        "condition": st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        "status": valid_statuses,
        "name": st.one_of(st.none(), st.text(max_size=255)),
        "medication": st.one_of(st.none(), st.text(max_size=500)),
        "notes": st.one_of(st.none(), st.text(max_size=2000)),
    })

    # Strategy for dates (past dates only for diagnosis)
    past_dates = st.dates(
        min_value=date(1900, 1, 1),
        max_value=date.today()
    ).map(lambda d: d.isoformat())

    @pytest.mark.asyncio
    @given(condition=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()))
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_any_non_empty_condition_is_accepted(
        self, client: AsyncClient, test_product_owner, condition: str
    ):
        """Property: Any non-empty, non-whitespace condition string should be accepted."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": condition,
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        # Should either succeed or fail for known validation reasons (not 500)
        assert response.status_code in [201, 404, 422]

    @pytest.mark.asyncio
    @given(status=st.text().filter(lambda x: x not in ["Active", "Resolved", "Monitoring", "Inactive"]))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_invalid_status_always_rejected(
        self, client: AsyncClient, test_product_owner, status: str
    ):
        """Property: Any status not in valid set should be rejected with 422."""
        assume(status.strip())  # Skip empty strings
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Test",
            "status": status
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(product_owner_id=st.integers(max_value=0))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_non_positive_product_owner_id_rejected(
        self, client: AsyncClient, product_owner_id: int
    ):
        """Property: Non-positive product_owner_id should always be rejected."""
        data = {
            "product_owner_id": product_owner_id,
            "condition": "Test",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(condition=st.text(min_size=256, max_size=1000))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_oversized_condition_rejected(
        self, client: AsyncClient, test_product_owner, condition: str
    ):
        """Property: Condition exceeding 255 chars should be rejected."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": condition,
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(diagnosis_date=st.dates(min_value=date.today() + timedelta(days=1)))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_future_diagnosis_date_rejected(
        self, client: AsyncClient, test_product_owner, diagnosis_date: date
    ):
        """Property: Future diagnosis dates should always be rejected."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Test",
            "status": "Active",
            "date_of_diagnosis": diagnosis_date.isoformat()
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(diagnosis_date=st.dates(min_value=date(1900, 1, 1), max_value=date.today()))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_past_diagnosis_date_accepted(
        self, client: AsyncClient, test_product_owner, diagnosis_date: date
    ):
        """Property: Past or today's diagnosis dates should be accepted."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": "Test",
            "status": "Active",
            "date_of_diagnosis": diagnosis_date.isoformat()
        }
        response = await client.post("/api/health/product-owners", json=data)
        # Should succeed if product owner exists, or 404 if not
        assert response.status_code in [201, 404]

    @pytest.mark.asyncio
    @given(data=st.fixed_dictionaries({
        "product_owner_id": st.integers(min_value=1, max_value=10000),
        "condition": st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        "status": st.sampled_from(["Active", "Resolved", "Monitoring", "Inactive"]),
        "name": st.one_of(st.none(), st.text(max_size=255)),
        "medication": st.one_of(st.none(), st.text(max_size=500)),
        "notes": st.one_of(st.none(), st.text(max_size=2000)),
    }))
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_valid_data_never_causes_500(
        self, client: AsyncClient, data: dict
    ):
        """Property: Valid data should never cause a 500 server error."""
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code != 500

    @pytest.mark.asyncio
    @given(
        condition=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
        medication=st.text(max_size=200),
        notes=st.text(max_size=500)
    )
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_unicode_and_special_chars_handled(
        self, client: AsyncClient, test_product_owner, condition: str, medication: str, notes: str
    ):
        """Property: Unicode and special characters should be handled safely."""
        data = {
            "product_owner_id": test_product_owner,
            "condition": condition,
            "status": "Active",
            "medication": medication,
            "notes": notes
        }
        response = await client.post("/api/health/product-owners", json=data)
        # Should not crash - either succeed or validate properly
        assert response.status_code in [201, 404, 422]


# =============================================================================
# Stateful State Machine Test (using Hypothesis)
# =============================================================================

class TestHealthRecordStateMachine(RuleBasedStateMachine):
    """
    Stateful property-based testing to verify CRUD operations maintain consistency.
    Uses Hypothesis state machine to model health record lifecycle.
    """

    def __init__(self):
        super().__init__()
        self.created_ids: List[int] = []
        self.client: AsyncClient = None
        self.product_owner_id: int = 1  # Default test product owner

    @rule(condition=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()))
    def create_record(self, condition: str):
        """Create a new health record."""
        if self.client is None:
            return

        async def _create():
            data = {
                "product_owner_id": self.product_owner_id,
                "condition": condition,
                "status": "Active"
            }
            response = await self.client.post("/api/health/product-owners", json=data)
            if response.status_code == 201:
                self.created_ids.append(response.json()["id"])

        # Run async code synchronously for state machine
        asyncio.get_event_loop().run_until_complete(_create())

    @rule()
    def delete_random_record(self):
        """Delete a random created record."""
        if self.client is None or not self.created_ids:
            return

        async def _delete():
            record_id = self.created_ids.pop()
            response = await self.client.delete(f"/api/health/product-owners/{record_id}")
            assert response.status_code == 204

        asyncio.get_event_loop().run_until_complete(_delete())

    @invariant()
    def all_created_records_retrievable(self):
        """All non-deleted records should be retrievable."""
        if self.client is None or not self.created_ids:
            return

        async def _verify():
            response = await self.client.get(
                "/api/health/product-owners",
                params={"product_owner_id": self.product_owner_id}
            )
            ids = [r["id"] for r in response.json()]
            for record_id in self.created_ids:
                assert record_id in ids

        asyncio.get_event_loop().run_until_complete(_verify())


# Create a test for the state machine
@pytest.mark.skip(reason="State machine tests require special setup - enable when implementation is ready")
class TestStateMachine:
    """Wrapper class to run state machine tests with pytest."""

    def test_health_record_state_machine(self):
        """Run the health record state machine test."""
        TestHealthRecordStateMachine.TestCase.settings = settings(
            max_examples=100,
            stateful_step_count=20
        )
        run_state_machine_as_test(TestHealthRecordStateMachine)


def run_state_machine_as_test(machine_class):
    """Helper function to run a state machine as a test."""
    from hypothesis.stateful import run_state_machine_as_test as _run
    _run(machine_class)


# =============================================================================
# Special Relationships Test Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def test_client_group(db_connection):
    """Creates a test client group and returns its ID for testing."""
    result = await db_connection.fetchrow(
        """
        INSERT INTO client_groups (name, status)
        VALUES ($1, $2)
        RETURNING id
        """,
        "Test Health Client Group",
        "active"
    )
    client_group_id = result['id']

    yield client_group_id

    # Cleanup: Delete the client group
    try:
        await db_connection.execute(
            'DELETE FROM client_groups WHERE id = $1',
            client_group_id
        )
    except Exception as e:
        print(f"Error cleaning up client group: {e}")


@pytest_asyncio.fixture
async def test_product_owner_for_sr(db_connection, test_client_group):
    """
    Creates a test product owner linked to a client group for testing special relationships.
    This is needed because special_relationships link to product_owners, not directly to client_groups.
    """
    # Create a product owner
    po_result = await db_connection.fetchrow(
        """
        INSERT INTO product_owners (firstname, surname, status)
        VALUES ($1, $2, $3)
        RETURNING id
        """,
        "Test",
        "SROwner",
        "active"
    )
    product_owner_id = po_result['id']

    # Link product owner to client group
    await db_connection.execute(
        """
        INSERT INTO client_group_product_owners (client_group_id, product_owner_id)
        VALUES ($1, $2)
        """,
        test_client_group,
        product_owner_id
    )

    yield product_owner_id

    # Cleanup
    try:
        await db_connection.execute(
            'DELETE FROM client_group_product_owners WHERE product_owner_id = $1',
            product_owner_id
        )
        await db_connection.execute(
            'DELETE FROM product_owners WHERE id = $1',
            product_owner_id
        )
    except Exception as e:
        print(f"Error cleaning up product owner for SR: {e}")


@pytest_asyncio.fixture
async def test_special_relationship(db_connection, test_product_owner_for_sr):
    """
    Creates a test special relationship and returns its ID for testing.
    Similar to test_product_owner fixture but for special relationships.

    The special_relationships table has these columns:
    - id, name, type, dob, age, dependency, address_id, status, email, phone, relationship, notes
    We also need to create a link in product_owner_special_relationships junction table.
    """
    # Create the special relationship
    result = await db_connection.fetchrow(
        """
        INSERT INTO special_relationships (name, type, relationship, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        """,
        "Test HealthRelationship",
        "Family Member",
        "Spouse",
        "active"
    )
    special_relationship_id = result['id']

    # Link special relationship to product owner via junction table
    await db_connection.execute(
        """
        INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
        VALUES ($1, $2)
        """,
        test_product_owner_for_sr,
        special_relationship_id
    )

    yield special_relationship_id

    # Cleanup: Delete health records first (foreign key constraint), then links, then special relationship
    try:
        await db_connection.execute(
            'DELETE FROM health_special_relationships WHERE special_relationship_id = $1',
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
    except Exception as e:
        print(f"Error cleaning up special relationship: {e}")


@pytest_asyncio.fixture
async def seed_health_sr_data(db_connection, test_special_relationship):
    """
    Seeds the database with test health records for special relationships.
    Returns a list of created record IDs.
    """
    created_ids = []

    # Create several health records for special relationships
    test_records = [
        ("Dementia", "Early Stage Alzheimer's", "Active", None),
        ("Heart Disease", "Coronary Artery Disease", "Monitoring", "2021-03-20"),
        ("Diabetes", "Type 1 Diabetes", "Resolved", "2018-11-10"),
    ]

    for condition, name, status, diagnosis_date in test_records:
        result = await db_connection.fetchrow(
            """
            INSERT INTO health_special_relationships
            (special_relationship_id, condition, name, status, date_of_diagnosis, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id
            """,
            test_special_relationship,
            condition,
            name,
            status,
            date.fromisoformat(diagnosis_date) if diagnosis_date else None
        )
        created_ids.append(result['id'])

    yield created_ids

    # Cleanup: Delete created records
    try:
        for record_id in created_ids:
            await db_connection.execute(
                'DELETE FROM health_special_relationships WHERE id = $1',
                record_id
            )
    except Exception as e:
        print(f"Error cleaning up health SR records: {e}")


# =============================================================================
# TestHealthSpecialRelationshipsAPI Class - Main Test Suite
# =============================================================================

class TestHealthSpecialRelationshipsAPI:
    """
    Comprehensive tests for health special relationships API endpoints.

    API Endpoints Under Test:
    - GET /api/health/special-relationships?special_relationship_id={id}
    - GET /api/health/special-relationships?client_group_id={id}
    - POST /api/health/special-relationships
    - PUT /api/health/special-relationships/{record_id}
    - DELETE /api/health/special-relationships/{record_id}

    This implements Cycle 2 of the Health and Vulnerabilities feature - RED phase (TDD).
    Tests are designed to fail until the API implementation is complete.
    """

    # =========================================================================
    # GET /api/health/special-relationships - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_health_records_by_special_relationship_id(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return list of health records for a special relationship."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_get_health_records_returns_empty_list_when_none_exist(
        self, client: AsyncClient
    ):
        """Should return empty list when no health records exist for given special relationship."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": 9999}
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_health_records_by_client_group_returns_all_sr_records(
        self, client: AsyncClient, test_client_group
    ):
        """Should return health records for all special relationships in a client group."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"client_group_id": test_client_group}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    # =========================================================================
    # GET - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_health_records_without_params_returns_400(
        self, client: AsyncClient
    ):
        """Should return 400 when no filter params provided."""
        response = await client.get("/api/health/special-relationships")
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_health_records_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative special_relationship_id."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": -1}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_health_records_with_zero_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for zero special_relationship_id."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": 0}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_health_records_with_non_integer_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for non-integer special_relationship_id."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": "abc"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_health_records_returns_correct_fields(
        self, client: AsyncClient, seed_health_sr_data, test_special_relationship
    ):
        """Should return records with all expected fields."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship}
        )
        assert response.status_code == 200
        if response.json():
            record = response.json()[0]
            assert "id" in record
            assert "special_relationship_id" in record
            assert "condition" in record
            assert "status" in record
            assert "created_at" in record

    # =========================================================================
    # GET - Pagination Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_get_health_records_sr_default_pagination(
        self, client: AsyncClient, seed_health_sr_data, test_special_relationship
    ):
        """Should use default pagination (skip=0, limit=100)."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship}
        )
        assert response.status_code == 200
        # Default limit is 100, should return all seeded records (3)
        assert len(response.json()) <= 100

    @pytest.mark.asyncio
    async def test_get_health_records_sr_with_custom_limit(
        self, client: AsyncClient, seed_health_sr_data, test_special_relationship
    ):
        """Should respect custom limit parameter."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship, "limit": 1}
        )
        assert response.status_code == 200
        assert len(response.json()) == 1

    @pytest.mark.asyncio
    async def test_get_health_records_sr_with_skip(
        self, client: AsyncClient, seed_health_sr_data, test_special_relationship
    ):
        """Should skip records correctly."""
        # Get all records first
        all_response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship}
        )
        total_count = len(all_response.json())

        # Now skip 1
        skip_response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship, "skip": 1}
        )
        assert skip_response.status_code == 200
        assert len(skip_response.json()) == total_count - 1

    @pytest.mark.asyncio
    async def test_get_health_records_sr_skip_beyond_total(
        self, client: AsyncClient, seed_health_sr_data, test_special_relationship
    ):
        """Should return empty list when skip exceeds total records."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship, "skip": 1000}
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_health_records_sr_pagination_combined(
        self, client: AsyncClient, seed_health_sr_data, test_special_relationship
    ):
        """Should combine skip and limit correctly."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship, "skip": 1, "limit": 1}
        )
        assert response.status_code == 200
        assert len(response.json()) <= 1

    @pytest.mark.asyncio
    async def test_get_health_records_sr_invalid_skip_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for negative skip value."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship, "skip": -1}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_health_records_sr_invalid_limit_zero_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for limit of 0."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship, "limit": 0}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_health_records_sr_limit_exceeds_max_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for limit exceeding maximum (1000)."""
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship, "limit": 1001}
        )
        assert response.status_code == 422

    # =========================================================================
    # POST /api/health/special-relationships - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_health_record_for_special_relationship(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should create health record for special relationship and return 201."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Heart Disease",
            "name": "Coronary Artery Disease",
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 201
        assert response.json()["condition"] == "Heart Disease"

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_returns_404_for_invalid_sr(
        self, client: AsyncClient
    ):
        """Should return 404 when special_relationship_id doesn't exist."""
        data = {
            "special_relationship_id": 9999,
            "condition": "Test",
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_health_record_validates_required_fields(
        self, client: AsyncClient
    ):
        """Should return 422 when required fields are missing."""
        response = await client.post("/api/health/special-relationships", json={})
        assert response.status_code == 422

    # =========================================================================
    # POST - Validation Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_health_record_validates_status_enum(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for invalid status value."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Heart Disease",
            "status": "InvalidStatus"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_health_record_accepts_all_valid_statuses(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should accept all valid status values."""
        valid_statuses = ["Active", "Resolved", "Monitoring", "Inactive"]
        created_ids = []

        for status in valid_statuses:
            data = {
                "special_relationship_id": test_special_relationship,
                "condition": f"Test_{status}",
                "status": status
            }
            response = await client.post("/api/health/special-relationships", json=data)
            assert response.status_code == 201, f"Failed for status: {status}"
            if response.status_code == 201:
                created_ids.append(response.json()["id"])

        # Cleanup created records
        for record_id in created_ids:
            try:
                await db_connection.execute(
                    'DELETE FROM health_special_relationships WHERE id = $1',
                    record_id
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_validates_date_format(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for invalid date format."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Heart Disease",
            "status": "Active",
            "date_of_diagnosis": "not-a-date"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_health_record_accepts_valid_date(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should accept valid ISO date format."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Diabetes",
            "status": "Active",
            "date_of_diagnosis": "2023-06-15"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_rejects_future_diagnosis_date(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for diagnosis date in the future."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Test",
            "status": "Active",
            "date_of_diagnosis": "2099-01-01"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 422

    # =========================================================================
    # POST - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_health_record_with_empty_condition_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for empty condition string."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "",
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_health_record_with_whitespace_condition_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for whitespace-only condition."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "   ",
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_health_record_with_max_length_condition(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should handle condition at max length (255 chars)."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "A" * 255,
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_with_over_max_length_returns_422(
        self, client: AsyncClient, test_special_relationship
    ):
        """Should return 422 for condition exceeding max length."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "A" * 256,
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_health_record_with_null_optional_fields(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should accept null for optional fields."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Dementia",
            "status": "Active",
            "name": None,
            "medication": None,
            "notes": None
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_with_special_characters(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should handle special characters in text fields."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Test's \"Condition\" & <Notes>",
            "status": "Active",
            "notes": "Patient's notes with unicode characters"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 201

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    # =========================================================================
    # POST - Security Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_create_health_record_sanitizes_sql_injection(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should safely handle SQL injection attempts."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "'; DROP TABLE health_special_relationships; --",
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        # Should either succeed (sanitized) or fail validation, not execute SQL
        assert response.status_code in [201, 422]

        # Cleanup if created
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_create_health_record_sanitizes_xss_attempt(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should safely handle XSS attempts."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "<script>alert('xss')</script>",
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code in [201, 422]

        # Cleanup if created
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_special_relationships WHERE id = $1',
                    response.json()["id"]
                )
            except Exception:
                pass

    # =========================================================================
    # PUT /api/health/special-relationships/{id} - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_update_health_record_for_special_relationship(
        self, client: AsyncClient, seed_health_sr_data
    ):
        """Should update health record for special relationship and return 200."""
        record_id = seed_health_sr_data[0]
        data = {"condition": "Updated Condition", "status": "Resolved"}
        response = await client.put(
            f"/api/health/special-relationships/{record_id}",
            json=data
        )
        assert response.status_code == 200
        assert response.json()["status"] == "Resolved"

    @pytest.mark.asyncio
    async def test_update_health_record_returns_404_for_invalid_id(
        self, client: AsyncClient
    ):
        """Should return 404 when health record doesn't exist."""
        response = await client.put(
            "/api/health/special-relationships/9999",
            json={"status": "Active"}
        )
        assert response.status_code == 404

    # =========================================================================
    # PUT - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_update_health_record_with_empty_body(
        self, client: AsyncClient, seed_health_sr_data
    ):
        """Should return 200 with no changes for empty update body."""
        record_id = seed_health_sr_data[0]
        response = await client.put(
            f"/api/health/special-relationships/{record_id}",
            json={}
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_health_record_partial_update(
        self, client: AsyncClient, seed_health_sr_data
    ):
        """Should only update provided fields."""
        record_id = seed_health_sr_data[0]
        response = await client.put(
            f"/api/health/special-relationships/{record_id}",
            json={"status": "Monitoring"}
        )
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "Monitoring"

    @pytest.mark.asyncio
    async def test_update_health_record_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative record ID."""
        response = await client.put(
            "/api/health/special-relationships/-1",
            json={"status": "Active"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_health_record_validates_status_enum(
        self, client: AsyncClient, seed_health_sr_data
    ):
        """Should return 422 for invalid status value."""
        record_id = seed_health_sr_data[0]
        response = await client.put(
            f"/api/health/special-relationships/{record_id}",
            json={"status": "InvalidStatus"}
        )
        assert response.status_code == 422

    # =========================================================================
    # DELETE /api/health/special-relationships/{id} - Unit Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_delete_health_record_for_special_relationship(
        self, client: AsyncClient, seed_health_sr_data
    ):
        """Should delete health record for special relationship and return 204."""
        record_id = seed_health_sr_data[0]
        response = await client.delete(f"/api/health/special-relationships/{record_id}")
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_health_record_returns_404_for_invalid_id(
        self, client: AsyncClient
    ):
        """Should return 404 when health record doesn't exist."""
        response = await client.delete("/api/health/special-relationships/9999")
        assert response.status_code == 404

    # =========================================================================
    # DELETE - Edge Cases
    # =========================================================================

    @pytest.mark.asyncio
    async def test_delete_health_record_with_negative_id_returns_422(
        self, client: AsyncClient
    ):
        """Should return 422 for negative record ID."""
        response = await client.delete("/api/health/special-relationships/-1")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_delete_health_record_is_idempotent(
        self, client: AsyncClient, seed_health_sr_data
    ):
        """Should return 404 on second delete (idempotent behavior)."""
        record_id = seed_health_sr_data[0]
        # First delete
        response1 = await client.delete(f"/api/health/special-relationships/{record_id}")
        assert response1.status_code == 204
        # Second delete
        response2 = await client.delete(f"/api/health/special-relationships/{record_id}")
        assert response2.status_code == 404

    @pytest.mark.asyncio
    async def test_deleted_record_not_in_get_results(
        self, client: AsyncClient, seed_health_sr_data, test_special_relationship
    ):
        """Deleted record should not appear in GET results."""
        record_id = seed_health_sr_data[0]
        # Delete record
        await client.delete(f"/api/health/special-relationships/{record_id}")
        # Verify not in results
        response = await client.get(
            "/api/health/special-relationships",
            params={"special_relationship_id": test_special_relationship}
        )
        assert response.status_code == 200
        ids = [r["id"] for r in response.json()]
        assert record_id not in ids

    # =========================================================================
    # Data Integrity Tests
    # =========================================================================

    @pytest.mark.asyncio
    async def test_created_record_has_auto_generated_fields(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should auto-generate id, created_at, date_recorded."""
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Test",
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 201
        result = response.json()
        assert "id" in result and result["id"] is not None
        assert "created_at" in result and result["created_at"] is not None

        # Cleanup created record
        if response.status_code == 201:
            try:
                await db_connection.execute(
                    'DELETE FROM health_special_relationships WHERE id = $1',
                    result["id"]
                )
            except Exception:
                pass

    @pytest.mark.asyncio
    async def test_concurrent_create_requests_handled(
        self, client: AsyncClient, test_special_relationship, db_connection
    ):
        """Should handle concurrent create requests without race conditions."""

        async def create_record(suffix: int):
            data = {
                "special_relationship_id": test_special_relationship,
                "condition": f"Condition {suffix}",
                "status": "Active"
            }
            return await client.post("/api/health/special-relationships", json=data)

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
                        'DELETE FROM health_special_relationships WHERE id = $1',
                        response.json()["id"]
                    )
                except Exception:
                    pass


# =============================================================================
# TestHealthSpecialRelationshipsPropertyBased - Property-Based Tests
# =============================================================================

class TestHealthSpecialRelationshipsPropertyBased:
    """
    Property-based tests for health special relationships API using Hypothesis.

    These tests verify that certain properties (invariants) hold across a wide
    range of randomly generated inputs. This helps catch edge cases and
    unexpected behaviors that unit tests might miss.

    Properties tested:
    - Any valid condition string is accepted
    - Invalid status values are always rejected
    - Non-positive special_relationship_id is always rejected
    - Oversized condition strings are rejected
    - Unicode characters are handled safely
    """

    # Valid status values for health conditions
    valid_statuses = st.sampled_from(["Active", "Resolved", "Monitoring", "Inactive"])

    @pytest.mark.asyncio
    @given(condition=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_any_valid_condition_accepted(
        self, client: AsyncClient, test_special_relationship, condition: str
    ):
        """
        Property: Any non-empty, non-whitespace condition string (up to 255 chars)
        should be accepted by the API.

        The response should be one of:
        - 201: Created successfully
        - 404: Special relationship not found (valid test scenario)
        - 422: Validation error for other reasons

        Server errors (500) are not acceptable.
        """
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": condition,
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code in [201, 404, 422]

    @pytest.mark.asyncio
    @given(status=st.text().filter(lambda x: x not in ["Active", "Resolved", "Monitoring", "Inactive"] and x.strip()))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_invalid_status_rejected(
        self, client: AsyncClient, test_special_relationship, status: str
    ):
        """
        Property: Any status value not in the valid set should be rejected with 422.

        Valid statuses: Active, Resolved, Monitoring, Inactive
        Any other non-empty string should result in a validation error.
        """
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Test",
            "status": status
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(sr_id=st.integers(max_value=0))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_non_positive_sr_id_rejected(
        self, client: AsyncClient, sr_id: int
    ):
        """
        Property: Non-positive special_relationship_id (0 or negative) should
        always be rejected with a 422 validation error.

        This ensures that the API properly validates ID parameters before
        attempting database operations.
        """
        data = {
            "special_relationship_id": sr_id,
            "condition": "Test",
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(condition=st.text(min_size=256, max_size=500))
    @settings(max_examples=15, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_oversized_condition_rejected(
        self, client: AsyncClient, test_special_relationship, condition: str
    ):
        """
        Property: Condition strings exceeding 255 characters should be rejected
        with a 422 validation error.

        This enforces the database schema constraint on condition field length.
        """
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": condition,
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(
        condition=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
        notes=st.text(max_size=500)
    )
    @settings(max_examples=25, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_unicode_handled_safely(
        self, client: AsyncClient, test_special_relationship, condition: str, notes: str
    ):
        """
        Property: Unicode characters in any text field should be handled safely
        without causing server errors (500).

        This includes:
        - Non-ASCII characters (accented letters, CJK, etc.)
        - Emoji and special symbols
        - Right-to-left text
        - Null bytes and control characters

        The API should either accept the input or return a proper validation error.
        """
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": condition,
            "status": "Active",
            "notes": notes
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code != 500

    @pytest.mark.asyncio
    @given(diagnosis_date=st.dates(min_value=date.today() + timedelta(days=1)))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_future_diagnosis_date_rejected(
        self, client: AsyncClient, test_special_relationship, diagnosis_date: date
    ):
        """
        Property: Future diagnosis dates should always be rejected with 422.

        A diagnosis date must be in the past or present, as you cannot
        diagnose a condition before it occurs.
        """
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Test",
            "status": "Active",
            "date_of_diagnosis": diagnosis_date.isoformat()
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    @given(diagnosis_date=st.dates(min_value=date(1900, 1, 1), max_value=date.today()))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_past_diagnosis_date_accepted(
        self, client: AsyncClient, test_special_relationship, diagnosis_date: date
    ):
        """
        Property: Past or today's diagnosis dates should be accepted.

        Valid diagnosis dates range from 1900-01-01 to today's date.
        The response should be 201 (created) or 404 (SR not found).
        """
        data = {
            "special_relationship_id": test_special_relationship,
            "condition": "Test",
            "status": "Active",
            "date_of_diagnosis": diagnosis_date.isoformat()
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code in [201, 404]

    @pytest.mark.asyncio
    @given(data=st.fixed_dictionaries({
        "special_relationship_id": st.integers(min_value=1, max_value=10000),
        "condition": st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        "status": st.sampled_from(["Active", "Resolved", "Monitoring", "Inactive"]),
        "name": st.one_of(st.none(), st.text(max_size=255)),
        "medication": st.one_of(st.none(), st.text(max_size=500)),
        "notes": st.one_of(st.none(), st.text(max_size=2000)),
    }))
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    async def test_valid_data_never_causes_500(
        self, client: AsyncClient, data: dict
    ):
        """
        Property: Valid data structure should never cause a 500 server error.

        Even if the special_relationship_id doesn't exist (404), the server
        should handle the request gracefully without crashing.
        """
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code != 500
