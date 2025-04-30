import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables if not already loaded
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL and Key must be set in environment variables.")

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_db():
    """
    What it does: Provides access to the Supabase client for database operations.
    Why it's needed: Creates a single point of access to the database connection, enabling dependency injection in FastAPI routes.
    How it works: 
        1. Returns the already-initialized Supabase client
        2. Used with FastAPI's Depends to inject the database connection into route handlers
    Expected output: A Supabase client instance that can be used for database operations
    """
    return supabase 