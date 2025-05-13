from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class ClientGroupBase(BaseModel):
    """Base model for client group data"""
    name: Optional[str] = Field(default="")
    status: Optional[str] = Field(default="active")
    advisor: Optional[str] = Field(default=None)
    type: Optional[str] = Field(default="Family")

    model_config = ConfigDict(
        from_attributes=True
    )

class ClientGroupCreate(ClientGroupBase):
    """Model for creating a new client group"""
    pass

class ClientGroupUpdate(BaseModel):
    """Model for updating an existing client group"""
    name: Optional[str] = None
    status: Optional[str] = None
    advisor: Optional[str] = None
    type: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )

class ClientGroupInDB(ClientGroupBase):
    """Model for client group as stored in database"""
    id: int
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class ClientGroup(ClientGroupInDB):
    """Complete client group model returned to frontend"""
    pass
