from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class PortfolioValuationBase(BaseModel):
    portfolio_id: int
    valuation_date: datetime
    valuation: float

class PortfolioValuationCreate(PortfolioValuationBase):
    pass

class PortfolioValuationUpdate(BaseModel):
    valuation_date: Optional[datetime] = None
    valuation: Optional[float] = None

class PortfolioValuation(PortfolioValuationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class LatestPortfolioValuation(BaseModel):
    portfolio_id: int
    current_value: float
    valuation_date: datetime
    portfolio_valuation_id: int

    class Config:
        from_attributes = True 