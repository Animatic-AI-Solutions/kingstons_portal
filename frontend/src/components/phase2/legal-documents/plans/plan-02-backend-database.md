# Plan 02: Backend Database Schema and Migrations

## Overview

This plan covers the database schema design and migration scripts for the Legal Documents feature. This must be completed before the API routes can be implemented.

## Database Schema

### Table: `legal_documents`

```sql
CREATE TABLE legal_documents (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    document_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Signed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT legal_documents_status_check
        CHECK (status IN ('Signed', 'Lapsed', 'Registered')),
    CONSTRAINT legal_documents_notes_length
        CHECK (LENGTH(notes) <= 2000)
);

-- Index for common queries
CREATE INDEX idx_legal_documents_status ON legal_documents(status);
CREATE INDEX idx_legal_documents_type ON legal_documents(type);
```

### Client Group Relationship

Legal documents are linked to client groups **indirectly** through product owners. The junction table `product_owner_legal_documents` provides the many-to-many relationship between legal documents and product owners. To query documents for a client group, join through product owners who belong to that client group. This follows the same indirect relationship pattern used elsewhere in the system.

### Table: `product_owner_legal_documents` (Junction Table)

```sql
CREATE TABLE product_owner_legal_documents (
    product_owner_id INTEGER NOT NULL,
    legal_document_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (product_owner_id, legal_document_id),

    CONSTRAINT fk_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_legal_document
        FOREIGN KEY (legal_document_id)
        REFERENCES legal_documents(id)
        ON DELETE CASCADE
);

-- Index for efficient lookups by product owner
CREATE INDEX idx_polo_legal_product_owner
    ON product_owner_legal_documents(product_owner_id);
CREATE INDEX idx_polo_legal_document
    ON product_owner_legal_documents(legal_document_id);
```

### Trigger: Auto-update `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_legal_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_legal_documents_updated_at
    BEFORE UPDATE ON legal_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_legal_documents_updated_at();
```

---

## TDD Cycle 1: Database Schema Verification

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing tests to verify database schema exists and has correct structure
**Files to create**: `backend/tests/test_legal_documents_schema.py`

```python
"""
Test suite for Legal Documents Database Schema

Verifies that the database schema for legal documents is correctly set up
with all required tables, columns, constraints, and indexes.

Test Coverage:
- legal_documents table existence and structure
- product_owner_legal_documents junction table
- Foreign key constraints
- Check constraints (status, notes length)
- Indexes for performance
- Trigger for updated_at auto-update
"""

import pytest
import pytest_asyncio
import asyncpg
from datetime import datetime, date


@pytest_asyncio.fixture
async def db_connection():
    """
    Provides a PostgreSQL database connection for schema verification tests.
    Uses DATABASE_URL_PHASE2 from environment variables.
    """
    from app.db.database import DATABASE_URL

    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)

    try:
        async with pool.acquire() as conn:
            yield conn
    finally:
        await pool.close()


# =============================================================================
# Table Existence Tests
# =============================================================================

class TestLegalDocumentsTableExists:
    """Tests for legal_documents table existence."""

    @pytest.mark.asyncio
    async def test_legal_documents_table_exists(self, db_connection):
        """Test that legal_documents table exists in the database."""
        result = await db_connection.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'legal_documents'
            )
        """)
        assert result is True, "legal_documents table should exist"

    @pytest.mark.asyncio
    async def test_junction_table_exists(self, db_connection):
        """Test that product_owner_legal_documents junction table exists."""
        result = await db_connection.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'product_owner_legal_documents'
            )
        """)
        assert result is True, "product_owner_legal_documents table should exist"


# =============================================================================
# Column Structure Tests
# =============================================================================

