from fastapi import APIRouter, HTTPException, Depends, Response, Cookie, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import Optional, List
import logging
import uuid

from app.models.auth import (
    LoginRequest, SignUpRequest, LoginResponse, LogoutResponse,
    PasswordResetRequest, PasswordResetTokenVerify, PasswordReset, Token,
    ProfileUpdate, ProfileUpdateResponse
)
from app.utils.security import verify_password, get_password_hash, create_access_token, decode_token, get_user_from_session
from app.utils.email import send_password_reset_email, generate_reset_token
from app.db.database import get_db

# Configure logging for this module
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create API router and security scheme
router = APIRouter()
security = HTTPBearer()

@router.post("/auth/signup")
async def signup(
    signup_data: SignUpRequest,
    db = Depends(get_db)
):
    """
    What it does: Creates a new user product.
    Why it's needed: Allows new users to register in the system.
    How it works:
        1. Checks if email is already taken
        2. Creates user profile in profiles table
        3. Creates authentication record with hashed password
    Expected output: A success message
    """
    try:
        logger.info(f"Attempting to create new user with email: {signup_data.email}")
        
        # Check if email already exists
        logger.info("Checking if email exists...")
        existing_user = db.table("profiles").select("*").eq("email", signup_data.email).execute()
        if existing_user.data and len(existing_user.data) > 0:
            logger.warning(f"Email {signup_data.email} already exists")
            raise HTTPException(status_code=400, detail="Email already exists")

        # Create new user profile
        profile_data = {
            "email": signup_data.email,
            "first_name": signup_data.first_name,
            "last_name": signup_data.last_name
        }
        
        logger.info("Attempting to insert new profile into database...")
        profile_result = db.table("profiles").insert(profile_data).execute()
        
        if not profile_result.data or len(profile_result.data) == 0:
            logger.error("Database insert for profile returned no data")
            raise HTTPException(status_code=500, detail="Failed to create user profile")

        profile_id = profile_result.data[0]["id"]
        logger.info(f"Profile created with ID: {profile_id}")
        
        # Hash the password and create authentication record
        logger.info("Creating authentication record...")
        password_hash = get_password_hash(signup_data.password)
        
        auth_data = {
            "profiles_id": profile_id,
            "password_hash": password_hash,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        auth_result = db.table("authentication").insert(auth_data).execute()
        
        if not auth_result.data or len(auth_result.data) == 0:
            # Rollback profile creation if authentication fails
            db.table("profiles").delete().eq("id", profile_id).execute()
            logger.error("Failed to create authentication record")
            raise HTTPException(status_code=500, detail="Failed to create authentication record")

        logger.info(f"Successfully created user with email: {signup_data.email}")
        return {"message": "User created successfully"}

    except HTTPException as he:
        logger.error(f"HTTP Exception during signup: {str(he)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during signup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Signup error: {str(e)}")

@router.post("/auth/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    response: Response,
    db = Depends(get_db)
):
    """
    What it does: Authenticates a user and creates a new session.
    Why it's needed: Allows users to log in to the system and maintain their session.
    How it works:
        1. Validates the login credentials using email
        2. Checks the password hash against the stored hash in authentication table
        3. Creates a JWT token and session
        4. Returns user information and token
    Expected output: A JSON object containing login response with token
    """
    try:
        logger.info(f"Login attempt started for email: {login_data.email}")
        
        # Get user profile from database
        profile_result = db.table("profiles").select("*").eq("email", login_data.email).execute()
        if not profile_result.data or len(profile_result.data) == 0:
            logger.warning(f"Login failed: User with email {login_data.email} not found")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        profile = profile_result.data[0]
        logger.info(f"Found profile with ID: {profile['id']}")
        
        # Get authentication record
        auth_result = db.table("authentication").select("*").eq("profiles_id", profile["id"]).execute()
        if not auth_result.data or len(auth_result.data) == 0:
            logger.warning(f"Login failed: No authentication record for profile {profile['id']}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
            
        auth = auth_result.data[0]
        
        # Verify password
        if not verify_password(login_data.password, auth["password_hash"]):
            logger.warning(f"Login failed: Invalid password for email {login_data.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login time
        db.table("authentication").update({"last_login": datetime.utcnow().isoformat()})\
            .eq("auth_id", auth["auth_id"]).execute()
        
        # Create JWT token
        token_data = {"sub": str(profile["id"])}
        access_token = create_access_token(token_data)
        logger.info(f"Created JWT token for user {profile['id']}")
        
        # Create session
        session_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=7)
        
        session_data = {
            "session_id": session_id,
            "profiles_id": profile["id"],
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat(),
            "last_activity": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Creating new session with ID: {session_id} for user {profile['id']}")
        session_result = db.table("session").insert(session_data).execute()
        
        if not session_result.data or len(session_result.data) == 0:
            logger.error("Failed to create session")
            raise HTTPException(status_code=500, detail="Failed to create session")

        logger.info(f"Session created with ID: {session_id}")
        
        # Set session cookie
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=False,  # Set to False for local development, True for production
            samesite="lax",
            max_age=7 * 24 * 60 * 60,  # 7 days
            domain=None  # Remove domain restriction for local development
        )
        logger.info(f"Set session_id cookie to {session_id}")

        # Return response with token and user info
        return LoginResponse(
            message="Login successful",
            access_token=access_token,
            token_type="bearer",
            user=profile
        )

    except HTTPException as he:
        logger.error(f"HTTP Exception during login: {str(he)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@router.post("/auth/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    session_id: Optional[str] = Cookie(None),
    db = Depends(get_db)
):
    """
    What it does: Logs out a user by invalidating their session.
    Why it's needed: Allows users to securely end their session.
    How it works:
        1. Retrieves the session from the session cookie
        2. Deletes the session from the database
        3. Clears the session cookie
    Expected output: A success message confirming logout
    """
    try:
        if session_id:
            # Delete the session from the database
            db.table("session").delete().eq("session_id", session_id).execute()
            logger.info(f"Deleted session {session_id} from database")

        # Remove the cookie regardless of whether we found the session
        response.delete_cookie(
            key="session_id",
            httponly=True,
            secure=False,  # Set to False for local development
            samesite="lax"
        )

        return LogoutResponse(message="Logout successful")
    except Exception as e:
        logger.error(f"Error during logout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Logout error: {str(e)}")

@router.post("/auth/forgot-password")
async def forgot_password(reset_request: PasswordResetRequest, db = Depends(get_db)):
    """
    What it does: Initiates a password reset process.
    Why it's needed: Allows users to reset their password if forgotten.
    How it works:
        1. Checks if the email exists
        2. Generates a reset token
        3. Sends a password reset email (simulated)
    Expected output: A success message
    """
    try:
        # Check if email exists
        profile_result = db.table("profiles").select("*").eq("email", reset_request.email).execute()
        if not profile_result.data or len(profile_result.data) == 0:
            # Don't reveal if email exists or not for security
            return {"message": "If your email exists in our system, you will receive a password reset link"}
            
        profile = profile_result.data[0]
        
        # Generate reset token
        reset_token = generate_reset_token()
        token_expiry = datetime.utcnow() + timedelta(minutes=30)
        
        # Store token in database - using authentication table to store reset token
        db.table("authentication").update({
            "reset_token": reset_token,
            "reset_token_expires": token_expiry.isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("profiles_id", profile["id"]).execute()
        
        # Send password reset email
        await send_password_reset_email(reset_request.email, reset_token)
        
        return {"message": "If your email exists in our system, you will receive a password reset link"}
    except Exception as e:
        logger.error(f"Error during password reset request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Password reset request error: {str(e)}")

@router.post("/auth/verify-reset-token")
async def verify_reset_token(token_data: PasswordResetTokenVerify, db = Depends(get_db)):
    """
    What it does: Verifies a password reset token.
    Why it's needed: Ensures the reset token is valid before allowing password reset.
    How it works:
        1. Checks if the token exists in the database
        2. Verifies the token has not expired
    Expected output: Success message if token is valid
    """
    try:
        # Find the token in the database
        auth_result = db.table("authentication").select("*").eq("reset_token", token_data.token).execute()
        
        if not auth_result.data or len(auth_result.data) == 0:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
            
        auth = auth_result.data[0]
        
        # Check if token has expired
        if "reset_token_expires" not in auth or not auth["reset_token_expires"]:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
            
        expires_at = datetime.fromisoformat(auth["reset_token_expires"].replace("Z", "+00:00"))
        if datetime.utcnow() > expires_at:
            raise HTTPException(status_code=400, detail="Reset token has expired")
            
        return {"message": "Token is valid", "profiles_id": auth["profiles_id"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying reset token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Token verification error: {str(e)}")

@router.post("/auth/reset-password")
async def reset_password(reset_data: PasswordReset, db = Depends(get_db)):
    """
    What it does: Resets a user's password.
    Why it's needed: Allows users to set a new password after receiving a reset token.
    How it works:
        1. Verifies the reset token
        2. Updates the password hash
        3. Clears the reset token
    Expected output: Success message if password is reset
    """
    try:
        # Find the token in the database
        auth_result = db.table("authentication").select("*").eq("reset_token", reset_data.token).execute()
        
        if not auth_result.data or len(auth_result.data) == 0:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
            
        auth = auth_result.data[0]
        
        # Check if token has expired
        if "reset_token_expires" not in auth or not auth["reset_token_expires"]:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
            
        expires_at = datetime.fromisoformat(auth["reset_token_expires"].replace("Z", "+00:00"))
        if datetime.utcnow() > expires_at:
            raise HTTPException(status_code=400, detail="Reset token has expired")
        
        # Update password
        password_hash = get_password_hash(reset_data.new_password)
        
        db.table("authentication").update({
            "password_hash": password_hash,
            "reset_token": None,
            "reset_token_expires": None,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("auth_id", auth["auth_id"]).execute()
        
        return {"message": "Password has been reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Password reset error: {str(e)}")

async def get_current_user(
    request: Request,
    token: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session_id: Optional[str] = Cookie(None),
    db = Depends(get_db)
):
    """
    What it does: Validates either JWT token or session cookie and returns the current user.
    Why it's needed: Used as a dependency for protected routes.
    How it works:
        1. First tries to validate using JWT token from Authorization header
        2. If that fails, tries to validate using session cookie
        3. Returns the user if either method succeeds
    Expected output: User object if authentication is valid
    """
    logger.info(f"Authentication attempt - Token: {bool(token)}, Session: {bool(session_id)}")
    
    # Try token authentication first
    if token:
        try:
            # Extract token from credentials
            token_str = token.credentials if isinstance(token, HTTPAuthorizationCredentials) else token
            
            # Decode and validate token
            payload = decode_token(token_str)
            if payload is not None:
                user_id = payload.get("sub")
                if user_id is not None:
                    # Get user from database
                    user_result = db.table("profiles").select("*").eq("id", int(user_id)).execute()
                    
                    if user_result.data and len(user_result.data) > 0:
                        logger.info(f"User authenticated via token: {user_id}")
                        return user_result.data[0]
        except Exception as e:
            logger.warning(f"Token authentication failed: {str(e)}")
            # Continue to try session authentication
    
    # Try session authentication if token auth failed or no token provided
    if session_id:
        try:
            session_result = db.table("session").select("*").eq("session_id", session_id).execute()
            
            if session_result.data and len(session_result.data) > 0:
                session = session_result.data[0]
                
                # Check if session is expired
                if "expires_at" in session and session["expires_at"]:
                    expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
                    if datetime.utcnow() > expires_at:
                        logger.warning(f"Session {session_id} has expired")
                        raise HTTPException(status_code=401, detail="Session expired")
                
                # Get user from database
                user_result = db.table("profiles").select("*").eq("id", session["profiles_id"]).execute()
        
                if user_result.data and len(user_result.data) > 0:
                    # Update last activity
                    db.table("session").update({
                        "last_activity": datetime.utcnow().isoformat()
                    }).eq("session_id", session_id).execute()
                    
                    logger.info(f"User authenticated via session: {session['profiles_id']}")
                    return user_result.data[0]
        except Exception as e:
            logger.warning(f"Session authentication failed: {str(e)}")
            # Both auth methods failed, continue to exception
    
    # If we get here, both authentication methods failed
    logger.warning("Authentication failed - both token and session invalid")
    raise HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    What it does: Returns the current user's profile information.
    Why it's needed: Allows the frontend to get the current user's details.
    How it works:
        1. Uses the get_current_user dependency to validate the token
        2. Returns the user information
    Expected output: User profile object
    """
    return current_user

@router.put("/auth/update-profile")
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    What it does: Updates the current user's profile information.
    Why it's needed: Allows users to customize their profile settings.
    How it works:
        1. Gets the current user
        2. Updates their profile with the provided data
        3. Returns the updated user profile
    Expected output: Updated user profile data
    """
    try:
        logger.info(f"Profile update attempt for user ID: {current_user['id']}")
        logger.info(f"Received profile data: {profile_data}")
        
        # Validate preferred landing page
        valid_pages = ['/', '/clients', '/products', '/definitions', '/reporting']
        if profile_data.preferred_landing_page:
            # Trim any whitespace and ensure it's a valid page
            landing_page = profile_data.preferred_landing_page.strip()
            if landing_page not in valid_pages:
                logger.warning(f"Invalid landing page: {landing_page}")
                raise HTTPException(status_code=400, detail="Invalid landing page selected")
            # Use the cleaned value
            profile_data.preferred_landing_page = landing_page
        
        # Only include fields that exist in the database
        update_data = {}
        if profile_data.preferred_landing_page is not None:
            update_data["preferred_landing_page"] = profile_data.preferred_landing_page
        if profile_data.profile_picture_url is not None:
            update_data["profile_picture_url"] = profile_data.profile_picture_url
        if profile_data.preferred_client_view is not None:
            update_data["preferred_client_view"] = profile_data.preferred_client_view
        
        if not update_data:
            logger.warning("No valid profile data provided for update")
            raise HTTPException(status_code=400, detail="No changes to save")
            
        logger.info(f"Updating profile for user ID: {current_user['id']} with data: {update_data}")
        
        try:
            update_result = db.table("profiles").update(update_data).eq("id", current_user["id"]).execute()
            logger.info(f"Update result: {update_result}")
            
            if not update_result.data:
                logger.error(f"Profile update failed for user ID: {current_user['id']}")
                raise HTTPException(status_code=500, detail="Failed to update profile")
        except Exception as db_error:
            logger.error(f"Database error: {str(db_error)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
            
        # Get updated user profile
        updated_user = db.table("profiles").select("*").eq("id", current_user["id"]).execute()
        
        if not updated_user.data or len(updated_user.data) == 0:
            logger.error(f"Could not retrieve updated profile for user ID: {current_user['id']}")
            raise HTTPException(status_code=500, detail="Failed to retrieve updated profile")
            
        logger.info(f"Profile successfully updated for user ID: {current_user['id']}")
        
        return {
            "message": "Profile updated successfully",
            "user": updated_user.data[0]
        }
    except HTTPException as he:
        logger.error(f"HTTP Exception: {str(he)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during profile update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Profile update error: {str(e)}") 