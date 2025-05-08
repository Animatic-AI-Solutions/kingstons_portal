from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional, Dict, Any
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
    funds: List[PortfolioFundDetail] = []

    class Config:
        from_attributes = True

class PortfolioFromTemplate(BaseModel):
    template_id: int
    portfolio_name: str

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
async def get_available_portfolio_details(request: Request, portfolio_id: int, db: SupabaseClient = Depends(get_db)):
    """Get detailed information about a specific portfolio template including its funds"""
    try:
        # Log request details
        logger.info("=== Request Information ===")
        logger.info(f"Method: {request.method}")
        logger.info(f"URL: {request.url}")
        logger.info(f"Headers: {dict(request.headers)}")
        logger.info(f"Portfolio ID: {portfolio_id}")
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

        # Get portfolio funds
        try:
            logger.info(f"Fetching funds for portfolio ID: {portfolio_id}")
            portfolio_funds_response = db.table("available_portfolio_funds") \
                .select("*") \
                .eq("portfolio_id", portfolio_id) \
                .execute()
            logger.info(f"Portfolio funds response data: {portfolio_funds_response.data}")
            logger.info(f"Number of funds found: {len(portfolio_funds_response.data)}")
        except Exception as e:
            logger.error("=== Portfolio Funds Query Error ===")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error message: {str(e)}")
            logger.error(f"Error args: {e.args}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio funds: {str(e)}")
        
        funds = []
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
                    "portfolio_id": portfolio_fund["portfolio_id"],
                    "target_weighting": float(portfolio_fund["target_weighting"]) if portfolio_fund["target_weighting"] else 0.0,
                    "fund_id": portfolio_fund["fund_id"],
                    "available_funds": fund_response.data[0] if fund_response.data else {}
                }
                funds.append(fund_detail)
                logger.info(f"Successfully processed fund {idx + 1}: {fund_detail}")
            except Exception as e:
                logger.error(f"=== Error Processing Fund {idx + 1} ===")
                logger.error(f"Fund data: {portfolio_fund}")
                logger.error(f"Error type: {type(e)}")
                logger.error(f"Error message: {str(e)}")
                logger.error(f"Error args: {e.args}")
                continue

        response_data = {
            "id": portfolio["id"],
            "created_at": portfolio["created_at"],
            "name": portfolio["name"],
            "funds": funds
        }
        logger.info("=== Final Response ===")
        logger.info(f"Response data: {response_data}")
        return response_data

    except Exception as e:
        logger.error("=== Unhandled Error in get_available_portfolio_details ===")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Error args: {e.args}")
        logger.error(f"Portfolio ID: {portfolio_id}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=AvailablePortfolio)
async def create_available_portfolio(portfolio_data: PortfolioCreate, db = Depends(get_db)):
    """Create a new portfolio template with funds"""
    # Create portfolio template
    portfolio_data_dict = {
        "name": portfolio_data.name
    }
    
    portfolio_response = db.table('available_portfolios')\
        .insert(portfolio_data_dict)\
        .execute()
    
    if not portfolio_response.data:
        raise HTTPException(status_code=500, detail="Failed to create portfolio template")
    
    new_portfolio = portfolio_response.data[0]
    
    # Add funds if provided
    if portfolio_data.funds:
        for fund in portfolio_data.funds:
            fund_response = db.table('available_portfolio_funds')\
                .insert({
                    "portfolio_id": new_portfolio["id"],
                    "fund_id": fund.fund_id,
                    "target_weighting": fund.target_weighting
                })\
                .execute()
            
            if not fund_response.data:
                print(f"Failed to add fund {fund.fund_id} to portfolio {new_portfolio['id']}")
    
    return new_portfolio

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
    
    # Create new portfolio
    portfolio_response = db.table('portfolios')\
        .insert({
            "portfolio_name": data.portfolio_name,
            "status": "active",
            "start_date": str(date.today()),
            "original_template_id": data.template_id
        })\
        .execute()
    
    if not portfolio_response.data:
        raise HTTPException(status_code=500, detail="Failed to create portfolio")
    
    new_portfolio = portfolio_response.data[0]
    
    # Get template funds
    template_funds_response = db.table('available_portfolio_funds')\
        .select('*')\
        .eq('portfolio_id', data.template_id)\
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
            print(f"Failed to add fund {template_fund['fund_id']} to portfolio {new_portfolio['id']}")
    
    return new_portfolio 

@router.delete("/{portfolio_id}", response_model=dict)
async def delete_available_portfolio(portfolio_id: int, db = Depends(get_db)):
    """
    Delete a portfolio template and all its associated funds.
    
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
        
        # Get all funds for this portfolio
        funds_result = db.table("available_portfolio_funds").select("id").eq("portfolio_id", portfolio_id).execute()
        funds_deleted = len(funds_result.data) if funds_result.data else 0
        
        # Delete all funds first
        if funds_deleted > 0:
            db.table("available_portfolio_funds").delete().eq("portfolio_id", portfolio_id).execute()
            logger.info(f"Deleted {funds_deleted} funds from portfolio template {portfolio_id}")
        
        # Now delete the portfolio template
        result = db.table("available_portfolios").delete().eq("id", portfolio_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to delete portfolio template")
        
        return {
            "message": f"Portfolio template with ID {portfolio_id} deleted successfully",
            "details": {
                "portfolio_deleted": 1,
                "funds_deleted": funds_deleted
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting portfolio template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/available_portfolio_funds", response_model=List[dict])
async def get_available_portfolio_funds(
    portfolio_id: Optional[str] = None,
    fund_id: Optional[str] = None,
    db = Depends(get_db)
):
    """
    Get portfolio funds with optional filtering by portfolio_id or fund_id.
    
    Args:
        portfolio_id: Optional filter by portfolio ID (as string)
        fund_id: Optional filter by fund ID (as string)
        
    Returns:
        List of portfolio funds
    """
    try:
        # Add detailed logging for debugging
        logger.info("=== get_available_portfolio_funds called ===")
        logger.info(f"portfolio_id: {portfolio_id}, type: {type(portfolio_id)}")
        logger.info(f"fund_id: {fund_id}, type: {type(fund_id)}")
        
        # Convert string parameters to integers if provided
        portfolio_id_int = None
        fund_id_int = None
        
        if portfolio_id:
            try:
                portfolio_id_int = int(portfolio_id)
                logger.info(f"Converted portfolio_id to int: {portfolio_id_int}")
            except ValueError:
                logger.error(f"Invalid portfolio_id: {portfolio_id}")
                raise HTTPException(status_code=422, detail="portfolio_id must be a valid integer")
                
        if fund_id:
            try:
                fund_id_int = int(fund_id)
                logger.info(f"Converted fund_id to int: {fund_id_int}")
            except ValueError:
                logger.error(f"Invalid fund_id: {fund_id}")
                raise HTTPException(status_code=422, detail="fund_id must be a valid integer")
        
        # Build query
        query = db.table("available_portfolio_funds").select("*")
        
        if portfolio_id_int is not None:
            query = query.eq("portfolio_id", portfolio_id_int)
            
        if fund_id_int is not None:
            query = query.eq("fund_id", fund_id_int)
        
        logger.info(f"Executing query with portfolio_id={portfolio_id_int}, fund_id={fund_id_int}")
        result = query.execute()
        logger.info(f"Query result: {result.data}")
        
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