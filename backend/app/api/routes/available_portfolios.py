from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional, Dict, Any, Union
from datetime import date, datetime
from app.db.database import get_db
from pydantic import BaseModel
import logging
import sys
from supabase import create_client, Client as SupabaseClient

# Set up logging with more detailed configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

class PortfolioFund(BaseModel):
    fund_id: int
    target_weighting: float

class PortfolioCreate(BaseModel):
    name: str
    generation_name: Optional[str] = None
    description: Optional[str] = None
    funds: Optional[List[PortfolioFund]] = None

class AvailablePortfolio(BaseModel):
    id: int
    created_at: str
    name: Optional[str] = None

    class Config:
        from_attributes = True

class PortfolioFundDetail(BaseModel):
    id: int
    created_at: datetime
    portfolio_id: int
    target_weighting: float
    fund_id: int
    available_funds: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class PortfolioTemplateDetail(BaseModel):
    id: int
    created_at: datetime
    name: str
    generation_id: Optional[int] = None
    generation_version: Optional[int] = None
    generation_name: Optional[str] = None
    funds: List[PortfolioFundDetail] = []

    class Config:
        from_attributes = True

class PortfolioFromTemplate(BaseModel):
    template_id: int
    portfolio_name: str

class GenerationDetail(BaseModel):
    id: int
    version_number: int
    generation_name: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GenerationCreate(BaseModel):
    generation_name: str
    description: Optional[str] = None
    copy_from_generation_id: Optional[int] = None
    funds: Optional[List[PortfolioFund]] = None

class GenerationStatusUpdate(BaseModel):
    status: str  # 'active', 'draft', 'archived'

class GenerationUpdate(BaseModel):
    generation_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    funds: Optional[List[PortfolioFund]] = None

router = APIRouter(prefix="/available_portfolios")

@router.get("", response_model=List[AvailablePortfolio])
async def get_available_portfolios(db = Depends(get_db)):
    """Get all available portfolio templates"""
    try:
        logger.info("=== Starting get_available_portfolios ===")
        
        # Debug the query and response
        try:
            response = db.table('available_portfolios').select('*').execute()
        except Exception as e:
            logger.error(f"Failed to execute Supabase query: {str(e)}")
            raise HTTPException(status_code=500, detail="Database query failed")

        # Log the raw response
        logger.info("=== Supabase Response ===")
        logger.info(f"Response type: {type(response)}")
        logger.info(f"Has data attribute: {hasattr(response, 'data')}")
        
        if not hasattr(response, 'data'):
            logger.error("Response missing data attribute")
            raise HTTPException(status_code=500, detail="Invalid response format from database")
            
        logger.info(f"Response data: {response.data}")
        logger.info(f"Response data type: {type(response.data)}")

        if not response.data:
            logger.info("No portfolios found")
            return []

        if not isinstance(response.data, list):
            logger.error(f"Expected list but got {type(response.data)}")
            raise HTTPException(status_code=500, detail="Unexpected response format from database")

        # Process each portfolio with detailed error handling
        portfolios = []
        for idx, portfolio in enumerate(response.data):
            try:
                logger.info(f"Processing portfolio {idx}: {portfolio}")
                
                # Validate required fields
                if 'id' not in portfolio:
                    logger.error(f"Portfolio {idx} missing id field")
                    continue
                    
                if 'created_at' not in portfolio:
                    logger.error(f"Portfolio {idx} missing created_at field")
                    continue

                # Create model with explicit type conversion
                portfolio_model = AvailablePortfolio(
                    id=int(portfolio['id']),
                    created_at=str(portfolio['created_at']),
                    name=portfolio.get('name')
                )
                portfolios.append(portfolio_model)
                logger.info(f"Successfully processed portfolio {idx}")
                
            except Exception as e:
                logger.error(f"Error processing portfolio {idx}")
                logger.error(f"Portfolio data: {portfolio}")
                logger.error(f"Error: {str(e)}")
                continue

        logger.info(f"Successfully processed {len(portfolios)} portfolios")
        return portfolios

    except Exception as e:
        logger.error("=== Fatal Error ===")
        logger.error(f"Type: {type(e)}")
        logger.error(f"Message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{portfolio_id}", response_model=PortfolioTemplateDetail)
