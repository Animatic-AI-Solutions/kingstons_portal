# Plan 03: Backend API - FastAPI Routes and Pydantic Models

## Overview

This plan covers the FastAPI routes and Pydantic models for the Legal Documents API. The database schema from Plan 02 must be in place before implementing this plan.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/legal_documents` | Fetch documents with optional filters |
| POST | `/api/legal_documents` | Create new document |
| PUT | `/api/legal_documents/{id}` | Update existing document |
| PATCH | `/api/legal_documents/{id}/status` | Update document status only |
| DELETE | `/api/legal_documents/{id}` | Hard delete document |

---

## TDD Cycle 1: Pydantic Models

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing tests for Pydantic models
**Files to create**: `backend/tests/test_legal_document_models.py`

```python
"""
Test suite for Legal Document Pydantic Models

Tests all Pydantic models for the legal documents feature:
- LegalDocumentBase: Base model with validation
- LegalDocumentCreate: Creation model with product_owner_ids
- LegalDocumentUpdate: Update model with optional fields
- StatusUpdate: Status-only update model
- LegalDocument: Response model with all fields

Test Coverage:
- Field validation (type, status, notes length)
- Required vs optional fields
- Default values
- Type coercion
"""

import pytest
from datetime import date, datetime
from pydantic import ValidationError


class TestLegalDocumentBaseValidation:
    """Tests for LegalDocumentBase field validation."""

    def test_valid_document_type(self):
        """Test that valid document types are accepted."""
        from app.models.legal_document import LegalDocumentBase

        valid_types = ['Will', 'LPOA P&F', 'LPOA H&W', 'EPA', 'General Power of Attorney', 'Advance Directive']
        for doc_type in valid_types:
            doc = LegalDocumentBase(type=doc_type)
            assert doc.type == doc_type

    def test_custom_document_type_accepted(self):
        """Test that custom document types are accepted."""
        from app.models.legal_document import LegalDocumentBase

        doc = LegalDocumentBase(type='Custom: Family Trust Agreement')
        assert doc.type == 'Custom: Family Trust Agreement'

    def test_empty_type_rejected(self):
        """Test that empty type is rejected."""
        from app.models.legal_document import LegalDocumentBase

        with pytest.raises(ValidationError) as exc_info:
            LegalDocumentBase(type='')
        assert 'type' in str(exc_info.value)

    def test_type_whitespace_only_rejected(self):
        """Test that whitespace-only type is rejected."""
        from app.models.legal_document import LegalDocumentBase

        with pytest.raises(ValidationError) as exc_info:
            LegalDocumentBase(type='   ')
        assert 'type' in str(exc_info.value)

    def test_valid_status_values(self):
        """Test that valid status values are accepted."""
        from app.models.legal_document import LegalDocumentBase

        valid_statuses = ['Signed', 'Lapsed', 'Registered']
        for status in valid_statuses:
            doc = LegalDocumentBase(type='Will', status=status)
            assert doc.status == status

    def test_invalid_status_rejected(self):
        """Test that invalid status values are rejected."""
        from app.models.legal_document import LegalDocumentBase

        with pytest.raises(ValidationError) as exc_info:
            LegalDocumentBase(type='Will', status='InvalidStatus')
        assert 'status' in str(exc_info.value)

    def test_status_defaults_to_active(self):
        """Test that status defaults to 'Signed' if not provided."""
        from app.models.legal_document import LegalDocumentBase

        doc = LegalDocumentBase(type='Will')
        assert doc.status == 'Signed'

    def test_notes_max_length_2000(self):
        """Test that notes exceeding 2000 chars are rejected."""
        from app.models.legal_document import LegalDocumentBase

        long_notes = 'x' * 2001
        with pytest.raises(ValidationError) as exc_info:
            LegalDocumentBase(type='Will', notes=long_notes)
        assert 'notes' in str(exc_info.value)

    def test_notes_at_max_length_accepted(self):
        """Test that notes at exactly 2000 chars are accepted."""
        from app.models.legal_document import LegalDocumentBase

        max_notes = 'x' * 2000
        doc = LegalDocumentBase(type='Will', notes=max_notes)
        assert len(doc.notes) == 2000

    def test_notes_optional(self):
        """Test that notes field is optional."""
        from app.models.legal_document import LegalDocumentBase

        doc = LegalDocumentBase(type='Will')
        assert doc.notes is None

    def test_document_date_accepts_valid_date(self):
        """Test that valid dates are accepted."""
        from app.models.legal_document import LegalDocumentBase

        doc = LegalDocumentBase(type='Will', document_date='2024-01-15')
        assert doc.document_date == date(2024, 1, 15)

    def test_document_date_optional(self):
        """Test that document_date is optional."""
        from app.models.legal_document import LegalDocumentBase

        doc = LegalDocumentBase(type='Will')
        assert doc.document_date is None

    def test_document_date_invalid_format_rejected(self):
        """Test that invalid date formats are rejected."""
        from app.models.legal_document import LegalDocumentBase

        with pytest.raises(ValidationError):
            LegalDocumentBase(type='Will', document_date='invalid-date')


class TestLegalDocumentCreate:
    """Tests for LegalDocumentCreate model."""

    def test_requires_product_owner_ids(self):
        """Test that product_owner_ids is required."""
        from app.models.legal_document import LegalDocumentCreate

        with pytest.raises(ValidationError) as exc_info:
            LegalDocumentCreate(type='Will')
        assert 'product_owner_ids' in str(exc_info.value)

    def test_product_owner_ids_cannot_be_empty(self):
        """Test that product_owner_ids cannot be empty array."""
        from app.models.legal_document import LegalDocumentCreate

        with pytest.raises(ValidationError) as exc_info:
            LegalDocumentCreate(type='Will', product_owner_ids=[])
        assert 'product_owner_ids' in str(exc_info.value)

    def test_product_owner_ids_accepts_single_id(self):
        """Test that single product owner ID is accepted."""
        from app.models.legal_document import LegalDocumentCreate

        doc = LegalDocumentCreate(type='Will', product_owner_ids=[123])
        assert doc.product_owner_ids == [123]

    def test_product_owner_ids_accepts_multiple_ids(self):
        """Test that multiple product owner IDs are accepted."""
        from app.models.legal_document import LegalDocumentCreate

        doc = LegalDocumentCreate(type='Will', product_owner_ids=[123, 456, 789])
        assert doc.product_owner_ids == [123, 456, 789]

    def test_duplicate_product_owner_ids_rejected(self):
        """Test that duplicate product owner IDs are rejected."""
        from app.models.legal_document import LegalDocumentCreate

        with pytest.raises(ValidationError) as exc_info:
            LegalDocumentCreate(type='Will', product_owner_ids=[123, 123])
        assert 'duplicate' in str(exc_info.value).lower()

    def test_product_owner_ids_must_be_positive(self):
        """Test that product owner IDs must be positive integers."""
        from app.models.legal_document import LegalDocumentCreate

        with pytest.raises(ValidationError):
            LegalDocumentCreate(type='Will', product_owner_ids=[0])

        with pytest.raises(ValidationError):
            LegalDocumentCreate(type='Will', product_owner_ids=[-1])


