from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class ProviderBase(BaseModel):
    name: Optional[str] = None
    status: str = "active"

class ProviderCreate(ProviderBase):
    pass

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None

class ProviderInDB(ProviderBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Provider(ProviderInDB):
    """Complete provider model returned to frontend"""
    pass
