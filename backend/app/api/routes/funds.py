from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

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
        logger.info("=== Starting get_funds ===")
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

        # Log the response for debugging
        logger.info("=== Supabase Response ===")
        logger.info(f"Response type: {type(response)}")
        logger.info(f"Has data attribute: {hasattr(response, 'data')}")
        
        if not hasattr(response, 'data'):
            logger.error("Response missing data attribute")
            raise HTTPException(status_code=500, detail="Invalid response format from database")
            
        logger.info(f"Response data: {response.data}")
        logger.info(f"Response data type: {type(response.data)}")

        if not response.data:
            logger.info("No funds found")
            return []

        if not isinstance(response.data, list):
            logger.error(f"Expected list but got {type(response.data)}")
            raise HTTPException(status_code=500, detail="Unexpected response format from database")

        # Process each fund with detailed error handling
        funds = []
        for idx, fund in enumerate(response.data):
            try:
                logger.info(f"Processing fund {idx}: {fund}")
                
                # Validate required fields
                if 'id' not in fund:
                    logger.error(f"Fund {idx} missing id field")
                    continue
                    
                if 'created_at' not in fund:
                    logger.error(f"Fund {idx} missing created_at field")
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
                logger.info(f"Successfully processed fund {idx}")
                
            except Exception as e:
                        logger.error(f"Error processing fund {idx}")
                        logger.error(f"Fund data: {fund}")
                        logger.error(f"Error: {str(e)}")
                        continue

        logger.info(f"Successfully processed {len(funds)} funds")
        return funds

    except Exception as e:
        logger.error("=== Fatal Error ===")
        logger.error(f"Type: {type(e)}")
        logger.error(f"Message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/funds/{fund_id}", response_model=FundWithProvider)
async def get_fund(
    fund_id: int,
    portfolio_id: Optional[int] = None,
    db: SupabaseClient = Depends(get_db)
):
    """Get a specific fund with optional provider context"""
    try:
        # Get base fund data
        fund_result = db.table("available_funds").select("*").eq("id", fund_id).execute()
        if not fund_result.data:
            raise HTTPException(status_code=404, detail=f"Fund with ID {fund_id} not found")
        
        fund_data = fund_result.data[0]
        
        # If portfolio_id is provided, get provider context
        provider_id = None
        if portfolio_id:
            provider_result = db.table("portfolio_fund_providers")\
                .select("provider_id")\
                .eq("fund_id", fund_id)\
                .eq("portfolio_id", portfolio_id)\
                .execute()
            
            if provider_result.data:
                provider_id = provider_result.data[0]["provider_id"]
        
        return {
            **fund_data,
            "provider_id": provider_id,
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
