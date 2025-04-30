from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.provider import Provider, ProviderCreate, ProviderUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/available_providers", response_model=List[Provider])
async def get_providers(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of providers from the database.
    Why it's needed: Provides a way to view all providers in the system with optional filtering.
    How it works:
        1. Connects to the Supabase database
        2. Queries the 'available_providers' table with pagination and optional filters
        3. Returns the data as a list of Provider objects
    Expected output: A JSON array of provider objects with all their details
    """
    try:
        logger.info(f"Fetching providers with skip={skip}, limit={limit}")
        query = db.table("available_providers").select("*")
        
        # Apply filters if provided
        if status is not None:
            query = query.eq("status", status)
            
        # Extract actual values from Query objects
        skip_val = skip.default if hasattr(skip, 'default') else skip
        limit_val = limit.default if hasattr(limit, 'default') else limit
            
        # Apply pagination
        result = query.range(skip_val, skip_val + limit_val - 1).execute()
        logger.info(f"Query result: {result}")
        
        if not result.data:
            logger.warning("No providers found in the database")
        return result.data
    except Exception as e:
        logger.error(f"Error fetching providers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch providers: {str(e)}")

@router.post("/available_providers", response_model=Provider)
async def create_provider(provider: ProviderCreate, db = Depends(get_db)):
    """
    What it does: Creates a new provider in the database.
    Why it's needed: Allows adding new providers to the system.
    How it works:
        1. Validates the provider data using the ProviderCreate model
        2. Inserts the validated data into the 'available_providers' table
        3. Returns the newly created provider with its generated ID
    Expected output: A JSON object containing the created provider with all fields including ID and created_at timestamp
    """
    try:
        result = db.table("available_providers").insert(provider.model_dump()).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=400, detail="Failed to create provider")
    except Exception as e:
        logger.error(f"Error creating provider: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create provider: {str(e)}")

@router.get("/available_providers/{provider_id}", response_model=Provider)
async def get_provider(provider_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single provider by ID.
    Why it's needed: Allows viewing detailed information about a specific provider.
    How it works:
        1. Takes the provider_id from the URL path
        2. Queries the 'available_providers' table for a record with matching ID
        3. Returns the provider data or raises a 404 error if not found
    Expected output: A JSON object containing the requested provider's details
    """
    try:
        result = db.table("available_providers").select("*").eq("id", provider_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=404, detail=f"Provider with ID {provider_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching provider: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch provider: {str(e)}")

@router.patch("/available_providers/{provider_id}", response_model=Provider)
async def update_provider(provider_id: int, provider_update: ProviderUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing provider's information.
    Why it's needed: Allows modifying provider details when they change.
    How it works:
        1. Takes the provider_id from the URL path and update data from request body
        2. Verifies the provider exists
        3. Updates the provider record with the new data
        4. Returns the updated provider information
    Expected output: A JSON object containing the updated provider's details
    """
    try:
        # Check if provider exists
        check_result = db.table("available_providers").select("id").eq("id", provider_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Provider with ID {provider_id} not found")
        
        # Update the provider
        result = db.table("available_providers").update(provider_update.model_dump(exclude_unset=True)).eq("id", provider_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update provider")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating provider: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update provider: {str(e)}")

@router.delete("/available_providers/{provider_id}", response_model=dict)
async def delete_provider(provider_id: int, db = Depends(get_db)):
    """
    What it does: Deletes a provider from the database.
    Why it's needed: Allows removing providers who are no longer relevant to the business.
    How it works:
        1. Verifies the provider exists
        2. Deletes the provider record from the 'available_providers' table
        3. Returns a success message
    Expected output: A JSON object with a success message confirmation
    """
    try:
        # Check if provider exists
        check_result = db.table("available_providers").select("id").eq("id", provider_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Provider with ID {provider_id} not found")
        
        # Delete the provider
        result = db.table("available_providers").delete().eq("id", provider_id).execute()
        
        return {"message": f"Provider with ID {provider_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting provider: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete provider: {str(e)}")
