from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
import logging

from app.db.database import get_db
from app.api.routes.auth import get_current_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

# Note: Profile endpoints have been moved to auth.py to avoid duplication
# - GET /api/auth/profiles for getting all profiles
# - DELETE /api/auth/profiles/{user_id} for deleting a profile 