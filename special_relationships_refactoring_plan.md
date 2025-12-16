# Special Relationships Refactoring Plan

## Executive Summary

This document outlines the comprehensive refactoring required to align the special relationships feature with the updated database schema. The database migration has simplified the schema significantly, removing soft deletes, consolidating name/phone fields, and changing the linking mechanism from direct `client_group_id` to a junction table pattern via `product_owner_special_relationships`.

**Key Changes:**
- Single `name` field (was: `first_name` + `last_name`)
- Single `phone_number` field (was: `mobile`, `home`, `work`)
- `type` field distinguishes Personal/Professional (was: `is_professional` boolean)
- No `client_group_id` - linked via `product_owner_special_relationships` junction table
- Hard delete only (removed `deleted_at` soft delete)
- Added `firm_name` field for professional relationships

**Impact:**
- 11 files to refactor (8 frontend, 3 backend)
- Breaking API changes requiring coordinated deployment
- Estimated 11-14 hours of development + testing

---

## 1. Database Schema Changes

### Current Schema (After Migration)

```sql
CREATE TABLE special_relationships (
    id                  BIGSERIAL PRIMARY KEY,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name                TEXT NOT NULL,
    type                TEXT NOT NULL CHECK (type IN ('Personal', 'Professional')),
    date_of_birth       DATE,
    relationship        TEXT,
    dependency          BOOLEAN DEFAULT FALSE,
    email               TEXT,
    phone_number        TEXT,
    status              TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Deceased')),
    address_id          BIGINT REFERENCES addresses(id),
    notes               TEXT,
    firm_name           TEXT
);

-- Junction table for linking to product owners
CREATE TABLE product_owner_special_relationships (
    id                          BIGSERIAL PRIMARY KEY,
    product_owner_id            BIGINT NOT NULL REFERENCES product_owners(id) ON DELETE CASCADE,
    special_relationship_id     BIGINT NOT NULL REFERENCES special_relationships(id) ON DELETE CASCADE,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_owner_id, special_relationship_id)
);
```

### Schema Comparison

| Field | Old Schema | New Schema | Change Type |
|-------|------------|------------|-------------|
| `first_name` | TEXT NOT NULL | ❌ Removed | Consolidated to `name` |
| `last_name` | TEXT NOT NULL | ❌ Removed | Consolidated to `name` |
| `name` | ❌ Not present | TEXT NOT NULL | ✅ New field |
| `mobile` | TEXT | ❌ Removed | Consolidated to `phone_number` |
| `home` | TEXT | ❌ Removed | Consolidated to `phone_number` |
| `work` | TEXT | ❌ Removed | Consolidated to `phone_number` |
| `phone_number` | ❌ Not present | TEXT | ✅ New field |
| `is_professional` | BOOLEAN | ❌ Removed | Changed to `type` enum |
| `type` | ❌ Not present | TEXT CHECK | ✅ New field |
| `firm_name` | ❌ Not present | TEXT | ✅ New field |
| `client_group_id` | BIGINT FK | ❌ Removed | Use junction table |
| `deleted_at` | TIMESTAMP | ❌ Removed | Hard delete only |

---

## 2. File-by-File Refactoring Guide

### Phase 1: Backend Refactoring

#### File 1: `backend/app/models/special_relationship.py`

**Priority:** HIGH (Foundation for all other changes)
**Estimated Time:** 45 minutes

**Current State:**
```python
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date, datetime

class SpecialRelationshipBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    relationship: Optional[str] = None
    date_of_birth: Optional[date] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    home: Optional[str] = None
    work: Optional[str] = None
    status: str = Field(default="Active")
    dependency: bool = Field(default=False)
    is_professional: bool = Field(default=False)
    notes: Optional[str] = None
    address_id: Optional[int] = None
    client_group_id: int = Field(...)

class SpecialRelationshipCreate(SpecialRelationshipBase):
    pass

class SpecialRelationshipUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    # ... other fields

class SpecialRelationshipInDB(SpecialRelationshipBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
```

**Target State:**
```python
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import date, datetime

class SpecialRelationshipBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    type: Literal["Personal", "Professional"] = Field(...)
    relationship: Optional[str] = None
    date_of_birth: Optional[date] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    status: Literal["Active", "Inactive", "Deceased"] = Field(default="Active")
    dependency: bool = Field(default=False)
    notes: Optional[str] = None
    address_id: Optional[int] = None
    firm_name: Optional[str] = Field(None, max_length=200)

    @validator('firm_name')
    def validate_firm_name(cls, v, values):
        """Firm name required for Professional relationships"""
        if values.get('type') == 'Professional' and not v:
            raise ValueError('firm_name is required for Professional relationships')
        return v

    @validator('email')
    def validate_email(cls, v):
        """Basic email validation"""
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v

class SpecialRelationshipCreate(SpecialRelationshipBase):
    """Create requires product_owner_id to establish junction table link"""
    product_owner_id: int = Field(..., description="Product owner to link this relationship to")

class SpecialRelationshipUpdate(BaseModel):
    """All fields optional for PATCH updates"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[Literal["Personal", "Professional"]] = None
    relationship: Optional[str] = None
    date_of_birth: Optional[date] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    status: Optional[Literal["Active", "Inactive", "Deceased"]] = None
    dependency: Optional[bool] = None
    notes: Optional[str] = None
    address_id: Optional[int] = None
    firm_name: Optional[str] = Field(None, max_length=200)

class SpecialRelationshipInDB(SpecialRelationshipBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SpecialRelationshipResponse(SpecialRelationshipInDB):
    """Response includes linked product_owner_ids"""
    product_owner_ids: list[int] = Field(default_factory=list)
```

**Checklist:**
- [ ] Remove `first_name`, `last_name` fields
- [ ] Add `name` field with validation
- [ ] Remove `mobile`, `home`, `work` fields
- [ ] Add `phone_number` field
- [ ] Remove `is_professional` field
- [ ] Add `type` field with Literal type
- [ ] Add `firm_name` field with conditional validation
- [ ] Remove `client_group_id` field
- [ ] Add `product_owner_id` to Create model
- [ ] Remove `deleted_at` from InDB model
- [ ] Add `product_owner_ids` to Response model
- [ ] Update validators for new fields
- [ ] Update docstrings

**Testing:**
```python
# Test instantiation
relationship = SpecialRelationshipCreate(
    name="John Smith",
    type="Personal",
    relationship="Spouse",
    product_owner_id=123
)

# Test validation
with pytest.raises(ValueError):
    SpecialRelationshipCreate(
        name="",  # Should fail min_length
        type="Personal",
        product_owner_id=123
    )

# Test Professional validation
with pytest.raises(ValueError):
    SpecialRelationshipCreate(
        name="Jane Doe",
        type="Professional",  # Should require firm_name
        product_owner_id=123
    )
```

---

#### File 2: `backend/app/api/routes/special_relationships.py`

**Priority:** HIGH (API contract changes)
**Estimated Time:** 2-3 hours

**Current Endpoints:**
```python
# OLD ENDPOINTS
GET    /api/special-relationships/client-group/{client_group_id}
POST   /api/special-relationships
PUT    /api/special-relationships/{id}
DELETE /api/special-relationships/{id}  # Soft delete
PATCH  /api/special-relationships/{id}/status
```

**Target Endpoints:**
```python
# NEW ENDPOINTS
GET    /api/special-relationships/product-owner/{product_owner_id}
POST   /api/special-relationships
PUT    /api/special-relationships/{id}
DELETE /api/special-relationships/{id}  # Hard delete
```

**Changes Required:**

**1. GET Endpoint - Fetch by Product Owner**

Before:
```python
@router.get("/client-group/{client_group_id}", response_model=List[SpecialRelationshipInDB])
async def get_special_relationships(
    client_group_id: int,
    include_deleted: bool = False,
    db=Depends(get_db)
):
    query = """
        SELECT * FROM special_relationships
        WHERE client_group_id = $1
        AND (deleted_at IS NULL OR $2 = TRUE)
        ORDER BY is_professional, last_name, first_name
    """
    rows = await db.fetch(query, client_group_id, include_deleted)
    return [dict(row) for row in rows]
```

After:
```python
@router.get("/product-owner/{product_owner_id}", response_model=List[SpecialRelationshipResponse])
async def get_special_relationships(
    product_owner_id: int,
    db=Depends(get_db)
):
    """
    Fetch all special relationships for a product owner.
    Returns relationships with their linked product_owner_ids.
    """
    query = """
        SELECT
            sr.*,
            ARRAY_AGG(posr.product_owner_id) as product_owner_ids
        FROM special_relationships sr
        JOIN product_owner_special_relationships posr ON sr.id = posr.special_relationship_id
        WHERE posr.product_owner_id = $1
        GROUP BY sr.id
        ORDER BY sr.type, sr.name
    """
    rows = await db.fetch(query, product_owner_id)
    return [dict(row) for row in rows]
```

**2. POST Endpoint - Create with Junction Table**

Before:
```python
@router.post("/", response_model=SpecialRelationshipInDB, status_code=201)
async def create_special_relationship(
    relationship: SpecialRelationshipCreate,
    db=Depends(get_db)
):
    query = """
        INSERT INTO special_relationships (
            first_name, last_name, client_group_id, is_professional, ...
        ) VALUES ($1, $2, $3, $4, ...)
        RETURNING *
    """
    row = await db.fetchrow(query, relationship.first_name, relationship.last_name, ...)
    return dict(row)
```

After:
```python
@router.post("/", response_model=SpecialRelationshipResponse, status_code=201)
async def create_special_relationship(
    relationship: SpecialRelationshipCreate,
    db=Depends(get_db)
):
    """
    Create a special relationship and link to product owner.
    Uses transaction to ensure atomicity.
    """
    async with db.transaction():
        # Insert special relationship
        sr_query = """
            INSERT INTO special_relationships (
                name, type, relationship, date_of_birth, email, phone_number,
                status, dependency, notes, address_id, firm_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        """
        sr_row = await db.fetchrow(
            sr_query,
            relationship.name,
            relationship.type,
            relationship.relationship,
            relationship.date_of_birth,
            relationship.email,
            relationship.phone_number,
            relationship.status,
            relationship.dependency,
            relationship.notes,
            relationship.address_id,
            relationship.firm_name
        )

        # Create junction table entry
        junction_query = """
            INSERT INTO product_owner_special_relationships (
                product_owner_id, special_relationship_id
            ) VALUES ($1, $2)
        """
        await db.execute(junction_query, relationship.product_owner_id, sr_row['id'])

        # Return with product_owner_ids
        result = dict(sr_row)
        result['product_owner_ids'] = [relationship.product_owner_id]
        return result
```

