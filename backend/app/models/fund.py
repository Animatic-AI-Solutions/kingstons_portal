from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class FundBase(BaseModel):
    """Base model for fund data"""
    fund_name: Optional[str] = None
    isin_number: Optional[str] = None
    risk_factor: Optional[int] = None
    fund_cost: Optional[float] = None
    status: str = "active"

class FundCreate(FundBase):
    """Model for creating a new fund"""
    fund_name: str
    isin_number: str
    risk_factor: int
    fund_cost: float

class FundUpdate(FundBase):
    """Model for updating an existing fund"""
    pass

class FundInDB(FundBase):
    """Model for fund data as stored in database"""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FundWithProvider(FundInDB):
    """Model for fund data including provider context"""
    provider_id: Optional[int] = None
    portfolio_id: Optional[int] = None

    @classmethod
    async def get_with_provider(cls, db, fund_id: int, portfolio_id: Optional[int] = None) -> 'FundWithProvider':
        """Get fund data with provider context from a specific portfolio"""
        # Get base fund data
        fund_result = await db.table("available_funds").select("*").eq("id", fund_id).single().execute()
        if not fund_result.data:
            raise ValueError(f"Fund with ID {fund_id} not found")
        
        fund_data = fund_result.data
        
        # If portfolio_id is provided, get provider context
        provider_id = None
        if portfolio_id:
            provider_result = await db.table("portfolio_fund_providers")\
                .select("provider_id")\
                .eq("fund_id", fund_id)\
                .eq("portfolio_id", portfolio_id)\
                .single().execute()
            
            if provider_result.data:
                provider_id = provider_result.data["provider_id"]
        
        return cls(
            **fund_data,
            provider_id=provider_id,
            portfolio_id=portfolio_id
        )
