from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.account_holding import AccountHolding, AccountHoldingCreate, AccountHoldingUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/account_holdings", response_model=List[AccountHolding])
async def get_account_holdings(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    client_account_id: Optional[int] = None,
    portfolio_id: Optional[int] = None,
    status: Optional[str] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of account holdings with optional filtering.
    Why it's needed: Provides a way to view account holdings in the system.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'account_holdings' table with optional filters
        3. Applies pagination parameters to limit result size
        4. Returns the data as a list of AccountHolding objects
    Expected output: A JSON array of account holding objects with all their details
    """
    try:
        query = db.table("account_holdings").select("*")
        
        if client_account_id is not None:
            query = query.eq("client_account_id", client_account_id)
            
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

@router.post("/account_holdings", response_model=AccountHolding)
async def create_account_holding(account_holding: AccountHoldingCreate, db = Depends(get_db)):
    """
    What it does: Creates a new account holding in the database.
    Why it's needed: Allows adding new account holdings to the system.
    How it works:
        1. Validates the account holding data using the AccountHoldingCreate model
        2. Validates that referenced client_account_id and portfolio_id exist
        3. Inserts the validated data into the 'account_holdings' table
        4. Returns the newly created account holding with its generated ID
    Expected output: A JSON object containing the created account holding with all fields including ID and created_at timestamp
    """
    try:
        # Validate client_account_id
        client_account_check = db.table("client_accounts").select("id").eq("id", account_holding.client_account_id).execute()
        if not client_account_check.data or len(client_account_check.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client account with ID {account_holding.client_account_id} not found")
        
        # Validate portfolio_id if provided
        if account_holding.portfolio_id:
            portfolio_check = db.table("portfolios").select("id").eq("id", account_holding.portfolio_id).execute()
            if not portfolio_check.data or len(portfolio_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Portfolio with ID {account_holding.portfolio_id} not found")
        
        # Explicitly handle date serialization
        data_dict = account_holding.model_dump()
        
        # Convert date objects to ISO format strings
        if 'start_date' in data_dict and data_dict['start_date'] is not None:
            data_dict['start_date'] = data_dict['start_date'].isoformat()
        
        if 'end_date' in data_dict and data_dict['end_date'] is not None:
            data_dict['end_date'] = data_dict['end_date'].isoformat()
        
        result = db.table("account_holdings").insert(data_dict).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=400, detail="Failed to create account holding")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating account holding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/account_holdings/{account_holding_id}", response_model=AccountHolding)
async def get_account_holding(account_holding_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single account holding by ID.
    Why it's needed: Allows viewing detailed information about a specific account holding.
    How it works:
        1. Takes the account_holding_id from the URL path
        2. Queries the 'account_holdings' table for a record with matching ID
        3. Returns the account holding data or raises a 404 error if not found
    Expected output: A JSON object containing the requested account holding's details
    """
    try:
        result = db.table("account_holdings").select("*").eq("id", account_holding_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=404, detail=f"Account holding with ID {account_holding_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/account_holdings/{account_holding_id}", response_model=AccountHolding)
async def update_account_holding(account_holding_id: int, account_holding_update: AccountHoldingUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing account holding's information.
    Why it's needed: Allows modifying account holding details when they change.
    How it works:
        1. Validates the update data using the AccountHoldingUpdate model
        2. Removes any None values from the input (fields that aren't being updated)
        3. Verifies the account holding exists
        4. Validates that referenced client_account_id, fund_id and portfolio_id exist if provided
        5. Updates only the provided fields in the database
        6. Returns the updated account holding information
    Expected output: A JSON object containing the updated account holding's details
    """
    # Remove None values from the update data
    update_data = {k: v for k, v in account_holding_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update data provided")
    
    try:
        # Check if account holding exists
        check_result = db.table("account_holdings").select("id").eq("id", account_holding_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Account holding with ID {account_holding_id} not found")
        
        # Validate client_account_id if provided
        if "client_account_id" in update_data and update_data["client_account_id"] is not None:
            client_account_check = db.table("client_accounts").select("id").eq("id", update_data["client_account_id"]).execute()
            if not client_account_check.data or len(client_account_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Client account with ID {update_data['client_account_id']} not found")
        
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
        
        # Update the account holding
        result = db.table("account_holdings").update(update_data).eq("id", account_holding_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update account holding")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating account holding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/account_holdings/{account_holding_id}", response_model=dict)
async def delete_account_holding(account_holding_id: int, db = Depends(get_db)):
    """
    What it does: Deletes an account holding and all its associated records from the database.
    Why it's needed: Allows removing account holdings that are no longer relevant to the business.
    How it works:
        1. Verifies the account holding exists
        2. Deletes all holding activity logs associated with this account holding
        3. Finally deletes the account holding record
        4. Returns a success message
    Expected output: A JSON object with a success message confirmation
    """
    try:
        # Check if account holding exists
        check_result = db.table("account_holdings").select("id").eq("id", account_holding_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Account holding with ID {account_holding_id} not found")
        
        # Delete all holding activity logs for this account holding
        db.table("holding_activity_log").delete().eq("account_holding_id", account_holding_id).execute()
        
        # Finally, delete the account holding
        result = db.table("account_holdings").delete().eq("id", account_holding_id).execute()
        
        return {"message": f"Account holding with ID {account_holding_id} and all associated records deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting account holding and associated records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
