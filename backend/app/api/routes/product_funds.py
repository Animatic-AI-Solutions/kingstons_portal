from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.product_fund import ProductFund, ProductFundCreate, ProductFundUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/product_funds", response_model=List[ProductFund])
async def get_product_funds(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    available_products_id: Optional[int] = None,
    available_funds_id: Optional[int] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of product funds with optional filtering.
    Why it's needed: Provides a way to view product-fund associations in the system.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'product_funds' table with optional filters
        3. Applies pagination parameters to limit result size
        4. Returns the data as a list of ProductFund objects
    Expected output: A JSON array of product fund objects with all their details
    """
    try:
        query = db.table("product_funds").select("*")
        
        if available_products_id is not None:
            query = query.eq("available_products_id", available_products_id)
            
        if available_funds_id is not None:
            query = query.eq("available_funds_id", available_funds_id)
            
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

@router.post("/product_funds", response_model=ProductFund)
async def create_product_fund(product_fund: ProductFundCreate, db = Depends(get_db)):
    """
    What it does: Creates a new product fund association in the database.
    Why it's needed: Allows associating funds with products.
    How it works:
        1. Validates the product fund data using the ProductFundCreate model
        2. Validates that referenced available_products_id and available_funds_id exist
        3. Checks if the association already exists to prevent duplicates
        4. Inserts the validated data into the 'product_funds' table
        5. Returns the newly created association with its generated ID
    Expected output: A JSON object containing the created product fund with all fields including ID and created_at timestamp
    """
    try:
        # Validate available_products_id
        product_check = db.table("available_products").select("id").eq("id", product_fund.available_products_id).execute()
        if not product_check.data or len(product_check.data) == 0:
            raise HTTPException(status_code=404, detail=f"Product with ID {product_fund.available_products_id} not found")
        
        # Validate available_funds_id
        fund_check = db.table("available_funds").select("id").eq("id", product_fund.available_funds_id).execute()
        if not fund_check.data or len(fund_check.data) == 0:
            raise HTTPException(status_code=404, detail=f"Fund with ID {product_fund.available_funds_id} not found")
        
        # Check if this association already exists
        existing_check = db.table("product_funds").select("id").eq("available_products_id", product_fund.available_products_id).eq("available_funds_id", product_fund.available_funds_id).execute()
        if existing_check.data and len(existing_check.data) > 0:
            raise HTTPException(status_code=400, detail=f"Product ID {product_fund.available_products_id} is already associated with Fund ID {product_fund.available_funds_id}")
        
        result = db.table("product_funds").insert(product_fund.model_dump()).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=400, detail="Failed to create product fund association")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/product_funds/{product_fund_id}", response_model=ProductFund)
async def get_product_fund(product_fund_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single product fund association by ID.
    Why it's needed: Allows viewing detailed information about a specific product-fund association.
    How it works:
        1. Takes the product_fund_id from the URL path
        2. Queries the 'product_funds' table for a record with matching ID
        3. Returns the association data or raises a 404 error if not found
    Expected output: A JSON object containing the requested product fund's details
    """
    try:
        result = db.table("product_funds").select("*").eq("id", product_fund_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=404, detail=f"Product fund with ID {product_fund_id} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/product_funds/{product_fund_id}", response_model=ProductFund)
async def update_product_fund(product_fund_id: int, product_fund_update: ProductFundUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing product fund association's information.
    Why it's needed: Allows modifying product-fund association details, such as target weighting.
    How it works:
        1. Validates the update data using the ProductFundUpdate model
        2. Verifies the association exists
        3. Updates the specified fields in the database
        4. Returns the updated association information
    Expected output: A JSON object containing the updated product fund's details
    """
    try:
        # Check if product fund exists
        check_result = db.table("product_funds").select("id").eq("id", product_fund_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Product fund with ID {product_fund_id} not found")
        
        # Update the product fund
        update_data = product_fund_update.model_dump(exclude_unset=True)
        result = db.table("product_funds").update(update_data).eq("id", product_fund_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update product fund")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product fund: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/product_funds/{product_fund_id}", response_model=dict)
async def delete_product_fund(product_fund_id: int, db = Depends(get_db)):
    """
    What it does: Deletes a product fund association from the database.
    Why it's needed: Allows removing product-fund associations that are no longer needed.
    How it works:
        1. Verifies the association exists
        2. Deletes the association record
        3. Returns a success message
    Expected output: A JSON object with a success message confirmation
    """
    try:
        # Check if product fund exists
        check_result = db.table("product_funds").select("id").eq("id", product_fund_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Product fund with ID {product_fund_id} not found")
        
        # Delete the product fund
        result = db.table("product_funds").delete().eq("id", product_fund_id).execute()
        
        return {"message": f"Product fund with ID {product_fund_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
