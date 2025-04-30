# Contributing to the Wealth Management System

Thank you for your interest in contributing to our project. This document provides guidelines and standards to follow when contributing code.

## API URL Structure

All API endpoints should follow this consistent structure:

- Base path: `/api`
- Resource path: `/{resource}`
- Action path: `/{action}` or `/{id}` or `/{id}/{action}`

Examples:
- `/api/clients` - List all clients
- `/api/clients/123` - Get client with ID 123
- `/api/auth/login` - Login endpoint
- `/api/analytics/performance_data` - Get performance data analytics

### Route Definition Guidelines

1. In FastAPI router registration (main.py):
   - Always use `/api` as the prefix
   ```python
   app.include_router(resource.router, prefix="/api", tags=["Resource Name"])
   ```

2. In route handler files:
   - Include the resource name in the route path
   ```python
   @router.get("/resource/action")
   @router.get("/resource/{id}")
   ```

3. For nested resources:
   - Use consistent nesting patterns
   ```python
   @router.get("/parent/{parent_id}/child")
   @router.get("/parent/{parent_id}/child/{child_id}")
   ```

## Frontend API Access

When accessing API endpoints from the frontend:

1. Use the authenticated API instance which ensures proper URL formatting:
   ```typescript
   const api = createAuthenticatedApi();
   const response = await api.get('/resource/action');
   ```

2. For direct axios calls, include the full path:
   ```typescript
   await axios.post(`${API_URL}/api/resource/action`, data);
   ```

## Code Style Guidelines

1. Use clear, descriptive variable and function names
2. Add appropriate docstrings to all functions
3. Follow Python PEP 8 style guide for backend code
4. Follow TypeScript best practices for frontend code
5. Write tests for new functionality

## Pull Request Process

1. Create a feature branch from the development branch
2. Make your changes following the guidelines above
3. Write tests covering your changes
4. Create a pull request with a clear description of your changes
5. Wait for code review and address any feedback

Thank you for following these guidelines to maintain consistency across the project! 