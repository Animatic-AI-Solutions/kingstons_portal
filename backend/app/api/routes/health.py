"""
Health Product Owners API Routes.

This module provides CRUD endpoints for managing health records associated with product owners
in the Kingston's Portal wealth management system.

Endpoints:
- GET /health/product-owners - Retrieve health records (with product_owner_id or client_group_id filter)
- POST /health/product-owners - Create a new health record
- PUT /health/product-owners/{record_id} - Update an existing health record
- DELETE /health/product-owners/{record_id} - Delete a health record

Features:
- Input validation using Pydantic models
- Status enum validation (Active, Resolved, Monitoring, Inactive)
- Date validation (rejects future diagnosis dates)
- Max length validation (255 chars for condition)
- Proper error handling (400, 404, 422 responses)
- Parameterized queries for SQL injection protection
- Comprehensive logging for debugging and auditing

Security Note: This API stores user input as-is (including HTML/script tags).
XSS prevention is handled at the frontend layer through React's automatic escaping.
Backend validation focuses on SQL injection prevention via parameterized queries.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Response, status
from typing import List, Optional
import logging
from ...db.database import get_db
from ...models.health import (
    HealthProductOwner,
    HealthProductOwnerCreate,
    HealthProductOwnerUpdate,
    HealthSpecialRelationship,
    HealthSpecialRelationshipCreate,
    HealthSpecialRelationshipUpdate,
)

# Create router with prefix and tags for API documentation grouping
router = APIRouter(prefix="/health", tags=["health"])
logger = logging.getLogger(__name__)


@router.get('/product-owners', response_model=List[HealthProductOwner])
async def get_health_product_owners(
    response: Response,
    product_owner_id: Optional[int] = Query(
        None,
        gt=0,
        description="Filter by product owner ID (must be positive)"
    ),
    client_group_id: Optional[int] = Query(
        None,
        gt=0,
        description="Filter by client group ID (must be positive)"
    ),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    db=Depends(get_db)
):
    """
    Retrieve health records with optional filtering.

    Query Parameters:
        product_owner_id: Filter by specific product owner ID
        client_group_id: Filter by client group (returns records for all product owners in the group)

    Returns:
        List of HealthProductOwner objects matching the filter criteria

    Raises:
        HTTPException 400: When neither product_owner_id nor client_group_id is provided
        HTTPException 422: When provided IDs are invalid (negative or zero)

    Example:
        GET /api/health/product-owners?product_owner_id=1
        GET /api/health/product-owners?client_group_id=5
    """
    try:
        # Validate that at least one filter is provided
        if product_owner_id is None and client_group_id is None:
            logger.warning('GET request without filter parameters')
            raise HTTPException(
                status_code=400,
                detail='Either product_owner_id or client_group_id must be provided'
            )

        logger.info(
            f'Fetching health records with filters: '
            f'product_owner_id={product_owner_id}, client_group_id={client_group_id}'
        )

        # Build query based on filter type
        if product_owner_id is not None:
            # Direct filter by product owner
            count_query = """
                SELECT COUNT(*) FROM health_product_owners
                WHERE product_owner_id = $1
            """
            total = await db.fetchval(count_query, product_owner_id)

            query = """
                SELECT id, product_owner_id, condition, name, date_of_diagnosis,
                       status, medication, notes, created_at, date_recorded
                FROM health_product_owners
                WHERE product_owner_id = $1
                ORDER BY created_at DESC
                OFFSET $2 LIMIT $3
            """
            result = await db.fetch(query, product_owner_id, skip, limit)

        else:
            # Filter by client group - get all product owners in the group
            count_query = """
                SELECT COUNT(*)
                FROM health_product_owners hpo
                INNER JOIN client_group_product_owners cgpo
                    ON hpo.product_owner_id = cgpo.product_owner_id
                WHERE cgpo.client_group_id = $1
            """
            total = await db.fetchval(count_query, client_group_id)

            query = """
                SELECT hpo.id, hpo.product_owner_id, hpo.condition, hpo.name,
                       hpo.date_of_diagnosis, hpo.status, hpo.medication, hpo.notes,
                       hpo.created_at, hpo.date_recorded
                FROM health_product_owners hpo
                INNER JOIN client_group_product_owners cgpo
                    ON hpo.product_owner_id = cgpo.product_owner_id
                WHERE cgpo.client_group_id = $1
                ORDER BY hpo.created_at DESC
                OFFSET $2 LIMIT $3
            """
            result = await db.fetch(query, client_group_id, skip, limit)

        logger.info(f'Query returned {len(result)} of {total} total health records')

        # Set total count header for pagination
        response.headers["X-Total-Count"] = str(total or 0)

        # Convert database records to response format
        return [dict(row) for row in result]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching health records: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while fetching health records')


@router.post('/product-owners', response_model=HealthProductOwner, status_code=status.HTTP_201_CREATED)
async def create_health_product_owner(
    health_record: HealthProductOwnerCreate,
    db=Depends(get_db)
):
    """
    Create a new health record for a product owner.

    Request Body:
        HealthProductOwnerCreate object with:
        - product_owner_id: ID of the product owner (required, must exist)
        - condition: Type of health condition (required, 1-255 chars)
        - status: Status of the condition (Active, Resolved, Monitoring, Inactive)
        - name: Descriptive name (optional)
        - date_of_diagnosis: Date of diagnosis (optional, cannot be future)
        - medication: Current medications (optional)
        - notes: Additional notes (optional)

    Returns:
        The created HealthProductOwner object with generated id and timestamps

    Raises:
        HTTPException 404: When product_owner_id doesn't exist
        HTTPException 422: When validation fails (invalid status, future date, etc.)

    Example:
        POST /api/health/product-owners
        {
            "product_owner_id": 1,
            "condition": "Diabetes",
            "status": "Active",
            "name": "Type 2 Diabetes",
            "date_of_diagnosis": "2023-06-15"
        }
    """
    try:
        logger.info(f'Creating new health record for product_owner_id={health_record.product_owner_id}')

        # Verify product owner exists
        po_exists = await db.fetchval(
            'SELECT EXISTS(SELECT 1 FROM product_owners WHERE id = $1)',
            health_record.product_owner_id
        )
        if not po_exists:
            logger.warning(f'Product owner not found: {health_record.product_owner_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Product owner with ID {health_record.product_owner_id} not found'
            )

        # Insert the health record
        result = await db.fetchrow(
            """
            INSERT INTO health_product_owners (
                product_owner_id, condition, name, date_of_diagnosis,
                status, medication, notes, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING id, product_owner_id, condition, name, date_of_diagnosis,
                      status, medication, notes, created_at, date_recorded
            """,
            health_record.product_owner_id,
            health_record.condition,
            health_record.name,
            health_record.date_of_diagnosis,
            health_record.status,
            health_record.medication,
            health_record.notes
        )

        if not result:
            raise HTTPException(
                status_code=500,
                detail='Failed to create health record - no data returned from insert'
            )

        logger.info(f"Created health record ID: {result['id']}")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating health record: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while creating health record')


@router.put('/product-owners/{record_id}', response_model=HealthProductOwner)
async def update_health_product_owner(
    health_update: HealthProductOwnerUpdate,
    record_id: int = Path(
        ...,
        gt=0,
        description='The ID of the health record to update (must be positive)'
    ),
    db=Depends(get_db)
):
    """
    Update an existing health record.

    Path Parameters:
        record_id: The ID of the health record to update (must be positive)

    Request Body:
        HealthProductOwnerUpdate object with any combination of:
        - condition: Updated condition type
        - status: Updated status (Active, Resolved, Monitoring, Inactive)
        - name: Updated descriptive name
        - date_of_diagnosis: Updated diagnosis date
        - medication: Updated medications
        - notes: Updated notes

    Returns:
        The updated HealthProductOwner object

    Raises:
        HTTPException 404: When health record doesn't exist
        HTTPException 422: When validation fails (invalid record_id, status, date)

    Example:
        PUT /api/health/product-owners/1
        {
            "status": "Resolved",
            "notes": "Condition resolved after treatment"
        }
    """
    try:
        logger.info(f'Updating health record id={record_id}')

        # Check if record exists
        existing = await db.fetchrow(
            """
            SELECT id, product_owner_id, condition, name, date_of_diagnosis,
                   status, medication, notes, created_at, date_recorded
            FROM health_product_owners
            WHERE id = $1
            """,
            record_id
        )

        if not existing:
            logger.warning(f'Health record not found: {record_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Health record with ID {record_id} not found'
            )

        # Get update data (only fields that were set)
        update_data = health_update.model_dump(exclude_unset=True)

        if not update_data:
            # No updates provided, return existing record
            logger.info(f'No updates provided for record {record_id}, returning existing')
            return dict(existing)

        # Build UPDATE query dynamically based on provided fields
        set_clauses = []
        values = [record_id]  # $1 is always the record_id

        for i, (col, val) in enumerate(update_data.items(), start=2):
            set_clauses.append(f'{col} = ${i}')
            values.append(val)

        query = f"""
            UPDATE health_product_owners
            SET {', '.join(set_clauses)}
            WHERE id = $1
            RETURNING id, product_owner_id, condition, name, date_of_diagnosis,
                      status, medication, notes, created_at, date_recorded
        """

        result = await db.fetchrow(query, *values)

        if not result:
            raise HTTPException(status_code=500, detail='Failed to update health record')

        logger.info(f"Updated health record {record_id}")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating health record {record_id}: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while updating health record')


@router.delete('/product-owners/{record_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_health_product_owner(
    record_id: int = Path(
        ...,
        gt=0,
        description='The ID of the health record to delete (must be positive)'
    ),
    db=Depends(get_db)
):
    """
    Delete a health record.

    Path Parameters:
        record_id: The ID of the health record to delete (must be positive)

    Returns:
        204 No Content on successful deletion

    Raises:
        HTTPException 404: When health record doesn't exist
        HTTPException 422: When record_id is invalid (negative or zero)

    Note:
        This is a hard delete operation. The record will be permanently removed.
        Delete operations are idempotent - deleting an already-deleted record returns 404.

    Example:
        DELETE /api/health/product-owners/1
    """
    try:
        logger.info(f'Deleting health record with ID: {record_id}')

        # Check if record exists
        existing = await db.fetchval(
            'SELECT EXISTS(SELECT 1 FROM health_product_owners WHERE id = $1)',
            record_id
        )

        if not existing:
            logger.warning(f'Health record not found for deletion: {record_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Health record with ID {record_id} not found'
            )

        # Delete the record
        await db.execute(
            'DELETE FROM health_product_owners WHERE id = $1',
            record_id
        )

        logger.info(f'Successfully deleted health record {record_id}')
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting health record {record_id}: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while deleting health record')


# =============================================================================
# Health Special Relationships Endpoints
# =============================================================================


@router.get('/special-relationships', response_model=List[HealthSpecialRelationship])
async def get_health_special_relationships(
    response: Response,
    special_relationship_id: Optional[int] = Query(
        None,
        gt=0,
        description="Filter by special relationship ID (must be positive)"
    ),
    client_group_id: Optional[int] = Query(
        None,
        gt=0,
        description="Filter by client group ID (must be positive)"
    ),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    db=Depends(get_db)
):
    """
    Retrieve health records for special relationships with optional filtering.

    Query Parameters:
        special_relationship_id: Filter by specific special relationship ID
        client_group_id: Filter by client group (returns records for all special relationships in the group)

    Returns:
        List of HealthSpecialRelationship objects matching the filter criteria

    Raises:
        HTTPException 400: When neither special_relationship_id nor client_group_id is provided
        HTTPException 422: When provided IDs are invalid (negative or zero)

    Example:
        GET /api/health/special-relationships?special_relationship_id=1
        GET /api/health/special-relationships?client_group_id=5
    """
    try:
        # Validate that at least one filter is provided
        if special_relationship_id is None and client_group_id is None:
            logger.warning('GET request for special relationships without filter parameters')
            raise HTTPException(
                status_code=400,
                detail='Either special_relationship_id or client_group_id must be provided'
            )

        logger.info(
            f'Fetching health records for special relationships with filters: '
            f'special_relationship_id={special_relationship_id}, client_group_id={client_group_id}'
        )

        # Build query based on filter type
        if special_relationship_id is not None:
            # Direct filter by special relationship
            count_query = """
                SELECT COUNT(*) FROM health_special_relationships
                WHERE special_relationship_id = $1
            """
            total = await db.fetchval(count_query, special_relationship_id)

            query = """
                SELECT id, special_relationship_id, condition, name, date_of_diagnosis,
                       status, medication, notes, created_at, date_recorded
                FROM health_special_relationships
                WHERE special_relationship_id = $1
                ORDER BY created_at DESC
                OFFSET $2 LIMIT $3
            """
            result = await db.fetch(query, special_relationship_id, skip, limit)

        else:
            # Filter by client group - get all special relationships in the group
            # The path is: client_groups -> client_group_product_owners -> product_owners
            #              -> product_owner_special_relationships -> special_relationships
            count_query = """
                SELECT COUNT(DISTINCT hsr.id)
                FROM health_special_relationships hsr
                INNER JOIN special_relationships sr
                    ON hsr.special_relationship_id = sr.id
                INNER JOIN product_owner_special_relationships posr
                    ON sr.id = posr.special_relationship_id
                INNER JOIN client_group_product_owners cgpo
                    ON posr.product_owner_id = cgpo.product_owner_id
                WHERE cgpo.client_group_id = $1
            """
            total = await db.fetchval(count_query, client_group_id)

            query = """
                SELECT DISTINCT hsr.id, hsr.special_relationship_id, hsr.condition, hsr.name,
                       hsr.date_of_diagnosis, hsr.status, hsr.medication, hsr.notes,
                       hsr.created_at, hsr.date_recorded
                FROM health_special_relationships hsr
                INNER JOIN special_relationships sr
                    ON hsr.special_relationship_id = sr.id
                INNER JOIN product_owner_special_relationships posr
                    ON sr.id = posr.special_relationship_id
                INNER JOIN client_group_product_owners cgpo
                    ON posr.product_owner_id = cgpo.product_owner_id
                WHERE cgpo.client_group_id = $1
                ORDER BY hsr.created_at DESC
                OFFSET $2 LIMIT $3
            """
            result = await db.fetch(query, client_group_id, skip, limit)

        logger.info(f'Query returned {len(result)} of {total} total health records for special relationships')

        # Set total count header for pagination
        response.headers["X-Total-Count"] = str(total or 0)

        # Convert database records to response format
        return [dict(row) for row in result]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching health records for special relationships: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while fetching health records')


@router.post('/special-relationships', response_model=HealthSpecialRelationship, status_code=status.HTTP_201_CREATED)
async def create_health_special_relationship(
    health_record: HealthSpecialRelationshipCreate,
    db=Depends(get_db)
):
    """
    Create a new health record for a special relationship.

    Request Body:
        HealthSpecialRelationshipCreate object with:
        - special_relationship_id: ID of the special relationship (required, must exist)
        - condition: Type of health condition (required, 1-255 chars)
        - status: Status of the condition (Active, Resolved, Monitoring, Inactive)
        - name: Descriptive name (optional)
        - date_of_diagnosis: Date of diagnosis (optional, cannot be future)
        - medication: Current medications (optional)
        - notes: Additional notes (optional)

    Returns:
        The created HealthSpecialRelationship object with generated id and timestamps

    Raises:
        HTTPException 404: When special_relationship_id doesn't exist
        HTTPException 422: When validation fails (invalid status, future date, etc.)

    Example:
        POST /api/health/special-relationships
        {
            "special_relationship_id": 1,
            "condition": "Heart Disease",
            "status": "Active",
            "name": "Coronary Artery Disease",
            "date_of_diagnosis": "2023-06-15"
        }
    """
    try:
        logger.info(f'Creating new health record for special_relationship_id={health_record.special_relationship_id}')

        # Verify special relationship exists
        sr_exists = await db.fetchval(
            'SELECT EXISTS(SELECT 1 FROM special_relationships WHERE id = $1)',
            health_record.special_relationship_id
        )
        if not sr_exists:
            logger.warning(f'Special relationship not found: {health_record.special_relationship_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Special relationship with ID {health_record.special_relationship_id} not found'
            )

        # Insert the health record
        result = await db.fetchrow(
            """
            INSERT INTO health_special_relationships (
                special_relationship_id, condition, name, date_of_diagnosis,
                status, medication, notes, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING id, special_relationship_id, condition, name, date_of_diagnosis,
                      status, medication, notes, created_at, date_recorded
            """,
            health_record.special_relationship_id,
            health_record.condition,
            health_record.name,
            health_record.date_of_diagnosis,
            health_record.status,
            health_record.medication,
            health_record.notes
        )

        if not result:
            raise HTTPException(
                status_code=500,
                detail='Failed to create health record - no data returned from insert'
            )

        logger.info(f"Created health record ID for special relationship: {result['id']}")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating health record for special relationship: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while creating health record')


@router.put('/special-relationships/{record_id}', response_model=HealthSpecialRelationship)
async def update_health_special_relationship(
    health_update: HealthSpecialRelationshipUpdate,
    record_id: int = Path(
        ...,
        gt=0,
        description='The ID of the health record to update (must be positive)'
    ),
    db=Depends(get_db)
):
    """
    Update an existing health record for a special relationship.

    Path Parameters:
        record_id: The ID of the health record to update (must be positive)

    Request Body:
        HealthSpecialRelationshipUpdate object with any combination of:
        - condition: Updated condition type
        - status: Updated status (Active, Resolved, Monitoring, Inactive)
        - name: Updated descriptive name
        - date_of_diagnosis: Updated diagnosis date
        - medication: Updated medications
        - notes: Updated notes

    Returns:
        The updated HealthSpecialRelationship object

    Raises:
        HTTPException 404: When health record doesn't exist
        HTTPException 422: When validation fails (invalid record_id, status, date)

    Example:
        PUT /api/health/special-relationships/1
        {
            "status": "Resolved",
            "notes": "Condition resolved after treatment"
        }
    """
    try:
        logger.info(f'Updating health record id={record_id} for special relationship')

        # Check if record exists
        existing = await db.fetchrow(
            """
            SELECT id, special_relationship_id, condition, name, date_of_diagnosis,
                   status, medication, notes, created_at, date_recorded
            FROM health_special_relationships
            WHERE id = $1
            """,
            record_id
        )

        if not existing:
            logger.warning(f'Health record not found for special relationship: {record_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Health record with ID {record_id} not found'
            )

        # Get update data (only fields that were set)
        update_data = health_update.model_dump(exclude_unset=True)

        if not update_data:
            # No updates provided, return existing record
            logger.info(f'No updates provided for record {record_id}, returning existing')
            return dict(existing)

        # Build UPDATE query dynamically based on provided fields
        set_clauses = []
        values = [record_id]  # $1 is always the record_id

        for i, (col, val) in enumerate(update_data.items(), start=2):
            set_clauses.append(f'{col} = ${i}')
            values.append(val)

        query = f"""
            UPDATE health_special_relationships
            SET {', '.join(set_clauses)}
            WHERE id = $1
            RETURNING id, special_relationship_id, condition, name, date_of_diagnosis,
                      status, medication, notes, created_at, date_recorded
        """

        result = await db.fetchrow(query, *values)

        if not result:
            raise HTTPException(status_code=500, detail='Failed to update health record')

        logger.info(f"Updated health record {record_id} for special relationship")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating health record {record_id} for special relationship: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while updating health record')


@router.delete('/special-relationships/{record_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_health_special_relationship(
    record_id: int = Path(
        ...,
        gt=0,
        description='The ID of the health record to delete (must be positive)'
    ),
    db=Depends(get_db)
):
    """
    Delete a health record for a special relationship.

    Path Parameters:
        record_id: The ID of the health record to delete (must be positive)

    Returns:
        204 No Content on successful deletion

    Raises:
        HTTPException 404: When health record doesn't exist
        HTTPException 422: When record_id is invalid (negative or zero)

    Note:
        This is a hard delete operation. The record will be permanently removed.
        Delete operations are idempotent - deleting an already-deleted record returns 404.

    Example:
        DELETE /api/health/special-relationships/1
    """
    try:
        logger.info(f'Deleting health record for special relationship with ID: {record_id}')

        # Check if record exists
        existing = await db.fetchval(
            'SELECT EXISTS(SELECT 1 FROM health_special_relationships WHERE id = $1)',
            record_id
        )

        if not existing:
            logger.warning(f'Health record not found for deletion (special relationship): {record_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Health record with ID {record_id} not found'
            )

        # Delete the record
        await db.execute(
            'DELETE FROM health_special_relationships WHERE id = $1',
            record_id
        )

        logger.info(f'Successfully deleted health record {record_id} for special relationship')
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting health record {record_id} for special relationship: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while deleting health record')
