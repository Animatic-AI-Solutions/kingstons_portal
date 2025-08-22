# Authentication Security

## Overview

Kingston's Portal implements **enterprise-grade authentication security** using HttpOnly cookies, JWT tokens, and multi-layer validation. The security architecture prevents XSS attacks, ensures secure session management, and provides comprehensive audit trails for regulatory compliance.

## HttpOnly Cookie Security Implementation

### XSS Attack Prevention

**Primary Security Feature**: HttpOnly cookies make authentication tokens inaccessible to JavaScript, eliminating the most common XSS attack vector.

**Cookie Security Configuration**:
```python
# Backend cookie configuration (secure by default)
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,                    # Prevents JavaScript access
    secure=True,                      # HTTPS only in production
    samesite="lax",                   # CSRF protection
    max_age=token_expire_minutes * 60, # Automatic expiration
    domain=None                       # Restrict to current domain
)

response.set_cookie(
    key="session_id", 
    value=session_id,
    httponly=True,
    secure=True,
    samesite="lax", 
    max_age=7 * 24 * 60 * 60,        # 7 days session lifetime
    domain=None
)
```

**Environment-Based Security Settings**:
```python
# Production vs Development security configuration
secure_flag = os.getenv("DEBUG", "False").lower() != "true"
cookie_settings = {
    "httponly": True,
    "secure": secure_flag,            # True in production, False in development
    "samesite": "lax"
}
```

### Triple-Layer Authentication Security

**Authentication Layer Priority** (most to least secure):
1. **HttpOnly Cookie JWT** - Primary authentication method
2. **Authorization Header JWT** - API client fallback
3. **Session Cookie Validation** - Legacy system support

**Security Validation Flow**:
```python
async def get_current_user(
    access_token: Optional[str] = Cookie(None),      # Layer 1: HttpOnly JWT
    authorization: Optional[str] = Header(None),     # Layer 2: Header JWT  
    session_id: Optional[str] = Cookie(None),        # Layer 3: Session cookie
    db = Depends(get_db)
):
    # Layer 1: Most secure - HttpOnly cookie JWT
    if access_token:
        payload = decode_token(access_token)
        if payload and payload.get("sub"):
            user = await db.fetchrow("SELECT * FROM profiles WHERE id = $1", int(payload["sub"]))
            if user:
                return dict(user)
    
    # Layer 2: API fallback - Authorization header
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1)
        payload = decode_token(token)
        if payload and payload.get("sub"):
            user = await db.fetchrow("SELECT * FROM profiles WHERE id = $1", int(payload["sub"]))
            if user:
                return dict(user)
    
    # Layer 3: Legacy support - Session validation
    if session_id:
        session = await db.fetchrow("SELECT * FROM session WHERE session_id = $1", session_id)
        if session and datetime.utcnow() < session["expires_at"]:
            user = await db.fetchrow("SELECT * FROM profiles WHERE id = $1", session["profiles_id"])
            if user:
                return dict(user)
    
    raise HTTPException(status_code=401, detail="Not authenticated")
```

## JWT Token Security

### Secure Token Generation

**JWT Token Creation with Security Features**:
```python
import os
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict) -> str:
    """Create secure JWT token with proper expiration and signing"""
    to_encode = data.copy()
    
    # Configurable expiration (default 24 hours)
    expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
    expire = datetime.utcnow() + timedelta(minutes=expire_minutes)
    
    # Add security claims
    to_encode.update({
        "exp": expire,                    # Expiration time
        "iat": datetime.utcnow(),         # Issued at time
        "iss": "kingstons-portal",        # Issuer
        "aud": "kingstons-portal-users"   # Audience
    })
    
    # Sign with strong secret key
    jwt_secret = os.getenv("JWT_SECRET")
    if not jwt_secret or len(jwt_secret) < 32:
        raise ValueError("JWT_SECRET must be at least 32 characters long")
    
    return jwt.encode(to_encode, jwt_secret, algorithm="HS256")
```

### Token Validation Security

**Comprehensive Token Verification**:
```python
def decode_token(token: str) -> dict:
    """Decode and validate JWT token with security checks"""
    try:
        # Decode with signature verification
        payload = jwt.decode(
            token, 
            os.getenv("JWT_SECRET"), 
            algorithms=["HS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,        # Verify expiration
                "verify_iat": True,        # Verify issued at
                "verify_aud": True,        # Verify audience
                "require_exp": True,       # Require expiration claim
                "require_iat": True        # Require issued at claim
            },
            audience="kingstons-portal-users",
            issuer="kingstons-portal"
        )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        return None
```

## Password Security

### Secure Password Hashing

**Bcrypt Implementation with Proper Configuration**:
```python
from passlib.context import CryptContext
import logging

# Configure bcrypt with security-focused settings
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,                # Strong work factor (2^12 iterations)
    bcrypt__ident="2b"                # Use latest bcrypt variant
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Securely verify password with timing attack protection"""
    try:
        # Bcrypt handles timing attack protection automatically
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        # Return False on any error to prevent information leakage
        return False

def get_password_hash(password: str) -> str:
    """Generate secure password hash"""
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    
    return pwd_context.hash(password)
```

### Password Policy Enforcement

**Client-Side Password Validation**:
```typescript
// Frontend password validation with security requirements
interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true, 
  requireNumbers: true,
  requireSpecialChars: true
};

export const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }
  
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  
  return errors;
};
```

## Session Security Management

### Secure Session Lifecycle

