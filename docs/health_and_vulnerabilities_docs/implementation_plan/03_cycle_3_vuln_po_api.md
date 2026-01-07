# Cycle 3: Vulnerabilities Product Owners API

**Goal**: Create CRUD endpoints for `vulnerabilities_product_owners` table

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for vulnerabilities product owners API endpoints.

**File**: `backend/tests/test_vulnerabilities_routes.py`

```python
import pytest
from httpx import AsyncClient
from hypothesis import given, strategies as st, settings, assume

class TestVulnerabilitiesProductOwnersAPI:
    """Tests for vulnerabilities product owners API endpoints"""

    # GET /api/vulnerabilities/product-owners
    async def test_get_vulnerabilities_by_product_owner_id(self, client: AsyncClient):
        """Should return list of vulnerabilities for a product owner"""
        response = await client.get("/api/vulnerabilities/product-owners", params={"product_owner_id": 1})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_vulnerabilities_returns_empty_list_when_none_exist(self, client: AsyncClient):
        """Should return empty list when no vulnerabilities exist"""
        response = await client.get("/api/vulnerabilities/product-owners", params={"product_owner_id": 9999})
        assert response.status_code == 200
        assert response.json() == []

    async def test_get_vulnerabilities_by_client_group_returns_all(self, client: AsyncClient):
        """Should return vulnerabilities for all product owners in client group"""
        response = await client.get("/api/vulnerabilities/product-owners", params={"client_group_id": 1})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    # POST /api/vulnerabilities/product-owners
    async def test_create_vulnerability_returns_201(self, client: AsyncClient):
        """Should create vulnerability and return 201"""
        data = {
            "product_owner_id": 1,
            "description": "Hearing impairment",
            "adjustments": "Speak clearly, face-to-face",
            "diagnosed": True,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 201
        assert response.json()["description"] == "Hearing impairment"

    async def test_create_vulnerability_returns_404_for_invalid_product_owner(self, client: AsyncClient):
        """Should return 404 when product_owner_id doesn't exist"""
        data = {"product_owner_id": 9999, "description": "Test", "status": "Active", "diagnosed": False}
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 404

    async def test_create_vulnerability_validates_diagnosed_boolean(self, client: AsyncClient):
        """Should validate diagnosed field is boolean"""
        data = {"product_owner_id": 1, "description": "Test", "diagnosed": "invalid"}
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    # PUT /api/vulnerabilities/product-owners/{id}
    async def test_update_vulnerability_record(self, client: AsyncClient):
        """Should update vulnerability record"""
        data = {"status": "Resolved", "adjustments": "Updated adjustments"}
        response = await client.put("/api/vulnerabilities/product-owners/1", json=data)
        assert response.status_code == 200

    async def test_update_vulnerability_returns_404_for_invalid_id(self, client: AsyncClient):
        """Should return 404 when vulnerability doesn't exist"""
        response = await client.put("/api/vulnerabilities/product-owners/9999", json={"status": "Active"})
        assert response.status_code == 404

    # DELETE /api/vulnerabilities/product-owners/{id}
    async def test_delete_vulnerability_record(self, client: AsyncClient):
        """Should delete vulnerability record"""
        response = await client.delete("/api/vulnerabilities/product-owners/1")
        assert response.status_code == 204

    async def test_delete_vulnerability_returns_404_for_invalid_id(self, client: AsyncClient):
        """Should return 404 when vulnerability doesn't exist"""
        response = await client.delete("/api/vulnerabilities/product-owners/9999")
        assert response.status_code == 404


class TestVulnerabilitiesProductOwnersPropertyBased:
    """Property-based tests for vulnerabilities product owners API"""

    valid_statuses = st.sampled_from(["Active", "Resolved", "Monitoring", "Inactive"])

    @given(description=st.text(min_size=1, max_size=500).filter(lambda x: x.strip()))
    @settings(max_examples=30)
    async def test_any_valid_description_accepted(self, client: AsyncClient, description: str):
        """Property: Any non-empty description should be accepted"""
        data = {
            "product_owner_id": 1,
            "description": description,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code in [201, 404, 422]

    @given(diagnosed=st.booleans())
    @settings(max_examples=10)
    async def test_any_boolean_diagnosed_accepted(self, client: AsyncClient, diagnosed: bool):
        """Property: Any boolean value for diagnosed should be accepted"""
        data = {
            "product_owner_id": 1,
            "description": "Test vulnerability",
            "diagnosed": diagnosed,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code in [201, 404]

    @given(status=st.text().filter(lambda x: x not in ["Active", "Resolved", "Monitoring", "Inactive"] and x.strip()))
    @settings(max_examples=20)
    async def test_invalid_status_rejected(self, client: AsyncClient, status: str):
        """Property: Invalid status values should be rejected"""
        data = {
            "product_owner_id": 1,
            "description": "Test",
            "diagnosed": False,
            "status": status
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @given(po_id=st.integers(max_value=0))
    @settings(max_examples=20)
    async def test_non_positive_po_id_rejected(self, client: AsyncClient, po_id: int):
        """Property: Non-positive product_owner_id should be rejected"""
        data = {
            "product_owner_id": po_id,
            "description": "Test",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @given(description=st.text(min_size=501, max_size=1000))
    @settings(max_examples=15)
    async def test_oversized_description_rejected(self, client: AsyncClient, description: str):
        """Property: Description exceeding 500 chars should be rejected"""
        data = {
            "product_owner_id": 1,
            "description": description,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code == 422

    @given(
        description=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
        adjustments=st.text(max_size=500)
    )
    @settings(max_examples=25)
    async def test_unicode_handled_safely(self, client: AsyncClient, description: str, adjustments: str):
        """Property: Unicode characters should be handled safely"""
        data = {
            "product_owner_id": 1,
            "description": description,
            "adjustments": adjustments,
            "diagnosed": True,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code != 500

    @given(
        data=st.fixed_dictionaries({
            "product_owner_id": st.integers(min_value=1, max_value=10000),
            "description": st.text(min_size=1, max_size=500).filter(lambda x: x.strip()),
            "diagnosed": st.booleans(),
            "status": valid_statuses,
            "adjustments": st.one_of(st.none(), st.text(max_size=500)),
            "notes": st.one_of(st.none(), st.text(max_size=1000)),
        })
    )
    @settings(max_examples=50)
    async def test_valid_data_never_causes_500(self, client: AsyncClient, data: dict):
        """Property: Valid data should never cause a 500 server error"""
        response = await client.post("/api/vulnerabilities/product-owners", json=data)
        assert response.status_code != 500
```

