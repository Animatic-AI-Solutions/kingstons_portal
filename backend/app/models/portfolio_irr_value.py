from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PortfolioIRRValueBase(BaseModel):
    portfolio_id: int
    irr_result: float
    calculation_date: datetime
    portfolio_valuation_id: Optional[int] = None
    calculation_method: Optional[str] = "standard"

class PortfolioIRRValueCreate(PortfolioIRRValueBase):
    pass

class PortfolioIRRValueUpdate(BaseModel):
    irr_result: Optional[float] = None
    calculation_date: Optional[datetime] = None
    portfolio_valuation_id: Optional[int] = None
    calculation_method: Optional[str] = None

class PortfolioIRRValue(PortfolioIRRValueBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class LatestPortfolioIRRValue(BaseModel):
    portfolio_id: int
    irr_result: float  # Match what the database actually returns
    irr_date: datetime  # Match what the database actually returns
    portfolio_valuation_id: Optional[int] = None

    class Config:
        from_attributes = True

class PortfolioValueIRRSummary(BaseModel):
    portfolio_id: int
    portfolio_name: Optional[str] = None
    portfolio_status: Optional[str] = None
    current_value: Optional[float] = None
    valuation_date: Optional[datetime] = None
    current_irr: Optional[float] = None
    irr_calculation_date: Optional[datetime] = None
    calculation_method: Optional[str] = None
    active_fund_count: Optional[int] = None

    class Config:
        from_attributes = True 