from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class IRRValueBase(BaseModel):
    """Base model for IRR values matching database schema"""
    fund_id: Optional[int] = None  # matches bigint null in DB
    irr_result: Optional[float] = None  # Changed from value to irr_result, and from int to float
    date: Optional[datetime] = None  # matches timestamp without time zone null in DB
    fund_valuation_id: Optional[int] = None  # Added to match the database schema

class IRRValueCreate(IRRValueBase):
    pass

class IRRValueUpdate(BaseModel):
    irr_result: Optional[float] = None  # Changed from value to irr_result
    date: Optional[datetime] = None
    fund_valuation_id: Optional[int] = None  # Added to match the database schema

class IRRValue(IRRValueBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True 