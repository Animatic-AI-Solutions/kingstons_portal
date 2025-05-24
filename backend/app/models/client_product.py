from pydantic import BaseModel, Field, ConfigDict, validator
from datetime import date, datetime
from typing import Optional, Dict, Any

class ClientproductBase(BaseModel):
    client_id: int
    product_name: Optional[str] = None
    status: str = "active"
    start_date: date
    end_date: Optional[date] = None
    weighting: Optional[float] = 0.0
    plan_number: Optional[str] = None
    provider_id: Optional[int] = None
    provider_name: Optional[str] = None
    provider_theme_color: Optional[str] = None
    product_type: Optional[str] = None
    portfolio_id: Optional[int] = None
    target_risk: Optional[float] = Field(None, ge=1, le=7, description="Target risk level (1-7 scale)")
    original_template_id: Optional[int] = None
    original_template_name: Optional[str] = None
    template_info: Optional[Dict[str, Any]] = None

    @validator('target_risk')
    def validate_target_risk(cls, v):
        if v is not None and (v < 1 or v > 7):
            raise ValueError('Target risk must be between 1 and 7')
        return v

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
    weighting: Optional[float] = None
    plan_number: Optional[str] = None
    provider_id: Optional[int] = None
    product_type: Optional[str] = None
    portfolio_id: Optional[int] = None
    target_risk: Optional[float] = Field(None, ge=1, le=7, description="Target risk level (1-7 scale)")
    notes: Optional[str] = None

    @validator('target_risk')
    def validate_target_risk(cls, v):
        if v is not None and (v < 1 or v > 7):
            raise ValueError('Target risk must be between 1 and 7')
        return v

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