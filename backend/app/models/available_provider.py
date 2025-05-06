from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class AvailableProviderBase(BaseModel):
    name: Optional[str] = None
    status: str = "active"
    theme_color: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class AvailableProviderCreate(AvailableProviderBase):
    pass

class AvailableProviderUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    theme_color: Optional[str] = None

class AvailableProviderInDB(AvailableProviderBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={datetime: lambda dt: dt.isoformat()},
        from_attributes=True
    )

class AvailableProvider(AvailableProviderInDB):
    """Complete available provider model returned to frontend"""
    pass

