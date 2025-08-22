---
title: "API Testing and Debugging"
tags: ["standards", "development", "testing", "debugging", "api", "powershell"]
related_docs:
  - "./03_testing_strategy.md"
  - "./01_coding_principles.md"
  - "../2_getting_started/02_running_the_application.md"
  - "../3_architecture/04_api_design.md"
---
# API Testing and Debugging

This document provides specific guidelines and working examples for testing and debugging the Kingston's Portal FastAPI backend during development. These approaches have been tested and verified to work consistently.

## 1. Core Requirements

### Always Use PowerShell
- **Never use Command Prompt (cmd)** for API testing or debugging
- **Always use PowerShell** for all terminal operations
- PowerShell provides better JSON handling and HTTP request capabilities

### Verified Working Examples
The examples in this document represent tested, working approaches. Always follow these patterns rather than alternative methods that may not work consistently with our specific setup.

## 2. Basic API Testing

### Simple GET Requests
For unauthenticated endpoints, use `curl.exe` with explicit executable reference:

```powershell
# Basic health check
curl.exe -X GET http://localhost:8001/api/health

# Test simple endpoints
curl.exe -X GET http://localhost:8001/api/test-simple

# Get available providers (if unauthenticated)
curl.exe -X GET http://localhost:8001/api/available_providers
```

**Important Notes:**
- Always use `curl.exe` (not `curl`) to ensure you're using the Windows curl executable
- Include `-X GET` explicitly for clarity
- Use `http://localhost:8001` (not `127.0.0.1` or other variants)

### API Documentation Access
Always verify the API is running by checking the interactive documentation:
```powershell
# Open API documentation in browser
Start-Process "http://localhost:8001/docs"
```

## 3. Authentication and Authorization

### Obtaining Authentication Token
For endpoints that require authentication, use this **verified working pattern**:

```powershell
# Get authentication token
$body = @{email="admin@admin.com"; password="adminadmin"} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:8001/api/auth/login" -Method POST -Body $body -ContentType "application/json"

# Store the token for reuse
$token = $response.access_token
Write-Host "Token obtained: $token"
```

**Why This Works:**
- Uses PowerShell's native `@{}` hashtable syntax
- `ConvertTo-Json` ensures proper JSON formatting
- `Invoke-RestMethod` handles HTTP requests better than curl for complex operations
- Proper `Content-Type` header specification

### Using Authentication Token
Once you have a token, use it in subsequent requests:

```powershell
# Create headers with authorization
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Make authenticated GET request
$clientGroups = Invoke-RestMethod -Uri "http://localhost:8001/api/client_groups" -Method GET -Headers $headers

# Make authenticated POST request
$newClientData = @{
    name = "Test Client"
    type = "Individual"
    status = "Active"
} | ConvertTo-Json

$newClient = Invoke-RestMethod -Uri "http://localhost:8001/api/client_groups" -Method POST -Body $newClientData -Headers $headers
```

## 4. Common API Testing Patterns

### Testing Client Groups
```powershell
# Get all client groups
$clients = Invoke-RestMethod -Uri "http://localhost:8001/api/client_groups" -Method GET -Headers $headers

# Get specific client group
$clientId = 1
$client = Invoke-RestMethod -Uri "http://localhost:8001/api/client_groups/$clientId" -Method GET -Headers $headers

# Display results nicely
$client | ConvertTo-Json -Depth 3
```

### Testing Bulk Data Endpoints
```powershell
# Test bulk client data (often used by dashboards)
$bulkData = Invoke-RestMethod -Uri "http://localhost:8001/api/client_groups/bulk_client_data" -Method GET -Headers $headers

# Count returned records
Write-Host "Returned $($bulkData.Count) client records"
```

### Testing Analytics Endpoints
```powershell
# Test client IRR calculation
$clientId = 1
$clientIRR = Invoke-RestMethod -Uri "http://localhost:8001/api/analytics/client/$clientId/irr" -Method GET -Headers $headers

# Test product IRR calculation
$productId = 1
$productIRR = Invoke-RestMethod -Uri "http://localhost:8001/api/analytics/product/$productId/irr" -Method GET -Headers $headers
```

## 5. Error Handling and Debugging

### Handling API Errors
```powershell
try {
    $result = Invoke-RestMethod -Uri "http://localhost:8001/api/client_groups/999" -Method GET -Headers $headers
} catch {
    Write-Host "Error occurred:"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
    Write-Host "Error Message: $($_.Exception.Message)"
    
    # For detailed error information
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
```

