# =============================================================================
# UPDATED PYDANTIC MODELS: backend/app/models/client_group.py
# =============================================================================
# This file shows the updated client_group models to support advisor relationships
# Copy these changes to your actual backend/app/models/client_group.py file

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# =============================================================================
# BASE MODELS
# =============================================================================

class ClientGroupBase(BaseModel):
    """Base model for client group with advisor relationship support"""
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    advisor_id: Optional[int] = Field(default=None, description="Foreign key to profiles table")
    
    class Config:
        from_attributes = True

# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ClientGroupCreate(ClientGroupBase):
    """Model for creating client groups"""
    name: str  # Required for creation
    advisor_id: Optional[int] = None  # Optional advisor assignment
    
class ClientGroupUpdate(ClientGroupBase):
    """Model for updating client groups"""
    advisor_id: Optional[int] = None  # Can update advisor assignment

class ClientGroup(ClientGroupBase):
    """Full client group model with all fields including computed advisor data"""
    id: int
    created_at: datetime
    
    # Core advisor relationship
    advisor_id: Optional[int] = None
    
    # Computed advisor fields from database views
    advisor_name: Optional[str] = Field(default=None, description="Full advisor name from profiles")
    advisor_email: Optional[str] = Field(default=None, description="Advisor email from profiles") 
    advisor_first_name: Optional[str] = Field(default=None, description="Advisor first name")
    advisor_last_name: Optional[str] = Field(default=None, description="Advisor last name")
    advisor_assignment_status: Optional[str] = Field(default=None, description="HAS_ADVISOR, LEGACY_ADVISOR_ONLY, or NO_ADVISOR")
    
    # Legacy field for backward compatibility during transition
    advisor: Optional[str] = Field(default=None, description="Legacy advisor text field (for compatibility)", alias="legacy_advisor_text")
    
    class Config:
        from_attributes = True
        populate_by_name = True  # Allows both 'advisor' and 'legacy_advisor_text' field names

# =============================================================================
# ADVISOR MANAGEMENT MODELS
# =============================================================================

class AdvisorAssignment(BaseModel):
    """Model for advisor assignment requests"""
    advisor_id: Optional[int] = Field(description="Profile ID to assign as advisor, or null to unassign")

class AdvisorInfo(BaseModel):
    """Model for advisor information from profiles"""
    advisor_id: int = Field(description="Profile ID")
    first_name: str
    last_name: str
    full_name: str
    email: str
    client_groups_count: int = Field(description="Number of assigned client groups")
    total_products_count: int = Field(description="Total products across all assigned clients")
    
    class Config:
        from_attributes = True

class AdvisorSummary(BaseModel):
    """Model for advisor workload summary"""
    advisor_id: int
    full_name: str
    email: str
    client_groups_count: int
    total_products_count: int
    client_group_names: str  # Comma-separated list
    
    class Config:
        from_attributes = True

# =============================================================================
# SEARCH AND ANALYTICS MODELS
# =============================================================================

class ClientWithAdvisor(BaseModel):
    """Enhanced client model with advisor information for search results"""
    id: int
    name: str
    type: Optional[str] = None
    status: Optional[str] = None
    advisor_name: Optional[str] = None
    advisor_email: Optional[str] = None
    advisor_assignment_status: Optional[str] = None
    
    class Config:
        from_attributes = True

# =============================================================================
# MIGRATION STATUS MODELS  
# =============================================================================

class AdvisorMigrationStatus(BaseModel):
    """Model for advisor migration status overview"""
    report_type: str
    total_client_groups: int
    groups_with_advisor_profile: int
    groups_with_legacy_advisor_only: int
    groups_with_no_advisor: int
    unique_advisors_assigned: int
    advisor_profiles_in_use: int
    
    class Config:
        from_attributes = True

# =============================================================================
# USAGE EXAMPLES
# =============================================================================

"""
Example API Response with new advisor fields:

{
    "id": 123,
    "name": "ABC Company Ltd",
    "type": "Family", 
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z",
    
    // New advisor relationship fields
    "advisor_id": 5,
    "advisor_name": "Debbie Kingston",
    "advisor_email": "debbie@kingstonsfinancial.com",
    "advisor_first_name": "Debbie",
    "advisor_last_name": "Kingston", 
    "advisor_assignment_status": "HAS_ADVISOR",
    
    // Legacy field for backward compatibility
    "advisor": "Debbie"  // Can be null if migrated
}

Example advisor assignment request:
{
    "advisor_id": 5  // Assign Debbie
}

{
    "advisor_id": null  // Unassign advisor
}
""" 