from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class ClientBase(BaseModel):
    """Base model for client data"""
    forname: Optional[str] = Field(default="")
    surname: Optional[str] = Field(default="")
    relationship: Optional[str] = Field(default="")
    status: Optional[str] = Field(default="active")
    advisor: Optional[str] = Field(default=None)

    model_config = ConfigDict(
        from_attributes=True
    )

class ClientCreate(ClientBase):
    """Model for creating a new client"""
    pass

class ClientUpdate(BaseModel):
    """Model for updating an existing client"""
    forname: Optional[str] = None
    surname: Optional[str] = None
    relationship: Optional[str] = None
    status: Optional[str] = None
    advisor: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )

class ClientInDB(ClientBase):
    """Model for client as stored in database"""
    id: int
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class Client(ClientInDB):
    """Complete client model returned to frontend"""
    pass
