from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime, date
from typing import Optional, Literal
from decimal import Decimal
from pydantic.functional_validators import AfterValidator
from typing_extensions import Annotated

def validate_decimal_places(value: Decimal) -> Decimal:
    if value is None:
        return None
    # Handle empty string case
    if isinstance(value, str) and value.strip() == "":
        return None
    return Decimal(str(round(value, 2)))

DecimalWithPrecision = Annotated[Decimal, AfterValidator(validate_decimal_places)]

class ScheduledTransactionBase(BaseModel):
    portfolio_fund_id: int
    transaction_type: Literal['Investment', 'RegularInvestment', 'Withdrawal', 'RegularWithdrawal']
    amount: DecimalWithPrecision = Field(..., gt=0, description="Transaction amount (must be positive)")
    execution_day: int = Field(..., ge=1, le=31, description="Day of month to execute (1-31)")
    description: Optional[str] = None
    is_recurring: bool = False
    recurrence_interval: Optional[Literal['monthly', 'quarterly', 'annually']] = None
    max_executions: Optional[int] = Field(None, gt=0, description="Maximum number of executions (null = unlimited)")
    
    @field_validator('amount', mode='before')
    @classmethod
    def validate_amount(cls, value):
        if isinstance(value, str) and value.strip() == "":
            raise ValueError("Amount cannot be empty")
        if value is not None and float(value) <= 0:
            raise ValueError("Amount must be positive")
        return value
    
    @field_validator('recurrence_interval')
    @classmethod
    def validate_recurrence_interval(cls, value, info):
        if info.data.get('is_recurring') and not value:
            raise ValueError("Recurrence interval is required for recurring transactions")
        if not info.data.get('is_recurring') and value:
            raise ValueError("Recurrence interval can only be set for recurring transactions")
        return value
    
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        }
    )

class ScheduledTransactionCreate(ScheduledTransactionBase):
    created_by: Optional[int] = None

class ScheduledTransactionUpdate(BaseModel):
    amount: Optional[DecimalWithPrecision] = None
    execution_day: Optional[int] = Field(None, ge=1, le=31)
    description: Optional[str] = None
    status: Optional[Literal['active', 'paused', 'cancelled']] = None
    max_executions: Optional[int] = Field(None, gt=0)
    
    @field_validator('amount', mode='before')
    @classmethod
    def validate_amount(cls, value):
        if value is not None:
            if isinstance(value, str) and value.strip() == "":
                raise ValueError("Amount cannot be empty")
            if float(value) <= 0:
                raise ValueError("Amount must be positive")
        return value
    
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        }
    )

class ScheduledTransactionInDB(ScheduledTransactionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    next_execution_date: date
    status: str
    last_executed_date: Optional[date]
    total_executions: int
    created_by: Optional[int]
    
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            datetime: lambda dt: dt.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        }
    )

class ScheduledTransaction(ScheduledTransactionInDB):
    """Complete scheduled transaction model returned to frontend"""
    pass

# Execution log models
class ScheduledTransactionExecutionBase(BaseModel):
    scheduled_transaction_id: int
    execution_date: date
    status: Literal['success', 'failed', 'skipped']
    executed_amount: DecimalWithPrecision = Field(..., gt=0)
    error_message: Optional[str] = None
    notes: Optional[str] = None
    
    @field_validator('execution_date', mode='before')
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

class ScheduledTransactionExecutionCreate(ScheduledTransactionExecutionBase):
    pass

class ScheduledTransactionExecutionInDB(ScheduledTransactionExecutionBase):
    id: int
    execution_timestamp: datetime
    activity_log_id: Optional[int]
    
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            datetime: lambda dt: dt.isoformat(),
            Decimal: lambda d: float(d) if d is not None else None
        }
    )

class ScheduledTransactionExecution(ScheduledTransactionExecutionInDB):
    """Complete scheduled transaction execution model returned to frontend"""
    pass 