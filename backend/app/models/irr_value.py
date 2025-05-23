from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class IRRValueBase(BaseModel):
    """Base model for IRR values matching database schema"""
    fund_id: Optional[int] = None  # matches bigint null in DB
    irr_result: Optional[float] = None  # matches numeric(7,2) null in DB
    date: Optional[datetime] = None  # matches timestamp without time zone null in DB
    fund_valuation_id: Optional[int] = None  # matches bigint null in DB

class IRRValueCreate(IRRValueBase):
    pass

class IRRValueUpdate(BaseModel):
    irr_result: Optional[float] = None  # changed from value to irr_result
    date: Optional[datetime] = None
    fund_valuation_id: Optional[int] = None

class IRRValue(IRRValueBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True 