**3. PUT Endpoint - Update Fields**

Before:
```python
@router.put("/{id}", response_model=SpecialRelationshipInDB)
async def update_special_relationship(
    id: int,
    relationship: SpecialRelationshipUpdate,
    db=Depends(get_db)
):
    # Build dynamic UPDATE query for first_name, last_name, etc.
    ...
```

After:
```python
@router.put("/{id}", response_model=SpecialRelationshipResponse)
async def update_special_relationship(
    id: int,
    relationship: SpecialRelationshipUpdate,
    db=Depends(get_db)
):
    """
    Update special relationship fields.
    Updated_at timestamp is automatically updated by trigger.
    """
    # Build dynamic UPDATE query
    update_fields = []
    values = []
    param_count = 1

    field_mapping = {
        'name': relationship.name,
        'type': relationship.type,
        'relationship': relationship.relationship,
        'date_of_birth': relationship.date_of_birth,
        'email': relationship.email,
        'phone_number': relationship.phone_number,
        'status': relationship.status,
        'dependency': relationship.dependency,
        'notes': relationship.notes,
        'address_id': relationship.address_id,
        'firm_name': relationship.firm_name
    }

    for field, value in field_mapping.items():
        if value is not None:
            update_fields.append(f"{field} = ${param_count}")
            values.append(value)
            param_count += 1

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    values.append(id)
    query = f"""
        UPDATE special_relationships
        SET {', '.join(update_fields)}
        WHERE id = ${param_count}
        RETURNING *
    """

    row = await db.fetchrow(query, *values)
    if not row:
        raise HTTPException(status_code=404, detail="Relationship not found")

    # Fetch product_owner_ids
    po_query = """
        SELECT ARRAY_AGG(product_owner_id) as product_owner_ids
        FROM product_owner_special_relationships
        WHERE special_relationship_id = $1
    """
    po_row = await db.fetchrow(po_query, id)

    result = dict(row)
    result['product_owner_ids'] = po_row['product_owner_ids'] or []
    return result
```

**4. DELETE Endpoint - Hard Delete**

Before:
```python
@router.delete("/{id}", status_code=204)
async def delete_special_relationship(
    id: int,
    db=Depends(get_db)
):
    # Soft delete
    query = "UPDATE special_relationships SET deleted_at = NOW() WHERE id = $1"
    await db.execute(query, id)
```

After:
```python
@router.delete("/{id}", status_code=204)
async def delete_special_relationship(
    id: int,
    db=Depends(get_db)
):
    """
    Hard delete special relationship.
    Junction table entries cascade delete automatically.
    """
    query = "DELETE FROM special_relationships WHERE id = $1"
    result = await db.execute(query, id)

    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Relationship not found")
```

**5. Remove Status Endpoint**

```python
# DELETE THIS ENDPOINT if it exists
@router.patch("/{id}/status")
async def update_status(...):
    ...
```

**Checklist:**
- [ ] Update GET endpoint to use product_owner_id
- [ ] Update GET query to join junction table
- [ ] Update GET to return product_owner_ids array
- [ ] Update POST to create junction table entry
- [ ] Wrap POST in transaction for atomicity
- [ ] Update POST to use new field names
- [ ] Update PUT to use new field names
- [ ] Update PUT to return product_owner_ids
- [ ] Update DELETE to hard delete
- [ ] Remove soft delete logic
- [ ] Remove PATCH /status endpoint if exists
- [ ] Update error handling
- [ ] Update docstrings
- [ ] Add proper HTTP status codes

**Testing:**
```bash
# Test GET
curl http://localhost:8001/api/special-relationships/product-owner/1

# Test POST
curl -X POST http://localhost:8001/api/special-relationships \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "type": "Personal",
    "relationship": "Spouse",
    "product_owner_id": 1
  }'

# Test PUT
curl -X PUT http://localhost:8001/api/special-relationships/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Q. Smith",
    "phone_number": "555-1234"
  }'

# Test DELETE
curl -X DELETE http://localhost:8001/api/special-relationships/1
```

---

#### File 3: `backend/tests/test_special_relationships_routes.py`

**Priority:** HIGH (Verify backend changes)
**Estimated Time:** 1-2 hours

**Changes Required:**

**1. Update Test Fixtures**

Before:
```python
@pytest.fixture
def sample_relationship():
    return {
        "first_name": "John",
        "last_name": "Smith",
        "client_group_id": 1,
        "is_professional": False,
        "mobile": "555-1234"
    }
```

After:
```python
@pytest.fixture
def sample_personal_relationship():
    return {
        "name": "John Smith",
        "type": "Personal",
        "relationship": "Spouse",
        "product_owner_id": 1,
        "phone_number": "555-1234",
        "email": "john@example.com"
    }

@pytest.fixture
def sample_professional_relationship():
    return {
        "name": "Jane Accountant",
        "type": "Professional",
        "relationship": "Accountant",
        "firm_name": "Accounting Inc.",
        "product_owner_id": 1,
        "phone_number": "555-5678",
        "email": "jane@accounting.com"
    }
```

**2. Update Test Cases**

```python
class TestSpecialRelationshipsRoutes:

    async def test_create_personal_relationship(self, client, sample_personal_relationship):
        """Test creating a personal relationship"""
        response = await client.post(
            "/api/special-relationships",
            json=sample_personal_relationship
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "John Smith"
        assert data["type"] == "Personal"
        assert data["phone_number"] == "555-1234"
        assert data["product_owner_ids"] == [1]
        assert "id" in data
        assert "created_at" in data

    async def test_create_professional_relationship(self, client, sample_professional_relationship):
        """Test creating a professional relationship"""
        response = await client.post(
            "/api/special-relationships",
            json=sample_professional_relationship
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Jane Accountant"
        assert data["type"] == "Professional"
        assert data["firm_name"] == "Accounting Inc."
        assert data["product_owner_ids"] == [1]

    async def test_create_professional_without_firm_name_fails(self, client):
        """Test that Professional type requires firm_name"""
        payload = {
            "name": "No Firm",
            "type": "Professional",
            "product_owner_id": 1
        }
        response = await client.post("/api/special-relationships", json=payload)
        assert response.status_code == 422
        assert "firm_name" in response.text.lower()

    async def test_get_relationships_by_product_owner(self, client, db):
        """Test fetching relationships for a product owner"""
        # Setup: Create test data
        sr1 = await db.fetchrow("""
            INSERT INTO special_relationships (name, type, relationship)
            VALUES ('John Smith', 'Personal', 'Spouse')
            RETURNING id
        """)
        sr2 = await db.fetchrow("""
            INSERT INTO special_relationships (name, type, relationship, firm_name)
            VALUES ('Jane Accountant', 'Professional', 'Accountant', 'Firm Inc.')
            RETURNING id
        """)

        # Link to product owner
        await db.execute("""
            INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
            VALUES (1, $1), (1, $2)
        """, sr1['id'], sr2['id'])

        # Test
        response = await client.get("/api/special-relationships/product-owner/1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert any(r["name"] == "John Smith" for r in data)
        assert any(r["name"] == "Jane Accountant" for r in data)
        assert all(1 in r["product_owner_ids"] for r in data)

    async def test_update_relationship(self, client, db):
        """Test updating relationship fields"""
        # Setup
        sr = await db.fetchrow("""
            INSERT INTO special_relationships (name, type, phone_number)
            VALUES ('John Smith', 'Personal', '555-1234')
            RETURNING id
        """)
        await db.execute("""
            INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
            VALUES (1, $1)
        """, sr['id'])

        # Update
        response = await client.put(
            f"/api/special-relationships/{sr['id']}",
            json={
                "name": "John Q. Smith",
                "phone_number": "555-9999"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "John Q. Smith"
        assert data["phone_number"] == "555-9999"
        assert data["type"] == "Personal"  # Unchanged

    async def test_delete_relationship(self, client, db):
        """Test hard delete of relationship"""
        # Setup
        sr = await db.fetchrow("""
            INSERT INTO special_relationships (name, type)
            VALUES ('Delete Me', 'Personal')
            RETURNING id
        """)

        # Delete
        response = await client.delete(f"/api/special-relationships/{sr['id']}")
        assert response.status_code == 204

        # Verify hard delete
        result = await db.fetchrow(
            "SELECT * FROM special_relationships WHERE id = $1",
            sr['id']
        )
        assert result is None

    async def test_delete_cascades_to_junction_table(self, client, db):
        """Test that deleting relationship removes junction entries"""
        # Setup
        sr = await db.fetchrow("""
            INSERT INTO special_relationships (name, type)
            VALUES ('Delete Me', 'Personal')
            RETURNING id
        """)
        await db.execute("""
            INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
            VALUES (1, $1)
        """, sr['id'])

        # Delete
        await client.delete(f"/api/special-relationships/{sr['id']}")

        # Verify junction entry gone
        result = await db.fetchrow(
            "SELECT * FROM product_owner_special_relationships WHERE special_relationship_id = $1",
            sr['id']
        )
        assert result is None

    async def test_validation_name_required(self, client):
        """Test that name is required"""
        response = await client.post(
            "/api/special-relationships",
            json={"type": "Personal", "product_owner_id": 1}
        )
        assert response.status_code == 422

    async def test_validation_type_enum(self, client):
        """Test that type must be Personal or Professional"""
        response = await client.post(
            "/api/special-relationships",
            json={
                "name": "Test",
                "type": "Invalid",
                "product_owner_id": 1
            }
        )
        assert response.status_code == 422

    async def test_validation_email_format(self, client):
        """Test email format validation"""
        response = await client.post(
            "/api/special-relationships",
            json={
                "name": "Test",
                "type": "Personal",
                "email": "invalid-email",
                "product_owner_id": 1
            }
        )
        assert response.status_code == 422
```

**Checklist:**
- [ ] Update test fixtures to use new schema
- [ ] Remove tests for soft delete
- [ ] Add tests for hard delete
- [ ] Add tests for junction table cascade
- [ ] Update URL paths (client-group → product-owner)
- [ ] Test Personal vs Professional creation
- [ ] Test firm_name validation for Professional
- [ ] Test name field validation
- [ ] Test phone_number field (single field)
- [ ] Test type enum validation
- [ ] Test email validation
- [ ] Update assertions for new response structure
- [ ] Test product_owner_ids in responses
- [ ] Remove tests for deleted_at field
- [ ] Update all test data to match new schema

**Run Tests:**
```bash
cd backend
pytest tests/test_special_relationships_routes.py -v
```

---

### Phase 2: Frontend Type & Service Layer

#### File 4: `frontend/src/types/specialRelationship.ts`

**Priority:** HIGH (Foundation for frontend)
**Estimated Time:** 30 minutes

