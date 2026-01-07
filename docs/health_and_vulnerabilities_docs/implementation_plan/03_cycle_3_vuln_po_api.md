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

- [ ] All 10 tests pass
- [ ] GET returns vulnerabilities filtered by product_owner_id or client_group_id
- [ ] POST creates new vulnerability with boolean diagnosed field
- [ ] PUT updates existing record
- [ ] DELETE removes record
- [ ] Proper validation for diagnosed boolean
