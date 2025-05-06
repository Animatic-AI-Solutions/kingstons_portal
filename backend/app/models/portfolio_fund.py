from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from pydantic.functional_validators import AfterValidator
from typing_extensions import Annotated

def validate_decimal_places(value: Decimal) -> Decimal:
    if value is None:
        return None
    return Decimal(str(round(value, 4)))

DecimalWithPrecision = Annotated[Decimal, AfterValidator(validate_decimal_places)]

class PortfolioFundBase(BaseModel):
    portfolio_id: int
    available_funds_id: int
    weighting: Optional[DecimalWithPrecision] = 0  # Set default to 0 instead of None
    start_date: date
    end_date: Optional[date] = None
    amount_invested: Optional[float] = 0  # Also set default to 0 instead of None
    
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        },
        from_attributes=True
    )

class PortfolioFundCreate(PortfolioFundBase):
    pass

class PortfolioFundUpdate(BaseModel):
    portfolio_id: Optional[int] = None
    available_funds_id: Optional[int] = None
    weighting: Optional[DecimalWithPrecision] = None  # matches numeric(5,2), renamed from target_weighting
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    amount_invested: Optional[float] = None  # matches double precision
    
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        },
        from_attributes=True
    )

class PortfolioFundInDB(PortfolioFundBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            datetime: lambda dt: dt.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        },
        from_attributes=True
    )

class PortfolioFund(PortfolioFundInDB):
    """Complete portfolio fund model returned to frontend"""
    pass
