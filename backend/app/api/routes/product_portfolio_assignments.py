from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.product_portfolio_assignment import ProductPortfolioAssignment, ProductPortfolioAssignmentCreate, ProductPortfolioAssignmentUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/product_portfolio_assignments", response_model=List[ProductPortfolioAssignment])
async def get_assignments(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    product_id: Optional[int] = None,
    portfolio_id: Optional[int] = None,
    active_only: bool = False,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of product portfolio assignments with optional filtering.
    Why it's needed: Provides a way to view which portfolios are assigned to which products.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'product_portfolio_assignments' table with optional filters
        3. Applies pagination parameters to limit result size
        4. Returns the data as a list of ProductPortfolioAssignment objects
    Expected output: A JSON array of assignment objects with all their details
    """
    try:
        query = db.table("product_portfolio_assignments").select("*")
        
        if product_id is not None:
            query = query.eq("product_id", product_id)
            
        if portfolio_id is not None:
            query = query.eq("portfolio_id", portfolio_id)
            
        if active_only:
            query = query.is_("end_date", "null")
            
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

@router.post("/product_portfolio_assignments", response_model=ProductPortfolioAssignment)
async def create_assignment(assignment: ProductPortfolioAssignmentCreate, db = Depends(get_db)):
    """
    What it does: Creates a new product portfolio assignment in the database.
    Why it's needed: Allows assigning portfolios to products.
    How it works:
        1. Validates the assignment data using the ProductPortfolioAssignmentCreate model
        2. Validates that referenced product_id and portfolio_id exist
        3. If this is a new active assignment (no end_date), ends any existing active assignments for the same product
        4. Inserts the validated data into the 'product_portfolio_assignments' table
        5. Returns the newly created assignment with its generated ID
    Expected output: A JSON object containing the created assignment with all fields including ID and created_at timestamp
    """
    try:
        # Validate product_id
        product_check = db.table("products").select("id").eq("id", assignment.product_id).execute()
        if not product_check.data or len(product_check.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client product with ID {assignment.product_id} not found")
        
        # Validate portfolio_id
        portfolio_check = db.table("portfolios").select("id").eq("id", assignment.portfolio_id).execute()
        if not portfolio_check.data or len(portfolio_check.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {assignment.portfolio_id} not found")
        
        # If this is a new active assignment (no end_date), end any existing active assignments for this product
        if assignment.end_date is None:
            current_assignments = db.table("product_portfolio_assignments")\
                .select("id")\
                .eq("product_id", assignment.product_id)\
                .is_("end_date", "null")\
                .execute()
            
            if current_assignments.data and len(current_assignments.data) > 0:
                # Set end_date to the day before the new assignment's start_date
                end_date = assignment.start_date.isoformat()
                
                for active_assignment in current_assignments.data:
                    db.table("product_portfolio_assignments")\
                        .update({"end_date": end_date})\
                        .eq("id", active_assignment["id"])\
                        .execute()
        
        # Explicitly handle date serialization
        data_dict = assignment.model_dump()
        
        # Convert date objects to ISO format strings
        if 'start_date' in data_dict and data_dict['start_date'] is not None:
            data_dict['start_date'] = data_dict['start_date'].isoformat()
        
        if 'end_date' in data_dict and data_dict['end_date'] is not None:
            data_dict['end_date'] = data_dict['end_date'].isoformat()
        
        result = db.table("product_portfolio_assignments").insert(data_dict).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=400, detail="Failed to create product portfolio assignment")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating assignment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/product_portfolio_assignments/{assignment_id}", response_model=ProductPortfolioAssignment)
async def get_assignment(assignment_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single product portfolio assignment by ID.
    Why it's needed: Allows viewing detailed information about a specific assignment.
    How it works:
        1. Takes the assignment_id from the URL path
        2. Queries the 'product_portfolio_assignments' table for a record with matching ID
        3. Returns the assignment data or raises a 404 error if not found
    Expected output: A JSON object containing the requested assignment's details
    """
    try:
        result = db.table("product_portfolio_assignments").select("*").eq("id", assignment_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=404, detail=f"Assignment with ID {assignment_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/product_portfolio_assignments/{assignment_id}", response_model=ProductPortfolioAssignment)
async def update_assignment(assignment_id: int, assignment_update: ProductPortfolioAssignmentUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing product portfolio assignment's information.
    Why it's needed: Allows modifying assignment details, such as ending an active assignment.
    How it works:
        1. Validates the update data using the ProductPortfolioAssignmentUpdate model
        2. Removes any None values from the input (fields that aren't being updated)
        3. Verifies the assignment exists
        4. Validates that referenced product_id and portfolio_id exist if provided
        5. Updates only the provided fields in the database
        6. Returns the updated assignment information
    Expected output: A JSON object containing the updated assignment's details
    """
    # Remove None values from the update data
    update_data = {k: v for k, v in assignment_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update data provided")
    
    try:
        # Check if assignment exists
        check_result = db.table("product_portfolio_assignments").select("*").eq("id", assignment_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Assignment with ID {assignment_id} not found")
        
        current_assignment = check_result.data[0]
        
        # Validate product_id if provided
        if "product_id" in update_data and update_data["product_id"] is not None:
            product_check = db.table("products").select("id").eq("id", update_data["product_id"]).execute()
            if not product_check.data or len(product_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Client product with ID {update_data['product_id']} not found")
        
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
        
        # If we're removing the end_date (making it active) and this is an update
        # that doesn't change product_id, end any other active assignments
        if 'end_date' in update_data and update_data['end_date'] is None and current_assignment.get('end_date') is not None:
            product_id = update_data.get('product_id', current_assignment.get('product_id'))
            
            other_assignments = db.table("product_portfolio_assignments")\
                .select("id")\
                .eq("product_id", product_id)\
                .is_("end_date", "null")\
                .neq("id", assignment_id)\
                .execute()
                
            if other_assignments.data and len(other_assignments.data) > 0:
                end_date = update_data.get('start_date') or current_assignment.get('start_date')
                
                for active_assignment in other_assignments.data:
                    db.table("product_portfolio_assignments")\
                        .update({"end_date": end_date})\
                        .eq("id", active_assignment["id"])\
                        .execute()
        
        # Update the assignment
        result = db.table("product_portfolio_assignments").update(update_data).eq("id", assignment_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update assignment")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating assignment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/product_portfolio_assignments/{assignment_id}", response_model=dict)
async def delete_assignment(assignment_id: int, db = Depends(get_db)):
    """
    What it does: Deletes a product portfolio assignment from the database.
    Why it's needed: Allows removing incorrect assignments.
    How it works:
        1. Verifies the assignment exists
        2. Deletes the assignment record
        3. Returns a success message
    Expected output: A JSON object with a success message confirmation
    """
    try:
        # Check if assignment exists
        check_result = db.table("product_portfolio_assignments").select("id").eq("id", assignment_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Assignment with ID {assignment_id} not found")
        
        # Delete the assignment
        result = db.table("product_portfolio_assignments").delete().eq("id", assignment_id).execute()
        
        return {"message": f"Assignment with ID {assignment_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting assignment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/products/{product_id}/current_portfolio", response_model=ProductPortfolioAssignment)
async def get_current_portfolio_assignment(product_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves the current active portfolio assignment for a product.
    Why it's needed: Provides a convenient way to get the active portfolio for a specific product.
    How it works:
        1. Takes the product_id from the URL path
        2. Queries the 'product_portfolio_assignments' table for an active record (end_date is null)
        3. Returns the assignment data or raises a 404 error if not found
    Expected output: A JSON object containing the current portfolio assignment's details
    """
    try:
        # Check if client product exists
        product_check = db.table("products").select("id").eq("id", product_id).execute()
        if not product_check.data or len(product_check.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client product with ID {product_id} not found")
        
        # Get current active assignment
        result = db.table("product_portfolio_assignments")\
            .select("*")\
            .eq("product_id", product_id)\
            .is_("end_date", "null")\
            .order("start_date", desc=True)\
            .limit(1)\
            .execute()
            
        if result.data and len(result.data) > 0:
            return result.data[0]
            
        raise HTTPException(status_code=404, detail=f"No active portfolio assignment found for client product with ID {product_id}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/portfolios/{portfolio_id}/assigned_products", response_model=List[ProductPortfolioAssignment])
async def get_portfolio_assigned_products(
    portfolio_id: int, 
    active_only: bool = True,
    db = Depends(get_db)
):
    """
    What it does: Retrieves all products that have this portfolio assigned.
    Why it's needed: Provides a way to see which products are using a specific portfolio.
    How it works:
        1. Takes the portfolio_id from the URL path
        2. Queries the 'product_portfolio_assignments' table for records with matching portfolio_id
        3. Optionally filters for only active assignments (end_date is null)
        4. Returns the data as a list of ProductPortfolioAssignment objects
    Expected output: A JSON array of assignment objects with all their details
    """
    try:
        # Check if portfolio exists
        portfolio_check = db.table("portfolios").select("id").eq("id", portfolio_id).execute()
        if not portfolio_check.data or len(portfolio_check.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio with ID {portfolio_id} not found")
        
        # Build query
        query = db.table("product_portfolio_assignments")\
            .select("*")\
            .eq("portfolio_id", portfolio_id)
            
        if active_only:
            query = query.is_("end_date", "null")
            
        result = query.execute()
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

