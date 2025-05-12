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
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, email, account number"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Optional[str] = Query("asc", description="Sort order (asc or desc)"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of clients from the database.
    Why it's needed: Provides a way to view all clients in the system with optional filtering and sorting.
    How it works:
        1. Connects to the database
        2. Queries the 'clients' table with pagination and optional filters
        3. Returns the data as a list of Client objects
    Expected output: A JSON array of client objects with all their details
    """
    try:
        logger.info(f"Fetching clients with skip={skip}, limit={limit}, status={status}, search={search}")
        query = db.table("client_groups").select("*").neq("status", "inactive")
        
        # Apply filters if provided
        if status:
            query = query.eq("status", status)
            
        if search:
            search = search.lower()
            # Complex searches would need a more sophisticated approach
            # This is just a simple implementation
            search_results = []
            raw_results = query.execute()
            
            if raw_results.data:
                for client in raw_results.data:
                    name = client.get("name", "").lower()
                    relationship = client.get("relationship", "").lower()
                    advisor = client.get("advisor", "").lower()
                    
                    if (search in name or 
                        search in relationship or 
                        search in advisor):
                        search_results.append(client)
                
                # Apply pagination to filtered results
                start = skip
                end = skip + limit
                paginated_results = search_results[start:end] if start < len(search_results) else []
                return paginated_results
                
        # Apply sorting if provided
        if sort_by:
            # Determine sort order
            ascending = sort_order.lower() != "desc"
            query = query.order(sort_by, ascending=ascending)
        
        # Apply pagination
        result = query.range(skip, skip + limit - 1).execute()
        
        logger.info(f"Query result: {result}")
        if not result.data:
            logger.warning("No clients found in the database")
            
        return result.data
        
    except Exception as e:
        logger.error(f"Error fetching clients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/clients/dormant", response_model=List[Client])
async def get_dormant_clients(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of dormant clients from the database.
    Why it's needed: Provides a way to view all dormant clients separately from active ones.
    How it works:
        1. Connects to the database
        2. Queries the 'clients' table for records with status="dormant"
        3. Returns the data as a list of Client objects
    Expected output: A JSON array of dormant client objects
    """
    try:
        result = db.table("client_groups").select("*").eq("status", "dormant").range(skip, skip + limit - 1).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/clients", response_model=Client)
