# Deployment Process

This document provides an overview of the process for building and deploying the Kingston's Portal application to a production environment.

## 1. Deployment Architecture

### Production Environment (Windows Server + IIS)

The production environment consists of three main components running on Windows Server:

1.  **Frontend (IIS):** Internet Information Services (IIS) serves the static, built assets of the React application.
2.  **Backend (FastAPI):** The FastAPI application running on an ASGI server like Uvicorn, typically as a Windows service.
3.  **Database (Supabase):** The PostgreSQL database hosted on Supabase (cloud-managed).
4.  **Reverse Proxy (IIS):** IIS configured with URL Rewrite and Application Request Routing (ARR) to proxy API requests to the FastAPI backend.

### Development Environment (Local Terminals)

For development, the application runs locally using two separate processes:

1.  **Frontend Development Server:** Vite development server running on port 3000
2.  **Backend Development Server:** FastAPI with Uvicorn running on port 8000
3.  **Database:** Supabase (cloud-managed) for consistency across environments

## 2. Building the Application for Production

### Step 1: Build the Frontend
The React/TypeScript frontend must be compiled into a set of static HTML, CSS, and JavaScript files for IIS deployment.

1.  Navigate to the `frontend/` directory.
2.  Run the build script:
    ```bash
    npm run build
    ```
3.  This command will create a `dist/` directory inside `frontend/` containing all the optimized static assets ready for IIS deployment.

### Step 2: Prepare the Backend for Windows Server
The backend needs to be prepared for deployment as a Windows service or console application.

1.  **Install Python Dependencies:**
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

2.  **Configure Environment Variables:**
    - Create a production `.env` file with Supabase credentials
    - Set up Windows environment variables or use a configuration management tool

3.  **Optional: Create Windows Service:**
    - Use tools like `python-windows-service` or `NSSM` (Non-Sucking Service Manager) to run FastAPI as a Windows service

## 3. IIS Configuration for Production

### Frontend Configuration (IIS Website)

1.  **Create IIS Website:**
    - Create a new website in IIS Manager
    - Point the physical path to the `frontend/dist/` directory
    - Configure appropriate bindings (HTTP/HTTPS)

2.  **Configure URL Rewrite for SPA:**
    Install URL Rewrite module and add the following rule to `web.config`:
    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <configuration>
        <system.webServer>
            <rewrite>
                <rules>
                    <rule name="React Router" stopProcessing="true">
                        <match url=".*" />
                        <conditions logicalGrouping="MatchAll">
                            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
                        </conditions>
                        <action type="Rewrite" url="/" />
                    </rule>
                </rules>
            </rewrite>
            <staticContent>
                <mimeMap fileExtension=".json" mimeType="application/json" />
            </staticContent>
        </system.webServer>
    </configuration>
    ```

### Backend Reverse Proxy Configuration (IIS ARR)

1.  **Install Application Request Routing (ARR):**
    - Download and install ARR module from Microsoft
    - Enable proxy functionality in ARR

2.  **Configure Reverse Proxy Rules:**
    Add the following to the main website's `web.config`:
    ```xml
    <rule name="API Reverse Proxy" stopProcessing="true">
        <match url="^api/(.*)" />
        <action type="Rewrite" url="http://localhost:8000/api/{R:1}" />
        <serverVariables>
            <set name="HTTP_X_FORWARDED_FOR" value="{REMOTE_ADDR}" />
            <set name="HTTP_X_FORWARDED_PROTO" value="https" />
        </serverVariables>
    </rule>
    ```

## 4. Deployment Workflows

### Production Deployment Workflow (Windows Server + IIS)

1.  **Build Frontend Assets:**
    ```bash
    cd frontend
    npm install
    npm run build
    ```

2.  **Deploy Frontend to IIS:**
    - Copy contents of `frontend/dist/` to IIS website directory
    - Ensure `web.config` is properly configured for SPA routing

3.  **Deploy Backend:**
    ```bash
    cd backend
    pip install -r requirements.txt
    # Copy backend files to production server
    # Configure environment variables
    ```

4.  **Start Backend Service:**
    ```bash
    # Option 1: Run as console application
    uvicorn main:app --host 127.0.0.1 --port 8000

    # Option 2: Run as Windows service (using NSSM)
    nssm install "Kingston Portal API" python
    nssm set "Kingston Portal API" AppParameters "path\to\backend\main.py"
    nssm start "Kingston Portal API"
    ```

5.  **Configure IIS Reverse Proxy:**
    - Install and configure ARR module
    - Add reverse proxy rules to `web.config`
    - Test API endpoints through IIS

### Development Workflow (Local Terminals)

1.  **Start Backend (Terminal 1):**
    ```bash
    cd backend
    # Ensure environment variables are set
    uvicorn main:app --host 127.0.0.1 --port 8000 --reload
    ```

2.  **Start Frontend (Terminal 2):**
    ```bash
    cd frontend
    npm install  # First time only
    npm start  # Starts Vite dev server on port 3000
    ```

3.  **Access Application:**
    - Frontend: `http://localhost:3000`
    - Backend API: `http://localhost:8000/api`
    - API Documentation: `http://localhost:8000/docs`

## 5. API Documentation & Monitoring

The deployed application includes comprehensive API documentation and monitoring capabilities:

### Interactive API Documentation
- **Swagger UI**: Available at `/docs` - Interactive API exploration and testing
- **ReDoc**: Available at `/redoc` - Clean, responsive API documentation
- **OpenAPI Export**: Available at `/api/docs/export` - Download complete API specification

### Health Monitoring
- **Health Check**: Available at `/api/health` - System status and resource monitoring
- **API Root**: Available at `/api` - Service overview and feature list

### Production Monitoring
- **IIS Logs**: Standard IIS request/response logging
- **Windows Event Logs**: Application and system event monitoring
- **Performance Counters**: Windows performance monitoring
- **Application Insights**: Optional Azure Application Insights integration

## 6. Environment Configuration

- The production environment must have a `.env` file for the backend with production-level secrets (e.g., a strong JWT secret, production database credentials).
- This file should be securely managed and provided to the backend container at runtime.

### Required Environment Variables
```bash
# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret

# Security Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours for production
```

## 7. Continuous Integration & Deployment (CI/CD)

For a mature production setup, a CI/CD pipeline (e.g., using GitHub Actions or Azure DevOps) should be implemented to automate the deployment process. A typical pipeline would:

### CI/CD Pipeline for Windows Server Deployment

1.  **Trigger:** On a push or merge to the `main` branch.
2.  **Test:** Run all backend and frontend tests.
3.  **Build:**
    - Run `npm run build` for the frontend.
    - Package backend application with dependencies.
4.  **Deploy:**
    - Copy frontend build artifacts to IIS website directory
    - Deploy backend to Windows Server
    - Restart backend service (if running as Windows service)
    - Update IIS configuration if needed

### Example GitHub Actions Workflow

```yaml
name: Deploy to Windows Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Build Frontend
      run: |
        cd frontend
        npm install
        npm run build
    
    - name: Deploy to Windows Server
      run: |
        # Copy files to production server
        # Restart services
        # Update IIS configuration
``` 