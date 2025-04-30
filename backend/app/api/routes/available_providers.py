from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.available_provider import AvailableProvider, AvailableProviderCreate, AvailableProviderUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/available_providers", response_model=List[AvailableProvider])
async def get_available_providers(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of available providers from the database.
    Why it's needed: Provides a way to view all available providers in the system with optional filtering.
    How it works:
        1. Connects to the Supabase database
        2. Queries the 'available_providers' table with pagination and optional filters
        3. Returns the data as a list of AvailableProvider objects
    Expected output: A JSON array of provider objects with all their details
    """
    try:
        logger.info(f"Fetching available providers with skip={skip}, limit={limit}")
        query = db.table("available_providers").select("*")
        
        # Apply filters if provided
        if status is not None:
            query = query.eq("status", status)
            
        # Extract actual values from Query objects
        skip_val = skip
        limit_val = limit
        if hasattr(skip, 'default'):
            skip_val = skip.default
        if hasattr(limit, 'default'):
            limit_val = limit.default
            
        # Apply pagination
        result = query.range(skip_val, skip_val + limit_val - 1).execute()
        logger.info(f"Query result: {result}")
        
        if not result.data:
            logger.warning("No available providers found in the database")
        return result.data
    except Exception as e:
        logger.error(f"Error fetching available providers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch available providers: {str(e)}")

@router.post("/available_providers", response_model=AvailableProvider)
async def create_available_provider(provider: AvailableProviderCreate, db = Depends(get_db)):
    """
    What it does: Creates a new available provider in the database.
    Why it's needed: Allows adding new available providers to the system.
    How it works:
        1. Validates the provider data using the AvailableProviderCreate model
        2. Inserts the validated data into the 'available_providers' table
        3. Returns the newly created provider with its generated ID
    Expected output: A JSON object containing the created provider with all fields including ID and created_at timestamp
    """
    try:
        result = db.table("available_providers").insert(provider.model_dump()).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=400, detail="Failed to create available provider")
    except Exception as e:
        logger.error(f"Error creating available provider: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create available provider: {str(e)}")

@router.get("/available_providers/{provider_id}", response_model=AvailableProvider)
async def get_available_provider(provider_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single available provider by ID.
    Why it's needed: Allows viewing detailed information about a specific available provider.
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
        raise HTTPException(status_code=404, detail=f"Available provider with ID {provider_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching available provider: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch available provider: {str(e)}")

@router.patch("/available_providers/{provider_id}", response_model=AvailableProvider)
async def update_available_provider(provider_id: int, provider_update: AvailableProviderUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing available provider's information.
    Why it's needed: Allows modifying available provider details when they change.
    How it works:
        1. Validates the update data using the AvailableProviderUpdate model
        2. Removes any None values from the input (fields that aren't being updated)
        3. Verifies the provider exists
        4. Updates only the provided fields in the database
        5. Returns the updated provider information
    Expected output: A JSON object containing the updated provider's details
    """
    # Remove None values from the update data
    update_data = {k: v for k, v in provider_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update data provided")
    
    try:
        # Check if provider exists
        check_result = db.table("available_providers").select("id").eq("id", provider_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Available provider with ID {provider_id} not found")
        
        # Update the provider
        result = db.table("available_providers").update(update_data).eq("id", provider_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update available provider")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating available provider: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update available provider: {str(e)}")

@router.delete("/available_providers/{provider_id}", response_model=dict)
async def delete_available_provider(provider_id: int, db = Depends(get_db)):
    """
    What it does: Deletes an available provider from the database.
    Why it's needed: Allows removing available providers who are no longer relevant to the business.
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
            raise HTTPException(status_code=404, detail=f"Available provider with ID {provider_id} not found")
        
        # Delete the provider
        result = db.table("available_providers").delete().eq("id", provider_id).execute()
        
        return {"message": f"Available provider with ID {provider_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting available provider: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete available provider: {str(e)}")