**Current State:**
```typescript
export interface SpecialRelationship {
  id: number;
  first_name: string;
  last_name: string;
  relationship?: string;
  date_of_birth?: string;
  email?: string;
  mobile?: string;
  home?: string;
  work?: string;
  status: 'Active' | 'Inactive' | 'Deceased';
  dependency: boolean;
  is_professional: boolean;
  notes?: string;
  address_id?: number;
  client_group_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreateSpecialRelationshipPayload {
  first_name: string;
  last_name: string;
  relationship?: string;
  date_of_birth?: string;
  email?: string;
  mobile?: string;
  home?: string;
  work?: string;
  status?: 'Active' | 'Inactive' | 'Deceased';
  dependency?: boolean;
  is_professional: boolean;
  notes?: string;
  address_id?: number;
  client_group_id: number;
}
```

**Target State:**
```typescript
/**
 * Type for special relationship
 */
export type RelationshipType = 'Personal' | 'Professional';

/**
 * Status for special relationship
 */
export type RelationshipStatus = 'Active' | 'Inactive' | 'Deceased';

/**
 * Special Relationship entity from database
 */
export interface SpecialRelationship {
  id: number;
  name: string;
  type: RelationshipType;
  relationship?: string;
  date_of_birth?: string;
  email?: string;
  phone_number?: string;
  status: RelationshipStatus;
  dependency: boolean;
  notes?: string;
  address_id?: number;
  firm_name?: string;
  created_at: string;
  updated_at: string;
  product_owner_ids: number[];
}

/**
 * Payload for creating a special relationship
 */
export interface CreateSpecialRelationshipPayload {
  name: string;
  type: RelationshipType;
  relationship?: string;
  date_of_birth?: string;
  email?: string;
  phone_number?: string;
  status?: RelationshipStatus;
  dependency?: boolean;
  notes?: string;
  address_id?: number;
  firm_name?: string;
  product_owner_id: number;
}

/**
 * Payload for updating a special relationship
 */
export interface UpdateSpecialRelationshipPayload {
  name?: string;
  type?: RelationshipType;
  relationship?: string;
  date_of_birth?: string;
  email?: string;
  phone_number?: string;
  status?: RelationshipStatus;
  dependency?: boolean;
  notes?: string;
  address_id?: number;
  firm_name?: string;
}

/**
 * Form data structure for relationship forms
 */
export interface RelationshipFormData {
  name: string;
  type: RelationshipType;
  relationship: string;
  date_of_birth: string;
  email: string;
  phone_number: string;
  status: RelationshipStatus;
  dependency: boolean;
  notes: string;
  firm_name: string;
}

/**
 * Helper to check if relationship is professional
 */
export function isProfessional(relationship: SpecialRelationship): boolean {
  return relationship.type === 'Professional';
}

/**
 * Helper to check if relationship is personal
 */
export function isPersonal(relationship: SpecialRelationship): boolean {
  return relationship.type === 'Personal';
}

/**
 * Helper to get display name
 */
export function getDisplayName(relationship: SpecialRelationship): string {
  return relationship.name;
}

/**
 * Helper to get firm display (name @ firm)
 */
export function getFirmDisplay(relationship: SpecialRelationship): string {
  if (isProfessional(relationship) && relationship.firm_name) {
    return `${relationship.name} @ ${relationship.firm_name}`;
  }
  return relationship.name;
}
```

**Checklist:**
- [ ] Remove `first_name`, `last_name` fields
- [ ] Add `name` field
- [ ] Remove `mobile`, `home`, `work` fields
- [ ] Add `phone_number` field
- [ ] Remove `is_professional` field
- [ ] Add `type` field with enum
- [ ] Add `firm_name` field
- [ ] Remove `client_group_id` field
- [ ] Add `product_owner_ids` array
- [ ] Add `product_owner_id` to Create payload
- [ ] Remove `deleted_at` field
- [ ] Create `RelationshipType` type
- [ ] Create `RelationshipStatus` type
- [ ] Create `RelationshipFormData` interface
- [ ] Add helper functions
- [ ] Add JSDoc comments

**Testing:**
```typescript
// Type checking
const relationship: SpecialRelationship = {
  id: 1,
  name: "John Smith",
  type: "Personal",
  relationship: "Spouse",
  status: "Active",
  dependency: false,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
  product_owner_ids: [1, 2]
};

// Helper functions
console.assert(isPersonal(relationship) === true);
console.assert(getDisplayName(relationship) === "John Smith");
```

---

#### File 5: `frontend/src/services/specialRelationshipsApi.ts`

**Priority:** HIGH (API communication)
**Estimated Time:** 1 hour

**Current State:**
```typescript
import api from './api';
import { SpecialRelationship, CreateSpecialRelationshipPayload } from '../types/specialRelationship';

export const specialRelationshipsApi = {
  getByClientGroup: async (clientGroupId: number, includeDeleted = false): Promise<SpecialRelationship[]> => {
    const params = new URLSearchParams();
    if (includeDeleted) params.append('include_deleted', 'true');
    const response = await api.get(`/special-relationships/client-group/${clientGroupId}?${params}`);
    return response.data;
  },

  create: async (payload: CreateSpecialRelationshipPayload): Promise<SpecialRelationship> => {
    const response = await api.post('/special-relationships', payload);
    return response.data;
  },

  update: async (id: number, payload: Partial<CreateSpecialRelationshipPayload>): Promise<SpecialRelationship> => {
    const response = await api.put(`/special-relationships/${id}`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/special-relationships/${id}`);
  },

  updateStatus: async (id: number, status: string): Promise<SpecialRelationship> => {
    const response = await api.patch(`/special-relationships/${id}/status`, { status });
    return response.data;
  }
};
```

**Target State:**
```typescript
import api from './api';
import {
  SpecialRelationship,
  CreateSpecialRelationshipPayload,
  UpdateSpecialRelationshipPayload
} from '../types/specialRelationship';

/**
 * API client for special relationships endpoints
 */
export const specialRelationshipsApi = {
  /**
   * Fetch all special relationships for a product owner
   * @param productOwnerId - ID of the product owner
   * @returns Array of special relationships
   */
  getByProductOwner: async (productOwnerId: number): Promise<SpecialRelationship[]> => {
    const response = await api.get(`/special-relationships/product-owner/${productOwnerId}`);
    return response.data;
  },

  /**
   * Create a new special relationship and link to product owner
   * @param payload - Relationship data including product_owner_id
   * @returns Created relationship with product_owner_ids
   */
  create: async (payload: CreateSpecialRelationshipPayload): Promise<SpecialRelationship> => {
    const response = await api.post('/special-relationships', payload);
    return response.data;
  },

  /**
   * Update an existing special relationship
   * @param id - Relationship ID
   * @param payload - Fields to update (all optional)
   * @returns Updated relationship
   */
  update: async (
    id: number,
    payload: UpdateSpecialRelationshipPayload
  ): Promise<SpecialRelationship> => {
    const response = await api.put(`/special-relationships/${id}`, payload);
    return response.data;
  },

  /**
   * Delete a special relationship (hard delete)
   * Cascade deletes junction table entries automatically
   * @param id - Relationship ID
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/special-relationships/${id}`);
  }
};
```

**Checklist:**
- [ ] Rename `getByClientGroup` → `getByProductOwner`
- [ ] Update URL: `/client-group/{id}` → `/product-owner/{id}`
- [ ] Remove `includeDeleted` parameter
- [ ] Update Create payload type
- [ ] Add Update payload type
- [ ] Remove `updateStatus` method
- [ ] Update JSDoc comments
- [ ] Remove soft delete references
- [ ] Add proper TypeScript types

**Testing:**
```typescript
// Manual API testing
import { specialRelationshipsApi } from './specialRelationshipsApi';

// Test GET
const relationships = await specialRelationshipsApi.getByProductOwner(1);
console.log(relationships);

// Test POST
const newRelationship = await specialRelationshipsApi.create({
  name: "John Smith",
  type: "Personal",
  relationship: "Spouse",
  product_owner_id: 1
});
console.log(newRelationship);

// Test PUT
const updated = await specialRelationshipsApi.update(1, {
  phone_number: "555-1234"
});
console.log(updated);

// Test DELETE
await specialRelationshipsApi.delete(1);
```

---

#### File 6: `frontend/src/hooks/useSpecialRelationships.ts`

**Priority:** HIGH (Data fetching)
**Estimated Time:** 1 hour

**Current State:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { specialRelationshipsApi } from '../services/specialRelationshipsApi';
import { CreateSpecialRelationshipPayload } from '../types/specialRelationship';

export function useSpecialRelationships(clientGroupId: number) {
  return useQuery({
    queryKey: ['specialRelationships', clientGroupId],
    queryFn: () => specialRelationshipsApi.getByClientGroup(clientGroupId),
    staleTime: 5 * 60 * 1000
  });
}

export function useCreateSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: specialRelationshipsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['specialRelationships', data.client_group_id]);
    }
  });
}

export function useUpdateSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateSpecialRelationshipPayload> }) =>
      specialRelationshipsApi.update(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['specialRelationships', data.client_group_id]);
    }
  });
}

export function useDeleteSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: specialRelationshipsApi.delete,
    onMutate: async (id: number) => {
      // Optimistic update for soft delete
      const queries = queryClient.getQueriesData(['specialRelationships']);
      queries.forEach(([key, data]) => {
        if (data) {
          const updated = (data as any[]).map(r =>
            r.id === id ? { ...r, deleted_at: new Date().toISOString() } : r
          );
          queryClient.setQueryData(key, updated);
        }
      });
    }
  });
}
```

**Target State:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { specialRelationshipsApi } from '../services/specialRelationshipsApi';
import {
  CreateSpecialRelationshipPayload,
  UpdateSpecialRelationshipPayload,
  SpecialRelationship
} from '../types/specialRelationship';

/**
 * Query key factory for special relationships
 */
const queryKeys = {
  all: ['specialRelationships'] as const,
  byProductOwner: (productOwnerId: number) =>
    [...queryKeys.all, 'productOwner', productOwnerId] as const,
};

/**
 * Fetch special relationships for a product owner
 */
export function useSpecialRelationships(productOwnerId: number) {
  return useQuery({
    queryKey: queryKeys.byProductOwner(productOwnerId),
    queryFn: () => specialRelationshipsApi.getByProductOwner(productOwnerId),
    staleTime: 5 * 60 * 1000,
    enabled: !!productOwnerId
  });
}

/**
 * Create a new special relationship
 */
export function useCreateSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSpecialRelationshipPayload) =>
      specialRelationshipsApi.create(payload),
    onSuccess: (data: SpecialRelationship) => {
      // Invalidate cache for all linked product owners
      data.product_owner_ids.forEach(poId => {
        queryClient.invalidateQueries(queryKeys.byProductOwner(poId));
      });
    },
    onError: (error) => {
      console.error('Failed to create special relationship:', error);
    }
  });
}

