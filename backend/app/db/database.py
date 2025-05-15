import os
import sys
import logging
from supabase import create_client
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

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

logger.info(f"Supabase URL present: {bool(SUPABASE_URL)}")
logger.info(f"Supabase KEY present: {bool(SUPABASE_KEY)}")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Supabase URL and Key must be set in environment variables.")
    logger.error(f"Available environment variables: {[key for key in os.environ.keys() if 'KEY' not in key.upper() and 'SECRET' not in key.upper() and 'PASSWORD' not in key.upper()]}")
    raise ValueError("Supabase URL and Key must be set in environment variables.")

try:
    # Create Supabase client
    logger.info("Attempting to create Supabase client...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Supabase client created successfully")
    
    # Test the connection if possible
    try:
        logger.info("Testing Supabase connection...")
        # You can add a simple query here to test the connection
        # For example, if you have a "profiles" table:
        # result = supabase.table("profiles").select("*").limit(1).execute()
        # logger.info(f"Connection test successful: retrieved {len(result.data)} records")
        logger.info("Note: Connection test not implemented, but client created")
    except Exception as e:
        logger.warning(f"Connection test failed: {str(e)}")
except Exception as e:
    logger.error(f"Failed to create Supabase client: {str(e)}")
    raise

def get_db():
    """
    What it does: Provides access to the Supabase client for database operations.
    Why it's needed: Creates a single point of access to the database connection, enabling dependency injection in FastAPI routes.
    How it works: 
        1. Returns the already-initialized Supabase client
        2. Used with FastAPI's Depends to inject the database connection into route handlers
    Expected output: A Supabase client instance that can be used for database operations
    """
    logger.debug("Database connection requested")
    return supabase 