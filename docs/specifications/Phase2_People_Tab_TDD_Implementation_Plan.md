# People Tab TDD Implementation Plan

## Document Overview

**Version**: 1.0
**Date**: 2025-12-04
**Methodology**: London School TDD (Outside-in, Behavior-driven)
**Total Duration**: 4-5 weeks (160-200 hours)
**Team**: 1 Backend Developer, 1 Frontend Developer, 1 QA Tester

**Based On**:
- Specification: `Phase2_People_Tab_Specification.md` (v3.0)
- Pseudocode: `Phase2_People_Tab_Pseudocode.md` (v1.0)
- Architecture: `Phase2_People_Tab_Architecture.md` (v1.0)

---

## Table of Contents

1. [Overview](#overview)
2. [TDD Methodology](#tdd-methodology)
3. [Week 1: Backend Foundation](#week-1-backend-foundation)
4. [Week 2: Backend API Completion](#week-2-backend-api-completion)
5. [Week 3: Frontend Core Components](#week-3-frontend-core-components)
6. [Week 4: Frontend Modals & Integration](#week-4-frontend-modals--integration)
7. [Week 5: Testing & Deployment](#week-5-testing--deployment)
8. [Verification Checklist](#verification-checklist)
9. [Risk Mitigation](#risk-mitigation)

---

## Overview

### Project Goals

Implement the People (Product Owners) Tab feature with:
- **Full CRUD operations** for product owners in client groups
- **Atomic transactions** preventing data integrity issues
- **Accessibility compliance** (WCAG 2.1 AA)
- **Test coverage** ≥70% with comprehensive test suites
- **Production-ready quality** with error handling, monitoring, and rollback procedures

### Key Deliverables

#### Backend
- ✅ Atomic endpoint: `POST /client-groups/{id}/product-owners`
- ✅ Idempotency key support for all mutations
- ✅ 3 Alembic database migrations
- ✅ Orphaned address cleanup job
- ✅ Comprehensive API test suite (≥70% coverage)

#### Frontend
- ✅ PeopleSubTab component with React Query integration
- ✅ ProductOwnerTable with semantic HTML and ARIA
- ✅ Create/Edit/Delete modals with HeadlessUI
- ✅ Error boundary wrappers for all modals
- ✅ Comprehensive component test suite (≥70% coverage)

#### Quality Assurance
- ✅ Unit tests for all components and services
- ✅ Integration tests for API endpoints
- ✅ E2E tests for complete user workflows
- ✅ Accessibility audit (Lighthouse score ≥95)
- ✅ Performance testing (load 100 concurrent users)

---

## TDD Methodology

### London School TDD (Outside-in, Behavior-driven)

We use the **London School** approach for this implementation:

1. **Outside-in**: Start with high-level user behavior tests, then implement lower-level units
2. **Mocking**: Use mocks/stubs for dependencies to isolate units under test
3. **Behavior focus**: Test what the code does (behavior), not how it does it (implementation)

### Three Phases

Every feature follows the **Red → Green → Refactor** cycle:

#### 🔴 Red Phase: Write Failing Tests First
- Define expected behavior through tests
- Tests fail because implementation doesn't exist yet
- Focus on interface/contract, not implementation details
- Write descriptive test names explaining the behavior

**Example**:
```python
# RED: Test fails - endpoint doesn't exist yet
def test_create_product_owner_atomically():
    """POST /client-groups/{id}/product-owners creates product owner and association in one transaction"""
    response = client.post(
        "/client-groups/123/product-owners",
        json={"firstname": "John", "surname": "Smith"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    assert response.json()["firstname"] == "John"
    # Verify association exists
    assert db.query(ClientGroupProductOwner).filter_by(product_owner_id=response.json()["id"]).count() == 1
```

#### 🟢 Green Phase: Make Tests Pass
- Implement minimum code to pass the test
- Focus on working code, not perfect code
- Hard-code values if needed (will refactor later)
- Implement only what's needed to pass current test

**Example**:
```python
# GREEN: Implement endpoint to pass test
@router.post("/client-groups/{client_group_id}/product-owners", status_code=201)
async def create_client_group_product_owner(
    client_group_id: int,
    product_owner: ProductOwnerCreate,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        db_product_owner = ProductOwner(**product_owner.dict())
        db.add(db_product_owner)
        await db.flush()

        association = ClientGroupProductOwner(
            client_group_id=client_group_id,
            product_owner_id=db_product_owner.id
        )
        db.add(association)
        await db.commit()

    return db_product_owner
```

#### 🔵 Refactor Phase: Improve Code Quality
- Clean up implementation without changing behavior
- Extract duplicated code into functions
- Improve naming and structure
- Ensure tests still pass after refactoring

**Example**:
```python
# REFACTOR: Extract reusable logic
async def create_product_owner_with_association(
    db: AsyncSession,
    client_group_id: int,
    product_owner_data: ProductOwnerCreate
) -> ProductOwner:
    """Create product owner and associate with client group atomically."""
    async with db.begin():
        db_product_owner = ProductOwner(**product_owner_data.dict())
        db.add(db_product_owner)
        await db.flush()

        association = ClientGroupProductOwner(
            client_group_id=client_group_id,
            product_owner_id=db_product_owner.id,
            display_order=await calculate_next_display_order(db, client_group_id)
        )
        db.add(association)
        await db.commit()

    return db_product_owner

@router.post("/client-groups/{client_group_id}/product-owners", status_code=201)
async def create_client_group_product_owner(
    client_group_id: int,
    product_owner: ProductOwnerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await authorize_access(db, current_user.id, client_group_id)
    return await create_product_owner_with_association(db, client_group_id, product_owner)
```

---

## Week 1: Backend Foundation

**Duration**: 5 days (40 hours)
**Focus**: Database migrations, atomic endpoint, idempotency foundation

### Day 1: Database Migrations (8 hours)

#### Phase 1.1: Migration 001 - Idempotency Keys Table

**🔴 Red Phase** (2 hours)
```python
# tests/test_migrations/test_001_idempotency_keys.py
def test_idempotency_keys_table_exists(db_session):
    """Migration 001 creates idempotency_keys table with correct schema"""
    result = db_session.execute("SELECT * FROM information_schema.tables WHERE table_name='idempotency_keys'")
    assert result.fetchone() is not None

def test_idempotency_keys_columns(db_session):
    """Idempotency keys table has required columns"""
    result = db_session.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='idempotency_keys'")
    columns = {row[0]: row[1] for row in result}
    assert 'key' in columns
    assert 'endpoint' in columns
    assert 'user_id' in columns
    assert 'request_hash' in columns
    assert 'response_status' in columns
    assert 'response_body' in columns
    assert 'created_at' in columns
    assert 'expires_at' in columns

def test_idempotency_keys_indexes(db_session):
    """Idempotency keys table has correct indexes"""
    result = db_session.execute("SELECT indexname FROM pg_indexes WHERE tablename='idempotency_keys'")
    indexes = [row[0] for row in result]
    assert 'idempotency_keys_pkey' in indexes
    assert 'idx_idempotency_expires_at' in indexes
```

**🟢 Green Phase** (4 hours)
- Create migration file: `backend/alembic/versions/001_create_idempotency_keys_table.py`
- Implement `upgrade()` and `downgrade()` functions
- Run migration: `alembic upgrade head`
- Verify tests pass: `pytest tests/test_migrations/test_001_idempotency_keys.py`

**🔵 Refactor Phase** (1 hour)
- Add comments explaining each column's purpose
- Verify migration can be rolled back: `alembic downgrade -1`
- Test upgrade again to ensure idempotency

**Deliverables**:
- ✅ `001_create_idempotency_keys_table.py` migration
- ✅ 3 passing migration tests
- ✅ Migration applied to development database

**Verification**:
```bash
alembic history  # Shows 001_idempotency_keys applied
psql $DATABASE_URL -c "\d idempotency_keys"  # Shows table schema
pytest tests/test_migrations/test_001_idempotency_keys.py -v  # All tests pass
```

---

#### Phase 1.2: Migration 002 - Product Owner Indexes

**🔴 Red Phase** (1 hour)
```python
# tests/test_migrations/test_002_product_owner_indexes.py
def test_product_owner_indexes_exist(db_session):
    """Migration 002 creates performance indexes on product_owners table"""
    result = db_session.execute("SELECT indexname FROM pg_indexes WHERE tablename='product_owners'")
    indexes = [row[0] for row in result]
    assert 'idx_product_owners_status' in indexes
    assert 'idx_product_owners_firstname' in indexes
    assert 'idx_product_owners_surname' in indexes
    assert 'idx_product_owners_email_1' in indexes
    assert 'idx_product_owners_dob' in indexes

def test_index_improves_query_performance(db_session):
    """Indexes improve query performance for common operations"""
    # Test status filter query uses index
    explain_result = db_session.execute("EXPLAIN SELECT * FROM product_owners WHERE status = 'active'")
    explain_text = str(explain_result.fetchall())
    assert 'Index Scan' in explain_text or 'Bitmap Index Scan' in explain_text
```

**🟢 Green Phase** (2 hours)
- Create migration file: `backend/alembic/versions/002_add_product_owner_indexes.py`
- Add indexes for: status, firstname, surname, email_1, dob, created_at
- Add composite index: (status, created_at)
- Run migration and verify tests pass

**🔵 Refactor Phase** (30 minutes)
- Add comments explaining which queries each index optimizes
- Verify rollback removes all indexes cleanly

**Deliverables**:
- ✅ `002_add_product_owner_indexes.py` migration
- ✅ 2 passing performance tests
- ✅ Query performance improved (verify with EXPLAIN)

---

#### Phase 1.3: Migration 003 - Composite Display Order Index

**🔴 Red Phase** (30 minutes)
```python
# tests/test_migrations/test_003_composite_display_order_index.py
def test_composite_display_order_index_exists(db_session):
    """Migration 003 creates composite index for display order queries"""
    result = db_session.execute("SELECT indexname FROM pg_indexes WHERE tablename='client_group_product_owners'")
    indexes = [row[0] for row in result]
    assert 'idx_cgpo_display_order' in indexes

def test_display_order_query_uses_index(db_session):
    """Display order sorting query uses composite index"""
    explain_result = db_session.execute(
        "EXPLAIN SELECT * FROM client_group_product_owners WHERE client_group_id = 1 ORDER BY display_order"
    )
    explain_text = str(explain_result.fetchall())
    assert 'Index Scan' in explain_text
```

**🟢 Green Phase** (1.5 hours)
- Create migration file: `003_add_composite_display_order_index.py`
- Add composite index: (client_group_id, display_order)
- Verify tests pass

**🔵 Refactor Phase** (30 minutes)
- Document index purpose in migration comments
- Test rollback and re-apply

**Deliverables**:
- ✅ `003_add_composite_display_order_index.py` migration
- ✅ 2 passing index tests
- ✅ All 3 migrations applied successfully

---

### Day 2: Atomic Endpoint - Core Logic (8 hours)

#### Phase 2.1: Atomic Create Product Owner Endpoint

**🔴 Red Phase** (3 hours)
```python
# tests/test_api/test_product_owner_atomic_create.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_product_owner_atomically_success(client: AsyncClient, db_session, auth_token):
    """POST /client-groups/{id}/product-owners creates product owner and association in single transaction"""
    response = await client.post(
        "/client-groups/123/product-owners",
        json={
            "firstname": "John",
            "surname": "Smith",
            "email_1": "john.smith@example.com",
            "dob": "1980-01-15"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["firstname"] == "John"
    assert data["surname"] == "Smith"
    assert data["id"] is not None

    # Verify product owner exists in database
    product_owner = await db_session.get(ProductOwner, data["id"])
    assert product_owner is not None

    # Verify association exists
    association = await db_session.execute(
        select(ClientGroupProductOwner).where(
            ClientGroupProductOwner.product_owner_id == data["id"],
            ClientGroupProductOwner.client_group_id == 123
        )
    )
    assert association.scalar_one_or_none() is not None

@pytest.mark.asyncio
async def test_create_product_owner_atomically_rollback_on_error(client: AsyncClient, db_session, auth_token):
    """If association creation fails, product owner creation is rolled back (no orphaned record)"""
    # Mock association creation to fail
    with patch('app.models.ClientGroupProductOwner.__init__', side_effect=Exception("Database error")):
        response = await client.post(
            "/client-groups/123/product-owners",
            json={"firstname": "Jane", "surname": "Doe"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 500

        # Verify NO orphaned product owner exists
        result = await db_session.execute(select(ProductOwner).where(ProductOwner.firstname == "Jane"))
        assert result.scalar_one_or_none() is None

@pytest.mark.asyncio
async def test_create_product_owner_atomically_validation_error(client: AsyncClient, auth_token):
    """Invalid data returns 400 with validation errors"""
    response = await client.post(
        "/client-groups/123/product-owners",
        json={"firstname": "John"},  # Missing required 'surname'
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 400
    assert "surname" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_create_product_owner_atomically_unauthorized(client: AsyncClient):
    """Unauthorized request returns 401"""
    response = await client.post(
        "/client-groups/123/product-owners",
        json={"firstname": "John", "surname": "Smith"}
    )

    assert response.status_code == 401

@pytest.mark.asyncio
async def test_create_product_owner_atomically_forbidden(client: AsyncClient, db_session, other_user_token):
    """User without access to client group returns 403"""
    response = await client.post(
        "/client-groups/999/product-owners",  # User doesn't have access
        json={"firstname": "John", "surname": "Smith"},
        headers={"Authorization": f"Bearer {other_user_token}"}
    )

    assert response.status_code == 403

@pytest.mark.asyncio
async def test_create_product_owner_with_address_fields(client: AsyncClient, db_session, auth_token):
    """Creating product owner with address fields creates address record"""
    response = await client.post(
        "/client-groups/123/product-owners",
        json={
            "firstname": "Alice",
            "surname": "Johnson",
            "address_line_1": "123 Main St",
            "address_line_5": "SW1A 1AA"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["address_id"] is not None

    # Verify address record created
    address = await db_session.get(Address, data["address_id"])
    assert address.address_line_1 == "123 Main St"
    assert address.address_line_5 == "SW1A 1AA"

@pytest.mark.asyncio
async def test_create_product_owner_display_order_calculated(client: AsyncClient, db_session, auth_token):
    """Display order is automatically calculated as max + 1"""
    # Create first product owner
    response1 = await client.post(
        "/client-groups/123/product-owners",
        json={"firstname": "First", "surname": "Person"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    # Create second product owner
    response2 = await client.post(
        "/client-groups/123/product-owners",
        json={"firstname": "Second", "surname": "Person"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    # Verify display orders
    association1 = await db_session.execute(
        select(ClientGroupProductOwner).where(
            ClientGroupProductOwner.product_owner_id == response1.json()["id"]
        )
    )
    association2 = await db_session.execute(
        select(ClientGroupProductOwner).where(
            ClientGroupProductOwner.product_owner_id == response2.json()["id"]
        )
    )

    order1 = association1.scalar_one().display_order
    order2 = association2.scalar_one().display_order
    assert order2 == order1 + 1
```

**🟢 Green Phase** (4 hours)
```python
# backend/app/api/routes/client_groups.py
@router.post("/client-groups/{client_group_id}/product-owners", status_code=201)
async def create_client_group_product_owner(
    client_group_id: int,
    product_owner: ProductOwnerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atomic endpoint: Create product owner and associate with client group.
    Both operations happen in a single database transaction.
    """
    # Authorization check
    if not await user_has_access_to_client_group(db, current_user.id, client_group_id):
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        async with db.begin():
            # Step 1: Create address if needed
            address_id = None
            if any([product_owner.address_line_1, product_owner.address_line_2,
                    product_owner.address_line_3, product_owner.address_line_4,
                    product_owner.address_line_5]):
                address = Address(
                    address_line_1=product_owner.address_line_1,
                    address_line_2=product_owner.address_line_2,
                    address_line_3=product_owner.address_line_3,
                    address_line_4=product_owner.address_line_4,
                    address_line_5=product_owner.address_line_5
                )
                db.add(address)
                await db.flush()
                address_id = address.id

            # Step 2: Create product owner
            db_product_owner = ProductOwner(
                **product_owner.dict(exclude={'address_line_1', 'address_line_2',
                                              'address_line_3', 'address_line_4',
                                              'address_line_5'}),
                address_id=address_id
            )
            db.add(db_product_owner)
            await db.flush()

            # Step 3: Calculate display order
            result = await db.execute(
                select(func.max(ClientGroupProductOwner.display_order))
                .where(ClientGroupProductOwner.client_group_id == client_group_id)
            )
            max_order = result.scalar() or 0

            # Step 4: Create association
            association = ClientGroupProductOwner(
                client_group_id=client_group_id,
                product_owner_id=db_product_owner.id,
                display_order=max_order + 1
            )
            db.add(association)

            # Commit transaction (all or nothing)
            await db.commit()

        await db.refresh(db_product_owner)
        return db_product_owner

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
```

**🔵 Refactor Phase** (1 hour)
- Extract address creation logic into helper function
- Extract display order calculation into helper function
- Add comprehensive error handling
- Add docstrings to all functions

**Deliverables**:
- ✅ Atomic create endpoint implemented
- ✅ 8 passing integration tests
- ✅ Transaction rollback verified
- ✅ Authorization checks working

**Verification**:
```bash
pytest tests/test_api/test_product_owner_atomic_create.py -v  # All 8 tests pass
pytest tests/test_api/test_product_owner_atomic_create.py --cov=app.api.routes.client_groups  # Coverage ≥70%
```

---

### Day 3: Idempotency Middleware (8 hours)

#### Phase 3.1: Idempotency Key Storage and Retrieval

**🔴 Red Phase** (2 hours)
```python
# tests/test_middleware/test_idempotency.py
import pytest
from app.middleware.idempotency import check_idempotency, store_idempotency

@pytest.mark.asyncio
async def test_check_idempotency_no_header_returns_none(mock_request, db_session):
    """Request without Idempotency-Key header returns None"""
    result = await check_idempotency(mock_request, db_session, mock_user)
    assert result is None

@pytest.mark.asyncio
async def test_check_idempotency_new_key_returns_none(mock_request_with_key, db_session):
    """Request with new Idempotency-Key (not in DB) returns None"""
    result = await check_idempotency(mock_request_with_key, db_session, mock_user)
    assert result is None

@pytest.mark.asyncio
async def test_check_idempotency_existing_key_returns_cached_response(mock_request_with_key, db_session):
    """Request with existing Idempotency-Key returns cached response"""
    # Store idempotency key first
    await store_idempotency(
        idempotency_key="test-key-123",
        endpoint="/product-owners",
        user_id=1,
        request_hash="abc123",
        response=Response(content='{"id": 789}', status_code=201),
        db=db_session
    )

    # Check should return cached response
    result = await check_idempotency(mock_request_with_key, db_session, mock_user)
    assert result is not None
    assert result.status_code == 201
    assert '789' in result.body.decode()

@pytest.mark.asyncio
async def test_check_idempotency_key_reuse_with_different_body_raises_422(mock_request_with_key, db_session):
    """Reusing idempotency key with different request body raises 422 error"""
    # Store idempotency key with body hash "abc123"
    await store_idempotency(
        idempotency_key="test-key-123",
        endpoint="/product-owners",
        user_id=1,
        request_hash="abc123",
        response=Response(content='{"id": 789}', status_code=201),
        db=db_session
    )

    # Try to reuse key with different body hash
    mock_request_with_key.body_hash = "def456"  # Different body

    with pytest.raises(HTTPException) as exc_info:
        await check_idempotency(mock_request_with_key, db_session, mock_user)

    assert exc_info.value.status_code == 422
    assert "Idempotency key reused with different request body" in str(exc_info.value.detail)

@pytest.mark.asyncio
async def test_store_idempotency_saves_to_database(db_session):
    """store_idempotency saves idempotency key with 24-hour expiration"""
    await store_idempotency(
        idempotency_key="test-key-456",
        endpoint="/product-owners",
        user_id=1,
        request_hash="abc123",
        response=Response(content='{"id": 999}', status_code=201),
        db=db_session
    )

    # Verify saved to database
    result = await db_session.get(IdempotencyKey, "test-key-456")
    assert result is not None
    assert result.endpoint == "/product-owners"
    assert result.response_status == 201
    assert '"id": 999' in result.response_body
    assert result.expires_at > datetime.utcnow()

@pytest.mark.asyncio
async def test_idempotency_cleanup_job_deletes_expired_keys(db_session):
    """Cleanup job deletes idempotency keys older than expires_at"""
    # Create expired key
    expired_key = IdempotencyKey(
        key="expired-key",
        endpoint="/product-owners",
        user_id=1,
        request_hash="abc",
        response_status=201,
        response_body="{}",
        created_at=datetime.utcnow() - timedelta(days=2),
        expires_at=datetime.utcnow() - timedelta(days=1)
    )
    db_session.add(expired_key)
    await db_session.commit()

    # Run cleanup job
    from app.jobs.cleanup_idempotency_keys import cleanup_expired_idempotency_keys
    await cleanup_expired_idempotency_keys(db_session)

    # Verify expired key deleted
    result = await db_session.get(IdempotencyKey, "expired-key")
    assert result is None
```

**🟢 Green Phase** (4 hours)
```python
# backend/app/middleware/idempotency.py
import hashlib
from datetime import datetime, timedelta
from fastapi import Request, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.idempotency import IdempotencyKey

async def check_idempotency(
    request: Request,
    db: AsyncSession,
    current_user
) -> Response | None:
    """
    Check if this request has been processed before.
    Returns cached response if idempotency key exists.
    """
    idempotency_key = request.headers.get('Idempotency-Key')
    if not idempotency_key:
        return None

    # Hash request body for verification
    body = await request.body()
    request_hash = hashlib.sha256(body).hexdigest()

    # Check if key exists
    existing = await db.get(IdempotencyKey, idempotency_key)

    if existing:
        # Verify request matches (prevent key reuse with different payload)
        if existing.request_hash != request_hash:
            raise HTTPException(
                status_code=422,
                detail="Idempotency key reused with different request body"
            )

        # Return cached response
        return Response(
            content=existing.response_body,
            status_code=existing.response_status,
            media_type="application/json"
        )

    return None

async def store_idempotency(
    idempotency_key: str,
    endpoint: str,
    user_id: int,
    request_hash: str,
    response: Response,
    db: AsyncSession
):
    """Store successful response for future duplicate requests."""
    expires_at = datetime.utcnow() + timedelta(hours=24)

    key_record = IdempotencyKey(
        key=idempotency_key,
        endpoint=endpoint,
        user_id=user_id,
        request_hash=request_hash,
        response_status=response.status_code,
        response_body=response.body.decode('utf-8'),
        created_at=datetime.utcnow(),
        expires_at=expires_at
    )
    db.add(key_record)
    await db.commit()


# backend/app/jobs/cleanup_idempotency_keys.py
async def cleanup_expired_idempotency_keys(db: AsyncSession):
    """Delete idempotency keys older than 24 hours."""
    await db.execute(
        "DELETE FROM idempotency_keys WHERE expires_at < NOW()"
    )
    await db.commit()
```

**🔵 Refactor Phase** (2 hours)
- Add comprehensive error handling for database failures
- Add logging for debugging
- Extract constants (24-hour expiration)
- Add type hints to all functions

**Deliverables**:
- ✅ Idempotency middleware implemented
- ✅ 7 passing middleware tests
- ✅ Cleanup job implemented and tested
- ✅ Integration with atomic endpoint

**Verification**:
```bash
pytest tests/test_middleware/test_idempotency.py -v  # All 7 tests pass
python backend/app/jobs/cleanup_idempotency_keys.py  # Manual test of cleanup job
```

---

### Day 4: Orphaned Address Cleanup Job (8 hours)

#### Phase 4.1: Orphaned Address Detection and Cleanup

**🔴 Red Phase** (2 hours)
```python
# tests/test_jobs/test_orphaned_address_cleanup.py
import pytest
from app.jobs.cleanup_orphaned_addresses import find_orphaned_addresses, delete_orphaned_addresses

@pytest.mark.asyncio
async def test_find_orphaned_addresses_returns_unreferenced_addresses(db_session):
    """find_orphaned_addresses returns addresses not referenced by any product owner"""
    # Create orphaned address
    orphaned_address = Address(address_line_1="123 Orphan St")
    db_session.add(orphaned_address)

    # Create referenced address
    referenced_address = Address(address_line_1="456 Used St")
    product_owner = ProductOwner(
        firstname="John",
        surname="Smith",
        address_id=referenced_address.id
    )
    db_session.add(referenced_address)
    db_session.add(product_owner)
    await db_session.commit()

    # Find orphaned addresses
    orphaned = await find_orphaned_addresses(db_session)

    assert orphaned_address.id in orphaned
    assert referenced_address.id not in orphaned

@pytest.mark.asyncio
async def test_delete_orphaned_addresses_removes_orphaned_records(db_session):
    """delete_orphaned_addresses removes addresses not referenced by any product owner"""
    # Create 2 orphaned addresses
    orphaned1 = Address(address_line_1="111 Orphan")
    orphaned2 = Address(address_line_1="222 Orphan")
    db_session.add_all([orphaned1, orphaned2])
    await db_session.commit()

    orphaned_ids = [orphaned1.id, orphaned2.id]

    # Delete orphaned addresses
    deleted_count = await delete_orphaned_addresses(db_session, orphaned_ids)

    assert deleted_count == 2

    # Verify deleted from database
    result1 = await db_session.get(Address, orphaned1.id)
    result2 = await db_session.get(Address, orphaned2.id)
    assert result1 is None
    assert result2 is None

@pytest.mark.asyncio
async def test_cleanup_job_logs_deleted_addresses(db_session, caplog):
    """Cleanup job logs information about deleted addresses"""
    orphaned = Address(address_line_1="333 Orphan")
    db_session.add(orphaned)
    await db_session.commit()

    from app.jobs.cleanup_orphaned_addresses import run_cleanup_job
    await run_cleanup_job(db_session)

    assert "Deleted 1 orphaned address" in caplog.text

@pytest.mark.asyncio
async def test_cleanup_job_does_not_delete_referenced_addresses(db_session):
    """Cleanup job never deletes addresses still referenced by product owners"""
    # Create referenced address
    address = Address(address_line_1="789 Safe St")
    product_owner = ProductOwner(
        firstname="Jane",
        surname="Doe",
        address_id=address.id
    )
    db_session.add_all([address, product_owner])
    await db_session.commit()

    address_id = address.id

    from app.jobs.cleanup_orphaned_addresses import run_cleanup_job
    await run_cleanup_job(db_session)

    # Verify address still exists
    result = await db_session.get(Address, address_id)
    assert result is not None
```

**🟢 Green Phase** (4 hours)
```python
# backend/app/jobs/cleanup_orphaned_addresses.py
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Address, ProductOwner

logger = logging.getLogger(__name__)

async def find_orphaned_addresses(db: AsyncSession) -> list[int]:
    """
    Find addresses not referenced by any product owner.
    Returns list of orphaned address IDs.
    """
    # Query for addresses with no product owner references
    query = """
        SELECT a.id
        FROM addresses a
        LEFT JOIN product_owners po ON a.id = po.address_id
        WHERE po.id IS NULL
    """
    result = await db.execute(query)
    orphaned_ids = [row[0] for row in result.fetchall()]
    return orphaned_ids

async def delete_orphaned_addresses(db: AsyncSession, address_ids: list[int]) -> int:
    """
    Delete addresses with given IDs.
    Returns count of deleted addresses.
    """
    if not address_ids:
        return 0

    result = await db.execute(
        "DELETE FROM addresses WHERE id = ANY(:ids)",
        {"ids": address_ids}
    )
    await db.commit()

    return result.rowcount

async def run_cleanup_job(db: AsyncSession):
    """
    Main cleanup job: Find and delete orphaned addresses.
    """
    logger.info("Starting orphaned address cleanup job")

    try:
        # Find orphaned addresses
        orphaned_ids = await find_orphaned_addresses(db)

        if not orphaned_ids:
            logger.info("No orphaned addresses found")
            return

        logger.info(f"Found {len(orphaned_ids)} orphaned addresses")

        # Delete orphaned addresses
        deleted_count = await delete_orphaned_addresses(db, orphaned_ids)

        logger.info(f"Deleted {deleted_count} orphaned address(es): {orphaned_ids}")

    except Exception as e:
        logger.error(f"Error during orphaned address cleanup: {e}")
        raise


# Entry point for cron job
if __name__ == "__main__":
    import asyncio
    from app.db.database import get_db

    async def main():
        async for db in get_db():
            await run_cleanup_job(db)

    asyncio.run(main())
```

**🔵 Refactor Phase** (2 hours)
- Add error handling for database connection failures
- Add comprehensive logging
- Add dry-run mode for testing
- Create cron job script for deployment

**Deliverables**:
- ✅ Orphaned address cleanup job implemented
- ✅ 4 passing cleanup tests
- ✅ Cron job script created
- ✅ Logging configured

**Verification**:
```bash
pytest tests/test_jobs/test_orphaned_address_cleanup.py -v  # All 4 tests pass
python backend/app/jobs/cleanup_orphaned_addresses.py  # Manual test run
```

---

### Day 5: Backend Testing & Documentation (8 hours)

#### Phase 5.1: Comprehensive Backend Test Suite

**🔴 Red Phase** (1 hour)
```python
# tests/test_api/test_product_owner_crud_complete.py
# Additional edge case tests for update and delete endpoints

@pytest.mark.asyncio
async def test_update_product_owner_address_creates_new_address_record(client, db_session, auth_token):
    """Updating address fields creates new address record (doesn't modify shared address)"""
    # Create product owner with address
    response = await client.post(
        "/client-groups/123/product-owners",
        json={
            "firstname": "Bob",
            "surname": "Wilson",
            "address_line_1": "100 Original St"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    product_owner_id = response.json()["id"]
    original_address_id = response.json()["address_id"]

    # Update address
    response = await client.put(
        f"/product-owners/{product_owner_id}",
        json={
            "address_line_1": "200 New St",
            "_address_strategy": "create_new"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 200
    new_address_id = response.json()["address_id"]

    # Verify new address created
    assert new_address_id != original_address_id

    # Verify old address still exists (not modified)
    old_address = await db_session.get(Address, original_address_id)
    assert old_address.address_line_1 == "100 Original St"

    # Verify new address has updated data
    new_address = await db_session.get(Address, new_address_id)
    assert new_address.address_line_1 == "200 New St"

@pytest.mark.asyncio
async def test_delete_product_owner_validates_inactive_status(client, db_session, auth_token):
    """Deleting active product owner returns 400 error"""
    # Create active product owner
    response = await client.post(
        "/client-groups/123/product-owners",
        json={"firstname": "Active", "surname": "Person", "status": "active"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    product_owner_id = response.json()["id"]

    # Try to delete active product owner
    response = await client.delete(
        f"/product-owners/{product_owner_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 400
    assert "Cannot delete active product owner" in response.json()["detail"]

@pytest.mark.asyncio
async def test_delete_product_owner_with_dependencies_returns_409(client, db_session, auth_token):
    """Deleting product owner with associated products returns 409 conflict"""
    # Create product owner with products/holdings
    # ... (setup code)

    response = await client.delete(
        f"/product-owners/{product_owner_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 409
    assert "associated products" in response.json()["detail"].lower()
```

**🟢 Green Phase** (3 hours)
- Implement tests for all edge cases
- Verify update endpoint with address strategy
- Verify delete endpoint validation
- Add tests for idempotency with create/update/delete

**🔵 Refactor Phase** (1 hour)
- Extract common test fixtures
- Create test data factories
- Add docstrings to all tests

**Deliverables**:
- ✅ 15+ comprehensive API tests
- ✅ All edge cases covered
- ✅ Test coverage ≥75% for backend

#### Phase 5.2: Backend Documentation

**Tasks** (3 hours)
- Document all API endpoints with examples
- Create README for running backend tests
- Document deployment procedures
- Create troubleshooting guide

**Deliverables**:
- ✅ `backend/README.md` with API documentation
- ✅ `backend/TESTING.md` with test instructions
- ✅ `backend/DEPLOYMENT.md` with deployment steps

---

## Week 2: Backend API Completion

**Duration**: 5 days (40 hours)
**Focus**: Additional CRUD endpoints, error handling, performance optimization

### Day 6-7: Update & Delete Endpoints (16 hours)

#### Phase 6.1: Update Product Owner Endpoint

**🔴 Red Phase** (3 hours)
- Write tests for PUT /product-owners/{id}
- Test address update with "create_new" strategy
- Test partial updates (only changed fields)
- Test validation errors

**🟢 Green Phase** (5 hours)
- Implement update endpoint
- Implement address strategy logic
- Add authorization checks
- Integrate idempotency middleware

**🔵 Refactor Phase** (2 hours)
- Extract address handling into service layer
- Add comprehensive error handling
- Optimize query performance

#### Phase 6.2: Delete Product Owner Endpoint

**🔴 Red Phase** (2 hours)
- Write tests for DELETE /product-owners/{id}
- Test validation (inactive only)
- Test cascade delete of association records
- Test dependency checking

**🟢 Green Phase** (3 hours)
- Implement delete endpoint
- Add status validation
- Add dependency checking
- Integrate idempotency middleware

**🔵 Refactor Phase** (1 hour)
- Add logging for audit trail
- Optimize cascade delete performance

**Deliverables**:
- ✅ Update endpoint fully tested (8 tests)
- ✅ Delete endpoint fully tested (6 tests)
- ✅ Idempotency integrated
- ✅ Address strategy working

---

### Day 8-9: Backend Performance & Security (16 hours)

#### Phase 8.1: Performance Optimization

**Tasks**:
- Query optimization (EXPLAIN ANALYZE)
- Connection pool configuration
- Caching strategy implementation
- Load testing (100 concurrent users)

**Deliverables**:
- ✅ API response times <500ms (GET)
- ✅ API response times <1s (POST/PUT/DELETE)
- ✅ Load test report showing stable performance
- ✅ Slow query logging configured

#### Phase 8.2: Security Hardening

**Tasks**:
- SQL injection prevention testing
- XSS protection verification
- CSRF token validation
- Rate limiting implementation

**Deliverables**:
- ✅ Security audit passed
- ✅ Penetration testing completed
- ✅ Rate limiting configured (100 req/min per user)

---

### Day 10: Backend Integration Testing (8 hours)

#### Phase 10.1: End-to-End Backend Tests

**🔴 Red Phase** (3 hours)
```python
# tests/test_integration/test_product_owner_lifecycle.py
@pytest.mark.asyncio
async def test_complete_product_owner_lifecycle(client, db_session, auth_token):
    """
    End-to-end test: Create → Read → Update → Delete product owner
    """
    # CREATE
    create_response = await client.post(
        "/client-groups/123/product-owners",
        json={
            "firstname": "Lifecycle",
            "surname": "Test",
            "email_1": "lifecycle@example.com",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert create_response.status_code == 201
    product_owner_id = create_response.json()["id"]

    # READ
    read_response = await client.get(
        f"/client-groups/123/product-owners",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert read_response.status_code == 200
    product_owners = read_response.json()
    assert any(po["id"] == product_owner_id for po in product_owners)

    # UPDATE
    update_response = await client.put(
        f"/product-owners/{product_owner_id}",
        json={"email_1": "updated@example.com"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert update_response.status_code == 200
    assert update_response.json()["email_1"] == "updated@example.com"

    # STATUS TRANSITION (mark as lapsed)
    lapse_response = await client.put(
        f"/product-owners/{product_owner_id}",
        json={"status": "lapsed"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert lapse_response.status_code == 200
    assert lapse_response.json()["status"] == "lapsed"

    # DELETE
    delete_response = await client.delete(
        f"/product-owners/{product_owner_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert delete_response.status_code == 204

    # VERIFY DELETED
    verify_response = await client.get(
        f"/client-groups/123/product-owners",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    product_owners = verify_response.json()
    assert not any(po["id"] == product_owner_id for po in product_owners)
```

**🟢 Green Phase** (4 hours)
- Implement integration tests for complete workflows
- Test error recovery scenarios
- Test concurrent user scenarios

**🔵 Refactor Phase** (1 hour)
- Extract common workflow patterns
- Add test data generators

**Deliverables**:
- ✅ 5 end-to-end integration tests
- ✅ All workflows tested
- ✅ Backend test coverage ≥75%

---

## Week 3: Frontend Core Components

**Duration**: 5 days (40 hours)
**Focus**: PeopleSubTab, ProductOwnerTable, React Query integration

### Day 11-12: PeopleSubTab Container Component (16 hours)

#### Phase 11.1: PeopleSubTab with React Query

**🔴 Red Phase** (4 hours)
```typescript
// tests/components/PeopleSubTab.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PeopleSubTab from '@/pages/ClientGroupSuite/tabs/components/PeopleSubTab';

describe('PeopleSubTab', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('fetches and displays product owners on mount', async () => {
    // Mock API response
    const mockProductOwners = [
      { id: 1, firstname: 'John', surname: 'Smith', status: 'active', email_1: 'john@example.com', dob: '1980-01-15' },
      { id: 2, firstname: 'Jane', surname: 'Doe', status: 'lapsed', email_1: 'jane@example.com', dob: '1975-05-20' }
    ];

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => mockProductOwners,
      ok: true
    });

    render(<PeopleSubTab clientGroupId={123} />, { wrapper });

    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Should display product owners after loading
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('API Error'));

    render(<PeopleSubTab clientGroupId={123} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no product owners exist', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => [],
      ok: true
    });

    render(<PeopleSubTab clientGroupId={123} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/no product owners found/i)).toBeInTheDocument();
    });
  });

  it('uses React Query cache on subsequent renders', async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => [{ id: 1, firstname: 'Cached', surname: 'User', status: 'active' }],
      ok: true
    });

    const { rerender } = render(<PeopleSubTab clientGroupId={123} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Cached User')).toBeInTheDocument();
    });

    // First render should call API
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Rerender with same clientGroupId
    rerender(<PeopleSubTab clientGroupId={123} />);

    // Should use cache, not call API again
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('opens CreateProductOwnerModal when "+ Add Person" button clicked', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => [],
      ok: true
    });

    render(<PeopleSubTab clientGroupId={123} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/add person/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/add person/i));

    // Should render create modal
    expect(screen.getByText(/add new person to client group/i)).toBeInTheDocument();
  });
});
```

**🟢 Green Phase** (8 hours)
```typescript
// frontend/src/pages/ClientGroupSuite/tabs/components/PeopleSubTab.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProductOwnerTable from './ProductOwnerTable';
import CreateProductOwnerModal from './CreateProductOwnerModal';
import EditProductOwnerModal from './EditProductOwnerModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import DeceasedDateModal from './DeceasedDateModal';
import ModalErrorBoundary from '@/components/errors/ModalErrorBoundary';
import { ActionButton } from '@/components/ui';
import api from '@/services/api';

interface PeopleSubTabProps {
  clientGroupId: number;
}

const PeopleSubTab: React.FC<PeopleSubTabProps> = ({ clientGroupId }) => {
  const queryClient = useQueryClient();

  // Local UI state
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProductOwner, setSelectedProductOwner] = useState<ProductOwner | null>(null);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [deceasedDateModalOpen, setDeceasedDateModalOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{id: number, status: string} | null>(null);

  // Server state with React Query
  const { data: productOwners, isLoading, error, refetch } = useQuery(
    ['clientGroup', clientGroupId, 'productOwners'],
    () => api.get(`/client-groups/${clientGroupId}/product-owners`).then(res => res.data),
    {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Mutation for status changes
  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: Partial<ProductOwner> }) =>
      api.put(`/product-owners/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['clientGroup', clientGroupId, 'productOwners']);
      },
    }
  );

  // Mutation for deletion
  const deleteMutation = useMutation(
    (id: number) => api.delete(`/product-owners/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['clientGroup', clientGroupId, 'productOwners']);
      },
    }
  );

  // Event handlers
  const handleEdit = (productOwner: ProductOwner) => {
    setSelectedProductOwner(productOwner);
    setIsEditModalOpen(true);
  };

  const handleStatusChange = async (productOwnerId: number, newStatus: string) => {
    if (newStatus === 'deceased') {
      setPendingStatusChange({ id: productOwnerId, status: newStatus });
      setDeceasedDateModalOpen(true);
      return;
    }

    await updateMutation.mutateAsync({
      id: productOwnerId,
      data: { status: newStatus }
    });
  };

  const handleDeleteClick = (productOwner: ProductOwner) => {
    if (productOwner.status === 'active') {
      // Show error notification
      return;
    }
    setSelectedProductOwner(productOwner);
    setDeleteConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedProductOwner) return;
    await deleteMutation.mutateAsync(selectedProductOwner.id);
    setDeleteConfirmModalOpen(false);
    setSelectedProductOwner(null);
  };

  // Render states
  if (isLoading) {
    return <div className="flex justify-center py-12">Loading...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg">
        <p className="text-red-700">Failed to load product owners</p>
        <button onClick={() => refetch()} className="text-primary-600 mt-2">
          Try Again
        </button>
      </div>
    );
  }

  if (!productOwners || productOwners.length === 0) {
    return (
      <div className="bg-gray-50 p-12 rounded-lg text-center">
        <p className="text-gray-500 mb-4">No product owners found for this client group</p>
        <ActionButton
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Add Person
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900">People in Client Group</h3>
        <ActionButton
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Add Person
        </ActionButton>
      </div>

      <ProductOwnerTable
        productOwners={productOwners}
        sortConfig={sortConfig}
        onSort={(key) => setSortConfig({ key, direction: 'asc' })}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteClick}
      />

      {/* Modals with error boundaries */}
      {isCreateModalOpen && (
        <ModalErrorBoundary>
          <CreateProductOwnerModal
            clientGroupId={clientGroupId}
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={() => refetch()}
          />
        </ModalErrorBoundary>
      )}

      {isEditModalOpen && selectedProductOwner && (
        <ModalErrorBoundary>
          <EditProductOwnerModal
            productOwner={selectedProductOwner}
            onClose={() => setIsEditModalOpen(false)}
            onSave={() => refetch()}
          />
        </ModalErrorBoundary>
      )}

      {deleteConfirmModalOpen && selectedProductOwner && (
        <ModalErrorBoundary>
          <DeleteConfirmationModal
            productOwner={selectedProductOwner}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteConfirmModalOpen(false)}
            isDeleting={deleteMutation.isLoading}
          />
        </ModalErrorBoundary>
      )}
    </div>
  );
};

export default PeopleSubTab;
```

**🔵 Refactor Phase** (4 hours)
- Extract event handlers into custom hooks
- Optimize memoization with useMemo/useCallback
- Add comprehensive error handling
- Add loading indicators for mutations

**Deliverables**:
- ✅ PeopleSubTab component implemented
- ✅ React Query integration complete
- ✅ 6 passing component tests
- ✅ Error boundaries working

---

### Day 13-14: ProductOwnerTable Component (16 hours)

#### Phase 13.1: Semantic HTML Table with ARIA

**🔴 Red Phase** (4 hours)
```typescript
// tests/components/ProductOwnerTable.test.tsx
describe('ProductOwnerTable', () => {
  const mockProductOwners = [
    { id: 1, firstname: 'John', surname: 'Smith', status: 'active', dob: '1980-01-15', email_1: 'john@example.com' },
    { id: 2, firstname: 'Jane', surname: 'Doe', status: 'lapsed', dob: '1975-05-20', email_1: 'jane@example.com' }
  ];

  it('renders semantic HTML table structure', () => {
    render(<ProductOwnerTable productOwners={mockProductOwners} onSort={jest.fn()} onEdit={jest.fn()} onStatusChange={jest.fn()} onDelete={jest.fn()} />);

    // Verify table element exists
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Verify column headers
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /relationship/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /age/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /dob/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
  });

  it('column headers have correct aria-sort attributes', () => {
    const { rerender } = render(
      <ProductOwnerTable
        productOwners={mockProductOwners}
        sortConfig={null}
        onSort={jest.fn()}
        onEdit={jest.fn()}
        onStatusChange={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    // Initially no sort - aria-sort="none"
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    expect(nameHeader).toHaveAttribute('aria-sort', 'none');

    // Sort ascending - aria-sort="ascending"
    rerender(
      <ProductOwnerTable
        productOwners={mockProductOwners}
        sortConfig={{ key: 'name', direction: 'asc' }}
        onSort={jest.fn()}
        onEdit={jest.fn()}
        onStatusChange={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

    // Sort descending - aria-sort="descending"
    rerender(
      <ProductOwnerTable
        productOwners={mockProductOwners}
        sortConfig={{ key: 'name', direction: 'desc' }}
        onSort={jest.fn()}
        onEdit={jest.fn()}
        onStatusChange={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
  });

  it('displays inactive product owners at bottom with greyed-out styling', () => {
    render(<ProductOwnerTable productOwners={mockProductOwners} onSort={jest.fn()} onEdit={jest.fn()} onStatusChange={jest.fn()} onDelete={jest.fn()} />);

    const rows = screen.getAllByRole('row').slice(1); // Skip header row

    // First row (active) should not have opacity-50 class
    expect(rows[0]).not.toHaveClass('opacity-50');

    // Second row (lapsed) should have opacity-50 class
    expect(rows[1]).toHaveClass('opacity-50');
  });

  it('clicking column header calls onSort with correct key', () => {
    const mockOnSort = jest.fn();
    render(<ProductOwnerTable productOwners={mockProductOwners} onSort={mockOnSort} onEdit={jest.fn()} onStatusChange={jest.fn()} onDelete={jest.fn()} />);

    fireEvent.click(screen.getByRole('columnheader', { name: /name/i }));

    expect(mockOnSort).toHaveBeenCalledWith('name');
  });

  it('renders action buttons based on product owner status', () => {
    render(<ProductOwnerTable productOwners={mockProductOwners} onSort={jest.fn()} onEdit={jest.fn()} onStatusChange={jest.fn()} onDelete={jest.fn()} />);

    // Active product owner (John Smith) should have: Edit, Lapse, Make Deceased
    const activeRow = screen.getByText('John Smith').closest('tr');
    within(activeRow).getByRole('button', { name: /edit/i });
    within(activeRow).getByRole('button', { name: /lapse/i });
    within(activeRow).getByRole('button', { name: /deceased/i });

    // Inactive product owner (Jane Doe) should have: Edit, Reactivate, Delete
    const inactiveRow = screen.getByText('Jane Doe').closest('tr');
    within(inactiveRow).getByRole('button', { name: /edit/i });
    within(inactiveRow).getByRole('button', { name: /reactivate/i });
    within(inactiveRow).getByRole('button', { name: /delete/i });
  });
});
```

**🟢 Green Phase** (8 hours)
```typescript
// frontend/src/pages/ClientGroupSuite/tabs/components/ProductOwnerTable.tsx
import React from 'react';
import ProductOwnerRow from './ProductOwnerRow';
import { calculateAge, formatName } from '@/utils/helpers';

interface ProductOwnerTableProps {
  productOwners: ProductOwner[];
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  onEdit: (productOwner: ProductOwner) => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (productOwner: ProductOwner) => void;
}

const ProductOwnerTable: React.FC<ProductOwnerTableProps> = ({
  productOwners,
  sortConfig,
  onSort,
  onEdit,
  onStatusChange,
  onDelete
}) => {
  const getAriaSortValue = (columnKey: string): 'ascending' | 'descending' | 'none' => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return 'none';
    }
    return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortIndicator = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <span className="text-gray-400 ml-1">↕</span>;
    }
    return sortConfig.direction === 'asc'
      ? <span className="text-white ml-1">↑</span>
      : <span className="text-white ml-1">↓</span>;
  };

  return (
    <table role="table" className="min-w-full divide-y divide-gray-200">
      <thead className="bg-primary-700">
        <tr>
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
            aria-sort={getAriaSortValue('name')}
            onClick={() => onSort('name')}
          >
            Name {renderSortIndicator('name')}
          </th>
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
            aria-sort={getAriaSortValue('relationship_status')}
            onClick={() => onSort('relationship_status')}
          >
            Relationship {renderSortIndicator('relationship_status')}
          </th>
          <th
            scope="col"
            className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
            aria-sort={getAriaSortValue('age')}
            onClick={() => onSort('age')}
          >
            Age {renderSortIndicator('age')}
          </th>
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
            aria-sort={getAriaSortValue('dob')}
            onClick={() => onSort('dob')}
          >
            DOB {renderSortIndicator('dob')}
          </th>
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
            aria-sort={getAriaSortValue('email_1')}
            onClick={() => onSort('email_1')}
          >
            Email {renderSortIndicator('email_1')}
          </th>
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
            aria-sort={getAriaSortValue('status')}
            onClick={() => onSort('status')}
          >
            Status {renderSortIndicator('status')}
          </th>
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {productOwners.map(productOwner => (
          <ProductOwnerRow
            key={productOwner.id}
            productOwner={productOwner}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </table>
  );
};

export default ProductOwnerTable;
```

**🔵 Refactor Phase** (4 hours)
- Extract column configuration
- Memoize sort indicator rendering
- Add keyboard navigation support
- Optimize re-renders with React.memo

**Deliverables**:
- ✅ ProductOwnerTable component complete
- ✅ 6 passing accessibility tests
- ✅ Semantic HTML verified
- ✅ ARIA attributes correct

---

### Day 15: Sorting & Helper Functions (8 hours)

#### Phase 15.1: Sorting Logic Implementation

**🔴 Red Phase** (2 hours)
```typescript
// tests/utils/sorting.test.ts
describe('getSortedProductOwners', () => {
  const mockProductOwners = [
    { id: 1, firstname: 'Charlie', surname: 'Brown', status: 'active', dob: '1980-01-01' },
    { id: 2, firstname: 'Alice', surname: 'Johnson', status: 'lapsed', dob: '1975-05-15' },
    { id: 3, firstname: 'Bob', surname: 'Smith', status: 'active', dob: '1990-12-20' }
  ];

  it('sorts active product owners before inactive', () => {
    const result = getSortedProductOwners(mockProductOwners, null);

    const activeOwners = result.filter(po => po.status === 'active');
    const inactiveOwners = result.filter(po => po.status !== 'active');

    // All active should come before all inactive
    expect(result.indexOf(activeOwners[0])).toBeLessThan(result.indexOf(inactiveOwners[0]));
  });

  it('sorts by name alphabetically ascending', () => {
    const sortConfig = { key: 'name', direction: 'asc' };
    const result = getSortedProductOwners(mockProductOwners, sortConfig);

    // Within active group: Alice < Bob < Charlie
    expect(result[0].firstname).toBe('Alice');
    expect(result[1].firstname).toBe('Bob');
    expect(result[2].firstname).toBe('Charlie');
  });

  it('sorts by age numerically', () => {
    const sortConfig = { key: 'age', direction: 'asc' };
    const result = getSortedProductOwners(mockProductOwners, sortConfig);

    // Youngest to oldest
    const ages = result.map(po => calculateAge(po.dob));
    expect(ages[0]).toBeLessThan(ages[1]);
    expect(ages[1]).toBeLessThan(ages[2]);
  });

  it('handles null values by sorting to end', () => {
    const ownersWithNulls = [
      { id: 1, firstname: 'Alice', surname: 'Smith', dob: '1980-01-01' },
      { id: 2, firstname: 'Bob', surname: 'Jones', dob: null },
      { id: 3, firstname: 'Charlie', surname: 'Brown', dob: '1990-05-15' }
    ];

    const sortConfig = { key: 'dob', direction: 'asc' };
    const result = getSortedProductOwners(ownersWithNulls, sortConfig);

    // Null DOB should be last
    expect(result[result.length - 1].dob).toBeNull();
  });
});
```

**🟢 Green Phase** (4 hours)
```typescript
// frontend/src/utils/sorting.ts
export function getSortedProductOwners(
  productOwners: ProductOwner[],
  sortConfig: SortConfig | null
): ProductOwner[] {
  // Step 1: Separate active and inactive
  const active = productOwners.filter(po => po.status === 'active');
  const inactive = productOwners.filter(po => po.status !== 'active');

  // Step 2: Sort each group
  const sortedActive = sortProductOwners(active, sortConfig);
  const sortedInactive = sortProductOwners(inactive, sortConfig);

  // Step 3: Combine (active first)
  return [...sortedActive, ...sortedInactive];
}

function sortProductOwners(
  productOwners: ProductOwner[],
  sortConfig: SortConfig | null
): ProductOwner[] {
  if (!sortConfig || sortConfig.direction === 'default') {
    return productOwners;
  }

  // Special cases for computed fields
  if (sortConfig.key === 'age') {
    return sortByAge(productOwners, sortConfig.direction);
  }

  if (sortConfig.key === 'name') {
    return sortByName(productOwners, sortConfig.direction);
  }

  // Generic sorting
  return [...productOwners].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    // Handle nulls
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Compare based on type
    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });
}

function sortByAge(productOwners: ProductOwner[], direction: string): ProductOwner[] {
  return [...productOwners].sort((a, b) => {
    const ageA = calculateAge(a.dob);
    const ageB = calculateAge(b.dob);

    if (ageA == null && ageB == null) return 0;
    if (ageA == null) return 1;
    if (ageB == null) return -1;

    return direction === 'asc' ? ageA - ageB : ageB - ageA;
  });
}

function sortByName(productOwners: ProductOwner[], direction: string): ProductOwner[] {
  return [...productOwners].sort((a, b) => {
    const nameA = formatName(a).toLowerCase();
    const nameB = formatName(b).toLowerCase();

    const comparison = nameA.localeCompare(nameB);
    return direction === 'asc' ? comparison : -comparison;
  });
}
```

**🔵 Refactor Phase** (2 hours)
- Extract comparison logic
- Add TypeScript generics for reusability
- Optimize performance with memoization

**Deliverables**:
- ✅ Sorting logic complete
- ✅ 5 passing sorting tests
- ✅ Edge cases handled (nulls, case-insensitive)

---

## Week 4: Frontend Modals & Integration

**Duration**: 5 days (40 hours)
**Focus**: Create/Edit modals, Delete confirmation, form validation

### Day 16-17: Create & Edit Modals (16 hours)

#### Phase 16.1: CreateProductOwnerModal with Progressive Disclosure

**🔴 Red Phase** (4 hours)
```typescript
// tests/components/CreateProductOwnerModal.test.tsx
describe('CreateProductOwnerModal', () => {
  it('renders with tabbed form structure', () => {
    render(<CreateProductOwnerModal clientGroupId={123} onClose={jest.fn()} onCreate={jest.fn()} />);

    // Verify tabs exist
    expect(screen.getByRole('tab', { name: /personal details/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /contact & address/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /employment/i })).toBeInTheDocument();
  });

  it('shows deceased_date field only when status is deceased', async () => {
    render(<CreateProductOwnerModal clientGroupId={123} onClose={jest.fn()} onCreate={jest.fn()} />);

    // Initially status is 'active', deceased_date should be hidden
    expect(screen.queryByLabelText(/date of death/i)).not.toBeInTheDocument();

    // Change status to 'deceased'
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'deceased' } });

    // Now deceased_date field should appear
    await waitFor(() => {
      expect(screen.getByLabelText(/date of death/i)).toBeInTheDocument();
    });
  });

  it('validates required fields (firstname, surname)', async () => {
    const mockOnCreate = jest.fn();
    render(<CreateProductOwnerModal clientGroupId={123} onClose={jest.fn()} onCreate={mockOnCreate} />);

    // Click Create without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /create person/i }));

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/surname is required/i)).toBeInTheDocument();
    });

    // Should NOT call onCreate
    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it('submits form and calls onCreate on success', async () => {
    const mockOnCreate = jest.fn();
    const mockApiPost = jest.spyOn(api, 'post').mockResolvedValueOnce({
      data: { id: 999, firstname: 'New', surname: 'Person' }
    });

    render(<CreateProductOwnerModal clientGroupId={123} onClose={jest.fn()} onCreate={mockOnCreate} />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText(/surname/i), { target: { value: 'Person' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create person/i }));

    // Should call API with atomic endpoint
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/client-groups/123/product-owners',
        expect.objectContaining({ firstname: 'New', surname: 'Person' }),
        expect.anything()
      );
    });

    // Should call onCreate callback
    expect(mockOnCreate).toHaveBeenCalled();
  });

  it('prompts for confirmation when closing with unsaved changes', () => {
    window.confirm = jest.fn(() => false);  // User clicks Cancel
    const mockOnClose = jest.fn();

    render(<CreateProductOwnerModal clientGroupId={123} onClose={mockOnClose} onCreate={jest.fn()} />);

    // Make changes
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Test' } });

    // Try to close
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Should show confirmation
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('unsaved changes'));

    // Should NOT close (user clicked Cancel)
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
```

**🟢 Green Phase** (8 hours)
- Implement CreateProductOwnerModal with HeadlessUI Dialog
- Implement tabbed form with 3 sections
- Add form validation logic
- Integrate with atomic API endpoint
- Add unsaved changes detection

**🔵 Refactor Phase** (4 hours)
- Extract form components (FormInput, FormSelect, FormDateInput)
- Extract validation logic into separate file
- Add field-level error handling
- Optimize tab switching performance

**Deliverables**:
- ✅ CreateProductOwnerModal complete
- ✅ 6 passing modal tests
- ✅ Progressive disclosure working
- ✅ Validation working

---

### Day 18-19: Edit Modal & Form Validation (16 hours)

#### Phase 18.1: EditProductOwnerModal

**🔴 Red Phase** (3 hours)
```typescript
// tests/components/EditProductOwnerModal.test.tsx
describe('EditProductOwnerModal', () => {
  const mockProductOwner = {
    id: 1,
    firstname: 'John',
    surname: 'Smith',
    email_1: 'john@example.com',
    status: 'active',
    address_line_1: '123 Main St'
  };

  it('pre-populates form with existing product owner data', () => {
    render(<EditProductOwnerModal productOwner={mockProductOwner} onClose={jest.fn()} onSave={jest.fn()} />);

    // Verify fields are pre-populated
    expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/surname/i)).toHaveValue('Smith');
    expect(screen.getByLabelText(/primary email/i)).toHaveValue('john@example.com');
  });

  it('detects address changes and uses create_new strategy', async () => {
    const mockApiPut = jest.spyOn(api, 'put').mockResolvedValueOnce({
      data: { id: 1, address_id: 999 }
    });

    render(<EditProductOwnerModal productOwner={mockProductOwner} onClose={jest.fn()} onSave={jest.fn()} />);

    // Navigate to Contact & Address tab
    fireEvent.click(screen.getByRole('tab', { name: /contact & address/i }));

    // Change address
    fireEvent.change(screen.getByLabelText(/address line 1/i), { target: { value: '456 New St' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // Should call API with create_new strategy
    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        '/product-owners/1',
        expect.objectContaining({
          address_line_1: '456 New St',
          _address_strategy: 'create_new'
        }),
        expect.anything()
      );
    });
  });

  it('tracks initial form data for change detection', () => {
    render(<EditProductOwnerModal productOwner={mockProductOwner} onClose={jest.fn()} onSave={jest.fn()} />);

    // Make no changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });

    // Should detect no changes and potentially disable save button or show message
    // (implementation detail - may vary)
  });
});
```

**🟢 Green Phase** (8 hours)
- Implement EditProductOwnerModal (reuse Create structure)
- Pre-populate form with existing data
- Track initial state for change detection
- Implement address strategy detection
- Integrate with PUT API endpoint

**🔵 Refactor Phase** (5 hours)
- Share form components between Create and Edit
- Extract common modal logic
- Optimize change detection
- Add comprehensive error handling

**Deliverables**:
- ✅ EditProductOwnerModal complete
- ✅ 5 passing edit modal tests
- ✅ Address strategy working
- ✅ Form validation consistent with Create

---

### Day 20: Delete Confirmation & Status Modals (8 hours)

#### Phase 20.1: DeleteConfirmationModal

**🔴 Red Phase** (2 hours)
```typescript
// tests/components/DeleteConfirmationModal.test.tsx
describe('DeleteConfirmationModal', () => {
  const mockProductOwner = { id: 1, firstname: 'John', surname: 'Smith', status: 'lapsed' };

  it('displays product owner name in confirmation message', () => {
    render(<DeleteConfirmationModal productOwner={mockProductOwner} onConfirm={jest.fn()} onCancel={jest.fn()} isDeleting={false} />);

    expect(screen.getByText(/john smith/i)).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  it('calls onConfirm when Delete Permanently clicked', () => {
    const mockOnConfirm = jest.fn();
    render(<DeleteConfirmationModal productOwner={mockProductOwner} onConfirm={mockOnConfirm} onCancel={jest.fn()} isDeleting={false} />);

    fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));

    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel clicked', () => {
    const mockOnCancel = jest.fn();
    render(<DeleteConfirmationModal productOwner={mockProductOwner} onConfirm={jest.fn()} onCancel={mockOnCancel} isDeleting={false} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables buttons when isDeleting is true', () => {
    render(<DeleteConfirmationModal productOwner={mockProductOwner} onConfirm={jest.fn()} onCancel={jest.fn()} isDeleting={true} />);

    expect(screen.getByRole('button', { name: /delete permanently/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});
```

**🟢 Green Phase** (4 hours)
- Implement DeleteConfirmationModal with HeadlessUI Dialog
- Add warning icon and styling
- Add loading state handling
- Integrate with delete mutation

**🔵 Refactor Phase** (2 hours)
- Extract reusable ConfirmationModal component
- Add keyboard shortcuts (Enter to confirm, Escape to cancel)

**Deliverables**:
- ✅ DeleteConfirmationModal complete
- ✅ 4 passing delete modal tests
- ✅ UX polished with loading states

---

## Week 5: Testing & Deployment

**Duration**: 5 days (40 hours)
**Focus**: E2E tests, accessibility audit, performance testing, deployment preparation

### Day 21-22: End-to-End Testing (16 hours)

#### Phase 21.1: Cypress E2E Tests

**🔴 Red Phase** (4 hours)
```typescript
// cypress/e2e/people-tab/product-owner-crud.cy.ts
describe('Product Owner CRUD Workflow', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/client-groups/123');
    cy.get('[data-testid="basic-details-tab"]').click();
    cy.get('[data-testid="people-sub-tab"]').click();
  });

  it('completes full CRUD lifecycle: Create → Read → Update → Delete', () => {
    // CREATE
    cy.get('button').contains('Add Person').click();
    cy.get('input[name="firstname"]').type('E2E');
    cy.get('input[name="surname"]').type('Test');
    cy.get('input[name="email_1"]').type('e2e@example.com');
    cy.get('button').contains('Create Person').click();

    // Verify success notification
    cy.contains('E2E Test added successfully').should('be.visible');

    // READ
    cy.contains('E2E Test').should('be.visible');

    // UPDATE
    cy.contains('E2E Test').closest('tr').find('button[aria-label*="Edit"]').click();
    cy.get('input[name="email_1"]').clear().type('updated@example.com');
    cy.get('button').contains('Save Changes').click();

    // Verify updated
    cy.contains('E2E Test').closest('tr').should('contain', 'updated@example.com');

    // STATUS TRANSITION (lapse)
    cy.contains('E2E Test').closest('tr').find('button').contains('Lapse').click();

    // Verify status changed and moved to bottom
    cy.contains('E2E Test').closest('tr').should('have.class', 'opacity-50');

    // DELETE
    cy.contains('E2E Test').closest('tr').find('button').contains('Delete').click();
    cy.get('[role="dialog"]').contains('Delete Permanently').click();

    // Verify deleted
    cy.contains('E2E Test').should('not.exist');
  });

  it('sorts product owners by clicking column headers', () => {
    cy.get('th').contains('Name').click();

    // Verify ascending sort (arrow up visible)
    cy.get('th').contains('Name').find('span').should('contain', '↑');

    // Click again for descending
    cy.get('th').contains('Name').click();
    cy.get('th').contains('Name').find('span').should('contain', '↓');
  });

  it('validates required fields in create modal', () => {
    cy.get('button').contains('Add Person').click();

    // Try to submit without required fields
    cy.get('button').contains('Create Person').click();

    // Should show validation errors
    cy.contains('First name is required').should('be.visible');
    cy.contains('Surname is required').should('be.visible');
  });

  it('prevents deleting active product owner', () => {
    // Try to delete active product owner (should not show delete button)
    cy.contains('Active Person').closest('tr').find('button').contains('Delete').should('not.exist');
  });
});
```

**🟢 Green Phase** (8 hours)
- Implement E2E tests for all workflows
- Add test data setup/teardown
- Configure Cypress for CI/CD
- Add video recording for failures

**🔵 Refactor Phase** (4 hours)
- Extract common E2E patterns
- Add custom Cypress commands
- Optimize test performance

**Deliverables**:
- ✅ 5 comprehensive E2E tests
- ✅ All user workflows covered
- ✅ Tests passing in CI/CD pipeline

---

### Day 23: Accessibility Audit & Performance Testing (8 hours)

#### Phase 23.1: Accessibility Compliance

**Tasks** (4 hours)
- Run axe-core automated scan (0 violations)
- Run Lighthouse accessibility audit (score ≥95)
- Manual keyboard navigation testing
- Screen reader testing (NVDA/JAWS)

**Deliverables**:
- ✅ Lighthouse accessibility score ≥95
- ✅ axe-core violations: 0
- ✅ Keyboard navigation fully functional
- ✅ Screen reader approval

#### Phase 23.2: Performance Testing

**Tasks** (4 hours)
- Load testing (100 concurrent users)
- API response time verification (<500ms GET, <1s POST)
- Frontend rendering performance (50 rows <500ms)
- Database query performance (EXPLAIN ANALYZE)

**Deliverables**:
- ✅ Load test report (stable performance)
- ✅ API response times within targets
- ✅ No performance regressions

---

### Day 24-25: Deployment Preparation & Final Testing (16 hours)

#### Phase 24.1: Pre-Deployment Checklist Completion

**Tasks** (8 hours)
- Complete all 24 items in Pre-Deployment Checklist
- Schedule cron jobs (orphaned address cleanup, idempotency cleanup)
- Configure monitoring (Sentry, APM)
- Create rollback procedure documentation
- Database backup verification

**Deliverables**:
- ✅ All checklist items completed with evidence
- ✅ Cron jobs scheduled
- ✅ Monitoring configured
- ✅ Rollback procedure documented

#### Phase 24.2: Production Deployment

**Tasks** (4 hours)
- Run database migrations on production
- Deploy backend code
- Deploy frontend code
- Smoke test in production

**Deliverables**:
- ✅ Production deployment successful
- ✅ Smoke test passed
- ✅ Monitoring shows no errors

#### Phase 24.3: Post-Deployment Verification

**Tasks** (4 hours)
- Verify all endpoints responding
- Test create/edit/delete in production
- Monitor error rates for 24 hours
- User acceptance testing

**Deliverables**:
- ✅ All features working in production
- ✅ No errors in monitoring
- ✅ User acceptance sign-off

---

## Verification Checklist

Use this checklist to verify completion of each phase:

### Backend Verification

- [ ] **Migrations Applied**: All 3 migrations (idempotency keys, indexes, composite index) applied successfully
  ```bash
  alembic history  # Shows all 3 migrations
  psql $DATABASE_URL -c "\d idempotency_keys"  # Table exists
  ```

- [ ] **Atomic Endpoint Working**: `POST /client-groups/{id}/product-owners` creates product owner atomically
  ```bash
  curl -X POST http://localhost:8001/client-groups/123/product-owners \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"firstname": "Test", "surname": "User"}'
  # Returns 201 Created
  ```

- [ ] **Idempotency Working**: Duplicate requests with same Idempotency-Key return cached response
  ```bash
  curl -X POST http://localhost:8001/client-groups/123/product-owners \
    -H "Idempotency-Key: test-123" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"firstname": "Duplicate", "surname": "Test"}'
  # First call: 201 Created
  # Second call with same key: 201 Created (cached, no new record)
  ```

- [ ] **Orphaned Address Cleanup Job Working**: Manual run deletes orphaned addresses
  ```bash
  python backend/app/jobs/cleanup_orphaned_addresses.py
  # Logs "Deleted N orphaned address(es)"
  ```

- [ ] **Backend Tests Passing**: All tests pass with ≥75% coverage
  ```bash
  pytest backend/tests -v  # All tests pass
  pytest backend/tests --cov=backend/app --cov-report=term  # Coverage ≥75%
  ```

### Frontend Verification

- [ ] **React Query Integration Working**: Data fetches from cache on tab switch
  ```
  1. Open People tab
  2. Switch to different tab
  3. Switch back to People tab
  4. Network tab shows NO API call (uses cache)
  ```

- [ ] **Table Renders Correctly**: Semantic HTML table with ARIA attributes
  ```
  1. Inspect table element
  2. Verify <table role="table">
  3. Verify <th scope="col">
  4. Verify aria-sort attributes change on column click
  ```

- [ ] **Sorting Works**: Click column headers to sort
  ```
  1. Click "Name" header → ascending (↑)
  2. Click again → descending (↓)
  3. Click again → default order
  4. Inactive rows stay at bottom
  ```

- [ ] **Create Modal Works**: Can create new product owner
  ```
  1. Click "+ Add Person"
  2. Fill firstname and surname (required)
  3. Click "Create Person"
  4. Success notification appears
  5. New person appears in table
  ```

- [ ] **Edit Modal Works**: Can edit existing product owner
  ```
  1. Click row or Edit button
  2. Modify fields
  3. Click "Save Changes"
  4. Success notification appears
  5. Changes reflected in table
  ```

- [ ] **Delete Works**: Can delete inactive product owner
  ```
  1. Mark product owner as lapsed
  2. Click Delete button
  3. Confirm deletion in modal
  4. Success notification appears
  5. Product owner removed from table
  ```

- [ ] **Error Boundaries Working**: Modal errors don't crash parent
  ```
  1. Open developer console
  2. In modal, throw error (modify code temporarily)
  3. Error boundary shows "Something went wrong"
  4. Click "Try Again" resets error
  5. Parent PeopleSubTab still functional
  ```

- [ ] **Frontend Tests Passing**: All tests pass with ≥70% coverage
  ```bash
  npm test  # All tests pass
  npm test -- --coverage  # Coverage ≥70%
  ```

### E2E Verification

- [ ] **E2E Tests Passing**: All Cypress tests pass
  ```bash
  npm run test:e2e  # All E2E tests pass
  ```

- [ ] **Accessibility Audit Passed**: Lighthouse score ≥95
  ```
  1. Open Chrome DevTools
  2. Lighthouse → Accessibility
  3. Run audit
  4. Score ≥95
  ```

- [ ] **Keyboard Navigation Works**: Can complete workflow with keyboard only
  ```
  1. Tab through table rows
  2. Press Enter on row → opens edit modal
  3. Tab through form fields
  4. Press Escape → closes modal
  5. Tab to buttons, press Enter → executes action
  ```

### Performance Verification

- [ ] **API Response Times**: GET <500ms, POST/PUT/DELETE <1s
  ```bash
  # Use New Relic/DataDog metrics or:
  curl -w "@curl-format.txt" -X GET http://localhost:8001/client-groups/123/product-owners
  # Response time < 500ms
  ```

- [ ] **Load Test Passed**: 100 concurrent users, no errors
  ```bash
  k6 run load-test-script.js
  # All requests succeed, response times stable
  ```

---

## Risk Mitigation

### High-Risk Areas

1. **Orphaned Product Owner Records** (from two-step creation workflow)
   - **Mitigation**: Atomic endpoint eliminates this risk
   - **Fallback**: Frontend rollback logic temporarily
   - **Monitoring**: Alert if orphaned records detected

2. **Address Field Update Side Effects** (shared address records)
   - **Mitigation**: "Create new" address strategy
   - **Testing**: Verify old address unchanged after update
   - **Rollback**: Manual SQL to restore address if needed

3. **Idempotency Table Growth** (unbounded)
   - **Mitigation**: 24-hour expiration + daily cleanup job
   - **Monitoring**: Alert if table size >100k rows
   - **Rollback**: Manual truncate if needed

4. **React Query Cache Staleness** (showing outdated data)
   - **Mitigation**: 5-minute stale time + cache invalidation on mutations
   - **Testing**: Verify refetch after mutations
   - **Manual fix**: Clear browser cache if needed

5. **Modal Form Crashes** (unhandled errors)
   - **Mitigation**: Error boundary wrapper
   - **Testing**: Throw errors in modals, verify recovery
   - **User impact**: Modal fails gracefully, parent functional

### Rollback Procedures

#### Rollback Database Migrations
```bash
alembic downgrade -1  # Rollback one migration
alembic downgrade 001_idempotency_keys  # Rollback to specific revision
```

#### Rollback Code Deployment
```bash
# Redeploy previous git commit
git checkout <previous-commit-sha>
./deploy_minimal.ps1
```

#### Emergency Stop
```bash
# Feature flag to disable People Tab
# In frontend .env:
REACT_APP_ENABLE_PEOPLE_TAB=false

# Rebuild and redeploy frontend
npm run build
```

---

## Summary

This TDD implementation plan provides:

- **Week-by-week breakdown** with clear milestones
- **Test-first approach** for all features (Red → Green → Refactor)
- **Comprehensive verification** at each phase
- **Realistic time estimates** (4-5 weeks total)
- **Risk mitigation strategies** for high-risk areas
- **Complete test coverage** (≥70% backend and frontend)
- **Production-ready quality** with monitoring and rollback procedures

**Next Steps**:
1. Review plan with development team
2. Assign team members to backend/frontend tracks
3. Set up CI/CD pipeline for automated testing
4. Begin Week 1, Day 1: Database Migration 001

**Success Criteria**:
- All tests passing (unit, integration, E2E)
- Test coverage ≥70% (backend and frontend)
- Accessibility audit score ≥95
- Performance targets met (API <500ms, load test stable)
- Pre-deployment checklist 100% complete
- Production deployment successful with zero errors

---

**End of TDD Implementation Plan**
