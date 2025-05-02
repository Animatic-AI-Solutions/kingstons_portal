from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional, Any
import json

class DateEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)

class ClientAccountBase(BaseModel):
    client_id: int
    available_products_id: int
    account_name: Optional[str] = None
    status: str = "active"
    start_date: date
    end_date: Optional[date] = None
    weighting: Optional[float] = 0.0
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class ClientAccountCreate(ClientAccountBase):
    pass

class ClientAccountUpdate(BaseModel):
    client_id: Optional[int] = None
    available_products_id: Optional[int] = None
    account_name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    weighting: Optional[float] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class ClientAccountInDB(ClientAccountBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat(), datetime: lambda dt: dt.isoformat()},
        from_attributes=True
    )

class ClientAccount(ClientAccountInDB):
    """Complete client account model returned to frontend"""
    pass
