from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime, date
from typing import Optional
from decimal import Decimal

class HoldingActivityLogBase(BaseModel):
    """Base model for holding activity logs with simplified structure."""
    portfolio_fund_id: int
    activity_timestamp: date
    activity_type: str
    amount: Optional[Decimal] = None
    product_id: Optional[int] = None
    
    @field_validator('activity_timestamp', mode='before')
    @classmethod
    def parse_date(cls, value):
        if isinstance(value, str):
            try:
                return datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("Invalid date format. Expected YYYY-MM-DD")
        if isinstance(value, datetime):
            return value.date()
        return value
    
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        }
    )

class HoldingActivityLogCreate(HoldingActivityLogBase):
    """Model for creating new activity logs."""
    pass

class HoldingActivityLogUpdate(BaseModel):
    """Model for updating existing activity logs."""
    portfolio_fund_id: Optional[int] = None
    activity_timestamp: Optional[date] = None
    activity_type: Optional[str] = None
    amount: Optional[Decimal] = None
    product_id: Optional[int] = None
    
    @field_validator('activity_timestamp', mode='before')
    @classmethod
    def parse_date(cls, value):
        if isinstance(value, str):
            try:
                return datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("Invalid date format. Expected YYYY-MM-DD")
        if isinstance(value, datetime):
            return value.date()
        return value
    
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        }
    )

class HoldingActivityLogInDB(HoldingActivityLogBase):
    """Model for activity logs as stored in database."""
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            datetime: lambda dt: dt.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        }
    )

class HoldingActivityLog(HoldingActivityLogInDB):
    """Complete holding activity log model returned to frontend."""
    pass
