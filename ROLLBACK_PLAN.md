# HttpOnly Cookie Authentication Rollback Plan

This document provides a step-by-step plan to rollback the httpOnly cookie authentication implementation and restore the previous localStorage-based token system if needed.

## When to Execute Rollback

Execute this rollback plan if:
- [ ] Authentication fails after deployment
- [ ] Critical frontend functionality is broken
- [ ] API compatibility issues arise
- [ ] Production testing reveals blocking issues

## Pre-Rollback Checklist

- [ ] Identify the specific issue(s) requiring rollback
- [ ] Document the problem for future troubleshooting
- [ ] Ensure you have access to the codebase
- [ ] Notify team members of the rollback

---

## Rollback Steps

### Step 1: Revert Backend Authentication Changes

#### 1.1 Restore Login Endpoint Response
**File:** `backend/app/api/routes/auth.py`

**Revert these changes:**
```python
# REMOVE this block (lines ~150-160):
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
```

**RESTORE to:**
```python
        # Return response with token and user info
        return LoginResponse(
            message="Login successful",
            access_token=access_token,
            token_type="bearer",
            user=profile
        )
```

#### 1.2 Restore Logout Endpoint
**File:** `backend/app/api/routes/auth.py`

**Remove this block:**
```python
        response.delete_cookie(
            key="access_token",
            httponly=True,
            secure=False,  # Set to False for local development
            samesite="lax"
        )
```

#### 1.3 Restore get_current_user Function
**File:** `backend/app/api/routes/auth.py`

**Revert function signature:**
```python
# CHANGE FROM:
async def get_current_user(
    request: Request,
    token: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None),
    session_id: Optional[str] = Cookie(None),
    db = Depends(get_db)
):

# BACK TO:
async def get_current_user(
    request: Request,
    token: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session_id: Optional[str] = Cookie(None),
    db = Depends(get_db)
):
```

**Revert authentication logic:**
```python
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
```

**Revert final error message:**
```python
    # If we get here, both authentication methods failed
    logger.warning("Authentication failed - both token and session invalid")
```

### Step 2: Remove New Backend Files

#### 2.1 Delete CSRF Module
```bash
rm backend/app/utils/csrf.py
```

#### 2.2 Remove Cookie Authentication Functions
**File:** `backend/app/utils/security.py`

**Remove these functions:**
- `decode_token_from_cookie()`
- `get_user_from_token_cookie()`

### Step 3: Revert Frontend Changes

#### 3.1 Restore Auth Service
**File:** `frontend/src/services/auth.ts`

**Revert login function:**
```javascript
  login: async (email: string, password: string) => {
    try {
      const response = await axios.post(
        `${getApiBaseUrl()}/api/auth/login`, 
        { email, password },
        { withCredentials: true } // Include this option to allow cookies to be set
      );
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
```

**Revert logout function:**
```javascript
  logout: async () => {
    try {
      // Get the current token
      const token = localStorage.getItem('token');
      
      // Configure request with credentials to include cookies
      const config = {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      };
      
      // Make the logout request - this will clear the session cookie on the server
      await axios.post(`${getApiBaseUrl()}/api/auth/logout`, {}, config);
      
      // Remove the token from localStorage
      localStorage.removeItem('token');
    } catch (error) {
      // Still remove the token even if the request fails
      localStorage.removeItem('token');
    }
  },
```

**Revert getProfile function:**
```javascript
  getProfile: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get(`${getApiBaseUrl()}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
```

**Revert utility functions:**
```javascript
  getToken: () => {
    return localStorage.getItem('token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
```

**Revert createAuthenticatedApi:**
```javascript
    // Add request interceptor for authentication and URL fixing
    api.interceptors.request.use(config => {
      // Add auth token
      const token = authService.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Fix URL paths for consistent /api prefix
      if (config.url) {
        // Always ensure URL starts with /api prefix (but no duplicates)
        if (!config.url.startsWith('/api/')) {
          config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
        }
      }
      
      return config;
    }, error => {
      return Promise.reject(error);
    });
```

**Revert response interceptor:**
```javascript
        // Only handle authentication errors specifically
        if (error.response?.status === 401) {
          console.warn('Authentication token may be expired or invalid');
          // Clear invalid token on actual authentication failures
          if (error.config?.url?.includes('/auth/') || 
              (error.response?.data?.detail && 
               error.response.data.detail.toLowerCase().includes('authentication'))) {
            localStorage.removeItem('token');
            // Only redirect to login for actual authentication errors
            window.location.href = '/login';
          }
        }
```

#### 3.2 Restore Auth Context
**File:** `frontend/src/context/AuthContext.tsx`

**Revert useEffect:**
```javascript
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Check if token exists in local storage
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          return;
        }
        
        // Validate token by requesting user profile
        const userResponse = await axios.get(`${getApiBaseUrl()}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        
        setIsAuthenticated(true);
        setUser(userResponse.data);
      } catch (error) {
        // Clear invalid token
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);
```

### Step 4: Remove Testing Files

```bash
rm test_httponly_auth.ps1
rm BROWSER_TESTING_CHECKLIST.md
rm ROLLBACK_PLAN.md  # This file
```

### Step 5: Restart Services

```bash
# Restart backend
cd backend
python main.py

# Restart frontend
cd frontend
npm start
```

### Step 6: Verify Rollback

1. [ ] Login works with localStorage tokens
2. [ ] API requests include Authorization headers
3. [ ] Logout clears localStorage
4. [ ] Authentication state persists across browser refreshes
5. [ ] All existing functionality works as before

---

## Post-Rollback Actions

### Immediate
- [ ] Test all authentication flows
- [ ] Verify no breaking changes
- [ ] Update team on rollback completion
- [ ] Document the specific issue that caused rollback

### Follow-up
- [ ] Analyze the root cause of the issues
- [ ] Plan fixes for identified problems
- [ ] Consider gradual re-implementation with fixes
- [ ] Update testing procedures to catch similar issues

---

## Emergency Rollback Commands

If you need to quickly rollback without following the detailed steps:

```bash
# Quick rollback using git (if changes were committed)
git revert <commit-hash-of-httponly-changes>

# Or reset to previous working state
git reset --hard <commit-hash-before-httponly>

# Restart services
cd backend && python main.py &
cd frontend && npm start
```

---

## Lessons Learned Template

After executing a rollback, document:

1. **What went wrong:**
   - Specific error messages
   - Which functionality was affected
   - User impact

2. **Root cause:**
   - Technical cause of the issue
   - Configuration problems
   - Missing requirements

3. **Prevention:**
   - What testing could have caught this
   - Additional validation needed
   - Better deployment procedures

4. **Next steps:**
   - Fixes to implement
   - Additional testing required
   - Timeline for re-implementation 