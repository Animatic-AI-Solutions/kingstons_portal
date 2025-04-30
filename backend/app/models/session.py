from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SessionBase(BaseModel):
    """Base model for session data"""
    user_id: int

class SessionCreate(SessionBase):
    """Model for creating a new session"""
    pass

class SessionInDB(SessionBase):
    """Model for session as stored in database"""
    id: int
    created_at: datetime
    last_used: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Session(SessionInDB):
    """Model for session response"""
    pass 