class TestLegalDocumentUpdate:
    """Tests for LegalDocumentUpdate model."""

    def test_all_fields_optional(self):
        """Test that all fields are optional for updates."""
        from app.models.legal_document import LegalDocumentUpdate

        # Should not raise with no fields
        doc = LegalDocumentUpdate()
        assert doc.type is None
        assert doc.status is None
        assert doc.document_date is None
        assert doc.notes is None

    def test_partial_update_type_only(self):
        """Test partial update with only type field."""
        from app.models.legal_document import LegalDocumentUpdate

        doc = LegalDocumentUpdate(type='EPA')
        assert doc.type == 'EPA'
        assert doc.status is None

    def test_partial_update_status_only(self):
        """Test partial update with only status field."""
        from app.models.legal_document import LegalDocumentUpdate

        doc = LegalDocumentUpdate(status='Lapsed')
        assert doc.status == 'Lapsed'
        assert doc.type is None

    def test_validation_still_applies(self):
        """Test that validation applies to provided fields."""
        from app.models.legal_document import LegalDocumentUpdate

        with pytest.raises(ValidationError):
            LegalDocumentUpdate(status='InvalidStatus')

        with pytest.raises(ValidationError):
            LegalDocumentUpdate(notes='x' * 2001)


class TestStatusUpdate:
    """Tests for StatusUpdate model."""

    def test_status_required(self):
        """Test that status field is required."""
        from app.models.legal_document import StatusUpdate

        with pytest.raises(ValidationError):
            StatusUpdate()

    def test_valid_statuses_accepted(self):
        """Test that valid status values are accepted."""
        from app.models.legal_document import StatusUpdate

        for status in ['Signed', 'Lapsed', 'Registered']:
            update = StatusUpdate(status=status)
            assert update.status == status

    def test_invalid_status_rejected(self):
        """Test that invalid status values are rejected."""
        from app.models.legal_document import StatusUpdate

        with pytest.raises(ValidationError):
            StatusUpdate(status='InvalidStatus')


class TestLegalDocumentResponse:
    """Tests for LegalDocument response model."""

    def test_includes_all_fields(self):
        """Test that response model includes all required fields."""
        from app.models.legal_document import LegalDocument

        doc = LegalDocument(
            id=1,
            type='Will',
            status='Signed',
            document_date=date(2024, 1, 15),
            notes='Test notes',
            created_at=datetime.now(),
            updated_at=datetime.now(),
            product_owner_ids=[123, 456]
        )

        assert doc.id == 1
        assert doc.type == 'Will'
        assert doc.status == 'Signed'
        assert doc.document_date == date(2024, 1, 15)
        assert doc.notes == 'Test notes'
        assert doc.product_owner_ids == [123, 456]
        assert doc.created_at is not None
        assert doc.updated_at is not None

    def test_product_owner_ids_defaults_to_empty_list(self):
        """Test that product_owner_ids defaults to empty list."""
        from app.models.legal_document import LegalDocument

        doc = LegalDocument(
            id=1,
            type='Will',
            status='Signed',
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        assert doc.product_owner_ids == []


# =============================================================================
# Property-Based Tests (using Hypothesis)
# =============================================================================

from hypothesis import given, strategies as st, assume, settings
from hypothesis.strategies import composite


@composite
def valid_document_type(draw):
    """Generate valid document types (standard or custom)."""
    standard_types = ['Will', 'LPOA P&F', 'LPOA H&W', 'EPA', 'General Power of Attorney', 'Advance Directive']
    is_standard = draw(st.booleans())
    if is_standard:
        return draw(st.sampled_from(standard_types))
    else:
        # Custom type: non-empty string up to 100 chars
        custom = draw(st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_categories=['Cs'])))
        assume(custom.strip())  # Must not be whitespace-only
        return custom


@composite
def valid_notes(draw):
    """Generate valid notes (None or string up to 2000 chars)."""
    is_none = draw(st.booleans())
    if is_none:
        return None
    return draw(st.text(min_size=0, max_size=2000, alphabet=st.characters(blacklist_categories=['Cs'])))


@composite
def invalid_notes(draw):
    """Generate invalid notes (string > 2000 chars)."""
    return draw(st.text(min_size=2001, max_size=3000, alphabet=st.characters(blacklist_categories=['Cs'])))


class TestLegalDocumentBasePropertyBased:
    """Property-based tests for LegalDocumentBase validation."""

    @given(doc_type=valid_document_type())
    @settings(max_examples=50)
    def test_valid_types_always_accepted(self, doc_type):
        """Property: Any valid document type should be accepted."""
        from app.models.legal_document import LegalDocumentBase

        doc = LegalDocumentBase(type=doc_type)
        assert doc.type == doc_type.strip()

    @given(notes=valid_notes())
    @settings(max_examples=50)
    def test_valid_notes_always_accepted(self, notes):
        """Property: Notes up to 2000 chars should always be accepted."""
        from app.models.legal_document import LegalDocumentBase

        doc = LegalDocumentBase(type='Will', notes=notes)
        if notes is None:
            assert doc.notes is None
        else:
            assert len(doc.notes) <= 2000

    @given(notes=invalid_notes())
    @settings(max_examples=20)
    def test_notes_over_2000_always_rejected(self, notes):
        """Property: Notes over 2000 chars should always be rejected."""
        from app.models.legal_document import LegalDocumentBase

        with pytest.raises(ValidationError) as exc_info:
            LegalDocumentBase(type='Will', notes=notes)
        assert 'notes' in str(exc_info.value).lower()

    @given(status=st.text(min_size=1, max_size=50))
    @settings(max_examples=50)
    def test_invalid_status_always_rejected(self, status):
        """Property: Non-valid status values should always be rejected."""
        from app.models.legal_document import LegalDocumentBase

        assume(status not in ['Signed', 'Lapsed', 'Registered'])

        with pytest.raises(ValidationError) as exc_info:
            LegalDocumentBase(type='Will', status=status)
        assert 'status' in str(exc_info.value).lower()

    @given(doc_type=st.text(max_size=100))
    @settings(max_examples=50)
    def test_whitespace_only_type_always_rejected(self, doc_type):
        """Property: Whitespace-only types should always be rejected."""
        from app.models.legal_document import LegalDocumentBase

        assume(not doc_type.strip())  # Only whitespace or empty

        with pytest.raises(ValidationError):
            LegalDocumentBase(type=doc_type)

    @given(date_str=st.dates())
    @settings(max_examples=30)
    def test_valid_dates_always_accepted(self, date_str):
        """Property: Any valid date should be accepted."""
        from app.models.legal_document import LegalDocumentBase

        doc = LegalDocumentBase(type='Will', document_date=date_str)
        assert doc.document_date == date_str


