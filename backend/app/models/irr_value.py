from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class IRRValueBase(BaseModel):
    """Base model for IRR values matching database schema"""
    fund_id: Optional[int] = None  # matches bigint null in DB
    value: Optional[int] = None    # matches bigint null in DB
    date: Optional[datetime] = None  # matches timestamp without time zone null in DB
    valuation: Optional[float] = None  # matches double precision null in DB

class IRRValueCreate(IRRValueBase):
    pass

class IRRValueUpdate(BaseModel):
    value: Optional[int] = None  # changed to int to match DB
    date: Optional[datetime] = None
    valuation: Optional[float] = None

class IRRValue(IRRValueBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True 