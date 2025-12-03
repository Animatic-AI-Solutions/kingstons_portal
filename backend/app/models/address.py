from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class AddressBase(BaseModel):
    """Base model for address data"""
    line_1: Optional[str] = Field(default=None, max_length=100, description="Address line 1")
    line_2: Optional[str] = Field(default=None, max_length=100, description="Address line 2")
    line_3: Optional[str] = Field(default=None, max_length=100, description="Address line 3")
    line_4: Optional[str] = Field(default=None, max_length=100, description="Address line 4")
    line_5: Optional[str] = Field(default=None, max_length=100, description="Address line 5 (postcode)")

    model_config = ConfigDict(
        from_attributes=True
    )


class AddressCreate(AddressBase):
    """Model for creating a new address"""
    pass


class AddressUpdate(AddressBase):
    """Model for updating an existing address"""
    pass


class AddressInDBBase(BaseModel):
    """Model for address as stored in database"""
    id: int
    line_1: Optional[str] = None
    line_2: Optional[str] = None
    line_3: Optional[str] = None
    line_4: Optional[str] = None
    line_5: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class Address(AddressInDBBase):
    """Complete address model returned to frontend"""
    pass