class TestLegalDocumentCreatePropertyBased:
    """Property-based tests for LegalDocumentCreate validation."""

    @given(owner_ids=st.lists(st.integers(min_value=1, max_value=10000), min_size=1, max_size=10, unique=True))
    @settings(max_examples=50)
    def test_valid_owner_ids_always_accepted(self, owner_ids):
        """Property: Lists of unique positive integers should be accepted."""
        from app.models.legal_document import LegalDocumentCreate

        doc = LegalDocumentCreate(type='Will', product_owner_ids=owner_ids)
        assert doc.product_owner_ids == owner_ids

    @given(owner_ids=st.lists(st.integers(min_value=1, max_value=10000), min_size=2, max_size=10))
    @settings(max_examples=30)
    def test_duplicate_owner_ids_always_rejected(self, owner_ids):
        """Property: Duplicate owner IDs should always be rejected."""
        from app.models.legal_document import LegalDocumentCreate

        # Create duplicates
        assume(len(owner_ids) >= 2)
        duplicated = owner_ids + [owner_ids[0]]

        with pytest.raises(ValidationError) as exc_info:
            LegalDocumentCreate(type='Will', product_owner_ids=duplicated)
        assert 'duplicate' in str(exc_info.value).lower()

    @given(owner_id=st.integers(max_value=0))
    @settings(max_examples=30)
    def test_non_positive_owner_ids_always_rejected(self, owner_id):
        """Property: Non-positive owner IDs should always be rejected."""
        from app.models.legal_document import LegalDocumentCreate

        with pytest.raises(ValidationError):
            LegalDocumentCreate(type='Will', product_owner_ids=[owner_id])


class TestLegalDocumentUpdatePropertyBased:
    """Property-based tests for LegalDocumentUpdate validation."""

    @given(
        doc_type=st.one_of(st.none(), valid_document_type()),
        status=st.one_of(st.none(), st.sampled_from(['Signed', 'Lapsed', 'Registered'])),
        notes=st.one_of(st.none(), valid_notes()),
    )
    @settings(max_examples=50)
    def test_partial_updates_with_valid_fields_accepted(self, doc_type, status, notes):
        """Property: Partial updates with valid fields should be accepted."""
        from app.models.legal_document import LegalDocumentUpdate

        kwargs = {}
        if doc_type is not None:
            kwargs['type'] = doc_type
        if status is not None:
            kwargs['status'] = status
        if notes is not None:
            kwargs['notes'] = notes

        doc = LegalDocumentUpdate(**kwargs)

        # Verify fields are set correctly
        if doc_type is not None:
            assert doc.type == doc_type.strip()
        if status is not None:
            assert doc.status == status
```

### Green Phase

**Agent**: coder-agent
**Task**: Implement Pydantic models to pass tests
**Files to create**: `backend/app/models/legal_document.py`

```python
"""
Pydantic models for Legal Documents API.

This module defines the data models for managing legal documents
in the Kingston's Portal wealth management system.

Models:
- LegalDocumentBase: Base model with common fields and validation
- LegalDocumentCreate: Model for creating new legal documents
- LegalDocumentUpdate: Model for updating existing documents (all fields optional)
- StatusUpdate: Model for updating only the status field
- LegalDocument: Complete model returned from the API with database fields

Validation Rules:
- type: Required, 1-100 characters, cannot be empty/whitespace
- status: Must be "Signed", "Lapsed", or "Registered" (default: "Signed")
- document_date: Optional date field
- notes: Optional, max 2000 characters
- product_owner_ids: At least one required for create, must be positive integers
"""

from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, List, Union
from datetime import datetime, date


# Valid status values for legal documents
VALID_LEGAL_DOCUMENT_STATUSES = ["Signed", "Registered", "Lapsed"]

# Standard document types (custom types also allowed)
STANDARD_DOCUMENT_TYPES = [
    "Will",
    "LPOA P&F",
    "LPOA H&W",
    "EPA",
    "General Power of Attorney",
    "Advance Directive"
]


# =============================================================================
# Shared Validator Functions
# =============================================================================


def sanitize_string(v: str) -> str:
    """
    Sanitize a string by removing null bytes.
    PostgreSQL doesn't support null bytes (0x00) in text fields.
    """
    if v is None:
        return None
    if isinstance(v, str):
        return v.replace('\x00', '')
    return v


def validate_type_field(v: str, required: bool = True) -> str:
    """
    Validate the document type field.

    Args:
        v: The type value to validate
        required: Whether the field is required

    Returns:
        The trimmed and sanitized type string

    Raises:
        ValueError: If type is empty/whitespace when required, or exceeds max length
    """
    if v is None:
        if required:
            raise ValueError('Document type is required')
        return None

    if isinstance(v, str):
        if len(v) > 100:
            raise ValueError('Document type must be 100 characters or less')
        v = sanitize_string(v)
        stripped = v.strip()
        if not stripped:
            if required:
                raise ValueError('Document type cannot be empty or whitespace')
            return None
        return stripped
    return v


def validate_status_field(v: str, required: bool = True) -> str:
    """
    Validate the document status field.

    Args:
        v: The status value to validate
        required: Whether the field is required

    Returns:
        The validated status string

    Raises:
        ValueError: If status is not in VALID_LEGAL_DOCUMENT_STATUSES
    """
    if v is None:
        return None
    if v not in VALID_LEGAL_DOCUMENT_STATUSES:
        raise ValueError(
            f'Status must be one of: {", ".join(VALID_LEGAL_DOCUMENT_STATUSES)}'
        )
    return v


