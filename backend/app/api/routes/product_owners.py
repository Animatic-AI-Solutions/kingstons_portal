from fastapi import APIRouter, Depends, HTTPException, Query, Path, Response, status
from typing import List, Optional, Dict, Any
import logging
from pydantic import BaseModel
from ...db.database import get_db
from ...models.product_owner import ProductOwner, ProductOwnerCreate, ProductOwnerUpdate
router = APIRouter()
logger = logging.getLogger(__name__)

@router.get('/product-owners', response_model=List[ProductOwner])
async def get_product_owners_list(skip: int=Query(0, ge=0, description='Number of records to skip for pagination'), limit: int=Query(100000, ge=1, le=100000, description='Max number of records to return'), status: Optional[str]=Query(None, description="Filter by status (e.g., 'active', 'inactive')"), search: Optional[str]=Query(None, description='Search by name'), db=Depends(get_db)):
    """
    Retrieves a list of product owners, with optional filtering and pagination.
    Returns all product owners by default (including inactive). Use status parameter to filter.
    """
    try:
        logger.info(f'Fetching product owners with skip={skip}, limit={limit}, status={status}, search={search}')
        where_conditions = []
        params = []
        param_count = 0
        if status:
            param_count += 1
            where_conditions.append(f'status = ${param_count}')
            params.append(status)
        if search:
            param_count += 1
            search_condition = f'(firstname ILIKE ${param_count} OR surname ILIKE ${param_count} OR known_as ILIKE ${param_count})'
            where_conditions.append(search_condition)
            params.append(f'%{search}%')
        where_clause = ''
        if where_conditions:
            where_clause = 'WHERE ' + ' AND '.join(where_conditions)
        param_count += 1
        limit_clause = f'LIMIT ${param_count}'
        params.append(limit)
        param_count += 1
        offset_clause = f'OFFSET ${param_count}'
        params.append(skip)
        query = f'\n            SELECT id, firstname, surname, known_as, status, created_at\n            FROM product_owners\n            {where_clause}\n            ORDER BY firstname NULLS LAST, surname NULLS LAST\n            {limit_clause} {offset_clause}\n        '
        logger.info(f'Executing query: {query}')
        logger.info(f'Query params: {params}')
        result = await db.fetch(query, *params)
        logger.info(f'Query returned {len(result)} product owners')
        steven_check = await db.fetchrow("SELECT id, firstname, surname, known_as, status FROM product_owners WHERE known_as ILIKE '%steven%' OR firstname ILIKE '%steven%' OR surname ILIKE '%smart%'")
        if steven_check:
            logger.info(f'🔍 Steven Smart found in database: {dict(steven_check)}')
            steven_in_results = any((r['id'] == steven_check['id'] for r in result))
            logger.info(f'🔍 Steven Smart in current result set: {steven_in_results}')
        else:
            logger.warning('🔍 Steven Smart NOT found in database')
        if not result:
            logger.warning('No product owners found with the given criteria.')
            return []
        return [dict(row) for row in result]
    except Exception as e:
        logger.error(f'Error fetching product owners: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')

