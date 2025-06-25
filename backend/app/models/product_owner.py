from pydantic import BaseModel, ConfigDict, Field, validator
from typing import Optional
from datetime import datetime

class ProductOwnerBase(BaseModel):
    """Base model for product owner data"""
    firstname: Optional[str] = Field(default=None, description="First name of the product owner")
    surname: Optional[str] = Field(default=None, description="Surname/last name of the product owner")
    known_as: str = Field(..., min_length=1, description="Preferred name or nickname (required)")
    status: Optional[str] = Field(default='active', description="Status of the product owner")

    model_config = ConfigDict(
        from_attributes=True
    )
    
    @validator('known_as')
    def validate_known_as(cls, v):
        if not v or not v.strip():
            raise ValueError('Known as field is required and cannot be empty')
        return v.strip()

class ProductOwnerCreate(ProductOwnerBase):
    """Model for creating a new product owner"""
    pass

class ProductOwnerUpdate(BaseModel):
    """Model for updating an existing product owner"""
    firstname: Optional[str] = Field(default=None, description="First name of the product owner")
    surname: Optional[str] = Field(default=None, description="Surname/last name of the product owner") 
    known_as: Optional[str] = Field(default=None, description="Preferred name or nickname")
    status: Optional[str] = Field(default=None, description="Status of the product owner")

    model_config = ConfigDict(
        from_attributes=True
    )
    
    @validator('known_as')
    def validate_known_as_if_provided(cls, v):
        # If known_as is provided, it cannot be empty
        if v is not None and (not v or not v.strip()):
            raise ValueError('Known as field cannot be empty if provided')
        return v.strip() if v else v

class ProductOwnerInDBBase(BaseModel):
    """Model for product owner as stored in database"""
    id: int
    firstname: Optional[str] = None
    surname: Optional[str] = None
    known_as: Optional[str] = None  # Allow None for existing records
    status: str = 'active'
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

class ProductOwner(ProductOwnerInDBBase):
    """Complete product owner model returned to frontend"""
    pass 