def validate_notes_field(v: str) -> Optional[str]:
    """
    Validate the notes field.

    Args:
        v: The notes value to validate

    Returns:
        The sanitized notes string or None

    Raises:
        ValueError: If notes exceed 2000 characters
    """
    if v is None:
        return None
    if isinstance(v, str):
        # Check length BEFORE sanitization to prevent bypass via null bytes
        if len(v) > 2000:
            raise ValueError('Notes must be 2000 characters or less')
        return sanitize_string(v)
    return v


# =============================================================================
# Base Model
# =============================================================================


class LegalDocumentBase(BaseModel):
    """
    Base model for legal document data with validation.

    Attributes:
        type: Document type (required, 1-100 chars)
        document_date: Date of the legal document (optional)
        status: Document status (default: "Signed")
        notes: Additional notes (optional, max 2000 chars)
    """
    type: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Document type (e.g., Will, LPOA P&F, custom type)"
    )
    document_date: Optional[Union[date, str]] = Field(
        default=None,
        description="Date of the legal document"
    )
    status: str = Field(
        default="Signed",
        description="Document status: Signed, Registered, or Lapsed"
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Additional notes about the document (max 2000 chars)"
    )

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('type', mode='before')
    @classmethod
    def validate_type(cls, v):
        """Validate that type is not empty or whitespace-only."""
        return validate_type_field(v, required=True)

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values."""
        return validate_status_field(v, required=True)

    @field_validator('document_date', mode='before')
    @classmethod
    def validate_document_date(cls, v):
        """Validate and convert document_date to date object."""
        if v == '' or v is None:
            return None
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
        return v

    @field_validator('notes', mode='before')
    @classmethod
    def validate_notes(cls, v):
        """Validate notes field."""
        return validate_notes_field(v)


# =============================================================================
# Create Model
# =============================================================================


class LegalDocumentCreate(LegalDocumentBase):
    """
    Model for creating a new legal document.

    Inherits all fields from LegalDocumentBase.
    Adds product_owner_ids as required field.
    """
    product_owner_ids: List[int] = Field(
        ...,
        min_length=1,
        description="At least one product owner ID required"
    )

    @field_validator('product_owner_ids')
    @classmethod
    def validate_product_owner_ids(cls, v):
        """Validate product owner IDs."""
        if not v or len(v) == 0:
            raise ValueError('At least one product owner ID is required')

        # Check for duplicates
        if len(v) != len(set(v)):
            raise ValueError('Duplicate product owner IDs not allowed')

        # Check all IDs are positive
        for id_val in v:
            if id_val <= 0:
                raise ValueError('Product owner IDs must be positive integers')

        return v


# =============================================================================
# Update Model
# =============================================================================


class LegalDocumentUpdate(BaseModel):
    """
    Model for updating an existing legal document.

    All fields are optional to support partial updates.
    """
    type: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="Document type"
    )
    document_date: Optional[Union[date, str]] = Field(
        default=None,
        description="Date of the legal document"
    )
    status: Optional[str] = Field(
        default=None,
        description="Document status: Signed, Registered, or Lapsed"
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Additional notes (max 2000 chars)"
    )
    product_owner_ids: Optional[List[int]] = Field(
        default=None,
        description="Product owner IDs to associate"
    )

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('type', mode='before')
    @classmethod
    def validate_type(cls, v):
        """Validate type if provided."""
        return validate_type_field(v, required=False)

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate status if provided."""
        return validate_status_field(v, required=False)

    @field_validator('document_date', mode='before')
    @classmethod
    def validate_document_date(cls, v):
        """Validate document_date if provided."""
        if v == '' or v is None:
            return None
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
        return v

    @field_validator('notes', mode='before')
    @classmethod
    def validate_notes(cls, v):
        """Validate notes if provided."""
        return validate_notes_field(v)


# =============================================================================
# Status Update Model
# =============================================================================


class StatusUpdate(BaseModel):
    """Model for updating only the status field."""
    status: str = Field(
        ...,
        description="Document status: Signed, Registered, or Lapsed"
    )

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values."""
        if v not in VALID_LEGAL_DOCUMENT_STATUSES:
            raise ValueError(
                f'Status must be one of: {", ".join(VALID_LEGAL_DOCUMENT_STATUSES)}'
            )
        return v


# =============================================================================
# Response Models
# =============================================================================


class LegalDocumentInDBBase(BaseModel):
    """Model representing legal document as stored in database."""
    id: int
    type: Optional[str] = None
    document_date: Optional[date] = None
    status: Optional[str] = "Signed"
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class LegalDocument(LegalDocumentInDBBase):
    """Complete legal document model returned to frontend."""
    product_owner_ids: List[int] = Field(
        default_factory=list,
        description="Associated product owner IDs"
    )
```

### Blue Phase

**Agent**: coder-agent
**Task**: Refactor for quality and consistency
**Changes**:
1. Add comprehensive docstrings
2. Ensure consistency with special_relationship.py patterns
3. Add type hints throughout

---

## TDD Cycle 2: API Routes

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing tests for API routes
**Files to create**: `backend/tests/test_legal_documents_routes.py`

```python
"""
Test suite for Legal Documents API Routes

Tests all API endpoints for managing legal documents in the Kingston's Portal system.

API Endpoints Under Test:
- GET /api/legal_documents?product_owner_id={id}
- POST /api/legal_documents
- PUT /api/legal_documents/{document_id}
- PATCH /api/legal_documents/{document_id}/status
- DELETE /api/legal_documents/{document_id}

