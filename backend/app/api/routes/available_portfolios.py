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
    weighted_risk: Optional[float] = None
    generation_id: Optional[int] = None
    generation_name: Optional[str] = None

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
    generation_name: Optional[str] = None
    weighted_risk: Optional[float] = None
    funds: List[PortfolioFundDetail] = []

    class Config:
        from_attributes = True

class PortfolioFromTemplate(BaseModel):
    template_id: int
    portfolio_name: str

class GenerationDetail(BaseModel):
    id: int
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
    created_at: Optional[datetime] = None  # Allow custom created_at date for backlogged generations

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

                portfolio_id = int(portfolio['id'])
                
                # Get the latest active generation for this portfolio
                weighted_risk = None
                generation_id = None
                generation_name = None
                
                try:
                    logger.info(f"Fetching latest generation for portfolio {portfolio_id}")
                    generations_response = db.table("template_portfolio_generations") \
                        .select("id, generation_name, status") \
                        .eq("available_portfolio_id", portfolio_id) \
                        .eq("status", "active") \
                        .order("created_at", desc=True) \
                        .limit(1) \
                        .execute()
                    
                    if generations_response.data:
                        latest_generation = generations_response.data[0]
                        generation_id = latest_generation["id"]
                        generation_name = latest_generation["generation_name"]
                        
                        logger.info(f"Found latest generation {generation_id} for portfolio {portfolio_id}")
                        
                        # Get weighted risk from the view
                        weighted_risk_response = db.table("template_generation_weighted_risk") \
                            .select("weighted_risk") \
                            .eq("generation_id", generation_id) \
                            .execute()
                        
                        if weighted_risk_response.data and weighted_risk_response.data[0].get("weighted_risk"):
                            weighted_risk = float(weighted_risk_response.data[0]["weighted_risk"])
                            logger.info(f"Found weighted risk {weighted_risk} for generation {generation_id}")
                        else:
                            logger.info(f"No weighted risk found for generation {generation_id}")
                    else:
                        logger.info(f"No active generations found for portfolio {portfolio_id}")
                        
                except Exception as e:
                    logger.warning(f"Failed to fetch weighted risk for portfolio {portfolio_id}: {e}")

                # Create model with explicit type conversion
                portfolio_model = AvailablePortfolio(
                    id=portfolio_id,
                    created_at=str(portfolio['created_at']),
                    name=portfolio.get('name'),
                    weighted_risk=weighted_risk,
                    generation_id=generation_id,
                    generation_name=generation_name
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


@router.get("/bulk-with-counts", response_model=List[dict])
async def get_portfolio_templates_with_counts(db = Depends(get_db)):
    """Optimized endpoint to get portfolio templates with portfolio counts in a single query"""
    try:
        logger.info("=== Starting bulk portfolio templates with counts ===")
        
        # Get all portfolio templates
        templates_response = db.table('available_portfolios').select('*').execute()
        
        if not templates_response.data:
            return []
        
        # Get all generations in one query
        generations_response = db.table("template_portfolio_generations") \
            .select("id, available_portfolio_id, generation_name, status, created_at") \
            .eq("status", "active") \
            .execute()
        
        # Get all weighted risks in one query
        if generations_response.data:
            generation_ids = [g["id"] for g in generations_response.data]
            weighted_risks_response = db.table("template_generation_weighted_risk") \
                .select("generation_id, weighted_risk") \
                .in_("generation_id", generation_ids) \
                .execute()
            
            # Create lookup map for weighted risks
            weighted_risks_map = {
                wr["generation_id"]: float(wr["weighted_risk"]) 
                for wr in weighted_risks_response.data or []
                if wr.get("weighted_risk")
            }
        else:
            weighted_risks_map = {}
        
        # Get portfolio counts for all generations in one query
        if generations_response.data:
            portfolio_counts_response = db.table("portfolios") \
                .select("template_generation_id") \
                .in_("template_generation_id", generation_ids) \
                .execute()
            
            # Count portfolios per generation
            portfolio_counts_map = {}
            for portfolio in portfolio_counts_response.data or []:
                gen_id = portfolio["template_generation_id"]
                portfolio_counts_map[gen_id] = portfolio_counts_map.get(gen_id, 0) + 1
        else:
            portfolio_counts_map = {}
        
        # Create lookup map for generations by template
        generations_map = {}
        for gen in generations_response.data or []:
            template_id = gen["available_portfolio_id"]
            if template_id not in generations_map:
                generations_map[template_id] = []
            generations_map[template_id].append(gen)
        
        # Sort generations by created_at desc for each template
        for template_id in generations_map:
            generations_map[template_id].sort(key=lambda x: x["created_at"], reverse=True)
        
        # Build result
        result = []
        for template in templates_response.data:
            template_id = template["id"]
            template_generations = generations_map.get(template_id, [])
            
            # Get latest generation data
            latest_generation = template_generations[0] if template_generations else None
            
            # Calculate total portfolio count for this template
            total_portfolio_count = sum(
                portfolio_counts_map.get(gen["id"], 0) 
                for gen in template_generations
            )
            
            template_data = {
                "id": template_id,
                "name": template.get("name"),
                "created_at": template.get("created_at"),
                "portfolioCount": total_portfolio_count,
                "weighted_risk": weighted_risks_map.get(latest_generation["id"]) if latest_generation else None,
                "generation_id": latest_generation["id"] if latest_generation else None,
                "generation_name": latest_generation["generation_name"] if latest_generation else None,
                "status": template.get("status", "active")
            }
            
            result.append(template_data)
        
        logger.info(f"Successfully processed {len(result)} portfolio templates with counts")
        return result
        
    except Exception as e:
        logger.error(f"Error in bulk portfolio templates with counts: {str(e)}")
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
                    .order("created_at", desc=True) \
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
        
        # Get weighted risk for the generation if available
        weighted_risk = None
        if generation:
            try:
                logger.info(f"Fetching weighted risk for generation ID: {generation['id']}")
                weighted_risk_response = db.table("template_generation_weighted_risk") \
                    .select("weighted_risk") \
                    .eq("generation_id", generation['id']) \
                    .execute()
                
                if weighted_risk_response.data and len(weighted_risk_response.data) > 0:
                    weighted_risk = weighted_risk_response.data[0].get("weighted_risk")
                    logger.info(f"Found weighted risk: {weighted_risk}")
                else:
                    logger.info("No weighted risk found for this generation")
            except Exception as e:
                logger.error(f"Error fetching weighted risk: {str(e)}")
                # Continue without weighted risk rather than failing the whole request
        
        # Construct the response
        response = {
            "id": portfolio["id"],
            "created_at": portfolio["created_at"],
            "name": portfolio["name"],
            "funds": funds,
            "weighted_risk": weighted_risk  # Add weighted risk to the response
        }
        
        # Add generation information if available
        if generation:
            response["generation_id"] = generation["id"]
            # Version numbers are no longer used
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
        
        # Create the initial generation
        generation_data = {
            "available_portfolio_id": new_portfolio_id,
            "generation_name": portfolio_data.generation_name or f"Initial generation of {portfolio_data.name}",
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
        .order('created_at', desc=True)\
        .limit(1)\
        .execute()
    
    if not latest_generation_response.data:
        raise HTTPException(status_code=404, detail="No active generations found for this template")
    
    latest_generation = latest_generation_response.data[0]
    logger.info(f"Using template generation: {latest_generation['id']}")
    
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
        
        # Get all generations for this template, ordered by creation date (newest first)
        generations_response = db.table('template_portfolio_generations')\
            .select('*')\
            .eq('available_portfolio_id', portfolio_id)\
            .order('created_at', desc=True)\
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
        
        # Create new generation
        new_generation = {
            "available_portfolio_id": portfolio_id,
            "generation_name": generation_data.generation_name,
            "description": generation_data.description,
            "status": "draft"  # New generations start as drafts
        }
        
        # Use custom created_at date if provided (for backlogged generations)
        if generation_data.created_at:
            new_generation['created_at'] = generation_data.created_at.isoformat()
        
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

@router.delete("/{portfolio_id}/generations/{generation_id}", response_model=dict)
async def delete_generation(portfolio_id: int, generation_id: int, db = Depends(get_db)):
    """
    Delete a specific generation of a portfolio template.
    
    Args:
        portfolio_id: The ID of the portfolio template
        generation_id: The ID of the generation to delete
        
    Returns:
        A success message and details of what was deleted
    """
    try:
        logger.info(f"Deleting generation {generation_id} from portfolio template {portfolio_id}")
        
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
        
        generation = generation_response.data
        
        # Check if any portfolios are using this generation
        portfolios_using_generation = db.table("portfolios")\
            .select("id")\
            .eq("template_generation_id", generation_id)\
            .execute()
        
        if portfolios_using_generation.data and len(portfolios_using_generation.data) > 0:
            portfolio_count = len(portfolios_using_generation.data)
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete generation '{generation['generation_name']}' - {portfolio_count} portfolio(s) are using this generation"
            )
        
        # Get count of funds that will be deleted
        funds_response = db.table("available_portfolio_funds")\
            .select("id")\
            .eq("template_portfolio_generation_id", generation_id)\
            .execute()
        
        funds_count = len(funds_response.data) if funds_response.data else 0
        
        # Delete the generation (this will cascade delete funds due to ON DELETE CASCADE)
        delete_result = db.table("template_portfolio_generations")\
            .delete()\
            .eq("id", generation_id)\
            .execute()
        
        if not delete_result.data or len(delete_result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to delete generation")
        
        logger.info(f"Successfully deleted generation {generation_id} and {funds_count} associated funds")
        
        return {
            "message": f"Generation '{generation['generation_name']}' deleted successfully",
            "details": {
                "generation_id": generation_id,
                "generation_name": generation['generation_name'],
                "funds_deleted": funds_count
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting generation: {str(e)}")
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
            .select('id, generation_name, available_portfolio_id, status')\
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

@router.get("/batch/generation-with-funds/{generation_id}", response_model=dict)
async def get_generation_with_funds_batch(generation_id: int, db = Depends(get_db)):
    """
    Optimized batch endpoint to fetch both generation details and portfolio funds in a single request.
    This eliminates the need for 2 separate API calls in the ProductOverview component.
    
    Returns combined data structure with both generation info and funds.
    """
    try:
        logger.info(f"🚀 Batch fetching generation and funds for generation_id: {generation_id}")
        
        # Fetch both generation details and portfolio funds in parallel
        generation_response = db.table('template_portfolio_generations').select('*').eq('id', generation_id).execute()
        funds_response = db.table('available_portfolio_funds').select('*').eq('template_portfolio_generation_id', generation_id).execute()
        
        if not generation_response.data:
            logger.warning(f"No generation found with ID: {generation_id}")
            raise HTTPException(status_code=404, detail="Template generation not found")
        
        generation_data = generation_response.data[0]
        funds_data = funds_response.data if funds_response.data else []
        
        # Create template weightings map for easier frontend consumption
        template_weightings = {}
        for fund in funds_data:
            if fund.get('fund_id') and fund.get('target_weighting') is not None:
                template_weightings[fund['fund_id']] = fund['target_weighting']
        
        result = {
            "generation": generation_data,
            "funds": funds_data,
            "template_weightings": template_weightings,
            "count": {
                "generation": len(generation_response.data),
                "funds": len(funds_data)
            }
        }
        
        logger.info(f"✅ Batch fetch complete - Generation: {generation_data.get('generation_name')}, Funds: {len(funds_data)}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch generation/funds fetch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{portfolio_id}/linked-products", response_model=List[dict])
async def get_products_linked_to_template(portfolio_id: int, db = Depends(get_db)):
    """
    Get all products that are linked to this portfolio template through their template generations.
    
    Products can be linked to a template in two ways:
    1. Through their portfolio's template_generation_id
    2. Directly through their own template_generation_id
    
    Args:
        portfolio_id: The ID of the portfolio template
        
    Returns:
        List of products with client and provider information
    """
    try:
        logger.info(f"Fetching products linked to portfolio template {portfolio_id}")
        
        # First, get all generations for this portfolio template
        generations_response = db.table('template_portfolio_generations')\
            .select('id')\
            .eq('available_portfolio_id', portfolio_id)\
            .execute()
        
        if not generations_response.data:
            logger.info(f"No generations found for portfolio template {portfolio_id}")
            return []
        
        generation_ids = [gen['id'] for gen in generations_response.data]
        logger.info(f"Found {len(generation_ids)} generations for template {portfolio_id}")
        
        # Query products linked through portfolios (where portfolio.template_generation_id matches)
        products_via_portfolio = db.table('client_products')\
            .select('*')\
            .not_.is_('portfolio_id', 'null')\
            .execute()
        
        # Query products directly linked to template generations
        products_direct = db.table('client_products')\
            .select('*')\
            .in_('template_generation_id', generation_ids)\
            .execute()
        
        # Helper function to enrich product with related data
        async def enrich_product(product):
            # Fetch client group
            if product.get('client_id'):
                client_response = db.table('client_groups')\
                    .select('id, name, advisor')\
                    .eq('id', product['client_id'])\
                    .execute()
                product['client_groups'] = client_response.data[0] if client_response.data else None
            
            # Fetch provider
            if product.get('provider_id'):
                provider_response = db.table('available_providers')\
                    .select('id, name, theme_color')\
                    .eq('id', product['provider_id'])\
                    .execute()
                product['available_providers'] = provider_response.data[0] if provider_response.data else None
            
            # Fetch portfolio
            if product.get('portfolio_id'):
                portfolio_response = db.table('portfolios')\
                    .select('id, portfolio_name, template_generation_id')\
                    .eq('id', product['portfolio_id'])\
                    .execute()
                product['portfolios'] = portfolio_response.data[0] if portfolio_response.data else None
            
            return product
        
        # Combine and deduplicate results
        all_products = []
        seen_product_ids = set()
        
        # Add products from portfolio links (filter by portfolio's template_generation_id)
        if products_via_portfolio.data:
            for product in products_via_portfolio.data:
                if product['id'] not in seen_product_ids:
                    # Enrich product with related data
                    enriched_product = await enrich_product(product.copy())
                    
                    # Check if this product's portfolio is linked to our template
                    portfolio = enriched_product.get('portfolios')
                    if portfolio and portfolio.get('template_generation_id') in generation_ids:
                        enriched_product['link_type'] = 'portfolio'
                        all_products.append(enriched_product)
                        seen_product_ids.add(product['id'])
        
        # Add products from direct links
        if products_direct.data:
            for product in products_direct.data:
                if product['id'] not in seen_product_ids:
                    # Enrich product with related data
                    enriched_product = await enrich_product(product.copy())
                    enriched_product['link_type'] = 'direct'
                    all_products.append(enriched_product)
                    seen_product_ids.add(product['id'])
        
        logger.info(f"Found {len(all_products)} total products linked to template {portfolio_id}")
        
        # Log sample product for debugging
        if all_products:
            logger.info(f"Sample product structure: {all_products[0]}")
        
        # Sort by client name, then product name
        all_products.sort(key=lambda x: (
            x.get('client_groups', {}).get('name', '') if x.get('client_groups') else '',
            x.get('product_name', '')
        ))
        
        return all_products
        
    except Exception as e:
        logger.error(f"Error fetching products linked to template {portfolio_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 