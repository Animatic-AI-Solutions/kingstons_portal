from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.client import ClientGroup, ClientGroupCreate, ClientGroupUpdate
from app.db.database import get_db
from app.api.routes.auth import get_current_user

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/client_groups", response_model=List[ClientGroup])
async def get_client_groups(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100000, ge=1, le=100000, description="Max number of records to return"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, email, account number"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Optional[str] = Query("asc", description="Sort order (asc or desc)"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of client groups from the database.
    Why it's needed: Provides a way to view all client groups in the system with optional filtering and sorting.
    How it works: 
        1. Connects to the database
        2. Queries the 'client_groups' table with pagination and optional filters
        3. Returns the data as a list of ClientGroup objects
    Expected output: A JSON array of client group objects with all their details
    """
    try:
        logger.info(f"Fetching client groups with skip={skip}, limit={limit}, status={status}, search={search}")
        
        # Build base query with filters
        where_conditions = ["status != 'inactive'"]
        params = []
        param_count = 0
        
        if status:
            param_count += 1
            where_conditions.append(f"status = ${param_count}")
            params.append(status)
        
        # Handle search functionality
        if search:
            search = search.lower()
            # Get all matching records first for client-side filtering
            where_clause = " WHERE " + " AND ".join(where_conditions)
            search_query = f"SELECT * FROM client_groups{where_clause}"
            
            raw_results = await db.fetch(search_query, *params)
            
            if raw_results:
                search_results = []
                for client_group in raw_results:
                    name = (client_group.get("name", "") or "").lower()
                    relationship = (client_group.get("relationship", "") or "").lower()
                    advisor = (client_group.get("advisor", "") or "").lower()
                    
                    if (search in name or 
                        search in relationship or 
                        search in advisor):
                        search_results.append(dict(client_group))
                
                # Apply pagination to filtered results
                start = skip
                end = skip + limit
                paginated_results = search_results[start:end] if start < len(search_results) else []
                return paginated_results
            else:
                return []
                
        # Build query with sorting and pagination
        where_clause = " WHERE " + " AND ".join(where_conditions)
        
        # Add sorting if specified
        order_clause = ""
        if sort_by:
            sort_direction = "DESC" if sort_order.lower() == "desc" else "ASC"
            # Validate sort_by to prevent SQL injection (basic validation)
            allowed_sort_fields = ["name", "status", "advisor", "relationship", "type", "created_at", "id"]
            if sort_by in allowed_sort_fields:
                order_clause = f" ORDER BY {sort_by} {sort_direction}"
        
        # Add pagination parameters
        param_count += 1
        offset_param = param_count
        param_count += 1
        limit_param = param_count
        params.extend([skip, limit])
        
        query = f"SELECT * FROM client_groups{where_clause}{order_clause} OFFSET ${offset_param} LIMIT ${limit_param}"
        
        result = await db.fetch(query, *params)
        
        logger.info(f"Query executed successfully, found {len(result)} client groups")
        if not result:
            logger.warning("No client groups found in the database")
            
        return [dict(row) for row in result]
        
    except Exception as e:
        logger.error(f"Error fetching client groups: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/client_groups/dormant", response_model=List[ClientGroup])
async def get_dormant_client_groups(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100000, ge=1, le=100000, description="Max number of records to return"),
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of dormant client groups from the database.
    Why it's needed: Provides a way to view all dormant client groups separately from active ones.
    How it works: 
        1. Connects to the database
        2. Queries the 'client_groups' table for records with status="dormant"
        3. Returns the data as a list of ClientGroup objects
    Expected output: A JSON array of dormant client group objects
    """
    try:
        result = await db.fetch(
            "SELECT * FROM client_groups WHERE status = 'dormant' OFFSET $1 LIMIT $2",
            skip, limit
        )
        return [dict(row) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/client_groups", response_model=ClientGroup)
async def create_client_group(client_group: ClientGroupCreate, db = Depends(get_db)):
    """
    What it does: Creates a new client group record in the database.
    Why it's needed: Provides a way to add new client groups to the system.
    How it works:
        1. Validates the client group data using the ClientGroupCreate model
        2. Inserts a new record into the 'client_groups' table
        3. Returns the newly created client group data
    Expected output: A JSON object containing the created client group's details
    """
    try:
        # Get the data from the Pydantic model
        client_data = client_group.model_dump()
        
        # Build dynamic INSERT query
        columns = list(client_data.keys())
        values = list(client_data.values())
        placeholders = ", ".join([f"${i+1}" for i in range(len(values))])
        columns_str = ", ".join(columns)
        
        query = f"INSERT INTO client_groups ({columns_str}) VALUES ({placeholders}) RETURNING *"
        result = await db.fetchrow(query, *values)
        
        if result:
            return dict(result)
        raise HTTPException(status_code=500, detail="Failed to create client group")
    except Exception as e:
        logger.error(f"Error creating client group: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/client_groups/{client_group_id}", response_model=ClientGroup)
async def get_client_group(client_group_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single client group by ID.
    Why it's needed: Allows viewing detailed information about a specific client group.
    How it works:
        1. Takes the client_group_id from the URL path
        2. Queries the 'client_groups' table for a record with matching ID
        3. Returns the client group data or raises a 404 error if not found
    Expected output: A JSON object containing the requested client group's details
    """
    try:
        result = await db.fetchrow("SELECT * FROM client_groups WHERE id = $1", client_group_id)
        if result:
            return dict(result)
        raise HTTPException(status_code=404, detail=f"Client group with ID {client_group_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client group: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/client_groups/{client_group_id}", response_model=ClientGroup)
async def update_client_group(client_group_id: int, client_group_update: ClientGroupUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing client group record.
    Why it's needed: Allows modifying client group information.
    How it works:
        1. Takes the client_group_id from the URL path and update data from the request body
        2. Verifies the client group exists
        3. Updates the client group record in the database
        4. Returns the updated client group data
    Expected output: A JSON object containing the updated client group's details
    """
    try:
        # Check if client group exists
        check_result = await db.fetchrow("SELECT id FROM client_groups WHERE id = $1", client_group_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f"Client group with ID {client_group_id} not found")
        
        # Get update data (excluding unset fields)
        update_data = client_group_update.model_dump(exclude_unset=True)
        
        if not update_data:
            # No updates provided, return existing record
            existing = await db.fetchrow("SELECT * FROM client_groups WHERE id = $1", client_group_id)
            return dict(existing)
        
        # Build dynamic UPDATE query
        set_clauses = []
        params = []
        param_count = 0
        
        for key, value in update_data.items():
            param_count += 1
            set_clauses.append(f"{key} = ${param_count}")
            params.append(value)
        
        param_count += 1
        params.append(client_group_id)
        
        query = f"UPDATE client_groups SET {', '.join(set_clauses)} WHERE id = ${param_count} RETURNING *"
        result = await db.fetchrow(query, *params)

        if result:
            return dict(result)
        raise HTTPException(status_code=500, detail="Failed to update client group")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client group: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/client_groups/{client_group_id}", response_model=dict)
async def delete_client_group(
    client_group_id: int, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Deletes a client group record and all associated products and portfolios from the database.
    Why it's needed: Allows removing client groups that are no longer relevant, along with their products and portfolios.
    How it works:
        1. Takes the client_group_id from the URL path
        2. Verifies the client group exists
        3. Deletes all associated products, portfolios, and holdings using delete_client_group_products
        4. Deletes the client group record
        5. Returns a success message
    Expected output: A JSON object with a success message confirmation
    """
    try:
        # Check if client group exists
        check_result = await db.fetchrow("SELECT id FROM client_groups WHERE id = $1", client_group_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f"Client group with ID {client_group_id} not found")

        # First, delete all client group products and associated data
        try:
            products_result = await delete_client_group_products(client_group_id, db)
            products_deleted = products_result.get("deleted_products", 0)
            portfolios_deleted = products_result.get("deleted_portfolios", 0)
            funds_deleted = products_result.get("deleted_portfolio_funds", 0)
        except Exception as e:
            logger.warning(f"Error deleting associated products: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete client group products: {str(e)}")

        # Delete client group
        result = await db.fetchrow("DELETE FROM client_groups WHERE id = $1 RETURNING id", client_group_id)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to delete client group")

        return {
            "message": f"Client group with ID {client_group_id} deleted successfully",
            "deleted_products": products_deleted,
            "deleted_portfolios": portfolios_deleted,
            "deleted_funds": funds_deleted
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client group: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete client group: {str(e)}")

@router.put("/client_groups/{client_group_id}/status", response_model=ClientGroup)
async def update_client_group_status(
    client_group_id: int, 
    status_update: dict, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Updates a client group's status (e.g., 'active', 'dormant', 'inactive').
    Why it's needed: Allows changing a client group's status without updating other information.
    How it works:
        1. Verifies the client group exists
        2. Updates only the status field with the provided value
        3. Returns the updated client group information
    Expected output: A JSON object containing the updated client group's details
    """
    try:
        # Validate that status is provided
        if "status" not in status_update:
            raise HTTPException(status_code=400, detail="Status field is required")
            
        # Validate status value
        valid_statuses = ["active", "dormant", "inactive"]
        if status_update["status"] not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
            
        # Check if client group exists
        check_result = await db.fetchrow("SELECT id FROM client_groups WHERE id = $1", client_group_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f"Client group with ID {client_group_id} not found")
        
        # Update only the status field
        result = await db.fetchrow(
            "UPDATE client_groups SET status = $1 WHERE id = $2 RETURNING *",
            status_update["status"], client_group_id
        )
        
        if result:
            return dict(result)
        raise HTTPException(status_code=500, detail="Failed to update client group status")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client group status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/client_group_versions", response_model=ClientGroup)
async def create_client_group_version(
    client_group_id: int, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Creates a historical version of a client group for auditing purposes.
    Why it's needed: Required for compliance and audit trail of changes to client groups data.
    How it works:
        1. Retrieves the current client group data from the 'client_groups' table
        2. Creates a copy in the 'client_group_versions' table with a timestamp
        3. Returns the saved version data
    Expected output: A JSON object containing the versioned client group data
    """
    try:
        # Get current client group data
        client_group_result = await db.fetchrow("SELECT * FROM client_groups WHERE id = $1", client_group_id)
        
        if not client_group_result:
            raise HTTPException(status_code=404, detail=f"Client group with ID {client_group_id} not found")
        
        client_group_data = dict(client_group_result)
        
        # Include who made the version and when
        version_data = {
            "client_group_id": client_group_id,
            "created_by": current_user.get("id") if current_user else None,
            "name": client_group_data.get("name"),
            "status": client_group_data.get("status"),
            "advisor": client_group_data.get("advisor"),
            "type": client_group_data.get("type")
        }
        
        # Insert into versions table
        version_result = await db.fetchrow(
            "INSERT INTO client_group_versions (client_group_id, created_by, name, status, advisor, type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            version_data["client_group_id"], version_data["created_by"], version_data["name"], 
            version_data["status"], version_data["advisor"], version_data["type"]
        )
        
        if not version_result:
            raise HTTPException(status_code=500, detail="Failed to create client group version")
        
        # Return the client group data (not the version record)
        return client_group_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating client group version: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/client_groups/{client_group_id}/products", response_model=dict)
async def delete_client_group_products(
    client_group_id: int, 
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    What it does: Deletes all products (and their associated data) for a specific client group.
    Why it's needed: Allows bulk deletion of all products related to a client group.
    How it works:
        1. Finds all products for the client group
        2. For each product, removes associated portfolio funds and activity logs
        3. Deletes the portfolios and then the products
        4. Returns counts of deleted items
    Expected output: A JSON object with counts of deleted products, portfolios, and funds
    """
    try:
        # Get all products for this client group
        products_result = await db.fetch(
            "SELECT id, portfolio_id FROM client_products WHERE client_id = $1",
            client_group_id
        )
        
        if not products_result:
            logger.info(f"No products found for client group {client_group_id}")
            return {
                "message": "No products found for client group",
                "deleted_products": 0,
                "deleted_portfolios": 0,
                "deleted_portfolio_funds": 0
            }
            
        products = [dict(row) for row in products_result]
        product_ids = [p["id"] for p in products]
        portfolio_ids = [p["portfolio_id"] for p in products if p["portfolio_id"] is not None]
        
        # Get all portfolio funds for these portfolios
        portfolio_fund_ids = []
        if portfolio_ids:
            portfolio_funds_result = await db.fetch(
                "SELECT id FROM portfolio_funds WHERE portfolio_id = ANY($1::int[])",
                portfolio_ids
            )
            portfolio_fund_ids = [pf["id"] for pf in portfolio_funds_result]
            
        # Delete activity logs associated with portfolio funds
        activity_logs_deleted = 0
        if portfolio_fund_ids:
            activity_logs_result = await db.execute(
                "DELETE FROM holding_activity_log WHERE portfolio_fund_id = ANY($1::int[])",
                portfolio_fund_ids
            )
            activity_logs_deleted = int(activity_logs_result.split()[-1]) if activity_logs_result.startswith("DELETE") else 0
                
        # Delete valuations and IRR values for portfolio funds
        valuations_deleted = 0
        irr_values_deleted = 0
        if portfolio_fund_ids:
            # Delete fund valuations
            valuations_result = await db.execute(
                "DELETE FROM portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[])",
                portfolio_fund_ids
            )
            valuations_deleted = int(valuations_result.split()[-1]) if valuations_result.startswith("DELETE") else 0
            
            # Delete IRR values
            irr_values_result = await db.execute(
                "DELETE FROM portfolio_fund_irr_values WHERE fund_id = ANY($1::int[])",
                portfolio_fund_ids
            )
            irr_values_deleted = int(irr_values_result.split()[-1]) if irr_values_result.startswith("DELETE") else 0
        
        # Delete portfolio funds
        funds_deleted = 0
        if portfolio_ids:
            funds_result = await db.execute(
                "DELETE FROM portfolio_funds WHERE portfolio_id = ANY($1::int[])",
                portfolio_ids
            )
            funds_deleted = int(funds_result.split()[-1]) if funds_result.startswith("DELETE") else 0
        
        # Delete portfolios
        portfolios_deleted = 0
        if portfolio_ids:
            portfolios_result = await db.execute(
                "DELETE FROM portfolios WHERE id = ANY($1::int[])",
                portfolio_ids
            )
            portfolios_deleted = int(portfolios_result.split()[-1]) if portfolios_result.startswith("DELETE") else 0
        
        # Delete products
        products_deleted = 0
        if product_ids:
            products_result = await db.execute(
                "DELETE FROM client_products WHERE id = ANY($1::int[])",
                product_ids
            )
            products_deleted = int(products_result.split()[-1]) if products_result.startswith("DELETE") else 0

        return {
            "message": f"Successfully deleted data for client group {client_group_id}",
            "deleted_products": products_deleted,
            "deleted_portfolios": portfolios_deleted,
            "deleted_portfolio_funds": funds_deleted,
            "deleted_valuations": valuations_deleted,
            "deleted_irr_values": irr_values_deleted,
            "deleted_activity_logs": activity_logs_deleted
        }
    except Exception as e:
        logger.error(f"Error deleting client group products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete client group products: {str(e)}")

@router.get("/client_group_fum_summary", response_model=List[dict])
async def get_client_group_fum_summary(db = Depends(get_db)):
    """
    What it does: Calculates funds under management (FUM) per client group on-demand.
    Why it's needed: Provides aggregated financial metrics for each client group for reporting.
    How it works:
        1. Gets all active client groups
        2. For each client group, calculates FUM by summing current portfolio values
        3. Returns combined dataset with client group info and calculated FUM
    Expected output: A JSON array with client group info and their total FUM value
    """
    try:
        # Fetch active client groups
        client_groups_result = await db.fetch("SELECT * FROM client_groups WHERE status = 'active'")
        
        if not client_groups_result:
            return []
        
        combined_data = []
        
        for client_group in client_groups_result:
            client_group_dict = dict(client_group)
            client_group_id = client_group_dict["id"]
            
            # Calculate FUM for this client group
            # Get all active products for this client group
            products_result = await db.fetch(
                "SELECT id, portfolio_id FROM client_products WHERE client_id = $1 AND status = 'active'",
                client_group_id
            )
            
            total_fum = 0.0
            
            if products_result:
                # Get portfolio IDs
                portfolio_ids = [p["portfolio_id"] for p in products_result if p["portfolio_id"]]
                
                if portfolio_ids:
                    # Calculate FUM by summing fund valuations directly
                    # Get all active funds for these portfolios
                    funds_result = await db.fetch(
                        "SELECT id FROM portfolio_funds WHERE portfolio_id = ANY($1::int[]) AND status = 'active'",
                        portfolio_ids
                    )
                    
                    if funds_result:
                        fund_ids = [fund["id"] for fund in funds_result]
                        
                        # Get the latest valuation for each fund (using window function for efficiency)
                        fund_valuations = await db.fetch("""
                            SELECT DISTINCT ON (portfolio_fund_id) portfolio_fund_id, valuation
                            FROM portfolio_fund_valuations 
                            WHERE portfolio_fund_id = ANY($1::int[])
                            ORDER BY portfolio_fund_id, valuation_date DESC
                        """, fund_ids)
                        
                        for fund_val in fund_valuations:
                            total_fum += float(fund_val["valuation"] or 0)
            
            # Combine the data  
            combined_record = {
                "client_group_id": client_group_id,
                "fum": total_fum,
                **client_group_dict  # Add all client group fields
            }
            combined_data.append(combined_record)
        
        logger.info(f"Calculated FUM for {len(combined_data)} client groups")
        return combined_data
        
    except Exception as e:
        logger.error(f"Error calculating client group FUM summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") 