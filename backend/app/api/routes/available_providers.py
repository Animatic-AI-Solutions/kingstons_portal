from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.available_provider import AvailableProvider, AvailableProviderCreate, AvailableProviderUpdate, ColorOption, ProviderThemeColor, AvailableProviderWithProductCount
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Define a constant for all available colors at the top of the file after imports
DEFAULT_COLORS = [
    # Vibrant / Pure Colors
    {'name': 'Blue', 'value': '#2563EB'},         # Bright Blue
    {'name': 'Red', 'value': '#DC2626'},          # Pure Red
    {'name': 'Green', 'value': '#16A34A'},        # Bright Green
    {'name': 'Purple', 'value': '#8B5CF6'},       # Vibrant Purple
    {'name': 'Orange', 'value': '#F97316'},       # Bright Orange
    
    # Light / Soft Colors
    {'name': 'Sky Blue', 'value': '#38BDF8'},     # Light Blue
    {'name': 'Mint', 'value': '#4ADE80'},         # Light Green
    {'name': 'Lavender', 'value': '#C4B5FD'},     # Soft Purple
    {'name': 'Peach', 'value': '#FDBA74'},        # Soft Orange
    {'name': 'Rose', 'value': '#FDA4AF'},         # Soft Pink
    
    # Deep / Dark Colors
    {'name': 'Navy', 'value': '#1E40AF'},         # Deep Blue
    {'name': 'Forest', 'value': '#15803D'},       # Forest Green
    {'name': 'Maroon', 'value': '#9F1239'},       # Deep Red
    {'name': 'Indigo', 'value': '#4338CA'},       # Deep Purple
    {'name': 'Slate', 'value': '#334155'},        # Dark Slate
]

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
        2. Checks if the theme color is already in use by another provider
        3. Inserts the validated data into the 'available_providers' table
        4. Returns the newly created provider with its generated ID
    Expected output: A JSON object containing the created provider with all fields including ID and created_at timestamp
    """
    try:
        # Check if the color is already used by another provider
        if provider.theme_color:
            color_check = db.table("available_providers").select("id").eq("theme_color", provider.theme_color).execute()
            if color_check.data and len(color_check.data) > 0:
                raise HTTPException(status_code=400, detail=f"The selected color is already in use by another provider")
        
        result = db.table("available_providers").insert(provider.model_dump()).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=400, detail="Failed to create available provider")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating available provider: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create available provider: {str(e)}")

@router.get("/available_providers/theme-colors", response_model=List[ProviderThemeColor])
async def get_provider_theme_colors(db = Depends(get_db)):
    """
    What it does: Retrieves a simplified list of providers with their ID, name, and theme color.
    Why it's needed: Provides a lightweight endpoint to fetch just the provider colors for UI styling.
    How it works:
        1. Queries the 'available_providers' table for ID, name, and theme_color
        2. Returns a simplified list for frontend use
    Expected output: A JSON array of objects with id, name, and theme_color fields
    """
    try:
        logger.info("Fetching provider theme colors")
        query = db.table("available_providers").select("id,name,theme_color").execute()
        
        # Check if any providers have null theme colors and log a warning
        providers_without_colors = [p for p in query.data if p.get("theme_color") is None]
        if providers_without_colors:
            provider_names = [p.get("name", f"ID: {p.get('id')}") for p in providers_without_colors]
            logger.warning(f"Found {len(providers_without_colors)} providers without theme colors: {', '.join(provider_names)}")
            logger.info("Consider calling /available_providers/update-theme-colors to initialize missing colors")
        
        return query.data
    except Exception as e:
        logger.error(f"Error fetching provider theme colors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch provider theme colors: {str(e)}")

@router.get("/available_providers/available-colors", response_model=List[ColorOption])
async def get_available_colors(db = Depends(get_db)):
    """
    What it does: Retrieves a list of colors that are not currently used by any provider.
    Why it's needed: Allows frontend to show only available colors when creating/editing providers.
    How it works:
        1. Fetches all provider theme_colors currently in use
        2. Returns a list of available colors (those not currently in use)
    Expected output: A JSON array of color objects with name and value properties
    """
    try:
        # Get all providers that have a theme_color set
        result = db.table("available_providers").select("theme_color").not_.is_("theme_color", "null").execute()
        
        # Extract used colors
        used_colors = [provider.get("theme_color") for provider in result.data if provider.get("theme_color")]
        logger.info(f"Found {len(used_colors)} colors already in use: {used_colors}")
        
        # Filter out colors that are already in use
        available_colors = [color for color in DEFAULT_COLORS if color["value"] not in used_colors]
        
        # If all colors are used, return a "No colors available" message
        if not available_colors:
            logger.warning("All default colors are in use")
            # Return at least one color as fallback if all are used
            return [{'name': 'Default (All colors in use)', 'value': '#CCCCCC'}]
            
        return available_colors
    except Exception as e:
        logger.error(f"Error fetching available colors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch available colors: {str(e)}")

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
        4. If updating theme_color, checks that it's not already in use by another provider
        5. Updates only the provided fields in the database
        6. Returns the updated provider information
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
        
        # If updating theme_color, check if it's already in use by another provider
        if "theme_color" in update_data:
            color_check = db.table("available_providers").select("id").eq("theme_color", update_data["theme_color"]).execute()
            if color_check.data and len(color_check.data) > 0:
                # Check if it's the same provider (allow updating other fields without changing color)
                is_same_provider = any(p.get("id") == provider_id for p in color_check.data)
                if not is_same_provider:
                    raise HTTPException(status_code=400, detail=f"The selected color is already in use by another provider")
        
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

@router.post("/available_providers/update-theme-colors", response_model=dict)
async def update_provider_theme_colors(db = Depends(get_db)):
    """
    What it does: Updates theme colors for all providers that have null theme colors.
    Why it's needed: Utility endpoint to initialize theme colors for providers.
    How it works:
        1. Fetches all providers
        2. Assigns theme colors to those that have null theme colors
        3. Updates the database
    Expected output: A JSON object with a success message and the number of providers updated
    """
    try:
        # Predefined colors for common providers
        provider_colors = {
            "Gov": "#EA580C",      # Orange
            "AJBell": "#0369A1",   # Blue
            "HL": "#16A34A",       # Green
            "Fidelity": "#7C3AED", # Purple
            "Standard Life": "#DC2626", # Red
            "Quilter": "#B45309",  # Amber
            "Aviva": "#D97706",    # Yellow
            "Embark": "#BE185D",   # Pink
            # Add more providers and their colors as needed
        }
        
        # Default colors for providers not in the predefined list
        default_colors = [
            "#4F46E5", # Indigo
            "#16A34A", # Green
            "#EA580C", # Orange
            "#DC2626", # Red
            "#7C3AED", # Purple
            "#0369A1", # Blue
            "#B45309", # Amber
            "#0D9488", # Teal
            "#BE185D", # Pink
            "#475569"  # Slate
        ]
        
        # Fetch all providers
        result = db.table("available_providers").select("*").execute()
        providers = result.data
        
        if not providers:
            return {"message": "No providers found in the database", "updated": 0}
        
        # Track the number of updates
        updates_made = 0
        color_index = 0
        
        for provider in providers:
            # Skip providers that already have a theme color
            if provider.get("theme_color"):
                continue
                
            provider_id = provider["id"]
            provider_name = provider["name"]
            
            # Use predefined color if available, otherwise use one from default list
            if provider_name in provider_colors:
                theme_color = provider_colors[provider_name]
            else:
                theme_color = default_colors[color_index % len(default_colors)]
                color_index += 1
            
            # Update the provider's theme color
            update_result = db.table("available_providers").update({"theme_color": theme_color}).eq("id", provider_id).execute()
            
            if update_result.data and len(update_result.data) > 0:
                updates_made += 1
                logger.info(f"Updated theme color for provider {provider_name} (ID: {provider_id}) to {theme_color}")
        
        return {
            "message": f"Successfully updated theme colors for {updates_made} providers",
            "updated": updates_made
        }
    except Exception as e:
        logger.error(f"Error updating provider theme colors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update provider theme colors: {str(e)}")

@router.get("/available_providers_with_count", response_model=List[AvailableProviderWithProductCount])
async def get_available_providers_with_product_count(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of available providers with a count of associated products.
    Why it's needed: Provides information about how many products are linked to each provider.
    How it works:
        1. Connects to the Supabase database
        2. Queries the 'available_providers' table
        3. For each provider, counts the number of products in 'client_products' that reference it
        4. Returns the data as a list with provider details and product counts
    Expected output: A JSON array of provider objects with all their details plus product_count
    """
    try:
        logger.info(f"Fetching available providers with product counts")
        query = db.table("available_providers").select("*")
        
        # Apply filters if provided
        if status is not None:
            query = query.eq("status", status)
            
        # Apply pagination
        providers_result = query.execute()
        
        if not providers_result.data:
            logger.warning("No available providers found in the database")
            return []
            
        # Get all provider IDs
        provider_ids = [provider["id"] for provider in providers_result.data]
        
        # Get count of products for each provider
        product_counts = {}
        for provider_id in provider_ids:
            try:
                count_result = db.table("client_products").select("id").eq("provider_id", provider_id).execute()
                product_counts[provider_id] = len(count_result.data)
            except Exception as count_err:
                logger.error(f"Error counting products for provider {provider_id}: {str(count_err)}")
                product_counts[provider_id] = 0
            
        # Add product count to each provider
        providers_with_count = []
        for provider in providers_result.data:
            try:
                provider_with_count = dict(provider)
                provider_with_count["product_count"] = product_counts.get(provider["id"], 0)
                providers_with_count.append(provider_with_count)
            except Exception as format_err:
                logger.error(f"Error formatting provider {provider.get('id')}: {str(format_err)}")
                # Skip this provider if there's an error
            
        # Apply skip and limit after adding product counts
        start_idx = min(skip, len(providers_with_count))
        end_idx = min(start_idx + limit, len(providers_with_count))
        paginated_providers = providers_with_count[start_idx:end_idx]
        
        return paginated_providers
        
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(status_code=422, detail=f"Validation error: {str(ve)}")
    except Exception as e:
        logger.error(f"Error fetching available providers with product counts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch available providers with product counts: {str(e)}")

