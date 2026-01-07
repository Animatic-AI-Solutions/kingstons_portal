# Cycle 2: Health Special Relationships API

**Goal**: Create CRUD endpoints for `health_special_relationships` table

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for health special relationships API endpoints.

**File**: `backend/tests/test_health_routes.py` (extend existing)

```python
class TestHealthSpecialRelationshipsAPI:
    """Tests for health special relationships API endpoints"""

    # GET /api/health/special-relationships
    async def test_get_health_records_by_special_relationship_id(self, client: AsyncClient):
        """Should return list of health records for a special relationship"""
        response = await client.get("/api/health/special-relationships", params={"special_relationship_id": 1})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_health_records_by_client_group_returns_all_sr_records(self, client: AsyncClient):
        """Should return health records for all special relationships in a client group"""
        response = await client.get("/api/health/special-relationships", params={"client_group_id": 1})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    # POST /api/health/special-relationships
    async def test_create_health_record_for_special_relationship(self, client: AsyncClient):
        """Should create health record for special relationship"""
        data = {
            "special_relationship_id": 1,
            "condition": "Heart Disease",
            "name": "Coronary Artery Disease",
            "status": "Active"
        }
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 201

    async def test_create_health_record_returns_404_for_invalid_sr(self, client: AsyncClient):
        """Should return 404 when special_relationship_id doesn't exist"""
        data = {"special_relationship_id": 9999, "condition": "Test", "status": "Active"}
        response = await client.post("/api/health/special-relationships", json=data)
        assert response.status_code == 404

    # PUT /api/health/special-relationships/{id}
    async def test_update_health_record_for_special_relationship(self, client: AsyncClient):
        """Should update health record for special relationship"""
        data = {"status": "Resolved"}
        response = await client.put("/api/health/special-relationships/1", json=data)
        assert response.status_code == 200

    # DELETE /api/health/special-relationships/{id}
    async def test_delete_health_record_for_special_relationship(self, client: AsyncClient):
        """Should delete health record for special relationship"""
        response = await client.delete("/api/health/special-relationships/1")
        assert response.status_code == 204
```

---

## GREEN Phase - Implement API

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the minimal code to pass all tests.

**File 1**: `backend/app/models/health.py` (extend)

```python
class HealthSpecialRelationshipBase(BaseModel):
    special_relationship_id: int
    condition: str
    name: Optional[str] = None
    date_of_diagnosis: Optional[date] = None
    status: str = "Active"
    medication: Optional[str] = None
    notes: Optional[str] = None

class HealthSpecialRelationshipCreate(HealthSpecialRelationshipBase):
    pass

class HealthSpecialRelationshipUpdate(BaseModel):
    condition: Optional[str] = None
    name: Optional[str] = None
    date_of_diagnosis: Optional[date] = None
    status: Optional[str] = None
    medication: Optional[str] = None
    notes: Optional[str] = None

class HealthSpecialRelationship(HealthSpecialRelationshipBase):
    id: int
    created_at: datetime
    date_recorded: Optional[datetime] = None

    class Config:
        from_attributes = True
```

**File 2**: `backend/app/api/routes/health.py` (extend)

```python
@router.get('/special-relationships', response_model=List[HealthSpecialRelationship])
async def get_health_special_relationships(
    special_relationship_id: Optional[int] = Query(None),
    client_group_id: Optional[int] = Query(None),
    db=Depends(get_db)
):
    """Fetch health records for special relationships"""
    pass

@router.post('/special-relationships', response_model=HealthSpecialRelationship, status_code=201)
async def create_health_special_relationship(
    health_record: HealthSpecialRelationshipCreate,
    db=Depends(get_db)
):
    """Create a new health record for a special relationship"""
    pass

@router.put('/special-relationships/{record_id}', response_model=HealthSpecialRelationship)
async def update_health_special_relationship(
    health_update: HealthSpecialRelationshipUpdate,
    record_id: int = Path(...),
    db=Depends(get_db)
):
    """Update an existing health record for special relationship"""
    pass

@router.delete('/special-relationships/{record_id}', status_code=204)
async def delete_health_special_relationship(
    record_id: int = Path(...),
    db=Depends(get_db)
):
    """Delete a health record for special relationship"""
    pass
```

---

## BLUE Phase - Refactor

**Instructions**: Refactor and optimize the implementation

- [ ] Extract common query logic into helper functions shared with product owners
- [ ] Add comprehensive error messages
- [ ] Ensure consistent response format with product owner endpoints
- [ ] Add proper logging

---

## Acceptance Criteria

- [ ] All 6 tests pass
- [ ] GET returns health records filtered by special_relationship_id or client_group_id
- [ ] POST creates new record for special relationship
- [ ] PUT updates existing record
- [ ] DELETE removes record
- [ ] Consistent with product owner endpoint patterns
