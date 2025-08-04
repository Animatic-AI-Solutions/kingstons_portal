from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime, date
from typing import Optional
from decimal import Decimal

class HoldingActivityLogBase(BaseModel):
    """Base model for holding activity logs with simplified structure."""
    portfolio_fund_id: int
    product_id: int
    activity_timestamp: date
    activity_type: str
    amount: Optional[Decimal] = None
    
    @field_validator('activity_timestamp', mode='before')
    @classmethod
    def parse_date(cls, value):
        # Add comprehensive debugging for date parsing
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🔍 DATE VALIDATOR (BASE): Input value={value}, Type={type(value)}, Repr={repr(value)}")
        
        if isinstance(value, str):
            try:
                # First try simple date format (this is what frontend should send)
                parsed_date = datetime.strptime(value, "%Y-%m-%d").date()
                logger.info(f"🔍 DATE VALIDATOR (BASE): Parsed string '{value}' to date {parsed_date}")
                return parsed_date
            except ValueError as e:
                logger.error(f"🔍 DATE VALIDATOR (BASE): Failed to parse string '{value}': {e}")
                # Try alternative formats but extract only date part to avoid timezone issues
                try:
                    # If it has time component, extract just the date part to avoid timezone conversion
                    if 'T' in value:
                        date_part = value.split('T')[0]
                        parsed_date = datetime.strptime(date_part, "%Y-%m-%d").date()
                        logger.info(f"🔍 DATE VALIDATOR (BASE): Extracted date part '{date_part}' from '{value}' → date {parsed_date}")
                        return parsed_date
                    else:
                        # Try other date formats
                        parsed_date = datetime.strptime(value, "%Y-%m-%d").date()
                        logger.info(f"🔍 DATE VALIDATOR (BASE): Parsed alternative format '{value}' to date {parsed_date}")
                        return parsed_date
                except ValueError:
                    logger.error(f"🔍 DATE VALIDATOR (BASE): All parsing attempts failed for '{value}'")
                    raise ValueError(f"Invalid date format. Expected YYYY-MM-DD, got: {value}")
        if isinstance(value, datetime):
            result = value.date()
            logger.info(f"🔍 DATE VALIDATOR (BASE): Converted datetime {value} to date {result}")
            return result
        
        logger.info(f"🔍 DATE VALIDATOR (BASE): Returning value as-is: {value}")
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
    product_id: Optional[int] = None
    activity_timestamp: Optional[date] = None
    activity_type: Optional[str] = None
    amount: Optional[Decimal] = None
    
    @field_validator('activity_timestamp', mode='before')
    @classmethod
    def parse_date(cls, value):
        # Add comprehensive debugging for date parsing
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🔍 DATE VALIDATOR (UPDATE): Input value={value}, Type={type(value)}, Repr={repr(value)}")
        
        if isinstance(value, str):
            try:
                parsed_date = datetime.strptime(value, "%Y-%m-%d").date()
                logger.info(f"🔍 DATE VALIDATOR (UPDATE): Parsed string '{value}' to date {parsed_date}")
                return parsed_date
            except ValueError as e:
                logger.error(f"🔍 DATE VALIDATOR (UPDATE): Failed to parse string '{value}': {e}")
                # Try alternative formats but extract only date part to avoid timezone issues
                try:
                    # If it has time component, extract just the date part to avoid timezone conversion
                    if 'T' in value:
                        date_part = value.split('T')[0]
                        parsed_date = datetime.strptime(date_part, "%Y-%m-%d").date()
                        logger.info(f"🔍 DATE VALIDATOR (UPDATE): Extracted date part '{date_part}' from '{value}' → date {parsed_date}")
                        return parsed_date
                    else:
                        # Try other date formats
                        parsed_date = datetime.strptime(value, "%Y-%m-%d").date()
                        logger.info(f"🔍 DATE VALIDATOR (UPDATE): Parsed alternative format '{value}' to date {parsed_date}")
                        return parsed_date
                except ValueError:
                    logger.error(f"🔍 DATE VALIDATOR (UPDATE): All parsing attempts failed for '{value}'")
                    raise ValueError(f"Invalid date format. Expected YYYY-MM-DD, got: {value}")
        if isinstance(value, datetime):
            result = value.date()
            logger.info(f"🔍 DATE VALIDATOR (UPDATE): Converted datetime {value} to date {result}")
            return result
        
        logger.info(f"🔍 DATE VALIDATOR (UPDATE): Returning value as-is: {value}")
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
