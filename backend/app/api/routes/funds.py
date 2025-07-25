from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import List, Optional
import logging
from datetime import date

from app.models.fund import FundBase, FundCreate, FundUpdate, FundInDB, FundWithProvider
from app.db.database import get_db
from supabase import Client as SupabaseClient

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/funds", response_model=List[FundInDB])
async def get_funds(
    db: SupabaseClient = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    search: Optional[str] = None
):
    """Get all funds with optional search"""
    try:
        query = db.table("available_funds").select("*")
        
        if search:
            query = query.or_(
                f"fund_name.ilike.%{search}%",
                f"isin_number.ilike.%{search}%"
            )
        
        # Execute the query and get the response
        try:
            response = query.range(skip, skip + limit - 1).execute()
        except Exception as e:
            logger.error(f"Failed to execute Supabase query: {str(e)}")
            raise HTTPException(status_code=500, detail="Database query failed")
        
        if not hasattr(response, 'data'):
            logger.error("Response missing data attribute")
            raise HTTPException(status_code=500, detail="Invalid response format from database")

        if not response.data:
            return []

        if not isinstance(response.data, list):
            logger.error(f"Expected list but got {type(response.data)}")
            raise HTTPException(status_code=500, detail="Unexpected response format from database")

        # Process each fund
        funds = []
        for idx, fund in enumerate(response.data):
            try:
                # Validate required fields
                if 'id' not in fund or 'created_at' not in fund:
                    logger.error(f"Fund {idx} missing required fields")
                    continue

                # Create model with explicit type conversion
                fund_model = FundInDB(
                    id=int(fund['id']),
                    created_at=fund['created_at'],
                    fund_name=fund.get('fund_name'),
                    isin_number=fund.get('isin_number'),
                    risk_factor=fund.get('risk_factor'),
                    fund_cost=fund.get('fund_cost'),
                    status=fund.get('status', 'active')
                )
                funds.append(fund_model)
                
            except Exception as e:
                logger.error(f"Error processing fund {idx}: {str(e)}")
                continue

        return funds

    except Exception as e:
        logger.error(f"Failed to retrieve funds: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve funds")

