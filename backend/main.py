import os
import sys
import logging

# Configure root logger
logging.basicConfig(
    level=logging.DEBUG if os.getenv("DEBUG", "False").lower() == "true" else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
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
    provider_switch_log, search, portfolio_valuations, portfolio_irr_values
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

# Create FastAPI application instance with metadata
app = FastAPI(
    title="Wealth Management System API",
    description="API for the Wealth Management System",
    version="0.1.0"
)

# Override default JSONResponse to use custom encoder for proper date handling
app.json_encoder = CustomJSONEncoder

# Configure Cross-Origin Resource Sharing (CORS)
# This allows the frontend application running on different origins to access the API
app.add_middleware(
    CORSMiddleware,
    # List of allowed frontend origins that can access this API
    allow_origins=["*"],
    allow_credentials=True,
    # HTTP methods that are allowed for CORS requests
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    # HTTP headers that are allowed in CORS requests
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials",
        "Access-Control-Allow-Methods",
        "Access-Control-Allow-Headers",
        "Access-Control-Expose-Headers"
    ],
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
app.include_router(available_providers.router, prefix="/api", tags=["Available Providers"])
app.include_router(providers.router, prefix="/api", tags=["Providers"])
app.include_router(available_portfolios.router, prefix="/api", tags=["Available Portfolios"])
app.include_router(product_funds.router, prefix="/api", tags=["Product Funds"])
app.include_router(portfolio_funds.router, prefix="/api", tags=["Portfolio Funds"])
app.include_router(client_products.router, prefix="/api", tags=["Client products"])
app.include_router(product_holdings.router, prefix="/api", tags=["product Holdings"])
app.include_router(holding_activity_logs.router, prefix="/api", tags=["Holding Activity Logs"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(product_portfolio_assignments.router, prefix="/api", tags=["Portfolio Assignments"])
app.include_router(fund_valuations.router, prefix="/api", tags=["Fund Valuations"])
app.include_router(product_owners.router, prefix="/api", tags=["Product Owners"])
app.include_router(client_group_product_owners.router, prefix="/api", tags=["Client Group Product Owners"])
app.include_router(provider_switch_log.router, prefix="/api", tags=["Provider Switch Log"])
app.include_router(search.router, prefix="/api", tags=["Search"])
app.include_router(portfolio_valuations.router, prefix="/api", tags=["Portfolio Valuations"])
app.include_router(portfolio_irr_values.router, prefix="/api", tags=["Portfolio IRR Values"])

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
        "message": "Welcome to the Wealth Management System API",
        "docs": "/docs"
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
        port=int(os.getenv("API_PORT", 8000)),
        reload=os.getenv("DEBUG", "False").lower() == "true"
    )