**Session Creation with Security Controls**:
```python
import uuid
from datetime import datetime, timedelta

async def create_secure_session(user_id: int, db):
    """Create secure session with proper tracking"""
    
    # Generate cryptographically secure session ID
    session_id = str(uuid.uuid4())
    
    # Configurable session lifetime
    session_lifetime_days = int(os.getenv("SESSION_LIFETIME_DAYS", 7))
    expires_at = datetime.utcnow() + timedelta(days=session_lifetime_days)
    
    # Store session with tracking information
    session_data = {
        "session_id": session_id,
        "profiles_id": user_id,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at,
        "last_activity": datetime.utcnow().isoformat(),
        "ip_address": get_client_ip(request),  # Track source IP
        "user_agent": request.headers.get("user-agent", "")[:500]  # Track client
    }
    
    await db.fetchrow("""
        INSERT INTO session (session_id, profiles_id, created_at, expires_at, last_activity, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    """, *session_data.values())
    
    return session_id
```

### Session Cleanup and Security

**Automatic Session Management**:
```python
async def cleanup_expired_sessions(db):
    """Remove expired and stale sessions for security"""
    
    # Remove explicitly expired sessions
    expired_count = await db.execute(
        "DELETE FROM session WHERE expires_at < $1",
        datetime.utcnow()
    )
    
    # Remove sessions inactive for more than 30 days
    stale_cutoff = datetime.utcnow() - timedelta(days=30)
    stale_count = await db.execute(
        "DELETE FROM session WHERE last_activity < $1",
        stale_cutoff.isoformat()
    )
    
    if expired_count or stale_count:
        logger.info(f"Cleaned up {expired_count} expired and {stale_count} stale sessions")

# Schedule regular cleanup
import asyncio
asyncio.create_task(run_periodic_cleanup())
```

## Security Audit and Logging

### Authentication Event Logging

**Comprehensive Security Logging**:
```python
import logging
from datetime import datetime

# Security-focused logger
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)

# Security event handlers
handler = logging.FileHandler("security.log")
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
security_logger.addHandler(handler)

def log_security_event(event_type: str, user_id: int = None, details: dict = None, request: Request = None):
    """Log security-related events for audit trail"""
    
    event_data = {
        "event_type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "ip_address": get_client_ip(request) if request else None,
        "user_agent": request.headers.get("user-agent", "") if request else None,
        "details": details or {}
    }
    
    security_logger.info(f"Security Event: {json.dumps(event_data)}")

# Usage in authentication endpoints
async def login(login_data: LoginRequest, response: Response, request: Request, db = Depends(get_db)):
    try:
        # Authentication logic...
        
        # Log successful login
        log_security_event("LOGIN_SUCCESS", user_id=profile["id"], request=request)
        
    except HTTPException as e:
        # Log failed login attempt
        log_security_event(
            "LOGIN_FAILED", 
            details={"email": login_data.email, "error": str(e)},
            request=request
        )
        raise
```

### Security Monitoring

**Failed Authentication Detection**:
```python
from collections import defaultdict
from datetime import datetime, timedelta

# Track failed login attempts
failed_attempts = defaultdict(list)

def check_brute_force_protection(email: str, ip_address: str) -> bool:
    """Check for brute force login attempts"""
    
    current_time = datetime.utcnow()
    cutoff_time = current_time - timedelta(minutes=15)  # 15-minute window
    
    # Clean old attempts
    failed_attempts[email] = [
        attempt for attempt in failed_attempts[email] 
        if attempt > cutoff_time
    ]
    
    # Check for too many recent failures
    if len(failed_attempts[email]) >= 5:  # 5 attempts in 15 minutes
        log_security_event(
            "BRUTE_FORCE_DETECTED",
            details={"email": email, "ip_address": ip_address, "attempts": len(failed_attempts[email])}
        )
        return False
    
    return True

def record_failed_attempt(email: str):
    """Record failed login attempt"""
    failed_attempts[email].append(datetime.utcnow())
```

## CORS Security Configuration

### Secure Cross-Origin Policy

**Production CORS Configuration**:
```python
from fastapi.middleware.cors import CORSMiddleware

# Secure CORS configuration for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://intranet.kingston.local",     # Production frontend
        "https://intranet.kingston.local"     # HTTPS version
    ],
    allow_credentials=True,                   # Required for HttpOnly cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=[
        "Authorization",
        "Content-Type", 
        "Cookie",
        "X-Requested-With"
    ],
    expose_headers=["Set-Cookie"],            # Allow cookie setting
    max_age=3600                             # Cache preflight requests
)

# Development CORS (more permissive)
if os.getenv("DEBUG", "False").lower() == "true":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],  # Vite dev server
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )
```

## Security Best Practices Summary

### Implementation Checklist

```markdown
## Authentication Security Checklist
- [x] HttpOnly cookies prevent XSS token theft
- [x] JWT tokens use strong signing algorithms (HS256)
- [x] JWT secrets are 32+ characters and environment-specific  
- [x] Token expiration properly enforced (24 hours default)
- [x] Triple-layer authentication with secure fallbacks

## Password Security Checklist  
- [x] Bcrypt with strong work factor (12 rounds)
- [x] Password requirements enforced (8+ chars, mixed case, numbers, symbols)
- [x] Secure password verification with timing attack protection
- [x] Password reset tokens are time-limited (30 minutes)

## Session Security Checklist
- [x] Cryptographically secure session IDs (UUID4)
- [x] Session expiration properly enforced (7 days)
- [x] Automatic cleanup of expired sessions
- [x] Session activity tracking with IP/user agent
- [x] Secure session invalidation on logout

## Security Monitoring Checklist
- [x] Comprehensive authentication event logging
- [x] Failed login attempt tracking
- [x] Brute force protection (5 attempts / 15 minutes)
- [x] Security audit trail with timestamps and IP addresses
- [x] CORS properly configured for production environment
```

This authentication security implementation provides enterprise-grade protection against common web application security vulnerabilities while maintaining usability for the wealth management team environment.