async def get_available_portfolio_details(request: Request, portfolio_id: int, generation_id: Optional[int] = None, db: SupabaseClient = Depends(get_db)):
    """Get detailed information about a specific portfolio template including its funds"""
    try:
        # Log request details
        logger.info("=== Request Information ===")
        logger.info(f"Method: {request.method}")
        logger.info(f"URL: {request.url}")
        logger.info(f"Headers: {dict(request.headers)}")
        logger.info(f"Portfolio ID: {portfolio_id}")
        logger.info(f"Generation ID: {generation_id}")
        logger.info(f"Client Host: {request.client.host}")
        
        # Get portfolio details
        try:
            logger.info(f"Fetching portfolio with ID: {portfolio_id}")
            portfolio_response = db.table("available_portfolios").select("*").eq("id", portfolio_id).execute()
            logger.info(f"Portfolio response data: {portfolio_response.data}")
            logger.info(f"Portfolio response type: {type(portfolio_response)}")
        except Exception as e:
            logger.error("=== Portfolio Query Error ===")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error message: {str(e)}")
            logger.error(f"Error args: {e.args}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio: {str(e)}")

        if not portfolio_response.data:
            logger.warning(f"No portfolio found with ID: {portfolio_id}")
            raise HTTPException(status_code=404, detail="Portfolio template not found")
        
        portfolio = portfolio_response.data[0]
        logger.info(f"Found portfolio: {portfolio}")
        
        # Use specific generation if provided, otherwise get the latest active one
        generation = None
        if generation_id:
            try:
                logger.info(f"Fetching specific generation with ID: {generation_id}")
                generation_response = db.table("template_portfolio_generations") \
                    .select("*") \
                    .eq("id", generation_id) \
                    .execute()
                
                if not generation_response.data or len(generation_response.data) == 0:
                    logger.warning(f"Generation with ID {generation_id} not found")
                    raise HTTPException(status_code=404, detail=f"Generation with ID {generation_id} not found")
                
                generation = generation_response.data[0]
                logger.info(f"Found specific generation: {generation}")
                
            except Exception as e:
                logger.error(f"Error fetching specific generation: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to fetch generation: {str(e)}")
        else:
            # Get the latest active generation for this portfolio template
            try:
                logger.info(f"Fetching latest generation for portfolio ID: {portfolio_id}")
                generation_response = db.table("template_portfolio_generations") \
                    .select("*") \
                    .eq("available_portfolio_id", portfolio_id) \
                    .eq("status", "active") \
                    .order("version_number", desc=True) \
                    .limit(1) \
                    .execute()
                
                logger.info(f"Generation response data: {generation_response.data}")
                
                if not generation_response.data or len(generation_response.data) == 0:
                    logger.warning(f"No active generations found for portfolio ID: {portfolio_id}")
                    # We'll still continue, but with no generation information
                    generation = None
                else:
                    generation = generation_response.data[0]
                    logger.info(f"Using generation: {generation}")
            except Exception as e:
                logger.error("=== Generation Query Error ===")
                logger.error(f"Error type: {type(e)}")
                logger.error(f"Error message: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to fetch generation: {str(e)}")

        # Get portfolio funds for the latest generation
        try:
            if generation:
                logger.info(f"Fetching funds for generation ID: {generation['id']}")
                portfolio_funds_response = db.table("available_portfolio_funds") \
                    .select("*") \
                    .eq("template_portfolio_generation_id", generation['id']) \
                    .execute()
            else:
                logger.warning("No generation found, skipping fund retrieval")
                portfolio_funds_response = None
                
            if portfolio_funds_response:
                logger.info(f"Portfolio funds response data: {portfolio_funds_response.data}")
                logger.info(f"Number of funds found: {len(portfolio_funds_response.data) if portfolio_funds_response.data else 0}")
            else:
                logger.info("No portfolio funds response available")
        except Exception as e:
            logger.error("=== Portfolio Funds Query Error ===")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error message: {str(e)}")
            logger.error(f"Error args: {e.args}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio funds: {str(e)}")
        
        funds = []
        if portfolio_funds_response and portfolio_funds_response.data:
            for idx, portfolio_fund in enumerate(portfolio_funds_response.data):
                try:
                    logger.info(f"Processing fund {idx + 1} of {len(portfolio_funds_response.data)}")
                    logger.info(f"Portfolio fund data: {portfolio_fund}")
                    
                    # Get fund details
                    fund_response = db.table("available_funds") \
                        .select("*") \
                        .eq("id", portfolio_fund["fund_id"]) \
                        .execute()
                    logger.info(f"Fund details response: {fund_response.data}")
                    
                    fund_detail = {
                        "id": portfolio_fund["id"],
                        "created_at": portfolio_fund["created_at"],
                        "portfolio_id": portfolio_id,  # We're still using the original portfolio ID for consistency
                        "target_weighting": float(portfolio_fund["target_weighting"]) if portfolio_fund["target_weighting"] else 0.0,
                        "fund_id": portfolio_fund["fund_id"],
                        "available_funds": fund_response.data[0] if fund_response.data else {}
                    }
                    funds.append(fund_detail)
                    logger.info(f"Successfully processed fund {idx + 1}: {fund_detail}")
                except Exception as e:
                    logger.error(f"=== Error Processing Fund {idx + 1} ===")
                    logger.error(f"Fund data: {portfolio_fund}")
                    logger.error(f"Error: {str(e)}")
                    continue
        
        # Construct the response
        response = {
            "id": portfolio["id"],
            "created_at": portfolio["created_at"],
            "name": portfolio["name"],
            "funds": funds
        }
        
        # Add generation information if available
        if generation:
            response["generation_id"] = generation["id"]
            response["generation_version"] = generation["version_number"]
            response["generation_name"] = generation["generation_name"]
        
        logger.info(f"Final response: {response}")
        return response

    except Exception as e:
        logger.error("=== Unhandled Error in get_available_portfolio_details ===")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Error args: {e.args}")
        logger.error(f"Portfolio ID: {portfolio_id}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=AvailablePortfolio)
async def create_available_portfolio(portfolio_data: PortfolioCreate, db = Depends(get_db)):
    """Create a new portfolio template with initial generation"""
    try:
        # Create the portfolio template
        new_portfolio = {
            "name": portfolio_data.name
        }
        
        # Insert the template
        portfolio_response = db.table("available_portfolios")\
            .insert(new_portfolio)\
            .execute()
        
        if not portfolio_response.data:
            raise HTTPException(status_code=500, detail="Failed to create portfolio template")
        
        new_portfolio_id = portfolio_response.data[0]["id"]
        logger.info(f"Created portfolio template with ID: {new_portfolio_id}")
        
        # Create the initial generation (version 1)
        generation_data = {
            "available_portfolio_id": new_portfolio_id,
            "version_number": 1,
            "generation_name": portfolio_data.generation_name or f"Initial version of {portfolio_data.name}",
            "description": portfolio_data.description,
            "status": "active"
        }
        
        generation_response = db.table("template_portfolio_generations")\
            .insert(generation_data)\
            .execute()
            
        if not generation_response.data:
            # If generation creation fails, we should clean up the portfolio template
            db.table("available_portfolios").delete().eq("id", new_portfolio_id).execute()
            raise HTTPException(status_code=500, detail="Failed to create initial generation for portfolio template")
        
        new_generation_id = generation_response.data[0]["id"]
        logger.info(f"Created initial generation with ID: {new_generation_id}")
        
        # Add funds if provided
        if portfolio_data.funds:
            for fund in portfolio_data.funds:
                # Verify the fund exists
                fund_exists = db.table("available_funds")\
                    .select("id")\
                    .eq("id", fund.fund_id)\
                    .execute()
                
                if not fund_exists.data:
                    logger.warning(f"Fund {fund.fund_id} does not exist, skipping")
                    continue
                
                # Add the fund to the portfolio generation
                fund_response = db.table("available_portfolio_funds")\
                    .insert({
                        "template_portfolio_generation_id": new_generation_id,
                        "fund_id": fund.fund_id,
                        "target_weighting": fund.target_weighting
                    })\
                    .execute()
                
                if not fund_response.data:
                    logger.warning(f"Failed to add fund {fund.fund_id} to portfolio generation {new_generation_id}")
        
        # Return the new portfolio with ID
        return {
            "id": new_portfolio_id,
            "created_at": portfolio_response.data[0]["created_at"],
            "name": portfolio_data.name
        }
        
    except Exception as e:
        logger.error(f"Error creating portfolio template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/from-template", response_model=dict)
async def create_portfolio_from_template(data: PortfolioFromTemplate, db = Depends(get_db)):
    """Create a new portfolio from a template"""
    # Verify template exists
    template_response = db.table('available_portfolios')\
        .select('*')\
        .eq('id', data.template_id)\
        .single()\
        .execute()
    
    if not template_response.data:
        raise HTTPException(status_code=404, detail="Portfolio template not found")
    
    # Get the latest generation of the template
    latest_generation_response = db.table('template_portfolio_generations')\
        .select('*')\
        .eq('available_portfolio_id', data.template_id)\
        .eq('status', 'active')\
        .order('version_number', desc=True)\
        .limit(1)\
        .execute()
    
    if not latest_generation_response.data:
        raise HTTPException(status_code=404, detail="No active generations found for this template")
    
    latest_generation = latest_generation_response.data[0]
    logger.info(f"Using template generation: {latest_generation['id']} (version {latest_generation['version_number']})")
    
    # Create portfolio from template
    portfolio_response = db.table('portfolios')\
        .insert({
            "portfolio_name": data.portfolio_name,
            "status": "active",
            "start_date": str(date.today()),
            "template_generation_id": data.template_id
        })\
        .execute()
    
    if not portfolio_response.data:
        raise HTTPException(status_code=500, detail="Failed to create portfolio")
    
    new_portfolio = portfolio_response.data[0]
    
    # Get template funds from the latest generation
    template_funds_response = db.table('available_portfolio_funds')\
        .select('*')\
        .eq('template_portfolio_generation_id', latest_generation['id'])\
        .execute()
    
    if not template_funds_response.data:
        return new_portfolio  # Return early if no funds to copy
    
    # Copy funds to new portfolio
    for template_fund in template_funds_response.data:
        portfolio_fund_response = db.table('portfolio_funds')\
            .insert({
                "portfolio_id": new_portfolio["id"],
                "available_funds_id": template_fund["fund_id"],
                "target_weighting": template_fund["target_weighting"],
                "start_date": str(date.today())
            })\
            .execute()
        
        if not portfolio_fund_response.data:
            logger.error(f"Failed to add fund {template_fund['fund_id']} to portfolio {new_portfolio['id']}")
    
    return new_portfolio

@router.delete("/{portfolio_id}", response_model=dict)
async def delete_available_portfolio(portfolio_id: int, db = Depends(get_db)):
    """
    Delete a portfolio template and all its associated generations and funds.
    
    Args:
        portfolio_id: The ID of the portfolio template to delete
        
    Returns:
        A success message and details of what was deleted
    """
    try:
        logger.info(f"Deleting portfolio template with ID: {portfolio_id}")
        
        # First check if portfolio exists
        check_result = db.table("available_portfolios").select("id").eq("id", portfolio_id).execute()
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Portfolio template with ID {portfolio_id} not found")
        
        # Get all generations for this portfolio
        generations_result = db.table("template_portfolio_generations").select("id").eq("available_portfolio_id", portfolio_id).execute()
        
        # Calculate total number of generations
        generations_count = len(generations_result.data) if generations_result.data else 0
        logger.info(f"Found {generations_count} generations for portfolio template {portfolio_id}")
        
        # Get total count of funds across all generations
        funds_count = 0
        if generations_count > 0:
            # For each generation, count its funds
            for generation in generations_result.data:
                generation_id = generation['id']
                funds_result = db.table("available_portfolio_funds").select("id").eq("template_portfolio_generation_id", generation_id).execute()
                funds_count += len(funds_result.data) if funds_result.data else 0
        
        # Delete the template generations (this will cascade delete funds due to ON DELETE CASCADE)
        if generations_count > 0:
            db.table("template_portfolio_generations").delete().eq("available_portfolio_id", portfolio_id).execute()
            logger.info(f"Deleted {generations_count} generations from portfolio template {portfolio_id}")
        
        # Now delete the portfolio template
        result = db.table("available_portfolios").delete().eq("id", portfolio_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to delete portfolio template")
        
        return {
            "message": f"Portfolio template with ID {portfolio_id} deleted successfully",
            "details": {
                "portfolio_deleted": 1,
                "generations_deleted": generations_count,
                "funds_deleted": funds_count
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting portfolio template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/available_portfolio_funds", response_model=List[dict])
async def get_available_portfolio_funds(
    template_portfolio_generation_id: Optional[int] = None,
    fund_id: Optional[int] = None,
    db = Depends(get_db)
):
    """
    Get portfolio funds with optional filtering by template_portfolio_generation_id or fund_id.
    
    Args:
        template_portfolio_generation_id: Optional filter by template portfolio generation ID (as int)
        fund_id: Optional filter by fund ID (as int)
        
    Returns:
        List of portfolio funds
    """
    try:
        logger.info("=== get_available_portfolio_funds called ===")
        logger.info(f"template_portfolio_generation_id: {template_portfolio_generation_id}")
        logger.info(f"fund_id: {fund_id}")
        
        query = db.table("available_portfolio_funds").select("*")
        
        if template_portfolio_generation_id is not None:
            query = query.eq("template_portfolio_generation_id", template_portfolio_generation_id)
            
        if fund_id is not None:
            query = query.eq("fund_id", fund_id)
        
        logger.info(f"Executing query with template_portfolio_generation_id={template_portfolio_generation_id}, fund_id={fund_id}")
        result = query.execute()
        logger.info(f"Query result: {result.data}")
        
        if not result.data:
             return []

        return result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching available portfolio funds: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error args: {e.args}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio funds: {str(e)}")

@router.get("/available_portfolio_funds/by-fund/{fund_id}", response_model=List[dict])
async def get_portfolio_funds_by_fund_id(
    fund_id: int,
    db = Depends(get_db)
):
    """
    Get portfolio funds for a specific fund ID using a path parameter to avoid validation issues.
    
    Args:
        fund_id: The fund ID to search for (as part of the URL path)
        
    Returns:
        List of portfolio funds using this fund
    """
    try:
        logger.info(f"=== get_portfolio_funds_by_fund_id called with fund_id: {fund_id} ===")
        
        # Build query with the fund_id in the path parameter
        query = db.table("available_portfolio_funds").select("*").eq("fund_id", fund_id)
        logger.info(f"Executing query for fund_id={fund_id}")
        
        result = query.execute()
        logger.info(f"Query result: {result.data}")
        
        return result.data
    except Exception as e:
        logger.error(f"Error fetching portfolio funds for fund ID {fund_id}: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error args: {e.args}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio funds: {str(e)}")

@router.get("/{portfolio_id}/generations", response_model=List[GenerationDetail])
async def get_portfolio_generations(portfolio_id: int, db = Depends(get_db)):
    """Get all generations for a portfolio template"""
    try:
        # Verify template exists
        template_response = db.table('available_portfolios')\
            .select('*')\
            .eq('id', portfolio_id)\
            .single()\
            .execute()
        
        if not template_response.data:
            raise HTTPException(status_code=404, detail="Portfolio template not found")
        
        # Get all generations for this template, ordered by version number
        generations_response = db.table('template_portfolio_generations')\
            .select('*')\
            .eq('available_portfolio_id', portfolio_id)\
            .order('version_number', desc=True)\
            .execute()
        
        return generations_response.data or []
    except Exception as e:
        logger.error(f"Error fetching generations for portfolio {portfolio_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{portfolio_id}/generations", response_model=GenerationDetail)
async def create_portfolio_generation(portfolio_id: int, generation_data: GenerationCreate, db = Depends(get_db)):
    """Create a new generation for a portfolio template"""
    try:
        # Check if portfolio exists
        portfolio_response = db.table('available_portfolios')\
            .select('*')\
            .eq('id', portfolio_id)\
            .single()\
            .execute()
        
        if not portfolio_response.data:
            raise HTTPException(status_code=404, detail=f"Portfolio template with ID {portfolio_id} not found")
        
        # Get the latest generation to determine the next version number
        latest_generation_response = db.table('template_portfolio_generations')\
            .select('version_number')\
            .eq('available_portfolio_id', portfolio_id)\
            .order('version_number', desc=True)\
            .limit(1)\
            .execute()
        
        next_version = 1
        if latest_generation_response.data and len(latest_generation_response.data) > 0:
            next_version = latest_generation_response.data[0]['version_number'] + 1
        
        # Create new generation
        new_generation = {
            "available_portfolio_id": portfolio_id,
            "version_number": next_version,
            "generation_name": generation_data.generation_name,
            "description": generation_data.description,
            "status": "draft"  # New generations start as drafts
        }
        
        generation_response = db.table('template_portfolio_generations')\
            .insert(new_generation)\
            .execute()
        
        if not generation_response.data:
            raise HTTPException(status_code=500, detail="Failed to create new generation")
        
        new_generation_id = generation_response.data[0]['id']
        logger.info(f"Created new generation with ID: {new_generation_id}")
        
        # Handle funds - either copy from existing generation or add new funds
        if generation_data.copy_from_generation_id:
            source_generation_response = db.table('template_portfolio_generations')\
                .select('*')\
                .eq('id', generation_data.copy_from_generation_id)\
                .single()\
                .execute()
            
            if not source_generation_response.data:
                logger.warning(f"Source generation ID {generation_data.copy_from_generation_id} not found for copying funds")
            else:
                # Get funds from source generation
                source_funds_response = db.table('available_portfolio_funds')\
                    .select('*')\
                    .eq('template_portfolio_generation_id', generation_data.copy_from_generation_id)\
                    .execute()
                
                if source_funds_response.data and len(source_funds_response.data) > 0:
                    # Copy each fund to the new generation
                    for source_fund in source_funds_response.data:
                        new_fund = {
                            "template_portfolio_generation_id": new_generation_id,
                            "fund_id": source_fund['fund_id'],
                            "target_weighting": source_fund['target_weighting']
                        }
                        
                        db.table('available_portfolio_funds')\
                            .insert(new_fund)\
                            .execute()
                    
                    logger.info(f"Copied {len(source_funds_response.data)} funds from generation {generation_data.copy_from_generation_id} to {new_generation_id}")
        elif generation_data.funds:
            # Add new funds directly from the request
            for fund in generation_data.funds:
                # Verify the fund exists
                fund_exists = db.table("available_funds")\
                    .select("id")\
                    .eq("id", fund.fund_id)\
                    .execute()
                
                if not fund_exists.data:
                    logger.warning(f"Fund {fund.fund_id} does not exist, skipping")
                    continue
                
                # Add the fund to the portfolio generation
                fund_response = db.table("available_portfolio_funds")\
                    .insert({
                        "template_portfolio_generation_id": new_generation_id,
                        "fund_id": fund.fund_id,
                        "target_weighting": fund.target_weighting
                    })\
                    .execute()
                
                if not fund_response.data:
                    logger.warning(f"Failed to add fund {fund.fund_id} to generation {new_generation_id}")
                    
            logger.info(f"Added {len(generation_data.funds)} funds to generation {new_generation_id}")
        
        # Return the newly created generation
        return generation_response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating new generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{portfolio_id}/generations/{generation_id}", response_model=GenerationDetail)
async def update_generation(
    portfolio_id: int, 
    generation_id: int, 
    update_data: Union[GenerationStatusUpdate, GenerationUpdate], 
    db = Depends(get_db)
):
    """Update a generation's details, including status and/or funds"""
    try:
        # Check if generation exists and belongs to the specified portfolio
        generation_response = db.table('template_portfolio_generations')\
            .select('*')\
            .eq('id', generation_id)\
            .eq('available_portfolio_id', portfolio_id)\
            .single()\
            .execute()
        
        if not generation_response.data:
            raise HTTPException(
                status_code=404, 
                detail=f"Generation with ID {generation_id} not found for portfolio {portfolio_id}"
            )
        
        # Handle status updates
        if hasattr(update_data, 'status') and update_data.status:
            # Validate status value
            valid_statuses = ['active', 'draft', 'archived']
            if update_data.status not in valid_statuses:
                raise HTTPException(
                    status_code=422, 
                    detail=f"Invalid status value. Must be one of: {', '.join(valid_statuses)}"
                )
            
            # If setting to 'active', deactivate all other generations for this portfolio
            if update_data.status == 'active':
                # Find all other active generations for this portfolio
                other_active_response = db.table('template_portfolio_generations')\
                    .select('id')\
                    .eq('available_portfolio_id', portfolio_id)\
                    .eq('status', 'active')\
                    .neq('id', generation_id)\
                    .execute()
                
                if other_active_response.data:
                    for other_generation in other_active_response.data:
                        # Set other generations to 'archived'
                        db.table('template_portfolio_generations')\
                            .update({'status': 'archived'})\
                            .eq('id', other_generation['id'])\
                            .execute()
                    
                    logger.info(f"Archived {len(other_active_response.data)} previously active generations for portfolio {portfolio_id}")
        
        # Prepare update data
        generation_updates = {}
        if hasattr(update_data, 'generation_name') and update_data.generation_name is not None:
            generation_updates['generation_name'] = update_data.generation_name
        
        if hasattr(update_data, 'description') and update_data.description is not None:
            generation_updates['description'] = update_data.description
            
        if hasattr(update_data, 'status') and update_data.status is not None:
            generation_updates['status'] = update_data.status
        
        # Add updated timestamp
        generation_updates['updated_at'] = 'now()'
            
        # Update the generation details
        if generation_updates:
            update_response = db.table('template_portfolio_generations')\
                .update(generation_updates)\
                .eq('id', generation_id)\
                .execute()
            
            if not update_response.data:
                raise HTTPException(status_code=500, detail="Failed to update generation details")
            
            logger.info(f"Updated details for generation {generation_id}")
        
        # Handle fund updates if provided
        if hasattr(update_data, 'funds') and update_data.funds is not None:
            # First, delete existing funds for this generation
            db.table('available_portfolio_funds')\
                .delete()\
                .eq('template_portfolio_generation_id', generation_id)\
                .execute()
            
            logger.info(f"Removed existing funds from generation {generation_id}")
            
            # Add the new funds
            for fund in update_data.funds:
                # Verify the fund exists
                fund_exists = db.table("available_funds")\
                    .select("id")\
                    .eq("id", fund.fund_id)\
                    .execute()
                
                if not fund_exists.data:
                    logger.warning(f"Fund {fund.fund_id} does not exist, skipping")
                    continue
                
                # Add the fund to the portfolio generation
                fund_response = db.table("available_portfolio_funds")\
                    .insert({
                        "template_portfolio_generation_id": generation_id,
                        "fund_id": fund.fund_id,
                        "target_weighting": fund.target_weighting
                    })\
                    .execute()
                
                if not fund_response.data:
                    logger.warning(f"Failed to add fund {fund.fund_id} to generation {generation_id}")
            
            logger.info(f"Added {len(update_data.funds)} funds to generation {generation_id}")
        
        # Get the updated generation to return
        updated_generation = db.table('template_portfolio_generations')\
            .select('*')\
            .eq('id', generation_id)\
            .single()\
            .execute()
        
        return updated_generation.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/generations/{generation_id}", response_model=GenerationDetail)
async def get_generation_by_id(generation_id: int, db = Depends(get_db)):
    """Get a specific generation by ID"""
    try:
        # Get the generation details
        generation_response = db.table('template_portfolio_generations')\
            .select('*')\
            .eq('id', generation_id)\
            .single()\
            .execute()
        
        if not generation_response.data:
            raise HTTPException(status_code=404, detail=f"Generation with ID {generation_id} not found")
        
        return generation_response.data
    except Exception as e:
        logger.error(f"Error fetching generation {generation_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available_portfolio_funds/generation/{generation_id}", response_model=List[dict])
async def get_available_portfolio_funds_by_generation(
    generation_id: int,
    db = Depends(get_db)
):
    """
    Get portfolio funds for a specific generation ID using a path parameter to avoid validation issues.
    
    Args:
        generation_id: The generation ID to search for (as part of the URL path)
        
    Returns:
        List of portfolio funds for this generation
    """
    try:
        logger.info(f"=== get_available_portfolio_funds_by_generation called with generation_id: {generation_id} ===")
        
        # Build query with the generation_id in the path parameter
        query = db.table("available_portfolio_funds").select("*").eq("template_portfolio_generation_id", generation_id)
        logger.info(f"Executing query for generation_id={generation_id}")
        
        result = query.execute()
        logger.info(f"Query result: {result.data}")
        
        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching portfolio funds for generation ID {generation_id}: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error args: {e.args}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio funds: {str(e)}")

@router.get("/template-portfolio-generations/active", response_model=List[dict])
async def get_active_template_portfolio_generations(db = Depends(get_db)):
    """Get all template portfolio generations that are not inactive"""
    try:
        logger.info("Fetching active template portfolio generations")
        
        # Get all template portfolio generations that are not inactive
        response = db.table('template_portfolio_generations')\
            .select('id, generation_name, available_portfolio_id, status, version_number')\
            .neq('status', 'inactive')\
            .order('generation_name')\
            .execute()
        
        if not response.data:
            logger.info("No active template portfolio generations found")
            return []
        
        logger.info(f"Found {len(response.data)} active template portfolio generations")
        return response.data
        
    except Exception as e:
        logger.error(f"Error fetching active template portfolio generations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 