from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from app.models.product import Product, ProductCreate, ProductUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/available_products", response_model=List[Product])
async def get_products(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100000, ge=1, le=100000, description="Max number of records to return"),
    status: Optional[str] = None,
    available_providers_id: Optional[int] = None,
    product_type: Optional[str] = None,
    db = Depends(get_db)
):
    """
    What it does: Previously retrieved a list of products, but now provides a migration notice.
    Why it's needed: For backward compatibility during migration.
    How it works:
        Returns a helpful error message indicating that the data model has changed.
    """
    raise HTTPException(
        status_code=410, 
        detail={
            "message": "The available_products endpoint has been deprecated.",
            "migration_info": "Funds are now directly associated with portfolios instead of products. Please use the /funds and /available_portfolios endpoints instead."
        }
    )

@router.post("/available_products", response_model=Product)
async def create_product(product: ProductCreate, db = Depends(get_db)):
    """
    What it does: Previously created a new product, but now provides a migration notice.
    Why it's needed: For backward compatibility during migration.
    How it works:
        Returns a helpful error message indicating that the data model has changed.
    """
    raise HTTPException(
        status_code=410, 
        detail={
            "message": "The available_products endpoint has been deprecated.",
            "migration_info": "Funds are now directly associated with portfolios instead of products. Please use the /funds and /available_portfolios endpoints instead."
        }
    )

@router.get("/available_products/{product_id}", response_model=Product)
async def get_product(product_id: int, db = Depends(get_db)):
    """
    What it does: Previously retrieved a single product, but now provides a migration notice.
    Why it's needed: For backward compatibility during migration.
    How it works:
        Returns a helpful error message indicating that the data model has changed.
    """
    raise HTTPException(
        status_code=410, 
        detail={
            "message": "The available_products endpoint has been deprecated.",
            "migration_info": "Funds are now directly associated with portfolios instead of products. Please use the /funds and /available_portfolios endpoints instead."
        }
    )

@router.patch("/available_products/{product_id}", response_model=Product)
async def update_product(product_id: int, product_update: ProductUpdate, db = Depends(get_db)):
    """
    What it does: Previously updated a product, but now provides a migration notice.
    Why it's needed: For backward compatibility during migration.
    How it works:
        Returns a helpful error message indicating that the data model has changed.
    """
    raise HTTPException(
        status_code=410, 
        detail={
            "message": "The available_products endpoint has been deprecated.",
            "migration_info": "Funds are now directly associated with portfolios instead of products. Please use the /funds and /available_portfolios endpoints instead."
        }
    )

@router.delete("/available_products/{product_id}", response_model=dict)
async def delete_product(product_id: int, db = Depends(get_db)):
    """
    What it does: Previously deleted a product, but now provides a migration notice.
    Why it's needed: For backward compatibility during migration.
    How it works:
        Returns a helpful error message indicating that the data model has changed.
    """
    raise HTTPException(
        status_code=410, 
        detail={
            "message": "The available_products endpoint has been deprecated.",
            "migration_info": "Funds are now directly associated with portfolios instead of products. Please use the /funds and /available_portfolios endpoints instead."
        }
    )

@router.get("/product_value_irr_summary", response_model=List[dict])
async def get_product_value_irr_summary(db = Depends(get_db)):
    """
    Returns the product value and IRR summary for all client products from the product_value_irr_summary view.
    """
    try:
        # AsyncPG query to select all from view
        result = await db.fetch("SELECT * FROM product_value_irr_summary")
        # Convert AsyncPG Records to dictionaries
        return [dict(row) for row in result]
    except Exception as e:
        logger.error(f"Error fetching product value IRR summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
