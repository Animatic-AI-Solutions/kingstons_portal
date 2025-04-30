from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    """Model for login request"""
    email: str
    password: str

class SignUpRequest(BaseModel):
    """Model for signup request"""
    email: str
    password: str
    first_name: str
    last_name: str

class LoginResponse(BaseModel):
    """Model for login response"""
    message: str
    access_token: str
    token_type: str = "bearer"
    user: dict

class Token(BaseModel):
    """Model for token response"""
    access_token: str
    token_type: str = "bearer"

class LogoutResponse(BaseModel):
    """Model for logout response"""
    message: str

class PasswordResetRequest(BaseModel):
    """Model for password reset request"""
    email: str

class PasswordResetTokenVerify(BaseModel):
    """Model for password reset token verification"""
    token: str

class PasswordReset(BaseModel):
    """Model for password reset execution"""
    token: str
    new_password: str

class ProfileUpdate(BaseModel):
    """Model for profile update"""
    preferred_landing_page: Optional[str] = '/'
    profile_picture_url: Optional[str] = '/images/Companylogo2.png'
    preferred_client_view: Optional[str] = 'list'

class ProfileUpdateResponse(BaseModel):
    """Model for profile update response"""
    message: str
    user: dict 