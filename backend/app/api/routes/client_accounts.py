from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from datetime import date

from app.models.client_account import ClientAccount, ClientAccountCreate, ClientAccountUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/client_accounts", response_model=List[ClientAccount])
async def get_client_accounts(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    client_id: Optional[int] = None,
    available_products_id: Optional[int] = None,
    status: Optional[str] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of client accounts with optional filtering.
    Why it's needed: Provides a way to view client accounts in the system.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'client_accounts' table with optional filters
        3. Applies pagination parameters to limit result size
        4. Returns the data as a list of ClientAccount objects
    Expected output: A JSON array of client account objects with all their details
    """
    try:
        query = db.table("client_accounts").select("*")
        
        if client_id is not None:
            query = query.eq("client_id", client_id)
            
        if available_products_id is not None:
            query = query.eq("available_products_id", available_products_id)
            
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

@router.post("/client_accounts", response_model=ClientAccount)
async def create_client_account(client_account: ClientAccountCreate, db = Depends(get_db)):
    """
    What it does: Creates a new client account in the database.
    Why it's needed: Allows users to create new accounts for clients.
    How it works:
        1. Validates the input data
        2. Inserts the new account into the database
        3. Creates a portfolio for the account if none is specified
        4. Returns the created account
    Expected output: The newly created client account object
    """
    try:
        # Set default weighting to 0 if not provided
        if client_account.weighting is None:
            client_account.weighting = 0

        # Ensure start_date is today's date if not provided
        today = date.today()
        start_date_iso = client_account.start_date.isoformat() if client_account.start_date else today.isoformat()

        # Log all request data for debugging
        logger.info(f"Creating client account with client_id={client_account.client_id}, product_id={client_account.available_products_id}")
        logger.info(f"Skip portfolio creation flag: {client_account.skip_portfolio_creation}")
        logger.info(f"Full client account data: {client_account}")
        
        # Create the account
        created_account = db.table("client_accounts").insert({
            "client_id": client_account.client_id,
            "available_products_id": client_account.available_products_id,
            "account_name": client_account.account_name,
            "status": client_account.status,
            "start_date": start_date_iso,
            "weighting": client_account.weighting
        }).execute()
        
        if not created_account.data or len(created_account.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create client account")
            
        created_account = created_account.data[0]
        logger.info(f"Successfully created client account with ID {created_account['id']}")
        
        # Check if we should skip portfolio creation (when frontend is handling it)
        skip_portfolio = getattr(client_account, 'skip_portfolio_creation', False)
        logger.info(f"Retrieved skip_portfolio_creation value: {skip_portfolio}")
        
        if skip_portfolio:
            logger.info(f"Skipping portfolio creation for account {created_account['id']} as requested by frontend")
            return created_account
            
        # Check if there's already an account_holding for this client_account
        existing_holding = db.table("account_holdings")\
            .select("*")\
            .eq("client_account_id", created_account["id"])\
            .eq("status", "active")\
            .execute()
            
        if existing_holding.data and len(existing_holding.data) > 0:
            logger.info(f"Portfolio already assigned to account {created_account['id']} via account_holdings - skipping portfolio creation")
            return created_account
                
        # Create portfolio for account
        logger.info(f"Creating portfolio for account {created_account['id']}")
        
        # Determine a default portfolio name
        portfolio_name = f"Portfolio for {created_account['account_name'] if created_account['account_name'] else 'Account ' + str(created_account['id'])}"
        
        portfolio = db.table("portfolios").insert({
            "portfolio_name": portfolio_name,
            "status": "active",
            "start_date": start_date_iso,
        }).execute()
        
        if not portfolio.data or len(portfolio.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create portfolio for client account")
            
        portfolio = portfolio.data[0]
        logger.info(f"Successfully created portfolio with ID {portfolio['id']} for account {created_account['id']}")
        
        # Create account_holding to link account and portfolio
        account_holding = db.table("account_holdings").insert({
                    "client_account_id": created_account["id"],
                    "portfolio_id": portfolio["id"],
                    "status": "active",
            "start_date": start_date_iso,
        }).execute()
        
        if not account_holding.data or len(account_holding.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create account holding")
            
        logger.info(f"Successfully created account holding for account {created_account['id']} and portfolio {portfolio['id']}")
        
        # Check for and remove any duplicate portfolios for this account before returning
        # This is a safeguard against potential duplicate portfolio creation
        all_holdings = db.table("account_holdings")\
            .select("portfolio_id")\
            .eq("client_account_id", created_account["id"])\
            .execute()
            
        if all_holdings.data and len(all_holdings.data) > 1:
            logger.warning(f"Found multiple portfolios for account {created_account['id']} - cleaning up duplicates")
            
            # Keep only one portfolio (the one that was created first)
            portfolios_to_check = [h["portfolio_id"] for h in all_holdings.data]
            
            # Get portfolio creation dates
            portfolios_info = db.table("portfolios")\
                .select("id, created_at")\
                .in_("id", portfolios_to_check)\
                .order("created_at")\
                .execute()
            
            if len(portfolios_info.data) > 1:
                # Keep the first portfolio, delete all others
                portfolio_to_keep = portfolios_info.data[0]["id"]
                portfolios_to_delete = [p["id"] for p in portfolios_info.data[1:]]
                
                logger.info(f"Keeping portfolio {portfolio_to_keep}, deleting portfolios {portfolios_to_delete}")
                
                # Delete the extra account_holdings
                for port_id in portfolios_to_delete:
                    db.table("account_holdings")\
                        .delete()\
                        .eq("client_account_id", created_account["id"])\
                        .eq("portfolio_id", port_id)\
                        .execute()
                        
                    # Delete the extra portfolios
                    db.table("portfolios")\
                        .delete()\
                        .eq("id", port_id)\
                        .execute()
            
        return created_account
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating client account: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/client_accounts/{client_account_id}", response_model=ClientAccount)
async def get_client_account(client_account_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single client account by ID with additional related information.
    Why it's needed: Allows viewing detailed information about a specific client account.
    How it works:
        1. Takes the client_account_id from the URL path
        2. Queries the 'client_accounts' table for a record with matching ID
        3. Fetches related client, product, provider, and portfolio information
        4. Returns the enriched account data or raises a 404 error if not found
    Expected output: A JSON object containing the requested client account's details with related information
    """
    try:
        # Get account details
        result = db.table("client_accounts").select("*").eq("id", client_account_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client account with ID {client_account_id} not found")
        
        account = result.data[0]
        
        # Get client information
        client_result = db.table("clients").select("*").eq("id", account["client_id"]).execute()
        if client_result.data and len(client_result.data) > 0:
            client = client_result.data[0]
            account["client_name"] = client.get("name", "Unknown Client")
            account["client_email"] = client.get("email", "")
            account["client_phone"] = client.get("phone", "")
        
        # Get product information
        product_result = db.table("available_products").select("*").eq("id", account["available_products_id"]).execute()
        if product_result.data and len(product_result.data) > 0:
            product = product_result.data[0]
            account["product_name"] = product.get("product_name", "Unknown Product")
            account["product_type"] = product.get("product_type", "Unknown Type")
            
            # Get provider information
            if product.get("available_providers_id"):
                provider_result = db.table("available_providers").select("*").eq("id", product["available_providers_id"]).execute()
                if provider_result.data and len(provider_result.data) > 0:
                    provider = provider_result.data[0]
                    account["provider_name"] = provider.get("name", "Unknown Provider")
                    account["provider_code"] = provider.get("provider_code", "")
        
        # Get current portfolio information through account_holdings
        holding_result = db.table("account_holdings")\
            .select("portfolio_id, start_date")\
            .eq("client_account_id", client_account_id)\
            .eq("status", "active")\
            .order("start_date", desc=True)\
            .limit(1)\
            .execute()
            
        if holding_result.data and len(holding_result.data) > 0 and holding_result.data[0]["portfolio_id"]:
            portfolio_id = holding_result.data[0]["portfolio_id"]
            portfolio_result = db.table("portfolios").select("*").eq("id", portfolio_id).execute()
            
            if portfolio_result.data and len(portfolio_result.data) > 0:
                portfolio = portfolio_result.data[0]
                account["current_portfolio"] = {
                    "id": portfolio["id"],
                    "portfolio_name": portfolio.get("portfolio_name", "Unknown Portfolio"),
                    "assignment_start_date": holding_result.data[0]["start_date"] or account["start_date"]
                }
                
                # Get portfolio funds and their details
                portfolio_funds_result = db.table("portfolio_funds")\
                    .select("*")\
                    .eq("portfolio_id", portfolio_id)\
                    .execute()
                    
                if portfolio_funds_result.data and len(portfolio_funds_result.data) > 0:
                    # Get fund details for each portfolio fund
                    for pf in portfolio_funds_result.data:
                        fund_result = db.table("available_funds")\
                            .select("*")\
                            .eq("id", pf["available_funds_id"])\
                            .execute()
                            
                        if fund_result.data and len(fund_result.data) > 0:
                            fund = fund_result.data[0]
                            pf["fund_name"] = fund.get("fund_name", "Unknown Fund")
                            pf["isin_number"] = fund.get("isin_number", "")
                            pf["risk_factor"] = fund.get("risk_factor", 0)
                            pf["fund_cost"] = fund.get("fund_cost", 0)
                    
                    account["portfolio_funds"] = portfolio_funds_result.data
            
        return account
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client account: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/client_accounts/{client_account_id}", response_model=ClientAccount)
async def update_client_account(client_account_id: int, client_account_update: ClientAccountUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing client account's information.
    Why it's needed: Allows modifying client account details when they change.
    How it works:
        1. Validates the update data using the ClientAccountUpdate model
        2. Removes any None values from the input (fields that aren't being updated)
        3. Verifies the client account exists
        4. Validates that referenced client_id and available_products_id exist if provided
        5. Updates only the provided fields in the database
        6. Returns the updated client account information
    Expected output: A JSON object containing the updated client account's details
    """
    # Remove None values from the update data
    update_data = {k: v for k, v in client_account_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update data provided")
    
    try:
        # Check if client account exists
        check_result = db.table("client_accounts").select("id").eq("id", client_account_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client account with ID {client_account_id} not found")
        
        # Validate client_id if provided
        if "client_id" in update_data and update_data["client_id"] is not None:
            client_check = db.table("clients").select("id").eq("id", update_data["client_id"]).execute()
            if not client_check.data or len(client_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Client with ID {update_data['client_id']} not found")
        
        # Validate available_products_id if provided
        if "available_products_id" in update_data and update_data["available_products_id"] is not None:
            product_check = db.table("available_products").select("id").eq("id", update_data["available_products_id"]).execute()
            if not product_check.data or len(product_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Product with ID {update_data['available_products_id']} not found")
        
        # Convert date objects to ISO format strings
        if 'start_date' in update_data and update_data['start_date'] is not None:
            update_data['start_date'] = update_data['start_date'].isoformat()
        
        if 'end_date' in update_data and update_data['end_date'] is not None:
            update_data['end_date'] = update_data['end_date'].isoformat()
        
        # Update the client account
        result = db.table("client_accounts").update(update_data).eq("id", client_account_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update client account")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client account: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/client_accounts/{client_account_id}", response_model=dict)
async def delete_client_account(client_account_id: int, db = Depends(get_db)):
    """
    What it does: Deletes a client account and all its associated records from the database.
    Why it's needed: Allows removing client accounts that are no longer relevant to the business.
    How it works:
        1. Verifies the client account exists
        2. Gets all account_holdings associated with this client account
        3. For each holding, finds associated portfolio and portfolio funds
        4. For each portfolio fund:
           - Deletes all IRR values associated with the fund
           - Deletes all holding activity logs associated with the fund
        5. Deletes all portfolio_funds associated with client-specific portfolios
        6. Deletes the portfolios that were used exclusively by this client
        7. Deletes all account_holdings associated with this client account
        8. Finally deletes the client account record
        9. Returns a success message with deletion counts
    Expected output: A JSON object with a success message confirmation and deletion counts
    """
    try:
        # Check if client account exists
        check_result = db.table("client_accounts").select("id").eq("id", client_account_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client account with ID {client_account_id} not found")
        
        logger.info(f"Deleting client account with ID {client_account_id} and all associated records")
        
        # Initialize counters for deleted records
        holdings_deleted = 0
        activity_logs_deleted = 0
        portfolio_funds_deleted = 0
        irr_values_deleted = 0
        portfolios_deleted = 0
        
        # Get all account_holdings for this client account
        account_holdings = db.table("account_holdings").select("id", "portfolio_id").eq("client_account_id", client_account_id).execute()
        
        # Track portfolios that belong to this client
        client_portfolios = set()
        
        if account_holdings.data and len(account_holdings.data) > 0:
            holdings_deleted = len(account_holdings.data)
            
            for holding in account_holdings.data:
                holding_id = holding["id"]
                portfolio_id = holding.get("portfolio_id")
                
                # Add to client portfolios if exists
                if portfolio_id:
                    client_portfolios.add(portfolio_id)
                
                # Delete activity logs for this holding
                activity_result = db.table("holding_activity_log").delete().eq("account_holding_id", holding_id).execute()
                deleted_count = len(activity_result.data) if activity_result.data else 0
                activity_logs_deleted += deleted_count
                logger.info(f"Deleted {deleted_count} activity logs for holding {holding_id}")
            
            # Delete the holdings
            db.table("account_holdings").delete().eq("client_account_id", client_account_id).execute()
            logger.info(f"Deleted {holdings_deleted} account holdings")
        
        # For each portfolio that might belong to this client
        for portfolio_id in client_portfolios:
            # Check if this portfolio is used by other clients
            other_holdings = db.table("account_holdings")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .neq("client_account_id", client_account_id)\
                .execute()
                
            # If no other clients use this portfolio, we can safely delete it and its funds
            if not other_holdings.data or len(other_holdings.data) == 0:
                # Get all portfolio funds for this portfolio
                portfolio_funds = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_id).execute()
                
                if portfolio_funds.data:
                    portfolio_funds_count = len(portfolio_funds.data)
                    portfolio_funds_deleted += portfolio_funds_count
                    
                    # Process each portfolio fund
                    for fund in portfolio_funds.data:
                        fund_id = fund["id"]
                        
                        # Delete IRR values for this fund
                        irr_result = db.table("irr_values").delete().eq("fund_id", fund_id).execute()
                        deleted_count = len(irr_result.data) if irr_result.data else 0
                        irr_values_deleted += deleted_count
                        logger.info(f"Deleted {deleted_count} IRR values for portfolio fund {fund_id}")
                        
                        # Delete remaining activity logs for this fund (those not tied to this client's holdings)
                        activity_result = db.table("holding_activity_log").delete().eq("portfolio_fund_id", fund_id).execute()
                        deleted_count = len(activity_result.data) if activity_result.data else 0
                        activity_logs_deleted += deleted_count
                        logger.info(f"Deleted {deleted_count} additional activity logs for portfolio fund {fund_id}")
                    
                    # Delete all portfolio funds for this portfolio
                    db.table("portfolio_funds").delete().eq("portfolio_id", portfolio_id).execute()
                    logger.info(f"Deleted {portfolio_funds_count} portfolio funds for portfolio {portfolio_id}")
                
                # Delete the portfolio
                db.table("portfolios").delete().eq("id", portfolio_id).execute()
                portfolios_deleted += 1
                logger.info(f"Deleted portfolio {portfolio_id}")
        
        # Finally, delete the client account
        result = db.table("client_accounts").delete().eq("id", client_account_id).execute()
        
        return {
            "message": f"Client account with ID {client_account_id} and all associated records deleted successfully",
            "details": {
                "holdings_deleted": holdings_deleted,
                "activity_logs_deleted": activity_logs_deleted,
                "portfolio_funds_deleted": portfolio_funds_deleted,
                "irr_values_deleted": irr_values_deleted,
                "portfolios_deleted": portfolios_deleted
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client account and associated records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
