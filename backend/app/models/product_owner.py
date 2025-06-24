from pydantic import BaseModel, ConfigDict, Field, computed_field
from typing import Optional
from datetime import datetime

class ProductOwnerBase(BaseModel):
    """Base model for product owner data"""
    firstname: Optional[str] = Field(default="", description="First name of the product owner")
    surname: Optional[str] = Field(default=None, description="Surname/last name of the product owner")
    known_as: Optional[str] = Field(default=None, description="Preferred name or nickname")
    status: Optional[str] = Field(default='active', description="Status of the product owner")

    model_config = ConfigDict(
        from_attributes=True
    )
    
    @computed_field
    @property
    def name(self) -> str:
        """
        Computed field that generates a display name from the name components,
        using "firstname surname".
        """
        name_parts = []
        if self.firstname and self.firstname.strip():
            name_parts.append(self.firstname.strip())
        if self.surname and self.surname.strip():
            name_parts.append(self.surname.strip())
            
        if name_parts:
            return " ".join(name_parts)
        
        # Fall back to known_as if other names are not available
        if self.known_as and self.known_as.strip():
            return self.known_as.strip()
        
        return "Unknown"

class ProductOwnerCreate(ProductOwnerBase):
    """Model for creating a new product owner"""
    pass

class ProductOwnerUpdate(BaseModel):
    """Model for updating an existing product owner"""
    firstname: Optional[str] = Field(default=None, description="First name of the product owner")
    surname: Optional[str] = Field(default=None, description="Surname/last name of the product owner") 
    known_as: Optional[str] = Field(default=None, description="Preferred name or nickname")
    status: Optional[str] = Field(default=None, description="Status of the product owner")

    model_config = ConfigDict(
        from_attributes=True
    )

class ProductOwnerInDBBase(ProductOwnerBase):
    """Model for product owner as stored in database"""
    id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

class ProductOwner(ProductOwnerInDBBase):
    """Complete product owner model returned to frontend"""
    pass 