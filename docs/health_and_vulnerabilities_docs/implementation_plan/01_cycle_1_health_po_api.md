# Cycle 1: Health Product Owners API

**Goal**: Create CRUD endpoints for `health_product_owners` table

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for health product owners API endpoints.

**File**: `backend/tests/test_health_routes.py`

```python
import pytest
from httpx import AsyncClient
from datetime import date, datetime, timedelta
from hypothesis import given, strategies as st, settings, assume
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant

class TestHealthProductOwnersAPI:
    """
    Comprehensive tests for health product owners API endpoints.
    Includes unit tests, edge cases, validation, and security tests.
    """

    # =========================================================================
    # GET /api/health/product-owners - Unit Tests
    # =========================================================================

    async def test_get_health_records_by_product_owner_id_returns_list(self, client: AsyncClient):
        """Should return list of health records for a product owner"""
        response = await client.get("/api/health/product-owners", params={"product_owner_id": 1})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_health_records_returns_empty_list_when_none_exist(self, client: AsyncClient):
        """Should return empty list when no health records exist"""
        response = await client.get("/api/health/product-owners", params={"product_owner_id": 9999})
        assert response.status_code == 200
        assert response.json() == []

    async def test_get_health_records_by_client_group_returns_all_owner_records(self, client: AsyncClient):
        """Should return health records for all product owners in a client group"""
        response = await client.get("/api/health/product-owners", params={"client_group_id": 1})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    # =========================================================================
    # GET - Edge Cases
    # =========================================================================

    async def test_get_health_records_without_params_returns_400(self, client: AsyncClient):
        """Should return 400 when no filter params provided"""
        response = await client.get("/api/health/product-owners")
        assert response.status_code == 400

    async def test_get_health_records_with_negative_id_returns_422(self, client: AsyncClient):
        """Should return 422 for negative product_owner_id"""
        response = await client.get("/api/health/product-owners", params={"product_owner_id": -1})
        assert response.status_code == 422

    async def test_get_health_records_with_zero_id_returns_422(self, client: AsyncClient):
        """Should return 422 for zero product_owner_id"""
        response = await client.get("/api/health/product-owners", params={"product_owner_id": 0})
        assert response.status_code == 422

    async def test_get_health_records_with_non_integer_id_returns_422(self, client: AsyncClient):
        """Should return 422 for non-integer product_owner_id"""
        response = await client.get("/api/health/product-owners", params={"product_owner_id": "abc"})
        assert response.status_code == 422

    async def test_get_health_records_returns_correct_fields(self, client: AsyncClient, seed_health_data):
        """Should return records with all expected fields"""
        response = await client.get("/api/health/product-owners", params={"product_owner_id": 1})
        assert response.status_code == 200
        if response.json():
            record = response.json()[0]
            assert "id" in record
            assert "product_owner_id" in record
            assert "condition" in record
            assert "status" in record
            assert "created_at" in record

    # =========================================================================
    # POST /api/health/product-owners - Unit Tests
    # =========================================================================

    async def test_create_health_record_returns_201_with_valid_data(self, client: AsyncClient):
        """Should create health record and return 201 status"""
        data = {
            "product_owner_id": 1,
            "condition": "Smoking",
            "name": "Current Smoker",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201
        assert response.json()["condition"] == "Smoking"

    async def test_create_health_record_returns_404_for_invalid_product_owner(self, client: AsyncClient):
        """Should return 404 when product_owner_id doesn't exist"""
        data = {"product_owner_id": 9999, "condition": "Test", "status": "Active"}
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 404

    async def test_create_health_record_validates_required_fields(self, client: AsyncClient):
        """Should return 422 when required fields are missing"""
        response = await client.post("/api/health/product-owners", json={})
        assert response.status_code == 422

    # =========================================================================
    # POST - Validation Tests
    # =========================================================================

    async def test_create_health_record_validates_status_enum(self, client: AsyncClient):
        """Should return 422 for invalid status value"""
        data = {
            "product_owner_id": 1,
            "condition": "Smoking",
            "status": "InvalidStatus"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    async def test_create_health_record_accepts_all_valid_statuses(self, client: AsyncClient):
        """Should accept all valid status values"""
        valid_statuses = ["Active", "Resolved", "Monitoring", "Inactive"]
        for status in valid_statuses:
            data = {
                "product_owner_id": 1,
                "condition": "Test",
                "status": status
            }
            response = await client.post("/api/health/product-owners", json=data)
            assert response.status_code == 201, f"Failed for status: {status}"

    async def test_create_health_record_validates_date_format(self, client: AsyncClient):
        """Should return 422 for invalid date format"""
        data = {
            "product_owner_id": 1,
            "condition": "Smoking",
            "status": "Active",
            "date_of_diagnosis": "not-a-date"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    async def test_create_health_record_accepts_valid_date(self, client: AsyncClient):
        """Should accept valid ISO date format"""
        data = {
            "product_owner_id": 1,
            "condition": "Diabetes",
            "status": "Active",
            "date_of_diagnosis": "2023-06-15"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201

    async def test_create_health_record_rejects_future_diagnosis_date(self, client: AsyncClient):
        """Should return 422 for diagnosis date in the future"""
        data = {
            "product_owner_id": 1,
            "condition": "Test",
            "status": "Active",
            "date_of_diagnosis": "2099-01-01"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    # =========================================================================
    # POST - Edge Cases
    # =========================================================================

    async def test_create_health_record_with_empty_condition_returns_422(self, client: AsyncClient):
        """Should return 422 for empty condition string"""
        data = {
            "product_owner_id": 1,
            "condition": "",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    async def test_create_health_record_with_whitespace_condition_returns_422(self, client: AsyncClient):
        """Should return 422 for whitespace-only condition"""
        data = {
            "product_owner_id": 1,
            "condition": "   ",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    async def test_create_health_record_with_max_length_condition(self, client: AsyncClient):
        """Should handle condition at max length (255 chars)"""
        data = {
            "product_owner_id": 1,
            "condition": "A" * 255,
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201

    async def test_create_health_record_with_over_max_length_returns_422(self, client: AsyncClient):
        """Should return 422 for condition exceeding max length"""
        data = {
            "product_owner_id": 1,
            "condition": "A" * 256,
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    async def test_create_health_record_with_null_optional_fields(self, client: AsyncClient):
        """Should accept null for optional fields"""
        data = {
            "product_owner_id": 1,
            "condition": "Smoking",
            "status": "Active",
            "name": None,
            "medication": None,
            "notes": None
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201

    async def test_create_health_record_with_special_characters(self, client: AsyncClient):
        """Should handle special characters in text fields"""
        data = {
            "product_owner_id": 1,
            "condition": "Test's \"Condition\" & <Notes>",
            "status": "Active",
            "notes": "Patient's notes with émojis 🏥 and unicode"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201

    # =========================================================================
    # POST - Security Tests
    # =========================================================================

    async def test_create_health_record_sanitizes_sql_injection(self, client: AsyncClient):
        """Should safely handle SQL injection attempts"""
        data = {
            "product_owner_id": 1,
            "condition": "'; DROP TABLE health_product_owners; --",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        # Should either succeed (sanitized) or fail validation, not execute SQL
        assert response.status_code in [201, 422]

    async def test_create_health_record_sanitizes_xss_attempt(self, client: AsyncClient):
        """Should safely handle XSS attempts"""
        data = {
            "product_owner_id": 1,
            "condition": "<script>alert('xss')</script>",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code in [201, 422]

    # =========================================================================
    # PUT /api/health/product-owners/{id} - Unit Tests
    # =========================================================================

    async def test_update_health_record_returns_updated_record(self, client: AsyncClient, seed_health_data):
        """Should update and return the modified record"""
        data = {"condition": "Updated Condition", "status": "Resolved"}
        response = await client.put("/api/health/product-owners/1", json=data)
        assert response.status_code == 200
        assert response.json()["status"] == "Resolved"

    async def test_update_health_record_returns_404_for_invalid_id(self, client: AsyncClient):
        """Should return 404 when health record doesn't exist"""
        response = await client.put("/api/health/product-owners/9999", json={"status": "Active"})
        assert response.status_code == 404

    # =========================================================================
    # PUT - Edge Cases
    # =========================================================================

    async def test_update_health_record_with_empty_body(self, client: AsyncClient, seed_health_data):
        """Should return 200 with no changes for empty update body"""
        response = await client.put("/api/health/product-owners/1", json={})
        assert response.status_code == 200

    async def test_update_health_record_partial_update(self, client: AsyncClient, seed_health_data):
        """Should only update provided fields"""
        response = await client.put("/api/health/product-owners/1", json={"status": "Monitoring"})
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "Monitoring"
        # Other fields should remain unchanged

    async def test_update_health_record_with_negative_id_returns_422(self, client: AsyncClient):
        """Should return 422 for negative record ID"""
        response = await client.put("/api/health/product-owners/-1", json={"status": "Active"})
        assert response.status_code == 422

    async def test_update_health_record_validates_status_enum(self, client: AsyncClient, seed_health_data):
        """Should return 422 for invalid status value"""
        response = await client.put("/api/health/product-owners/1", json={"status": "InvalidStatus"})
        assert response.status_code == 422

    # =========================================================================
    # DELETE /api/health/product-owners/{id} - Unit Tests
    # =========================================================================

    async def test_delete_health_record_returns_204(self, client: AsyncClient, seed_health_data):
        """Should delete record and return 204 No Content"""
        response = await client.delete("/api/health/product-owners/1")
        assert response.status_code == 204

    async def test_delete_health_record_returns_404_for_invalid_id(self, client: AsyncClient):
        """Should return 404 when health record doesn't exist"""
        response = await client.delete("/api/health/product-owners/9999")
        assert response.status_code == 404

    # =========================================================================
    # DELETE - Edge Cases
    # =========================================================================

    async def test_delete_health_record_with_negative_id_returns_422(self, client: AsyncClient):
        """Should return 422 for negative record ID"""
        response = await client.delete("/api/health/product-owners/-1")
        assert response.status_code == 422

    async def test_delete_health_record_is_idempotent(self, client: AsyncClient, seed_health_data):
        """Should return 404 on second delete (idempotent behavior)"""
        # First delete
        response1 = await client.delete("/api/health/product-owners/1")
        assert response1.status_code == 204
        # Second delete
        response2 = await client.delete("/api/health/product-owners/1")
        assert response2.status_code == 404

    async def test_deleted_record_not_in_get_results(self, client: AsyncClient, seed_health_data):
        """Deleted record should not appear in GET results"""
        # Delete record
        await client.delete("/api/health/product-owners/1")
        # Verify not in results
        response = await client.get("/api/health/product-owners", params={"product_owner_id": 1})
        assert response.status_code == 200
        ids = [r["id"] for r in response.json()]
        assert 1 not in ids

    # =========================================================================
    # Property-Based Tests (using Hypothesis)
    # =========================================================================

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

    @given(condition=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()))
    @settings(max_examples=50)
    async def test_any_non_empty_condition_is_accepted(self, client: AsyncClient, condition: str):
        """Property: Any non-empty, non-whitespace condition string should be accepted"""
        data = {
            "product_owner_id": 1,
            "condition": condition,
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        # Should either succeed or fail for known validation reasons (not 500)
        assert response.status_code in [201, 404, 422]

    @given(status=st.text().filter(lambda x: x not in ["Active", "Resolved", "Monitoring", "Inactive"]))
    @settings(max_examples=30)
    async def test_invalid_status_always_rejected(self, client: AsyncClient, status: str):
        """Property: Any status not in valid set should be rejected with 422"""
        assume(status.strip())  # Skip empty strings
        data = {
            "product_owner_id": 1,
            "condition": "Test",
            "status": status
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @given(product_owner_id=st.integers(max_value=0))
    @settings(max_examples=30)
    async def test_non_positive_product_owner_id_rejected(self, client: AsyncClient, product_owner_id: int):
        """Property: Non-positive product_owner_id should always be rejected"""
        data = {
            "product_owner_id": product_owner_id,
            "condition": "Test",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @given(condition=st.text(min_size=256, max_size=1000))
    @settings(max_examples=20)
    async def test_oversized_condition_rejected(self, client: AsyncClient, condition: str):
        """Property: Condition exceeding 255 chars should be rejected"""
        data = {
            "product_owner_id": 1,
            "condition": condition,
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @given(diagnosis_date=st.dates(min_value=date.today() + timedelta(days=1)))
    @settings(max_examples=20)
    async def test_future_diagnosis_date_rejected(self, client: AsyncClient, diagnosis_date: date):
        """Property: Future diagnosis dates should always be rejected"""
        data = {
            "product_owner_id": 1,
            "condition": "Test",
            "status": "Active",
            "date_of_diagnosis": diagnosis_date.isoformat()
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 422

    @given(diagnosis_date=past_dates)
    @settings(max_examples=30)
    async def test_past_diagnosis_date_accepted(self, client: AsyncClient, diagnosis_date: str):
        """Property: Past or today's diagnosis dates should be accepted"""
        data = {
            "product_owner_id": 1,
            "condition": "Test",
            "status": "Active",
            "date_of_diagnosis": diagnosis_date
        }
        response = await client.post("/api/health/product-owners", json=data)
        # Should succeed if product owner exists, or 404 if not
        assert response.status_code in [201, 404]

    @given(data=valid_health_record)
    @settings(max_examples=50)
    async def test_valid_data_never_causes_500(self, client: AsyncClient, data: dict):
        """Property: Valid data should never cause a 500 server error"""
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code != 500

    @given(
        condition=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
        medication=st.text(max_size=200),
        notes=st.text(max_size=500)
    )
    @settings(max_examples=30)
    async def test_unicode_and_special_chars_handled(self, client: AsyncClient, condition: str, medication: str, notes: str):
        """Property: Unicode and special characters should be handled safely"""
        data = {
            "product_owner_id": 1,
            "condition": condition,
            "status": "Active",
            "medication": medication,
            "notes": notes
        }
        response = await client.post("/api/health/product-owners", json=data)
        # Should not crash - either succeed or validate properly
        assert response.status_code in [201, 404, 422]


class TestHealthRecordStateMachine(RuleBasedStateMachine):
    """
    Stateful property-based testing to verify CRUD operations maintain consistency.
    """

    def __init__(self):
        super().__init__()
        self.created_ids = []
        self.client = None  # Injected by test setup

    @rule(condition=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()))
    async def create_record(self, condition: str):
        """Create a new health record"""
        data = {
            "product_owner_id": 1,
            "condition": condition,
            "status": "Active"
        }
        response = await self.client.post("/api/health/product-owners", json=data)
        if response.status_code == 201:
            self.created_ids.append(response.json()["id"])

    @rule()
    async def delete_random_record(self):
        """Delete a random created record"""
        if self.created_ids:
            record_id = self.created_ids.pop()
            response = await self.client.delete(f"/api/health/product-owners/{record_id}")
            assert response.status_code == 204

    @invariant()
    async def all_created_records_retrievable(self):
        """All non-deleted records should be retrievable"""
        for record_id in self.created_ids:
            response = await self.client.get("/api/health/product-owners", params={"product_owner_id": 1})
            ids = [r["id"] for r in response.json()]
            assert record_id in ids


    # =========================================================================
    # Data Integrity Tests
    # =========================================================================

    async def test_created_record_has_auto_generated_fields(self, client: AsyncClient):
        """Should auto-generate id, created_at, date_recorded"""
        data = {
            "product_owner_id": 1,
            "condition": "Test",
            "status": "Active"
        }
        response = await client.post("/api/health/product-owners", json=data)
        assert response.status_code == 201
        result = response.json()
        assert "id" in result and result["id"] is not None
        assert "created_at" in result and result["created_at"] is not None

    async def test_concurrent_create_requests_handled(self, client: AsyncClient):
        """Should handle concurrent create requests without race conditions"""
        import asyncio

        async def create_record(suffix: int):
            data = {
                "product_owner_id": 1,
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
```

