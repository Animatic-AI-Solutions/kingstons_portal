from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from app.db.database import get_db

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/portfolio/{product_id}")
async def get_portfolio_historical_irr(
    product_id: int,
    limit: Optional[int] = Query(default=12, description="Maximum number of historical IRR records to return"),
    db = Depends(get_db)
):
    """
    Get historical IRR values for a specific product/portfolio.
    Returns up to 'limit' most recent IRR calculations for the portfolio.
    """
    try:
        logger.info(f"Fetching portfolio historical IRR for product {product_id} (limit: {limit})")
        
        # Query the portfolio_historical_irr view
        response = db.table("portfolio_historical_irr") \
            .select("*") \
            .eq("product_id", product_id) \
            .order("irr_date", desc=True) \
            .limit(limit) \
            .execute()
        
        if response.data:
            logger.info(f"Found {len(response.data)} portfolio IRR records for product {product_id}")
            
            # Format the response
            historical_irrs = []
            for record in response.data:
                historical_irrs.append({
                    "irr_id": record["irr_id"],
                    "portfolio_id": record["portfolio_id"],
                    "irr_result": float(record["irr_result"]) if record["irr_result"] is not None else None,
                    "irr_date": record["irr_date"],
                    "portfolio_valuation_id": record["portfolio_valuation_id"],
                    "portfolio_name": record["portfolio_name"],
                    "product_name": record["product_name"],
                    "provider_name": record["provider_name"]
                })
            
            return {
                "product_id": product_id,
                "portfolio_historical_irr": historical_irrs,
                "count": len(historical_irrs)
            }
        else:
            logger.info(f"No portfolio historical IRR data found for product {product_id}")
            return {
                "product_id": product_id,
                "portfolio_historical_irr": [],
                "count": 0
            }
            
    except Exception as e:
        logger.error(f"Error fetching portfolio historical IRR for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio historical IRR: {str(e)}")

@router.get("/funds/{product_id}")
async def get_funds_historical_irr(
    product_id: int,
    limit: Optional[int] = Query(default=12, description="Maximum number of historical IRR records per fund"),
    db = Depends(get_db)
):
    """
    Get historical IRR values for all funds within a specific product/portfolio.
    Returns up to 'limit' most recent IRR calculations for each fund.
    """
    try:
        logger.info(f"Fetching funds historical IRR for product {product_id} (limit: {limit})")
        
        # Query the fund_historical_irr view
        response = db.table("fund_historical_irr") \
            .select("*") \
            .eq("product_id", product_id) \
            .order("portfolio_fund_id") \
            .order("irr_date", desc=True) \
            .execute()
        
        if response.data:
            logger.info(f"Found {len(response.data)} fund IRR records for product {product_id}")
            
            # Group by fund and limit each fund's records
            funds_irr = {}
            for record in response.data:
                fund_id = record["portfolio_fund_id"]
                
                if fund_id not in funds_irr:
                    funds_irr[fund_id] = {
                        "portfolio_fund_id": fund_id,
                        "fund_name": record["fund_name"],
                        "isin_number": record["isin_number"],
                        "risk_factor": record["risk_factor"],
                        "fund_status": record["fund_status"],
                        "target_weighting": float(record["target_weighting"]) if record["target_weighting"] is not None else None,
                        "historical_irr": []
                    }
                
                # Only add if we haven't reached the limit for this fund
                if len(funds_irr[fund_id]["historical_irr"]) < limit:
                    funds_irr[fund_id]["historical_irr"].append({
                        "irr_id": record["irr_id"],
                        "irr_result": float(record["irr_result"]) if record["irr_result"] is not None else None,
                        "irr_date": record["irr_date"],
                        "fund_valuation_id": record["fund_valuation_id"]
                    })
            
            # Convert to list and sort by fund name
            funds_list = list(funds_irr.values())
            funds_list.sort(key=lambda x: x["fund_name"] or "")
            
            return {
                "product_id": product_id,
                "funds_historical_irr": funds_list,
                "total_funds": len(funds_list),
                "total_records": len(response.data)
            }
        else:
            logger.info(f"No funds historical IRR data found for product {product_id}")
            return {
                "product_id": product_id,
                "funds_historical_irr": [],
                "total_funds": 0,
                "total_records": 0
            }
            
    except Exception as e:
        logger.error(f"Error fetching funds historical IRR for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch funds historical IRR: {str(e)}")

@router.get("/combined/{product_id}")
async def get_combined_historical_irr(
    product_id: int,
    limit: Optional[int] = Query(default=12, description="Maximum number of historical IRR records"),
    db = Depends(get_db)
):
    """
    Get both portfolio-level and fund-level historical IRR data for a product.
    This is a convenience endpoint that combines both queries.
    """
    try:
        logger.info(f"Fetching combined historical IRR for product {product_id}")
        
        # Fetch both portfolio and fund historical IRR data
        portfolio_data = await get_portfolio_historical_irr(product_id, limit, db)
        funds_data = await get_funds_historical_irr(product_id, limit, db)
        
        return {
            "product_id": product_id,
            "portfolio_historical_irr": portfolio_data["portfolio_historical_irr"],
            "funds_historical_irr": funds_data["funds_historical_irr"],
            "portfolio_count": portfolio_data["count"],
            "funds_count": funds_data["total_funds"],
            "total_fund_records": funds_data["total_records"]
        }
        
    except Exception as e:
        logger.error(f"Error fetching combined historical IRR for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch combined historical IRR: {str(e)}") 