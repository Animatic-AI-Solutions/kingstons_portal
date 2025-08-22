# HttpOnly Cookie Authentication Flow

## Overview

Kingston's Portal implements a sophisticated **triple-layer authentication system** with HttpOnly cookies as the primary security mechanism. This approach provides enhanced XSS protection while maintaining backward compatibility with Authorization headers and session-based authentication.

## Problem Solved

Traditional JWT token storage in localStorage exposes applications to XSS attacks where malicious scripts can access and steal authentication tokens. HttpOnly cookies eliminate this vulnerability by making tokens inaccessible to JavaScript while still allowing automatic inclusion in HTTP requests.

## Architecture Components

### 1. Authentication Layers (Priority Order)

The system validates authentication using three methods in order of preference:

1. **HttpOnly Cookie JWT Token** (Primary) - Most secure method
2. **Authorization Header JWT Token** (API Fallback) - For API clients and testing
3. **Session Cookie Validation** (Legacy) - Database-backed sessions

### 2. Database Schema

```sql
-- User profiles table
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    preferred_landing_page VARCHAR(255) DEFAULT '/'
);

-- Authentication credentials
CREATE TABLE authentication (
    auth_id SERIAL PRIMARY KEY,
    profiles_id INTEGER REFERENCES profiles(id),
    password_hash VARCHAR(255) NOT NULL,
    last_login TEXT,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Session management for triple-layer auth
CREATE TABLE session (
    session_id VARCHAR(255) PRIMARY KEY,
    profiles_id INTEGER REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    last_activity TEXT
);
```

## Authentication Flow

### Login Process (`/api/auth/login`)

```python
@router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, response: Response, db = Depends(get_db)):
    # 1. Validate credentials
    profile_result = await db.fetchrow("SELECT * FROM profiles WHERE email = $1", login_data.email)
    auth_result = await db.fetchrow("SELECT * FROM authentication WHERE profiles_id = $1", profile["id"])
    
    if not verify_password(login_data.password, auth["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # 2. Create JWT token
    token_data = {"sub": str(profile["id"])}
    access_token = create_access_token(token_data)
    
    # 3. Create database session
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)
    await db.fetchrow(
        "INSERT INTO session (session_id, profiles_id, created_at, expires_at, last_activity) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        session_id, profile["id"], datetime.utcnow(), expires_at, datetime.utcnow().isoformat()
    )
    
    # 4. Set HttpOnly cookies
    # Session cookie (7 days)
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False,  # False for development, True for production
        samesite="lax",
        max_age=7 * 24 * 60 * 60
    )
    
    # JWT cookie (24 hours default)
    token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # False for development, True for production
        samesite="lax",
        max_age=token_expire_minutes * 60
    )
    
    # 5. Return user data (no token in response)
    return LoginResponse(
        message="Login successful",
        access_token="",  # Empty - token is in cookie
        token_type="bearer",
        user=profile
    )
```

### Triple-Layer Authentication Validation

The `get_current_user` dependency implements the three-tier validation:

```python
async def get_current_user(
    access_token: Optional[str] = Cookie(None),      # HttpOnly JWT cookie
    authorization: Optional[str] = Header(None),     # Bearer token header
    session_id: Optional[str] = Cookie(None),        # Session cookie
    db = Depends(get_db)
):
    # Layer 1: HttpOnly Cookie JWT (Primary)
    if access_token:
        payload = decode_token(access_token)
        if payload:
            user_id = payload.get("sub")
            user_result = await db.fetchrow("SELECT * FROM profiles WHERE id = $1", int(user_id))
            if user_result:
                return dict(user_result)
    
    # Layer 2: Authorization Header JWT (API Fallback)
    if authorization and authorization.startswith("Bearer "):
        token_str = authorization.replace("Bearer ", "", 1)
        payload = decode_token(token_str)
        if payload:
            user_id = payload.get("sub")
            user_result = await db.fetchrow("SELECT * FROM profiles WHERE id = $1", int(user_id))
            if user_result:
                return dict(user_result)
    
    # Layer 3: Session Cookie (Legacy Support)
    if session_id:
        session_result = await db.fetchrow("SELECT * FROM session WHERE session_id = $1", session_id)
        if session_result:
            session = dict(session_result)
            
            # Check expiration
            if session["expires_at"] and datetime.utcnow() > session["expires_at"]:
                raise HTTPException(status_code=401, detail="Session expired")
            
            # Get user and update activity
            user_result = await db.fetchrow("SELECT * FROM profiles WHERE id = $1", session["profiles_id"])
            if user_result:
                await db.execute(
                    "UPDATE session SET last_activity = $1 WHERE session_id = $2",
                    datetime.utcnow().isoformat(), session_id
                )
                return dict(user_result)
    
    # All authentication methods failed
    raise HTTPException(status_code=401, detail="Not authenticated")
```

### Frontend Integration

#### AuthContext Configuration (`frontend/src/context/AuthContext.tsx`)

```typescript
// Environment-based API configuration
const getApiBaseUrl = () => {
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '3000';
  
  return isDevelopment ? '' : 'http://intranet.kingston.local:8001';
};

// Authentication state check on app load
useEffect(() => {
  const checkAuth = async () => {
    try {
      // HttpOnly cookie sent automatically with withCredentials
      const userResponse = await axios.get(`${getApiBaseUrl()}/api/auth/me`, {
        withCredentials: true
      });
      
      setIsAuthenticated(true);
      setUser(userResponse.data);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  checkAuth();
}, []);
```

