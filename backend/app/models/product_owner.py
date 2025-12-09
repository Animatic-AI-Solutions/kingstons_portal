from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, Union
from datetime import datetime, date


class ProductOwnerBase(BaseModel):
    """Base model for product owner data with all 25 fields"""
    # Core Identity (4 fields)
    status: str = Field(default='active', description="Status of the product owner (active/inactive)")
    firstname: str = Field(..., min_length=1, description="First name of the product owner (required)")
    surname: str = Field(..., min_length=1, description="Surname/last name of the product owner (required)")
    known_as: Optional[str] = Field(default=None, description="Preferred name or nickname")

    # Personal Details (8 fields)
    title: Optional[str] = Field(default=None, description="Honorific title (Mr, Mrs, Dr, etc.)")
    middle_names: Optional[str] = Field(default=None, max_length=100, description="Middle name(s)")
    relationship_status: Optional[str] = Field(default=None, description="Marital status")
    gender: Optional[str] = Field(default=None, description="Gender")
    previous_names: Optional[str] = Field(default=None, description="Previous legal names")
    dob: Optional[Union[date, str]] = Field(default=None, description="Date of birth (YYYY-MM-DD)")
    place_of_birth: Optional[str] = Field(default=None, description="Place of birth")

    # Contact Information (4 fields)
    email_1: Optional[str] = Field(default=None, description="Primary email address")
    email_2: Optional[str] = Field(default=None, description="Secondary email address")
    phone_1: Optional[str] = Field(default=None, description="Primary phone number")
    phone_2: Optional[str] = Field(default=None, description="Secondary phone number")

    # Residential Information (2 fields)
    moved_in_date: Optional[Union[date, str]] = Field(default=None, description="Date moved to current address (YYYY-MM-DD)")
    address_id: Optional[int] = Field(default=None, description="Foreign key to addresses table")

    # Client Profiling (2 fields)
    three_words: Optional[str] = Field(default=None, description="Three words describing the client")
    share_data_with: Optional[str] = Field(default=None, description="Data sharing preferences")

    # Employment Information (2 fields)
    employment_status: Optional[str] = Field(default=None, description="Current employment status")
    occupation: Optional[str] = Field(default=None, description="Current occupation/job title")

    # Identity & Compliance (4 fields)
    passport_expiry_date: Optional[Union[date, str]] = Field(default=None, description="Passport expiration date (YYYY-MM-DD)")
    ni_number: Optional[str] = Field(default=None, description="UK National Insurance number")
    aml_result: Optional[str] = Field(default=None, description="Anti-Money Laundering check result")
    aml_date: Optional[Union[date, str]] = Field(default=None, description="Date of AML check (YYYY-MM-DD)")

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('dob', 'moved_in_date', 'passport_expiry_date', 'aml_date', mode='before')
    @classmethod
    def convert_date_strings(cls, v):
        """Convert date strings to date objects, handle empty strings and None"""
        if v == '' or v is None:
            return None
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                return None
        return v


class ProductOwnerCreate(ProductOwnerBase):
    """Model for creating a new product owner"""
    pass


class ProductOwnerUpdate(BaseModel):
    """Model for updating an existing product owner - all fields optional"""
    # Core Identity (4 fields)
    status: Optional[str] = None
    firstname: Optional[str] = None
    surname: Optional[str] = None
    known_as: Optional[str] = None

    # Personal Details (8 fields)
    title: Optional[str] = None
    middle_names: Optional[str] = None
    relationship_status: Optional[str] = None
    gender: Optional[str] = None
    previous_names: Optional[str] = None
    dob: Optional[Union[date, str]] = None
    place_of_birth: Optional[str] = None

    # Contact Information (4 fields)
    email_1: Optional[str] = None
    email_2: Optional[str] = None
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None

    # Residential Information (2 fields)
    moved_in_date: Optional[Union[date, str]] = None
    address_id: Optional[int] = None

    # Client Profiling (2 fields)
    three_words: Optional[str] = None
    share_data_with: Optional[str] = None

    # Employment Information (2 fields)
    employment_status: Optional[str] = None
    occupation: Optional[str] = None

    # Identity & Compliance (4 fields)
    passport_expiry_date: Optional[Union[date, str]] = None
    ni_number: Optional[str] = None
    aml_result: Optional[str] = None
    aml_date: Optional[Union[date, str]] = None

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_validator('dob', 'moved_in_date', 'passport_expiry_date', 'aml_date', mode='before')
    @classmethod
    def convert_date_strings(cls, v):
        """Convert date strings to date objects, handle empty strings and None"""
        if v == '' or v is None:
            return None
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                return None
        return v


class ProductOwnerInDBBase(BaseModel):
    """Model for product owner as stored in database"""
    id: int

    # Core Identity (4 fields)
    status: str = 'active'
    firstname: Optional[str] = None
    surname: Optional[str] = None
    known_as: Optional[str] = None

    # Personal Details (8 fields)
    title: Optional[str] = None
    middle_names: Optional[str] = None
    relationship_status: Optional[str] = None
    gender: Optional[str] = None
    previous_names: Optional[str] = None
    dob: Optional[date] = None
    place_of_birth: Optional[str] = None

    # Contact Information (4 fields)
    email_1: Optional[str] = None
    email_2: Optional[str] = None
    phone_1: Optional[str] = None
    phone_2: Optional[str] = None

    # Residential Information (2 fields)
    moved_in_date: Optional[date] = None
    address_id: Optional[int] = None

    # Client Profiling (2 fields)
    three_words: Optional[str] = None
    share_data_with: Optional[str] = None

    # Employment Information (2 fields)
    employment_status: Optional[str] = None
    occupation: Optional[str] = None

    # Identity & Compliance (4 fields)
    passport_expiry_date: Optional[date] = None
    ni_number: Optional[str] = None
    aml_result: Optional[str] = None
    aml_date: Optional[date] = None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class ProductOwner(ProductOwnerInDBBase):
    """Complete product owner model returned to frontend"""
    pass
