from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProviderSwitchLogBase(BaseModel):
    client_product_id: int
    switch_date: datetime
    previous_provider_id: Optional[int] = None
    new_provider_id: int
    description: Optional[str] = None

class ProviderSwitchLogCreate(ProviderSwitchLogBase):
    pass

class ProviderSwitchLogUpdate(BaseModel):
    switch_date: Optional[datetime] = None
    previous_provider_id: Optional[int] = None
    new_provider_id: Optional[int] = None
    description: Optional[str] = None

class ProviderSwitchLogInDB(ProviderSwitchLogBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class ProviderSwitchLog(ProviderSwitchLogInDB):
    """Complete provider switch log model returned to frontend"""
    # Add any additional fields needed for the frontend here
    previous_provider_name: Optional[str] = None
    new_provider_name: Optional[str] = None 