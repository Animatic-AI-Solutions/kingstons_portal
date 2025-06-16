from fastapi import APIRouter, Depends, HTTPException, Path, status, Response
from typing import List, Dict, Any
from pydantic import BaseModel
import logging

from ...db.database import get_db

class ClientGroupProductOwnerCreate(BaseModel):
    client_group_id: int
    product_owner_id: int

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/client_group_product_owners", response_model=List[Dict[str, Any]])
async def get_client_group_product_owners(
    client_group_id: int = None,
    product_owner_id: int = None,
    db = Depends(get_db)
):
    """
    Get all client group - product owner associations, with optional filtering.
    """
    try:
        logger.info(f"Retrieving client_group_product_owners with filters: client_group_id={client_group_id}, product_owner_id={product_owner_id}")
        
        # Build the query
        query = db.table("client_group_product_owners").select("*")
        
        # Apply filters if provided
        if client_group_id is not None:
            query = query.eq("client_group_id", client_group_id)
        
        if product_owner_id is not None:
            query = query.eq("product_owner_id", product_owner_id)
        
        # Execute the query
        result = query.execute()
        
        return result.data or []
    
    except Exception as e:
        logger.error(f"Error retrieving client_group_product_owners: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/client_group_product_owners", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
async def create_client_group_product_owner(
    association_data: ClientGroupProductOwnerCreate,
    db = Depends(get_db)
):
    """
    Create a new association between a client group and a product owner.
    """
    try:
        client_group_id = association_data.client_group_id
        product_owner_id = association_data.product_owner_id
        logger.info(f"Creating association between client group {client_group_id} and product owner {product_owner_id}")
        
        # Check if client group exists
        client_group_result = db.table("client_groups").select("id").eq("id", client_group_id).execute()
        
        if not client_group_result.data:
            raise HTTPException(status_code=404, detail=f"Client group with ID {client_group_id} not found")
        
        # Check if product owner exists
        product_owner_result = db.table("product_owners").select("id").eq("id", product_owner_id).execute()
        
        if not product_owner_result.data:
            raise HTTPException(status_code=404, detail=f"Product owner with ID {product_owner_id} not found")
        
        # Check if the association already exists
        existing_result = db.table("client_group_product_owners") \
            .select("*") \
            .eq("client_group_id", client_group_id) \
            .eq("product_owner_id", product_owner_id) \
            .execute()
        
        if existing_result.data:
            # Association already exists, return it
            return existing_result.data[0]
        
        # Create the association
        new_association = {
            "client_group_id": client_group_id,
            "product_owner_id": product_owner_id
        }
        
        result = db.table("client_group_product_owners").insert(new_association).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create association")
        
        return result.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating client group product owner association: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/client_group_product_owners/{association_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client_group_product_owner(
    association_id: int = Path(..., description="The ID of the association to delete"),
    db = Depends(get_db)
):
    """
    Delete an association between a client group and a product owner.
    """
    try:
        logger.info(f"Deleting client group product owner association with ID: {association_id}")
        
        # Check if the association exists
        check_result = db.table("client_group_product_owners").select("*").eq("id", association_id).execute()
        
        if not check_result.data:
            raise HTTPException(status_code=404, detail=f"Association with ID {association_id} not found")
        
        # Delete the association
        db.table("client_group_product_owners").delete().eq("id", association_id).execute()
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting association {association_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/client_group_product_owners", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client_group_product_owner_by_ids(
    client_group_id: int,
    product_owner_id: int,
    db = Depends(get_db)
):
    """
    Delete an association between a client group and a product owner using their IDs.
    """
    try:
        logger.info(f"Deleting association between client group {client_group_id} and product owner {product_owner_id}")
        
        # Check if the association exists
        check_result = db.table("client_group_product_owners") \
            .select("*") \
            .eq("client_group_id", client_group_id) \
            .eq("product_owner_id", product_owner_id) \
            .execute()
        
        if not check_result.data:
            raise HTTPException(
                status_code=404, 
                detail=f"Association between client group {client_group_id} and product owner {product_owner_id} not found"
            )
        
        # Delete the association
        db.table("client_group_product_owners") \
            .delete() \
            .eq("client_group_id", client_group_id) \
            .eq("product_owner_id", product_owner_id) \
            .execute()
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting association between client group {client_group_id} and product owner {product_owner_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 