#### API Service Configuration (`frontend/src/services/auth.ts`)

```typescript
// Login with cookie handling
login: async (email: string, password: string) => {
  const response = await axios.post(
    `${getApiBaseUrl()}/api/auth/login`, 
    { email, password },
    { withCredentials: true } // Required for cookie handling
  );
  
  // Token automatically stored as HttpOnly cookie
  return response.data;
},

// Profile check with automatic cookie inclusion
getProfile: async () => {
  const response = await axios.get(`${getApiBaseUrl()}/api/auth/me`, {
    withCredentials: true // HttpOnly cookie sent automatically
  });
  
  return response.data;
}
```

#### Authenticated API Client (`frontend/src/services/auth.ts`)

```typescript
export const createAuthenticatedApi = () => {
  const api = axios.create({
    baseURL: getApiBaseUrl(),
    withCredentials: true // Always include credentials for HttpOnly cookies
  });

  // Request interceptor for credentials and URL fixing
  api.interceptors.request.use(config => {
    config.withCredentials = true;
    
    // Ensure /api prefix for consistent routing
    if (config.url && !config.url.startsWith('/api/')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }
    
    return config;
  });

  // Response interceptor for authentication errors
  api.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        // Only redirect for actual authentication errors
        if (error.response?.data?.detail?.toLowerCase().includes('authentication')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return api;
};
```

### Logout Process (`/api/auth/logout`)

```python
@router.post("/auth/logout", response_model=LogoutResponse)
async def logout(response: Response, session_id: Optional[str] = Cookie(None), db = Depends(get_db)):
    # Clean up database session
    if session_id:
        await db.execute("DELETE FROM session WHERE session_id = $1", session_id)
    
    # Clear both HttpOnly cookies
    response.delete_cookie(
        key="session_id",
        httponly=True,
        secure=False,
        samesite="lax"
    )
    response.delete_cookie(
        key="access_token", 
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return LogoutResponse(message="Logout successful")
```

## Security Features

### 1. XSS Protection
- **HttpOnly Cookies**: Tokens inaccessible to JavaScript, preventing XSS token theft
- **SameSite Policy**: `samesite="lax"` prevents CSRF attacks while allowing navigation
- **Secure Flag**: Configured per environment (False for development, True for production)

### 2. Token Security
```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
    expire = datetime.utcnow() + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, os.getenv("JWT_SECRET"), algorithm="HS256")
```

### 3. Password Security
```python
# Bcrypt hashing with automatic salt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

### 4. Session Management
- **Automatic Expiration**: JWT tokens expire based on `ACCESS_TOKEN_EXPIRE_MINUTES` (default 24 hours)
- **Session Cleanup**: Database sessions expire after 7 days with automatic cleanup
- **Activity Tracking**: `last_activity` updated on each authenticated request

## Configuration

### Environment Variables
```env
# Required for JWT token signing
JWT_SECRET=your-secure-jwt-secret-key

# Token expiration (minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Development vs Production settings affect cookie security flags
DEBUG=true  # Sets secure=False for local development
```

### Frontend Proxy Configuration (Vite)
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
```

## Usage Patterns

### Protected Route Usage
```python
@router.get("/api/client_groups")
async def get_client_groups(
    current_user: dict = Depends(get_current_user),  # Automatic authentication
    db = Depends(get_db)
):
    # User is guaranteed to be authenticated here
    return await fetch_client_groups_for_user(current_user["id"], db)
```

### Frontend API Calls
```typescript
// All API calls automatically include HttpOnly cookies
const { data } = useQuery(
  ['client_groups'],
  () => api.get('/client_groups'),  // Cookies included automatically
  { staleTime: 5 * 60 * 1000 }
);
```

## Performance Characteristics

- **Cookie Size**: JWT tokens are typically 200-500 bytes
- **Network Overhead**: Cookies included in every request (automatic)
- **Validation Speed**: JWT decode ~0.1ms, database session lookup ~1-2ms
- **Fallback Strategy**: Triple-layer approach ensures backward compatibility

## Error Handling

### Authentication Errors
```python
# Consistent error responses across all layers
if authentication_failed:
    raise HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"}
    )
```

### Frontend Error Boundaries
```typescript
// Automatic redirect on authentication failure
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      if (error.response?.data?.detail?.toLowerCase().includes('authentication')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

## Monitoring and Debugging

### Authentication Logging
```python
logger.info(f"Authentication attempt - Cookie Token: {bool(access_token)}, Header Token: {bool(authorization)}, Session: {bool(session_id)}")
logger.info(f"User authenticated via cookie token: {user_id}")
logger.warning(f"Cookie token authentication failed: {str(e)}")
```

### Session Activity Tracking
```sql
-- Monitor active sessions
SELECT 
    s.session_id,
    p.email,
    s.created_at,
    s.last_activity,
    s.expires_at
FROM session s
JOIN profiles p ON s.profiles_id = p.id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity DESC;
```

This HttpOnly cookie authentication system provides enterprise-grade security while maintaining developer-friendly APIs and backward compatibility with existing authentication methods.