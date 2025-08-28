from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional, Dict, Any, Union
from datetime import date, datetime
from app.db.database import get_db
from pydantic import BaseModel
import logging
import sys


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

class PortfolioTemplateUpdate(BaseModel):
    name: Optional[str] = None
    created_at: Optional[datetime] = None

router = APIRouter(prefix="/available_portfolios")

@router.get("", response_model=List[AvailablePortfolio])
async def get_available_portfolios(db = Depends(get_db)):
    """Get all available portfolio templates"""
    try:
        logger.info("=== Starting get_available_portfolios ===")
        
        # Execute PostgreSQL query
        try:
            response = await db.fetch("SELECT * FROM available_portfolios")
        except Exception as e:
            logger.error(f"Failed to execute PostgreSQL query: {str(e)}")
            raise HTTPException(status_code=500, detail="Database query failed")

        # Log the raw response
        logger.info("=== PostgreSQL Response ===")
        logger.info(f"Response type: {type(response)}")
        logger.info(f"Response length: {len(response) if response else 0}")

        if not response:
            logger.info("No portfolios found")
            return []

        # Process each portfolio with detailed error handling
        portfolios = []
        for idx, portfolio_record in enumerate(response):
            try:
                portfolio = dict(portfolio_record)
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
                    generations_response = await db.fetchrow(
                        "SELECT id, generation_name, status FROM template_portfolio_generations WHERE available_portfolio_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
                        portfolio_id
                    )
                    
                    if generations_response:
                        latest_generation = dict(generations_response)
                        generation_id = latest_generation["id"]
                        generation_name = latest_generation["generation_name"]
                        
                        logger.info(f"Found latest generation {generation_id} for portfolio {portfolio_id}")
                        
                        # Get weighted risk from the view
                        weighted_risk_response = await db.fetchrow(
                            "SELECT weighted_risk_factor FROM template_generation_weighted_risk WHERE id = $1",
                            generation_id
                        )
                        
                        if weighted_risk_response and weighted_risk_response.get("weighted_risk_factor"):
                            weighted_risk = float(weighted_risk_response["weighted_risk_factor"])
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
        templates_response = await db.fetch("SELECT * FROM available_portfolios")
        
        if not templates_response:
            return []
        
        # Get all generations in one query
        generations_response = await db.fetch(
            "SELECT id, available_portfolio_id, generation_name, status, created_at FROM template_portfolio_generations WHERE status = 'active'"
        )
        
        # Get all weighted risks in one query
        if generations_response:
            generation_ids = [g["id"] for g in generations_response]
            weighted_risks_response = await db.fetch(
                "SELECT id, weighted_risk_factor FROM template_generation_weighted_risk WHERE id = ANY($1::int[])",
                generation_ids
            )
            
            # Create lookup map for weighted risks
            weighted_risks_map = {
                wr["id"]: float(wr["weighted_risk_factor"]) 
                for wr in weighted_risks_response or []
                if wr.get("weighted_risk_factor")
            }
        else:
            weighted_risks_map = {}
        
        # Get portfolio counts for all generations in one query
        if generations_response:
            portfolio_counts_response = await db.fetch(
                "SELECT template_generation_id FROM portfolios WHERE template_generation_id = ANY($1::int[])",
                generation_ids
            )
            
            # Count portfolios per generation
            portfolio_counts_map = {}
            for portfolio in portfolio_counts_response or []:
                gen_id = portfolio["template_generation_id"]
                portfolio_counts_map[gen_id] = portfolio_counts_map.get(gen_id, 0) + 1
        else:
            portfolio_counts_map = {}
        
        # Create lookup map for generations by template
        generations_map = {}
        for gen in generations_response or []:
            template_id = gen["available_portfolio_id"]
            if template_id not in generations_map:
                generations_map[template_id] = []
            generations_map[template_id].append(gen)
        
        # Sort generations by created_at desc for each template
        for template_id in generations_map:
            generations_map[template_id].sort(key=lambda x: x["created_at"], reverse=True)
        
        # Build result
        result = []
        for template in templates_response:
            template = dict(template)
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
async def get_available_portfolio_details(request: Request, portfolio_id: int, generation_id: Optional[int] = None, db = Depends(get_db)):
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
            portfolio_response = await db.fetchrow("SELECT * FROM available_portfolios WHERE id = $1", portfolio_id)
            logger.info(f"Portfolio response data: {portfolio_response}")
            logger.info(f"Portfolio response type: {type(portfolio_response)}")
        except Exception as e:
            logger.error("=== Portfolio Query Error ===")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error message: {str(e)}")
            logger.error(f"Error args: {e.args}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio: {str(e)}")

        if not portfolio_response:
            logger.warning(f"No portfolio found with ID: {portfolio_id}")
            raise HTTPException(status_code=404, detail="Portfolio template not found")
        
        portfolio = dict(portfolio_response)
        logger.info(f"Found portfolio: {portfolio}")
        
        # Use specific generation if provided, otherwise get the latest active one
        generation = None
        if generation_id:
            try:
                logger.info(f"Fetching specific generation with ID: {generation_id}")
                generation_response = await db.fetchrow(
                    "SELECT * FROM template_portfolio_generations WHERE id = $1", 
                    generation_id
                )
                
                if not generation_response:
                    logger.warning(f"Generation with ID {generation_id} not found")
                    raise HTTPException(status_code=404, detail=f"Generation with ID {generation_id} not found")
                
                generation = dict(generation_response)
                logger.info(f"Found specific generation: {generation}")
                
            except Exception as e:
                logger.error(f"Error fetching specific generation: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to fetch generation: {str(e)}")
        else:
            # Get the latest active generation for this portfolio template
            try:
                logger.info(f"Fetching latest generation for portfolio ID: {portfolio_id}")
                generation_response = await db.fetchrow(
                    "SELECT * FROM template_portfolio_generations WHERE available_portfolio_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
                    portfolio_id
                )
                
                logger.info(f"Generation response data: {generation_response}")
                
                if not generation_response:
                    logger.warning(f"No active generations found for portfolio ID: {portfolio_id}")
                    # We'll still continue, but with no generation information
                    generation = None
                else:
                    generation = dict(generation_response)
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
                portfolio_funds_response = await db.fetch(
                    "SELECT * FROM available_portfolio_funds WHERE template_portfolio_generation_id = $1",
                    generation['id']
                )
            else:
                logger.warning("No generation found, skipping fund retrieval")
                portfolio_funds_response = None
                
            if portfolio_funds_response:
                logger.info(f"Portfolio funds response data: {portfolio_funds_response}")
                logger.info(f"Number of funds found: {len(portfolio_funds_response) if portfolio_funds_response else 0}")
            else:
                logger.info("No portfolio funds response available")
        except Exception as e:
            logger.error("=== Portfolio Funds Query Error ===")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error message: {str(e)}")
            logger.error(f"Error args: {e.args}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio funds: {str(e)}")
        
        funds = []
        if portfolio_funds_response:
            for idx, portfolio_fund in enumerate(portfolio_funds_response):
                portfolio_fund = dict(portfolio_fund)
                try:
                    logger.info(f"Processing fund {idx + 1} of {len(portfolio_funds_response)}")
                    logger.info(f"Portfolio fund data: {portfolio_fund}")
                    
                    # Get fund details
                    fund_response = await db.fetchrow(
                        "SELECT * FROM available_funds WHERE id = $1",
                        portfolio_fund["fund_id"]
                    )
                    logger.info(f"Fund details response: {fund_response}")
                    
                    fund_detail = {
                        "id": portfolio_fund["id"],
                        "created_at": portfolio_fund["created_at"],
                        "portfolio_id": portfolio_id,  # We're still using the original portfolio ID for consistency
                        "target_weighting": float(portfolio_fund["target_weighting"]) if portfolio_fund["target_weighting"] else 0.0,
                        "fund_id": portfolio_fund["fund_id"],
                        "available_funds": dict(fund_response) if fund_response else {}
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
                weighted_risk_response = await db.fetchrow(
                    "SELECT weighted_risk_factor FROM template_generation_weighted_risk WHERE id = $1",
                    generation['id']
                )
                
                if weighted_risk_response:
                    weighted_risk = weighted_risk_response.get("weighted_risk_factor")
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
        portfolio_response = await db.fetchrow(
            "INSERT INTO available_portfolios (name) VALUES ($1) RETURNING *",
            new_portfolio["name"]
        )
        
        if not portfolio_response:
            raise HTTPException(status_code=500, detail="Failed to create portfolio template")
        
        new_portfolio_id = portfolio_response["id"]
        logger.info(f"Created portfolio template with ID: {new_portfolio_id}")
        
        # Create the initial generation
        generation_data = {
            "available_portfolio_id": new_portfolio_id,
            "generation_name": portfolio_data.generation_name or f"Initial generation of {portfolio_data.name}",
            "description": portfolio_data.description,
            "status": "active"
        }
        
        generation_response = await db.fetchrow(
            "INSERT INTO template_portfolio_generations (available_portfolio_id, generation_name, description, status) VALUES ($1, $2, $3, $4) RETURNING *",
            generation_data["available_portfolio_id"],
            generation_data["generation_name"], 
            generation_data["description"],
            generation_data["status"]
        )
            
        if not generation_response:
            # If generation creation fails, we should clean up the portfolio template
            await db.execute("DELETE FROM available_portfolios WHERE id = $1", new_portfolio_id)
            raise HTTPException(status_code=500, detail="Failed to create initial generation for portfolio template")
        
        new_generation_id = generation_response["id"]
        logger.info(f"Created initial generation with ID: {new_generation_id}")
        
        # Add funds if provided
        if portfolio_data.funds:
            try:
                async with db.transaction():
                    for fund in portfolio_data.funds:
                        # Verify the fund exists
                        fund_exists = await db.fetchrow(
                            "SELECT id FROM available_funds WHERE id = $1",
                            fund.fund_id
                        )
                        
                        if not fund_exists:
                            logger.warning(f"Fund {fund.fund_id} does not exist, skipping")
                            continue
                        
                        # Add the fund to the portfolio generation
                        fund_response = await db.fetchrow(
                            "INSERT INTO available_portfolio_funds (template_portfolio_generation_id, fund_id, target_weighting) VALUES ($1, $2, $3) RETURNING *",
                            new_generation_id,
                            fund.fund_id,
                            fund.target_weighting
                        )
                        
                        if not fund_response:
                            logger.warning(f"Failed to add fund {fund.fund_id} to portfolio generation {new_generation_id}")
            except Exception as fund_error:
                logger.error(f"Failed to add funds to portfolio generation {new_generation_id}: {str(fund_error)}")
                # Continue without raising exception since portfolio template is already created
        
        # Return the new portfolio with ID
        return {
            "id": new_portfolio_id,
            "created_at": portfolio_response["created_at"],
            "name": portfolio_data.name
        }
        
    except Exception as e:
        logger.error(f"Error creating portfolio template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/from-template", response_model=dict)
async def create_portfolio_from_template(data: PortfolioFromTemplate, db = Depends(get_db)):
    """Create a new portfolio from a template"""
    # Verify template exists
    template_response = await db.fetchrow(
        "SELECT * FROM available_portfolios WHERE id = $1",
        data.template_id
    )
    
    if not template_response:
        raise HTTPException(status_code=404, detail="Portfolio template not found")
    
    # Get the latest generation of the template
    latest_generation_response = await db.fetchrow(
        "SELECT * FROM template_portfolio_generations WHERE available_portfolio_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
        data.template_id
    )
    
    if not latest_generation_response:
        raise HTTPException(status_code=404, detail="No active generations found for this template")
    
    latest_generation = dict(latest_generation_response)
    logger.info(f"Using template generation: {latest_generation['id']}")
    
    # Create portfolio from template
    portfolio_response = await db.fetchrow(
        "INSERT INTO portfolios (portfolio_name, status, start_date, template_generation_id) VALUES ($1, $2, $3, $4) RETURNING *",
        data.portfolio_name,
        "active",
        str(date.today()),
        data.template_id
    )
    
    if not portfolio_response:
        raise HTTPException(status_code=500, detail="Failed to create portfolio")
    
    new_portfolio = dict(portfolio_response)
    
    # Get template funds from the latest generation
    template_funds_response = await db.fetch(
        "SELECT * FROM available_portfolio_funds WHERE template_portfolio_generation_id = $1",
        latest_generation['id']
    )
    
    if not template_funds_response:
        return new_portfolio  # Return early if no funds to copy
    
    # Copy funds to new portfolio
    for template_fund in template_funds_response:
        template_fund = dict(template_fund)
        portfolio_fund_response = await db.fetchrow(
            "INSERT INTO portfolio_funds (portfolio_id, available_funds_id, target_weighting, start_date) VALUES ($1, $2, $3, $4) RETURNING *",
            new_portfolio["id"],
            template_fund["fund_id"],
            template_fund["target_weighting"],
            str(date.today())
        )
        
        if not portfolio_fund_response:
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
        check_result = await db.fetchrow("SELECT id FROM available_portfolios WHERE id = $1", portfolio_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f"Portfolio template with ID {portfolio_id} not found")
        
        # Get all generations for this portfolio
        generations_result = await db.fetch("SELECT id FROM template_portfolio_generations WHERE available_portfolio_id = $1", portfolio_id)
        
        # Calculate total number of generations
        generations_count = len(generations_result) if generations_result else 0
        logger.info(f"Found {generations_count} generations for portfolio template {portfolio_id}")
        
        # Get total count of funds across all generations
        funds_count = 0
        if generations_count > 0:
            # For each generation, count its funds
            for generation in generations_result:
                generation_id = generation['id']
                funds_result = await db.fetch("SELECT id FROM available_portfolio_funds WHERE template_portfolio_generation_id = $1", generation_id)
                funds_count += len(funds_result) if funds_result else 0
        
        # Delete the template generations (this will cascade delete funds due to ON DELETE CASCADE)
        if generations_count > 0:
            await db.execute("DELETE FROM template_portfolio_generations WHERE available_portfolio_id = $1", portfolio_id)
            logger.info(f"Deleted {generations_count} generations from portfolio template {portfolio_id}")
        
        # Now delete the portfolio template
        result = await db.fetchrow("DELETE FROM available_portfolios WHERE id = $1 RETURNING *", portfolio_id)
        
        if not result:
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

@router.put("/{portfolio_id}", response_model=dict)
async def update_portfolio_template(portfolio_id: int, template_update: PortfolioTemplateUpdate, db = Depends(get_db)):
    """
    Update a portfolio template's basic information (name and created_at).
    
    Args:
        portfolio_id: The ID of the portfolio template to update
        template_update: The fields to update
        
    Returns:
        The updated portfolio template
    """
    try:
        logger.info(f"Updating portfolio template with ID: {portfolio_id}")
        
        # Remove None values from the update data
        update_data = {k: v for k, v in template_update.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid update data provided")
        
        # Check if portfolio exists
        check_result = await db.fetchrow("SELECT id FROM available_portfolios WHERE id = $1", portfolio_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f"Portfolio template with ID {portfolio_id} not found")
        
        # Update the portfolio template - Build dynamic query
        set_clauses = []
        params = []
        param_count = 1
        
        for key, value in update_data.items():
            set_clauses.append(f"{key} = ${param_count}")
            params.append(value)
            param_count += 1
        
        params.append(portfolio_id)  # For WHERE clause
        
        query = f"UPDATE available_portfolios SET {', '.join(set_clauses)} WHERE id = ${param_count} RETURNING *"
        result = await db.fetchrow(query, *params)
        
        if result:
            return dict(result)
        
        raise HTTPException(status_code=400, detail="Failed to update portfolio template")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating portfolio template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update portfolio template: {str(e)}")

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
        
        # Build dynamic query with optional filters
        where_clauses = []
        params = []
        param_count = 1
        
        if template_portfolio_generation_id is not None:
            where_clauses.append(f"template_portfolio_generation_id = ${param_count}")
            params.append(template_portfolio_generation_id)
            param_count += 1
            
        if fund_id is not None:
            where_clauses.append(f"fund_id = ${param_count}")
            params.append(fund_id)
            param_count += 1
        
        # Build the complete query
        base_query = "SELECT * FROM available_portfolio_funds"
        if where_clauses:
            query = f"{base_query} WHERE {' AND '.join(where_clauses)}"
        else:
            query = base_query
        
        logger.info(f"Executing query with template_portfolio_generation_id={template_portfolio_generation_id}, fund_id={fund_id}")
        result = await db.fetch(query, *params)
        logger.info(f"Query result: {result}")
        
        if not result:
             return []

        return [dict(fund) for fund in result]
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
        logger.info(f"Executing query for fund_id={fund_id}")
        
        result = await db.fetch(
            "SELECT * FROM available_portfolio_funds WHERE fund_id = $1",
            fund_id
        )
        logger.info(f"Query result: {result}")
        
        return [dict(fund) for fund in result] if result else []
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
        template_response = await db.fetchrow(
            "SELECT * FROM available_portfolios WHERE id = $1",
            portfolio_id
        )
        
        if not template_response:
            raise HTTPException(status_code=404, detail="Portfolio template not found")
        
        # Get all generations for this template, ordered by creation date (newest first)
        generations_response = await db.fetch(
            "SELECT * FROM template_portfolio_generations WHERE available_portfolio_id = $1 ORDER BY created_at DESC",
            portfolio_id
        )
        
        return [dict(gen) for gen in generations_response] if generations_response else []
    except Exception as e:
        logger.error(f"Error fetching generations for portfolio {portfolio_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{portfolio_id}/generations", response_model=GenerationDetail)
async def create_portfolio_generation(portfolio_id: int, generation_data: GenerationCreate, db = Depends(get_db)):
    """Create a new generation for a portfolio template"""
    try:
        # Check if portfolio exists
        portfolio_response = await db.fetchrow(
            "SELECT * FROM available_portfolios WHERE id = $1",
            portfolio_id
        )
        
        if not portfolio_response:
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
        
        generation_response = await db.fetchrow(
            "INSERT INTO template_portfolio_generations (available_portfolio_id, generation_name, description, status, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            new_generation["available_portfolio_id"],
            new_generation["generation_name"],
            new_generation["description"],
            new_generation["status"],
            new_generation.get("created_at")
        )
        
        if not generation_response:
            raise HTTPException(status_code=500, detail="Failed to create new generation")
        
        new_generation_id = generation_response['id']
        logger.info(f"Created new generation with ID: {new_generation_id}")
        
        # Handle funds - either copy from existing generation or add new funds
        if generation_data.copy_from_generation_id:
            source_generation_response = await db.fetchrow(
                "SELECT * FROM template_portfolio_generations WHERE id = $1",
                generation_data.copy_from_generation_id
            )
            
            if not source_generation_response:
                logger.warning(f"Source generation ID {generation_data.copy_from_generation_id} not found for copying funds")
            else:
                # Get funds from source generation
                source_funds_response = await db.fetch(
                    "SELECT * FROM available_portfolio_funds WHERE template_portfolio_generation_id = $1",
                    generation_data.copy_from_generation_id
                )
                
                if source_funds_response and len(source_funds_response) > 0:
                    # Copy each fund to the new generation using transaction for safety
                    try:
                        async with db.transaction():
                            for source_fund in source_funds_response:
                                source_fund = dict(source_fund)
                                new_fund = {
                                    "template_portfolio_generation_id": new_generation_id,
                                    "fund_id": source_fund['fund_id'],
                                    "target_weighting": source_fund['target_weighting']
                                }
                                
                                await db.execute(
                                    "INSERT INTO available_portfolio_funds (template_portfolio_generation_id, fund_id, target_weighting) VALUES ($1, $2, $3)",
                                    new_fund["template_portfolio_generation_id"],
                                    new_fund["fund_id"],
                                    new_fund["target_weighting"]
                                )
                    except Exception as copy_error:
                        logger.error(f"Failed to copy funds from generation {generation_data.copy_from_generation_id}: {str(copy_error)}")
                        raise HTTPException(status_code=500, detail=f"Failed to copy funds: {str(copy_error)}")
                    
                    logger.info(f"Copied {len(source_funds_response)} funds from generation {generation_data.copy_from_generation_id} to {new_generation_id}")
        elif generation_data.funds:
            # Add new funds directly from the request using transaction for safety
            try:
                async with db.transaction():
                    for fund in generation_data.funds:
                        # Verify the fund exists
                        fund_exists = await db.fetchrow(
                            "SELECT id FROM available_funds WHERE id = $1",
                            fund.fund_id
                        )
                        
                        if not fund_exists:
                            logger.warning(f"Fund {fund.fund_id} does not exist, skipping")
                            continue
                        
                        # Add the fund to the portfolio generation
                        fund_response = await db.fetchrow(
                            "INSERT INTO available_portfolio_funds (template_portfolio_generation_id, fund_id, target_weighting) VALUES ($1, $2, $3) RETURNING *",
                            new_generation_id,
                            fund.fund_id,
                            fund.target_weighting
                        )
                        
                        if not fund_response:
                            logger.warning(f"Failed to add fund {fund.fund_id} to generation {new_generation_id}")
                            
                logger.info(f"Added {len(generation_data.funds)} funds to generation {new_generation_id}")
            except Exception as fund_error:
                logger.error(f"Failed to add funds to generation {new_generation_id}: {str(fund_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to add funds to generation: {str(fund_error)}")
        
        # Return the newly created generation
        return dict(generation_response)
    
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
        generation_response = await db.fetchrow(
            "SELECT * FROM template_portfolio_generations WHERE id = $1 AND available_portfolio_id = $2",
            generation_id,
            portfolio_id
        )
        
        if not generation_response:
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
                other_active_response = await db.fetch(
                    "SELECT id FROM template_portfolio_generations WHERE available_portfolio_id = $1 AND status = 'active' AND id != $2",
                    portfolio_id,
                    generation_id
                )
                
                if other_active_response:
                    for other_generation in other_active_response:
                        # Set other generations to 'archived'
                        await db.execute(
                            "UPDATE template_portfolio_generations SET status = 'archived' WHERE id = $1",
                            other_generation['id']
                        )
                    
                    logger.info(f"Archived {len(other_active_response)} previously active generations for portfolio {portfolio_id}")
        
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
            # Build dynamic update query
            set_clauses = []
            params = []
            param_count = 1
            
            for key, value in generation_updates.items():
                if key == 'updated_at' and value == 'now()':
                    set_clauses.append(f"{key} = NOW()")
                else:
                    set_clauses.append(f"{key} = ${param_count}")
                    params.append(value)
                    param_count += 1
            
            params.append(generation_id)  # For WHERE clause
            
            query = f"UPDATE template_portfolio_generations SET {', '.join(set_clauses)} WHERE id = ${param_count} RETURNING *"
            update_response = await db.fetchrow(query, *params)
            
            if not update_response:
                raise HTTPException(status_code=500, detail="Failed to update generation details")
            
            logger.info(f"Updated details for generation {generation_id}")
        
        # Handle fund updates if provided
        if hasattr(update_data, 'funds') and update_data.funds is not None:
            try:
                logger.info(f"Starting fund update for generation {generation_id}")
                
                # Check current funds before deletion
                existing_funds = await db.fetch(
                    "SELECT id, fund_id, target_weighting FROM available_portfolio_funds WHERE template_portfolio_generation_id = $1",
                    generation_id
                )
                logger.info(f"Found {len(existing_funds) if existing_funds else 0} existing funds for generation {generation_id}")
                
                # Use a transaction to ensure atomicity
                async with db.transaction():
                    # Delete existing funds for this generation (PostgreSQL compatible approach)
                    await db.execute(
                        "DELETE FROM available_portfolio_funds WHERE template_portfolio_generation_id = $1",
                        generation_id
                    )
                    
                    # Use the pre-counted existing funds for logging
                    delete_result = len(existing_funds) if existing_funds else 0
                    logger.info(f"Deleted {delete_result} existing funds from generation {generation_id}")
                    
                    # Validate all funds exist before inserting any
                    valid_funds = []
                    for fund in update_data.funds:
                        fund_exists = await db.fetchrow(
                            "SELECT id FROM available_funds WHERE id = $1",
                            fund.fund_id
                        )
                        
                        if not fund_exists:
                            logger.warning(f"Fund {fund.fund_id} does not exist, skipping")
                            continue
                        
                        valid_funds.append(fund)
                    
                    logger.info(f"Validated {len(valid_funds)} funds for insertion")
                    
                    # Add the valid funds with robust error handling
                    inserted_count = 0
                    for i, fund in enumerate(valid_funds):
                        try:
                            fund_response = await db.fetchrow(
                                "INSERT INTO available_portfolio_funds (template_portfolio_generation_id, fund_id, target_weighting) VALUES ($1, $2, $3) RETURNING id",
                                generation_id,
                                fund.fund_id,
                                fund.target_weighting
                            )
                            
                            if fund_response:
                                inserted_count += 1
                                logger.debug(f"Inserted fund {fund.fund_id} with new ID {fund_response['id']}")
                            else:
                                logger.warning(f"Failed to add fund {fund.fund_id} to generation {generation_id} - no response")
                                
                        except Exception as insert_error:
                            error_msg = str(insert_error).lower()
                            if "duplicate key" in error_msg and "primary key" in error_msg:
                                logger.error(f"Primary key constraint violation inserting fund {fund.fund_id}: {str(insert_error)}")
                                logger.error("This indicates a sequence synchronization issue - attempting recovery")
                                
                                # Try to resync sequence within the transaction
                                try:
                                    max_id_result = await db.fetchval("SELECT COALESCE(MAX(id), 0) FROM available_portfolio_funds")
                                    next_val = (max_id_result or 0) + 1
                                    await db.execute(
                                        f"ALTER SEQUENCE available_portfolio_funds_id_seq RESTART WITH {next_val}"
                                    )
                                    logger.info(f"Resynced sequence to start at {next_val}")
                                    
                                    # Retry the insert
                                    fund_response = await db.fetchrow(
                                        "INSERT INTO available_portfolio_funds (template_portfolio_generation_id, fund_id, target_weighting) VALUES ($1, $2, $3) RETURNING id",
                                        generation_id,
                                        fund.fund_id,
                                        fund.target_weighting
                                    )
                                    
                                    if fund_response:
                                        inserted_count += 1
                                        logger.info(f"Successfully inserted fund {fund.fund_id} after sequence resync with ID {fund_response['id']}")
                                    else:
                                        logger.error(f"Failed to insert fund {fund.fund_id} even after sequence resync")
                                        raise Exception(f"Fund insertion failed after sequence resync for fund {fund.fund_id}")
                                        
                                except Exception as recovery_error:
                                    logger.error(f"Failed to recover from sequence sync issue: {str(recovery_error)}")
                                    raise
                            else:
                                logger.error(f"Error inserting fund {i+1}/{len(valid_funds)} (fund_id={fund.fund_id}) to generation {generation_id}: {str(insert_error)}")
                                logger.error(f"Error details: {type(insert_error).__name__}")
                                raise
                    
                    logger.info(f"Successfully inserted {inserted_count}/{len(valid_funds)} funds to generation {generation_id}")
                    
            except Exception as transaction_error:
                logger.error(f"Transaction failed during fund updates for generation {generation_id}: {str(transaction_error)}")
                logger.error(f"Error type: {type(transaction_error).__name__}")
                raise HTTPException(status_code=500, detail=f"Failed to update generation funds: {str(transaction_error)}")
        
        # Get the updated generation to return
        updated_generation = await db.fetchrow(
            "SELECT * FROM template_portfolio_generations WHERE id = $1",
            generation_id
        )
        
        return dict(updated_generation) if updated_generation else None
    
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
        generation_response = await db.fetchrow(
            "SELECT * FROM template_portfolio_generations WHERE id = $1 AND available_portfolio_id = $2",
            generation_id,
            portfolio_id
        )
        
        if not generation_response:
            raise HTTPException(
                status_code=404, 
                detail=f"Generation with ID {generation_id} not found for portfolio {portfolio_id}"
            )
        
        generation = dict(generation_response)
        
        # Check if any portfolios are using this generation
        portfolios_using_generation = await db.fetch(
            "SELECT id FROM portfolios WHERE template_generation_id = $1",
            generation_id
        )
        
        if portfolios_using_generation and len(portfolios_using_generation) > 0:
            portfolio_count = len(portfolios_using_generation)
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete generation '{generation['generation_name']}' - {portfolio_count} portfolio(s) are using this generation"
            )
        
        # Get count of funds that will be deleted
        funds_response = await db.fetch(
            "SELECT id FROM available_portfolio_funds WHERE template_portfolio_generation_id = $1",
            generation_id
        )
        
        funds_count = len(funds_response) if funds_response else 0
        
        # Delete the generation (this will cascade delete funds due to ON DELETE CASCADE)
        delete_result = await db.fetchrow(
            "DELETE FROM template_portfolio_generations WHERE id = $1 RETURNING *",
            generation_id
        )
        
        if not delete_result:
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
        generation_response = await db.fetchrow(
            "SELECT * FROM template_portfolio_generations WHERE id = $1",
            generation_id
        )
        
        if not generation_response:
            raise HTTPException(status_code=404, detail=f"Generation with ID {generation_id} not found")
        
        return dict(generation_response)
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
        logger.info(f"Executing query for generation_id={generation_id}")
        
        result = await db.fetch(
            "SELECT * FROM available_portfolio_funds WHERE template_portfolio_generation_id = $1",
            generation_id
        )
        logger.info(f"Query result: {result}")
        
        return [dict(fund) for fund in result] if result else []
    except Exception as e:
        logger.error(f"Error fetching portfolio funds for generation ID {generation_id}: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error args: {e.args}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio funds: {str(e)}")

@router.get("/template-portfolio-generations/active", response_model=List[dict])
async def get_active_template_portfolio_generations(db = Depends(get_db)):
    """Get all template portfolio generations that are not inactive with product counts"""
    try:
        logger.info("Fetching active template portfolio generations with product counts")
        
        # Get all template portfolio generations that are not inactive
        response = await db.fetch(
            "SELECT id, generation_name, available_portfolio_id, status, created_at, description FROM template_portfolio_generations WHERE status != 'inactive' ORDER BY generation_name"
        )
        
        if not response:
            logger.info("No active template portfolio generations found")
            return []
        
        logger.info(f"Found {len(response)} active template portfolio generations")
        
        # Get product counts for each generation
        product_counts = {}
        for generation in response:
            generation = dict(generation)
            generation_id = generation["id"]
            try:
                # Count products using the products_list_view where template_generation_id matches
                count_result = await db.fetchval(
                    "SELECT COUNT(*) FROM products_list_view WHERE portfolio_id IN (SELECT id FROM portfolios WHERE template_generation_id = $1)",
                    generation_id
                )
                product_counts[generation_id] = count_result or 0
                logger.debug(f"Generation {generation_id} ({generation.get('generation_name', 'Unknown')}): {product_counts[generation_id]} products")
            except Exception as count_err:
                logger.error(f"Error counting products for generation {generation_id}: {str(count_err)}")
                product_counts[generation_id] = 0
        
        # Add product counts to each generation
        enhanced_generations = []
        for generation in response:
            generation = dict(generation)
            generation_with_count = generation.copy()
            generation_with_count["product_count"] = product_counts.get(generation["id"], 0)
            enhanced_generations.append(generation_with_count)
        
        logger.info(f"Successfully calculated product counts for {len(enhanced_generations)} generations")
        return enhanced_generations
        
    except Exception as e:
        logger.error(f"Error fetching active template portfolio generations with product counts: {str(e)}")
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
        generation_response = await db.fetchrow(
            "SELECT * FROM template_portfolio_generations WHERE id = $1",
            generation_id
        )
        funds_response = await db.fetch(
            "SELECT * FROM available_portfolio_funds WHERE template_portfolio_generation_id = $1",
            generation_id
        )
        
        if not generation_response:
            logger.warning(f"No generation found with ID: {generation_id}")
            raise HTTPException(status_code=404, detail="Template generation not found")
        
        generation_data = dict(generation_response)
        funds_data = [dict(fund) for fund in funds_response] if funds_response else []
        
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
                "generation": 1,  # Single generation record
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
        generations_response = await db.fetch(
            "SELECT id FROM template_portfolio_generations WHERE available_portfolio_id = $1",
            portfolio_id
        )
        
        if not generations_response:
            logger.info(f"No generations found for portfolio template {portfolio_id}")
            return []
        
        generation_ids = [gen['id'] for gen in generations_response]
        logger.info(f"Found {len(generation_ids)} generations for template {portfolio_id}")
        
        # Query products linked through portfolios (where portfolio.template_generation_id matches)
        products_via_portfolio = await db.fetch(
            "SELECT * FROM client_products WHERE portfolio_id IS NOT NULL"
        )
        
        # Query products directly linked to template generations
        products_direct = await db.fetch(
            "SELECT * FROM client_products WHERE template_generation_id = ANY($1::int[])",
            generation_ids
        )
        
        # Helper function to enrich product with related data
        async def enrich_product(product):
            # Fetch client group
            if product.get('client_id'):
                client_response = await db.fetchrow(
                    "SELECT id, name, advisor FROM client_groups WHERE id = $1",
                    product['client_id']
                )
                product['client_groups'] = dict(client_response) if client_response else None
            
            # Fetch provider
            if product.get('provider_id'):
                provider_response = await db.fetchrow(
                    "SELECT id, name, theme_color FROM available_providers WHERE id = $1",
                    product['provider_id']
                )
                if provider_response:
                    provider_data = dict(provider_response)
                    product['available_providers'] = provider_data
                    # Also add provider_name directly for generateProductDisplayName
                    product['provider_name'] = provider_data['name']
            
            # Fetch portfolio
            if product.get('portfolio_id'):
                portfolio_response = await db.fetchrow(
                    "SELECT id, portfolio_name, template_generation_id FROM portfolios WHERE id = $1",
                    product['portfolio_id']
                )
                product['portfolios'] = dict(portfolio_response) if portfolio_response else None
            
            # Fetch product owners through the correct relationship
            product_owners_response = await db.fetch(
                """
                SELECT po.id, po.firstname, po.surname, po.known_as
                FROM product_owners po
                JOIN product_owner_products pop ON po.id = pop.product_owner_id
                WHERE pop.product_id = $1 AND po.status = 'active'
                """,
                product['id']
            )
            product['product_owners'] = [dict(owner) for owner in product_owners_response] if product_owners_response else []
            
            return product
        
        # Combine and deduplicate results
        all_products = []
        seen_product_ids = set()
        
        # Add products from portfolio links (filter by portfolio's template_generation_id)
        if products_via_portfolio:
            for product in products_via_portfolio:
                product = dict(product)
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
        if products_direct:
            for product in products_direct:
                product = dict(product)
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