class TestLegalDocumentsColumns:
    """Tests for legal_documents table column structure."""

    @pytest.mark.asyncio
    async def test_has_id_column(self, db_connection):
        """Test that id column exists with correct type."""
        result = await db_connection.fetchrow("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'legal_documents' AND column_name = 'id'
        """)
        assert result is not None, "id column should exist"
        assert result['data_type'] == 'integer', "id should be integer type"
        assert result['is_nullable'] == 'NO', "id should not be nullable"

    @pytest.mark.asyncio
    async def test_has_type_column(self, db_connection):
        """Test that type column exists with correct constraints."""
        result = await db_connection.fetchrow("""
            SELECT column_name, data_type, is_nullable, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'legal_documents' AND column_name = 'type'
        """)
        assert result is not None, "type column should exist"
        assert result['data_type'] == 'character varying', "type should be varchar"
        assert result['is_nullable'] == 'NO', "type should not be nullable"
        assert result['character_maximum_length'] == 100, "type max length should be 100"

    @pytest.mark.asyncio
    async def test_has_document_date_column(self, db_connection):
        """Test that document_date column exists."""
        result = await db_connection.fetchrow("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'legal_documents' AND column_name = 'document_date'
        """)
        assert result is not None, "document_date column should exist"
        assert result['data_type'] == 'date', "document_date should be date type"
        assert result['is_nullable'] == 'YES', "document_date should be nullable"

    @pytest.mark.asyncio
    async def test_has_status_column(self, db_connection):
        """Test that status column exists with default value."""
        result = await db_connection.fetchrow("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'legal_documents' AND column_name = 'status'
        """)
        assert result is not None, "status column should exist"
        assert result['data_type'] == 'character varying', "status should be varchar"
        assert result['is_nullable'] == 'NO', "status should not be nullable"
        assert 'Signed' in str(result['column_default']), "status should default to 'Signed'"

    @pytest.mark.asyncio
    async def test_has_notes_column(self, db_connection):
        """Test that notes column exists and allows text."""
        result = await db_connection.fetchrow("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'legal_documents' AND column_name = 'notes'
        """)
        assert result is not None, "notes column should exist"
        assert result['data_type'] == 'text', "notes should be text type"
        assert result['is_nullable'] == 'YES', "notes should be nullable"

    @pytest.mark.asyncio
    async def test_has_created_at_column(self, db_connection):
        """Test that created_at column exists with timestamp type."""
        result = await db_connection.fetchrow("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'legal_documents' AND column_name = 'created_at'
        """)
        assert result is not None, "created_at column should exist"
        assert 'timestamp' in result['data_type'], "created_at should be timestamp"

    @pytest.mark.asyncio
    async def test_has_updated_at_column(self, db_connection):
        """Test that updated_at column exists with timestamp type."""
        result = await db_connection.fetchrow("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'legal_documents' AND column_name = 'updated_at'
        """)
        assert result is not None, "updated_at column should exist"
        assert 'timestamp' in result['data_type'], "updated_at should be timestamp"


# =============================================================================
# Junction Table Column Tests
# =============================================================================

class TestJunctionTableColumns:
    """Tests for product_owner_legal_documents junction table columns."""

    @pytest.mark.asyncio
    async def test_has_product_owner_id_column(self, db_connection):
        """Test that product_owner_id column exists."""
        result = await db_connection.fetchrow("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'product_owner_legal_documents'
            AND column_name = 'product_owner_id'
        """)
        assert result is not None, "product_owner_id column should exist"
        assert result['data_type'] == 'integer', "product_owner_id should be integer"
        assert result['is_nullable'] == 'NO', "product_owner_id should not be nullable"

    @pytest.mark.asyncio
    async def test_has_legal_document_id_column(self, db_connection):
        """Test that legal_document_id column exists."""
        result = await db_connection.fetchrow("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'product_owner_legal_documents'
            AND column_name = 'legal_document_id'
        """)
        assert result is not None, "legal_document_id column should exist"
        assert result['data_type'] == 'integer', "legal_document_id should be integer"
        assert result['is_nullable'] == 'NO', "legal_document_id should not be nullable"


# =============================================================================
# Constraint Tests
# =============================================================================

