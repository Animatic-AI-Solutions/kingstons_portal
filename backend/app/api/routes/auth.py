from fastapi import APIRouter, HTTPException, Depends, Response, Cookie, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import Optional, List
import logging
import uuid
import os

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
        existing_user = await db.fetch("SELECT * FROM profiles WHERE email = $1", signup_data.email)
        if existing_user and len(existing_user) > 0:
            logger.warning(f"Email {signup_data.email} already exists")
            raise HTTPException(status_code=400, detail="Email already exists")

        # Create new user profile
        profile_data = {
            "email": signup_data.email,
            "first_name": signup_data.first_name,
            "last_name": signup_data.last_name
        }
        
        logger.info("Attempting to insert new profile into database...")
        profile_result = await db.fetchrow(
            "INSERT INTO profiles (email, first_name, last_name) VALUES ($1, $2, $3) RETURNING *",
            profile_data["email"], profile_data["first_name"], profile_data["last_name"]
        )
        
        if not profile_result:
            logger.error("Database insert for profile returned no data")
            raise HTTPException(status_code=500, detail="Failed to create user profile")

        profile_id = profile_result["id"]
        logger.info(f"Profile created with ID: {profile_id}")
        
        # Hash the password and create authentication record
        logger.info("Creating authentication record...")
        password_hash = get_password_hash(signup_data.password)
        
        auth_data = {
            "profiles_id": profile_id,
            "password_hash": password_hash,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        auth_result = await db.fetchrow(
            "INSERT INTO authentication (profiles_id, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4) RETURNING *",
            auth_data["profiles_id"], auth_data["password_hash"], auth_data["created_at"], auth_data["updated_at"]
        )
        
        if not auth_result:
            # Rollback profile creation if authentication fails
            await db.execute("DELETE FROM profiles WHERE id = $1", profile_id)
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
        profile_result = await db.fetchrow("SELECT * FROM profiles WHERE email = $1", login_data.email)
        if not profile_result:
            logger.warning(f"Login failed: User with email {login_data.email} not found")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        profile = dict(profile_result)
        logger.info(f"Found profile with ID: {profile['id']}")
        
        # Get authentication record
        auth_result = await db.fetchrow("SELECT * FROM authentication WHERE profiles_id = $1", profile["id"])
        if not auth_result:
            logger.warning(f"Login failed: No authentication record for profile {profile['id']}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
            
        auth = dict(auth_result)
        
        # Verify password
        if not verify_password(login_data.password, auth["password_hash"]):
            logger.warning(f"Login failed: Invalid password for email {login_data.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login time (last_login is TEXT field)
        await db.execute(
            "UPDATE authentication SET last_login = $1 WHERE auth_id = $2",
            datetime.utcnow().isoformat(), auth["auth_id"]
        )
        
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
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "last_activity": datetime.utcnow().isoformat()  # last_activity is TEXT field
        }
        
        logger.info(f"Creating new session with ID: {session_id} for user {profile['id']}")
        session_result = await db.fetchrow(
            "INSERT INTO session (session_id, profiles_id, created_at, expires_at, last_activity) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            session_data["session_id"], session_data["profiles_id"], session_data["created_at"], 
            session_data["expires_at"], session_data["last_activity"]
        )
        
        if not session_result:
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

        # Set JWT token as httpOnly cookie
        token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,  # Set to False for local development, True for production
            samesite="lax",
            max_age=token_expire_minutes * 60,  # Convert minutes to seconds
            domain=None  # Remove domain restriction for local development
        )
        logger.info(f"Set access_token cookie for user {profile['id']}")

        # Return response without token (token is now in httpOnly cookie)
        return LoginResponse(
            message="Login successful",
            access_token="",  # Empty token as it's now in cookie
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
            await db.execute("DELETE FROM session WHERE session_id = $1", session_id)
            logger.info(f"Deleted session {session_id} from database")

        # Remove the cookies regardless of whether we found the session
        response.delete_cookie(
            key="session_id",
            httponly=True,
            secure=False,  # Set to False for local development
            samesite="lax"
        )
        response.delete_cookie(
            key="access_token",
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
        profile_result = await db.fetchrow("SELECT * FROM profiles WHERE email = $1", reset_request.email)
        if not profile_result:
            # Don't reveal if email exists or not for security
            return {"message": "If your email exists in our system, you will receive a password reset link"}
            
        profile = dict(profile_result)
        
        # Generate reset token
        reset_token = generate_reset_token()
        token_expiry = datetime.utcnow() + timedelta(minutes=30)
        
        # Store token in database - using authentication table to store reset token
        await db.execute(
            "UPDATE authentication SET reset_token = $1, reset_token_expires = $2, updated_at = $3 WHERE profiles_id = $4",
            reset_token, token_expiry, datetime.utcnow(), profile["id"]
        )
        
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
        auth_result = await db.fetchrow("SELECT * FROM authentication WHERE reset_token = $1", token_data.token)
        
        if not auth_result:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
            
        auth = dict(auth_result)
        
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
        auth_result = await db.fetchrow("SELECT * FROM authentication WHERE reset_token = $1", reset_data.token)
        
        if not auth_result:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
            
        auth = dict(auth_result)
        
        # Check if token has expired
        if "reset_token_expires" not in auth or not auth["reset_token_expires"]:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
            
        expires_at = datetime.fromisoformat(auth["reset_token_expires"].replace("Z", "+00:00"))
        if datetime.utcnow() > expires_at:
            raise HTTPException(status_code=400, detail="Reset token has expired")
        
        # Update password
        password_hash = get_password_hash(reset_data.new_password)
        
        await db.execute(
            "UPDATE authentication SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = $2 WHERE auth_id = $3",
            password_hash, datetime.utcnow(), auth["auth_id"]
        )
        
        return {"message": "Password has been reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Password reset error: {str(e)}")

async def get_current_user(
    request: Request,
    access_token: Optional[str] = Cookie(None),
    session_id: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
    db = Depends(get_db)
):
    """
    What it does: Validates JWT token from cookie, Authorization header, or session cookie and returns the current user.
    Why it's needed: Used as a dependency for protected routes.
    How it works:
        1. First tries to validate using JWT token from httpOnly cookie
        2. Falls back to JWT token from Authorization header  
        3. Finally tries to validate using session cookie
        4. Returns the user if any method succeeds
    Expected output: User object if authentication is valid
    """
    logger.info(f"Authentication attempt - Cookie Token: {bool(access_token)}, Header Token: {bool(authorization)}, Session: {bool(session_id)}")
    
    # Try cookie-based JWT authentication first (most secure)
    if access_token:
        try:
            # Decode and validate token from cookie
            payload = decode_token(access_token)
            if payload is not None:
                user_id = payload.get("sub")
                if user_id is not None:
                    # Get user from database
                    user_result = await db.fetchrow("SELECT * FROM profiles WHERE id = $1", int(user_id))
                    
                    if user_result:
                        logger.info(f"User authenticated via cookie token: {user_id}")
                        return dict(user_result)
        except Exception as e:
            logger.warning(f"Cookie token authentication failed: {str(e)}")
            # Continue to try header token authentication
    
    # Try authorization header token authentication (fallback for API clients)
    if authorization and authorization.startswith("Bearer "):
        try:
            # Extract token from Bearer header
            token_str = authorization.replace("Bearer ", "", 1)
            
            # Decode and validate token
            payload = decode_token(token_str)
            if payload is not None:
                user_id = payload.get("sub")
                if user_id is not None:
                    # Get user from database
                    user_result = await db.fetchrow("SELECT * FROM profiles WHERE id = $1", int(user_id))
                    
                    if user_result:
                        logger.info(f"User authenticated via header token: {user_id}")
                        return dict(user_result)
        except Exception as e:
            logger.warning(f"Header token authentication failed: {str(e)}")
            # Continue to try session authentication
    
    # Try session authentication if token auth failed or no token provided
    if session_id:
        try:
            session_result = await db.fetchrow("SELECT * FROM session WHERE session_id = $1", session_id)
            
            if session_result:
                session = dict(session_result)
                
                # Check if session is expired
                if "expires_at" in session and session["expires_at"]:
                    expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
                    if datetime.utcnow() > expires_at:
                        logger.warning(f"Session {session_id} has expired")
                        raise HTTPException(status_code=401, detail="Session expired")
                
                # Get user from database
                user_result = await db.fetchrow("SELECT * FROM profiles WHERE id = $1", session["profiles_id"])
        
                if user_result:
                    # Update last activity (last_activity is TEXT field)
                    await db.execute(
                        "UPDATE session SET last_activity = $1 WHERE session_id = $2",
                        datetime.utcnow().isoformat(), session_id
                    )
                    
                    logger.info(f"User authenticated via session: {session['profiles_id']}")
                    return dict(user_result)
        except Exception as e:
            logger.warning(f"Session authentication failed: {str(e)}")
            # Both auth methods failed, continue to exception
    
    # If we get here, all authentication methods failed
    logger.warning("Authentication failed - cookie token, authorization header, and session all invalid")
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
        valid_pages = ['/', '/client_groups']
        if profile_data.preferred_landing_page:
            # Trim any whitespace and ensure it's a valid page
            landing_page = profile_data.preferred_landing_page.strip()
            if landing_page not in valid_pages:
                logger.warning(f"Invalid landing page: {landing_page}")
                raise HTTPException(status_code=400, detail="Invalid landing page selected. Please choose either Home or Client Groups.")
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
            # Create dynamic UPDATE query
            set_clauses = []
            params = []
            param_index = 1
            
            for key, value in update_data.items():
                set_clauses.append(f"{key} = ${param_index}")
                params.append(value)
                param_index += 1
            
            params.append(current_user["id"])  # Add user ID for WHERE clause
            
            update_query = f"UPDATE profiles SET {', '.join(set_clauses)} WHERE id = ${param_index} RETURNING *"
            update_result = await db.fetchrow(update_query, *params)
            logger.info(f"Update result: {update_result}")
            
            if not update_result:
                logger.error(f"Profile update failed for user ID: {current_user['id']}")
                raise HTTPException(status_code=500, detail="Failed to update profile")
        except Exception as db_error:
            logger.error(f"Database error: {str(db_error)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
            
        # Use the already updated profile from the UPDATE query
        logger.info(f"Profile successfully updated for user ID: {current_user['id']}")
        
        return {
            "message": "Profile updated successfully",
            "user": dict(update_result)
        }
    except HTTPException as he:
        logger.error(f"HTTP Exception: {str(he)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during profile update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Profile update error: {str(e)}") 



 