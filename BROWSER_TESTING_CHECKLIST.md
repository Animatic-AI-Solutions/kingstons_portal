# Browser Testing Checklist for HttpOnly Cookie Authentication

This checklist helps verify that the httpOnly cookie authentication implementation works correctly in the browser.

## Prerequisites

- [ ] Backend server running on `http://localhost:8001`
- [ ] Frontend development server running on `http://localhost:3000`
- [ ] Browser developer tools available (F12)
- [ ] Test credentials available (`admin@admin.com` / `adminadmin`)

---

## Test 1: Login Process Verification

### Steps:
1. [ ] Open browser and navigate to `http://localhost:3000`
2. [ ] Open Developer Tools (F12) → Application tab → Cookies
3. [ ] Clear all cookies for localhost
4. [ ] Navigate to login page
5. [ ] Open Network tab in Developer Tools
6. [ ] Login with test credentials

### Expected Results:
- [ ] Login request succeeds (200 status)
- [ ] Response body contains user data but NO `access_token` field (or empty string)
- [ ] Two cookies are set in Application tab:
  - [ ] `access_token` (HttpOnly ✓, Secure for production, SameSite: Lax)
  - [ ] `session_id` (HttpOnly ✓, Secure for production, SameSite: Lax)
- [ ] User is redirected to dashboard/home page
- [ ] No tokens visible in localStorage (Application → Local Storage should be empty)

### Verification Commands (Browser Console):
```javascript
// These should all return null/undefined (tokens not accessible to JavaScript)
console.log("localStorage token:", localStorage.getItem('token'));
console.log("All localStorage:", {...localStorage});
console.log("Can access cookies:", document.cookie.includes('access_token'));
```

---

## Test 2: Authenticated API Requests

### Steps:
1. [ ] While logged in, navigate to any page that makes API calls (e.g., Clients page)
2. [ ] Open Network tab in Developer Tools
3. [ ] Refresh the page or trigger an API call
4. [ ] Check the API request headers

### Expected Results:
- [ ] API requests succeed (200 status)
- [ ] Request headers include cookies automatically
- [ ] NO `Authorization: Bearer` headers in requests
- [ ] Cookies are sent with each request to the API
- [ ] Data loads correctly in the UI

---

## Test 3: Cross-Tab Authentication State

### Steps:
1. [ ] With user logged in, open a new tab
2. [ ] Navigate to `http://localhost:3000`
3. [ ] Check if user remains authenticated

### Expected Results:
- [ ] User is automatically authenticated in new tab
- [ ] No re-login required
- [ ] User data displays correctly

---

## Test 4: Logout Process

### Steps:
1. [ ] While logged in, open Developer Tools → Application → Cookies
2. [ ] Note the existing cookies
3. [ ] Click logout button
4. [ ] Check Network tab for logout request
5. [ ] Check cookies in Application tab

### Expected Results:
- [ ] Logout request succeeds (200 status)
- [ ] Both `access_token` and `session_id` cookies are removed
- [ ] User is redirected to login page
- [ ] Subsequent API requests fail with 401 status

---

## Test 5: Session Persistence Across Browser Restart

### Steps:
1. [ ] Login successfully
2. [ ] Close the browser completely
3. [ ] Reopen browser and navigate to `http://localhost:3000`

### Expected Results:
- [ ] User remains logged in (if within token expiration time)
- [ ] OR user is prompted to login again (if tokens expired)
- [ ] No JavaScript errors in console

---

## Test 6: Security Verification

### Steps:
1. [ ] Login successfully
2. [ ] Open browser console
3. [ ] Try to access authentication data via JavaScript

### Test Commands:
```javascript
// All of these should return null, undefined, or empty
console.log("localStorage token:", localStorage.getItem('token'));
console.log("sessionStorage token:", sessionStorage.getItem('token'));
console.log("document.cookie includes access_token:", document.cookie.includes('access_token'));

// This should show that cookies exist but are not accessible
console.log("document.cookie:", document.cookie);
```

### Expected Results:
- [ ] No authentication tokens accessible via JavaScript
- [ ] `access_token` cookie not visible in `document.cookie`
- [ ] No sensitive data in localStorage or sessionStorage
- [ ] HttpOnly flag prevents JavaScript access to auth cookies

---

## Test 7: API Direct Access Test

### Steps:
1. [ ] While logged in, copy a direct API URL (e.g., `http://localhost:8001/api/auth/me`)
2. [ ] Open new browser tab
3. [ ] Paste the API URL and navigate to it

### Expected Results:
- [ ] API responds with user data (JSON format)
- [ ] Cookies are automatically sent with the request
- [ ] No authentication errors

---

## Test 8: Invalid Cookie Handling

### Steps:
1. [ ] Login successfully
2. [ ] Open Developer Tools → Application → Cookies
3. [ ] Manually edit the `access_token` cookie value to something invalid
4. [ ] Refresh the page or make an API call

### Expected Results:
- [ ] Invalid token is rejected by server
- [ ] User is redirected to login page
- [ ] Appropriate error handling (no JavaScript errors)

---

## Test 9: Network Security Verification

### Steps:
1. [ ] Login successfully
2. [ ] Open Network tab in Developer Tools
3. [ ] Look at the login response headers

### Expected Results:
- [ ] `Set-Cookie` headers present for both `access_token` and `session_id`
- [ ] Cookies have `HttpOnly` attribute
- [ ] Cookies have `SameSite=Lax` attribute
- [ ] For production: Cookies should have `Secure` attribute

---

## Test 10: Browser Storage Inspection

### Steps:
1. [ ] Login successfully
2. [ ] Open Developer Tools → Application tab
3. [ ] Check all storage areas

### Expected Results:
- [ ] **Local Storage**: No authentication tokens
- [ ] **Session Storage**: No authentication tokens  
- [ ] **IndexedDB**: No authentication tokens
- [ ] **Cookies**: Only `access_token` and `session_id` with HttpOnly flag

---

## Troubleshooting Common Issues

### Issue: Cookies not being set
**Check:**
- [ ] `withCredentials: true` in frontend requests
- [ ] CORS configuration allows credentials
- [ ] Backend sets cookies correctly in login endpoint

### Issue: Authentication fails after login
**Check:**
- [ ] API requests include `withCredentials: true`
- [ ] Backend reads cookies correctly in `get_current_user`
- [ ] Cookie domain and path settings

### Issue: User not redirected after login
**Check:**
- [ ] Frontend auth context updates correctly
- [ ] Login response handling in frontend
- [ ] React Router configuration

---

## Security Checklist Summary

✅ **Security Improvements Achieved:**
- [ ] JWT tokens no longer in localStorage (XSS protection)
- [ ] HttpOnly cookies prevent JavaScript access
- [ ] Automatic cookie transmission
- [ ] Server-side cookie clearing on logout
- [ ] No manual token handling required
- [ ] Reduced attack surface for token theft

✅ **Additional Security Measures to Consider:**
- [ ] Implement CSRF protection
- [ ] Add HTTPS in production
- [ ] Consider token rotation
- [ ] Implement rate limiting
- [ ] Add security headers

---

## Test Results

**Date:** ___________  
**Tester:** ___________  
**Browser:** ___________  
**Version:** ___________  

**Overall Result:** ⬜ PASS ⬜ FAIL  

**Notes:**
```
[Add any observations or issues encountered]
``` 