import os
import sys
import logging

# Configure root logger
logging.basicConfig(
    level=logging.DEBUG if os.getenv("DEBUG", "False").lower() == "true" else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Reduce noise from external libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpcore.http2").setLevel(logging.WARNING)
logging.getLogger("hpack").setLevel(logging.WARNING)
logging.getLogger("hpack.hpack").setLevel(logging.WARNING)
logging.getLogger("hpack.table").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

logger = logging.getLogger("main")

logger.info("Application startup initiated")
logger.info(f"Python version: {sys.version}")
logger.info(f"Current working directory: {os.getcwd()}")

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
logger.info(f"Added to Python path: {os.path.dirname(os.path.abspath(__file__))}")

try:
    from app.api.routes import product_portfolio_assignments
    logger.info("Successfully imported product_portfolio_assignments")
except Exception as e:
    logger.error(f"Error importing product_portfolio_assignments: {str(e)}")
    raise

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.encoders import jsonable_encoder
from typing import Any
import json
from datetime import date, datetime
from dotenv import load_dotenv

logger.info("All modules imported successfully")

# Import all route modules for API endpoints
from app.api.routes import (
    client_groups, products, funds, portfolios, providers, 
    auth, profiles, product_funds,
    portfolio_funds, analytics,
    available_providers,
    available_portfolios, fund_valuations,
    client_products, holding_activity_logs, product_holdings,
    product_owners, client_group_product_owners,
    provider_switch_log, search, portfolio_valuations, portfolio_irr_values,
    historical_irr
)

# Load environment variables from .env file
load_dotenv()

# Custom JSON encoder class to handle date objects
class CustomJSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder to properly format date and datetime objects in API responses.
    Converts date/datetime objects to ISO format strings.
    """
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)

# Create FastAPI application instance with comprehensive metadata
app = FastAPI(
    title="Kingston's Portal - Wealth Management System API",
    description="""
    ## Kingston's Portal API

    A comprehensive wealth management system API that provides endpoints for managing:
    
    * **Authentication & Authorization** - JWT-based user authentication
    * **Client Management** - Client groups, individual clients, and relationships
    * **Product Management** - Investment products, portfolios, and fund management
    * **Provider Management** - Investment providers and switching capabilities
    * **Analytics & Reporting** - Performance metrics, IRR calculations, and reporting
    * **Holdings & Valuations** - Portfolio holdings, activities, and valuations
    
    ### Key Features
    
    - **RESTful API Design** with consistent endpoint patterns
    - **Comprehensive Data Models** using Pydantic for validation
    - **Real-time Analytics** with IRR calculations and performance metrics
    - **Secure Authentication** with JWT tokens and role-based access
    - **Bulk Operations** for efficient data management
    - **Advanced Search** across all entity types
    
    ### Getting Started
    
    1. **Authentication**: Use `/api/auth/login` to obtain an access token
    2. **Explore**: Browse the available endpoints using this interactive documentation
    3. **Test**: Use the "Try it out" feature to test endpoints directly
    
    ### Support
    
    For technical support or questions about the API, please refer to the project documentation.
    """,
    version="1.0.0",
    terms_of_service="https://example.com/terms/",
    contact={
        "name": "Kingston's Portal Support",
        "url": "https://example.com/contact/",
        "email": "support@kingstons-portal.com",
    },
    license_info={
        "name": "Proprietary",
        "url": "https://example.com/license/",
    },
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User authentication and authorization endpoints. Includes login, logout, password reset, and user registration.",
        },
        {
            "name": "Client Groups",
            "description": "Manage client groups and organizational structures. Client groups represent collections of related clients.",
        },
        {
            "name": "Products",
            "description": "Investment product management including creation, updates, and portfolio assignments.",
        },
        {
            "name": "Funds",
            "description": "Fund management endpoints for creating, updating, and tracking investment funds.",
        },
        {
            "name": "Portfolios",
            "description": "Portfolio management including templates, generations, and fund assignments.",
        },
        {
            "name": "Providers",
            "description": "Investment provider management including available providers and switching capabilities.",
        },
        {
            "name": "Analytics",
            "description": "Performance analytics, IRR calculations, and reporting endpoints.",
        },
        {
            "name": "Holdings",
            "description": "Portfolio holdings management including activities, valuations, and historical data.",
        },
        {
            "name": "Search",
            "description": "Global search capabilities across all entity types in the system.",
        },
    ],
)

# Override default JSONResponse to use custom encoder for proper date handling
app.json_encoder = CustomJSONEncoder

# Configure Cross-Origin Resource Sharing (CORS)
# This allows the frontend application running on different origins to access the API
app.add_middleware(
    CORSMiddleware,
    # List of allowed frontend origins that can access this API
    allow_origins=[
        "http://localhost",           # Local development
        "http://localhost:3000",      # React dev server
        "http://127.0.0.1",          # Local development alternate
        "http://127.0.0.1:3000",     # React dev server alternate
        "http://intranet.kingston.local",  # Production IIS server
    ],
    allow_credentials=True,
    # HTTP methods that are allowed for CORS requests
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    # HTTP headers that are allowed in CORS requests
    allow_headers=["*"],
    # Headers that browsers are allowed to access
    expose_headers=["*"],
    # How long browsers should cache CORS response (in seconds)
    max_age=3600,
)

# API URL Structure Standard
# All endpoints follow this pattern: /api/{resource}/{action}
# Where:
# - /api is the common prefix for all endpoints
# - /{resource} is the name of the resource (e.g., clients, auth, analytics)
# - /{action} is the specific operation (e.g., login, logout) or ID-based access
#
# Route handlers in each route file should include the resource name in their path
# Example: @router.get("/auth/login") in auth.py becomes /api/auth/login

# Include routers from all route modules
# Each router handles a specific resource type with its own set of endpoints
# The prefix "/api" is added to all routes, creating the /api/{resource} pattern
# Tags are used to group endpoints in the auto-generated Swagger documentation
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(client_groups.router, prefix="/api", tags=["Client Groups"])
app.include_router(products.router, prefix="/api", tags=["Products"])
app.include_router(funds.router, prefix="/api", tags=["Funds"])
app.include_router(portfolios.router, prefix="/api", tags=["Portfolios"])
app.include_router(available_providers.router, prefix="/api", tags=["Providers"])
app.include_router(providers.router, prefix="/api", tags=["Providers"])
app.include_router(available_portfolios.router, prefix="/api", tags=["Portfolios"])
app.include_router(product_funds.router, prefix="/api", tags=["Products"])
app.include_router(portfolio_funds.router, prefix="/api", tags=["Portfolios"])
app.include_router(client_products.router, prefix="/api", tags=["Products"])
app.include_router(product_holdings.router, prefix="/api", tags=["Holdings"])
app.include_router(holding_activity_logs.router, prefix="/api", tags=["Holdings"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(product_portfolio_assignments.router, prefix="/api", tags=["Portfolios"])
app.include_router(fund_valuations.router, prefix="/api", tags=["Holdings"])
app.include_router(product_owners.router, prefix="/api", tags=["Client Groups"])
app.include_router(client_group_product_owners.router, prefix="/api", tags=["Client Groups"])
app.include_router(provider_switch_log.router, prefix="/api", tags=["Providers"])
app.include_router(search.router, prefix="/api", tags=["Search"])
app.include_router(portfolio_valuations.router, prefix="/api", tags=["Holdings"])
app.include_router(portfolio_irr_values.router, prefix="/api", tags=["Analytics"])
app.include_router(historical_irr.router, prefix="/api/historical-irr", tags=["Analytics"])

@app.get("/api")
async def api_root():
    """
    Root endpoint for the API.
    
    What it does: Serves as the root endpoint for the API.
    Why it's needed: Provides a welcome message and documentation link for API users.
    How it works: 
        1. Returns a simple JSON object with a welcome message and link to docs
        2. Serves as a quick check to verify the API is running
    Expected output: A JSON object with welcome message and docs link
    """
    return {
        "message": "Welcome to Kingston's Portal - Wealth Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "status": "operational",
        "features": [
            "Authentication & Authorization",
            "Client Management",
            "Product Management", 
            "Provider Management",
            "Analytics & Reporting",
            "Holdings & Valuations"
        ]
    }

@app.get("/api/docs/export")
async def export_api_docs():
    """
    Export API documentation in JSON format.
    
    What it does: Provides the complete OpenAPI specification as downloadable JSON.
    Why it's needed: Allows developers to export API documentation for external tools.
    How it works:
        1. Returns the complete OpenAPI specification
        2. Includes all endpoints, models, and metadata
    Expected output: Complete OpenAPI 3.0 specification in JSON format
    """
    from fastapi.openapi.utils import get_openapi
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags
    )
    
    return openapi_schema

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    
    What it does: Provides system health status and basic metrics.
    Why it's needed: Essential for monitoring, alerting, and load balancer health checks.
    How it works:
        1. Checks API availability
        2. Returns basic system information
        3. Can be extended to check database connectivity
    Expected output: Health status and system information
    """
    import psutil
    import platform
    from datetime import datetime
    
    try:
        # Basic system information
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": app.version,
            "system": {
                "platform": platform.system(),
                "python_version": platform.python_version(),
                "cpu_count": psutil.cpu_count(),
                "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
                "memory_available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
                "memory_percent": psutil.virtual_memory().percent
            },
            "api": {
                "total_routes": len(app.routes),
                "docs_url": "/docs",
                "redoc_url": "/redoc"
            }
        }
        
        return health_data
        
    except Exception as e:
        return {
            "status": "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "version": app.version,
            "error": str(e)
        }

