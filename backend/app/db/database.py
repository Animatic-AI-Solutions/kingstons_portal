import os
import sys
import logging
import asyncpg
from typing import Optional
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("database")

# Load environment variables if not already loaded
load_dotenv()
logger.info("Environment variables loaded")

# Get PostgreSQL connection details from environment variables
# Phase 2: Check for DATABASE_URL_PHASE2 first (takes priority for phase_2 branch)
# Do not fall back to DATABASE_URL if DATABASE_URL_PHASE2 is not set as we must preserve the data
# structure in the phase 1 database
DATABASE_URL = os.getenv("DATABASE_URL_PHASE2")

logger.info(f"Database URL present: {bool(DATABASE_URL)}")

if not DATABASE_URL:
    logger.error("DATABASE_URL_PHASE2 must be set in environment variables.")
    logger.error("Expected format: postgresql://username:password@host:port/database")
    logger.error(f"Available environment variables: {[key for key in os.environ.keys() if 'KEY' not in key.upper() and 'SECRET' not in key.upper() and 'PASSWORD' not in key.upper()]}")
    raise ValueError("DATABASE_URL_PHASE2 must be set in environment variables.")

# Global connection pool
_pool: Optional[asyncpg.Pool] = None

# Connection pool configuration
POOL_MIN_SIZE = 5
POOL_MAX_SIZE = 20
POOL_MAX_QUERIES = 50000
POOL_MAX_INACTIVE_CONNECTION_LIFETIME = 300.0

async def create_db_pool():
    """
    What it does: Creates and initializes the PostgreSQL connection pool.
    Why it's needed: Manages database connections efficiently, reusing connections instead of creating new ones for each request.
    How it works: 
        1. Creates an AsyncPG connection pool with configured parameters
        2. Tests the connection with a simple query
        3. Returns the pool for use by the application
    Expected output: An AsyncPG connection pool ready for database operations
    """
    global _pool
    
    if _pool is not None:
        logger.debug("Database pool already exists")
        return _pool
    
    try:
        logger.info("Creating PostgreSQL connection pool...")
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=POOL_MIN_SIZE,
            max_size=POOL_MAX_SIZE,
            max_queries=POOL_MAX_QUERIES,
            max_inactive_connection_lifetime=POOL_MAX_INACTIVE_CONNECTION_LIFETIME,
            server_settings={
                'jit': 'off'  # Disable JIT for better connection performance
            }
        )
        logger.info(f"PostgreSQL connection pool created successfully (min: {POOL_MIN_SIZE}, max: {POOL_MAX_SIZE})")
        
        # Test the connection
        async with _pool.acquire() as conn:
            test_result = await conn.fetchval("SELECT 1")
            logger.info(f"Database connection test successful: {test_result}")
            
            # Test basic table access
            client_count = await conn.fetchval("SELECT COUNT(*) FROM client_products")
            logger.info(f"Database verification: {client_count} client products found")
            
        return _pool
        
    except Exception as e:
        logger.error(f"Failed to create PostgreSQL connection pool: {str(e)}")
        logger.error(f"Connection string format: {DATABASE_URL.split('@')[0]}@[HIDDEN]")
        raise

async def close_db_pool():
    """
    What it does: Closes the PostgreSQL connection pool gracefully.
    Why it's needed: Properly cleans up database connections when the application shuts down.
    How it works: 
        1. Closes all connections in the pool
        2. Sets the global pool variable to None
    Expected output: Clean shutdown of database connections
    """
    global _pool
    
    if _pool is not None:
        logger.info("Closing PostgreSQL connection pool...")
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL connection pool closed successfully")

async def get_db():
    """
    What it does: Provides access to a PostgreSQL database connection for operations.
    Why it's needed: Creates a single point of access to the database connection, enabling dependency injection in FastAPI routes.
    How it works: 
        1. Ensures the connection pool is created
        2. Acquires a connection from the pool
        3. Yields the connection for use in route handlers
        4. Automatically returns the connection to the pool when done
    Expected output: An AsyncPG connection instance that can be used for database operations
    """
    global _pool
    
    if _pool is None:
        await create_db_pool()
    
    async with _pool.acquire() as connection:
        logger.debug("Database connection acquired from pool")
        try:
            yield connection
        finally:
            logger.debug("Database connection returned to pool")

def get_db_sync():
    """
    What it does: Provides synchronous access to the database pool for non-async contexts.
    Why it's needed: Some parts of the application may need to check database status without async/await.
    How it works: 
        1. Returns the current pool instance
        2. Used for health checks and status monitoring
    Expected output: The AsyncPG connection pool instance or None if not initialized
    """
    return _pool

# Health check function
async def check_database_health():
    """
    What it does: Performs a health check on the database connection.
    Why it's needed: Allows monitoring systems to verify database connectivity.
    How it works: 
        1. Attempts to acquire a connection from the pool
        2. Executes a simple query to verify functionality
        3. Returns health status information
    Expected output: Dictionary with database health information
    """
    try:
        if _pool is None:
            return {"status": "disconnected", "message": "Connection pool not initialized"}
        
        async with _pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
            pool_size = _pool.get_size()
            idle_size = _pool.get_idle_size()
            
            return {
                "status": "healthy",
                "pool_size": pool_size,
                "idle_connections": idle_size,
                "active_connections": pool_size - idle_size
            }
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return {"status": "unhealthy", "error": str(e)} 