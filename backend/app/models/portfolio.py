from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date, datetime

class PortfolioBase(BaseModel):
    """Base model for portfolio data"""
    portfolio_name: Optional[str] = None
    status: Optional[str] = "active"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    template_generation_id: Optional[int] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat()},
        from_attributes=True
    )

class PortfolioCreate(PortfolioBase):
    """Model for creating a new portfolio"""
    pass

class PortfolioUpdate(PortfolioBase):
    """Model for updating an existing portfolio"""
    pass

class Portfolio(PortfolioBase):
    """Complete portfolio model returned to frontend"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TemplateInfo(BaseModel):
    """Information about a portfolio template"""
    id: int
    name: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(
        json_encoders={datetime: lambda dt: dt.isoformat()},
        from_attributes=True
    )

class PortfolioWithTemplate(PortfolioBase):
    """Extended portfolio model that includes template info"""
    template_info: Optional[TemplateInfo] = None
    
    model_config = ConfigDict(
        json_encoders={date: lambda d: d.isoformat(), datetime: lambda dt: dt.isoformat()},
        from_attributes=True
    )
