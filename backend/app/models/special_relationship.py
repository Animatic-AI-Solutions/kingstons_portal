from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, List, Union
from datetime import datetime, date


class SpecialRelationshipBase(BaseModel):
    """Base model for special relationship data"""
    name: str = Field(..., min_length=1, max_length=200, description="Full name of the person")
    type: str = Field(..., description="Type of relationship: Personal or Professional")
    relationship: str = Field(..., min_length=1, max_length=50, description="Nature of relationship (e.g., Spouse, Accountant)")
    status: str = Field(default="Active", description="Status: Active, Inactive, or Deceased")
    date_of_birth: Optional[Union[date, str]] = Field(default=None, description="Date of birth")
    dependency: Optional[bool] = Field(default=False, description="Whether this person is a dependent")
    email: Optional[str] = Field(default=None, description="Email address")
    phone_number: Optional[str] = Field(default=None, description="Phone number")
    address_id: Optional[int] = Field(default=None, description="Foreign key to addresses table")
    notes: Optional[str] = Field(default=None, description="Additional notes about the relationship")
    firm_name: Optional[str] = Field(default=None, description="Name of firm (for professional relationships)")

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        """Validate that type is either Personal or Professional"""
        if v not in ["Personal", "Professional"]:
            raise ValueError('Type must be either "Personal" or "Professional"')
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is Active, Inactive, or Deceased"""
        if v not in ["Active", "Inactive", "Deceased"]:
            raise ValueError('Status must be "Active", "Inactive", or "Deceased"')
        return v

    @field_validator('date_of_birth', mode='before')
    @classmethod
    def validate_dob(cls, v):
        """Validate date of birth and convert to date object"""
        if v == '' or v is None:
            return None

        # Convert string to date
        if isinstance(v, str):
            try:
                date_obj = date.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
            v = date_obj

        # Check if date is in the future
        if v and v > date.today():
            raise ValueError('Date of birth cannot be in the future')

        return v

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Basic email validation"""
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        """Basic phone validation - at least 10 digits"""
        if v:
            # Remove common phone formatting characters
            digits_only = ''.join(filter(str.isdigit, v))
            if len(digits_only) < 10:
                raise ValueError('Phone number must contain at least 10 digits')
        return v

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Validate name is not empty or whitespace only"""
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

    @field_validator('relationship')
    @classmethod
    def validate_relationship(cls, v):
        """Validate relationship is not empty"""
        if not v or not v.strip():
            raise ValueError('Relationship cannot be empty')
        return v.strip()


class SpecialRelationshipCreate(SpecialRelationshipBase):
    """Model for creating a new special relationship"""
    product_owner_ids: List[int] = Field(..., min_length=1, description="At least one product owner ID required")

    @field_validator('product_owner_ids')
    @classmethod
    def validate_product_owner_ids(cls, v):
        """Validate that at least one product owner ID is provided"""
        if not v or len(v) == 0:
            raise ValueError('At least one product owner ID is required')
        # Check for duplicates
        if len(v) != len(set(v)):
            raise ValueError('Duplicate product owner IDs not allowed')
        return v


class SpecialRelationshipUpdate(BaseModel):
    """Model for updating an existing special relationship - all fields optional"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    type: Optional[str] = None
    relationship: Optional[str] = Field(default=None, min_length=1, max_length=50)
    status: Optional[str] = None
    date_of_birth: Optional[Union[date, str]] = None
    dependency: Optional[bool] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address_id: Optional[int] = None
    notes: Optional[str] = None
    firm_name: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )

    # Apply same validators as base model
    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        if v is not None and v not in ["Personal", "Professional"]:
            raise ValueError('Type must be either "Personal" or "Professional"')
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in ["Active", "Inactive", "Deceased"]:
            raise ValueError('Status must be "Active", "Inactive", or "Deceased"')
        return v

    @field_validator('date_of_birth', mode='before')
    @classmethod
    def validate_dob(cls, v):
        if v == '' or v is None:
            return None
        if isinstance(v, str):
            try:
                date_obj = date.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
            v = date_obj
        if v and v > date.today():
            raise ValueError('Date of birth cannot be in the future')
        return v

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        if v:
            digits_only = ''.join(filter(str.isdigit, v))
            if len(digits_only) < 10:
                raise ValueError('Phone number must contain at least 10 digits')
        return v

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Name cannot be empty')
        return v.strip() if v else v

    @field_validator('relationship')
    @classmethod
    def validate_relationship(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Relationship cannot be empty')
        return v.strip() if v else v


class StatusUpdate(BaseModel):
    """Model for updating only the status field"""
    status: str = Field(..., description="Status: Active, Inactive, or Deceased")

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v not in ["Active", "Inactive", "Deceased"]:
            raise ValueError('Status must be "Active", "Inactive", or "Deceased"')
        return v


class SpecialRelationshipInDBBase(BaseModel):
    """Model for special relationship as stored in database"""
    id: int
    created_at: datetime
    updated_at: datetime
    name: Optional[str] = None
    type: Optional[str] = None
    date_of_birth: Optional[date] = None
    relationship: Optional[str] = None
    dependency: Optional[bool] = False
    email: Optional[str] = None
    phone_number: Optional[str] = None
    status: Optional[str] = "Active"
    address_id: Optional[int] = None
    notes: Optional[str] = None
    firm_name: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class SpecialRelationship(SpecialRelationshipInDBBase):
    """Complete special relationship model returned to frontend"""
    product_owner_ids: List[int] = Field(default_factory=list, description="Associated product owners")