/**
 * Update an existing special relationship
 */
export function useUpdateSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: number;
      payload: UpdateSpecialRelationshipPayload
    }) => specialRelationshipsApi.update(id, payload),
    onSuccess: (data: SpecialRelationship) => {
      // Invalidate cache for all linked product owners
      data.product_owner_ids.forEach(poId => {
        queryClient.invalidateQueries(queryKeys.byProductOwner(poId));
      });
    },
    onError: (error) => {
      console.error('Failed to update special relationship:', error);
    }
  });
}

/**
 * Delete a special relationship (hard delete)
 */
export function useDeleteSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: specialRelationshipsApi.delete,
    onMutate: async (id: number) => {
      // Optimistically remove from cache
      const queries = queryClient.getQueriesData(queryKeys.all);
      const previousData: Array<[any, any]> = [];

      queries.forEach(([key, data]) => {
        if (data && Array.isArray(data)) {
          previousData.push([key, data]);
          const filtered = data.filter((r: SpecialRelationship) => r.id !== id);
          queryClient.setQueryData(key, filtered);
        }
      });

      return { previousData };
    },
    onError: (error, id, context) => {
      console.error('Failed to delete special relationship:', error);

      // Rollback optimistic update
      if (context?.previousData) {
        context.previousData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries(queryKeys.all);
    }
  });
}

/**
 * Filter relationships by type
 */
export function useFilteredRelationships(
  productOwnerId: number,
  type: 'Personal' | 'Professional'
) {
  const { data, ...query } = useSpecialRelationships(productOwnerId);

  const filtered = data?.filter(r => r.type === type) ?? [];

  return {
    data: filtered,
    ...query
  };
}
```

**Checklist:**
- [ ] Update query keys to use `productOwner`
- [ ] Update hook parameter from `clientGroupId` to `productOwnerId`
- [ ] Update mutation to invalidate by `product_owner_ids` array
- [ ] Remove soft delete optimistic update logic
- [ ] Add hard delete optimistic update
- [ ] Add rollback on error for delete
- [ ] Add `enabled` check for query
- [ ] Add error handling to mutations
- [ ] Create query key factory
- [ ] Add `useFilteredRelationships` helper hook
- [ ] Update TypeScript types
- [ ] Add JSDoc comments

**Testing:**
```typescript
// In component
const { data: relationships, isLoading } = useSpecialRelationships(productOwnerId);
const createMutation = useCreateSpecialRelationship();
const updateMutation = useUpdateSpecialRelationship();
const deleteMutation = useDeleteSpecialRelationship();

// Test create
await createMutation.mutateAsync({
  name: "John Smith",
  type: "Personal",
  relationship: "Spouse",
  product_owner_id: 1
});

// Test update
await updateMutation.mutateAsync({
  id: 1,
  payload: { phone_number: "555-1234" }
});

// Test delete
await deleteMutation.mutateAsync(1);
```

---

#### File 7: `frontend/src/hooks/useRelationshipValidation.ts`

**Priority:** MEDIUM (Form validation)
**Estimated Time:** 45 minutes

**Current State:**
```typescript
import { useState, useCallback } from 'react';

interface ValidationErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  // ... other fields
}

interface RelationshipFormData {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  home: string;
  work: string;
  is_professional: boolean;
  // ... other fields
}