---

## GREEN Phase - Implement API

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the minimal code to pass all tests.

**File 1**: `backend/app/models/health.py`

```python
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class HealthProductOwnerBase(BaseModel):
    product_owner_id: int
    condition: str
    name: Optional[str] = None
    date_of_diagnosis: Optional[date] = None
    status: str = "Active"
    medication: Optional[str] = None
    notes: Optional[str] = None

class HealthProductOwnerCreate(HealthProductOwnerBase):
    pass

class HealthProductOwnerUpdate(BaseModel):
    condition: Optional[str] = None
    name: Optional[str] = None
    date_of_diagnosis: Optional[date] = None
    status: Optional[str] = None
    medication: Optional[str] = None
    notes: Optional[str] = None

class HealthProductOwner(HealthProductOwnerBase):
    id: int
    created_at: datetime
    date_recorded: Optional[datetime] = None

    class Config:
        from_attributes = True
```

**File 2**: `backend/app/api/routes/health.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from typing import List, Optional
from ...db.database import get_db
from ...models.health import (
    HealthProductOwner,
    HealthProductOwnerCreate,
    HealthProductOwnerUpdate,
)

router = APIRouter(prefix="/health", tags=["health"])

@router.get('/product-owners', response_model=List[HealthProductOwner])
async def get_health_product_owners(
    product_owner_id: Optional[int] = Query(None),
    client_group_id: Optional[int] = Query(None),
    db=Depends(get_db)
):
    """Fetch health records with optional filters"""
    # Implementation: Query health_product_owners table
    pass

@router.post('/product-owners', response_model=HealthProductOwner, status_code=201)
async def create_health_product_owner(
    health_record: HealthProductOwnerCreate,
    db=Depends(get_db)
):
    """Create a new health record for a product owner"""
    # Verify product_owner_id exists, then insert
    pass

@router.put('/product-owners/{record_id}', response_model=HealthProductOwner)
async def update_health_product_owner(
    health_update: HealthProductOwnerUpdate,
    record_id: int = Path(...),
    db=Depends(get_db)
):
    """Update an existing health record"""
    pass

@router.delete('/product-owners/{record_id}', status_code=204)
async def delete_health_product_owner(
    record_id: int = Path(...),
    db=Depends(get_db)
):
    """Delete a health record"""
    pass
```

