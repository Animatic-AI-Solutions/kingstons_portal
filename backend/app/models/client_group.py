from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

# =============================================================================
# BASE MODELS
# =============================================================================

class ClientGroupBase(BaseModel):
    """Base model for client group data with advisor relationship support"""
    name: Optional[str] = Field(default="")
    status: Optional[str] = Field(default="active")
    type: Optional[str] = Field(default="Family")
    created_at: Optional[str] = Field(default=None)  # Allow setting start date when creating/updating
    
    # New advisor relationship field
    advisor_id: Optional[int] = Field(default=None, description="Foreign key to profiles table")
    
    # Legacy advisor field (keep for backward compatibility)
    advisor: Optional[str] = Field(default=None, description="Legacy advisor text field")

    model_config = ConfigDict(
        from_attributes=True
    )

# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ClientGroupCreate(ClientGroupBase):
    """Model for creating a new client group"""
    name: str  # Required for creation
    advisor_id: Optional[int] = None  # Optional advisor assignment

class ClientGroupUpdate(BaseModel):
    """Model for updating an existing client group"""
    name: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    created_at: Optional[str] = None  # Allow updating client start date
    advisor_id: Optional[int] = None  # Can update advisor assignment
    advisor: Optional[str] = None  # Legacy field

    model_config = ConfigDict(
        from_attributes=True
    )

class ClientGroupInDB(ClientGroupBase):
    """Model for client group as stored in database"""
    id: int
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class ClientGroup(ClientGroupInDB):
    """Complete client group model with advisor information from database views"""
    
    # Computed advisor fields from database views
    advisor_name: Optional[str] = Field(default=None, description="Full advisor name from profiles")
    advisor_email: Optional[str] = Field(default=None, description="Advisor email from profiles") 
    advisor_first_name: Optional[str] = Field(default=None, description="Advisor first name")
    advisor_last_name: Optional[str] = Field(default=None, description="Advisor last name")
    advisor_assignment_status: Optional[str] = Field(default=None, description="HAS_ADVISOR, LEGACY_ADVISOR_ONLY, or NO_ADVISOR")

# =============================================================================
# ADVISOR MANAGEMENT MODELS
# =============================================================================

class AdvisorInfo(BaseModel):
    """Model for advisor information from profiles"""
    advisor_id: int = Field(description="Profile ID")
    first_name: str
    last_name: str
    full_name: str
    email: str
    client_groups_count: int = Field(description="Number of assigned client groups")
    total_products_count: int = Field(description="Total products across all assigned clients")
    
    model_config = ConfigDict(
        from_attributes=True
    )
