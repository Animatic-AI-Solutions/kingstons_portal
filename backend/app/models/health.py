"""
Pydantic models for Health Product Owners API.

This module defines the data models for managing health records associated with product owners
in the Kingston's Portal wealth management system.

Models:
- HealthProductOwnerBase: Base model with common fields and validation
- HealthProductOwnerCreate: Model for creating new health records
- HealthProductOwnerUpdate: Model for updating existing health records (all fields optional)
- HealthProductOwner: Complete model returned from the API with database fields

Validation Rules:
- product_owner_id: Must be positive integer (> 0)
- condition: Required, 1-255 characters, cannot be empty/whitespace
- status: Must be one of "Active", "Resolved", "Monitoring", "Inactive"
- date_of_diagnosis: Optional, cannot be in the future
- name, medication, notes: Optional string fields
"""

from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, Union
from datetime import datetime, date
from enum import Enum


# Valid status values for health conditions
VALID_HEALTH_STATUSES = ["Active", "Resolved", "Monitoring", "Inactive"]


# =============================================================================
# Shared Validator Functions
# =============================================================================


def sanitize_string(v: str) -> str:
    """
    Sanitize a string by removing null bytes.

    PostgreSQL doesn't support null bytes (0x00) in text fields,
    so we strip them to prevent database errors.

    Args:
        v: The string value to sanitize

    Returns:
        The sanitized string with null bytes removed
    """
    if v is None:
        return None
    if isinstance(v, str):
        return v.replace('\x00', '')
    return v


def validate_condition_field(v: str, required: bool = True) -> str:
    """
    Shared validator for condition field.

    Args:
        v: The condition value to validate
        required: Whether the field is required (True for create, False for update)

    Returns:
        The trimmed and sanitized condition string, or None for optional empty values

    Raises:
        ValueError: If condition is empty/whitespace when required, or exceeds max length
    """
    if v is None:
        if required:
            raise ValueError('Condition is required')
        return None
    if isinstance(v, str):
        v = sanitize_string(v)
        stripped = v.strip()
        if not stripped:
            if required:
                raise ValueError('Condition cannot be empty or whitespace')
            return None
        if len(stripped) > 255:
            raise ValueError('Condition must be 255 characters or less')
        return stripped
    return v


def validate_status_field(v: str, required: bool = True) -> str:
    """
    Shared validator for status field.

    Args:
        v: The status value to validate
        required: Whether the field is required

    Returns:
        The validated status string

    Raises:
        ValueError: If status is not in VALID_HEALTH_STATUSES
    """
    if v is None:
        return None
    if v not in VALID_HEALTH_STATUSES:
        raise ValueError(f'Status must be one of: {", ".join(VALID_HEALTH_STATUSES)}')
    return v


def validate_date_of_diagnosis_field(v: Union[date, str, None]) -> Optional[date]:
    """
    Shared validator for date_of_diagnosis field.

    Validates date format and ensures it's not in the future.

    Args:
        v: The date value to validate (can be string, date, or None)

    Returns:
        A date object or None

    Raises:
        ValueError: If date format is invalid or date is in the future
    """
    if v == '' or v is None:
        return None

    # Convert string to date if needed
    if isinstance(v, str):
        try:
            date_obj = date.fromisoformat(v)
        except ValueError:
            raise ValueError('Invalid date format. Use YYYY-MM-DD')
        v = date_obj

    # Check if date is in the future
    if v and v > date.today():
        raise ValueError('Date of diagnosis cannot be in the future')

    return v


def sanitize_text_field(v: str) -> Optional[str]:
    """
    Shared sanitizer for optional text fields.

    Removes null bytes which PostgreSQL doesn't support.

    Args:
        v: The text value to sanitize

    Returns:
        The sanitized text or None
    """
    if v is None:
        return None
    if isinstance(v, str):
        return sanitize_string(v)
    return v


class HealthStatus(str, Enum):
    """Enumeration of valid health record statuses."""
    ACTIVE = "Active"
    RESOLVED = "Resolved"
    MONITORING = "Monitoring"
    INACTIVE = "Inactive"


