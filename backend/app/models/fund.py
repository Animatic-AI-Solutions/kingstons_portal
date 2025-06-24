from pydantic import BaseModel, Field, ConfigDict, validator
from typing import Optional, List
from datetime import datetime

class FundBase(BaseModel):
    """Base model for fund data"""
    fund_name: Optional[str] = Field(None, max_length=30, description="Fund name (max 30 characters)")
    isin_number: Optional[str] = None
    risk_factor: Optional[int] = Field(None, ge=1, le=7, description="Risk factor between 1-7")
    fund_cost: Optional[float] = None
    status: str = "active"
    
    @validator('fund_name')
    def validate_fund_name_length(cls, v):
        if v is not None and len(v) > 30:
            raise ValueError('Fund name must be 30 characters or less')
        return v
    
    @validator('risk_factor')
    def validate_risk_factor(cls, v):
        if v is not None and (v < 1 or v > 7):
            raise ValueError('Risk factor must be between 1 and 7')
        return v

class FundCreate(FundBase):
    """Model for creating a new fund"""
    fund_name: str = Field(..., max_length=30, description="Fund name (max 30 characters)")
    isin_number: str
    risk_factor: int = Field(..., ge=1, le=7, description="Risk factor between 1-7")
    fund_cost: float

class FundUpdate(FundBase):
    """Model for updating an existing fund"""
    pass

class FundInDB(FundBase):
    """Model for fund data as stored in database"""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FundWithProvider(FundInDB):
    """Model for fund data with additional context"""
    portfolio_id: Optional[int] = None