export function useRelationshipValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = useCallback((data: RelationshipFormData) => {
    const newErrors: ValidationErrors = {};

    if (!data.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (data.first_name.length > 100) {
      newErrors.first_name = 'First name must be less than 100 characters';
    }

    if (!data.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (data.email && !isValidEmail(data.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Phone validation for multiple fields
    if (data.mobile && !isValidPhone(data.mobile)) {
      newErrors.mobile = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  return { errors, validate, setErrors };
}
```

**Target State:**
```typescript
import { useState, useCallback } from 'react';
import { RelationshipFormData } from '../types/specialRelationship';

/**
 * Validation error messages
 */
interface ValidationErrors {
  name?: string;
  type?: string;
  email?: string;
  phone_number?: string;
  firm_name?: string;
  relationship?: string;
  date_of_birth?: string;
}

/**
 * Validation rules configuration
 */
const VALIDATION_RULES = {
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
    REQUIRED: true
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  PHONE: {
    PATTERN: /^[\d\s\-\(\)\+]+$/,
    MIN_LENGTH: 7,
    MAX_LENGTH: 20
  },
  FIRM_NAME: {
    MAX_LENGTH: 200
  }
};

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return VALIDATION_RULES.EMAIL.PATTERN.test(email);
}

/**
 * Validate phone number format
 */
function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  return (
    VALIDATION_RULES.PHONE.PATTERN.test(cleaned) &&
    cleaned.length >= VALIDATION_RULES.PHONE.MIN_LENGTH &&
    cleaned.length <= VALIDATION_RULES.PHONE.MAX_LENGTH
  );
}

/**
 * Hook for validating special relationship form data
 */
export function useRelationshipValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({});

  /**
   * Validate all form fields
   */
  const validate = useCallback((data: Partial<RelationshipFormData>): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate name (required)
    if (!data.name?.trim()) {
      newErrors.name = 'Name is required';
    } else if (data.name.length < VALIDATION_RULES.NAME.MIN_LENGTH) {
      newErrors.name = `Name must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} character`;
    } else if (data.name.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
      newErrors.name = `Name must be less than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`;
    }

    // Validate type (required)
    if (!data.type) {
      newErrors.type = 'Type is required (Personal or Professional)';
    }

    // Validate email (optional, but must be valid if provided)
    if (data.email && !isValidEmail(data.email)) {
      newErrors.email = 'Invalid email format (e.g., user@example.com)';
    }

    // Validate phone number (optional, but must be valid if provided)
    if (data.phone_number && !isValidPhone(data.phone_number)) {
      newErrors.phone_number = 'Invalid phone format (e.g., 555-1234 or +1 555-1234)';
    }

    // Validate firm_name (required for Professional type)
    if (data.type === 'Professional') {
      if (!data.firm_name?.trim()) {
        newErrors.firm_name = 'Firm name is required for professional relationships';
      } else if (data.firm_name.length > VALIDATION_RULES.FIRM_NAME.MAX_LENGTH) {
        newErrors.firm_name = `Firm name must be less than ${VALIDATION_RULES.FIRM_NAME.MAX_LENGTH} characters`;
      }
    }

    // Validate date_of_birth (optional, but must be valid date if provided)
    if (data.date_of_birth) {
      const date = new Date(data.date_of_birth);
      if (isNaN(date.getTime())) {
        newErrors.date_of_birth = 'Invalid date format';
      } else if (date > new Date()) {
        newErrors.date_of_birth = 'Date of birth cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  /**
   * Validate a single field
   */
  const validateField = useCallback((
    fieldName: keyof RelationshipFormData,
    value: any,
    formData?: Partial<RelationshipFormData>
  ): string | undefined => {
    let error: string | undefined;

    switch (fieldName) {
      case 'name':
        if (!value?.trim()) {
          error = 'Name is required';
        } else if (value.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
          error = `Name must be less than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`;
        }
        break;

      case 'type':
        if (!value) {
          error = 'Type is required';
        }
        break;

      case 'email':
        if (value && !isValidEmail(value)) {
          error = 'Invalid email format';
        }
        break;

      case 'phone_number':
        if (value && !isValidPhone(value)) {
          error = 'Invalid phone format';
        }
        break;

      case 'firm_name':
        if (formData?.type === 'Professional' && !value?.trim()) {
          error = 'Firm name is required for professional relationships';
        } else if (value && value.length > VALIDATION_RULES.FIRM_NAME.MAX_LENGTH) {
          error = `Firm name must be less than ${VALIDATION_RULES.FIRM_NAME.MAX_LENGTH} characters`;
        }
        break;

      case 'date_of_birth':
        if (value) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            error = 'Invalid date format';
          } else if (date > new Date()) {
            error = 'Date of birth cannot be in the future';
          }
        }
        break;
    }

    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));

    return error;
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Clear error for specific field
   */
  const clearFieldError = useCallback((fieldName: keyof RelationshipFormData) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  return {
    errors,
    validate,
    validateField,
    setErrors,
    clearErrors,
    clearFieldError
  };
}
```

**Checklist:**
- [ ] Remove `first_name`, `last_name` validation
- [ ] Add `name` validation
- [ ] Remove `mobile`, `home`, `work` validation
- [ ] Add `phone_number` validation
- [ ] Remove `is_professional` validation
- [ ] Add `type` validation
- [ ] Add `firm_name` validation (conditional on type)
- [ ] Update `RelationshipFormData` interface
- [ ] Add validation rules constants
- [ ] Add `validateField` method for real-time validation
- [ ] Add `clearErrors` and `clearFieldError` methods
- [ ] Update error messages
- [ ] Add JSDoc comments

**Testing:**
```typescript
// Test validation
const { validate, errors } = useRelationshipValidation();

// Test name required
const isValid1 = validate({ name: '', type: 'Personal' });
console.assert(!isValid1);
console.assert(errors.name === 'Name is required');

// Test professional requires firm_name
const isValid2 = validate({
  name: 'John',
  type: 'Professional'
});
console.assert(!isValid2);
console.assert(errors.firm_name?.includes('required'));

// Test email validation
const isValid3 = validate({
  name: 'John',
  type: 'Personal',
  email: 'invalid'
});
console.assert(!isValid3);
console.assert(errors.email?.includes('Invalid'));

// Test valid data
const isValid4 = validate({
  name: 'John Smith',
  type: 'Personal',
  email: 'john@example.com',
  phone_number: '555-1234'
});
console.assert(isValid4);
console.assert(Object.keys(errors).length === 0);
```

---

### Phase 3: Frontend Components

#### File 8: `frontend/src/components/RelationshipFormFields.tsx`

**Priority:** HIGH (Shared form component)
**Estimated Time:** 1-1.5 hours

**Current Structure:**
- Separate first_name/last_name inputs
- Multiple phone inputs (mobile, home, work)
- isProfessional prop to determine field visibility

**Target Structure:**
- Single name input
- Single phone_number input
- Type dropdown (Personal/Professional)
- Firm name input (shown when type = Professional)

**Changes Required:**

```typescript
import React, { useState, useEffect } from 'react';
import { BaseInput } from './ui/inputs/BaseInput';
import { SearchableDropdown } from './ui/dropdowns/SearchableDropdown';
import { RelationshipFormData, RelationshipType, RelationshipStatus } from '../types/specialRelationship';
import { useRelationshipValidation } from '../hooks/useRelationshipValidation';

interface RelationshipFormFieldsProps {
  formData: RelationshipFormData;
  onChange: (field: keyof RelationshipFormData, value: any) => void;
  errors?: Record<string, string>;
}

/**
 * Relationship type options
 */
const RELATIONSHIP_TYPES: Array<{ value: RelationshipType; label: string }> = [
  { value: 'Personal', label: 'Personal' },
  { value: 'Professional', label: 'Professional' }
];

/**
 * Status options
 */
const STATUS_OPTIONS: Array<{ value: RelationshipStatus; label: string }> = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Deceased', label: 'Deceased' }
];

/**
 * Common relationship types for Personal
 */
const PERSONAL_RELATIONSHIPS = [
  'Spouse',
  'Partner',
  'Child',
  'Parent',
  'Sibling',
  'Friend',
  'Other Family'
];

/**
 * Common relationship types for Professional
 */
const PROFESSIONAL_RELATIONSHIPS = [
  'Accountant',
  'Lawyer',
  'Financial Advisor',
  'Insurance Agent',
  'Real Estate Agent',
  'Business Partner',
  'Consultant'
];

/**
 * Shared form fields component for creating/editing special relationships
 */
export const RelationshipFormFields: React.FC<RelationshipFormFieldsProps> = ({
  formData,
  onChange,
  errors = {}
}) => {
  const { validateField } = useRelationshipValidation();

  // Get relationship suggestions based on type
  const relationshipSuggestions = formData.type === 'Professional'
    ? PROFESSIONAL_RELATIONSHIPS
    : PERSONAL_RELATIONSHIPS;

  // Handle field change with optional validation
  const handleFieldChange = (field: keyof RelationshipFormData, value: any) => {
    onChange(field, value);

    // Real-time validation for specific fields
    if (['name', 'email', 'phone_number', 'firm_name'].includes(field)) {
      validateField(field, value, formData);
    }
  };

  // Auto-clear firm_name when switching to Personal
  useEffect(() => {
    if (formData.type === 'Personal' && formData.firm_name) {
      onChange('firm_name', '');
    }
  }, [formData.type]);

  return (
    <div className="space-y-4">
      {/* Row 1: Name and Type */}
      <div className="grid grid-cols-2 gap-4">
        <BaseInput
          label="Name"
          value={formData.name}
          onChange={(value) => handleFieldChange('name', value)}
          error={errors.name}
          placeholder="Full name"
          required
        />

        <SearchableDropdown
          label="Type"
          value={formData.type}
          onChange={(value) => handleFieldChange('type', value as RelationshipType)}
          options={RELATIONSHIP_TYPES}
          error={errors.type}
          required
        />
      </div>

      {/* Row 2: Relationship and Status */}
      <div className="grid grid-cols-2 gap-4">
        <SearchableDropdown
          label="Relationship"
          value={formData.relationship}
          onChange={(value) => handleFieldChange('relationship', value)}
          options={relationshipSuggestions.map(r => ({ value: r, label: r }))}
          error={errors.relationship}
          placeholder="Select or type relationship"
          allowCustom
        />

        <SearchableDropdown
          label="Status"
          value={formData.status}
          onChange={(value) => handleFieldChange('status', value as RelationshipStatus)}
          options={STATUS_OPTIONS}
          error={errors.status}
        />
      </div>

      {/* Row 3: Firm Name (Professional only) */}
      {formData.type === 'Professional' && (
        <BaseInput
          label="Firm Name"
          value={formData.firm_name}
          onChange={(value) => handleFieldChange('firm_name', value)}
          error={errors.firm_name}
          placeholder="Company or firm name"
          required
        />
      )}

      {/* Row 4: Date of Birth and Dependency */}
      <div className="grid grid-cols-2 gap-4">
        <BaseInput
          label="Date of Birth"
          type="date"
          value={formData.date_of_birth}
          onChange={(value) => handleFieldChange('date_of_birth', value)}
          error={errors.date_of_birth}
        />

        <div className="flex items-center pt-6">
          <input
            type="checkbox"
            id="dependency"
            checked={formData.dependency}
            onChange={(e) => handleFieldChange('dependency', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <label htmlFor="dependency" className="ml-2 text-sm text-gray-700">
            Dependent
          </label>
        </div>
      </div>

      {/* Row 5: Email and Phone */}
      <div className="grid grid-cols-2 gap-4">
        <BaseInput
          label="Email"
          type="email"
          value={formData.email}
          onChange={(value) => handleFieldChange('email', value)}
          error={errors.email}
          placeholder="email@example.com"
        />

        <BaseInput
          label="Phone Number"
          type="tel"
          value={formData.phone_number}
          onChange={(value) => handleFieldChange('phone_number', value)}
          error={errors.phone_number}
          placeholder="555-1234 or +1 (555) 123-4567"
        />
      </div>

      {/* Row 6: Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Additional notes or information"
        />
      </div>
    </div>
  );
};
```

**Checklist:**
- [ ] Remove first_name input
- [ ] Remove last_name input
- [ ] Add single name input
- [ ] Remove mobile input
- [ ] Remove home input
- [ ] Remove work input
- [ ] Add single phone_number input
- [ ] Replace isProfessional prop with type dropdown
- [ ] Add type dropdown component
- [ ] Add firm_name input (conditional rendering)
- [ ] Update relationship suggestions based on type
- [ ] Add auto-clear firm_name when switching to Personal
- [ ] Update field validation calls
- [ ] Update grid layout
- [ ] Add proper labels and placeholders
- [ ] Update TypeScript types
- [ ] Add JSDoc comment

**Testing:**
```typescript
// Test rendering
<RelationshipFormFields
  formData={{
    name: 'John Smith',
    type: 'Personal',
    relationship: 'Spouse',
    date_of_birth: '1980-01-01',
    email: 'john@example.com',
    phone_number: '555-1234',
    status: 'Active',
    dependency: false,
    notes: '',
    firm_name: ''
  }}
  onChange={(field, value) => console.log(field, value)}
  errors={{}}
/>

// Test Professional type shows firm_name
<RelationshipFormFields
  formData={{
    name: 'Jane Accountant',
    type: 'Professional',
    relationship: 'Accountant',
    firm_name: 'Accounting Inc.',
    ...
  }}
  onChange={...}
  errors={{}}
/>
```

---

#### File 9: `frontend/src/components/CreateSpecialRelationshipModal.tsx`

**Priority:** HIGH (User interaction)
**Estimated Time:** 45 minutes

**Changes Required:**

```typescript
import React, { useState } from 'react';
import { ModalShell } from './ModalShell';
import { RelationshipFormFields } from './RelationshipFormFields';
import { ActionButton } from './ui/buttons';
import { useCreateSpecialRelationship } from '../hooks/useSpecialRelationships';
import { useRelationshipValidation } from '../hooks/useRelationshipValidation';
import { RelationshipFormData } from '../types/specialRelationship';

interface CreateSpecialRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  productOwnerId: number;
  defaultType?: 'Personal' | 'Professional';
}

/**
 * Initial form state
 */
const INITIAL_FORM_DATA: RelationshipFormData = {
  name: '',
  type: 'Personal',
  relationship: '',
  date_of_birth: '',
  email: '',
  phone_number: '',
  status: 'Active',
  dependency: false,
  notes: '',
  firm_name: ''
};

/**
 * Modal for creating a new special relationship
 */
export const CreateSpecialRelationshipModal: React.FC<CreateSpecialRelationshipModalProps> = ({
  isOpen,
  onClose,
  productOwnerId,
  defaultType = 'Personal'
}) => {
  const [formData, setFormData] = useState<RelationshipFormData>({
    ...INITIAL_FORM_DATA,
    type: defaultType
  });

  const createMutation = useCreateSpecialRelationship();
  const { errors, validate, clearErrors } = useRelationshipValidation();

  /**
   * Handle field change
   */
  const handleFieldChange = (field: keyof RelationshipFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    // Validate form
    const isValid = validate(formData);
    if (!isValid) {
      return;
    }

    try {
      // Create payload
      const payload = {
        name: formData.name,
        type: formData.type,
        relationship: formData.relationship || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        email: formData.email || undefined,
        phone_number: formData.phone_number || undefined,
        status: formData.status,
        dependency: formData.dependency,
        notes: formData.notes || undefined,
        firm_name: formData.type === 'Professional' ? formData.firm_name : undefined,
        product_owner_id: productOwnerId
      };

      await createMutation.mutateAsync(payload);

      // Reset form and close
      setFormData({ ...INITIAL_FORM_DATA, type: defaultType });
      clearErrors();
      onClose();
    } catch (error) {
      console.error('Failed to create relationship:', error);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    setFormData({ ...INITIAL_FORM_DATA, type: defaultType });
    clearErrors();
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleCancel}
      title={`Add ${defaultType} Relationship`}
      size="large"
    >
      <div className="p-6">
        <RelationshipFormFields
          formData={formData}
          onChange={handleFieldChange}
          errors={errors}
        />

        {/* Error message */}
        {createMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              Failed to create relationship. Please try again.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            disabled={createMutation.isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <ActionButton
            onClick={handleSubmit}
            loading={createMutation.isLoading}
            disabled={createMutation.isLoading}
          >
            Create Relationship
          </ActionButton>
        </div>
      </div>
    </ModalShell>
  );
};
```

**Checklist:**
- [ ] Update initial form state to match new schema
- [ ] Remove first_name, last_name from form state
- [ ] Add name to form state
- [ ] Remove mobile, home, work from form state
- [ ] Add phone_number to form state
- [ ] Remove is_professional from form state
- [ ] Add type to form state
- [ ] Add firm_name to form state
- [ ] Update payload construction
- [ ] Add product_owner_id to payload
- [ ] Remove client_group_id from payload
- [ ] Handle firm_name conditionally (Professional only)
- [ ] Update form reset logic
- [ ] Update modal title to use type prop
- [ ] Update error handling

**Testing:**
```typescript
// Test Personal creation
<CreateSpecialRelationshipModal
  isOpen={true}
  onClose={() => {}}
  productOwnerId={1}
  defaultType="Personal"
/>

// Test Professional creation
<CreateSpecialRelationshipModal
  isOpen={true}
  onClose={() => {}}
  productOwnerId={1}
  defaultType="Professional"
/>

// Test validation
// 1. Try to submit with empty name - should show error
// 2. Try to submit Professional without firm_name - should show error
// 3. Submit valid data - should create and close
```

---

#### File 10: `frontend/src/components/EditSpecialRelationshipModal.tsx`

**Priority:** HIGH (User interaction)
**Estimated Time:** 45 minutes

**Changes Required:**

```typescript
import React, { useState, useEffect } from 'react';
import { ModalShell } from './ModalShell';
import { RelationshipFormFields } from './RelationshipFormFields';
import { ActionButton } from './ui/buttons';
import { useUpdateSpecialRelationship } from '../hooks/useSpecialRelationships';
import { useRelationshipValidation } from '../hooks/useRelationshipValidation';
import { SpecialRelationship, RelationshipFormData } from '../types/specialRelationship';

interface EditSpecialRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationship: SpecialRelationship | null;
}

/**
 * Convert SpecialRelationship to form data
 */
function toFormData(relationship: SpecialRelationship): RelationshipFormData {
  return {
    name: relationship.name,
    type: relationship.type,
    relationship: relationship.relationship || '',
    date_of_birth: relationship.date_of_birth || '',
    email: relationship.email || '',
    phone_number: relationship.phone_number || '',
    status: relationship.status,
    dependency: relationship.dependency,
    notes: relationship.notes || '',
    firm_name: relationship.firm_name || ''
  };
}

/**
 * Modal for editing an existing special relationship
 */
export const EditSpecialRelationshipModal: React.FC<EditSpecialRelationshipModalProps> = ({
  isOpen,
  onClose,
  relationship
}) => {
  const [formData, setFormData] = useState<RelationshipFormData | null>(null);

  const updateMutation = useUpdateSpecialRelationship();
  const { errors, validate, clearErrors } = useRelationshipValidation();

  // Initialize form data when relationship changes
  useEffect(() => {
    if (relationship) {
      setFormData(toFormData(relationship));
    } else {
      setFormData(null);
    }
  }, [relationship]);

  /**
   * Handle field change
   */
  const handleFieldChange = (field: keyof RelationshipFormData, value: any) => {
    setFormData(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!formData || !relationship) return;

    // Validate form
    const isValid = validate(formData);
    if (!isValid) {
      return;
    }

    try {
      // Build update payload (only include changed fields)
      const payload: any = {};

      if (formData.name !== relationship.name) {
        payload.name = formData.name;
      }
      if (formData.type !== relationship.type) {
        payload.type = formData.type;
      }
      if (formData.relationship !== (relationship.relationship || '')) {
        payload.relationship = formData.relationship || undefined;
      }
      if (formData.date_of_birth !== (relationship.date_of_birth || '')) {
        payload.date_of_birth = formData.date_of_birth || undefined;
      }
      if (formData.email !== (relationship.email || '')) {
        payload.email = formData.email || undefined;
      }
      if (formData.phone_number !== (relationship.phone_number || '')) {
        payload.phone_number = formData.phone_number || undefined;
      }
      if (formData.status !== relationship.status) {
        payload.status = formData.status;
      }
      if (formData.dependency !== relationship.dependency) {
        payload.dependency = formData.dependency;
      }
      if (formData.notes !== (relationship.notes || '')) {
        payload.notes = formData.notes || undefined;
      }
      if (formData.firm_name !== (relationship.firm_name || '')) {
        payload.firm_name = formData.type === 'Professional' ? formData.firm_name : undefined;
      }

      // Only update if there are changes
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      await updateMutation.mutateAsync({
        id: relationship.id,
        payload
      });

      clearErrors();
      onClose();
    } catch (error) {
      console.error('Failed to update relationship:', error);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    clearErrors();
    onClose();
  };

  if (!formData) {
    return null;
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleCancel}
      title="Edit Relationship"
      size="large"
    >
      <div className="p-6">
        <RelationshipFormFields
          formData={formData}
          onChange={handleFieldChange}
          errors={errors}
        />

        {/* Error message */}
        {updateMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              Failed to update relationship. Please try again.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            disabled={updateMutation.isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <ActionButton
            onClick={handleSubmit}
            loading={updateMutation.isLoading}
            disabled={updateMutation.isLoading}
          >
            Save Changes
          </ActionButton>
        </div>
      </div>
    </ModalShell>
  );
};
```

**Checklist:**
- [ ] Update toFormData conversion function
- [ ] Convert from first_name + last_name to name
- [ ] Convert from mobile/home/work to phone_number
- [ ] Convert from is_professional to type
- [ ] Add firm_name handling
- [ ] Update form state initialization
- [ ] Update change detection logic
- [ ] Handle firm_name conditionally in payload
- [ ] Remove deleted_at handling
- [ ] Update TypeScript types
- [ ] Add proper null checks

**Testing:**
```typescript
// Test editing Personal relationship
const personalRelationship: SpecialRelationship = {
  id: 1,
  name: 'John Smith',
  type: 'Personal',
  relationship: 'Spouse',
  phone_number: '555-1234',
  status: 'Active',
  dependency: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  product_owner_ids: [1]
};

<EditSpecialRelationshipModal
  isOpen={true}
  onClose={() => {}}
  relationship={personalRelationship}
/>

// Test editing Professional relationship
const professionalRelationship: SpecialRelationship = {
  id: 2,
  name: 'Jane Accountant',
  type: 'Professional',
  relationship: 'Accountant',
  firm_name: 'Accounting Inc.',
  phone_number: '555-5678',
  status: 'Active',
  dependency: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  product_owner_ids: [1]
};

<EditSpecialRelationshipModal
  isOpen={true}
  onClose={() => {}}
  relationship={professionalRelationship}
/>

// Test validation
// 1. Clear name field - should show error
// 2. Change to Professional without firm_name - should show error
// 3. Make valid changes - should save
```

---

#### File 11: `frontend/src/components/PersonalRelationshipsTable.tsx`

**Priority:** MEDIUM (Display component)
**Estimated Time:** 30 minutes

**Changes Required:**

Before (column definitions):
```typescript
const columns = [
  {
    header: 'First Name',
    accessor: 'first_name'
  },
  {
    header: 'Last Name',
    accessor: 'last_name'
  },
  {
    header: 'Mobile',
    accessor: 'mobile'
  },
  {
    header: 'Home',
    accessor: 'home'
  },
  // ...
];
```

After:
```typescript
import { DataTable } from './ui/tables/DataTable';
import { EditButton, DeleteButton } from './ui/buttons';
import { SpecialRelationship } from '../types/specialRelationship';

interface PersonalRelationshipsTableProps {
  relationships: SpecialRelationship[];
  onEdit: (relationship: SpecialRelationship) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

export const PersonalRelationshipsTable: React.FC<PersonalRelationshipsTableProps> = ({
  relationships,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      sortable: true
    },
    {
      header: 'Relationship',
      accessor: 'relationship',
      sortable: true
    },
    {
      header: 'Phone',
      accessor: 'phone_number',
      render: (row: SpecialRelationship) => row.phone_number || '-'
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (row: SpecialRelationship) => row.email || '-'
    },
    {
      header: 'Date of Birth',
      accessor: 'date_of_birth',
      render: (row: SpecialRelationship) =>
        row.date_of_birth ? new Date(row.date_of_birth).toLocaleDateString() : '-'
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (row: SpecialRelationship) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.status === 'Active' ? 'bg-green-100 text-green-800' :
          row.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      header: 'Dependent',
      accessor: 'dependency',
      render: (row: SpecialRelationship) => row.dependency ? 'Yes' : 'No'
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row: SpecialRelationship) => (
        <div className="flex space-x-2">
          <EditButton onClick={() => onEdit(row)} size="small" />
          <DeleteButton
            onClick={() => onDelete(row.id)}
            size="small"
            confirmMessage={`Are you sure you want to delete ${row.name}?`}
          />
        </div>
      )
    }
  ];

  return (
    <DataTable
      data={relationships}
      columns={columns}
      loading={isLoading}
      emptyMessage="No personal relationships found"
    />
  );
};
```

**Checklist:**
- [ ] Remove first_name column
- [ ] Remove last_name column
- [ ] Add name column
- [ ] Remove mobile column
- [ ] Remove home column
- [ ] Remove work column
- [ ] Add phone_number column
- [ ] Update column render functions
- [ ] Update TypeScript types
- [ ] Add proper null handling for optional fields
- [ ] Update confirm delete message to use name

**Testing:**
```typescript
// Test rendering with data
const relationships: SpecialRelationship[] = [
  {
    id: 1,
    name: 'John Smith',
    type: 'Personal',
    relationship: 'Spouse',
    phone_number: '555-1234',
    email: 'john@example.com',
    status: 'Active',
    dependency: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    product_owner_ids: [1]
  }
];

<PersonalRelationshipsTable
  relationships={relationships}
  onEdit={(r) => console.log('Edit', r)}
  onDelete={(id) => console.log('Delete', id)}
/>
```

---

#### File 12: `frontend/src/components/ProfessionalRelationshipsTable.tsx`

**Priority:** MEDIUM (Display component)
**Estimated Time:** 30 minutes

**Changes Required:**

```typescript
import { DataTable } from './ui/tables/DataTable';
import { EditButton, DeleteButton } from './ui/buttons';
import { SpecialRelationship, getFirmDisplay } from '../types/specialRelationship';

interface ProfessionalRelationshipsTableProps {
  relationships: SpecialRelationship[];
  onEdit: (relationship: SpecialRelationship) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

export const ProfessionalRelationshipsTable: React.FC<ProfessionalRelationshipsTableProps> = ({
  relationships,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      sortable: true
    },
    {
      header: 'Firm',
      accessor: 'firm_name',
      sortable: true,
      render: (row: SpecialRelationship) => row.firm_name || '-'
    },
    {
      header: 'Role',
      accessor: 'relationship',
      sortable: true,
      render: (row: SpecialRelationship) => row.relationship || '-'
    },
    {
      header: 'Phone',
      accessor: 'phone_number',
      render: (row: SpecialRelationship) => row.phone_number || '-'
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (row: SpecialRelationship) => row.email || '-'
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (row: SpecialRelationship) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.status === 'Active' ? 'bg-green-100 text-green-800' :
          row.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row: SpecialRelationship) => (
        <div className="flex space-x-2">
          <EditButton onClick={() => onEdit(row)} size="small" />
          <DeleteButton
            onClick={() => onDelete(row.id)}
            size="small"
            confirmMessage={`Are you sure you want to delete ${getFirmDisplay(row)}?`}
          />
        </div>
      )
    }
  ];

  return (
    <DataTable
      data={relationships}
      columns={columns}
      loading={isLoading}
      emptyMessage="No professional relationships found"
    />
  );
};
```

**Checklist:**
- [ ] Remove first_name column
- [ ] Remove last_name column
- [ ] Add name column
- [ ] Add firm_name column
- [ ] Remove mobile column
- [ ] Remove work column (professionals typically only have one phone)
- [ ] Add phone_number column
- [ ] Update column render functions
- [ ] Update TypeScript types
- [ ] Use getFirmDisplay helper in delete confirmation
- [ ] Add proper null handling for optional fields

**Testing:**
```typescript
// Test rendering with Professional relationships
const relationships: SpecialRelationship[] = [
  {
    id: 1,
    name: 'Jane Accountant',
    type: 'Professional',
    relationship: 'Accountant',
    firm_name: 'Accounting Inc.',
    phone_number: '555-5678',
    email: 'jane@accounting.com',
    status: 'Active',
    dependency: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    product_owner_ids: [1]
  }
];

<ProfessionalRelationshipsTable
  relationships={relationships}
  onEdit={(r) => console.log('Edit', r)}
  onDelete={(id) => console.log('Delete', id)}
/>
```

---

#### File 13: `frontend/src/components/SpecialRelationshipsSubTab.tsx`

**Priority:** HIGH (Container/orchestrator)
**Estimated Time:** 1 hour

**Changes Required:**

```typescript
import React, { useState, useMemo } from 'react';
import { AddButton } from './ui/buttons';
import { Tabs } from './ui/Tabs';
import { PersonalRelationshipsTable } from './PersonalRelationshipsTable';
import { ProfessionalRelationshipsTable } from './ProfessionalRelationshipsTable';
import { CreateSpecialRelationshipModal } from './CreateSpecialRelationshipModal';
import { EditSpecialRelationshipModal } from './EditSpecialRelationshipModal';
import {
  useSpecialRelationships,
  useDeleteSpecialRelationship
} from '../hooks/useSpecialRelationships';
import { SpecialRelationship } from '../types/specialRelationship';
import { ErrorDisplay } from './ui/feedback/ErrorDisplay';
import { Skeleton } from './ui/feedback/Skeleton';

interface SpecialRelationshipsSubTabProps {
  productOwnerId: number;
}

type TabType = 'personal' | 'professional';

/**
 * Sub-tab for managing special relationships
 * Displays Personal and Professional relationships in separate tabs
 */
export const SpecialRelationshipsSubTab: React.FC<SpecialRelationshipsSubTabProps> = ({
  productOwnerId
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<SpecialRelationship | null>(null);

  // Fetch relationships
  const {
    data: relationships = [],
    isLoading,
    isError,
    error
  } = useSpecialRelationships(productOwnerId);

  // Delete mutation
  const deleteMutation = useDeleteSpecialRelationship();

  // Filter relationships by type
  const personalRelationships = useMemo(() =>
    relationships.filter(r => r.type === 'Personal'),
    [relationships]
  );

  const professionalRelationships = useMemo(() =>
    relationships.filter(r => r.type === 'Professional'),
    [relationships]
  );

  /**
   * Handle opening create modal
   */
  const handleCreate = () => {
    setIsCreateModalOpen(true);
  };

  /**
   * Handle editing relationship
   */
  const handleEdit = (relationship: SpecialRelationship) => {
    setEditingRelationship(relationship);
  };

  /**
   * Handle deleting relationship
   */
  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  // Error state
  if (isError) {
    return (
      <ErrorDisplay
        message="Failed to load special relationships"
        error={error}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton count={5} height={50} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Special Relationships</h3>
        <AddButton onClick={handleCreate}>
          Add Relationship
        </AddButton>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: 'personal',
            label: 'Personal',
            count: personalRelationships.length
          },
          {
            id: 'professional',
            label: 'Professional',
            count: professionalRelationships.length
          }
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as TabType)}
      />

      {/* Tables */}
      {activeTab === 'personal' && (
        <PersonalRelationshipsTable
          relationships={personalRelationships}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={deleteMutation.isLoading}
        />
      )}

      {activeTab === 'professional' && (
        <ProfessionalRelationshipsTable
          relationships={professionalRelationships}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={deleteMutation.isLoading}
        />
      )}

      {/* Modals */}
      <CreateSpecialRelationshipModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        productOwnerId={productOwnerId}
        defaultType={activeTab === 'personal' ? 'Personal' : 'Professional'}
      />

      <EditSpecialRelationshipModal
        isOpen={!!editingRelationship}
        onClose={() => setEditingRelationship(null)}
        relationship={editingRelationship}
      />
    </div>
  );
};
```

**Checklist:**
- [ ] Update prop from `clientGroupId` to `productOwnerId`
- [ ] Update hook call to use `productOwnerId`
- [ ] Update filtering to use `type` field instead of `is_professional`
- [ ] Remove soft delete filtering logic
- [ ] Update create modal to pass `productOwnerId`
- [ ] Update create modal `defaultType` based on active tab
- [ ] Update tab counts
- [ ] Add proper loading states
- [ ] Add proper error handling
- [ ] Update TypeScript types

**Testing:**
```typescript
// Test rendering with product owner
<SpecialRelationshipsSubTab productOwnerId={1} />

// Test tab switching
// 1. Click Personal tab - should show Personal relationships
// 2. Click Professional tab - should show Professional relationships

// Test create flow
// 1. Click Add button while on Personal tab
// 2. Modal should open with type=Personal pre-selected

// Test edit flow
// 1. Click Edit on a relationship
// 2. Modal should open with relationship data

// Test delete flow
// 1. Click Delete on a relationship
// 2. Confirm deletion
// 3. Relationship should disappear from list
```

---

## 3. Breaking Changes

### API Changes

**Endpoint Changes:**
- ❌ **REMOVED**: `GET /api/special-relationships/client-group/{client_group_id}`
- ✅ **ADDED**: `GET /api/special-relationships/product-owner/{product_owner_id}`
- ❌ **REMOVED**: `PATCH /api/special-relationships/{id}/status`
- 🔄 **MODIFIED**: `DELETE /api/special-relationships/{id}` (soft → hard delete)

**Request/Response Schema Changes:**

| Field | Old | New | Impact |
|-------|-----|-----|--------|
| `first_name` | Required | ❌ Removed | **BREAKING** |
| `last_name` | Required | ❌ Removed | **BREAKING** |
| `name` | N/A | ✅ Required | **BREAKING** |
| `mobile` | Optional | ❌ Removed | **BREAKING** |
| `home` | Optional | ❌ Removed | **BREAKING** |
| `work` | Optional | ❌ Removed | **BREAKING** |
| `phone_number` | N/A | ✅ Optional | **BREAKING** |
| `is_professional` | Boolean | ❌ Removed | **BREAKING** |
| `type` | N/A | ✅ Required enum | **BREAKING** |
| `firm_name` | N/A | ✅ Optional | New feature |
| `client_group_id` | Required | ❌ Removed | **BREAKING** |
| `product_owner_id` | N/A | ✅ Required (POST) | **BREAKING** |
| `product_owner_ids` | N/A | ✅ Array (response) | New feature |
| `deleted_at` | Nullable | ❌ Removed | **BREAKING** |

### Frontend Impact

**Component Props:**
- `SpecialRelationshipsSubTab`: `clientGroupId` → `productOwnerId`
- `CreateSpecialRelationshipModal`: Add `productOwnerId` prop, remove `clientGroupId`
- `RelationshipFormFields`: Remove `isProfessional` prop, use `type` in formData

**Type Definitions:**
- `SpecialRelationship` interface completely rewritten
- `CreateSpecialRelationshipPayload` interface completely rewritten
- New `UpdateSpecialRelationshipPayload` interface
- New `RelationshipFormData` interface

**Hook Signatures:**
- `useSpecialRelationships(clientGroupId)` → `useSpecialRelationships(productOwnerId)`
- Query keys changed: `['specialRelationships', clientGroupId]` → `['specialRelationships', 'productOwner', productOwnerId]`

### Backend Impact

**Model Changes:**
- All Pydantic models rewritten
- Validation rules changed

**Database Queries:**
- All queries rewritten to use junction table
- Soft delete removed

---

## 4. Testing Strategy

### Phase 1: Backend Testing

**Unit Tests** (File 3):
```bash
cd backend
pytest tests/test_special_relationships_routes.py -v
```

Test Coverage:
- [ ] Create Personal relationship
- [ ] Create Professional relationship (with firm_name)
- [ ] Create Professional without firm_name (should fail)
- [ ] Fetch relationships by product_owner_id
- [ ] Update relationship fields
- [ ] Delete relationship (hard delete)
- [ ] Verify junction table cascade delete
- [ ] Test all validation rules

**Manual API Testing:**
```bash
# Start backend
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8001

# Test endpoints with curl or Postman
curl http://localhost:8001/api/special-relationships/product-owner/1
```

### Phase 2: Frontend Type Checking

**TypeScript Compilation:**
```bash
cd frontend
npm run build
```

Expected: No type errors

### Phase 3: Frontend Component Testing

**Unit Tests:**
```bash
cd frontend
npm test
```

Test Files to Update:
- `src/tests/hooks/useRelationshipValidation.test.ts`
- `src/tests/components/RelationshipFormFields.test.tsx`
- `src/tests/services/specialRelationshipsApi.test.ts`

### Phase 4: Integration Testing

**Manual Testing Checklist:**

**Create Personal Relationship:**
- [ ] Open SpecialRelationshipsSubTab
- [ ] Click "Add Relationship"
- [ ] Ensure type defaults to "Personal"
- [ ] Fill in: name, relationship, phone, email
- [ ] Submit
- [ ] Verify appears in Personal tab

**Create Professional Relationship:**
- [ ] Switch to Professional tab
- [ ] Click "Add Relationship"
- [ ] Ensure type defaults to "Professional"
- [ ] Fill in: name, firm_name, relationship, phone, email
- [ ] Submit
- [ ] Verify appears in Professional tab

**Validation Testing:**
- [ ] Try to submit with empty name → should show error
- [ ] Try to create Professional without firm_name → should show error
- [ ] Try invalid email format → should show error
- [ ] Try invalid phone format → should show error

**Edit Flow:**
- [ ] Click Edit on a Personal relationship
- [ ] Change name and phone
- [ ] Submit
- [ ] Verify changes appear

**Delete Flow:**
- [ ] Click Delete on a relationship
- [ ] Confirm deletion
- [ ] Verify removed from list
- [ ] Verify hard deleted from database

**Type Switching:**
- [ ] Edit a Personal relationship
- [ ] Change type to Professional
- [ ] Verify firm_name field appears and is required
- [ ] Save
- [ ] Verify appears in Professional tab

### Phase 5: Performance Testing

**Load Testing:**
- [ ] Create 50+ relationships
- [ ] Verify table renders correctly
- [ ] Verify filtering works
- [ ] Verify search/sort works

**Cache Testing:**
- [ ] Create relationship
- [ ] Verify appears immediately (optimistic update)
- [ ] Refresh page
- [ ] Verify data persists

---

## 5. Rollout Plan

### Prerequisites

- [ ] Database migration completed successfully
- [ ] Backup created before migration
- [ ] All team members notified of breaking changes

### Implementation Order

**Day 1: Backend Foundation**
1. ✅ Update Pydantic models (File 1) - 45 min
2. ✅ Update API routes (File 2) - 2-3 hours
3. ✅ Update backend tests (File 3) - 1-2 hours
4. ✅ Run test suite - verify 100% pass
5. ✅ Merge to feature branch

**Day 2: Frontend Foundation**
6. ✅ Update TypeScript types (File 4) - 30 min
7. ✅ Update API service (File 5) - 1 hour
8. ✅ Update React Query hooks (File 6) - 1 hour
9. ✅ Update validation hook (File 7) - 45 min
10. ✅ Run `npm run build` - verify no errors
11. ✅ Commit changes

**Day 3: Frontend Components**
12. ✅ Update RelationshipFormFields (File 8) - 1-1.5 hours
13. ✅ Update CreateSpecialRelationshipModal (File 9) - 45 min
14. ✅ Update EditSpecialRelationshipModal (File 10) - 45 min
15. ✅ Update PersonalRelationshipsTable (File 11) - 30 min
16. ✅ Update ProfessionalRelationshipsTable (File 12) - 30 min
17. ✅ Update SpecialRelationshipsSubTab (File 13) - 1 hour
18. ✅ Run `npm run build` - verify no errors
19. ✅ Commit changes

**Day 4: Integration Testing**
20. ✅ Start backend + frontend locally
21. ✅ Run through manual test checklist (Phase 4)
22. ✅ Fix any issues found
23. ✅ Run full test suite (backend + frontend)
24. ✅ Document any issues

**Day 5: Deployment**
25. ✅ Create PR with detailed description
26. ✅ Code review
27. ✅ Merge to main
28. ✅ Deploy to staging
29. ✅ QA testing on staging
30. ✅ Deploy to production
31. ✅ Monitor for errors
32. ✅ Update documentation

### Rollback Plan

If issues are discovered post-deployment:

**Option 1: Quick Fix**
- If issue is minor, deploy hotfix immediately

**Option 2: Database Rollback**
```sql
-- Restore from backup
-- Run reverse migration if needed
-- Revert code to previous version
```

**Option 3: Feature Flag**
- Add feature flag to hide special relationships temporarily
- Fix issues offline
- Re-enable when ready

---

## 6. Risks and Mitigations

### Risk 1: Data Loss During Migration

**Risk:** Database migration could fail or corrupt data

**Likelihood:** Low
**Impact:** Critical

**Mitigation:**
- ✅ Migration already completed successfully
- ✅ Database backup created
- ✅ Verified data integrity post-migration

### Risk 2: Frontend-Backend Mismatch

**Risk:** Frontend deployed before backend (or vice versa)

**Likelihood:** Medium
**Impact:** High (Breaking changes)

**Mitigation:**
- Deploy backend first (backwards compatible if possible)
- Add API versioning if needed
- Coordinate deployment timing
- Use feature flags to control feature availability

### Risk 3: Missing Junction Table Entries

**Risk:** Relationships created without junction table entries

**Likelihood:** Low (transaction ensures atomicity)
**Impact:** High (orphaned relationships)

**Mitigation:**
- Use database transaction in POST endpoint
- Add foreign key constraint
- Add validation to ensure product_owner_id exists
- Add database-level check constraint if needed

### Risk 4: Soft Delete Data Lost

**Risk:** Existing soft-deleted relationships permanently lost

**Likelihood:** Medium
**Impact:** Medium

**Mitigation:**
- Migration should have handled this
- Verify no deleted_at records before going live
- Consider adding "Archive" status instead of hard delete
- Document data retention policy

### Risk 5: Performance Issues with Junction Table

**Risk:** JOIN queries slower than direct foreign key

**Likelihood:** Low
**Impact:** Low

**Mitigation:**
- Add index on junction table
- Monitor query performance
- Add caching if needed
- Consider materialized view if necessary

### Risk 6: Incomplete Testing

**Risk:** Edge cases not covered in tests

**Likelihood:** Medium
**Impact:** Medium

**Mitigation:**
- Comprehensive test plan (see Testing Strategy)
- Manual testing checklist
- User acceptance testing
- Monitor production logs for errors
- Gradual rollout (staging → production)

### Risk 7: User Experience Disruption

**Risk:** Users confused by UI changes

**Likelihood:** Low
**Impact:** Low

**Mitigation:**
- UI changes are minimal (consolidated fields)
- Add tooltips/help text if needed
- Notify users of changes
- Provide training materials if necessary

---

## 7. Estimated Effort

### Time Breakdown

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1: Backend** | Files 1-3 | 3-4 hours |
| - Pydantic models | File 1 | 45 min |
| - API routes | File 2 | 2-3 hours |
| - Tests | File 3 | 1-2 hours |
| **Phase 2: Frontend Foundation** | Files 4-7 | 3-3.5 hours |
| - TypeScript types | File 4 | 30 min |
| - API service | File 5 | 1 hour |
| - React Query hooks | File 6 | 1 hour |
| - Validation hook | File 7 | 45 min |
| **Phase 3: Frontend Components** | Files 8-13 | 4-5 hours |
| - RelationshipFormFields | File 8 | 1-1.5 hours |
| - CreateModal | File 9 | 45 min |
| - EditModal | File 10 | 45 min |
| - PersonalTable | File 11 | 30 min |
| - ProfessionalTable | File 12 | 30 min |
| - Container | File 13 | 1 hour |
| **Phase 4: Integration Testing** | Manual testing | 2 hours |
| **Phase 5: Documentation** | Update docs | 1 hour |
| **TOTAL** | All phases | **13-15.5 hours** |

### Schedule

**Recommended Timeline: 5 days (with buffer)**

- **Day 1 (4 hours):** Backend refactoring
- **Day 2 (4 hours):** Frontend foundation
- **Day 3 (4 hours):** Frontend components
- **Day 4 (2 hours):** Integration testing
- **Day 5 (2 hours):** Deployment + monitoring

**Conservative Timeline: 7 days**
- Allows for unexpected issues
- More time for testing
- Phased rollout

---

## 8. Acceptance Criteria

### Definition of Done

**Code Quality:**
- [ ] All TypeScript compilation errors resolved
- [ ] All ESLint warnings addressed
- [ ] Code follows project conventions (CLAUDE.md)
- [ ] All functions < 50 lines
- [ ] All files < 500 lines

**Testing:**
- [ ] All backend tests pass (100%)
- [ ] All frontend tests pass
- [ ] Manual test checklist completed
- [ ] No console errors in browser
- [ ] No API errors in logs

**Functionality:**
- [ ] Can create Personal relationship
- [ ] Can create Professional relationship
- [ ] Can edit relationship
- [ ] Can delete relationship
- [ ] Can filter by type (Personal/Professional)
- [ ] Validation works correctly
- [ ] Form shows/hides firm_name based on type
- [ ] Data persists correctly
- [ ] Junction table entries created correctly

**User Experience:**
- [ ] No JavaScript errors on page load
- [ ] Forms are intuitive
- [ ] Error messages are clear
- [ ] Loading states work correctly
- [ ] Optimistic updates work smoothly

**Documentation:**
- [ ] API documentation updated
- [ ] Component documentation updated
- [ ] CHANGELOG.md updated
- [ ] Migration guide created
- [ ] This refactoring plan marked complete

**Deployment:**
- [ ] Deployed to staging successfully
- [ ] QA testing passed
- [ ] Deployed to production successfully
- [ ] No rollback needed
- [ ] Production logs show no errors

---

## 9. Next Steps

### Immediate Actions

1. **Review this plan** with team
2. **Schedule refactoring work** (5-7 day sprint)
3. **Assign tasks** to developers
4. **Set up feature branch** (`feature/special-relationships-refactor`)
5. **Create tracking tickets** in project management tool

### Post-Refactoring

1. **Monitor production** for 1 week
2. **Gather user feedback**
3. **Address any issues** quickly
4. **Update documentation** based on learnings
5. **Archive this refactoring plan**
6. **Celebrate** 🎉

---

## 10. Checklist Tracker

### Backend Progress
- [ ] File 1: Pydantic models updated
- [ ] File 2: API routes updated
- [ ] File 3: Tests updated
- [ ] Backend tests passing

### Frontend Progress
- [ ] File 4: TypeScript types updated
- [ ] File 5: API service updated
- [ ] File 6: React Query hooks updated
- [ ] File 7: Validation hook updated
- [ ] File 8: RelationshipFormFields updated
- [ ] File 9: CreateModal updated
- [ ] File 10: EditModal updated
- [ ] File 11: PersonalTable updated
- [ ] File 12: ProfessionalTable updated
- [ ] File 13: Container updated
- [ ] Frontend builds without errors

### Testing Progress
- [ ] Backend unit tests passed
- [ ] Frontend unit tests passed
- [ ] Manual testing completed
- [ ] Integration testing completed
- [ ] Performance testing completed

### Deployment Progress
- [ ] PR created
- [ ] Code review completed
- [ ] Deployed to staging
- [ ] QA testing passed
- [ ] Deployed to production
- [ ] Production monitoring (1 week)

---

## Appendix A: Quick Reference

### Key Field Mappings

| Old Fields | New Field | Notes |
|------------|-----------|-------|
| `first_name + last_name` | `name` | Single field, user enters full name |
| `mobile, home, work` | `phone_number` | Single field, any phone type |
| `is_professional` | `type` | Enum: 'Personal' or 'Professional' |
| N/A | `firm_name` | Required for Professional, empty for Personal |
| `client_group_id` | `product_owner_id` (via junction) | Indirect link, many-to-many |

### Important SQL

**Get relationships for product owner:**
```sql
SELECT sr.*, ARRAY_AGG(posr.product_owner_id) as product_owner_ids
FROM special_relationships sr
JOIN product_owner_special_relationships posr ON sr.id = posr.special_relationship_id
WHERE posr.product_owner_id = ?
GROUP BY sr.id;
```

**Create with junction:**
```sql
BEGIN;
INSERT INTO special_relationships (...) VALUES (...) RETURNING id;
INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
VALUES (?, ?);
COMMIT;
```

---

## Appendix B: Contact Information

**Questions or Issues?**
- Refer to `CLAUDE.md` for development guidelines
- Check `docs/` for architecture documentation
- Review git history for context on changes

**Emergency Rollback Contact:**
- Database admin: [Contact info]
- DevOps lead: [Contact info]

---

**Document Version:** 1.0
**Last Updated:** 2024-01-16
**Status:** Ready for Implementation
