from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from datetime import date

from app.models.client_product import Clientproduct, ClientproductCreate, ClientproductUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/client_products", response_model=List[Clientproduct])
async def get_client_products(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    client_id: Optional[int] = None,
    status: Optional[str] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of client products with optional filtering.
    Why it's needed: Provides a way to view client products in the system.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to the 'client_products' table with optional filters
        3. Applies pagination parameters to limit result size
        4. Returns the data as a list of Clientproduct objects
    Expected output: A JSON array of client product objects with all their details
    """
    try:
        query = db.table("client_products").select("*")
        
        if client_id is not None:
            query = query.eq("client_id", client_id)
            
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
        
        # Enhance the response with provider information including theme color
        enhanced_data = []
        for product in result.data:
            if product.get("provider_id"):
                provider_result = db.table("available_providers")\
                    .select("name", "theme_color")\
                    .eq("id", product.get("provider_id"))\
                    .execute()
                if provider_result.data and len(provider_result.data) > 0:
                    product["provider_name"] = provider_result.data[0].get("name")
                    product["provider_theme_color"] = provider_result.data[0].get("theme_color")
            enhanced_data.append(product)
            
        return enhanced_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/client_products", response_model=Clientproduct)
async def create_client_product(client_product: ClientproductCreate, db = Depends(get_db)):
    """
    What it does: Creates a new client product in the database.
    Why it's needed: Allows users to create new products for clients.
    How it works:
        1. Validates the input data
        2. Inserts the new product into the database
        3. Creates a portfolio for the product if none is specified
        4. Returns the created product
    Expected output: The newly created client product object
    """
    try:
        # Set default weighting to 0 if not provided
        if client_product.weighting is None:
            client_product.weighting = 0

        # Ensure start_date is today's date if not provided
        today = date.today()
        start_date_iso = client_product.start_date.isoformat() if client_product.start_date else today.isoformat()

        # Log all request data for debugging
        logger.info(f"Creating client product with client_id={client_product.client_id}")
        logger.info(f"Skip portfolio creation flag: {client_product.skip_portfolio_creation}")
        logger.info(f"Portfolio ID provided: {client_product.portfolio_id}")
        logger.info(f"Full client product data: {client_product}")
        
        # Create product data dictionary
        product_data = {
            "client_id": client_product.client_id,
            "product_name": client_product.product_name,
            "status": client_product.status,
            "start_date": start_date_iso,
            "weighting": client_product.weighting,
            "plan_number": client_product.plan_number,
            "provider_id": client_product.provider_id,
            "product_type": client_product.product_type
        }
        
        # Add portfolio_id if it exists
        if client_product.portfolio_id:
            # Verify the portfolio exists
            portfolio_check = db.table("portfolios").select("id").eq("id", client_product.portfolio_id).execute()
            if not portfolio_check.data or len(portfolio_check.data) == 0:
                raise HTTPException(status_code=404, detail=f"Portfolio with ID {client_product.portfolio_id} not found")
                
            # Add portfolio_id to the product data
            product_data["portfolio_id"] = client_product.portfolio_id
            logger.info(f"Using provided portfolio_id {client_product.portfolio_id}")
        
        # Create the client product
        created_product = db.table("client_products").insert(product_data).execute()
        
        if not created_product.data or len(created_product.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create client product")
            
        created_product = created_product.data[0]
        logger.info(f"Successfully created client product with ID {created_product['id']}")
        
        # Check if we should skip portfolio creation (when frontend is handling it)
        skip_portfolio = getattr(client_product, 'skip_portfolio_creation', False)
        logger.info(f"Retrieved skip_portfolio_creation value: {skip_portfolio}")
        
        # If portfolio_id was provided or we should skip portfolio creation, return the product now
        if client_product.portfolio_id or skip_portfolio:
            return created_product
        
        # Auto-create a portfolio if none was provided
        logger.info(f"No portfolio_id provided - creating default portfolio for product {created_product['id']}")
        
        # Determine a default portfolio name
        portfolio_name = f"Portfolio for {created_product['product_name'] if created_product['product_name'] else 'product ' + str(created_product['id'])}"
        
        portfolio = db.table("portfolios").insert({
            "portfolio_name": portfolio_name,
            "status": "active",
            "start_date": start_date_iso,
        }).execute()
        
        if not portfolio.data or len(portfolio.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create portfolio for client product")
            
        portfolio = portfolio.data[0]
        logger.info(f"Successfully created portfolio with ID {portfolio['id']} for product {created_product['id']}")
        
        # Update the client_product with the new portfolio_id
        updated_product = db.table("client_products").update({
            "portfolio_id": portfolio["id"]
        }).eq("id", created_product["id"]).execute()
        
        if not updated_product.data or len(updated_product.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to update client product with portfolio ID")
            
        logger.info(f"Successfully updated product {created_product['id']} with portfolio_id {portfolio['id']}")
        
        # Return the updated product
        return updated_product.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating client product: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/client_products/{client_product_id}", response_model=Clientproduct)
async def get_client_product(client_product_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single client product by ID.
    Why it's needed: Allows viewing detailed information about a specific client product.
    How it works:
        1. Takes the client_product_id from the URL path
        2. Queries the 'client_products' table for a record with matching ID
        3. Enhances the response with portfolio information if available
        4. Returns the client product data or raises a 404 error if not found
    Expected output: A JSON object containing the requested client product's details
    """
    try:
        result = db.table("client_products").select("*").eq("id", client_product_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client product with ID {client_product_id} not found")

        client_product = result.data[0]
        
        # Get additional client information for context
        client_result = db.table("clients").select("name").eq("id", client_product.get("client_id")).execute()
        if client_result.data and len(client_result.data) > 0:
            client_product["client_name"] = client_result.data[0].get("name")
        
        # Get provider information if available
        if client_product.get("provider_id"):
            provider_result = db.table("available_providers").select("name", "theme_color").eq("id", client_product.get("provider_id")).execute()
            if provider_result.data and len(provider_result.data) > 0:
                client_product["provider_name"] = provider_result.data[0].get("name")
                client_product["provider_theme_color"] = provider_result.data[0].get("theme_color")
        
        # Get portfolio information if available via direct link
        if client_product.get("portfolio_id"):
            portfolio_result = db.table("portfolios").select("*").eq("id", client_product.get("portfolio_id")).execute()
            if portfolio_result.data and len(portfolio_result.data) > 0:
                client_product["current_portfolio"] = {
                    "id": portfolio_result.data[0].get("id"),
                    "portfolio_name": portfolio_result.data[0].get("portfolio_name"),
                    "assignment_start_date": client_product.get("start_date")
                }
        # Backward compatibility - check for product_holdings if no direct portfolio_id is set
        else:
            holding_result = db.table("product_holdings")\
                .select("*")\
                .eq("client_product_id", client_product_id)\
                .eq("status", "active")\
                .is_("end_date", "null")\
                .execute()
            
            if holding_result.data and len(holding_result.data) > 0:
                holding = holding_result.data[0]
                portfolio_result = db.table("portfolios")\
                    .select("*")\
                    .eq("id", holding.get("portfolio_id"))\
                    .execute()
                
                if portfolio_result.data and len(portfolio_result.data) > 0:
                    client_product["current_portfolio"] = {
                        "id": portfolio_result.data[0].get("id"),
                        "portfolio_name": portfolio_result.data[0].get("portfolio_name"),
                        "assignment_start_date": holding.get("start_date")
                    }
                    
                    # Update the client_product with the portfolio_id for future reference
                    db.table("client_products")\
                        .update({"portfolio_id": holding.get("portfolio_id")})\
                        .eq("id", client_product_id)\
                        .execute()
        
        return client_product
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/client_products/{client_product_id}", response_model=Clientproduct)
async def update_client_product(client_product_id: int, client_product_update: ClientproductUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing client product's information.
    Why it's needed: Allows modifying client product details when they change.
    How it works:
        1. Validates the update data using the ClientproductUpdate model
        2. Removes any None values from the input (fields that aren't being updated)
        3. Verifies the client product exists
        4. Validates that referenced client_id and available_products_id exist if provided
        5. Updates only the provided fields in the database
        6. Returns the updated client product information
    Expected output: A JSON object containing the updated client product's details
    """
    # Remove None values from the update data
    update_data = {k: v for k, v in client_product_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update data provided")
    
    try:
        # Check if client product exists
        check_result = db.table("client_products").select("id").eq("id", client_product_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client product with ID {client_product_id} not found")
        
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
        
        # Update the client product
        result = db.table("client_products").update(update_data).eq("id", client_product_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        raise HTTPException(status_code=400, detail="Failed to update client product")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/client_products/{client_product_id}", response_model=dict)
async def delete_client_product(client_product_id: int, db = Depends(get_db)):
    """
    What it does: Deletes a client product and all its associated records from the database.
    Why it's needed: Allows removing client products that are no longer relevant to the business.
    How it works:
        1. Verifies the client product exists
        2. Gets all product_holdings associated with this client product
        3. For each holding, finds associated portfolio and portfolio funds
        4. For each portfolio fund:
           - Deletes all IRR values associated with the fund
           - Deletes all holding activity logs associated with the fund
        5. Deletes all portfolio_funds associated with client-specific portfolios
        6. Deletes the portfolios that were used exclusively by this client
        7. Deletes all product_holdings associated with this client product
        8. Finally deletes the client product record
        9. Returns a success message with deletion counts
    Expected output: A JSON object with a success message confirmation and deletion counts
    """
    try:
        # Check if client product exists
        check_result = db.table("client_products").select("id").eq("id", client_product_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client product with ID {client_product_id} not found")
        
        logger.info(f"Deleting client product with ID {client_product_id} and all associated records")
        
        # Initialize counters for deleted records
        holdings_deleted = 0
        activity_logs_deleted = 0
        portfolio_funds_deleted = 0
        irr_values_deleted = 0
        portfolios_deleted = 0
        
        # Get all product_holdings for this client product
        product_holdings = db.table("product_holdings").select("id", "portfolio_id").eq("client_product_id", client_product_id).execute()
        
        # Track portfolios that belong to this client
        client_portfolios = set()
        
        if product_holdings.data and len(product_holdings.data) > 0:
            holdings_deleted = len(product_holdings.data)
            
            for holding in product_holdings.data:
                holding_id = holding["id"]
                portfolio_id = holding.get("portfolio_id")
                
                # Add to client portfolios if exists
                if portfolio_id:
                    client_portfolios.add(portfolio_id)
                
                # Delete activity logs for this holding
                activity_result = db.table("holding_activity_log").delete().eq("product_holding_id", holding_id).execute()
                deleted_count = len(activity_result.data) if activity_result.data else 0
                activity_logs_deleted += deleted_count
                logger.info(f"Deleted {deleted_count} activity logs for holding {holding_id}")
            
            # Delete the holdings
            db.table("product_holdings").delete().eq("client_product_id", client_product_id).execute()
            logger.info(f"Deleted {holdings_deleted} product holdings")
        
        # For each portfolio that might belong to this client
        for portfolio_id in client_portfolios:
            # Check if this portfolio is used by other clients
            other_holdings = db.table("product_holdings")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .neq("client_product_id", client_product_id)\
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
        
        # Finally, delete the client product
        result = db.table("client_products").delete().eq("id", client_product_id).execute()
        
        return {
            "message": f"Client product with ID {client_product_id} and all associated records deleted successfully",
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
        logger.error(f"Error deleting client product and associated records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