# Serve the static frontend assets - for Docker deployment
# Check if static_frontend directory exists before mounting
static_frontend_path = "static_frontend"
if os.path.exists(static_frontend_path) and os.path.isdir(static_frontend_path):
    # Mount the static files directory (static files will be served directly by FastAPI)
    app.mount("/assets", StaticFiles(directory=f"{static_frontend_path}/assets"), name="assets")
    
    # Root handler serves the index.html for all non-API paths to support client-side routing
    @app.get("/")
    async def serve_index():
        """Serve the frontend index.html file for the root path"""
        index_file = f"{static_frontend_path}/index.html"
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend not found"}
    
    # Catch-all route for client-side routing (SPA)
    @app.get("/{catch_all:path}")
    async def serve_spa(catch_all: str):
        """
        Serve the frontend SPA for any path not caught by other routes.
        This enables client-side routing to work properly.
        """
        # Skip if the path starts with /api or /docs
        if catch_all.startswith("api/") or catch_all == "docs" or catch_all.startswith("docs/") or catch_all.startswith("openapi.json"):
            # Let FastAPI handle the API and documentation routes
            return {"detail": "Not Found"}
        
        # For all other routes, return the index.html to enable client-side routing
        index_file = f"{static_frontend_path}/index.html"
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend not found"}

if __name__ == "__main__":
    """
    Main entry point for running the application directly.
    
    What it does: Runs the FastAPI application using Uvicorn server when the script is executed directly.
    Why it's needed: Provides a convenient way to start the API server.
    How it works:
        1. Configures Uvicorn with the FastAPI application
        2. Sets host, port, and reload settings from environment variables
        3. Starts the ASGI server
    Expected output: A running web server that serves the API
    """
    uvicorn.run(
        "main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8001)),
        reload=os.getenv("DEBUG", "False").lower() == "true"
    )
