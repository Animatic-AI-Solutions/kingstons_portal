---
title: "Running the Application"
tags: ["getting_started", "running", "server", "tests"]
related_docs:
  - "./01_setup_and_installation.md"
  - "../4_development_standards/03_testing_strategy.md"
  - "../6_advanced/03_deployment_process.md"
---
# Running the Application

This guide explains how to run the backend server and frontend development server for local development using two separate terminals. Before starting, ensure you have completed the [Setup and Installation](./01_setup_and_installation.md) guide.

## Development Approach

For development, we use a **two-terminal approach** where the backend and frontend run as separate processes:
- **Terminal 1:** FastAPI backend with hot-reloading on port 8001
- **Terminal 2:** Vite frontend development server with HMR on port 3000

This approach provides the best development experience with fast rebuilds and real-time updates, while maintaining consistency with the production environment.

## Environment-Based Configuration

The application automatically detects the environment and configures API endpoints accordingly:

**Development Environment:**
- Backend runs on `localhost:8001`
- Frontend uses Vite proxy (empty baseURL)
- API calls are proxied through Vite development server

**Production Environment:**
- Backend runs on `intranet.kingston.local:8001`
- Frontend served by IIS on port 80
- API calls go directly to `http://intranet.kingston.local:8001`

## 1. Running the Backend Server (Terminal 1)

The backend is a FastAPI application run with Uvicorn, which provides a high-performance ASGI server.

1.  **Open your first terminal** and navigate to the `backend` directory.
2.  **Activate the Python virtual environment** if it's not already active:
    ```powershell
    # For Windows PowerShell
    .\venv\Scripts\Activate.ps1
    
    # For Command Prompt
    .\venv\Scripts\activate.bat
    
    # For Git Bash/Linux/macOS
    source venv/bin/activate
    ```
3.  **Ensure environment variables are set** (Supabase credentials should be in your `.env` file)
4.  **Start the backend server:**
    ```bash
    uvicorn main:app --reload --host 127.0.0.1 --port 8001
    ```
    The server will start on `http://127.0.0.1:8001`. The `--reload` flag enables hot-reloading, so the server will automatically restart when you make changes to the Python code.

5.  **Verify the backend is running:**
    - API documentation: `http://localhost:8001/docs`
    - Health check: `http://localhost:8001/api/health`
    - API root: `http://localhost:8001/api`

**Important:** The backend runs on port 8001 to maintain consistency with the production environment. Port 8000 is no longer used.

## 2. Running the Frontend Server (Terminal 2)

The frontend is a React application powered by Vite, which provides a fast development server with Hot Module Replacement (HMR).

1.  **Open a second terminal** (separate from the backend terminal).
2.  **Navigate to the `frontend` directory:**
    ```bash
    cd frontend
    ```
3.  **Install dependencies** (first time only):
    ```bash
    npm install
    ```
4.  **Start the Vite development server:**
    ```bash
    npm start
    ```
    The Vite server will start and output the local URL where the application is being served, typically `http://localhost:3000`.

5.  **Open your web browser** and navigate to `http://localhost:3000` to view the application.

**Frontend Features:**
- **Hot Module Replacement (HMR):** Changes to React components are reflected instantly
- **API Proxy:** API calls to `/api/*` are automatically proxied to the backend on port 8001
- **Environment Detection:** Automatically uses correct API URLs for development/production
- **Fast Rebuilds:** Vite provides near-instantaneous rebuilds for development

## 3. API Configuration Details

The application uses automatic environment detection for API calls:

```javascript
// Environment detection function (implemented in services)
const getApiBaseUrl = () => {
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '3000';
  
  return isDevelopment ? '' : 'http://intranet.kingston.local:8001';
};
```

**Development API Calls:**
- Use empty baseURL (`''`) 
- Vite proxy handles routing to `localhost:8001`
- Examples: `/api/health`, `/api/auth/login`

**Production API Calls:**
- Use full URL (`http://intranet.kingston.local:8001`)
- Direct calls to FastAPI service
- Examples: `http://intranet.kingston.local:8001/api/health`

## 4. Running Tests

For more detailed information on our testing philosophy, see the [Testing Strategy](./../4_development_standards/03_testing_strategy.md) document.

### Backend Tests
The backend uses `pytest` for testing.
1.  In a terminal with the backend virtual environment activated, navigate to the `backend` directory.
2.  Run the tests:
    ```bash
    pytest
    ```

### Frontend Tests
The frontend uses `Jest` and `React Testing Library`.
1.  In a terminal, navigate to the `frontend` directory.
2.  Run the tests:
    ```bash
    npm test
    ```

## 5. Summary of Default Ports

- **Backend API Server:** `http://localhost:8001`
- **Frontend Dev Server:** `http://localhost:3000`
- **Database:** Supabase (cloud-hosted PostgreSQL)
- **Production Frontend:** `http://intranet.kingston.local` (port 80)
- **Production Backend:** `http://intranet.kingston.local:8001`

## 6. Troubleshooting

### Backend Issues
- **Environment Variables:** Ensure Supabase credentials are set in your `.env` file
- **Port Conflicts:** If port 8001 is in use, you may need to stop other services or change the port
- **Database Connection:** Check Supabase connectivity and credentials
- **CORS Errors:** Verify CORS middleware is properly configured for your development environment

### Frontend Issues
- **Port Conflicts:** Vite will automatically use the next available port if 3000 is occupied
- **API Connection:** Ensure the backend is running on port 8001 for API proxy to work
- **Environment Detection:** Check browser console for API base URL being used
- **Node Modules:** Try deleting `node_modules` and running `npm install` again if issues persist

### API Communication Issues
- **Network Errors:** Verify backend is running on correct port (8001)
- **Authentication Issues:** Check that auth tokens are being sent correctly
- **CORS Problems:** Ensure backend CORS configuration includes your development URL

### General Development Tips
- **Keep both terminals open** during development for the best experience
- **Use `--reload`** flag for the backend to see Python changes immediately
- **Check browser console** for frontend errors and network issues
- **Use API documentation** at `http://localhost:8001/docs` to test backend endpoints
- **Monitor Network tab** in browser dev tools to verify API calls are going to correct URLs

### Environment-Specific Debugging
```javascript
// Add to browser console to debug API base URL
console.log('API Base URL:', getApiBaseUrl());
console.log('Environment:', {
  hostname: window.location.hostname,
  port: window.location.port,
  isDevelopment: window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.port === '3000'
});
```

For more details on the production deployment process, see the [Deployment Process](./../6_advanced/03_deployment_process.md) document. 