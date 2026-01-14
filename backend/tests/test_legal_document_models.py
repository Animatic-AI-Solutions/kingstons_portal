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

    def test_status_defaults_to_signed(self):
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


@composite
def whitespace_only_string(draw):
    """Generate strings that are empty or contain only whitespace."""
    # Whitespace characters: space, tab, newline, carriage return
    whitespace_chars = ' \t\n\r'
    length = draw(st.integers(min_value=0, max_value=100))
    if length == 0:
        return ''
    return draw(st.text(min_size=length, max_size=length, alphabet=whitespace_chars))


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

    @given(doc_type=whitespace_only_string())
    @settings(max_examples=50)
    def test_whitespace_only_type_always_rejected(self, doc_type):
        """Property: Whitespace-only types should always be rejected."""
        from app.models.legal_document import LegalDocumentBase

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
