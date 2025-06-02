from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime, date
from typing import Optional
from decimal import Decimal
from pydantic.functional_validators import AfterValidator
from typing_extensions import Annotated

def validate_decimal_places(value: Decimal) -> Decimal:
    if value is None:
        return None
    return Decimal(str(round(value, 2)))

DecimalWithPrecision = Annotated[Decimal, AfterValidator(validate_decimal_places)]

class FundValuationBase(BaseModel):
    portfolio_fund_id: int
    valuation_date: datetime
    valuation: DecimalWithPrecision  # numeric(16,2)
    
    @field_validator('valuation_date', mode='before')
    @classmethod
    def parse_date(cls, value):
        if isinstance(value, str):
            try:
                # First try ISO format (YYYY-MM-DDTHH:MM:SS)
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                try:
                    # Then try YYYY-MM-DD format
                    return datetime.strptime(value, "%Y-%m-%d")
                except ValueError:
                    raise ValueError("Invalid date format. Expected YYYY-MM-DD or ISO format")
        return value
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        },
        from_attributes=True
    )

class FundValuationCreate(FundValuationBase):
    pass

class FundValuationUpdate(BaseModel):
    portfolio_fund_id: Optional[int] = None
    valuation_date: Optional[datetime] = None
    valuation: Optional[DecimalWithPrecision] = None
    
    @field_validator('valuation_date', mode='before')
    @classmethod
    def parse_date(cls, value):
        if isinstance(value, str):
            try:
                # First try ISO format (YYYY-MM-DDTHH:MM:SS)
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                try:
                    # Then try YYYY-MM-DD format
                    return datetime.strptime(value, "%Y-%m-%d")
                except ValueError:
                    raise ValueError("Invalid date format. Expected YYYY-MM-DD or ISO format")
        return value
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        },
        from_attributes=True
    )

class FundValuationInDB(FundValuationBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        },
        from_attributes=True
    )

class FundValuation(FundValuationInDB):
    """Complete fund valuation model returned to frontend"""
    pass

# New model for the latest_fund_valuations view
class LatestFundValuationViewItem(BaseModel):
    id: int
    portfolio_fund_id: int
    valuation_date: datetime 
    valuation: DecimalWithPrecision

    # Re-include the validator and config if necessary, or ensure it inherits from a base with them
    @field_validator('valuation_date', mode='before')
    @classmethod
    def parse_date(cls, value):
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                try:
                    return datetime.strptime(value, "%Y-%m-%d")
                except ValueError:
                    raise ValueError("Invalid date format. Expected YYYY-MM-DD or ISO format")
        return value

    model_config = ConfigDict(
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        },
        from_attributes=True
    ) 