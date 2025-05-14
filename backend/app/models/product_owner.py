from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ProductOwnerBase(BaseModel):
    """Base model for product owner data"""
    name: Optional[str] = None
    status: Optional[str] = 'active'

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

class ProductOwnerInDBBase(ProductOwnerBase):
    """Model for product owner as stored in database"""
    id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

class ProductOwner(ProductOwnerInDBBase):
    """Complete product owner model returned to frontend"""
    pass 