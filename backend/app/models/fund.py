from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class FundBase(BaseModel):
    """Base model for fund data"""
    fund_name: Optional[str] = None
    isin_number: Optional[str] = None
    risk_factor: Optional[int] = None
    fund_cost: Optional[float] = None
    status: str = "active"

class FundCreate(FundBase):
    """Model for creating a new fund"""
    fund_name: str
    isin_number: str
    risk_factor: int
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
