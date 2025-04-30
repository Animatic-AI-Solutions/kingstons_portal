from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class ProductBase(BaseModel):
    """Base model for product data"""
    available_providers_id: Optional[int] = None
    product_name: Optional[str] = None
    product_type: Optional[str] = None
    status: str = "active"

class ProductCreate(ProductBase):
    """Model for creating a new product"""
    pass

class ProductUpdate(BaseModel):
    """Model for updating an existing product"""
    available_providers_id: Optional[int] = None
    product_name: Optional[str] = None
    product_type: Optional[str] = None
    status: Optional[str] = None

class ProductInDB(ProductBase):
    """Model for product as stored in database"""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Product(ProductInDB):
    """Complete product model returned to frontend"""
    pass