class TestLegalDocumentsConstraints:
    """Tests for database constraints on legal_documents table."""

    @pytest.mark.asyncio
    async def test_primary_key_exists(self, db_connection):
        """Test that primary key constraint exists on id column."""
        result = await db_connection.fetchval("""
            SELECT COUNT(*)
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'legal_documents'
            AND tc.constraint_type = 'PRIMARY KEY'
            AND kcu.column_name = 'id'
        """)
        assert result > 0, "Primary key constraint should exist on id column"

    @pytest.mark.asyncio
    async def test_status_check_constraint_exists(self, db_connection):
        """Test that status check constraint exists."""
        result = await db_connection.fetchval("""
            SELECT COUNT(*)
            FROM information_schema.check_constraints cc
            JOIN information_schema.constraint_column_usage ccu
                ON cc.constraint_name = ccu.constraint_name
            WHERE ccu.table_name = 'legal_documents'
            AND cc.check_clause LIKE '%status%'
        """)
        assert result > 0, "Status check constraint should exist"

    @pytest.mark.asyncio
    async def test_status_check_constraint_values(self, db_connection):
        """Test that status constraint allows correct values."""
        # Try to insert valid statuses
        valid_statuses = ['Signed', 'Lapsed', 'Registered']

        for status in valid_statuses:
            try:
                await db_connection.execute("""
                    INSERT INTO legal_documents (type, status)
                    VALUES ($1, $2)
                """, 'Will', status)

                # Clean up
                await db_connection.execute("""
                    DELETE FROM legal_documents
                    WHERE type = 'Will' AND status = $1
                """, status)
            except Exception as e:
                pytest.fail(f"Status '{status}' should be valid: {e}")

    @pytest.mark.asyncio
    async def test_invalid_status_rejected(self, db_connection):
        """Test that invalid status values are rejected."""
        with pytest.raises(asyncpg.CheckViolationError):
            await db_connection.execute("""
                INSERT INTO legal_documents (type, status)
                VALUES ('Will', 'InvalidStatus')
            """)

    @pytest.mark.asyncio
    async def test_notes_length_constraint(self, db_connection):
        """Test that notes cannot exceed 2000 characters."""
        long_notes = 'x' * 2001  # 2001 characters

        with pytest.raises(asyncpg.CheckViolationError):
            await db_connection.execute("""
                INSERT INTO legal_documents (type, notes)
                VALUES ('Will', $1)
            """, long_notes)

    @pytest.mark.asyncio
    async def test_notes_at_max_length_accepted(self, db_connection):
        """Test that notes at exactly 2000 characters are accepted."""
        max_notes = 'x' * 2000  # Exactly 2000 characters

        try:
            result = await db_connection.fetchrow("""
                INSERT INTO legal_documents (type, notes)
                VALUES ('Will', $1)
                RETURNING id
            """, max_notes)

            # Clean up
            await db_connection.execute("""
                DELETE FROM legal_documents WHERE id = $1
            """, result['id'])
        except Exception as e:
            pytest.fail(f"Notes at 2000 chars should be accepted: {e}")


# =============================================================================
# Foreign Key Constraint Tests
# =============================================================================

class TestForeignKeyConstraints:
    """Tests for foreign key constraints on junction table."""

    @pytest.mark.asyncio
    async def test_product_owner_fk_exists(self, db_connection):
        """Test that foreign key to product_owners exists."""
        result = await db_connection.fetchval("""
            SELECT COUNT(*)
            FROM information_schema.table_constraints tc
            WHERE tc.table_name = 'product_owner_legal_documents'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND tc.constraint_name LIKE '%product_owner%'
        """)
        assert result > 0, "Foreign key to product_owners should exist"

    @pytest.mark.asyncio
    async def test_legal_document_fk_exists(self, db_connection):
        """Test that foreign key to legal_documents exists."""
        result = await db_connection.fetchval("""
            SELECT COUNT(*)
            FROM information_schema.table_constraints tc
            WHERE tc.table_name = 'product_owner_legal_documents'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND tc.constraint_name LIKE '%legal_document%'
        """)
        assert result > 0, "Foreign key to legal_documents should exist"

    @pytest.mark.asyncio
    async def test_junction_table_primary_key(self, db_connection):
        """Test that junction table has composite primary key."""
        result = await db_connection.fetch("""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'product_owner_legal_documents'
            AND tc.constraint_type = 'PRIMARY KEY'
        """)
        columns = [row['column_name'] for row in result]
        assert 'product_owner_id' in columns, "PK should include product_owner_id"
        assert 'legal_document_id' in columns, "PK should include legal_document_id"


