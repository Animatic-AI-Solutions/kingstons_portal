from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional

class ClientproductPortfolioAssignmentBase(BaseModel):
    client_product_id: int
    portfolio_id: int
    start_date: date
    end_date: Optional[date] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class ClientproductPortfolioAssignmentCreate(ClientproductPortfolioAssignmentBase):
    pass

class ClientproductPortfolioAssignmentUpdate(BaseModel):
    client_product_id: Optional[int] = None
    portfolio_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class ClientproductPortfolioAssignmentInDB(ClientproductPortfolioAssignmentBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat(), datetime: lambda dt: dt.isoformat()},
        from_attributes=True
    )

class ClientproductPortfolioAssignment(ClientproductPortfolioAssignmentInDB):
    """Complete client product portfolio assignment model returned to frontend"""
    pass

