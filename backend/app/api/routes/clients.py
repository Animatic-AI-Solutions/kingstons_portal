from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.client import Client, ClientCreate, ClientUpdate
from app.db.database import get_db
from app.api.routes.auth import get_current_user

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/clients", response_model=List[Client])
async def get_clients(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    show_dormant: bool = Query(False, description="Include dormant clients in the results"),
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Retrieves a paginated list of clients from the database.
    Why it's needed: Provides a way to view all clients in the system with pagination to handle large datasets efficiently.
    How it works: 
        1. Connects to the Supabase database
        2. Queries the 'clients' table with pagination parameters
        3. Filters out inactive clients and optionally includes dormant clients
        4. Returns the data as a list of Client objects
    Expected output: A JSON array of client objects with all their details
    """
    try:
        logger.info(f"User {current_user['id']} fetching clients with skip={skip}, limit={limit}, show_dormant={show_dormant}")
        query = db.table("clients").select("*").neq("status", "inactive")
        
        if not show_dormant:
            query = query.neq("status", "dormant")
            
        result = query.range(skip, skip + limit - 1).execute()
        logger.info(f"Query result: {result}")
        if not result.data:
            logger.warning("No clients found in the database")
        return result.data
    except Exception as e:
        logger.error(f"Error fetching clients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch clients: {str(e)}")

@router.get("/clients/dormant", response_model=List[Client])
async def get_dormant_clients(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Retrieves a paginated list of all dormant clients from the database.
    Why it's needed: Provides a way to view all dormant clients in the system with pagination to handle large datasets efficiently.
    How it works: 
        1. Connects to the Supabase database
        2. Queries the 'clients' table with pagination parameters
        3. Filters for clients with 'dormant' status
        4. Returns the data as a list of Client objects
    Expected output: A JSON array of dormant client objects with all their details
    """
    try:
        logger.info(f"User {current_user['id']} fetching dormant clients with skip={skip}, limit={limit}")
        result = db.table("clients").select("*").eq("status", "dormant").range(skip, skip + limit - 1).execute()
        logger.info(f"Query result: {result}")
        if not result.data:
            logger.warning("No dormant clients found in the database")
        return result.data
    except Exception as e:
        logger.error(f"Error fetching dormant clients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch dormant clients: {str(e)}")

@router.post("/clients", response_model=Client)
async def create_client(
    client: ClientCreate, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Creates a new client record in the database.
    Why it's needed: Allows adding new clients to the system.
    How it works:
        1. Takes the client data from the request body
        2. Validates the data against the ClientCreate model
        3. Inserts the data into the 'clients' table
        4. Returns the created client record
    Expected output: A JSON object containing the newly created client's details
    """
    try:
        logger.info(f"User {current_user['id']} creating new client: {client.model_dump()}")
        result = db.table("clients").insert(client.model_dump()).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=400, detail="Failed to create client")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create client: {str(e)}")

@router.get("/clients/{client_id}", response_model=Client)
async def get_client(
    client_id: int, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Retrieves a single client by ID.
    Why it's needed: Allows viewing detailed information about a specific client.
    How it works:
        1. Takes the client_id from the URL path
        2. Queries the 'clients' table for a record with matching ID
        3. Returns the client data or raises a 404 error if not found
    Expected output: A JSON object containing the requested client's details
    """
    try:
        logger.info(f"User {current_user['id']} fetching client with ID: {client_id}")
        result = db.table("clients").select("*").eq("id", client_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch client: {str(e)}")

@router.patch("/clients/{client_id}", response_model=Client)
async def update_client(
    client_id: int, 
    client_update: ClientUpdate, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Updates an existing client record.
    Why it's needed: Allows modifying client information.
    How it works:
        1. Takes the client_id from the URL path and update data from request body
        2. Verifies the client exists
        3. Updates the client record with the new data
        4. Returns the updated client record
    Expected output: A JSON object containing the updated client's details
    """
    try:
        logger.info(f"User {current_user['id']} updating client with ID: {client_id}")
        # Check if client exists
        check_result = db.table("clients").select("id").eq("id", client_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")

        # Update client
        result = db.table("clients").update(client_update.model_dump(exclude_unset=True)).eq("id", client_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=400, detail="Failed to update client")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update client: {str(e)}")

@router.delete("/clients/{client_id}", response_model=dict)
async def delete_client(
    client_id: int, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Deletes a client record and all associated accounts and portfolios from the database.
    Why it's needed: Allows removing clients that are no longer relevant, along with their accounts and portfolios.
    How it works:
        1. Takes the client_id from the URL path
        2. Verifies the client exists
        3. Deletes all associated accounts, portfolios, and holdings using delete_client_accounts
        4. Deletes the client record
        5. Returns a success message
    Expected output: A JSON object with a success message confirmation
    """
    try:
        # Check if client exists
        check_result = db.table("clients").select("id").eq("id", client_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")

        # First, delete all client accounts and associated data
        try:
            accounts_result = await delete_client_accounts(client_id, db)
            accounts_deleted = accounts_result.get("deleted_accounts", 0)
            portfolios_deleted = accounts_result.get("deleted_portfolios", 0)
            holdings_deleted = accounts_result.get("deleted_holdings", 0)
        except Exception as e:
            logger.warning(f"Error deleting associated accounts: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete client accounts: {str(e)}")

        # Delete client
        result = db.table("clients").delete().eq("id", client_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=400, detail="Failed to delete client")

        return {
            "message": f"Client with ID {client_id} deleted successfully",
            "deleted_accounts": accounts_deleted,
            "deleted_portfolios": portfolios_deleted,
            "deleted_holdings": holdings_deleted
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete client: {str(e)}")

@router.patch("/clients/{client_id}/status", response_model=Client)
async def update_client_status(
    client_id: int, 
    status_update: dict, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Updates a client's status (e.g., 'active', 'dormant', 'inactive').
    Why it's needed: Allows changing a client's status without updating other information.
    How it works:
        1. Verifies the client exists
        2. Updates only the status field with the provided value
        3. Returns the updated client information
    Expected output: A JSON object containing the updated client's details
    """
    try:
        # Validate that status is provided
        if "status" not in status_update:
            raise HTTPException(status_code=400, detail="Status field is required")
            
        # Validate status value
        valid_statuses = ["active", "dormant", "inactive"]
        if status_update["status"] not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")
            
        # Check if client exists
        check_result = db.table("clients").select("*").eq("id", client_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")
        
        # Get the current client data
        current_client = check_result.data[0]
        
        # Check if client already has the requested status
        if current_client.get("status") == status_update["status"]:
            return current_client
        
        # Update the client status
        result = db.table("clients").update({"status": status_update["status"]}).eq("id", client_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail=f"Failed to update status for client with ID {client_id}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/client-versions", response_model=Client)
async def create_client_version(
    client_id: int, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Creates a new active client record based on an existing client and sets the original as inactive.
    Why it's needed: Allows creating a new version of a client while preserving the old version's history.
    How it works:
        1. Verifies the client exists
        2. Gets the current client data
        3. Sets the current client's status to 'inactive'
        4. Creates a new client with the same data but status 'active'
        5. Returns the newly created client
    Expected output: A JSON object containing the newly created client's details
    """
    try:
        # Check if client exists
        check_result = db.table("clients").select("*").eq("id", client_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")
        
        # Get the current client data
        current_client = check_result.data[0]
        
        # Set the current client as inactive
        inactive_result = db.table("clients").update({"status": "inactive"}).eq("id", client_id).execute()
        if not inactive_result.data or len(inactive_result.data) == 0:
            raise HTTPException(status_code=400, detail=f"Failed to set client with ID {client_id} as inactive")
        
        # Create new client with the same data but status active
        new_client_data = current_client.copy()
        new_client_data.pop("id", None)  # Remove the id field
        new_client_data.pop("created_at", None)  # Remove the created_at field
        new_client_data["status"] = "active"  # Set status to active
        
        result = db.table("clients").insert(new_client_data).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=400, detail="Failed to create new client version")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating client version: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create client version: {str(e)}")

@router.delete("/clients/{client_id}/accounts", response_model=dict)
async def delete_client_accounts(
    client_id: int, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Deletes all accounts for a client, along with associated portfolios and products, but preserves providers.
    Why it's needed: Allows cleaning up client accounts without removing the client itself.
    How it works:
        1. Gets all accounts for the client
        2. For each account:
            a. Gets all holdings for the account
            b. For each holding, gets portfolio details
            c. Deletes the holdings
        3. Deletes the accounts
        4. Returns a summary of deletions
    Expected output: A JSON object with counts of deleted entities
    """
    try:
        # Check if client exists
        check_result = db.table("clients").select("id").eq("id", client_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")

        # Get client accounts for this client
        client_accounts_result = db.table("client_accounts").select("id").eq("client_id", client_id).execute()
        
        # Track statistics for response message
        deleted_accounts = 0
        deleted_portfolios = 0
        deleted_holdings = 0

        if client_accounts_result.data and len(client_accounts_result.data) > 0:
            account_ids = [account["id"] for account in client_accounts_result.data]
            deleted_accounts = len(account_ids)
            
            # Get portfolio assignments for these accounts
            for account_id in account_ids:
                # Delete account holdings and their activity logs
                holdings_result = db.table("account_holdings").select("id", "portfolio_id").eq("client_account_id", account_id).execute()
                portfolio_ids = []
                
                if holdings_result.data and len(holdings_result.data) > 0:
                    # Collect all portfolio IDs from the holdings
                    for holding in holdings_result.data:
                        # Delete activity logs for this holding
                        db.table("holding_activity_log").delete().eq("account_holding_id", holding["id"]).execute()
                        # Add portfolio ID to list if it exists
                        if "portfolio_id" in holding and holding["portfolio_id"] is not None:
                            portfolio_ids.append(holding["portfolio_id"])
                    
                    # Delete the holdings
                    deleted_holdings += len(holdings_result.data)
                    db.table("account_holdings").delete().eq("client_account_id", account_id).execute()
                
                # Remove duplicates from portfolio_ids
                portfolio_ids = list(set(portfolio_ids))
                
                # Delete portfolio fund assignments and their activity logs for these portfolios
                for portfolio_id in portfolio_ids:
                    # First, get all portfolio_funds linked to this portfolio
                    portfolio_funds_result = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_id).execute()
                    
                    if portfolio_funds_result.data and len(portfolio_funds_result.data) > 0:
                        for pf in portfolio_funds_result.data:
                            # Delete any holding_activity_logs related to this portfolio_fund first
                            db.table("holding_activity_log").delete().eq("portfolio_fund_id", pf["id"]).execute()
                    
                    # Now it's safe to delete the portfolio_funds
                    db.table("portfolio_funds").delete().eq("portfolio_id", portfolio_id).execute()
                
                # Delete portfolios (if they're not used by other clients)
                for portfolio_id in portfolio_ids:
                    # Check if this portfolio is used by any other client accounts
                    other_holdings = db.table("account_holdings").select("id").eq("portfolio_id", portfolio_id).neq("client_account_id", account_id).execute()
                    has_other_assignments = other_holdings.data and len(other_holdings.data) > 0
                    
                    if not has_other_assignments:
                        # Portfolio is not used by any other accounts, safe to delete
                        db.table("portfolios").delete().eq("id", portfolio_id).execute()
                        deleted_portfolios += 1
            
            # Delete all client accounts for this client
            db.table("client_accounts").delete().eq("client_id", client_id).execute()

        return {
            "message": f"Successfully deleted {deleted_accounts} accounts, {deleted_portfolios} portfolios, and {deleted_holdings} holdings for client ID {client_id}",
            "deleted_accounts": deleted_accounts,
            "deleted_portfolios": deleted_portfolios,
            "deleted_holdings": deleted_holdings
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete client accounts: {str(e)}") 