from pydantic import BaseModel, Field, ConfigDict, validator
from datetime import date, datetime
from typing import Optional, Dict, Any

class ClientproductBase(BaseModel):
    client_id: int
    client_name: Optional[str] = None  # Added client_name field
    product_name: Optional[str] = None
    status: str = "active"
    start_date: date
    end_date: Optional[date] = None
    plan_number: Optional[str] = None
    provider_id: Optional[int] = None
    provider_name: Optional[str] = None
    provider_theme_color: Optional[str] = None
    product_type: Optional[str] = None
    portfolio_id: Optional[int] = None
    template_generation_id: Optional[int] = None
    template_info: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

    model_config = ConfigDict(
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
    plan_number: Optional[str] = None
    provider_id: Optional[int] = None
    product_type: Optional[str] = None
    portfolio_id: Optional[int] = None
    notes: Optional[str] = None
    template_generation_id: Optional[int] = None

    model_config = ConfigDict(
        from_attributes=True
    )

class Clientproduct(ClientproductBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat(),
            datetime: lambda dt: dt.isoformat()
        },
        from_attributes=True
    ) 