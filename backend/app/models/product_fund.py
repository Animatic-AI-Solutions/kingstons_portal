from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class ProductFundBase(BaseModel):
    available_products_id: int
    available_funds_id: int
    target_weighting: Optional[float] = None

class ProductFundCreate(ProductFundBase):
    pass

class ProductFundUpdate(ProductFundBase):
    pass

class ProductFundInDB(ProductFundBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProductFund(ProductFundInDB):
    """Complete product fund model returned to frontend"""
    pass