**File 3**: Register router in `backend/main.py`

```python
from app.api.routes import health
app.include_router(health.router, prefix="/api")
```

---

## BLUE Phase - Refactor

**Instructions**: Refactor and optimize the implementation

- [ ] Add logging for all CRUD operations
- [ ] Add input validation for status values (Active/Resolved/Monitoring/Inactive)
- [ ] Add proper database error handling with try/except
- [ ] Optimize query with proper indexing considerations
- [ ] Add docstrings to all functions

---

## Acceptance Criteria

- [ ] All 50+ tests pass (unit, edge case, validation, security, integrity, property-based)
- [ ] GET returns health records filtered by product_owner_id or client_group_id
- [ ] GET returns 400 when no filter params provided
- [ ] POST creates new record and returns 201
- [ ] POST validates status enum (Active/Resolved/Monitoring/Inactive)
- [ ] POST validates required fields and rejects empty/whitespace values
- [ ] POST handles max length validation (255 chars)
- [ ] POST sanitizes SQL injection and XSS attempts
- [ ] PUT updates existing record with partial updates supported
- [ ] DELETE removes record and returns 204
- [ ] DELETE is idempotent (second delete returns 404)
- [ ] Proper error handling for 404 and 422 cases
- [ ] Concurrent requests handled without race conditions
- [ ] **Property-based tests**: All Hypothesis tests pass (8+ property tests)
- [ ] **Stateful testing**: CRUD state machine maintains consistency