Test Coverage:
- Validation tests (422 errors)
- Not found tests (404 errors)
- Success scenarios for all CRUD operations
- Product owner association management
"""

import pytest
import pytest_asyncio
from datetime import datetime, date, timedelta
from typing import Dict, Any, List
from fastapi.testclient import TestClient
import asyncpg

# Constants for testing
VALID_STATUSES = ["Signed", "Registered", "Lapsed"]
VALID_DOCUMENT_TYPES = [
    "Will", "LPOA P&F", "LPOA H&W", "EPA",
    "General Power of Attorney", "Advance Directive"
]


# =============================================================================
# Test Fixtures
# =============================================================================


@pytest_asyncio.fixture
async def db_connection():
    """
    Provides a PostgreSQL database connection for test setup/teardown.
    """
    from app.db.database import DATABASE_URL

    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)

    try:
        async with pool.acquire() as conn:
            yield conn
    finally:
        await pool.close()


@pytest_asyncio.fixture
async def test_product_owner(db_connection):
    """Creates a test product owner and returns its ID."""
    result = await db_connection.fetchrow(
        """
        INSERT INTO product_owners (firstname, surname, status)
        VALUES ($1, $2, $3)
        RETURNING id
        """,
        "Test",
        "Owner",
        "active"
    )
    product_owner_id = result['id']

    yield product_owner_id

    # Cleanup
    try:
        await db_connection.execute(
            'DELETE FROM product_owners WHERE id = $1',
            product_owner_id
        )
    except Exception as e:
        print(f"Error cleaning up product owner: {e}")


@pytest_asyncio.fixture
async def test_legal_document(db_connection, test_product_owner):
    """Creates a test legal document and returns its ID."""
    result = await db_connection.fetchrow(
        """
        INSERT INTO legal_documents (type, document_date, status, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        """,
        "Will",
        date(2024, 1, 15),
        "Signed",
        "Test document notes"
    )
    document_id = result['id']

    # Link to product owner
    await db_connection.execute(
        """
        INSERT INTO product_owner_legal_documents (product_owner_id, legal_document_id)
        VALUES ($1, $2)
        """,
        test_product_owner,
        document_id
    )

    yield document_id

    # Cleanup
    try:
        await db_connection.execute(
            'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
            document_id
        )
        await db_connection.execute(
            'DELETE FROM legal_documents WHERE id = $1',
            document_id
        )
    except Exception as e:
        print(f"Error cleaning up legal document: {e}")


@pytest.fixture
def auth_headers() -> Dict[str, str]:
    """Returns headers for API requests."""
    return {
        "Content-Type": "application/json"
    }


@pytest.fixture
def sample_legal_document_data(test_product_owner) -> Dict[str, Any]:
    """Returns valid data for creating a legal document."""
    return {
        "type": "Will",
        "document_date": "2024-06-15",
        "status": "Signed",
        "notes": "Last Will and Testament for John Doe",
        "product_owner_ids": [test_product_owner]
    }


# =============================================================================
# GET /api/legal_documents Tests
# =============================================================================


class TestGetLegalDocuments:
    """Tests for fetching legal documents."""

    @pytest.mark.asyncio
    async def test_get_all_documents_success(
        self, client: TestClient, auth_headers, test_legal_document
    ):
        """Test successfully fetching all documents."""
        response = client.get(
            "/api/legal_documents",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_documents_filter_by_product_owner(
        self, client: TestClient, auth_headers,
        test_product_owner, test_legal_document
    ):
        """Test filtering documents by product owner ID."""
        response = client.get(
            f"/api/legal_documents?product_owner_id={test_product_owner}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Verify document structure
        if len(data) > 0:
            document = data[0]
            assert "id" in document
            assert "type" in document
            assert "status" in document
            assert "document_date" in document
            assert "notes" in document
            assert "product_owner_ids" in document
            assert "created_at" in document
            assert "updated_at" in document
            assert test_product_owner in document["product_owner_ids"]

    @pytest.mark.asyncio
    async def test_get_documents_filter_by_type(
        self, client: TestClient, auth_headers, test_legal_document
    ):
        """Test filtering documents by type."""
        response = client.get(
            "/api/legal_documents?type=Will",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        for document in data:
            assert document["type"] == "Will"

    @pytest.mark.asyncio
    async def test_get_documents_filter_by_status(
        self, client: TestClient, auth_headers, test_legal_document
    ):
        """Test filtering documents by status."""
        response = client.get(
            "/api/legal_documents?status=Signed",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        for document in data:
            assert document["status"] == "Signed"


# =============================================================================
# POST /api/legal_documents Tests
# =============================================================================


class TestCreateLegalDocument:
    """Tests for creating new legal documents."""

    @pytest.mark.asyncio
    async def test_create_document_success(
        self, client: TestClient, auth_headers,
        sample_legal_document_data, db_connection
    ):
        """Test successfully creating a legal document."""
        response = client.post(
            "/api/legal_documents",
            json=sample_legal_document_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert data["type"] == sample_legal_document_data["type"]
        assert data["status"] == sample_legal_document_data["status"]
        assert data["notes"] == sample_legal_document_data["notes"]
        assert "created_at" in data
        assert "updated_at" in data
        assert data["product_owner_ids"] == sample_legal_document_data["product_owner_ids"]

        # Cleanup
        try:
            await db_connection.execute(
                'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
                data['id']
            )
            await db_connection.execute(
                'DELETE FROM legal_documents WHERE id = $1',
                data['id']
            )
        except Exception as e:
            print(f"Error cleaning up: {e}")

    @pytest.mark.asyncio
    async def test_create_document_with_custom_type(
        self, client: TestClient, auth_headers,
        sample_legal_document_data, db_connection
    ):
        """Test creating a document with custom type."""
        custom_data = sample_legal_document_data.copy()
        custom_data["type"] = "Custom: Family Trust Agreement"

        response = client.post(
            "/api/legal_documents",
            json=custom_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "Custom: Family Trust Agreement"

        # Cleanup
        try:
            await db_connection.execute(
                'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
                data['id']
            )
            await db_connection.execute(
                'DELETE FROM legal_documents WHERE id = $1',
                data['id']
            )
        except Exception as e:
            print(f"Error cleaning up: {e}")

    def test_create_document_returns_422_when_type_missing(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when type is missing."""
        invalid_data = sample_legal_document_data.copy()
        del invalid_data["type"]

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_create_document_returns_422_when_type_empty(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when type is empty string."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["type"] = ""

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_document_returns_422_when_status_invalid(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when status is invalid."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["status"] = "InvalidStatus"

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_document_returns_422_when_notes_too_long(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when notes exceed 2000 characters."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["notes"] = "x" * 2001

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_document_returns_422_when_product_owner_ids_empty(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 422 when product_owner_ids is empty."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["product_owner_ids"] = []

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_document_returns_404_for_nonexistent_product_owner(
        self, client: TestClient, auth_headers,
        sample_legal_document_data
    ):
        """Test returns 404 when product owner doesn't exist."""
        invalid_data = sample_legal_document_data.copy()
        invalid_data["product_owner_ids"] = [999999]

        response = client.post(
            "/api/legal_documents",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


# =============================================================================
# PUT /api/legal_documents/{document_id} Tests
# =============================================================================


class TestUpdateLegalDocument:
    """Tests for updating existing legal documents."""

    @pytest.mark.asyncio
    async def test_update_document_success(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test successfully updating a document."""
        update_data = {
            "type": "EPA",
            "notes": "Updated notes",
            "status": "Lapsed"
        }

        response = client.put(
            f"/api/legal_documents/{test_legal_document}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert data["type"] == update_data["type"]
        assert data["notes"] == update_data["notes"]
        assert data["status"] == update_data["status"]

    def test_update_document_returns_422_on_validation_error(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test returns 422 when update data fails validation."""
        invalid_data = {
            "notes": "x" * 2001  # Too long
        }

        response = client.put(
            f"/api/legal_documents/{test_legal_document}",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_update_document_returns_404_for_nonexistent_document(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when document doesn't exist."""
        nonexistent_id = 999999
        update_data = {"type": "Will"}

        response = client.put(
            f"/api/legal_documents/{nonexistent_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


# =============================================================================
# PATCH /api/legal_documents/{document_id}/status Tests
# =============================================================================


class TestUpdateDocumentStatus:
    """Tests for updating document status only."""

    @pytest.mark.asyncio
    async def test_update_status_to_lapsed_success(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test successfully updating status to Lapsed."""
        response = client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": "Lapsed"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Lapsed"

    @pytest.mark.asyncio
    async def test_update_status_to_active_success(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test successfully reactivating a document (status to Signed)."""
        # First lapse it
        client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": "Lapsed"},
            headers=auth_headers
        )

        # Then reactivate
        response = client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": "Signed"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Signed"

    def test_update_status_returns_422_for_invalid_status(
        self, client: TestClient, auth_headers,
        test_legal_document
    ):
        """Test returns 422 when status is invalid."""
        response = client.patch(
            f"/api/legal_documents/{test_legal_document}/status",
            json={"status": "InvalidStatus"},
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_update_status_returns_404_for_nonexistent_document(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when document doesn't exist."""
        nonexistent_id = 999999

        response = client.patch(
            f"/api/legal_documents/{nonexistent_id}/status",
            json={"status": "Signed"},
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


# =============================================================================
# DELETE /api/legal_documents/{document_id} Tests
# =============================================================================


class TestDeleteLegalDocument:
    """Tests for hard-deleting legal documents."""

    @pytest.mark.asyncio
    async def test_delete_document_success(
        self, client: TestClient, auth_headers,
        db_connection, test_product_owner
    ):
        """Test successfully hard-deleting a document."""
        # Create a document to delete
        result = await db_connection.fetchrow(
            """
            INSERT INTO legal_documents (type, status)
            VALUES ($1, $2)
            RETURNING id
            """,
            "Will",
            "Signed"
        )
        document_id = result['id']

        # Link to product owner
        await db_connection.execute(
            """
            INSERT INTO product_owner_legal_documents (product_owner_id, legal_document_id)
            VALUES ($1, $2)
            """,
            test_product_owner,
            document_id
        )

        # Delete the document
        response = client.delete(
            f"/api/legal_documents/{document_id}",
            headers=auth_headers
        )

        assert response.status_code == 204
        assert response.content == b""

        # Verify record is hard-deleted
        count = await db_connection.fetchval(
            "SELECT COUNT(*) FROM legal_documents WHERE id = $1",
            document_id
        )
        assert count == 0

        # Verify junction table entry is also deleted
        junction_count = await db_connection.fetchval(
            "SELECT COUNT(*) FROM product_owner_legal_documents WHERE legal_document_id = $1",
            document_id
        )
        assert junction_count == 0

    def test_delete_document_returns_404_for_nonexistent_document(
        self, client: TestClient, auth_headers
    ):
        """Test returns 404 when document doesn't exist."""
        nonexistent_id = 999999

        response = client.delete(
            f"/api/legal_documents/{nonexistent_id}",
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
```

### Green Phase

**Agent**: coder-agent
**Task**: Implement FastAPI routes to pass tests
**Files to create**: `backend/app/api/routes/legal_documents.py`

```python
"""
FastAPI routes for Legal Documents API.

Provides CRUD operations for legal documents in the Kingston's Portal system.

API Endpoints:
- GET /api/legal_documents - Fetch documents with optional filters
- POST /api/legal_documents - Create new document
- PUT /api/legal_documents/{document_id} - Update existing document
- PATCH /api/legal_documents/{document_id}/status - Update document status
- DELETE /api/legal_documents/{document_id} - Hard delete document
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Response, status
from typing import List, Optional
import logging
from ...db.database import get_db
from ...utils.security import get_current_user
from ...models.legal_document import (
    LegalDocument,
    LegalDocumentCreate,
    LegalDocumentUpdate,
    StatusUpdate
)

router = APIRouter()
logger = logging.getLogger(__name__)


# =============================================================================
# Error Message Sanitization
# =============================================================================

def sanitize_error_message(error: Exception) -> str:
    """
    Sanitize error messages to prevent leaking internal details.

    In production, this returns generic messages.
    Internal details are logged but not exposed to clients.
    """
    # Log the actual error for debugging
    logger.error(f"Internal error details: {str(error)}")

    # Return generic message - never expose raw database/system errors
    return "An unexpected error occurred. Please try again or contact support."


@router.get('/legal_documents', response_model=List[LegalDocument])
async def get_legal_documents(
    client_group_id: Optional[int] = Query(None, description="Filter by client group ID (finds documents linked to any product owner in this group)"),
    product_owner_ids: Optional[str] = Query(None, description="Comma-separated product owner IDs to filter by (documents linked to ANY of these owners)"),
    type: Optional[str] = Query(None, description="Filter by document type"),
    status: Optional[str] = Query(None, description="Filter by status (Signed/Registered/Lapsed)"),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Retrieve legal documents with optional filtering.

    Requires authentication via JWT token.

    Legal documents are linked to client groups indirectly through product owners.
    Use client_group_id for the most common query pattern (gets all documents for a client group).
    Use product_owner_ids for more specific filtering.

    Query Parameters:
    - client_group_id: Filter by client group (joins through product_owners table)
    - product_owner_ids: Comma-separated list of product owner IDs (e.g., "1,2,3")
    - type: Filter by document type (e.g., Will, LPOA P&F)
    - status: Filter by Signed, Registered, or Lapsed status
    """
    try:
        logger.info(f'Fetching legal documents with filters: client_group_id={client_group_id}, product_owner_ids={product_owner_ids}, type={type}, status={status}')

        # Authorization check for client_group_id if provided
        if client_group_id is not None:
            has_access = await db.fetchval(
                """
                SELECT EXISTS(
                    SELECT 1 FROM client_groups cg
                    WHERE cg.id = $1
                    AND (cg.advisor_id = $2 OR $3 = TRUE)
                )
                """,
                client_group_id,
                current_user.id,
                current_user.is_admin
            )
            if not has_access:
                raise HTTPException(
                    status_code=403,
                    detail='Access denied: You do not have permission to access this client group'
                )

        # Build WHERE conditions
        where_conditions = []
        params = []
        param_count = 0

        # Base query with join to junction table and product_owners for client group filtering
        base_query = """
            SELECT DISTINCT ld.*
            FROM legal_documents ld
            LEFT JOIN product_owner_legal_documents pold ON ld.id = pold.legal_document_id
            LEFT JOIN product_owners po ON pold.product_owner_id = po.id
        """

        # Filter by client_group_id (joins through product_owners)
        if client_group_id is not None:
            param_count += 1
            where_conditions.append(f'po.client_group_id = ${param_count}')
            params.append(client_group_id)

        # Filter by product owner IDs (alternative/additional filter)
        if product_owner_ids is not None:
            po_id_list = [int(id.strip()) for id in product_owner_ids.split(',') if id.strip()]
            if po_id_list:
                param_count += 1
                where_conditions.append(f'pold.product_owner_id = ANY(${param_count})')
                params.append(po_id_list)

        if type:
            param_count += 1
            where_conditions.append(f'ld.type = ${param_count}')
            params.append(type)

        if status:
            param_count += 1
            where_conditions.append(f'ld.status = ${param_count}')
            params.append(status)

        # Build WHERE clause
        where_clause = ''
        if where_conditions:
            where_clause = 'WHERE ' + ' AND '.join(where_conditions)

        query = f'{base_query} {where_clause} ORDER BY ld.created_at DESC'

        logger.info(f'Executing query: {query}')
        logger.info(f'Query params: {params}')

        result = await db.fetch(query, *params)
        logger.info(f'Query returned {len(result)} legal documents')

        # For each document, fetch associated product owner IDs
        documents = []
        for row in result:
            doc_dict = dict(row)

            # Fetch product owner IDs for this document
            po_ids = await db.fetch(
                'SELECT product_owner_id FROM product_owner_legal_documents WHERE legal_document_id = $1',
                row['id']
            )
            doc_dict['product_owner_ids'] = [po['product_owner_id'] for po in po_ids]

            documents.append(doc_dict)

        return documents

    except Exception as e:
        logger.error(f'Error fetching legal documents: {str(e)}')
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


@router.post('/legal_documents', response_model=LegalDocument, status_code=status.HTTP_201_CREATED)
async def create_legal_document(
    document: LegalDocumentCreate,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Create a new legal document and link it to product owners.

    Requires authentication via JWT token.

    Legal documents are linked to client groups indirectly through product owners.
    The product_owner_ids determine which client group the document belongs to.

    Request Body:
    - Must include at least one product_owner_id
    - type is required
    - status defaults to 'Signed' if not provided
    """
    try:
        logger.info(f'Creating new legal document: {document.model_dump()}')

        # Authorization check: Verify user has access to ALL specified product owners
        # Product owners must belong to client groups the user is authorized to access
        for po_id in document.product_owner_ids:
            has_access = await db.fetchval(
                """
                SELECT EXISTS(
                    SELECT 1 FROM product_owners po
                    JOIN client_groups cg ON po.client_group_id = cg.id
                    WHERE po.id = $1
                    AND (cg.advisor_id = $2 OR $3 = TRUE)
                )
                """,
                po_id,
                current_user.id,
                current_user.is_admin
            )
            if not has_access:
                raise HTTPException(
                    status_code=403,
                    detail=f'Access denied: You do not have permission to access product owner {po_id}'
                )

        # Verify all product owners exist
        for po_id in document.product_owner_ids:
            po_exists = await db.fetchval(
                'SELECT EXISTS(SELECT 1 FROM product_owners WHERE id = $1)',
                po_id
            )
            if not po_exists:
                raise HTTPException(
                    status_code=404,
                    detail=f'Product owner with ID {po_id} not found'
                )

        # Use transaction for multi-table operation to ensure data integrity
        async with db.transaction():
            # Create the legal document
            result = await db.fetchrow(
                """
                INSERT INTO legal_documents (type, document_date, status, notes)
                VALUES ($1, $2, $3, $4)
                RETURNING *
                """,
                document.type,
                document.document_date,
                document.status,
                document.notes
            )

            if not result:
                raise HTTPException(
                    status_code=500,
                    detail='Failed to create legal document - no data returned from insert'
                )

            document_id = result['id']
            logger.info(f"Created legal document ID: {document_id}")

            # Create junction table entries (within same transaction)
            for po_id in document.product_owner_ids:
                await db.execute(
                    """
                    INSERT INTO product_owner_legal_documents (product_owner_id, legal_document_id)
                    VALUES ($1, $2)
                    """,
                    po_id,
                    document_id
                )
                logger.info(f"Linked legal document {document_id} to product owner {po_id}")

        # Return the created document with product owner IDs
        doc_dict = dict(result)
        doc_dict['product_owner_ids'] = document.product_owner_ids

        return doc_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating legal document: {str(e)}')
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


@router.put('/legal_documents/{document_id}', response_model=LegalDocument)
async def update_legal_document(
    document_update: LegalDocumentUpdate,
    document_id: int = Path(..., description='The ID of the legal document to update'),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Update an existing legal document.

    Requires authentication via JWT token.

    Path Parameters:
    - document_id: The ID of the document to update

    Request Body:
    - Any fields from LegalDocumentUpdate model
    """
    try:
        logger.info(f'Updating legal document {document_id} with data: {document_update.model_dump()}')

        # Check if document exists
        existing = await db.fetchrow(
            'SELECT * FROM legal_documents WHERE id = $1',
            document_id
        )

        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f'Legal document with ID {document_id} not found'
            )

        # Authorization check: Verify user has access to this document
        # User must have access to at least one of the document's current product owners
        existing_po_ids = await db.fetch(
            'SELECT product_owner_id FROM product_owner_legal_documents WHERE legal_document_id = $1',
            document_id
        )

        if existing_po_ids:
            has_access = await db.fetchval(
                """
                SELECT EXISTS(
                    SELECT 1 FROM product_owners po
                    JOIN client_groups cg ON po.client_group_id = cg.id
                    WHERE po.id = ANY($1)
                    AND (cg.advisor_id = $2 OR $3 = TRUE)
                )
                """,
                [po['product_owner_id'] for po in existing_po_ids],
                current_user.id,
                current_user.is_admin
            )
            if not has_access:
                raise HTTPException(
                    status_code=403,
                    detail='Access denied: You do not have permission to modify this document'
                )

        # Get update data (only fields that were set)
        update_data = document_update.model_dump(exclude_unset=True)

        # Handle product_owner_ids separately if provided
        product_owner_ids = update_data.pop('product_owner_ids', None)

        # Authorization check for new product_owner_ids if provided
        if product_owner_ids is not None:
            for po_id in product_owner_ids:
                has_access = await db.fetchval(
                    """
                    SELECT EXISTS(
                        SELECT 1 FROM product_owners po
                        JOIN client_groups cg ON po.client_group_id = cg.id
                        WHERE po.id = $1
                        AND (cg.advisor_id = $2 OR $3 = TRUE)
                    )
                    """,
                    po_id,
                    current_user.id,
                    current_user.is_admin
                )
                if not has_access:
                    raise HTTPException(
                        status_code=403,
                        detail=f'Access denied: You do not have permission to access product owner {po_id}'
                    )

        if not update_data and product_owner_ids is None:
            # No updates, return existing document
            doc_dict = dict(existing)
            doc_dict['product_owner_ids'] = [po['product_owner_id'] for po in existing_po_ids]
            return doc_dict

        # Use transaction for multi-table operation to ensure data integrity
        async with db.transaction():
            # Update document fields if any
            if update_data:
                set_clauses = [f'{col} = ${i + 2}' for i, col in enumerate(update_data.keys())]
                values = [document_id] + list(update_data.values())

                query = f"""
                    UPDATE legal_documents
                    SET {', '.join(set_clauses)}
                    WHERE id = $1
                    RETURNING *
                """

                result = await db.fetchrow(query, *values)

                if not result:
                    raise HTTPException(status_code=500, detail='Failed to update legal document')
            else:
                result = existing

            logger.info(f"Updated legal document {document_id}")

            # Update product owner associations if provided (within same transaction)
            if product_owner_ids is not None:
                # Verify all product owners exist
                for po_id in product_owner_ids:
                    po_exists = await db.fetchval(
                        'SELECT EXISTS(SELECT 1 FROM product_owners WHERE id = $1)',
                        po_id
                    )
                    if not po_exists:
                        raise HTTPException(
                            status_code=404,
                            detail=f'Product owner with ID {po_id} not found'
                        )

                # Delete existing associations
                await db.execute(
                    'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
                    document_id
                )

                # Create new associations
                for po_id in product_owner_ids:
                    await db.execute(
                        """
                        INSERT INTO product_owner_legal_documents (product_owner_id, legal_document_id)
                        VALUES ($1, $2)
                        """,
                        po_id,
                        document_id
                    )

        # Get current product owner IDs
        po_ids = await db.fetch(
            'SELECT product_owner_id FROM product_owner_legal_documents WHERE legal_document_id = $1',
            document_id
        )

        doc_dict = dict(result)
        doc_dict['product_owner_ids'] = [po['product_owner_id'] for po in po_ids]

        return doc_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating legal document {document_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


@router.patch('/legal_documents/{document_id}/status', response_model=LegalDocument)
async def update_document_status(
    status_update: StatusUpdate,
    document_id: int = Path(..., description='The ID of the legal document to update'),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Update only the status of a legal document.

    Requires authentication via JWT token.

    Path Parameters:
    - document_id: The ID of the document to update

    Request Body:
    - status: Must be "Signed", "Lapsed", or "Registered"
    """
    try:
        logger.info(f'Updating status for legal document {document_id} to {status_update.status}')

        # Check if document exists
        existing = await db.fetchrow(
            'SELECT * FROM legal_documents WHERE id = $1',
            document_id
        )

        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f'Legal document with ID {document_id} not found'
            )

        # Update status
        result = await db.fetchrow(
            """
            UPDATE legal_documents
            SET status = $2
            WHERE id = $1
            RETURNING *
            """,
            document_id,
            status_update.status
        )

        if not result:
            raise HTTPException(status_code=500, detail='Failed to update document status')

        logger.info(f"Updated status for legal document {document_id}")

        # Get product owner IDs
        po_ids = await db.fetch(
            'SELECT product_owner_id FROM product_owner_legal_documents WHERE legal_document_id = $1',
            document_id
        )

        doc_dict = dict(result)
        doc_dict['product_owner_ids'] = [po['product_owner_id'] for po in po_ids]

        return doc_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating document status {document_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


@router.delete('/legal_documents/{document_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_legal_document(
    document_id: int = Path(..., description='The ID of the legal document to delete'),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Hard delete a legal document and all its associations.

    Requires authentication via JWT token.

    Path Parameters:
    - document_id: The ID of the document to delete

    This will:
    1. Delete all junction table entries (product_owner_legal_documents)
    2. Delete the legal document record
    """
    try:
        logger.info(f'Deleting legal document with ID: {document_id}')

        # Check if document exists
        existing = await db.fetchrow(
            'SELECT * FROM legal_documents WHERE id = $1',
            document_id
        )

        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f'Legal document with ID {document_id} not found'
            )

        # Delete junction table entries first (foreign key constraint)
        logger.info(f'Deleting junction table entries for legal document {document_id}')
        await db.execute(
            'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
            document_id
        )
        logger.info(f'Successfully deleted junction table entries for legal document {document_id}')

        # Delete the legal document record
        logger.info(f'Deleting legal document record {document_id}')
        await db.execute(
            'DELETE FROM legal_documents WHERE id = $1',
            document_id
        )
        logger.info(f'Successfully deleted legal document {document_id}')

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting legal document {document_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))
```

### Blue Phase

**Agent**: coder-agent
**Task**: Refactor and register routes
**Changes**:
1. Add route registration in `backend/app/api/routes/__init__.py`
2. Add comprehensive logging
3. Ensure error handling consistency

**Add to `backend/app/api/routes/__init__.py`**:

```python
from .legal_documents import router as legal_documents_router

# In the router setup section:
app.include_router(legal_documents_router, prefix="/api", tags=["Legal Documents"])
```

---

## Running Tests

```bash
# Run all backend tests
cd backend
pytest tests/test_legal_document_models.py tests/test_legal_documents_routes.py -v

# Run with coverage
pytest tests/test_legal_document_models.py tests/test_legal_documents_routes.py --cov=app --cov-report=term-missing
```

## Next Steps

Once all backend tests pass:
1. Proceed to Plan 04: Frontend TypeScript Interfaces and API Service
2. The backend API will be available for frontend development