### Database Connection Testing
```powershell
# Test database connectivity through health endpoint
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8001/api/health" -Method GET
    Write-Host "API Health Status: $($health.status)"
    Write-Host "Database Connected: $($health.database_connected)"
} catch {
    Write-Host "Failed to connect to API: $($_.Exception.Message)"
}
```

## 6. Development Workflow Testing

### Complete Authentication Flow Test
```powershell
# Complete workflow test script
Write-Host "=== Kingston's Portal API Test ==="

# Step 1: Check API is running
try {
    $health = curl.exe -X GET http://localhost:8001/api/health | ConvertFrom-Json
    Write-Host "✓ API is running"
} catch {
    Write-Host "✗ API is not responding"
    exit 1
}

# Step 2: Authenticate
try {
    $body = @{email="admin@admin.com"; password="adminadmin"} | ConvertTo-Json
    $authResponse = Invoke-RestMethod -Uri "http://localhost:8001/api/auth/login" -Method POST -Body $body -ContentType "application/json"
    $token = $authResponse.access_token
    Write-Host "✓ Authentication successful"
} catch {
    Write-Host "✗ Authentication failed: $($_.Exception.Message)"
    exit 1
}

# Step 3: Test authenticated endpoint
try {
    $headers = @{"Authorization" = "Bearer $token"}
    $user = Invoke-RestMethod -Uri "http://localhost:8001/api/auth/me" -Method GET -Headers $headers
    Write-Host "✓ Authenticated as: $($user.email)"
} catch {
    Write-Host "✗ Authenticated request failed: $($_.Exception.Message)"
    exit 1
}

Write-Host "=== All tests passed ==="
```

## 7. Common Debugging Scenarios

### Token Expiration Testing
```powershell
# Test with expired or invalid token
$headers = @{
    "Authorization" = "Bearer invalid_token_here"
    "Content-Type" = "application/json"
}

try {
    $result = Invoke-RestMethod -Uri "http://localhost:8001/api/client_groups" -Method GET -Headers $headers
} catch {
    Write-Host "Expected 401 Unauthorized: $($_.Exception.Response.StatusCode)"
}
```

### CORS Testing
```powershell
# Test CORS preflight (OPTIONS request)
try {
    $corsResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/client_groups" -Method OPTIONS -Headers @{"Origin" = "http://localhost:3000"}
    Write-Host "CORS Headers:"
    $corsResponse.Headers | Format-Table
} catch {
    Write-Host "CORS test failed: $($_.Exception.Message)"
}
```

## 8. Best Practices

### Environment Variables Testing
```powershell
# Verify environment configuration
Write-Host "Backend Environment Check:"
Write-Host "API should be running on: http://localhost:8001"
Write-Host "Frontend dev server should be on: http://localhost:3000"

# Test environment detection endpoint if available
try {
    $envInfo = Invoke-RestMethod -Uri "http://localhost:8001/api/environment" -Method GET
    $envInfo | ConvertTo-Json
} catch {
    Write-Host "Environment endpoint not available"
}
```

### Performance Testing
```powershell
# Measure API response times
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$body = @{email="admin@admin.com"; password="adminadmin"} | ConvertTo-Json
$authResponse = Invoke-RestMethod -Uri "http://localhost:8001/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$stopwatch.Stop()
Write-Host "Authentication took: $($stopwatch.ElapsedMilliseconds)ms"
```

## 9. Troubleshooting

### Common Issues and Solutions

#### Issue: "Invoke-RestMethod: The remote server returned an error: (422) Unprocessable Entity"
**Solution:** Check your JSON body format and required fields
```powershell
# Correct format
$body = @{email="admin@admin.com"; password="adminadmin"} | ConvertTo-Json
# NOT: $body = "email=admin@admin.com&password=adminadmin"
```

#### Issue: "curl: command not found"
**Solution:** Use `curl.exe` explicitly
```powershell
# Correct
curl.exe -X GET http://localhost:8001/api/health
# NOT: curl -X GET http://localhost:8001/api/health
```

#### Issue: Token not working in subsequent requests
**Solution:** Ensure proper Bearer token format
```powershell
# Correct
$headers = @{"Authorization" = "Bearer $token"}
# NOT: $headers = @{"Authorization" = "$token"}
```

## 10. Integration with Development Workflow

### Pre-Commit API Testing
Include API tests in your development workflow:
```powershell
# Quick API health check before committing
.\test-api-health.ps1
if ($LASTEXITCODE -eq 0) {
    git commit -m "feat: your commit message"
} else {
    Write-Host "API tests failed - fix before committing"
}
```

This testing approach ensures consistent, reliable API interaction during development and debugging phases. Always refer back to these working examples when encountering issues with API communication. 