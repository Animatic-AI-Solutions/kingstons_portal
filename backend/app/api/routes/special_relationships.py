from fastapi import APIRouter, Depends, HTTPException, Query, Path, Response, status
from typing import List, Optional
import logging
from ...db.database import get_db
from ...models.special_relationship import (
    SpecialRelationship,
    SpecialRelationshipCreate,
    SpecialRelationshipUpdate,
    StatusUpdate
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get('/special_relationships', response_model=List[SpecialRelationship])
async def get_special_relationships(
    product_owner_id: Optional[int] = Query(None, description="Filter by product owner ID"),
    type: Optional[str] = Query(None, description="Filter by type (Personal/Professional)"),
    status: Optional[str] = Query(None, description="Filter by status (Active/Inactive/Deceased)"),
    db=Depends(get_db)
):
    """
    Retrieve special relationships with optional filtering.

    Query Parameters:
    - product_owner_id: Filter by specific product owner
    - type: Filter by Personal or Professional relationships
    - status: Filter by Active, Inactive, or Deceased status
    """
    try:
        logger.info(f'Fetching special relationships with filters: product_owner_id={product_owner_id}, type={type}, status={status}')

        # Build WHERE conditions
        where_conditions = []
        params = []
        param_count = 0

        # Always join with junction table to get product owner associations
        base_query = """
            SELECT DISTINCT sr.*
            FROM special_relationships sr
            LEFT JOIN product_owner_special_relationships posr ON sr.id = posr.special_relationship_id
        """

        if product_owner_id is not None:
            param_count += 1
            where_conditions.append(f'posr.product_owner_id = ${param_count}')
            params.append(product_owner_id)

        if type:
            param_count += 1
            where_conditions.append(f'sr.type = ${param_count}')
            params.append(type)

        if status:
            param_count += 1
            where_conditions.append(f'sr.status = ${param_count}')
            params.append(status)

        # Build WHERE clause
        where_clause = ''
        if where_conditions:
            where_clause = 'WHERE ' + ' AND '.join(where_conditions)

        query = f'{base_query} {where_clause} ORDER BY sr.name NULLS LAST'

        logger.info(f'Executing query: {query}')
        logger.info(f'Query params: {params}')

        result = await db.fetch(query, *params)
        logger.info(f'Query returned {len(result)} special relationships')

        # For each relationship, fetch associated product owner IDs
        relationships = []
        for row in result:
            rel_dict = dict(row)

            # Fetch product owner IDs for this relationship
            po_ids = await db.fetch(
                'SELECT product_owner_id FROM product_owner_special_relationships WHERE special_relationship_id = $1',
                row['id']
            )
            rel_dict['product_owner_ids'] = [po['product_owner_id'] for po in po_ids]

            relationships.append(rel_dict)

        return relationships

    except Exception as e:
        logger.error(f'Error fetching special relationships: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')


@router.post('/special_relationships', response_model=SpecialRelationship, status_code=status.HTTP_201_CREATED)
async def create_special_relationship(
    relationship: SpecialRelationshipCreate,
    db=Depends(get_db)
):
    """
    Create a new special relationship and link it to product owners.

    Request Body:
    - Must include at least one product_owner_id
    - All relationship fields as defined in SpecialRelationshipCreate model
    """
    try:
        logger.info(f'Creating new special relationship: {relationship.model_dump()}')

        # Verify all product owners exist
        for po_id in relationship.product_owner_ids:
            po_exists = await db.fetchval(
                'SELECT EXISTS(SELECT 1 FROM product_owners WHERE id = $1)',
                po_id
            )
            if not po_exists:
                raise HTTPException(
                    status_code=404,
                    detail=f'Product owner with ID {po_id} not found'
                )

        # Create the special relationship
        result = await db.fetchrow(
            """
            INSERT INTO special_relationships (
                name, type, date_of_birth, relationship, dependency,
                email, phone_number, status, address_id, notes, firm_name
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            """,
            relationship.name,
            relationship.type,
            relationship.date_of_birth,
            relationship.relationship,
            relationship.dependency,
            relationship.email,
            relationship.phone_number,
            relationship.status,
            relationship.address_id,
            relationship.notes,
            relationship.firm_name
        )

        if not result:
            raise HTTPException(
                status_code=500,
                detail='Failed to create special relationship - no data returned from insert'
            )

        relationship_id = result['id']
        logger.info(f"Created special relationship ID: {relationship_id}")

        # Create junction table entries
        for po_id in relationship.product_owner_ids:
            await db.execute(
                """
                INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
                VALUES ($1, $2)
                """,
                po_id,
                relationship_id
            )
            logger.info(f"Linked special relationship {relationship_id} to product owner {po_id}")

        # Return the created relationship with product owner IDs
        rel_dict = dict(result)
        rel_dict['product_owner_ids'] = relationship.product_owner_ids

        return rel_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating special relationship: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')


@router.put('/special_relationships/{relationship_id}', response_model=SpecialRelationship)
async def update_special_relationship(
    relationship_update: SpecialRelationshipUpdate,
    relationship_id: int = Path(..., description='The ID of the special relationship to update'),
    db=Depends(get_db)
):
    """
    Update an existing special relationship.

    Path Parameters:
    - relationship_id: The ID of the relationship to update

    Request Body:
    - Any fields from SpecialRelationshipUpdate model
    """
    try:
        logger.info(f'Updating special relationship {relationship_id} with data: {relationship_update.model_dump()}')

        # Check if relationship exists
        existing = await db.fetchrow(
            'SELECT * FROM special_relationships WHERE id = $1',
            relationship_id
        )

        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f'Special relationship with ID {relationship_id} not found'
            )

        # Get update data (only fields that were set)
        update_data = relationship_update.model_dump(exclude_unset=True)

        if not update_data:
            # No updates, return existing relationship
            rel_dict = dict(existing)
            # Get product owner IDs
            po_ids = await db.fetch(
                'SELECT product_owner_id FROM product_owner_special_relationships WHERE special_relationship_id = $1',
                relationship_id
            )
            rel_dict['product_owner_ids'] = [po['product_owner_id'] for po in po_ids]
            return rel_dict

        # Build UPDATE query dynamically
        set_clauses = [f'{col} = ${i + 2}' for i, col in enumerate(update_data.keys())]
        values = [relationship_id] + list(update_data.values())

        query = f"""
            UPDATE special_relationships
            SET {', '.join(set_clauses)}
            WHERE id = $1
            RETURNING *
        """

        result = await db.fetchrow(query, *values)

        if not result:
            raise HTTPException(status_code=500, detail='Failed to update special relationship')

        logger.info(f"Updated special relationship {relationship_id}")

        # Get product owner IDs
        po_ids = await db.fetch(
            'SELECT product_owner_id FROM product_owner_special_relationships WHERE special_relationship_id = $1',
            relationship_id
        )

        rel_dict = dict(result)
        rel_dict['product_owner_ids'] = [po['product_owner_id'] for po in po_ids]

        return rel_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating special relationship {relationship_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')


@router.patch('/special_relationships/{relationship_id}/status', response_model=SpecialRelationship)
async def update_relationship_status(
    status_update: StatusUpdate,
    relationship_id: int = Path(..., description='The ID of the special relationship to update'),
    db=Depends(get_db)
):
    """
    Update only the status of a special relationship.

    Path Parameters:
    - relationship_id: The ID of the relationship to update

    Request Body:
    - status: Must be "Active", "Inactive", or "Deceased"
    """
    try:
        logger.info(f'Updating status for special relationship {relationship_id} to {status_update.status}')

        # Check if relationship exists
        existing = await db.fetchrow(
            'SELECT * FROM special_relationships WHERE id = $1',
            relationship_id
        )

        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f'Special relationship with ID {relationship_id} not found'
            )

        # Update status
        result = await db.fetchrow(
            """
            UPDATE special_relationships
            SET status = $2
            WHERE id = $1
            RETURNING *
            """,
            relationship_id,
            status_update.status
        )

        if not result:
            raise HTTPException(status_code=500, detail='Failed to update relationship status')

        logger.info(f"Updated status for special relationship {relationship_id}")

        # Get product owner IDs
        po_ids = await db.fetch(
            'SELECT product_owner_id FROM product_owner_special_relationships WHERE special_relationship_id = $1',
            relationship_id
        )

        rel_dict = dict(result)
        rel_dict['product_owner_ids'] = [po['product_owner_id'] for po in po_ids]

        return rel_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating relationship status {relationship_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')


@router.delete('/special_relationships/{relationship_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_special_relationship(
    relationship_id: int = Path(..., description='The ID of the special relationship to delete'),
    db=Depends(get_db)
):
    """
    Hard delete a special relationship and all its associations.

    Path Parameters:
    - relationship_id: The ID of the relationship to delete

    This will:
    1. Delete all junction table entries (product_owner_special_relationships)
    2. Delete the special relationship record
    """
    try:
        logger.info(f'Deleting special relationship with ID: {relationship_id}')

        # Check if relationship exists
        existing = await db.fetchrow(
            'SELECT * FROM special_relationships WHERE id = $1',
            relationship_id
        )

        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f'Special relationship with ID {relationship_id} not found'
            )

        # Delete junction table entries first (foreign key constraint)
        logger.info(f'Deleting junction table entries for special relationship {relationship_id}')
        await db.execute(
            'DELETE FROM product_owner_special_relationships WHERE special_relationship_id = $1',
            relationship_id
        )
        logger.info(f'Successfully deleted junction table entries for special relationship {relationship_id}')

        # Delete the special relationship record
        logger.info(f'Deleting special relationship record {relationship_id}')
        await db.execute(
            'DELETE FROM special_relationships WHERE id = $1',
            relationship_id
        )
        logger.info(f'Successfully deleted special relationship {relationship_id}')

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting special relationship {relationship_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')
