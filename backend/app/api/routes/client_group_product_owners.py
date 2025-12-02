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

@router.get('/client-group-product-owners', response_model=List[Dict[str, Any]])
async def get_client_group_product_owners(client_group_id: int=None, product_owner_id: int=None, db=Depends(get_db)):
    """
    Get all client group - product owner associations, with optional filtering.
    """
    try:
        logger.info(f'Retrieving client_group_product_owners with filters: client_group_id={client_group_id}, product_owner_id={product_owner_id}')
        base_query = 'SELECT * FROM client_group_product_owners'
        conditions = []
        params = []
        if client_group_id is not None:
            conditions.append('client_group_id = $' + str(len(params) + 1))
            params.append(client_group_id)
        if product_owner_id is not None:
            conditions.append('product_owner_id = $' + str(len(params) + 1))
            params.append(product_owner_id)
        if conditions:
            query = base_query + ' WHERE ' + ' AND '.join(conditions)
        else:
            query = base_query
        result = await db.fetch(query, *params)
        return [dict(row) for row in result] or []
    except Exception as e:
        logger.error(f'Error retrieving client_group_product_owners: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.post('/client-group-product-owners', status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
async def create_client_group_product_owner(association_data: ClientGroupProductOwnerCreate, db=Depends(get_db)):
    """
    Create a new association between a client group and a product owner.
    """
    try:
        client_group_id = association_data.client_group_id
        product_owner_id = association_data.product_owner_id
        logger.info(f'Creating association between client group {client_group_id} and product owner {product_owner_id}')
        client_group_result = await db.fetchrow('SELECT id FROM client_groups WHERE id = $1', client_group_id)
        if not client_group_result:
            raise HTTPException(status_code=404, detail=f'Client group with ID {client_group_id} not found')
        product_owner_result = await db.fetchrow('SELECT id FROM product_owners WHERE id = $1', product_owner_id)
        if not product_owner_result:
            raise HTTPException(status_code=404, detail=f'Product owner with ID {product_owner_id} not found')
        existing_result = await db.fetchrow('SELECT * FROM client_group_product_owners WHERE client_group_id = $1 AND product_owner_id = $2', client_group_id, product_owner_id)
        if existing_result:
            return dict(existing_result)
        result = await db.fetchrow('INSERT INTO client_group_product_owners (client_group_id, product_owner_id) \n               VALUES ($1, $2) RETURNING *', client_group_id, product_owner_id)
        if not result:
            raise HTTPException(status_code=500, detail='Failed to create association')
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating client group product owner association: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.delete('/client-group-product-owners/{association_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_client_group_product_owner(association_id: int=Path(..., description='The ID of the association to delete'), db=Depends(get_db)):
    """
    Delete an association between a client group and a product owner.
    """
    try:
        logger.info(f'Deleting client group product owner association with ID: {association_id}')
        check_result = await db.fetchrow('SELECT * FROM client_group_product_owners WHERE id = $1', association_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f'Association with ID {association_id} not found')
        await db.execute('DELETE FROM client_group_product_owners WHERE id = $1', association_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting association {association_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.delete('/client-group-product-owners', status_code=status.HTTP_204_NO_CONTENT)
async def delete_client_group_product_owner_by_ids(client_group_id: int, product_owner_id: int, db=Depends(get_db)):
    """
    Delete an association between a client group and a product owner using their IDs.
    """
    try:
        logger.info(f'Deleting association between client group {client_group_id} and product owner {product_owner_id}')
        check_result = await db.fetchrow('SELECT * FROM client_group_product_owners WHERE client_group_id = $1 AND product_owner_id = $2', client_group_id, product_owner_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f'Association between client group {client_group_id} and product owner {product_owner_id} not found')
        await db.execute('DELETE FROM client_group_product_owners WHERE client_group_id = $1 AND product_owner_id = $2', client_group_id, product_owner_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting association between client group {client_group_id} and product owner {product_owner_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')