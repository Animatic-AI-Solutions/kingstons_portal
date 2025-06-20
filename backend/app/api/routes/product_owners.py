from fastapi import APIRouter, Depends, HTTPException, Query, Path, Response, status
from typing import List, Optional, Dict, Any
import logging

from ...db.database import get_db
from ...models.product_owner import ProductOwner, ProductOwnerCreate, ProductOwnerUpdate

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/product_owners", response_model=List[ProductOwner])
async def get_product_owners_list(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    status: Optional[str] = Query(None, description="Filter by status (e.g., 'active')"),
    search: Optional[str] = Query(None, description="Search by name"),
    db = Depends(get_db)
):
    """
    Retrieves a list of product owners, with optional filtering and pagination.
    Excludes 'inactive' product owners by default if no specific status is provided.
    """
    try:
        logger.info(f"Fetching product owners with skip={skip}, limit={limit}, status={status}, search={search}")
        
        query = db.table("product_owners").select("id, name, status, created_at") # Select specific fields

        if status:
            query = query.eq("status", status)
        else:
            # Default to excluding inactive if no specific status is requested
            query = query.neq("status", "inactive")
            
        if search:
            # Basic search by name (case-insensitive)
            query = query.ilike("name", f"%{search}%")
        
        # Apply pagination
        query = query.range(skip, skip + limit - 1)
        
        # Add ordering, e.g., by name
        query = query.order("name", desc=False)
        
        result = query.execute()
        
        if not result.data:
            logger.warning("No product owners found with the given criteria.")
            return []
            
        return result.data
    except Exception as e:
        logger.error(f"Error fetching product owners: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/product_owners/{product_owner_id}", response_model=ProductOwner)
