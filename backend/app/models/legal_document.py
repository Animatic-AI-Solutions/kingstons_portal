"""
Pydantic models for Legal Documents feature.

Models:
- LegalDocumentBase: Base model with validation for type, status, document_date, notes
- LegalDocumentCreate: Creation model requiring product_owner_ids
- LegalDocumentUpdate: Update model with all fields optional
- StatusUpdate: Status-only update model
- LegalDocument: Response model with all fields including timestamps
"""

from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, List, Union
from datetime import datetime, date


# Valid status values for legal documents
VALID_STATUSES = ["Signed", "Registered", "Lapsed"]


class LegalDocumentBase(BaseModel):
    """Base model for legal document data with validation."""

    type: str = Field(..., max_length=100, description="Type of legal document")
    document_date: Optional[Union[date, str]] = Field(default=None, description="Date of the document")
    status: str = Field(default="Signed", description="Status: Signed, Registered, or Lapsed")
    notes: Optional[str] = Field(default=None, max_length=2000, description="Additional notes")

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('type', mode='before')
    @classmethod
    def validate_type(cls, v):
        """Validate that type is not empty or whitespace only, strip whitespace."""
        if v is None:
            raise ValueError('Type is required')
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError('Type cannot be empty')
            return stripped
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values."""
        if v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
        return v

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


class LegalDocumentCreate(LegalDocumentBase):
    """Model for creating a new legal document."""

    product_owner_ids: List[int] = Field(
        ...,
        min_length=1,
        description="At least one product owner ID required"
    )

    @field_validator('product_owner_ids')
    @classmethod
    def validate_product_owner_ids(cls, v):
        """Validate product owner IDs: at least one, unique, all positive."""
        if not v or len(v) == 0:
            raise ValueError('At least one product owner ID is required')

        # Check for duplicates
        if len(v) != len(set(v)):
            raise ValueError('Duplicate product owner IDs not allowed')

        # Check all IDs are positive
        for owner_id in v:
            if owner_id <= 0:
                raise ValueError('Product owner IDs must be positive integers')

        return v


class LegalDocumentUpdate(BaseModel):
    """Model for updating an existing legal document - all fields optional."""

    type: Optional[str] = Field(default=None, max_length=100)
    document_date: Optional[Union[date, str]] = None
    status: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=2000)
    product_owner_ids: Optional[List[int]] = None

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        """Validate that type is not empty or whitespace only when provided."""
        if v is not None:
            if not v or not v.strip():
                raise ValueError('Type cannot be empty')
            return v.strip()
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values when provided."""
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
        return v

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

    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        """Validate notes length."""
        if v is not None and len(v) > 2000:
            raise ValueError('Notes cannot exceed 2000 characters')
        return v

    @field_validator('product_owner_ids')
    @classmethod
    def validate_product_owner_ids(cls, v):
        """Validate product owner IDs when provided."""
        if v is not None:
            if len(v) != len(set(v)):
                raise ValueError('Duplicate product owner IDs not allowed')
            for owner_id in v:
                if owner_id <= 0:
                    raise ValueError('Product owner IDs must be positive integers')
        return v


class StatusUpdate(BaseModel):
    """Model for updating only the status field."""

    status: str = Field(..., description="Status: Signed, Registered, or Lapsed")

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values."""
        if v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
        return v


class LegalDocument(BaseModel):
    """Complete legal document model returned to frontend."""

    id: int
    type: str
    document_date: Optional[date] = None
    status: Optional[str] = Field(default="Signed")
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    product_owner_ids: List[int] = Field(default_factory=list, description="Associated product owners")

    model_config = ConfigDict(
        from_attributes=True
    )
