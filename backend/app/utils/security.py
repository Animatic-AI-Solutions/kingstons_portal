"""
Security Utilities for Authentication

This module provides security-related functions for authentication:
- Password hashing and verification
- JWT token generation and validation
"""

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import logging
from fastapi import Depends, HTTPException, Cookie, Request
from typing import Optional
from app.db.database import get_db

# Configure logging
logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        return False

def get_password_hash(password: str) -> str:
    """Generate a password hash"""
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    # Default to 24 hours if not specified
    expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
    expire = datetime.utcnow() + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, os.getenv("JWT_SECRET"), algorithm="HS256")

def decode_token(token: str) -> dict:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        return payload
    except JWTError as e:
        logger.error(f"Token validation error: {str(e)}")
        return None

def decode_token_from_cookie(access_token: Optional[str] = Cookie(None)) -> dict:
    """Decode and validate a JWT token from httpOnly cookie"""
    if not access_token:
        return None
    
    try:
        payload = jwt.decode(access_token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        return payload
    except JWTError as e:
        logger.error(f"Cookie token validation error: {str(e)}")
        return None

def get_user_from_token_cookie(
    access_token: Optional[str] = Cookie(None),
    db = Depends(get_db)
):
    """
    Validates the JWT token from httpOnly cookie and returns the associated user.
    
    Args:
        access_token: JWT token from httpOnly cookie
        db: Database connection
        
    Returns:
        User object if token is valid
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated - no token cookie")
    
    # Decode and validate token
    payload = decode_token_from_cookie(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    # Get user profile
    user_result = db.table("profiles").select("*").eq("id", int(user_id)).execute()
    
    if not user_result.data or len(user_result.data) == 0:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user_result.data[0]

async def get_user_from_session(
    session_id: Optional[str] = Cookie(None),
    db = Depends(get_db)
):
    """
    Validates the session cookie and returns the associated user.
    
    Args:
        session_id: Session ID from cookie
        db: Database connection
        
    Returns:
        User object if session is valid
        
    Raises:
        HTTPException: If session is invalid or expired
    """
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated - no session cookie")
        
    # Validate session from database
    session_result = db.table("session").select("*").eq("session_id", session_id).execute()
    
    if not session_result.data or len(session_result.data) == 0:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    session = session_result.data[0]
    
    # Check if session is expired
    if "expires_at" in session and session["expires_at"]:
        expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow() > expires_at:
            # Clean up expired session
            db.table("session").delete().eq("session_id", session_id).execute()
            raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user profile
    user_result = db.table("profiles").select("*").eq("id", session["profiles_id"]).execute()
    
    if not user_result.data or len(user_result.data) == 0:
        raise HTTPException(status_code=401, detail="User not found")
        
    # Update last activity timestamp
    db.table("session").update({
        "last_activity": datetime.utcnow().isoformat()
    }).eq("session_id", session_id).execute()
    
    return user_result.data[0] 