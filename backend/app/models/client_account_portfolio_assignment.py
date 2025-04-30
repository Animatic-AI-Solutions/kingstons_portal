from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional

class ClientAccountPortfolioAssignmentBase(BaseModel):
    client_account_id: int
    portfolio_id: int
    start_date: date
    end_date: Optional[date] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class ClientAccountPortfolioAssignmentCreate(ClientAccountPortfolioAssignmentBase):
    pass

class ClientAccountPortfolioAssignmentUpdate(BaseModel):
    client_account_id: Optional[int] = None
    portfolio_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class ClientAccountPortfolioAssignmentInDB(ClientAccountPortfolioAssignmentBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat(), datetime: lambda dt: dt.isoformat()},
        from_attributes=True
    )

class ClientAccountPortfolioAssignment(ClientAccountPortfolioAssignmentInDB):
    """Complete client account portfolio assignment model returned to frontend"""
    pass

