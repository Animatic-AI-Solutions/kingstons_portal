from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional

def validate_float_precision(value: float) -> float:
    """Validate float precision to 4 decimal places for monetary values."""
    if value is None:
        return None
    return round(float(value), 4)

class PortfolioFundBase(BaseModel):
    portfolio_id: int
    available_funds_id: int
    target_weighting: Optional[float] = 0  # Use float instead of Decimal
    start_date: date
    end_date: Optional[date] = None
    amount_invested: Optional[float] = 0
    status: Optional[str] = 'active'
    
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat()
        },
        from_attributes=True
    )

class PortfolioFundCreate(PortfolioFundBase):
    pass

class PortfolioFundUpdate(BaseModel):
    portfolio_id: Optional[int] = None
    available_funds_id: Optional[int] = None
    target_weighting: Optional[float] = None  # Use float instead of Decimal
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    amount_invested: Optional[float] = None
    status: Optional[str] = None
    
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat()
        },
        from_attributes=True
    )

class PortfolioFundInDB(PortfolioFundBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            datetime: lambda dt: dt.isoformat()
        },
        from_attributes=True
    )

class PortfolioFund(PortfolioFundInDB):
    """Complete portfolio fund model returned to frontend"""
    pass
