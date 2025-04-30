from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime, date
from typing import Optional
from decimal import Decimal
from pydantic.functional_validators import AfterValidator
from typing_extensions import Annotated

def validate_decimal_places(value: Decimal) -> Decimal:
    if value is None:
        return None
    return Decimal(str(round(value, 5)))

DecimalWithPrecision = Annotated[Decimal, AfterValidator(validate_decimal_places)]

class HoldingActivityLogBase(BaseModel):
    account_holding_id: int
    portfolio_fund_id: int
    activity_timestamp: date
    activity_type: str
    amount: Optional[DecimalWithPrecision] = None
    related_fund: Optional[int] = None  # Used for Switch activities to reference the related fund
    
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
    pass

class HoldingActivityLogUpdate(BaseModel):
    account_holding_id: Optional[int] = None
    portfolio_fund_id: Optional[int] = None
    activity_timestamp: Optional[date] = None
    activity_type: Optional[str] = None
    amount: Optional[DecimalWithPrecision] = None
    related_fund: Optional[int] = None
    
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
    """Complete holding activity log model returned to frontend"""
    pass
