from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.product import Product, ProductCreate, ProductUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/available_products", response_model=List[Product])
async def get_products(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    status: Optional[str] = None,
    available_providers_id: Optional[int] = None,
    product_type: Optional[str] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of products with optional filtering.
    Why it's needed: Provides a way to view and filter all products in the system.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'available_products' table with optional filters
        3. Applies pagination parameters to limit result size
        4. Returns the data as a list of Product objects
    Expected output: A JSON array of product objects with all their details
    """
    try:
        query = db.table("available_products").select("*")
        
        if status is not None:
            query = query.eq("status", status)
            
        if available_providers_id is not None:
            query = query.eq("available_providers_id", available_providers_id)
            
        if product_type is not None:
            query = query.eq("product_type", product_type)
            
        # Extract values from Query objects
        skip_val = skip
        limit_val = limit
        if hasattr(skip, 'default'):
            skip_val = skip.default
        if hasattr(limit, 'default'):
            limit_val = limit.default
            
        result = query.range(skip_val, skip_val + limit_val - 1).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/available_products", response_model=Product)
async def create_product(product: ProductCreate, db = Depends(get_db)):
    """
    What it does: Creates a new product in the database.
    Why it's needed: Allows adding new financial products to the system.
    How it works:
        1. Validates the product data using the ProductCreate model
        2. Validates that referenced available_providers_id exists
        3. Inserts the validated data into the 'available_products' table
        4. Returns the newly created product with its generated ID
    Expected output: A JSON object containing the created product with all fields including ID and created_at timestamp
    """
    try:
        # Validate available_providers_id if provided
        if product.available_providers_id:
            provider_check = db.table("available_providers").select("id").eq("id", product.available_providers_id).execute()
            if not provider_check.data or len(provider_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Provider with ID {product.available_providers_id} not found")
        
        result = db.table("available_products").insert(product.model_dump()).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=400, detail="Failed to create product")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/available_products/{product_id}", response_model=Product)
async def get_product(product_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single product by ID.
    Why it's needed: Allows viewing detailed information about a specific product.
    How it works:
        1. Takes the product_id from the URL path
        2. Queries the 'available_products' table for a record with matching ID
        3. Returns the product data or raises a 404 error if not found
    Expected output: A JSON object containing the requested product's details
    """
    try:
        result = db.table("available_products").select("*").eq("id", product_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/available_products/{product_id}", response_model=Product)
async def update_product(product_id: int, product_update: ProductUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing product's information.
    Why it's needed: Allows modifying product details when they change.
    How it works:
        1. Validates the update data using the ProductUpdate model
        2. Removes any None values from the input (fields that aren't being updated)
        3. Verifies the product exists
        4. Validates that referenced available_providers_id exists
        5. Updates only the provided fields in the database
        6. Returns the updated product information
    Expected output: A JSON object containing the updated product's details
    """
    # Remove None values from the update data
    update_data = {k: v for k, v in product_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update data provided")
    
    try:
        # Check if product exists
        check_result = db.table("available_products").select("id").eq("id", product_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
        
        # Validate available_providers_id if provided
        if "available_providers_id" in update_data and update_data["available_providers_id"] is not None:
            provider_check = db.table("available_providers").select("id").eq("id", update_data["available_providers_id"]).execute()
            if not provider_check.data or len(provider_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Provider with ID {update_data['available_providers_id']} not found")
        
        # Update the product
        result = db.table("available_products").update(update_data).eq("id", product_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update product")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/available_products/{product_id}", response_model=dict)
async def delete_product(product_id: int, db = Depends(get_db)):
    """
    What it does: Deletes a product and all its associated records from the database.
    Why it's needed: Allows removing products that are no longer relevant to the business.
    How it works:
        1. Verifies the product exists
        2. Deletes all product_funds associated with this product
        3. Deletes all client_products associated with this product
        4. Finally deletes the product record
        5. Returns a success message
    Expected output: A JSON object with a success message confirmation
    """
    try:
        # Check if product exists
        check_result = db.table("available_products").select("id").eq("id", product_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
        
        # Delete all product_funds associated with this product
        db.table("product_funds").delete().eq("available_products_id", product_id).execute()
        
        # Delete all client_products associated with this product
        db.table("client_products").delete().eq("available_products_id", product_id).execute()
        
        # Finally, delete the product
        result = db.table("available_products").delete().eq("id", product_id).execute()
        
        return {"message": f"Product with ID {product_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting product and associated records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete product: {str(e)}")