# =============================================================================
# Index Tests
# =============================================================================

class TestIndexes:
    """Tests for database indexes on legal_documents tables."""

    @pytest.mark.asyncio
    async def test_status_index_exists(self, db_connection):
        """Test that index on status column exists."""
        result = await db_connection.fetchval("""
            SELECT COUNT(*)
            FROM pg_indexes
            WHERE tablename = 'legal_documents'
            AND indexdef LIKE '%status%'
        """)
        assert result > 0, "Index on status column should exist"

    @pytest.mark.asyncio
    async def test_type_index_exists(self, db_connection):
        """Test that index on type column exists."""
        result = await db_connection.fetchval("""
            SELECT COUNT(*)
            FROM pg_indexes
            WHERE tablename = 'legal_documents'
            AND indexdef LIKE '%type%'
        """)
        assert result > 0, "Index on type column should exist"

    @pytest.mark.asyncio
    async def test_junction_product_owner_index(self, db_connection):
        """Test that index on product_owner_id exists in junction table."""
        result = await db_connection.fetchval("""
            SELECT COUNT(*)
            FROM pg_indexes
            WHERE tablename = 'product_owner_legal_documents'
            AND indexdef LIKE '%product_owner_id%'
        """)
        assert result > 0, "Index on product_owner_id should exist"


# =============================================================================
# Trigger Tests
# =============================================================================

class TestUpdatedAtTrigger:
    """Tests for updated_at auto-update trigger."""

    @pytest_asyncio.fixture
    async def test_document(self, db_connection):
        """Create a test document for trigger testing."""
        result = await db_connection.fetchrow("""
            INSERT INTO legal_documents (type, status)
            VALUES ('Will', 'Signed')
            RETURNING id, created_at, updated_at
        """)

        yield result

        # Cleanup
        await db_connection.execute("""
            DELETE FROM legal_documents WHERE id = $1
        """, result['id'])

    @pytest.mark.asyncio
    async def test_updated_at_changes_on_update(self, db_connection, test_document):
        """Test that updated_at is automatically updated on record change."""
        import asyncio

        original_updated_at = test_document['updated_at']

        # Wait a moment to ensure timestamp difference
        await asyncio.sleep(0.1)

        # Update the record
        await db_connection.execute("""
            UPDATE legal_documents
            SET notes = 'Test notes'
            WHERE id = $1
        """, test_document['id'])

        # Fetch the updated record
        result = await db_connection.fetchrow("""
            SELECT updated_at FROM legal_documents WHERE id = $1
        """, test_document['id'])

        assert result['updated_at'] > original_updated_at, \
            "updated_at should be updated after record change"

    @pytest.mark.asyncio
    async def test_created_at_unchanged_on_update(self, db_connection, test_document):
        """Test that created_at remains unchanged on record update."""
        original_created_at = test_document['created_at']

        # Update the record
        await db_connection.execute("""
            UPDATE legal_documents
            SET notes = 'Test notes'
            WHERE id = $1
        """, test_document['id'])

        # Fetch the updated record
        result = await db_connection.fetchrow("""
            SELECT created_at FROM legal_documents WHERE id = $1
        """, test_document['id'])

        assert result['created_at'] == original_created_at, \
            "created_at should not change on update"
```

### Green Phase

**Agent**: coder-agent
**Task**: Create the database migration SQL to make all tests pass
**Files to create**: `backend/migrations/003_create_legal_documents.sql`

```sql
-- Migration: Create Legal Documents Tables
-- Description: Creates legal_documents table and junction table for product owner associations
-- Author: coder-agent
-- Date: 2025-01-13

