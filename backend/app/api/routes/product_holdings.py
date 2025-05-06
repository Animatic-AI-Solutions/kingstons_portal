from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.product_holding import ProductHolding, ProductHoldingCreate, ProductHoldingUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/product_holdings", response_model=List[ProductHolding])
async def get_product_holdings(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    client_product_id: Optional[int] = None,
    portfolio_id: Optional[int] = None,
    status: Optional[str] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of product holdings with optional filtering.
    Why it's needed: Provides a way to view product holdings in the system.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'product_holdings' table with optional filters
        3. Applies pagination parameters to limit result size
        4. Returns the data as a list of ProductHolding objects
    Expected output: A JSON array of product holding objects with all their details
    """
    try:
        query = db.table("product_holdings").select("*")
        
        if client_product_id is not None:
            query = query.eq("client_product_id", client_product_id)
            
        if portfolio_id is not None:
            query = query.eq("portfolio_id", portfolio_id)
            
        if status is not None:
            query = query.eq("status", status)
            
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

@router.post("/product_holdings", response_model=ProductHolding)
async def create_product_holding(product_holding: ProductHoldingCreate, db = Depends(get_db)):
    """
    What it does: Creates a new product holding in the database.
    Why it's needed: Allows adding new product holdings to the system.
    How it works:
        1. Validates the product holding data using the ProductHoldingCreate model
        2. Validates that referenced client_product_id and portfolio_id exist
        3. Inserts the validated data into the 'product_holdings' table
        4. Returns the newly created product holding with its generated ID
    Expected output: A JSON object containing the created product holding with all fields including ID and created_at timestamp
    """
    try:
        # Validate client_product_id
        client_product_check = db.table("client_products").select("id").eq("id", product_holding.client_product_id).execute()
        if not client_product_check.data or len(client_product_check.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client product with ID {product_holding.client_product_id} not found")
        
        # Validate portfolio_id if provided
        if product_holding.portfolio_id:
            portfolio_check = db.table("portfolios").select("id").eq("id", product_holding.portfolio_id).execute()
            if not portfolio_check.data or len(portfolio_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Portfolio with ID {product_holding.portfolio_id} not found")
        
        # Explicitly handle date serialization
        data_dict = product_holding.model_dump()
        
        # Convert date objects to ISO format strings
        if 'start_date' in data_dict and data_dict['start_date'] is not None:
            data_dict['start_date'] = data_dict['start_date'].isoformat()
        
        if 'end_date' in data_dict and data_dict['end_date'] is not None:
            data_dict['end_date'] = data_dict['end_date'].isoformat()
        
        result = db.table("product_holdings").insert(data_dict).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=400, detail="Failed to create product holding")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating product holding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/product_holdings/{product_holding_id}", response_model=ProductHolding)
async def get_product_holding(product_holding_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single product holding by ID.
    Why it's needed: Allows viewing detailed information about a specific product holding.
    How it works:
        1. Takes the product_holding_id from the URL path
        2. Queries the 'product_holdings' table for a record with matching ID
        3. Returns the product holding data or raises a 404 error if not found
    Expected output: A JSON object containing the requested product holding's details
    """
    try:
        result = db.table("product_holdings").select("*").eq("id", product_holding_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=404, detail=f"product holding with ID {product_holding_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/product_holdings/{product_holding_id}", response_model=ProductHolding)
async def update_product_holding(product_holding_id: int, product_holding_update: ProductHoldingUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing product holding's information.
    Why it's needed: Allows modifying product holding details when they change.
    How it works:
        1. Validates the update data using the ProductHoldingUpdate model
        2. Removes any None values from the input (fields that aren't being updated)
        3. Verifies the product holding exists
        4. Validates that referenced client_product_id, fund_id and portfolio_id exist if provided
        5. Updates only the provided fields in the database
        6. Returns the updated product holding information
    Expected output: A JSON object containing the updated product holding's details
    """
    # Remove None values from the update data
    update_data = {k: v for k, v in product_holding_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update data provided")
    
    try:
        # Check if product holding exists
        check_result = db.table("product_holdings").select("id").eq("id", product_holding_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"product holding with ID {product_holding_id} not found")
        
        # Validate client_product_id if provided
        if "client_product_id" in update_data and update_data["client_product_id"] is not None:
            client_product_check = db.table("client_products").select("id").eq("id", update_data["client_product_id"]).execute()
            if not client_product_check.data or len(client_product_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Client product with ID {update_data['client_product_id']} not found")
        
        # Validate portfolio_id if provided
        if "portfolio_id" in update_data and update_data["portfolio_id"] is not None:
            portfolio_check = db.table("portfolios").select("id").eq("id", update_data["portfolio_id"]).execute()
            if not portfolio_check.data or len(portfolio_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Portfolio with ID {update_data['portfolio_id']} not found")
        
        # Convert date objects to ISO format strings
        if 'start_date' in update_data and update_data['start_date'] is not None:
            update_data['start_date'] = update_data['start_date'].isoformat()
        
        if 'end_date' in update_data and update_data['end_date'] is not None:
            update_data['end_date'] = update_data['end_date'].isoformat()
        
        # Update the product holding
        result = db.table("product_holdings").update(update_data).eq("id", product_holding_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update product holding")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product holding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/product_holdings/{product_holding_id}", response_model=dict)
async def delete_product_holding(product_holding_id: int, db = Depends(get_db)):
    """
    What it does: Deletes an product holding and all its associated records from the database.
    Why it's needed: Allows removing product holdings that are no longer relevant to the business.
    How it works:
        1. Verifies the product holding exists
        2. Deletes all holding activity logs associated with this product holding
        3. Finally deletes the product holding record
        4. Returns a success message
    Expected output: A JSON object with a success message confirmation
    """
    try:
        # Check if product holding exists
        check_result = db.table("product_holdings").select("id").eq("id", product_holding_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"product holding with ID {product_holding_id} not found")
        
        # Delete all holding activity logs for this product holding
        db.table("holding_activity_log").delete().eq("product_holding_id", product_holding_id).execute()
        
        # Finally, delete the product holding
        result = db.table("product_holdings").delete().eq("id", product_holding_id).execute()
        
        return {"message": f"product holding with ID {product_holding_id} and all associated records deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting product holding and associated records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