class HealthProductOwnerBase(BaseModel):
    """
    Base model for health product owner data with validation.

    Attributes:
        product_owner_id: Foreign key reference to product_owners table (required, must be > 0)
        condition: Type of health condition (required, 1-255 chars)
        name: Descriptive name for the condition (optional)
        date_of_diagnosis: Date when condition was diagnosed (optional, must not be future)
        status: Current status of the condition (default: "Active")
        medication: Current medications for this condition (optional)
        notes: Additional notes about the condition (optional)
    """
    product_owner_id: int = Field(
        ...,
        gt=0,
        description="Foreign key to product_owners table (must be positive)"
    )
    condition: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Type of health condition (required, 1-255 chars)"
    )
    name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Descriptive name for the condition"
    )
    date_of_diagnosis: Optional[Union[date, str]] = Field(
        default=None,
        description="Date when condition was diagnosed (YYYY-MM-DD, cannot be future)"
    )
    status: str = Field(
        default="Active",
        description="Status: Active, Resolved, Monitoring, or Inactive"
    )
    medication: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Current medications for this condition"
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Additional notes about the condition"
    )

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('condition', mode='before')
    @classmethod
    def validate_condition(cls, v):
        """Validate that condition is not empty or whitespace-only."""
        return validate_condition_field(v, required=True)

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values."""
        return validate_status_field(v, required=True)

    @field_validator('date_of_diagnosis', mode='before')
    @classmethod
    def validate_date_of_diagnosis(cls, v):
        """Validate date of diagnosis format and ensure it's not in the future."""
        return validate_date_of_diagnosis_field(v)

    @field_validator('name', 'medication', 'notes', mode='before')
    @classmethod
    def sanitize_text_fields(cls, v):
        """Sanitize optional text fields by removing null bytes."""
        return sanitize_text_field(v)


class HealthProductOwnerCreate(HealthProductOwnerBase):
    """
    Model for creating a new health record.

    Inherits all fields and validation from HealthProductOwnerBase.
    Used for POST requests to create new health records.
    """
    pass


class HealthProductOwnerUpdate(BaseModel):
    """
    Model for updating an existing health record.

    All fields are optional to support partial updates (PATCH-like behavior).
    Only fields provided in the request will be updated.

    Attributes:
        condition: Type of health condition (1-255 chars if provided)
        name: Descriptive name for the condition
        date_of_diagnosis: Date when condition was diagnosed (must not be future)
        status: Current status (must be valid enum value if provided)
        medication: Current medications for this condition
        notes: Additional notes about the condition
    """
    condition: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Type of health condition"
    )
    name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Descriptive name for the condition"
    )
    date_of_diagnosis: Optional[Union[date, str]] = Field(
        default=None,
        description="Date when condition was diagnosed (YYYY-MM-DD)"
    )
    status: Optional[str] = Field(
        default=None,
        description="Status: Active, Resolved, Monitoring, or Inactive"
    )
    medication: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Current medications for this condition"
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Additional notes about the condition"
    )

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('condition', mode='before')
    @classmethod
    def validate_condition(cls, v):
        """Validate condition if provided - cannot be empty/whitespace."""
        return validate_condition_field(v, required=False)

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate status if provided - must be valid enum value."""
        return validate_status_field(v, required=False)

    @field_validator('date_of_diagnosis', mode='before')
    @classmethod
    def validate_date_of_diagnosis(cls, v):
        """Validate date of diagnosis if provided - must not be future."""
        return validate_date_of_diagnosis_field(v)

    @field_validator('name', 'medication', 'notes', mode='before')
    @classmethod
    def sanitize_text_fields(cls, v):
        """Sanitize optional text fields by removing null bytes."""
        return sanitize_text_field(v)


class HealthProductOwnerInDBBase(BaseModel):
    """
    Model representing health record as stored in database.

    Includes auto-generated fields like id and created_at.
    """
    id: int
    product_owner_id: int
    condition: Optional[str] = None
    name: Optional[str] = None
    date_of_diagnosis: Optional[date] = None
    status: Optional[str] = "Active"
    medication: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    date_recorded: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class HealthProductOwner(HealthProductOwnerInDBBase):
    """
    Complete health product owner model returned to frontend.

    Includes all database fields plus any computed fields.
    Used as the response model for API endpoints.
    """
    pass


# =============================================================================
# Health Special Relationships Models
# =============================================================================


class HealthSpecialRelationshipBase(BaseModel):
    """
    Base model for health special relationship data with validation.

    Attributes:
        special_relationship_id: Foreign key reference to special_relationships table (required, must be > 0)
        condition: Type of health condition (required, 1-255 chars)
        name: Descriptive name for the condition (optional)
        date_of_diagnosis: Date when condition was diagnosed (optional, must not be future)
        status: Current status of the condition (default: "Active")
        medication: Current medications for this condition (optional)
        notes: Additional notes about the condition (optional)
    """
    special_relationship_id: int = Field(
        ...,
        gt=0,
        description="Foreign key to special_relationships table (must be positive)"
    )
    condition: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Type of health condition (required, 1-255 chars)"
    )
    name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Descriptive name for the condition"
    )
    date_of_diagnosis: Optional[Union[date, str]] = Field(
        default=None,
        description="Date when condition was diagnosed (YYYY-MM-DD, cannot be future)"
    )
    status: str = Field(
        default="Active",
        description="Status: Active, Resolved, Monitoring, or Inactive"
    )
    medication: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Current medications for this condition"
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Additional notes about the condition"
    )

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('condition', mode='before')
    @classmethod
    def validate_condition(cls, v):
        """Validate that condition is not empty or whitespace-only."""
        return validate_condition_field(v, required=True)

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values."""
        return validate_status_field(v, required=True)

    @field_validator('date_of_diagnosis', mode='before')
    @classmethod
    def validate_date_of_diagnosis(cls, v):
        """Validate date of diagnosis format and ensure it's not in the future."""
        return validate_date_of_diagnosis_field(v)

    @field_validator('name', 'medication', 'notes', mode='before')
    @classmethod
    def sanitize_text_fields(cls, v):
        """Sanitize optional text fields by removing null bytes."""
        return sanitize_text_field(v)


