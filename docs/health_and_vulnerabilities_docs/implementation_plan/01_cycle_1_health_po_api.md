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

class TestHealthProductOwnersAPI:
    """Tests for health product owners API endpoints"""

    # GET /api/health/product-owners
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

    # POST /api/health/product-owners
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

    # PUT /api/health/product-owners/{id}
    async def test_update_health_record_returns_updated_record(self, client: AsyncClient):
        """Should update and return the modified record"""
        data = {"condition": "Updated Condition", "status": "Resolved"}
        response = await client.put("/api/health/product-owners/1", json=data)
        assert response.status_code == 200
        assert response.json()["status"] == "Resolved"

    async def test_update_health_record_returns_404_for_invalid_id(self, client: AsyncClient):
        """Should return 404 when health record doesn't exist"""
        response = await client.put("/api/health/product-owners/9999", json={"status": "Active"})
        assert response.status_code == 404

    # DELETE /api/health/product-owners/{id}
    async def test_delete_health_record_returns_204(self, client: AsyncClient):
        """Should delete record and return 204 No Content"""
        response = await client.delete("/api/health/product-owners/1")
        assert response.status_code == 204

    async def test_delete_health_record_returns_404_for_invalid_id(self, client: AsyncClient):
        """Should return 404 when health record doesn't exist"""
        response = await client.delete("/api/health/product-owners/9999")
        assert response.status_code == 404
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

- [ ] All 10 tests pass
- [ ] GET returns health records filtered by product_owner_id or client_group_id
- [ ] POST creates new record and returns 201
- [ ] PUT updates existing record
- [ ] DELETE removes record and returns 204
- [ ] Proper error handling for 404 and 422 cases
