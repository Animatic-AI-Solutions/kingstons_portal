# Cycle 4: Vulnerabilities Special Relationships API

**Goal**: Create CRUD endpoints for `vulnerabilities_special_relationships` table

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for vulnerabilities special relationships API endpoints.

**File**: `backend/tests/test_vulnerabilities_routes.py` (extend)

```python
class TestVulnerabilitiesSpecialRelationshipsAPI:
    """Tests for vulnerabilities special relationships API endpoints"""

    # GET /api/vulnerabilities/special-relationships
    async def test_get_vulnerabilities_by_special_relationship_id(self, client: AsyncClient):
        """Should return list of vulnerabilities for a special relationship"""
        response = await client.get("/api/vulnerabilities/special-relationships", params={"special_relationship_id": 1})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_vulnerabilities_by_client_group_returns_all_sr(self, client: AsyncClient):
        """Should return vulnerabilities for all special relationships in client group"""
        response = await client.get("/api/vulnerabilities/special-relationships", params={"client_group_id": 1})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    # POST /api/vulnerabilities/special-relationships
    async def test_create_vulnerability_for_special_relationship(self, client: AsyncClient):
        """Should create vulnerability for special relationship"""
        data = {
            "special_relationship_id": 1,
            "description": "Cognitive decline",
            "adjustments": "Involve family in discussions",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 201

    async def test_create_vulnerability_returns_404_for_invalid_sr(self, client: AsyncClient):
        """Should return 404 when special_relationship_id doesn't exist"""
        data = {"special_relationship_id": 9999, "description": "Test", "diagnosed": False, "status": "Active"}
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 404

    # PUT /api/vulnerabilities/special-relationships/{id}
    async def test_update_vulnerability_for_special_relationship(self, client: AsyncClient):
        """Should update vulnerability for special relationship"""
        data = {"status": "Resolved"}
        response = await client.put("/api/vulnerabilities/special-relationships/1", json=data)
        assert response.status_code == 200

    # DELETE /api/vulnerabilities/special-relationships/{id}
    async def test_delete_vulnerability_for_special_relationship(self, client: AsyncClient):
        """Should delete vulnerability for special relationship"""
        response = await client.delete("/api/vulnerabilities/special-relationships/1")
        assert response.status_code == 204
```

---

## GREEN Phase - Implement API

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the minimal code to pass all tests.

**File 1**: `backend/app/models/vulnerability.py` (extend)

```python
class VulnerabilitySpecialRelationshipBase(BaseModel):
    special_relationship_id: int
    description: str
    adjustments: Optional[str] = None
    diagnosed: bool = False
    status: str = "Active"
    notes: Optional[str] = None

class VulnerabilitySpecialRelationshipCreate(VulnerabilitySpecialRelationshipBase):
    pass

class VulnerabilitySpecialRelationshipUpdate(BaseModel):
    description: Optional[str] = None
    adjustments: Optional[str] = None
    diagnosed: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class VulnerabilitySpecialRelationship(VulnerabilitySpecialRelationshipBase):
    id: int
    created_at: datetime
    date_recorded: Optional[datetime] = None

    class Config:
        from_attributes = True
```

**File 2**: `backend/app/api/routes/vulnerabilities.py` (extend)

```python
@router.get('/special-relationships', response_model=List[VulnerabilitySpecialRelationship])
async def get_vulnerabilities_special_relationships(
    special_relationship_id: Optional[int] = Query(None),
    client_group_id: Optional[int] = Query(None),
    db=Depends(get_db)
):
    """Fetch vulnerabilities for special relationships"""
    pass

@router.post('/special-relationships', response_model=VulnerabilitySpecialRelationship, status_code=201)
async def create_vulnerability_special_relationship(
    vulnerability: VulnerabilitySpecialRelationshipCreate,
    db=Depends(get_db)
):
    """Create a new vulnerability for a special relationship"""
    pass

@router.put('/special-relationships/{record_id}', response_model=VulnerabilitySpecialRelationship)
async def update_vulnerability_special_relationship(
    vulnerability_update: VulnerabilitySpecialRelationshipUpdate,
    record_id: int = Path(...),
    db=Depends(get_db)
):
    """Update an existing vulnerability for special relationship"""
    pass

@router.delete('/special-relationships/{record_id}', status_code=204)
async def delete_vulnerability_special_relationship(
    record_id: int = Path(...),
    db=Depends(get_db)
):
    """Delete a vulnerability for special relationship"""
    pass
```

---

## BLUE Phase - Refactor

**Instructions**: Refactor and optimize the implementation

- [ ] Extract shared logic between product owners and special relationships
- [ ] Create unified response formatting
- [ ] Add comprehensive API documentation with examples
- [ ] Ensure all 4 endpoint groups (health/vuln x PO/SR) are consistent

---

## Acceptance Criteria

- [ ] All 6 tests pass
- [ ] GET returns vulnerabilities filtered by special_relationship_id or client_group_id
- [ ] POST creates new vulnerability for special relationship
- [ ] PUT updates existing record
- [ ] DELETE removes record
- [ ] Consistent with product owner vulnerability endpoints

---

## Backend Phase Complete Checklist

After Cycles 1-4, verify:
- [ ] All 32 backend tests pass (10+6+10+6)
- [ ] 4 route files created (health.py, vulnerabilities.py)
- [ ] 2 model files created (health.py, vulnerability.py)
- [ ] All routes registered in main.py
- [ ] Consistent error handling across all endpoints
- [ ] Proper logging in place