async def create_client(client: ClientCreate, db = Depends(get_db)):
    """
    What it does: Creates a new client record in the database.
    Why it's needed: Provides a way to add new clients to the system.
    How it works:
        1. Validates the client data using the ClientCreate model
        2. Inserts a new record into the 'clients' table
        3. Returns the newly created client data
    Expected output: A JSON object containing the created client's details
    """
    try:
        result = db.table("client_groups").insert(client.model_dump()).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=500, detail="Failed to create client")
    except Exception as e:
        logger.error(f"Error creating client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: int, db = Depends(get_db)):
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
        result = db.table("client_groups").select("*").eq("id", client_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: int, client_update: ClientUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing client record.
    Why it's needed: Allows modifying client information.
    How it works:
        1. Takes the client_id from the URL path and update data from the request body
        2. Verifies the client exists
        3. Updates the client record in the database
        4. Returns the updated client data
    Expected output: A JSON object containing the updated client's details
    """
    try:
        # Check if client exists
        check_result = db.table("client_groups").select("id").eq("id", client_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")
        
        # Update client
        result = db.table("client_groups").update(client_update.model_dump(exclude_unset=True)).eq("id", client_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(status_code=500, detail="Failed to update client")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/clients/{client_id}", response_model=dict)
async def delete_client(
    client_id: int, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Deletes a client record and all associated products and portfolios from the database.
    Why it's needed: Allows removing clients that are no longer relevant, along with their products and portfolios.
    How it works:
        1. Takes the client_id from the URL path
        2. Verifies the client exists
        3. Deletes all associated products, portfolios, and holdings using delete_client_products
        4. Deletes the client record
        5. Returns a success message
    Expected output: A JSON object with a success message confirmation
    """
    try:
        # Check if client exists
        check_result = db.table("client_groups").select("id").eq("id", client_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")

        # First, delete all client products and associated data
        try:
            products_result = await delete_client_products(client_id, db)
            products_deleted = products_result.get("deleted_products", 0)
            portfolios_deleted = products_result.get("deleted_portfolios", 0)
            funds_deleted = products_result.get("deleted_portfolio_funds", 0)
        except Exception as e:
            logger.warning(f"Error deleting associated products: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete client products: {str(e)}")

        # Delete client
        result = db.table("client_groups").delete().eq("id", client_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=400, detail="Failed to delete client")

        return {
            "message": f"Client with ID {client_id} deleted successfully",
            "deleted_products": products_deleted,
            "deleted_portfolios": portfolios_deleted,
            "deleted_funds": funds_deleted
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete client: {str(e)}")

@router.put("/clients/{client_id}/status", response_model=Client)
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
        check_result = db.table("client_groups").select("*").eq("id", client_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")
        
        # Get the current client data
        current_client = check_result.data[0]
        
        # Check if client already has the requested status
        if current_client.get("status") == status_update["status"]:
            return current_client
        
        # Update the client status
        result = db.table("client_groups").update({"status": status_update["status"]}).eq("id", client_id).execute()
        
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
        check_result = db.table("client_groups").select("*").eq("id", client_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")
        
        # Get the current client data
        current_client = check_result.data[0]
        
        # Set the current client as inactive
        inactive_result = db.table("client_groups").update({"status": "inactive"}).eq("id", client_id).execute()
        if not inactive_result.data or len(inactive_result.data) == 0:
            raise HTTPException(status_code=400, detail=f"Failed to set client with ID {client_id} as inactive")
        
        # Create new client with the same data but status active
        new_client_data = current_client.copy()
        new_client_data.pop("id", None)  # Remove the id field
        new_client_data.pop("created_at", None)  # Remove the created_at field
        new_client_data["status"] = "active"  # Set status to active
        
        result = db.table("client_groups").insert(new_client_data).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=400, detail="Failed to create new client version")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating client version: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create client version: {str(e)}")

@router.delete("/clients/{client_id}/products", response_model=dict)
async def delete_client_products(
    client_id: int, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Deletes all products for a client, along with associated portfolios and funds.
    Why it's needed: Allows cleaning up client products without removing the client itself.
    How it works:
        1. Gets all products for the client
        2. For each product:
            a. Gets the portfolio_id directly from the product
            b. Gets all portfolio_funds for this portfolio
            c. For each portfolio fund:
               - Deletes fund_valuations for the fund
               - Deletes irr_values for the fund
               - Deletes holding_activity_log entries for the fund
            d. Deletes all portfolio_funds for the portfolio
        3. Deletes all client products for the client (to remove foreign key constraints)
        4. Deletes all the portfolios associated with the deleted products
        5. Returns a summary of deletions
    Expected output: A JSON object with counts of deleted entities
    """
    try:
        # Check if client exists
        check_result = db.table("client_groups").select("id").eq("id", client_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")

        # Get client products for this client
        client_products_result = db.table("client_products").select("*").eq("client_id", client_id).execute()
        
        # Track statistics for response message
        deleted_products = 0
        deleted_portfolios = 0
        deleted_portfolio_funds = 0
        deleted_fund_valuations = 0
        deleted_irr_values = 0
        deleted_activity_logs = 0

        # Store portfolios to delete after removing client products
        portfolios_to_delete = []

        if client_products_result.data and len(client_products_result.data) > 0:
            products = client_products_result.data
            deleted_products = len(products)
            
            # Process each product
            for product in products:
                product_id = product["id"]
                portfolio_id = product.get("portfolio_id")
                
                # Skip if no portfolio is associated
                if not portfolio_id:
                    continue
                    
                # Track portfolio for deletion later
                portfolios_to_delete.append(portfolio_id)
                deleted_portfolios += 1
                
                # Get all portfolio_funds for this portfolio
                portfolio_funds_result = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_id).execute()
                
                if portfolio_funds_result.data and len(portfolio_funds_result.data) > 0:
                    funds = portfolio_funds_result.data
                    deleted_portfolio_funds += len(funds)
                    
                    # Process each fund
                    for fund in funds:
                        fund_id = fund["id"]
                        
                        # Delete fund valuations
                        fund_val_result = db.table("fund_valuations").delete().eq("portfolio_fund_id", fund_id).execute()
                        deleted_count = len(fund_val_result.data) if fund_val_result.data else 0
                        deleted_fund_valuations += deleted_count
                        
                        # Delete IRR values
                        irr_result = db.table("irr_values").delete().eq("fund_id", fund_id).execute()
                        deleted_count = len(irr_result.data) if irr_result.data else 0
                        deleted_irr_values += deleted_count
                        
                        # Delete activity logs
                        activity_result = db.table("holding_activity_log").delete().eq("portfolio_fund_id", fund_id).execute()
                        deleted_count = len(activity_result.data) if activity_result.data else 0
                        deleted_activity_logs += deleted_count
                    
                    # Delete all portfolio funds
                    db.table("portfolio_funds").delete().eq("portfolio_id", portfolio_id).execute()
            
            # Delete all client products for this client FIRST (to remove foreign key constraints)
            db.table("client_products").delete().eq("client_id", client_id).execute()
            
            # Now it's safe to delete the portfolios
            for portfolio_id in portfolios_to_delete:
                db.table("portfolios").delete().eq("id", portfolio_id).execute()

        return {
            "message": f"Successfully deleted {deleted_products} products, {deleted_portfolios} portfolios, and {deleted_portfolio_funds} funds for client ID {client_id}",
            "deleted_products": deleted_products,
            "deleted_portfolios": deleted_portfolios,
            "deleted_portfolio_funds": deleted_portfolio_funds,
            "deleted_fund_valuations": deleted_fund_valuations,
            "deleted_irr_values": deleted_irr_values,
            "deleted_activity_logs": deleted_activity_logs
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete client products: {str(e)}")

@router.get("/client_fum_summary", response_model=List[dict])
async def get_client_fum_summary(db = Depends(get_db)):
    """
    Returns the FUM (Funds Under Management) summary for all clients from the client_fum_summary view.
    """
    try:
        result = db.table("client_group_fum_summary").select("*").execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") 