-- =============================================================================
-- Main Table: legal_documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS legal_documents (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    document_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Signed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Check constraint for valid status values
    CONSTRAINT legal_documents_status_check
        CHECK (status IN ('Signed', 'Lapsed', 'Registered')),

    -- Check constraint for notes length (max 2000 characters)
    CONSTRAINT legal_documents_notes_length
        CHECK (notes IS NULL OR LENGTH(notes) <= 2000)
);

-- Comment on table
COMMENT ON TABLE legal_documents IS 'Stores legal documents linked to client groups indirectly via product owners';
COMMENT ON COLUMN legal_documents.type IS 'Document type (e.g., Will, LPOA P&F, LPOA H&W, EPA, GPA, Advance Directive, or custom)';
COMMENT ON COLUMN legal_documents.document_date IS 'Date of the legal document';
COMMENT ON COLUMN legal_documents.status IS 'Document status: Signed, Registered, or Lapsed';
COMMENT ON COLUMN legal_documents.notes IS 'Additional notes about the document (max 2000 chars)';

-- =============================================================================
-- Junction Table: product_owner_legal_documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS product_owner_legal_documents (
    product_owner_id INTEGER NOT NULL,
    legal_document_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Composite primary key
    PRIMARY KEY (product_owner_id, legal_document_id),

    -- Foreign key to product_owners
    CONSTRAINT fk_polo_legal_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    -- Foreign key to legal_documents
    CONSTRAINT fk_polo_legal_document
        FOREIGN KEY (legal_document_id)
        REFERENCES legal_documents(id)
        ON DELETE CASCADE
);

-- Comment on table
COMMENT ON TABLE product_owner_legal_documents IS 'Junction table linking product owners to legal documents (many-to-many)';

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Index on status for filtering queries
CREATE INDEX IF NOT EXISTS idx_legal_documents_status
    ON legal_documents(status);

-- Index on type for filtering queries
CREATE INDEX IF NOT EXISTS idx_legal_documents_type
    ON legal_documents(type);

-- Index on product_owner_id for junction table lookups
CREATE INDEX IF NOT EXISTS idx_polo_legal_product_owner
    ON product_owner_legal_documents(product_owner_id);

-- Index on legal_document_id for junction table lookups
CREATE INDEX IF NOT EXISTS idx_polo_legal_document
    ON product_owner_legal_documents(legal_document_id);

-- =============================================================================
-- Trigger: Auto-update updated_at
-- =============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_legal_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_legal_documents_updated_at ON legal_documents;
CREATE TRIGGER trigger_legal_documents_updated_at
    BEFORE UPDATE ON legal_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_legal_documents_updated_at();
```

### Blue Phase

**Agent**: coder-agent
**Task**: Refactor for quality and add rollback migration
**Changes**:
1. Add rollback migration script
2. Add documentation comments
3. Verify index naming consistency

**Files to create**: `backend/migrations/003_create_legal_documents_rollback.sql`

```sql
-- Rollback Migration: Drop Legal Documents Tables
-- Description: Removes legal_documents table and related objects
-- Author: coder-agent
-- Date: 2025-01-13

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_legal_documents_updated_at ON legal_documents;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_legal_documents_updated_at();

-- Drop indexes (will be dropped with tables, but explicit for clarity)
DROP INDEX IF EXISTS idx_polo_legal_document;
DROP INDEX IF EXISTS idx_polo_legal_product_owner;
DROP INDEX IF EXISTS idx_legal_documents_type;
DROP INDEX IF EXISTS idx_legal_documents_status;

-- Drop junction table first (has foreign keys to legal_documents)
DROP TABLE IF EXISTS product_owner_legal_documents;

-- Drop main table
DROP TABLE IF EXISTS legal_documents;
```

---

## Running the Migration

Execute the migration against the Phase 2 database:

```bash
# From backend directory
psql $DATABASE_URL_PHASE2 -f migrations/003_create_legal_documents.sql
```

## Verification

After running the migration, verify with:

```bash
# Run the schema tests
cd backend
pytest tests/test_legal_documents_schema.py -v
```

## Next Steps

Once the database schema is in place and all schema tests pass:
1. Proceed to Plan 03: Backend API Implementation
2. Create Pydantic models
3. Implement FastAPI routes