class HealthSpecialRelationshipCreate(HealthSpecialRelationshipBase):
    """
    Model for creating a new health record for special relationships.

    Inherits all fields and validation from HealthSpecialRelationshipBase.
    Used for POST requests to create new health records.
    """
    pass


class HealthSpecialRelationshipUpdate(BaseModel):
    """
    Model for updating an existing health record for special relationships.

    All fields are optional to support partial updates (PATCH-like behavior).
    Only fields provided in the request will be updated.

    Attributes:
        condition: Type of health condition (1-255 chars if provided)
        name: Descriptive name for the condition
        date_of_diagnosis: Date when condition was diagnosed (must not be future)
        status: Current status (must be valid enum value if provided)
        medication: Current medications for this condition
        notes: Additional notes about the condition
    """
    condition: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Type of health condition"
    )
    name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Descriptive name for the condition"
    )
    date_of_diagnosis: Optional[Union[date, str]] = Field(
        default=None,
        description="Date when condition was diagnosed (YYYY-MM-DD)"
    )
    status: Optional[str] = Field(
        default=None,
        description="Status: Active, Resolved, Monitoring, or Inactive"
    )
    medication: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Current medications for this condition"
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Additional notes about the condition"
    )

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('condition', mode='before')
    @classmethod
    def validate_condition(cls, v):
        """Validate condition if provided - cannot be empty/whitespace."""
        return validate_condition_field(v, required=False)

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate status if provided - must be valid enum value."""
        return validate_status_field(v, required=False)

    @field_validator('date_of_diagnosis', mode='before')
    @classmethod
    def validate_date_of_diagnosis(cls, v):
        """Validate date of diagnosis if provided - must not be future."""
        return validate_date_of_diagnosis_field(v)

    @field_validator('name', 'medication', 'notes', mode='before')
    @classmethod
    def sanitize_text_fields(cls, v):
        """Sanitize optional text fields by removing null bytes."""
        return sanitize_text_field(v)


class HealthSpecialRelationshipInDBBase(BaseModel):
    """
    Model representing health record for special relationships as stored in database.

    Includes auto-generated fields like id and created_at.
    """
    id: int
    special_relationship_id: int
    condition: Optional[str] = None
    name: Optional[str] = None
    date_of_diagnosis: Optional[date] = None
    status: Optional[str] = "Active"
    medication: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    date_recorded: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class HealthSpecialRelationship(HealthSpecialRelationshipInDBBase):
    """
    Complete health special relationship model returned to frontend.

    Includes all database fields plus any computed fields.
    Used as the response model for API endpoints.
    """
    pass
