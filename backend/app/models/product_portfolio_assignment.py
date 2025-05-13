from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional

class ProductPortfolioAssignmentBase(BaseModel):
    product_id: int
    portfolio_id: int
    start_date: date
    end_date: Optional[date] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class ProductPortfolioAssignmentCreate(ProductPortfolioAssignmentBase):
    pass

class ProductPortfolioAssignmentUpdate(BaseModel):
    product_id: Optional[int] = None
    portfolio_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class ProductPortfolioAssignmentInDB(ProductPortfolioAssignmentBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat(), datetime: lambda dt: dt.isoformat()},
        from_attributes=True
    )

class ProductPortfolioAssignment(ProductPortfolioAssignmentInDB):
    """Complete product portfolio assignment model returned to frontend"""
    pass

