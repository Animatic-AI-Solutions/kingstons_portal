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
    fixed_cost: Optional[float] = None  # Fixed annual cost
    percentage_fee: Optional[float] = None  # Percentage fee (e.g., 1.5 for 1.5%)

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
    fixed_cost: Optional[float] = None
    percentage_fee: Optional[float] = None

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

class ProductRevenueCalculation(BaseModel):
    """Response model for product revenue calculation"""
    product_id: int
    product_name: Optional[str] = None
    fixed_cost: Optional[float] = None
    percentage_fee: Optional[float] = None
    latest_portfolio_valuation: Optional[float] = None
    valuation_date: Optional[datetime] = None
    calculated_percentage_fee: Optional[float] = None
    total_estimated_annual_revenue: Optional[float] = None
    has_revenue_data: bool = False
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda dt: dt.isoformat() if dt else None
        },
        from_attributes=True
    )