---

## GREEN Phase - Implement API

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the minimal code to pass all tests.

**File 1**: `backend/app/models/vulnerability.py`

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class VulnerabilityProductOwnerBase(BaseModel):
    product_owner_id: int
    description: str
    adjustments: Optional[str] = None
    diagnosed: bool = False
    status: str = "Active"
    notes: Optional[str] = None

class VulnerabilityProductOwnerCreate(VulnerabilityProductOwnerBase):
    pass

class VulnerabilityProductOwnerUpdate(BaseModel):
    description: Optional[str] = None
    adjustments: Optional[str] = None
    diagnosed: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class VulnerabilityProductOwner(VulnerabilityProductOwnerBase):
    id: int
    created_at: datetime
    date_recorded: Optional[datetime] = None

    class Config:
        from_attributes = True
```

**File 2**: `backend/app/api/routes/vulnerabilities.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from typing import List, Optional
from ...db.database import get_db
from ...models.vulnerability import (
    VulnerabilityProductOwner,
    VulnerabilityProductOwnerCreate,
    VulnerabilityProductOwnerUpdate,
)

router = APIRouter(prefix="/vulnerabilities", tags=["vulnerabilities"])

@router.get('/product-owners', response_model=List[VulnerabilityProductOwner])
async def get_vulnerabilities_product_owners(
    product_owner_id: Optional[int] = Query(None),
    client_group_id: Optional[int] = Query(None),
    db=Depends(get_db)
):
    """Fetch vulnerabilities for product owners"""
    pass

@router.post('/product-owners', response_model=VulnerabilityProductOwner, status_code=201)
async def create_vulnerability_product_owner(
    vulnerability: VulnerabilityProductOwnerCreate,
    db=Depends(get_db)
):
    """Create a new vulnerability for a product owner"""
    pass

@router.put('/product-owners/{record_id}', response_model=VulnerabilityProductOwner)
async def update_vulnerability_product_owner(
    vulnerability_update: VulnerabilityProductOwnerUpdate,
    record_id: int = Path(...),
    db=Depends(get_db)
):
    """Update an existing vulnerability"""
    pass

@router.delete('/product-owners/{record_id}', status_code=204)
async def delete_vulnerability_product_owner(
    record_id: int = Path(...),
    db=Depends(get_db)
):
    """Delete a vulnerability"""
    pass
```

**File 3**: Register router in `backend/main.py`

```python
from app.api.routes import vulnerabilities
app.include_router(vulnerabilities.router, prefix="/api")
```

---

## BLUE Phase - Refactor

**Instructions**: Refactor and optimize the implementation

- [ ] Add input sanitization for description and adjustments fields
- [ ] Ensure consistent error handling with health routes
- [ ] Add comprehensive logging
- [ ] Validate status values

---

## Acceptance Criteria

- [ ] All 17+ tests pass (10 unit + 7 property-based)
- [ ] GET returns vulnerabilities filtered by product_owner_id or client_group_id
- [ ] POST creates new vulnerability with boolean diagnosed field
- [ ] PUT updates existing record
- [ ] DELETE removes record
- [ ] Proper validation for diagnosed boolean
- [ ] **Property-based tests**: All Hypothesis tests pass
- [ ] **Validation**: Invalid status, oversized description, non-positive IDs rejected
- [ ] **Boolean property**: Any boolean diagnosed value accepted