@router.get("/funds/{fund_id}", response_model=FundWithProvider)
async def get_fund(
    fund_id: int,
    portfolio_id: Optional[int] = None,
    db: SupabaseClient = Depends(get_db)
):
    """Get a specific fund"""
    try:
        # Get base fund data
        fund_result = db.table("available_funds").select("*").eq("id", fund_id).execute()
        
        if not fund_result.data:
            raise HTTPException(status_code=404, detail=f"Fund with ID {fund_id} not found")
        
        fund_data = fund_result.data[0]
        
        # Available funds in this context are never assigned providers
        # Only return the portfolio_id parameter which may be used for context
        return {
            **fund_data,
            "portfolio_id": portfolio_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching fund {fund_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch fund")

@router.post("/funds", response_model=FundInDB)
async def create_fund(fund: FundCreate, db: SupabaseClient = Depends(get_db)):
    """Create a new fund"""
    try:
        result = db.table("available_funds").insert(fund.model_dump()).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/funds/{fund_id}", response_model=FundInDB)
async def update_fund(fund_id: int, fund_update: FundUpdate, db = Depends(get_db)):
    """
    What it does: Updates an existing fund's information.
    Why it's needed: Allows modifying fund details when they change.
    How it works:
        1. Takes the fund_id from the URL path and update data from request body
        2. Verifies the fund exists
        3. Updates the fund with the new data
        4. Returns the updated fund information
    Expected output: A JSON object containing the updated fund's details
    """
    try:
        result = db.table("available_funds")\
            .update(fund_update.model_dump(exclude_unset=True))\
            .eq("id", fund_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail=f"Fund with ID {fund_id} not found")
        
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/funds/{fund_id}")
async def delete_fund(fund_id: int, db: SupabaseClient = Depends(get_db)):
    """Delete a fund"""
    try:
        # Check if fund is used in any portfolios
        portfolio_funds = db.table("portfolio_funds")\
            .select("id")\
            .eq("available_funds_id", fund_id)\
            .execute()
        
        if portfolio_funds.data:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete fund as it is used in portfolios"
            )
        
        result = db.table("available_funds")\
            .delete()\
            .eq("id", fund_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail=f"Fund with ID {fund_id} not found")
        
        return {"message": "Fund deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/funds/{fund_id}/products-with-owners", response_model=List[dict])
async def get_fund_products_with_owners(
    fund_id: int = Path(..., description="The ID of the fund"),
    db = Depends(get_db)
):
    """
    What it does: Gets all products and their owners that use a specific fund
    Why it's needed: Shows which products are using a particular fund and who owns them
    How it works:
        1. Gets all portfolio_funds that use this fund
        2. Gets the portfolios for these portfolio_funds
        3. Gets the products using these portfolios
        4. Gets the owners for each product
        5. Returns a combined list with all information
    Expected output: A list of products with their owners that use this fund
    """
    try:
        # First check if the fund exists
        fund_result = db.table("available_funds").select("*").eq("id", fund_id).execute()
        if not fund_result.data:
            raise HTTPException(status_code=404, detail=f"Fund with ID {fund_id} not found")

        # Get all portfolio_funds that use this fund
        portfolio_funds = db.table("portfolio_funds").select("*").eq("available_funds_id", fund_id).eq("status", "active").execute()
        
        if not portfolio_funds.data:
            return []
            
        # Get all portfolio IDs
        portfolio_ids = [pf["portfolio_id"] for pf in portfolio_funds.data]
        
        # Get all products that use these portfolios
        products_result = db.table("client_products").select("*").in_("portfolio_id", portfolio_ids).execute()
        
        if not products_result.data:
            return []
            
        # Get all product IDs
        product_ids = [p["id"] for p in products_result.data]
        
        # Get all product owner associations
        owner_assocs = db.table("product_owner_products").select("*").in_("product_id", product_ids).execute()
        
        # Create a map of product ID to owner IDs
        product_owner_map = {}
        if owner_assocs.data:
            for assoc in owner_assocs.data:
                product_id = assoc["product_id"]
                if product_id not in product_owner_map:
                    product_owner_map[product_id] = []
                product_owner_map[product_id].append(assoc["product_owner_id"])
                
        # Get all unique owner IDs
        owner_ids = []
        for owners in product_owner_map.values():
            owner_ids.extend(owners)
        owner_ids = list(set(owner_ids))
        
        # Get all owner details
        owners_result = db.table("product_owners").select("id, firstname, surname, known_as, status, created_at").in_("id", owner_ids).execute()
        owner_map = {owner["id"]: owner for owner in owners_result.data} if owners_result.data else {}
        
        # Create portfolio map for quick lookup
        portfolios_result = db.table("portfolios").select("*").in_("id", portfolio_ids).execute()
        portfolio_map = {p["id"]: p for p in portfolios_result.data} if portfolios_result.data else {}
        
        # Build the final response
        products_with_owners = []
        for product in products_result.data:
            product_id = product["id"]
            portfolio_id = product["portfolio_id"]
            
            # Get portfolio info
            portfolio = portfolio_map.get(portfolio_id, {})
            
            # Get portfolio fund info
            portfolio_fund = next(
                (pf for pf in portfolio_funds.data if pf["portfolio_id"] == portfolio_id),
                {}
            )
            
            # Get owner info
            owner_ids = product_owner_map.get(product_id, [])
            owners = [owner_map.get(owner_id) for owner_id in owner_ids if owner_id in owner_map]
            
            # For reports, use known_as (nickname) + surname combination
            product_owner_name = "No Owner"
            if owners:
                owner = owners[0]
                nickname = owner.get('known_as') or owner.get('firstname') or ""
                surname = owner.get('surname') or ""
                if nickname and surname:
                    product_owner_name = f"{nickname} {surname}"
                elif nickname:
                    product_owner_name = nickname
                elif surname:
                    product_owner_name = surname
                else:
                    product_owner_name = "No Owner"
            
            # Build product entry
            product_entry = {
                "product_id": product_id,
                "product_name": product["product_name"],
                "product_type": product["product_type"],
                "status": product["status"],
                "portfolio_name": portfolio.get("portfolio_name", ""),
                "target_weighting": portfolio_fund.get("target_weighting", 0),
                "start_date": product["start_date"],
                "product_owner_name": product_owner_name
            }
            
            products_with_owners.append(product_entry)
            
        return products_with_owners
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting products with owners for fund {fund_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/funds/check-isin/{isin_number}")
async def check_isin_duplicate(
    isin_number: str = Path(..., description="ISIN number to check for duplicates"),
    exclude_fund_id: Optional[int] = Query(None, description="Fund ID to exclude from duplicate check (for updates)"),
    db: SupabaseClient = Depends(get_db)
):
    """
    Check if an ISIN number already exists in the database
    
    What it does: Searches for existing funds with the same ISIN number
    Why it's needed: Provides duplicate warning to users before saving
    How it works:
        1. Searches available_funds table for matching ISIN
        2. Optionally excludes a specific fund ID (for updates)
        3. Returns information about any duplicate found
    Expected output: JSON object with duplicate status and details
    """
    try:
        # Convert ISIN to uppercase for consistent comparison
        isin_upper = isin_number.upper().strip()
        
        # Build query to find funds with matching ISIN
        query = db.table("available_funds").select("id, fund_name, isin_number, status").eq("isin_number", isin_upper)
        
        # Exclude specific fund ID if provided (useful for updates)
        if exclude_fund_id:
            query = query.neq("id", exclude_fund_id)
        
        response = query.execute()
        
        if not response.data:
            return {
                "is_duplicate": False,
                "isin_number": isin_upper,
                "message": "ISIN is unique"
            }
        
        # Found duplicate(s)
        duplicate_fund = response.data[0]  # Get first match
        return {
            "is_duplicate": True,
            "isin_number": isin_upper,
            "duplicate_fund": {
                "id": duplicate_fund["id"],
                "name": duplicate_fund["fund_name"],
                "status": duplicate_fund["status"]
            },
            "message": f"ISIN already exists for fund: {duplicate_fund['fund_name']}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking ISIN duplicate for {isin_number}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
