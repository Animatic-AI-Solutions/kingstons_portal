# Cycle 4: Vulnerabilities Special Relationships API

**Goal**: Create CRUD endpoints for `vulnerabilities_special_relationships` table

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for vulnerabilities special relationships API endpoints.

**File**: `backend/tests/test_vulnerabilities_routes.py` (extend)

```python
from hypothesis import given, strategies as st, settings, assume

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


class TestVulnerabilitiesSpecialRelationshipsPropertyBased:
    """Property-based tests for vulnerabilities special relationships API"""

    valid_statuses = st.sampled_from(["Active", "Resolved", "Monitoring", "Inactive"])

    @given(description=st.text(min_size=1, max_size=500).filter(lambda x: x.strip()))
    @settings(max_examples=30)
    async def test_any_valid_description_accepted(self, client: AsyncClient, description: str):
        """Property: Any non-empty description should be accepted"""
        data = {
            "special_relationship_id": 1,
            "description": description,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code in [201, 404, 422]

    @given(diagnosed=st.booleans())
    @settings(max_examples=10)
    async def test_any_boolean_diagnosed_accepted(self, client: AsyncClient, diagnosed: bool):
        """Property: Any boolean value for diagnosed should be accepted"""
        data = {
            "special_relationship_id": 1,
            "description": "Test vulnerability",
            "diagnosed": diagnosed,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code in [201, 404]

    @given(status=st.text().filter(lambda x: x not in ["Active", "Resolved", "Monitoring", "Inactive"] and x.strip()))
    @settings(max_examples=20)
    async def test_invalid_status_rejected(self, client: AsyncClient, status: str):
        """Property: Invalid status values should be rejected"""
        data = {
            "special_relationship_id": 1,
            "description": "Test",
            "diagnosed": False,
            "status": status
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @given(sr_id=st.integers(max_value=0))
    @settings(max_examples=20)
    async def test_non_positive_sr_id_rejected(self, client: AsyncClient, sr_id: int):
        """Property: Non-positive special_relationship_id should be rejected"""
        data = {
            "special_relationship_id": sr_id,
            "description": "Test",
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @given(description=st.text(min_size=501, max_size=1000))
    @settings(max_examples=15)
    async def test_oversized_description_rejected(self, client: AsyncClient, description: str):
        """Property: Description exceeding 500 chars should be rejected"""
        data = {
            "special_relationship_id": 1,
            "description": description,
            "diagnosed": False,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code == 422

    @given(
        description=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
        adjustments=st.text(max_size=500)
    )
    @settings(max_examples=25)
    async def test_unicode_handled_safely(self, client: AsyncClient, description: str, adjustments: str):
        """Property: Unicode characters should be handled safely"""
        data = {
            "special_relationship_id": 1,
            "description": description,
            "adjustments": adjustments,
            "diagnosed": True,
            "status": "Active"
        }
        response = await client.post("/api/vulnerabilities/special-relationships", json=data)
        assert response.status_code != 500
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

- [ ] All 12+ tests pass (6 unit + 6 property-based)
- [ ] GET returns vulnerabilities filtered by special_relationship_id or client_group_id
- [ ] POST creates new vulnerability for special relationship
- [ ] PUT updates existing record
- [ ] DELETE removes record
- [ ] Consistent with product owner vulnerability endpoints
- [ ] **Property-based tests**: All Hypothesis tests pass
- [ ] **Validation**: Invalid status, oversized description, non-positive IDs rejected

---

## Backend Phase Complete Checklist

After Cycles 1-4, verify:
- [ ] All 90+ backend tests pass (50+11+17+12 including property-based)
- [ ] 4 route files created (health.py, vulnerabilities.py)
- [ ] 2 model files created (health.py, vulnerability.py)
- [ ] All routes registered in main.py
- [ ] Consistent error handling across all endpoints
- [ ] Proper logging in place
- [ ] **Property-based tests**: All Hypothesis tests pass across all 4 cycles
- [ ] **Validation**: All input validation covered by property-based tests
