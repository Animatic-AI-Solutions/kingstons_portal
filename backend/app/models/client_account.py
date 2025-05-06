from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional, Any
import json

class DateEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)

class ClientproductBase(BaseModel):
    client_id: int
    product_name: Optional[str] = None
    status: str = "active"
    start_date: date
    end_date: Optional[date] = None
    weighting: Optional[float] = 0.0
    plan_number: Optional[str] = None
    provider_id: Optional[int] = None
    product_type: Optional[str] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class ClientproductCreate(ClientproductBase):
    skip_portfolio_creation: Optional[bool] = False

class ClientproductUpdate(BaseModel):
    client_id: Optional[int] = None
    product_name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    weighting: Optional[float] = None
    plan_number: Optional[str] = None
    provider_id: Optional[int] = None
    product_type: Optional[str] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class ClientproductInDB(ClientproductBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat(), datetime: lambda dt: dt.isoformat()},
        from_attributes=True
    )

class Clientproduct(ClientproductInDB):
    """Complete client product model returned to frontend"""
    pass
