from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional

class AccountHoldingBase(BaseModel):
    client_account_id: int
    portfolio_id: Optional[int] = None
    status: str = "active"
    start_date: date
    end_date: Optional[date] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class AccountHoldingCreate(AccountHoldingBase):
    pass

class AccountHoldingUpdate(BaseModel):
    client_account_id: Optional[int] = None
    portfolio_id: Optional[int] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class AccountHoldingInDB(AccountHoldingBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat(), datetime: lambda dt: dt.isoformat()},
        from_attributes=True
    )

class AccountHolding(AccountHoldingInDB):
    """Complete account holding model returned to frontend"""
    pass
