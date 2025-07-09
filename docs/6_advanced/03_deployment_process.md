# Deployment Process

This document provides a comprehensive overview of the Kingston's Portal deployment architecture and processes for both development and production environments.

## 1. Production Architecture Overview

### Kingston03 Server Environment

**Server Details:**
- **Machine Name:** Kingston03 (Virtual Machine)
- **IP Address:** 192.168.0.223
- **Operating System:** Windows Server
- **Primary Roles:** Internal DNS Server, Web Server (IIS), Application Server (FastAPI)

**DNS Configuration:**
- **DNS Server:** 192.168.0.223 (self-hosted)
- **Domain:** intranet.kingston.local → 192.168.0.223
- **Client Configuration:** All network clients use 192.168.0.223 as primary DNS

### Production Components

#### 1. Frontend (React Static Files via IIS)
- **Web Server:** Internet Information Services (IIS) 10.0
- **Physical Path:** `C:\inetpub\wwwroot\OfficeIntranet`
- **IIS Site Bindings:**
  - Type: `http`
  - IP Address: `*` (All Unassigned)
  - Port: `80`
  - Host Name: `intranet.kingston.local`
- **Default Document:** `index.html`

#### 2. Backend (FastAPI Direct Service)
- **Application:** Python FastAPI application
- **Deployment Method:** Windows Service (via NSSM)
- **Listening Address:** `0.0.0.0:8001`
- **Service Configuration:**
  - Environment Variables: `API_HOST=0.0.0.0`, `API_PORT=8001`
  - Windows Firewall: Inbound TCP rule for port 8001
- **Database:** PostgreSQL (Supabase cloud-hosted)

#### 3. Client-Side API Communication
- **Architecture:** Direct API calls to FastAPI (bypasses IIS proxy)
- **Environment Detection:** Automatic development/production URL selection
- **Production URL:** `http://intranet.kingston.local:8001/api/`
- **Development URL:** Vite proxy to `localhost:8001`

## 2. Environment-Based Configuration

### Development Environment
```javascript
// Automatic environment detection
const getApiBaseUrl = () => {
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '3000';
  
  return isDevelopment ? '' : 'http://intranet.kingston.local:8001';
};
```

**Development Setup:**
- **Frontend:** Vite dev server on port 3000
- **Backend:** FastAPI on port 8001
- **API Calls:** Proxied through Vite (empty baseURL)
- **Database:** Supabase (shared with production)

### Production Environment
- **Frontend:** IIS static files on port 80
- **Backend:** FastAPI Windows service on port 8001
- **API Calls:** Direct to `http://intranet.kingston.local:8001`
- **Database:** Supabase (cloud-managed PostgreSQL)

## 3. Building for Production

### Step 1: Build Frontend Assets
```bash
cd frontend
npm install
npm run build
```

**Build Configuration (vite.config.js):**
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined, // Prevents React initialization issues
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: {
        safari10: true,
      },
    },
  }
});
```

### Step 2: Deploy Frontend to IIS
1. **Copy Built Assets:**
   ```bash
   # Copy contents of frontend/dist/ to C:\inetpub\wwwroot\OfficeIntranet
   ```

2. **Configure IIS URL Rewrite (web.config):**
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
       <system.webServer>
           <rewrite>
               <rules>
                   <rule name="React_SPA_Fallback" stopProcessing="true">
                       <match url=".*" />
                       <conditions logicalGrouping="MatchAll">
                           <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                           <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                       </conditions>
                       <action type="Rewrite" url="/index.html" />
                   </rule>
               </rules>
           </rewrite>
           <staticContent>
               <mimeMap fileExtension=".json" mimeType="application/json" />
           </staticContent>
           <defaultDocument>
               <files>
                   <add value="index.html" />
               </files>
           </defaultDocument>
       </system.webServer>
   </configuration>
   ```

### Step 3: Deploy Backend as Windows Service
1. **Install Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure NSSM Service:**
   ```bash
   # Install NSSM service
   nssm install "Kingston Portal API" python
   nssm set "Kingston Portal API" AppDirectory "C:\path\to\backend"
   nssm set "Kingston Portal API" AppParameters "main.py"
   nssm set "Kingston Portal API" AppEnvironmentExtra "API_HOST=0.0.0.0" "API_PORT=8001"
   nssm start "Kingston Portal API"
   ```

3. **Configure Windows Firewall:**
   ```powershell
   # Allow inbound connections on port 8001
   New-NetFirewallRule -DisplayName "Kingston Portal API" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow
   ```

## 4. CORS Configuration

**Backend Configuration (main.py):**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://intranet.kingston.local",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)
```

**Key CORS Requirements:**
- **allow_origins:** Explicit list (no wildcards with credentials)
- **allow_credentials:** `True` for authentication headers
- **allow_headers:** `["*"]` (simplified, no response headers)

## 5. Key Architectural Benefits

### 1. **Simplified Routing**
- No Application Request Routing (ARR) complications
- Direct API calls eliminate proxy issues
- Clear separation of concerns

### 2. **Performance Optimization**
- IIS optimized for static file serving
- FastAPI handles API requests directly
- Reduced latency from eliminated proxy layer

### 3. **Environment Consistency**
- Automatic environment detection
- Consistent API base URL handling
- Seamless development-to-production workflow

### 4. **Security & Reliability**
- Explicit CORS configuration
- Windows Firewall protection
- Service-based backend deployment

## 6. Monitoring & Verification

### Production Health Checks
- **Frontend:** `http://intranet.kingston.local/` (React app)
- **Backend API:** `http://intranet.kingston.local:8001/api/health`
- **API Documentation:** `http://intranet.kingston.local:8001/docs`

### Development Verification
- **Frontend:** `http://localhost:3000` (Vite dev server)
- **Backend API:** `http://localhost:8001/api/health`
- **API Documentation:** `http://localhost:8001/docs`

### Service Monitoring
```powershell
# Check Windows service status
Get-Service -Name "Kingston Portal API"

# Check port binding
netstat -an | findstr :8001

# Check firewall rules
Get-NetFirewallRule -DisplayName "Kingston Portal API"
```

## 7. Environment Variables

### Production Environment (.env)
```bash
# Database Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_production_jwt_secret

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8001

# Security Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours for production
```

### Development Environment (.env)
```bash
# Database Configuration (shared with production)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_development_jwt_secret

# Server Configuration
API_HOST=127.0.0.1
API_PORT=8001

# Security Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=60  # 1 hour for development
```

## 8. Troubleshooting

### Common Issues

#### Frontend Issues
- **React Router not working:** Verify IIS URL rewrite rules are properly configured
- **Static files not loading:** Check IIS MIME type configuration
- **API calls failing:** Verify environment detection logic

#### Backend Issues
- **Service won't start:** Check NSSM configuration and Python path
- **Port conflicts:** Verify no other services are using port 8001
- **CORS errors:** Check allow_origins configuration matches frontend URL

#### Network Issues
- **DNS resolution:** Verify intranet.kingston.local resolves to 192.168.0.223
- **Firewall blocking:** Check Windows Firewall rules for port 8001
- **Service connectivity:** Test direct API calls to verify FastAPI is running

This deployment architecture provides a robust, scalable solution that leverages IIS for efficient static file serving while maintaining direct API communication for optimal performance. 