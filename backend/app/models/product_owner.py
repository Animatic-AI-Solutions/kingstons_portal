from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class ProductOwnerBase(BaseModel):
    """Base model for product owner data"""
    name: Optional[str] = Field(default="")
    status: Optional[str] = Field(default="active")

    model_config = ConfigDict(
        from_attributes=True
    )

class ProductOwnerCreate(ProductOwnerBase):
    """Model for creating a new product owner"""
    pass

class ProductOwnerUpdate(BaseModel):
    """Model for updating an existing product owner"""
    name: Optional[str] = None
    status: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )

class ProductOwnerInDB(ProductOwnerBase):
    """Model for product owner as stored in database"""
    id: int
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class ProductOwner(ProductOwnerInDB):
    """Complete product owner model returned to frontend"""
    pass 