async def get_product_owner(
    product_owner_id: int = Path(..., description="The ID of the product owner to retrieve"),
    db = Depends(get_db)
):
    """
    Retrieve a specific product owner by ID.
    """
    try:
        logger.info(f"Retrieving product owner with ID: {product_owner_id}")
        
        result = db.table("product_owners").select("*").eq("id", product_owner_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail=f"Product owner with ID {product_owner_id} not found")
        
        return result.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving product owner {product_owner_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/product_owners", response_model=ProductOwner, status_code=status.HTTP_201_CREATED)
async def create_product_owner(
    product_owner: ProductOwnerCreate,
    db = Depends(get_db)
):
    """
    Create a new product owner.
    """
    try:
        logger.info(f"Creating new product owner: {product_owner.model_dump()}")
        
        # Insert the new product owner
        result = db.table("product_owners").insert(product_owner.model_dump()).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create product owner")
        
        # Get the created product owner
        created_product_owner_id = result.data[0]["id"]
        new_product_owner = db.table("product_owners").select("*").eq("id", created_product_owner_id).execute()
        
        return new_product_owner.data[0]
    
    except Exception as e:
        logger.error(f"Error creating product owner: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.patch("/product_owners/{product_owner_id}", response_model=ProductOwner)
async def update_product_owner(
    product_owner_update: ProductOwnerUpdate,
    product_owner_id: int = Path(..., description="The ID of the product owner to update"),
    db = Depends(get_db)
):
    """
    Update an existing product owner.
    """
    try:
        logger.info(f"Updating product owner {product_owner_id} with data: {product_owner_update.model_dump()}")
        
        # Check if product owner exists
        check_result = db.table("product_owners").select("*").eq("id", product_owner_id).execute()
        
        if not check_result.data:
            raise HTTPException(status_code=404, detail=f"Product owner with ID {product_owner_id} not found")
        
        # Filter out None values to only update provided fields
        update_data = {k: v for k, v in product_owner_update.model_dump().items() if v is not None}
        
        if not update_data:
            # No fields to update, return the original
            return check_result.data[0]
        
        # Update the product owner
        update_result = db.table("product_owners").update(update_data).eq("id", product_owner_id).execute()
        
        if not update_result.data:
            raise HTTPException(status_code=500, detail="Failed to update product owner")
        
        # Get the updated product owner
        updated_product_owner = db.table("product_owners").select("*").eq("id", product_owner_id).execute()
        
        return updated_product_owner.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product owner {product_owner_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/product_owners/{product_owner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_owner(
    product_owner_id: int = Path(..., description="The ID of the product owner to delete"),
    db = Depends(get_db)
):
    """
    Delete a product owner.
    
    Note: This will delete the product owner but not any associated product owner-client group
    or product owner-product relationships. Those will need to be deleted separately.
    """
    try:
        logger.info(f"Deleting product owner with ID: {product_owner_id}")
        
        # Check if product owner exists
        check_result = db.table("product_owners").select("*").eq("id", product_owner_id).execute()
        
        if not check_result.data:
            raise HTTPException(status_code=404, detail=f"Product owner with ID {product_owner_id} not found")
        
        # Delete the product owner
        db.table("product_owners").delete().eq("id", product_owner_id).execute()
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting product owner {product_owner_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/product_owners/{product_owner_id}/client_groups", response_model=List[dict])
async def get_product_owner_client_groups(
    product_owner_id: int = Path(..., description="The ID of the product owner"),
    db = Depends(get_db)
):
    """
    Get all client groups associated with a product owner.
    """
    try:
        logger.info(f"Retrieving client groups for product owner {product_owner_id}")
        
        # Check if product owner exists
        product_owner_result = db.table("product_owners").select("*").eq("id", product_owner_id).execute()
        
        if not product_owner_result.data:
            raise HTTPException(status_code=404, detail=f"Product owner with ID {product_owner_id} not found")
        
        # Get the associations
        associations_result = db.table("client_group_product_owners").select("*").eq("product_owner_id", product_owner_id).execute()
        
        if not associations_result.data:
            return []
        
        # Get the client group IDs
        client_group_ids = [assoc["client_group_id"] for assoc in associations_result.data]
        
        # Get the client group details
        client_groups_result = db.table("client_groups").select("*").in_("id", client_group_ids).execute()
        
        return client_groups_result.data or []
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving client groups for product owner {product_owner_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/product_owners/{product_owner_id}/products", response_model=List[dict])
async def get_product_owner_products(
    product_owner_id: int = Path(..., description="The ID of the product owner"),
    db = Depends(get_db)
):
    """
    Get all products associated with a product owner, including product owner information.
    """
    try:
        logger.info(f"Retrieving products for product owner {product_owner_id}")
        
        # Check if product owner exists
        product_owner_result = db.table("product_owners").select("*").eq("id", product_owner_id).execute()
        
        if not product_owner_result.data:
            raise HTTPException(status_code=404, detail=f"Product owner with ID {product_owner_id} not found")
        
        # Get the associations
        associations_result = db.table("product_owner_products").select("*").eq("product_owner_id", product_owner_id).execute()
        
        if not associations_result.data:
            return []
        
        # Get the product IDs
        product_ids = [assoc["product_id"] for assoc in associations_result.data]
        
        # Get the product details with provider information
        products_result = db.table("client_products") \
            .select("*, available_providers(name, theme_color)") \
            .in_("id", product_ids) \
            .execute()
        
        if not products_result.data:
            return []
        
        # For each product, get all associated product owners
        enriched_products = []
        for product in products_result.data:
            # Get all product owners for this product
            product_owner_associations = db.table("product_owner_products") \
                .select("product_owner_id, product_owners(id, name)") \
                .eq("product_id", product["id"]) \
                .execute()
            
            # Extract product owner information
            product_owners = []
            if product_owner_associations.data:
                for assoc in product_owner_associations.data:
                    if assoc.get("product_owners"):
                        product_owners.append({
                            "id": assoc["product_owners"]["id"],
                            "name": assoc["product_owners"]["name"]
                        })
            
            # Add provider information if available
            provider_name = None
            provider_theme_color = None
            if product.get("available_providers"):
                provider_name = product["available_providers"]["name"]
                provider_theme_color = product["available_providers"]["theme_color"]
            
            # Create enriched product object
            enriched_product = {
                **product,
                "product_owners": product_owners,
                "provider_name": provider_name,
                "provider_theme_color": provider_theme_color
            }
            
            # Remove the nested provider object to avoid confusion
            if "available_providers" in enriched_product:
                del enriched_product["available_providers"]
            
            enriched_products.append(enriched_product)
        
        return enriched_products
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving products for product owner {product_owner_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/product_owner_products", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
async def create_product_owner_product(
    product_owner_id: int,
    product_id: int,
    db = Depends(get_db)
):
    """
    Create a new association between a product owner and a product.
    """
    try:
        logger.info(f"Creating association between product owner {product_owner_id} and product {product_id}")
        
        # Check if product owner exists
        product_owner_result = db.table("product_owners").select("id").eq("id", product_owner_id).execute()
        
        if not product_owner_result.data:
            raise HTTPException(status_code=404, detail=f"Product owner with ID {product_owner_id} not found")
        
        # Check if product exists
        product_result = db.table("client_products").select("id").eq("id", product_id).execute()
        
        if not product_result.data:
            raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
        
        # Check if the association already exists
        existing_result = db.table("product_owner_products") \
            .select("*") \
            .eq("product_owner_id", product_owner_id) \
            .eq("product_id", product_id) \
            .execute()
        
        if existing_result.data:
            # Association already exists, return it
            return existing_result.data[0]
        
        # Create the association
        new_association = {
            "product_owner_id": product_owner_id,
            "product_id": product_id
        }
        
        result = db.table("product_owner_products").insert(new_association).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create association")
        
        return result.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating product owner product association: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/product_owner_products/product/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_owner_products_by_product(
    product_id: int = Path(..., description="The ID of the product to delete associations for"),
    db = Depends(get_db)
):
    """
    Delete all associations between product owners and a specific product.
    
    This endpoint is needed to properly clean up associations before deleting a product.
    """
    try:
        logger.info(f"Deleting all product owner associations for product {product_id}")
        
        # Check if product exists
        product_result = db.table("client_products").select("id").eq("id", product_id).execute()
        
        if not product_result.data:
            raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
        
        # Find and delete all associations for this product
        db.table("product_owner_products").delete().eq("product_id", product_id).execute()
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting product owner associations for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 