@router.get('/product-owners/{product_owner_id}', response_model=ProductOwner)
async def get_product_owner(product_owner_id: int=Path(..., description='The ID of the product owner to retrieve'), db=Depends(get_db)):
    """
    Retrieve a specific product owner by ID.
    """
    try:
        logger.info(f'Retrieving product owner with ID: {product_owner_id}')
        result = await db.fetchrow('SELECT * FROM product_owners WHERE id = $1', product_owner_id)
        if not result:
            raise HTTPException(status_code=404, detail=f'Product owner with ID {product_owner_id} not found')
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error retrieving product owner {product_owner_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.post('/product-owners', response_model=ProductOwner, status_code=status.HTTP_201_CREATED)
async def create_product_owner(product_owner: ProductOwnerCreate, db=Depends(get_db)):
    """
    Create a new product owner with all 25 fields.
    """
    try:
        logger.info(f'Creating new product owner: {product_owner.model_dump()}')

        result = await db.fetchrow(
            """
            INSERT INTO product_owners (
                status, firstname, surname, known_as,
                title, middle_names, relationship_status, gender, previous_names, dob, place_of_birth,
                email_1, email_2, phone_1, phone_2,
                moved_in_date, address_id,
                three_words, share_data_with,
                employment_status, occupation,
                passport_expiry_date, ni_number, aml_complete, aml_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
            RETURNING *
            """,
            product_owner.status, product_owner.firstname, product_owner.surname, product_owner.known_as,
            product_owner.title, product_owner.middle_names, product_owner.relationship_status,
            product_owner.gender, product_owner.previous_names, product_owner.dob, product_owner.place_of_birth,
            product_owner.email_1, product_owner.email_2, product_owner.phone_1, product_owner.phone_2,
            product_owner.moved_in_date, product_owner.address_id,
            product_owner.three_words, product_owner.share_data_with,
            product_owner.employment_status, product_owner.occupation,
            product_owner.passport_expiry_date, product_owner.ni_number, product_owner.aml_complete, product_owner.aml_date
        )

        if not result:
            raise HTTPException(status_code=500, detail='Failed to create product owner - no data returned from insert')

        logger.info(f"Created product owner ID: {result['id']}")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating product owner: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.patch('/product-owners/{product_owner_id}', response_model=ProductOwner)
async def update_product_owner(product_owner_update: ProductOwnerUpdate, product_owner_id: int=Path(..., description='The ID of the product owner to update'), db=Depends(get_db)):
    """
    Update an existing product owner.
    """
    try:
        logger.info(f'Updating product owner {product_owner_id} with data: {product_owner_update.model_dump()}')
        existing = await db.fetchrow('SELECT * FROM product_owners WHERE id = $1', product_owner_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f'Product owner with ID {product_owner_id} not found')
        update_data = product_owner_update.model_dump(exclude_unset=True)
        if not update_data:
            return dict(existing)
        set_clauses = [f'{col} = ${i + 2}' for i, col in enumerate(update_data.keys())]
        values = [product_owner_id] + list(update_data.values())
        query = f"\n            UPDATE product_owners \n            SET {', '.join(set_clauses)}\n            WHERE id = $1\n            RETURNING *\n        "
        result = await db.fetchrow(query, *values)
        if not result:
            raise HTTPException(status_code=500, detail='Failed to update product owner')
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating product owner {product_owner_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.delete('/product-owners/{product_owner_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_owner(product_owner_id: int=Path(..., description='The ID of the product owner to delete'), db=Depends(get_db)):
    """
    Delete a product owner and all their associations.
    
    This will:
    1. Delete all product owner-product associations
    2. Delete all product owner-client group associations  
    3. Delete the product owner record
    """
    try:
        logger.info(f'Deleting product owner with ID: {product_owner_id}')
        existing = await db.fetchrow('SELECT * FROM product_owners WHERE id = $1', product_owner_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f'Product owner with ID {product_owner_id} not found')
        logger.info(f'Deleting product owner-product associations for product owner {product_owner_id}')
        try:
            await db.execute('DELETE FROM product_owner_products WHERE product_owner_id = $1', product_owner_id)
            logger.info(f'Successfully deleted product owner-product associations for product owner {product_owner_id}')
        except Exception as e:
            logger.warning(f'Error deleting product owner-product associations: {str(e)}')
        logger.info(f'Deleting product owner-client group associations for product owner {product_owner_id}')
        try:
            await db.execute('DELETE FROM client_group_product_owners WHERE product_owner_id = $1', product_owner_id)
            logger.info(f'Successfully deleted product owner-client group associations for product owner {product_owner_id}')
        except Exception as e:
            logger.warning(f'Error deleting product owner-client group associations: {str(e)}')
        logger.info(f'Deleting product owner record {product_owner_id}')
        delete_result = await db.execute('DELETE FROM product_owners WHERE id = $1', product_owner_id)
        logger.info(f'Successfully deleted product owner {product_owner_id}')
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting product owner {product_owner_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.get('/product-owners/{product_owner_id}/client-groups', response_model=List[dict])
async def get_product_owner_client_groups(product_owner_id: int=Path(..., description='The ID of the product owner'), db=Depends(get_db)):
    """
    Get all client groups associated with a product owner.
    """
    try:
        logger.info(f'Retrieving client groups for product owner {product_owner_id}')
        existing = await db.fetchrow('SELECT * FROM product_owners WHERE id = $1', product_owner_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f'Product owner with ID {product_owner_id} not found')
        result = await db.fetch('\n            SELECT cg.* FROM client_groups cg\n            JOIN client_group_product_owners cgpo ON cg.id = cgpo.client_group_id\n            WHERE cgpo.product_owner_id = $1\n            ', product_owner_id)
        return [dict(row) for row in result]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error retrieving client groups for product owner {product_owner_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.get('/product-owners/{product_owner_id}/products', response_model=List[dict])
async def get_product_owner_products(product_owner_id: int=Path(..., description='The ID of the product owner'), db=Depends(get_db)):
    """
    Get all products associated with a product owner, including product owner information.
    """
    try:
        logger.info(f'Retrieving products for product owner {product_owner_id}')
        existing = await db.fetchrow('SELECT * FROM product_owners WHERE id = $1', product_owner_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f'Product owner with ID {product_owner_id} not found')
        products = await db.fetch('\n            SELECT cp.id as product_id, cp.product_name, cp.status, cp.client_id, cp.provider_id, \n                   cp.portfolio_id, cp.start_date, cp.end_date, cp.created_at,\n                   ap.name as provider_name, ap.theme_color as provider_theme_color, \n                   cg.name as client_name\n            FROM client_products cp\n            JOIN product_owner_products pop ON cp.id = pop.product_id\n            LEFT JOIN available_providers ap ON cp.provider_id = ap.id\n            LEFT JOIN client_groups cg ON cp.client_id = cg.id\n            WHERE pop.product_owner_id = $1\n            ', product_owner_id)
        if not products:
            return []
        enriched_products = []
        for product in products:
            product_owners_data = await db.fetch('\n                SELECT po.id, po.firstname, po.surname, po.known_as\n                FROM product_owners po\n                JOIN product_owner_products pop ON po.id = pop.product_owner_id\n                WHERE pop.product_id = $1\n                ', product['product_id'])
            product_owners = []
            for po in product_owners_data:
                display_name = f"{po['firstname'] or ''} {po['surname'] or ''}".strip()
                if not display_name and po['known_as']:
                    display_name = po['known_as']
                product_owners.append({'id': po['id'], 'name': display_name})
            enriched_product = dict(product)
            enriched_product['product_owners'] = product_owners
            enriched_products.append(enriched_product)
        return enriched_products
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error retrieving products for product owner {product_owner_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

class ProductOwnerProductCreate(BaseModel):
    product_owner_id: int
    product_id: int

@router.post('/product-owner-products', status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
async def create_product_owner_product(association: ProductOwnerProductCreate, db=Depends(get_db)):
    """
    Create a new association between a product owner and a product.
    """
    try:
        product_owner_id = association.product_owner_id
        product_id = association.product_id
        logger.info(f'Creating association between product owner {product_owner_id} and product {product_id}')
        product_owner = await db.fetchrow('SELECT id FROM product_owners WHERE id = $1', product_owner_id)
        if not product_owner:
            raise HTTPException(status_code=404, detail=f'Product owner with ID {product_owner_id} not found')
        product = await db.fetchrow('SELECT id FROM client_products WHERE id = $1', product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f'Product with ID {product_id} not found')
        existing = await db.fetchrow('SELECT * FROM product_owner_products WHERE product_owner_id = $1 AND product_id = $2', product_owner_id, product_id)
        if existing:
            return dict(existing)
        result = await db.fetchrow('\n            INSERT INTO product_owner_products (product_owner_id, product_id)\n            VALUES ($1, $2)\n            RETURNING *\n            ', product_owner_id, product_id)
        if not result:
            raise HTTPException(status_code=500, detail='Failed to create association')
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating product owner product association: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.delete('/product-owner-products/product/{product_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_owner_products_by_product(product_id: int=Path(..., description='The ID of the product to delete associations for'), db=Depends(get_db)):
    """
    Delete all associations between product owners and a specific product.
    
    This endpoint is needed to properly clean up associations before deleting a product.
    """
    try:
        logger.info(f'Deleting all product owner associations for product {product_id}')
        product = await db.fetchrow('SELECT id FROM client_products WHERE id = $1', product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f'Product with ID {product_id} not found')
        await db.execute('DELETE FROM product_owner_products WHERE product_id = $1', product_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting product owner associations for product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.delete('/product-owner-products/{product_owner_id}/{product_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_specific_product_owner_product_association(product_owner_id: int=Path(..., description='The ID of the product owner'), product_id: int=Path(..., description='The ID of the product'), db=Depends(get_db)):
    """
    Delete a specific association between a product owner and a product.
    
    This endpoint is used to remove individual product-owner relationships.
    """
    try:
        logger.info(f'Deleting association between product owner {product_owner_id} and product {product_id}')
        product_owner = await db.fetchrow('SELECT id FROM product_owners WHERE id = $1', product_owner_id)
        if not product_owner:
            raise HTTPException(status_code=404, detail=f'Product owner with ID {product_owner_id} not found')
        product = await db.fetchrow('SELECT id FROM client_products WHERE id = $1', product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f'Product with ID {product_id} not found')
        existing = await db.fetchrow('SELECT * FROM product_owner_products WHERE product_owner_id = $1 AND product_id = $2', product_owner_id, product_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f'No association found between product owner {product_owner_id} and product {product_id}')
        await db.execute('DELETE FROM product_owner_products WHERE product_owner_id = $1 AND product_id = $2', product_owner_id, product_id)
        logger.info(f'Successfully deleted association between product owner {product_owner_id} and product {product_id}')
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting association between product owner {product_owner_id} and product {product_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')