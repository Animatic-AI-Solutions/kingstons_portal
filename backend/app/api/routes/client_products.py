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
        3. Separately fetches provider data, client data, and template data
        4. Combines the data in Python 
        5. Returns the data as a list of Clientproduct objects
    Expected output: A JSON array of client product objects with all their details including provider theme colors and template info
    """
    try:
        # Build the base query for client_products
        query = db.table("client_products").select("*")
        
        # Apply filters if provided
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
            
        # Get the client products with pagination
        result = query.range(skip_val, skip_val + limit_val - 1).execute()
        client_products = result.data
        
        # Fetch all needed providers and clients in bulk
        provider_ids = [p.get("provider_id") for p in client_products if p.get("provider_id") is not None]
        client_ids = [p.get("client_id") for p in client_products if p.get("client_id") is not None]
        portfolio_ids = [p.get("portfolio_id") for p in client_products if p.get("portfolio_id") is not None]
        
        # Only fetch providers if we have provider IDs
        providers_map = {}
        if provider_ids:
            providers_result = db.table("available_providers").select("*").in_("id", provider_ids).execute()
            # Create a lookup map of provider data by ID
            providers_map = {p.get("id"): p for p in providers_result.data}
            
        # Only fetch clients if we have client IDs
        clients_map = {}
        if client_ids:
            clients_result = db.table("clients").select("*").in_("id", client_ids).execute()
            # Create a lookup map of client data by ID
            clients_map = {c.get("id"): c for c in clients_result.data}
        
        # Fetch portfolio information to get template info
        portfolios_map = {}
        template_ids = set()
        if portfolio_ids:
            portfolios_result = db.table("portfolios").select("*").in_("id", portfolio_ids).execute()
            if portfolios_result.data:
                portfolios_map = {p.get("id"): p for p in portfolios_result.data}
                # Collect all template IDs to fetch in bulk
                template_ids = {p.get("original_template_id") for p in portfolios_result.data 
                              if p.get("original_template_id") is not None}
        
        # Fetch all needed templates in bulk
        templates_map = {}
        if template_ids:
            templates_result = db.table("available_portfolios").select("*").in_("id", list(template_ids)).execute()
            if templates_result.data:
                templates_map = {t.get("id"): t for t in templates_result.data}
        
        # Enhance the response data with provider, client, and template information
        enhanced_data = []
        for product in client_products:
            # Add provider data if available
            provider_id = product.get("provider_id")
            if provider_id and provider_id in providers_map:
                provider = providers_map[provider_id]
                product["provider_name"] = provider.get("name")
                product["provider_theme_color"] = provider.get("theme_color")
            
            # Add client name if available
            client_id = product.get("client_id")
            if client_id and client_id in clients_map:
                client = clients_map[client_id]
                forname = client.get("forname", "")
                surname = client.get("surname", "")
                product["client_name"] = f"{forname} {surname}".strip()
            
            # Add portfolio and template info if available
            portfolio_id = product.get("portfolio_id")
            if portfolio_id and portfolio_id in portfolios_map:
                portfolio = portfolios_map[portfolio_id]
                original_template_id = portfolio.get("original_template_id")
                if original_template_id and original_template_id in templates_map:
                    template = templates_map[original_template_id]
                    product["original_template_id"] = original_template_id
                    product["original_template_name"] = template.get("name")
                    product["template_info"] = template
            
            enhanced_data.append(product)
            
        logger.info(f"Retrieved {len(enhanced_data)} client products with provider data and template info")
        
        # Log the first few products for debugging purposes
        if enhanced_data and len(enhanced_data) > 0:
            sample = enhanced_data[0]
            logger.info(f"Sample product data: id={sample.get('id')}, provider_name={sample.get('provider_name')}, theme_color={sample.get('provider_theme_color')}")
        
        return enhanced_data
    except Exception as e:
        logger.error(f"Error fetching client products: {str(e)}")
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
        2. Queries the 'client_products' table for the main record
        3. Makes separate queries to get client, provider, and portfolio information
        4. If the portfolio has a template, adds the template info
        5. Combines all data and returns it
    Expected output: A JSON object containing the requested client product's details including provider theme color and template info
    """
    try:
        # Query the client_product by ID
        result = db.table("client_products").select("*").eq("id", client_product_id).execute()
            
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client product with ID {client_product_id} not found")

        client_product = result.data[0]
        
        # Fetch provider data if available
        provider_id = client_product.get("provider_id")
        if provider_id:
            provider_result = db.table("available_providers").select("*").eq("id", provider_id).execute()
            if provider_result.data and len(provider_result.data) > 0:
                provider = provider_result.data[0]
                client_product["provider_name"] = provider.get("name")
                client_product["provider_theme_color"] = provider.get("theme_color")
                logger.info(f"Added provider data: {provider.get('name')} with theme color: {provider.get('theme_color')}")
        
        # Fetch client data if available
        client_id = client_product.get("client_id")
        if client_id:
            client_result = db.table("clients").select("*").eq("id", client_id).execute()
            if client_result.data and len(client_result.data) > 0:
                client = client_result.data[0]
                forname = client.get("forname", "")
                surname = client.get("surname", "")
                client_product["client_name"] = f"{forname} {surname}".strip()
                logger.info(f"Added client name: {client_product['client_name']}")
        
        # Fetch portfolio information if available
        portfolio_id = client_product.get("portfolio_id")
        if portfolio_id:
            portfolio_result = db.table("portfolios").select("*").eq("id", portfolio_id).execute()
            if portfolio_result.data and len(portfolio_result.data) > 0:
                portfolio = portfolio_result.data[0]
                
                # Check if portfolio was created from a template
                original_template_id = portfolio.get("original_template_id")
                if original_template_id:
                    # Set the original_template_id on the client_product
                    client_product["original_template_id"] = original_template_id
                    
                    # Fetch template details
                    template_result = db.table("available_portfolios").select("*").eq("id", original_template_id).execute()
                    if template_result.data and len(template_result.data) > 0:
                        template = template_result.data[0]
                        client_product["original_template_name"] = template.get("name")
                        client_product["template_info"] = template
                        logger.info(f"Added template info: {template.get('name')} (ID: {original_template_id})")
        
        logger.info(f"Retrieved client product {client_product_id} with provider theme color: {client_product.get('provider_theme_color')}")
        
        return client_product
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client product: {str(e)}")
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
        4. Validates that referenced client_id exists if provided
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
        2. Gets the portfolio_id directly from the client product
        3. For the linked portfolio:
           a. Gets all portfolio_funds for this portfolio
           b. For each portfolio fund:
              - Deletes all IRR values associated with the fund first (to remove foreign key dependency)
              - Deletes all fund_valuations associated with the fund
              - Deletes all holding_activity_log entries associated with the fund
           c. Deletes all portfolio_funds for this portfolio
        4. Deletes the client product record
        5. Deletes the portfolio itself
        6. Returns a success message with deletion counts
    Expected output: A JSON object with a success message confirmation and deletion counts
    """
    try:
        # Check if client product exists
        check_result = db.table("client_products").select("*").eq("id", client_product_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client product with ID {client_product_id} not found")
        
        client_product = check_result.data[0]
        portfolio_id = client_product.get("portfolio_id")
        
        logger.info(f"Deleting client product with ID {client_product_id} and all associated records")
        
        # Initialize counters for deleted records
        portfolio_funds_deleted = 0
        fund_valuations_deleted = 0
        irr_values_deleted = 0
        activity_logs_deleted = 0
        
        # Process the portfolio if it exists
        if portfolio_id:
            logger.info(f"Processing portfolio with ID {portfolio_id}")
            
            # Get all portfolio funds for this portfolio
            portfolio_funds = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_id).execute()
            
            if portfolio_funds.data and len(portfolio_funds.data) > 0:
                portfolio_funds_count = len(portfolio_funds.data)
                portfolio_funds_deleted = portfolio_funds_count
                
                # Process each portfolio fund
                for fund in portfolio_funds.data:
                    fund_id = fund["id"]
                    
                    # First, delete IRR values for this fund (IMPORTANT: do this BEFORE deleting fund_valuations)
                    irr_result = db.table("irr_values").delete().eq("fund_id", fund_id).execute()
                    deleted_count = len(irr_result.data) if irr_result.data else 0
                    irr_values_deleted += deleted_count
                    logger.info(f"Deleted {deleted_count} IRR values for portfolio fund {fund_id}")
                    
                    # Also delete IRR values for any fund valuations related to this fund
                    # Get all fund valuation IDs for this fund
                    fund_valuation_ids_result = db.table("fund_valuations").select("id").eq("portfolio_fund_id", fund_id).execute()
                    if fund_valuation_ids_result.data and len(fund_valuation_ids_result.data) > 0:
                        valuation_ids = [v["id"] for v in fund_valuation_ids_result.data]
                        # Delete IRR values referencing these fund valuation IDs
                        for val_id in valuation_ids:
                            val_irr_result = db.table("irr_values").delete().eq("fund_valuation_id", val_id).execute()
                            deleted_count = len(val_irr_result.data) if val_irr_result.data else 0
                            irr_values_deleted += deleted_count
                            logger.info(f"Deleted {deleted_count} IRR values for fund valuation {val_id}")
                    
                    # Now it's safe to delete fund valuations for this fund
                    fund_val_result = db.table("fund_valuations").delete().eq("portfolio_fund_id", fund_id).execute()
                    deleted_count = len(fund_val_result.data) if fund_val_result.data else 0
                    fund_valuations_deleted += deleted_count
                    logger.info(f"Deleted {deleted_count} fund valuations for portfolio fund {fund_id}")
                    
                    # Delete activity logs for this fund
                    activity_result = db.table("holding_activity_log").delete().eq("portfolio_fund_id", fund_id).execute()
                    deleted_count = len(activity_result.data) if activity_result.data else 0
                    activity_logs_deleted += deleted_count
                    logger.info(f"Deleted {deleted_count} activity logs for portfolio fund {fund_id}")
                
                # Delete all portfolio funds for this portfolio
                db.table("portfolio_funds").delete().eq("portfolio_id", portfolio_id).execute()
                logger.info(f"Deleted {portfolio_funds_count} portfolio funds for portfolio {portfolio_id}")
        
        # Delete the client product
        result = db.table("client_products").delete().eq("id", client_product_id).execute()
        logger.info(f"Deleted client product {client_product_id}")
        
        # Now it's safe to delete the portfolio
        if portfolio_id:
            db.table("portfolios").delete().eq("id", portfolio_id).execute()
            logger.info(f"Deleted portfolio {portfolio_id}")
        
        return {
            "message": f"Client product with ID {client_product_id} and all associated records deleted successfully",
            "details": {
                "portfolio_deleted": 1 if portfolio_id else 0,
                "portfolio_funds_deleted": portfolio_funds_deleted,
                "fund_valuations_deleted": fund_valuations_deleted,
                "irr_values_deleted": irr_values_deleted,
                "activity_logs_deleted": activity_logs_deleted
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client product and associated records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
