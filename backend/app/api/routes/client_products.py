from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional
import logging
from datetime import date, datetime

from app.models.client_product import Clientproduct, ClientproductCreate, ClientproductUpdate
from app.db.database import get_db
from app.api.routes.portfolio_funds import calculate_excel_style_irr, calculate_multiple_portfolio_funds_irr

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/client_products_with_owners", response_model=List[dict])
async def get_client_products_with_owners(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    client_id: Optional[int] = None,
    provider_id: Optional[int] = None,
    status: Optional[str] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a paginated list of client products with their owners already populated.
    Why it's needed: Improves frontend performance by eliminating multiple sequential API calls.
    How it works:
        1. Connects to the Supabase database
        2. Builds a query to get client products with filtering
        3. In one operation, fetches related data: providers, clients, templates, portfolios
        4. For each product, fetches its owners in a single batch operation
        5. Returns a complete product list with all related data
    Expected output: A JSON array of client product objects with all their details including owners
    """
    try:
        # Build the base query for client_products
        query = db.table("client_products").select("*")
        
        # Apply filters if provided
        if client_id is not None:
            query = query.eq("client_id", client_id)
            
        if provider_id is not None:
            query = query.eq("provider_id", provider_id)
            
        if status is not None:
            query = query.eq("status", status)
        
        # Get the client products with pagination
        result = query.range(skip, skip + limit - 1).execute()
        client_products = result.data
        
        if not client_products:
            return []
        
        # Fetch all needed providers and clients in bulk
        provider_ids = [p.get("provider_id") for p in client_products if p.get("provider_id") is not None]
        client_ids = [p.get("client_id") for p in client_products if p.get("client_id") is not None]
        portfolio_ids = [p.get("portfolio_id") for p in client_products if p.get("portfolio_id") is not None]
        product_ids = [p.get("id") for p in client_products]
        
        # Fetch all data in parallel using bulk queries
        # Only fetch providers if we have provider IDs
        providers_map = {}
        if provider_ids:
            providers_result = db.table("available_providers").select("*").in_("id", provider_ids).execute()
            # Create a lookup map of provider data by ID
            providers_map = {p.get("id"): p for p in providers_result.data}
            
        # Only fetch clients if we have client IDs
        clients_map = {}
        if client_ids:
            clients_result = db.table("client_groups").select("*").in_("id", client_ids).execute()
            # Create a lookup map of client data by ID
            clients_map = {c.get("id"): c for c in clients_result.data}
        
        # Fetch portfolio information to get template info
        portfolios_map = {}
        template_generation_ids = set()
        if portfolio_ids:
            portfolios_result = db.table("portfolios").select("*").in_("id", portfolio_ids).execute()
            if portfolios_result.data:
                portfolios_map = {p.get("id"): p for p in portfolios_result.data}
                # Collect all template generation IDs to fetch in bulk
                template_generation_ids = {p.get("template_generation_id") for p in portfolios_result.data 
                              if p.get("template_generation_id") is not None}
        
        # Fetch all needed template generations in bulk
        template_generations_map = {}
        if template_generation_ids:
            template_generations_result = db.table("template_portfolio_generations").select("*").in_("id", list(template_generation_ids)).execute()
            if template_generations_result.data:
                template_generations_map = {t.get("id"): t for t in template_generations_result.data}
        
        # Get all product_value_irr_summary data in one bulk query for better performance
        # NOTE: product_value_irr_summary view doesn't exist - calculations are done on-demand
        # Setting default values instead
        
        # Get IRR dates for all products in bulk
        irr_dates_map = {}
        try:
            if portfolio_ids:
                # Get all portfolio funds for all portfolios
                all_portfolio_funds_result = db.table("portfolio_funds").select("id,portfolio_id").in_("portfolio_id", portfolio_ids).execute()
                if all_portfolio_funds_result.data:
                    # Group fund IDs by portfolio ID
                    portfolio_to_funds = {}
                    all_fund_ids = []
                    for pf in all_portfolio_funds_result.data:
                        portfolio_id = pf.get("portfolio_id")
                        fund_id = pf.get("id")
                        if portfolio_id not in portfolio_to_funds:
                            portfolio_to_funds[portfolio_id] = []
                        portfolio_to_funds[portfolio_id].append(fund_id)
                        all_fund_ids.append(fund_id)
                    
                    # Get latest IRR dates for funds that have them for efficient date filtering
                    irr_dates_result = db.table("latest_portfolio_fund_irr_values").select("fund_id,irr_date").in_("fund_id", all_fund_ids).execute()
                    if irr_dates_result.data:
                        # Create a map of fund_id to irr_date
                        fund_to_irr_date = {item.get("fund_id"): item.get("irr_date") for item in irr_dates_result.data if item.get("irr_date")}
                            
                        # For each portfolio, find the most recent IRR date
                        for portfolio_id, fund_ids in portfolio_to_funds.items():
                            portfolio_irr_dates = [fund_to_irr_date.get(fund_id) for fund_id in fund_ids if fund_to_irr_date.get(fund_id)]
                            if portfolio_irr_dates:
                                # Sort dates and get the most recent
                                portfolio_irr_dates.sort(reverse=True)
                                irr_dates_map[portfolio_id] = portfolio_irr_dates[0]
        except Exception as e:
            logger.warning(f"Error fetching IRR dates in bulk: {str(e)}")
        
        # Calculate FUM for each portfolio using latest_portfolio_fund_valuations view
        portfolio_fum_map = {}
        portfolio_irr_map = {}  # Add this to track portfolio IRRs
        try:
            if portfolio_ids:
                # Get latest portfolio IRR for all portfolios
                portfolio_irr_result = db.table("latest_portfolio_irr_values").select("portfolio_id,irr_result").in_("portfolio_id", portfolio_ids).execute()
                
                portfolio_irr_map = {item.get("portfolio_id"): item.get("irr_result") for item in portfolio_irr_result.data}
                
                # Get all portfolio funds for all portfolios
                all_portfolio_funds_result = db.table("portfolio_funds").select("id,portfolio_id").in_("portfolio_id", portfolio_ids).eq("status", "active").execute()
                if all_portfolio_funds_result.data:
                    # Group fund IDs by portfolio ID
                    portfolio_to_funds = {}
                    all_fund_ids = []
                    for pf in all_portfolio_funds_result.data:
                        portfolio_id = pf.get("portfolio_id")
                        fund_id = pf.get("id")
                        if portfolio_id not in portfolio_to_funds:
                            portfolio_to_funds[portfolio_id] = []
                        portfolio_to_funds[portfolio_id].append(fund_id)
                        all_fund_ids.append(fund_id)
                    
                    # Get latest valuations for all funds
                    if all_fund_ids:
                        valuations_result = db.table("latest_portfolio_fund_valuations").select("portfolio_fund_id,valuation").in_("portfolio_fund_id", all_fund_ids).execute()
                        if valuations_result.data:
                            # Create fund_id to value map
                            fund_to_value = {item.get("portfolio_fund_id"): float(item.get("valuation", 0)) for item in valuations_result.data}
                            
                            # Calculate FUM for each portfolio
                            for portfolio_id, fund_ids in portfolio_to_funds.items():
                                portfolio_fum = sum(fund_to_value.get(fund_id, 0) for fund_id in fund_ids)
                                portfolio_fum_map[portfolio_id] = portfolio_fum
        except Exception as e:
            logger.warning(f"Error calculating portfolio FUM and IRR: {str(e)}")
        
        # EFFICIENT PRODUCT OWNER FETCHING - This is the key improvement
        # 1. Get all product_owner_products associations in one query
        product_owner_associations = {}
        try:
            pop_result = db.table("product_owner_products").select("*").in_("product_id", product_ids).execute()
            if pop_result.data:
                # Group by product_id for efficient lookup
                for assoc in pop_result.data:
                    product_id = assoc.get("product_id")
                    if product_id not in product_owner_associations:
                        product_owner_associations[product_id] = []
                    product_owner_associations[product_id].append(assoc.get("product_owner_id"))
        except Exception as e:
            logger.error(f"Error fetching product owner associations: {str(e)}")
        
        # 2. Get all product owner details in one query
        product_owner_ids = []
        for owners in product_owner_associations.values():
            product_owner_ids.extend(owners)
        
        product_owners_map = {}
        if product_owner_ids:
            try:
                owners_result = db.table("product_owners").select("*").in_("id", list(set(product_owner_ids))).execute()
                if owners_result.data:
                    product_owners_map = {owner.get("id"): owner for owner in owners_result.data}
            except Exception as e:
                logger.error(f"Error fetching product owners: {str(e)}")
        
        # Enhance the response data with all related information
        enhanced_products = []
        
        for product in client_products:
            product_id = product.get("id")
            
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
                product["client_name"] = client.get("name", "")
            
            # Add portfolio and template info if available
            portfolio_id = product.get("portfolio_id")
            if portfolio_id and portfolio_id in portfolios_map:
                portfolio = portfolios_map[portfolio_id]
                template_generation_id = portfolio.get("template_generation_id")
                if template_generation_id and template_generation_id in template_generations_map:
                    template = template_generations_map[template_generation_id]
                    product["template_generation_id"] = template_generation_id
                    product["template_info"] = template
            
            # Add total_value and irr from calculated FUM and latest portfolio IRR
            if portfolio_id and portfolio_id in portfolio_fum_map:
                product["total_value"] = portfolio_fum_map[portfolio_id]
            else:
                product["total_value"] = 0
            
            # Use latest portfolio IRR if available
            if portfolio_id and portfolio_id in portfolio_irr_map:
                product["irr"] = portfolio_irr_map[portfolio_id]
            else:
                product["irr"] = "-"  # Display as dash if no portfolio IRR available
                
                # Add IRR date from the bulk-fetched data
                if portfolio_id and portfolio_id in irr_dates_map:
                    product["irr_date"] = irr_dates_map[portfolio_id]
                else:
                    product["irr_date"] = None
            
            # Add product owners - this is the key improvement
            product_owners = []
            if product_id in product_owner_associations:
                owner_ids = product_owner_associations[product_id]
                for owner_id in owner_ids:
                    if owner_id in product_owners_map:
                        product_owners.append(product_owners_map[owner_id])
            
            product["product_owners"] = product_owners
            
            enhanced_products.append(product)
        
        logger.info(f"Retrieved {len(enhanced_products)} client products with all related data including owners")
        
        return enhanced_products
    except Exception as e:
        logger.error(f"Error fetching client products with owners: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/client_products", response_model=List[Clientproduct])
async def get_client_products(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    client_id: Optional[int] = None,
    provider_id: Optional[int] = None,
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
            
        if provider_id is not None:
            query = query.eq("provider_id", provider_id)
            
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
        product_ids = [p.get("id") for p in client_products]
        
        # Only fetch providers if we have provider IDs
        providers_map = {}
        if provider_ids:
            providers_result = db.table("available_providers").select("*").in_("id", provider_ids).execute()
            # Create a lookup map of provider data by ID
            providers_map = {p.get("id"): p for p in providers_result.data}
            
        # Only fetch clients if we have client IDs
        clients_map = {}
        if client_ids:
            clients_result = db.table("client_groups").select("*").in_("id", client_ids).execute()
            # Create a lookup map of client data by ID
            clients_map = {c.get("id"): c for c in clients_result.data}
        
        # Fetch portfolio information to get template info
        portfolios_map = {}
        template_generation_ids = set()
        if portfolio_ids:
            portfolios_result = db.table("portfolios").select("*").in_("id", portfolio_ids).execute()
            if portfolios_result.data:
                portfolios_map = {p.get("id"): p for p in portfolios_result.data}
                # Collect all template generation IDs to fetch in bulk
                template_generation_ids = {p.get("template_generation_id") for p in portfolios_result.data 
                              if p.get("template_generation_id") is not None}
        
        # Fetch all needed template generations in bulk
        template_generations_map = {}
        if template_generation_ids:
            template_generations_result = db.table("template_portfolio_generations").select("*").in_("id", list(template_generation_ids)).execute()
            if template_generations_result.data:
                template_generations_map = {t.get("id"): t for t in template_generations_result.data}
        
        # Get IRR dates for all products in bulk
        irr_dates_map = {}
        try:
            if portfolio_ids:
                # Get all portfolio funds for all portfolios
                all_portfolio_funds_result = db.table("portfolio_funds").select("id,portfolio_id").in_("portfolio_id", portfolio_ids).execute()
                if all_portfolio_funds_result.data:
                    # Group fund IDs by portfolio ID
                    portfolio_to_funds = {}
                    all_fund_ids = []
                    for pf in all_portfolio_funds_result.data:
                        portfolio_id = pf.get("portfolio_id")
                        fund_id = pf.get("id")
                        if portfolio_id not in portfolio_to_funds:
                            portfolio_to_funds[portfolio_id] = []
                        portfolio_to_funds[portfolio_id].append(fund_id)
                        all_fund_ids.append(fund_id)
                    
                    # Get latest IRR dates for funds that have them for efficient date filtering
                    irr_dates_result = db.table("latest_portfolio_fund_irr_values").select("fund_id,irr_date").in_("fund_id", all_fund_ids).execute()
                    if irr_dates_result.data:
                        # Create a map of fund_id to irr_date
                        fund_to_irr_date = {item.get("fund_id"): item.get("irr_date") for item in irr_dates_result.data if item.get("irr_date")}
                            
                        # For each portfolio, find the most recent IRR date
                        for portfolio_id, fund_ids in portfolio_to_funds.items():
                            portfolio_irr_dates = [fund_to_irr_date.get(fund_id) for fund_id in fund_ids if fund_to_irr_date.get(fund_id)]
                            if portfolio_irr_dates:
                                # Sort dates and get the most recent
                                portfolio_irr_dates.sort(reverse=True)
                                irr_dates_map[portfolio_id] = portfolio_irr_dates[0]
        except Exception as e:
            logger.warning(f"Error fetching IRR dates in bulk: {str(e)}")
        
        # Calculate FUM for each portfolio using latest_portfolio_fund_valuations view
        portfolio_fum_map = {}
        portfolio_irr_map = {}  # Add this to track portfolio IRRs
        try:
            if portfolio_ids:
                # Get latest portfolio IRR for all portfolios
                portfolio_irr_result = db.table("latest_portfolio_irr_values").select("portfolio_id,irr_result").in_("portfolio_id", portfolio_ids).execute()
                
                portfolio_irr_map = {item.get("portfolio_id"): item.get("irr_result") for item in portfolio_irr_result.data}
                
                # Get all portfolio funds for all portfolios
                all_portfolio_funds_result = db.table("portfolio_funds").select("id,portfolio_id").in_("portfolio_id", portfolio_ids).eq("status", "active").execute()
                if all_portfolio_funds_result.data:
                    # Group fund IDs by portfolio ID
                    portfolio_to_funds = {}
                    all_fund_ids = []
                    for pf in all_portfolio_funds_result.data:
                        portfolio_id = pf.get("portfolio_id")
                        fund_id = pf.get("id")
                        if portfolio_id not in portfolio_to_funds:
                            portfolio_to_funds[portfolio_id] = []
                        portfolio_to_funds[portfolio_id].append(fund_id)
                        all_fund_ids.append(fund_id)
                    
                    # Get latest valuations for all funds
                    if all_fund_ids:
                        valuations_result = db.table("latest_portfolio_fund_valuations").select("portfolio_fund_id,valuation").in_("portfolio_fund_id", all_fund_ids).execute()
                        if valuations_result.data:
                            # Create fund_id to value map
                            fund_to_value = {item.get("portfolio_fund_id"): float(item.get("valuation", 0)) for item in valuations_result.data}
                            
                            # Calculate FUM for each portfolio
                            for portfolio_id, fund_ids in portfolio_to_funds.items():
                                portfolio_fum = sum(fund_to_value.get(fund_id, 0) for fund_id in fund_ids)
                                portfolio_fum_map[portfolio_id] = portfolio_fum
        except Exception as e:
            logger.warning(f"Error calculating portfolio FUM and IRR: {str(e)}")
        
        # EFFICIENT PRODUCT OWNER FETCHING - This is the key improvement
        # 1. Get all product_owner_products associations in one query
        product_owner_associations = {}
        try:
            pop_result = db.table("product_owner_products").select("*").in_("product_id", product_ids).execute()
            if pop_result.data:
                # Group by product_id for efficient lookup
                for assoc in pop_result.data:
                    product_id = assoc.get("product_id")
                    if product_id not in product_owner_associations:
                        product_owner_associations[product_id] = []
                    product_owner_associations[product_id].append(assoc.get("product_owner_id"))
        except Exception as e:
            logger.error(f"Error fetching product owner associations: {str(e)}")
        
        # 2. Get all product owner details in one query
        product_owner_ids = []
        for owners in product_owner_associations.values():
            product_owner_ids.extend(owners)
        
        product_owners_map = {}
        if product_owner_ids:
            try:
                owners_result = db.table("product_owners").select("*").in_("id", list(set(product_owner_ids))).execute()
                if owners_result.data:
                    product_owners_map = {owner.get("id"): owner for owner in owners_result.data}
            except Exception as e:
                logger.error(f"Error fetching product owners: {str(e)}")
        
        # Enhance the response data with all related information
        enhanced_data = []
        
        for product in client_products:
            product_id = product.get("id")
            
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
                product["client_name"] = client.get("name", "")
            
            # Add portfolio and template info if available
            portfolio_id = product.get("portfolio_id")
            if portfolio_id and portfolio_id in portfolios_map:
                portfolio = portfolios_map[portfolio_id]
                template_generation_id = portfolio.get("template_generation_id")
                if template_generation_id and template_generation_id in template_generations_map:
                    template = template_generations_map[template_generation_id]
                    product["template_generation_id"] = template_generation_id
                    product["template_info"] = template
            
            # Add total_value and irr from calculated FUM and latest portfolio IRR
            if portfolio_id and portfolio_id in portfolio_fum_map:
                product["total_value"] = portfolio_fum_map[portfolio_id]
            else:
                product["total_value"] = 0
            
            # Use latest portfolio IRR if available
            if portfolio_id and portfolio_id in portfolio_irr_map:
                product["irr"] = portfolio_irr_map[portfolio_id]
            else:
                product["irr"] = "-"  # Display as dash if no portfolio IRR available
                
                # Add IRR date from the bulk-fetched data
                if portfolio_id and portfolio_id in irr_dates_map:
                    product["irr_date"] = irr_dates_map[portfolio_id]
                else:
                    product["irr_date"] = None
            
            # Add product owners - this is the key improvement
            product_owners = []
            if product_id in product_owner_associations:
                owner_ids = product_owner_associations[product_id]
                for owner_id in owner_ids:
                    if owner_id in product_owners_map:
                        product_owners.append(product_owners_map[owner_id])
            
            product["product_owners"] = product_owners
            
            enhanced_data.append(product)
        
        logger.info(f"Retrieved {len(enhanced_data)} client products with all related data including owners")
        
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
            client_result = db.table("client_groups").select("*").eq("id", client_id).execute()
            if client_result.data and len(client_result.data) > 0:
                client = client_result.data[0]
                client_product["client_name"] = client.get("name", "")
                logger.info(f"Added client name: {client_product['client_name']}")
        
        # Fetch portfolio information if available
        portfolio_id = client_product.get("portfolio_id")
        if portfolio_id:
            portfolio_result = db.table("portfolios").select("*").eq("id", portfolio_id).execute()
            if portfolio_result.data and len(portfolio_result.data) > 0:
                portfolio = portfolio_result.data[0]
                
                # Add template info if this portfolio is based on a template
                if portfolio.get("template_generation_id"):
                    template_result = db.table("template_portfolio_generations").select("*").eq("id", portfolio.get("template_generation_id")).execute()
                    if template_result.data and len(template_result.data) > 0:
                        template = template_result.data[0]
                        client_product["template_generation_id"] = portfolio.get("template_generation_id")
                        client_product["template_info"] = template
            
        # Fetch total_value using latest_portfolio_fund_valuations view instead of product_value_irr_summary
        portfolio_id = client_product.get("portfolio_id")
        total_value = 0
        portfolio_irr = "-"
        
        if portfolio_id:
            try:
                # Get latest portfolio IRR
                portfolio_irr_result = db.table("latest_portfolio_irr_values").select("irr_result").eq("portfolio_id", portfolio_id).execute()
                if portfolio_irr_result.data:
                    portfolio_irr = portfolio_irr_result.data[0].get("irr_result")
                
                # Get all active portfolio funds for this portfolio
                funds_result = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_id).eq("status", "active").execute()
                
                if funds_result.data:
                    portfolio_fund_ids = [fund.get("id") for fund in funds_result.data]
                    
                    # Use the latest_portfolio_fund_valuations view to get current values
                    valuations_result = db.table("latest_portfolio_fund_valuations").select("valuation").in_("portfolio_fund_id", portfolio_fund_ids).execute()
                    
                    if valuations_result.data:
                        for valuation in valuations_result.data:
                            value = valuation.get("valuation", 0)
                            if value:
                                total_value += float(value)
                        logger.info(f"Calculated total_value={total_value} for product {client_product_id}")
                    else:
                        logger.info(f"No valuations found for portfolio funds: {portfolio_fund_ids}")
                else:
                    logger.info(f"No active funds found for portfolio {portfolio_id}")
            except Exception as e:
                logger.error(f"Error calculating total value and IRR for product {client_product_id}: {str(e)}")
        
        client_product["total_value"] = total_value
        client_product["irr"] = portfolio_irr
        
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
            client_check = db.table("client_groups").select("id").eq("id", update_data["client_id"]).execute()
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
        portfolio_irr_deleted = 0
        portfolio_val_deleted = 0
        
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
                    irr_result = db.table("portfolio_fund_irr_values").delete().eq("fund_id", fund_id).execute()
                    deleted_count = len(irr_result.data) if irr_result.data else 0
                    irr_values_deleted += deleted_count
                    logger.info(f"Deleted {deleted_count} IRR values for portfolio fund {fund_id}")
                    
                    # Also delete IRR values for any fund valuations related to this fund
                    # Get all fund valuation IDs for this fund
                    fund_valuation_ids_result = db.table("portfolio_fund_valuations").select("id").eq("portfolio_fund_id", fund_id).execute()
                    if fund_valuation_ids_result.data and len(fund_valuation_ids_result.data) > 0:
                        valuation_ids = [v["id"] for v in fund_valuation_ids_result.data]
                        # Delete IRR values referencing these fund valuation IDs
                        for val_id in valuation_ids:
                            val_irr_result = db.table("portfolio_fund_irr_values").delete().eq("fund_valuation_id", val_id).execute()
                            deleted_count = len(val_irr_result.data) if val_irr_result.data else 0
                            irr_values_deleted += deleted_count
                            logger.info(f"Deleted {deleted_count} IRR values for fund valuation {val_id}")
                    
                    # Now it's safe to delete fund valuations for this fund
                    fund_val_result = db.table("portfolio_fund_valuations").delete().eq("portfolio_fund_id", fund_id).execute()
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
        
        # Now clean up portfolio-level records before deleting the portfolio
        if portfolio_id:
            # Delete portfolio IRR values
            portfolio_irr_result = db.table("portfolio_irr_values").delete().eq("portfolio_id", portfolio_id).execute()
            portfolio_irr_deleted = len(portfolio_irr_result.data) if portfolio_irr_result.data else 0
            logger.info(f"Deleted {portfolio_irr_deleted} portfolio IRR values for portfolio {portfolio_id}")
            
            # Delete portfolio valuations (this was the missing step causing the foreign key error)
            portfolio_val_result = db.table("portfolio_valuations").delete().eq("portfolio_id", portfolio_id).execute()
            portfolio_val_deleted = len(portfolio_val_result.data) if portfolio_val_result.data else 0
            logger.info(f"Deleted {portfolio_val_deleted} portfolio valuations for portfolio {portfolio_id}")
            
            # Now it's safe to delete the portfolio
            db.table("portfolios").delete().eq("id", portfolio_id).execute()
            logger.info(f"Deleted portfolio {portfolio_id}")
        
        return {
            "message": f"Client product with ID {client_product_id} and all associated records deleted successfully",
            "details": {
                "portfolio_deleted": 1 if portfolio_id else 0,
                "portfolio_funds_deleted": portfolio_funds_deleted,
                "fund_valuations_deleted": fund_valuations_deleted,
                "irr_values_deleted": irr_values_deleted,
                "activity_logs_deleted": activity_logs_deleted,
                "portfolio_irr_values_deleted": portfolio_irr_deleted if portfolio_id else 0,
                "portfolio_valuations_deleted": portfolio_val_deleted if portfolio_id else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client product and associated records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/client_products/{product_id}/fum", response_model=dict)
async def get_product_fum(product_id: int, db = Depends(get_db)):
    """
    What it does: Calculates the total funds under management for a specific product
    Why it's needed: Provides an accurate sum of all valuations for a product's portfolio funds
    How it works:
        1. Gets the product to find its associated portfolio
        2. Gets all active portfolio funds for that portfolio
        3. Uses the latest_portfolio_fund_valuations view to get current values
        4. Sums up the valuations
    Expected output: A JSON object with the total FUM value
    """
    try:
        # Get the product to find its portfolio ID
        product_result = db.table("client_products").select("portfolio_id").eq("id", product_id).execute()
        
        if not product_result.data or len(product_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
            
        portfolio_id = product_result.data[0].get("portfolio_id")
        if not portfolio_id:
            logger.info(f"Product {product_id} has no associated portfolio")
            return {"product_id": product_id, "fum": 0}
            
        # Get all active portfolio funds for this portfolio
        funds_result = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_id).eq("status", "active").execute()
        
        if not funds_result.data or len(funds_result.data) == 0:
            logger.info(f"No active funds found for portfolio {portfolio_id}")
            return {"product_id": product_id, "fum": 0}
            
        portfolio_fund_ids = [fund.get("id") for fund in funds_result.data]
        
        # Use the latest_portfolio_fund_valuations view to get current values
        valuations_result = db.table("latest_portfolio_fund_valuations").select("valuation").in_("portfolio_fund_id", portfolio_fund_ids).execute()
            
        total_fum = 0
        if valuations_result.data:
            for valuation in valuations_result.data:
                value = valuation.get("valuation", 0)
                if value:
                    total_fum += float(value)
            logger.info(f"Total FUM calculated from {len(valuations_result.data)} fund valuations")
        else:
            logger.info(f"No valuations found for portfolio funds: {portfolio_fund_ids}")
                
        logger.info(f"Total FUM for product {product_id}: {total_fum}")
        return {"product_id": product_id, "fum": total_fum}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating FUM for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/client_products/{product_id}/irr", response_model=dict)
async def get_product_irr(product_id: int, db = Depends(get_db)):
    """
    What it does: Calculates the true portfolio IRR for a product based on all cash flows across all portfolio funds
    Why it's needed: Provides an accurate IRR calculation from actual cash flows, not weighted averages
    How it works:
        1. Gets the product to find its associated portfolio
        2. Gets all portfolio funds for that portfolio
        3. Aggregates all cash flows (deposits, withdrawals, fees) from all funds
        4. Gets latest valuations as the final cash flow
        5. Calculates IRR from the combined cash flow series using the Excel-style IRR function
    Expected output: A JSON object with the calculated portfolio IRR value
    """
    try:
        logger.info(f"Calculating portfolio IRR from cash flows for product {product_id}")
        
        # Get the product to find its portfolio ID
        product_result = db.table("client_products").select("portfolio_id,product_name").eq("id", product_id).execute()
        
        if not product_result.data or len(product_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
            
        portfolio_id = product_result.data[0].get("portfolio_id")
        product_name = product_result.data[0].get("product_name", "Unknown Product")
        
        if not portfolio_id:
            logger.info(f"Product {product_id} ({product_name}) has no associated portfolio")
            return {"product_id": product_id, "product_name": product_name, "irr": 0, "irr_decimal": 0}
            
        # Get all portfolio funds for this portfolio (active and inactive to capture full history)
        funds_result = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_id).execute()
        
        if not funds_result.data or len(funds_result.data) == 0:
            logger.info(f"No funds found for portfolio {portfolio_id} (product {product_id})")
            return {"product_id": product_id, "product_name": product_name, "irr": 0, "irr_decimal": 0}
            
        portfolio_fund_ids = [fund.get("id") for fund in funds_result.data]
        logger.info(f"Found {len(portfolio_fund_ids)} portfolio funds for IRR calculation")
        
        # Aggregate all cash flows from all portfolio funds
        all_cash_flows = {}  # date -> total_cash_flow
        
        # Get all activities for all portfolio funds
        if portfolio_fund_ids:
            activities_result = db.table("holding_activity_log").select("*").in_("portfolio_fund_id", portfolio_fund_ids).order("activity_timestamp").execute()
            
            if activities_result.data:
                logger.info(f"Found {len(activities_result.data)} activities across all funds")
                
                for activity in activities_result.data:
                    activity_date = activity.get("activity_timestamp")
                    activity_type = activity.get("activity_type", "").lower()
                    amount = float(activity.get("amount", 0))
                    
                    if activity_date:
                        # Normalize activity date to START of month
                        from datetime import datetime
                        if isinstance(activity_date, str):
                            # Handle full datetime format from database (e.g., "2025-01-15T00:00:00")
                            if 'T' in activity_date:
                                parsed_date = datetime.strptime(activity_date, '%Y-%m-%dT%H:%M:%S')
                            else:
                                parsed_date = datetime.strptime(activity_date, '%Y-%m-%d')
                        else:
                            parsed_date = activity_date
                        
                        # Set to first day of the month for activities
                        normalized_date = f"{parsed_date.year}-{parsed_date.month:02d}-01"
                        
                        if normalized_date not in all_cash_flows:
                            all_cash_flows[normalized_date] = 0
                        
                        # Deposits are negative cash flows (money going out)
                        # Withdrawals are positive cash flows (money coming in)
                        if activity_type in ["deposit", "investment", "contribution"]:
                            all_cash_flows[normalized_date] -= amount
                        elif activity_type in ["withdrawal", "redemption", "distribution"]:
                            all_cash_flows[normalized_date] += amount
                        # Fees are negative cash flows
                        elif activity_type in ["fee", "charge", "expense"]:
                            all_cash_flows[normalized_date] -= amount
            
            # Get the latest valuations for all funds in one bulk query
            total_current_value = 0
            latest_valuation_date = None
            
            if portfolio_fund_ids:
                # Get all latest valuations in one bulk query using the view
                valuations_result = db.table("latest_portfolio_fund_valuations")\
                    .select("valuation, valuation_date")\
                    .in_("portfolio_fund_id", portfolio_fund_ids)\
                    .execute()
                
                if valuations_result.data:
                    for valuation in valuations_result.data:
                        current_value = float(valuation.get("valuation", 0))
                        total_current_value += current_value
                        
                        # Track the latest valuation date across all funds
                        val_date = valuation.get("valuation_date")
                        if val_date:
                            from datetime import datetime
                            if isinstance(val_date, str):
                                # Handle full datetime format from database (e.g., "2025-03-01T00:00:00")
                                if 'T' in val_date:
                                    val_date_obj = datetime.strptime(val_date, '%Y-%m-%dT%H:%M:%S').date()
                            else:
                                val_date_obj = datetime.strptime(val_date, '%Y-%m-%d').date()
                        else:
                            val_date_obj = None
                            
                        if latest_valuation_date is None or val_date_obj > latest_valuation_date:
                            latest_valuation_date = val_date_obj
            
            # Add the total current value as the final cash flow (normalized to END of valuation month)
            if total_current_value > 0 and latest_valuation_date:
                # Use end of the valuation month, not current month
                from datetime import date
                val_month = latest_valuation_date.month
                val_year = latest_valuation_date.year
                
                # Get last day of valuation month
                if val_month == 12:
                    next_month = date(val_year + 1, 1, 1)
                else:
                    next_month = date(val_year, val_month + 1, 1)
                from datetime import timedelta
                end_of_val_month = next_month - timedelta(days=1)
                end_of_val_month_str = end_of_val_month.strftime('%Y-%m-%d')
                
                all_cash_flows[end_of_val_month_str] = all_cash_flows.get(end_of_val_month_str, 0) + total_current_value
                logger.info(f"Added total current value {total_current_value} as final cash flow at end of valuation month: {end_of_val_month_str}")
        
        # Convert to sorted list of cash flows for IRR calculation
        if not all_cash_flows:
            logger.info(f"No cash flows found for portfolio {portfolio_id}")
            return {"product_id": product_id, "product_name": product_name, "irr": 0, "irr_decimal": 0}
        
        # Sort by date and extract values
        sorted_dates = sorted(all_cash_flows.keys())
        cash_flow_values = [all_cash_flows[date] for date in sorted_dates]
        
        logger.info(f"Portfolio cash flows for IRR calculation:")
        for i, date in enumerate(sorted_dates):
            logger.info(f"  {date}: {cash_flow_values[i]}")
        
        # Calculate IRR using the Excel-style IRR function
        try:
            # Convert all dates to datetime objects for consistency
            from datetime import datetime
            date_objects = []
            for date_str in sorted_dates:
                if isinstance(date_str, str):
                    # Parse the date string to a datetime object
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                    date_objects.append(date_obj)
                elif hasattr(date_str, 'date'):
                    # It's already a datetime object
                    date_objects.append(date_str)
                else:
                    # It's a date object, convert to datetime
                    date_obj = datetime.combine(date_str, datetime.min.time())
                    date_objects.append(date_obj)
            
            portfolio_irr = calculate_excel_style_irr(date_objects, cash_flow_values)
            logger.info(f"IRR calculation result: {portfolio_irr}")
            
            # Extract the IRR value from the result dictionary
            irr_decimal = portfolio_irr.get('period_irr', 0)
            irr_percentage = irr_decimal * 100
            
            logger.info(f"Calculated portfolio IRR: {irr_percentage}%")
            
            return {
                "product_id": product_id,
                "product_name": product_name,
                            "irr": irr_percentage,
                            "irr_decimal": irr_decimal,
                            "cash_flows_count": len(cash_flow_values),
                            "total_current_value": total_current_value,
                            "days_in_period": portfolio_irr.get('days_in_period', 0)
                    }
            
        except Exception as irr_error:
            logger.error(f"Error calculating IRR: {str(irr_error)}")
            return {
                "product_id": product_id,
                "product_name": product_name,
                "irr": 0,
                "irr_decimal": 0,
                "error": f"IRR calculation failed: {str(irr_error)}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating portfolio IRR for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/client_products/{client_product_id}/complete", response_model=dict)
async def get_complete_product_details(client_product_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a single product with all its related data in one query.
    Why it's needed: Dramatically improves frontend performance by eliminating multiple sequential API calls.
    How it works:
        1. Fetches the product details
        2. Fetches all related data in parallel:
           - Provider details
           - Client details
           - Product owners
           - Portfolio details including funds
           - Fund valuations
           - IRR values
        3. Combines all data into a single response object
    Expected output: A complete product object with all related data nested within it
    """
    try:
        logger.info(f"Fetching complete product details for product ID: {client_product_id}")
        
        # Check if the product exists
        product_result = db.table("client_products").select("*").eq("id", client_product_id).execute()
        
        if not product_result.data or len(product_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Product with ID {client_product_id} not found")
        
        product = product_result.data[0]
        logger.info(f"Found product: {product['product_name']} (ID: {product['id']})")
        
        # Extract IDs needed for related data
        provider_id = product.get("provider_id")
        client_id = product.get("client_id")
        portfolio_id = product.get("portfolio_id")
        
        # Initialize response object with product data
        response = {
            **product,
            "provider_details": None,
            "client_details": None,
            "product_owners": [],
            "portfolio_details": None,
            "portfolio_funds": [],
            "fund_valuations": {},
            "irr_values": {},
            "summary": {
                "total_value": 0,
                "irr_weighted": None
            }
        }
        
        # Fetch provider details if available
        if provider_id:
            provider_result = db.table("available_providers").select("*").eq("id", provider_id).execute()
            if provider_result.data and len(provider_result.data) > 0:
                response["provider_details"] = provider_result.data[0]
                response["provider_name"] = provider_result.data[0].get("name")
                response["provider_theme_color"] = provider_result.data[0].get("theme_color")
        
        # Fetch client details if available
        if client_id:
            client_result = db.table("client_groups").select("*").eq("id", client_id).execute()
            if client_result.data and len(client_result.data) > 0:
                response["client_details"] = client_result.data[0]
                response["client_name"] = client_result.data[0].get("name")
        
        # Fetch product owners in a single query
        try:
            # First get all associations
            pop_result = db.table("product_owner_products").select("*").eq("product_id", client_product_id).execute()
            
            if pop_result.data and len(pop_result.data) > 0:
                # Extract product owner IDs
                owner_ids = [pop.get("product_owner_id") for pop in pop_result.data]
                
                # Fetch all product owners in one query
                owners_result = db.table("product_owners").select("*").in_("id", owner_ids).execute()
                if owners_result.data:
                    response["product_owners"] = owners_result.data
        except Exception as e:
            logger.error(f"Error fetching product owners: {str(e)}")
        
        # Fetch portfolio details and funds if available
        if portfolio_id:
            # Get portfolio details
            portfolio_result = db.table("portfolios").select("*").eq("id", portfolio_id).execute()
            if portfolio_result.data and len(portfolio_result.data) > 0:
                portfolio = portfolio_result.data[0]
                response["portfolio_details"] = portfolio
                
                # Get original template generation if available
                original_template_generation_id = portfolio.get("template_generation_id")
                if original_template_generation_id:
                    # Fetch from template_portfolio_generations table
                    generation_result = db.table("template_portfolio_generations") \
                        .select("*") \
                        .eq("id", original_template_generation_id) \
                        .maybe_single() \
                        .execute()
                    
                    if generation_result.data:
                        generation_info = generation_result.data
                        response["template_info"] = generation_info # Contains generation name, version, etc.
                        response["template_generation_id"] = original_template_generation_id
                        # If the parent template name is needed and fetched via a join (e.g., template_portfolio_generations(name)):
                        if generation_info.get("template_portfolio_generations") and isinstance(generation_info.get("template_portfolio_generations"), dict):
                            response["parent_template_name"] = generation_info.get("template_portfolio_generations").get("name")
                        else:
                            response["parent_template_name"] = None # Or fetch separately if needed

                # Get portfolio funds in a single query
                funds_result = db.table("portfolio_funds").select("*").eq("portfolio_id", portfolio_id).execute()
                if funds_result.data:
                    portfolio_funds = funds_result.data
                    
                    # Get all fund IDs to fetch fund details
                    fund_ids = [pf.get("available_funds_id") for pf in portfolio_funds if pf.get("available_funds_id")]
                    
                    # Get all portfolio fund IDs to fetch valuations and IRR values
                    portfolio_fund_ids = [pf.get("id") for pf in portfolio_funds]
                    
                    # Fetch fund details in one query
                    funds_map = {}
                    if fund_ids:
                        funds_details_result = db.table("available_funds").select("*").in_("id", fund_ids).execute()
                        if funds_details_result.data:
                            funds_map = {f.get("id"): f for f in funds_details_result.data}
                    
                    # Fetch all fund valuations in one query
                    valuations_map = {}
                    if portfolio_fund_ids:
                        # We want the latest valuation for each fund, so we need to use a SQL query
                        # A typical approach in Supabase might be:
                        latest_valuations_result = db.table("latest_portfolio_fund_valuations").select("*").in_("portfolio_fund_id", portfolio_fund_ids).execute()
                        if latest_valuations_result.data:
                            valuations_map = {v.get("portfolio_fund_id"): v for v in latest_valuations_result.data}
                    
                    # Fetch all IRR values in one query
                    irr_map = {}
                    if portfolio_fund_ids:
                        # Similar to valuations, we want the latest IRR for each fund
                        latest_irr_result = db.table("latest_portfolio_fund_irr_values").select("*").in_("fund_id", portfolio_fund_ids).execute()
                        if latest_irr_result.data:
                            irr_map = {irr.get("fund_id"): irr for irr in latest_irr_result.data}
                    
                    # Combine all the data
                    enhanced_funds = []
                    for pf in portfolio_funds:
                        fund_id = pf.get("available_funds_id")
                        portfolio_fund_id = pf.get("id")
                        
                        # Add fund details
                        if fund_id and fund_id in funds_map:
                            fund_details = funds_map[fund_id]
                            pf["fund_details"] = fund_details
                            pf["fund_name"] = fund_details.get("fund_name")
                            pf["isin_number"] = fund_details.get("isin_number")
                            pf["risk_factor"] = fund_details.get("risk_factor")
                        
                        # Add valuation data
                        if portfolio_fund_id and portfolio_fund_id in valuations_map:
                            valuation = valuations_map[portfolio_fund_id]
                            pf["latest_valuation"] = valuation
                            pf["market_value"] = valuation.get("valuation")
                            pf["valuation_date"] = valuation.get("valuation_date")
                        
                        # Add IRR data - ensure all funds have these properties
                        if portfolio_fund_id and portfolio_fund_id in irr_map:
                            irr = irr_map[portfolio_fund_id]
                            pf["latest_irr"] = irr
                            pf["irr_result"] = irr.get("irr_result")
                            pf["irr_date"] = irr.get("irr_date")
                        else:
                            # Fund has no IRR data, set default values
                            pf["latest_irr"] = None
                            pf["irr_result"] = None
                            pf["irr_date"] = None
                        
                        enhanced_funds.append(pf)
                    
                    response["portfolio_funds"] = enhanced_funds
                    response["fund_valuations"] = valuations_map
                    response["irr_values"] = irr_map
        
        # Fetch the product summary data - calculate on demand instead of using view
        portfolio_id = product.get("portfolio_id")
        summary_total_value = 0
        portfolio_irr = "-"
        
        if portfolio_id:
            try:
                # Get latest portfolio IRR
                portfolio_irr_result = db.table("latest_portfolio_irr_values").select("irr_result").eq("portfolio_id", portfolio_id).execute()
                if portfolio_irr_result.data:
                    portfolio_irr = portfolio_irr_result.data[0].get("irr_result")
                
                # Get all active portfolio funds for this portfolio
                funds_result = db.table("portfolio_funds").select("id").eq("portfolio_id", portfolio_id).eq("status", "active").execute()
                
                if funds_result.data:
                    portfolio_fund_ids = [fund.get("id") for fund in funds_result.data]
                    
                    # Use the latest_portfolio_fund_valuations view to get current values
                    valuations_result = db.table("latest_portfolio_fund_valuations").select("valuation").in_("portfolio_fund_id", portfolio_fund_ids).execute()
                    
                    if valuations_result.data:
                        for valuation in valuations_result.data:
                            value = valuation.get("valuation", 0)
                            if value:
                                summary_total_value += float(value)
            except Exception as e:
                logger.error(f"Error calculating product summary: {str(e)}")
        
        response["summary"] = {
            "total_value": summary_total_value,
            "irr_weighted": portfolio_irr  # Use portfolio IRR instead of None
        }
        response["total_value"] = summary_total_value
        response["irr"] = portfolio_irr  # Use portfolio IRR instead of "-"
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching complete product details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/client_products/{client_product_id}/notes")
async def update_product_notes(client_product_id: int, request: Request, db = Depends(get_db)):
    """
    What it does: Updates the notes field of a client product.
    Why it's needed: Handles auto-saving of notes when the user navigates away from the page.
    How it works:
        1. Receives a POST request with notes data from sendBeacon or onBlur
        2. Parses the JSON body from the request
        3. Updates only the notes field in the database
        4. Returns a success response
    Expected output: A success message if the update was successful
    """
    try:
        # Parse the request body as JSON
        body = await request.json()
        notes = body.get("notes")

        if notes is None:
            raise HTTPException(status_code=400, detail="Notes field is required")

        # Check if client product exists
        check_result = db.table("client_products").select("id").eq("id", client_product_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Client product with ID {client_product_id} not found")

        # Update only the notes field
        result = db.table("client_products").update({"notes": notes}).eq("id", client_product_id).execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=400, detail="Failed to update notes")

        return {"message": "Notes updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product notes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
