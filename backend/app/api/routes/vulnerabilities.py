"""
Vulnerabilities Product Owners API Routes.

This module provides CRUD endpoints for managing vulnerability records associated with product owners
in the Kingston's Portal wealth management system.

Endpoints:
- GET /vulnerabilities/product-owners - Retrieve vulnerability records (with product_owner_id or client_group_id filter)
- POST /vulnerabilities/product-owners - Create a new vulnerability record
- PUT /vulnerabilities/product-owners/{record_id} - Update an existing vulnerability record
- DELETE /vulnerabilities/product-owners/{record_id} - Delete a vulnerability record

Features:
- Input validation using Pydantic models
- Status enum validation (Active, Resolved, Monitoring, Inactive)
- Description validation (1-500 chars, non-empty)
- Diagnosed boolean field with default False
- Proper error handling (400, 404, 422 responses)
- Parameterized queries for SQL injection protection
- Comprehensive logging for debugging and auditing (IDs only, no PHI)

Security Note: This API stores user input as-is (including HTML/script tags).
XSS prevention is handled at the frontend layer through React's automatic escaping.
Backend validation focuses on SQL injection prevention via parameterized queries.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Response, status
from typing import List, Optional
import logging
from ...db.database import get_db
from ...models.vulnerability import (
    VulnerabilityProductOwner,
    VulnerabilityProductOwnerCreate,
    VulnerabilityProductOwnerUpdate,
    VulnerabilitySpecialRelationship,
    VulnerabilitySpecialRelationshipCreate,
    VulnerabilitySpecialRelationshipUpdate,
)

# Create router with prefix and tags for API documentation grouping
router = APIRouter(prefix="/vulnerabilities", tags=["vulnerabilities"])
logger = logging.getLogger(__name__)


@router.get('/product-owners', response_model=List[VulnerabilityProductOwner])
async def get_vulnerability_product_owners(
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
    Retrieve vulnerability records with optional filtering.

    This endpoint returns vulnerability records for product owners. At least one filter
    parameter (product_owner_id or client_group_id) must be provided to prevent
    returning all records in the database.

    Query Parameters:
        product_owner_id: Filter by specific product owner ID (must be positive integer)
        client_group_id: Filter by client group (returns records for all product owners in the group)
        skip: Number of records to skip for pagination (default: 0, must be >= 0)
        limit: Maximum number of records to return (default: 100, range: 1-1000)

    Returns:
        List[VulnerabilityProductOwner]: List of vulnerability records matching the filter criteria.
            Each record includes: id, product_owner_id, description, adjustments, diagnosed,
            status, notes, created_at, date_recorded

    Raises:
        HTTPException 400: When neither product_owner_id nor client_group_id is provided
        HTTPException 422: When provided IDs are invalid (negative, zero, or non-integer)

    Example:
        GET /api/vulnerabilities/product-owners?product_owner_id=1
        GET /api/vulnerabilities/product-owners?client_group_id=5
        GET /api/vulnerabilities/product-owners?product_owner_id=1&skip=10&limit=25
    """
    try:
        # Validate that at least one filter is provided
        if product_owner_id is None and client_group_id is None:
            logger.warning('GET request for vulnerabilities without filter parameters')
            raise HTTPException(
                status_code=400,
                detail='Either product_owner_id or client_group_id must be provided'
            )

        logger.info(
            f'Fetching vulnerability records with filters: '
            f'product_owner_id={product_owner_id}, client_group_id={client_group_id}, '
            f'skip={skip}, limit={limit}'
        )

        # Build query based on filter type
        if product_owner_id is not None:
            # Direct filter by product owner
            count_query = """
                SELECT COUNT(*) FROM vulnerabilities_product_owners
                WHERE product_owner_id = $1
            """
            total = await db.fetchval(count_query, product_owner_id)

            query = """
                SELECT id, product_owner_id, description, adjustments, diagnosed,
                       status, notes, created_at, date_recorded
                FROM vulnerabilities_product_owners
                WHERE product_owner_id = $1
                ORDER BY created_at DESC
                OFFSET $2 LIMIT $3
            """
            result = await db.fetch(query, product_owner_id, skip, limit)

        else:
            # Filter by client group - get all product owners in the group
            count_query = """
                SELECT COUNT(*)
                FROM vulnerabilities_product_owners vpo
                INNER JOIN client_group_product_owners cgpo
                    ON vpo.product_owner_id = cgpo.product_owner_id
                WHERE cgpo.client_group_id = $1
            """
            total = await db.fetchval(count_query, client_group_id)

            query = """
                SELECT vpo.id, vpo.product_owner_id, vpo.description, vpo.adjustments,
                       vpo.diagnosed, vpo.status, vpo.notes,
                       vpo.created_at, vpo.date_recorded
                FROM vulnerabilities_product_owners vpo
                INNER JOIN client_group_product_owners cgpo
                    ON vpo.product_owner_id = cgpo.product_owner_id
                WHERE cgpo.client_group_id = $1
                ORDER BY vpo.created_at DESC
                OFFSET $2 LIMIT $3
            """
            result = await db.fetch(query, client_group_id, skip, limit)

        logger.info(f'Query returned {len(result)} of {total} total vulnerability records')

        # Set total count header for pagination
        response.headers["X-Total-Count"] = str(total or 0)

        # Convert database records to response format
        return [dict(row) for row in result]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching vulnerability records: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while fetching vulnerability records')


@router.post('/product-owners', response_model=VulnerabilityProductOwner, status_code=status.HTTP_201_CREATED)
async def create_vulnerability_product_owner(
    vulnerability_record: VulnerabilityProductOwnerCreate,
    db=Depends(get_db)
):
    """
    Create a new vulnerability record for a product owner.

    This endpoint creates a new vulnerability record in the database. The product_owner_id
    must reference an existing product owner in the system.

    Request Body:
        VulnerabilityProductOwnerCreate object with:
        - product_owner_id: ID of the product owner (required, must exist in database)
        - description: Description of the vulnerability (required, 1-500 chars, non-empty)
        - adjustments: Adjustments made to accommodate the vulnerability (optional, max 1000 chars)
        - diagnosed: Whether the vulnerability has been officially diagnosed (default: False)
        - status: Status of the vulnerability (Active, Resolved, Monitoring, Inactive; default: Active)
        - notes: Additional notes about the vulnerability (optional, max 2000 chars)

    Returns:
        VulnerabilityProductOwner: The created vulnerability record with generated id, created_at,
            and date_recorded timestamps

    Raises:
        HTTPException 404: When product_owner_id doesn't exist in the database
        HTTPException 422: When validation fails (invalid status, empty description, etc.)

    Example:
        POST /api/vulnerabilities/product-owners
        {
            "product_owner_id": 1,
            "description": "Hearing impairment",
            "adjustments": "Speak clearly, face-to-face",
            "diagnosed": true,
            "status": "Active"
        }
    """
    try:
        logger.info(f'Creating new vulnerability record for product_owner_id={vulnerability_record.product_owner_id}')

        # Verify product owner exists
        po_exists = await db.fetchval(
            'SELECT EXISTS(SELECT 1 FROM product_owners WHERE id = $1)',
            vulnerability_record.product_owner_id
        )
        if not po_exists:
            logger.warning(f'Product owner not found: {vulnerability_record.product_owner_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Product owner with ID {vulnerability_record.product_owner_id} not found'
            )

        # Insert the vulnerability record
        result = await db.fetchrow(
            """
            INSERT INTO vulnerabilities_product_owners (
                product_owner_id, description, adjustments, diagnosed,
                status, notes, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, product_owner_id, description, adjustments, diagnosed,
                      status, notes, created_at, date_recorded
            """,
            vulnerability_record.product_owner_id,
            vulnerability_record.description,
            vulnerability_record.adjustments,
            vulnerability_record.diagnosed,
            vulnerability_record.status,
            vulnerability_record.notes
        )

        if not result:
            raise HTTPException(
                status_code=500,
                detail='Failed to create vulnerability record - no data returned from insert'
            )

        logger.info(f"Created vulnerability record ID: {result['id']}")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating vulnerability record: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while creating vulnerability record')


@router.put('/product-owners/{record_id}', response_model=VulnerabilityProductOwner)
async def update_vulnerability_product_owner(
    vulnerability_update: VulnerabilityProductOwnerUpdate,
    record_id: int = Path(
        ...,
        gt=0,
        description='The ID of the vulnerability record to update (must be positive)'
    ),
    db=Depends(get_db)
):
    """
    Update an existing vulnerability record.

    This endpoint performs a partial update on an existing vulnerability record.
    Only fields provided in the request body will be updated; other fields
    remain unchanged.

    Path Parameters:
        record_id: The ID of the vulnerability record to update (must be positive integer)

    Request Body:
        VulnerabilityProductOwnerUpdate object with any combination of:
        - description: Updated description (1-500 chars if provided)
        - adjustments: Updated adjustments (max 1000 chars)
        - diagnosed: Updated diagnosed status (boolean)
        - status: Updated status (Active, Resolved, Monitoring, Inactive)
        - notes: Updated notes (max 2000 chars)

    Returns:
        VulnerabilityProductOwner: The updated vulnerability record with all fields

    Raises:
        HTTPException 404: When vulnerability record doesn't exist
        HTTPException 422: When validation fails (invalid record_id, status, description)

    Example:
        PUT /api/vulnerabilities/product-owners/1
        {
            "status": "Resolved",
            "adjustments": "Updated adjustments"
        }
    """
    try:
        logger.info(f'Updating vulnerability record id={record_id}')

        # Check if record exists
        existing = await db.fetchrow(
            """
            SELECT id, product_owner_id, description, adjustments, diagnosed,
                   status, notes, created_at, date_recorded
            FROM vulnerabilities_product_owners
            WHERE id = $1
            """,
            record_id
        )

        if not existing:
            logger.warning(f'Vulnerability record not found: {record_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Vulnerability record with ID {record_id} not found'
            )

        # Get update data (only fields that were set)
        update_data = vulnerability_update.model_dump(exclude_unset=True)

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
            UPDATE vulnerabilities_product_owners
            SET {', '.join(set_clauses)}
            WHERE id = $1
            RETURNING id, product_owner_id, description, adjustments, diagnosed,
                      status, notes, created_at, date_recorded
        """

        result = await db.fetchrow(query, *values)

        if not result:
            raise HTTPException(status_code=500, detail='Failed to update vulnerability record')

        logger.info(f"Updated vulnerability record {record_id}")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating vulnerability record {record_id}: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while updating vulnerability record')


@router.delete('/product-owners/{record_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_vulnerability_product_owner(
    record_id: int = Path(
        ...,
        gt=0,
        description='The ID of the vulnerability record to delete (must be positive)'
    ),
    db=Depends(get_db)
):
    """
    Delete a vulnerability record.

    This endpoint permanently removes a vulnerability record from the database.
    This is a hard delete operation and cannot be undone.

    Path Parameters:
        record_id: The ID of the vulnerability record to delete (must be positive integer)

    Returns:
        204 No Content: On successful deletion (empty response body)

    Raises:
        HTTPException 404: When vulnerability record doesn't exist
        HTTPException 422: When record_id is invalid (negative, zero, or non-integer)

    Note:
        Delete operations are idempotent - deleting an already-deleted record returns 404.
        This is the expected behavior for RESTful APIs.

    Example:
        DELETE /api/vulnerabilities/product-owners/1
    """
    try:
        logger.info(f'Deleting vulnerability record with ID: {record_id}')

        # Check if record exists
        existing = await db.fetchval(
            'SELECT EXISTS(SELECT 1 FROM vulnerabilities_product_owners WHERE id = $1)',
            record_id
        )

        if not existing:
            logger.warning(f'Vulnerability record not found for deletion: {record_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Vulnerability record with ID {record_id} not found'
            )

        # Delete the record
        await db.execute(
            'DELETE FROM vulnerabilities_product_owners WHERE id = $1',
            record_id
        )

        logger.info(f'Successfully deleted vulnerability record {record_id}')
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting vulnerability record {record_id}: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while deleting vulnerability record')


# =============================================================================
# Vulnerability Special Relationships Endpoints
# =============================================================================


@router.get('/special-relationships', response_model=List[VulnerabilitySpecialRelationship])
async def get_vulnerability_special_relationships(
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
    Retrieve vulnerability records for special relationships with optional filtering.

    This endpoint returns vulnerability records for special relationships. At least one filter
    parameter (special_relationship_id or client_group_id) must be provided to prevent
    returning all records in the database.

    Query Parameters:
        special_relationship_id: Filter by specific special relationship ID (must be positive integer)
        client_group_id: Filter by client group (returns records for all special relationships in the group)
        skip: Number of records to skip for pagination (default: 0, must be >= 0)
        limit: Maximum number of records to return (default: 100, range: 1-1000)

    Returns:
        List[VulnerabilitySpecialRelationship]: List of vulnerability records matching the filter criteria.
            Each record includes: id, special_relationship_id, description, adjustments, diagnosed,
            status, notes, created_at, date_recorded

    Raises:
        HTTPException 400: When neither special_relationship_id nor client_group_id is provided
        HTTPException 422: When provided IDs are invalid (negative, zero, or non-integer)

    Example:
        GET /api/vulnerabilities/special-relationships?special_relationship_id=1
        GET /api/vulnerabilities/special-relationships?client_group_id=5
        GET /api/vulnerabilities/special-relationships?special_relationship_id=1&skip=10&limit=25
    """
    try:
        # Validate that at least one filter is provided
        if special_relationship_id is None and client_group_id is None:
            logger.warning('GET request for special relationship vulnerabilities without filter parameters')
            raise HTTPException(
                status_code=400,
                detail='Either special_relationship_id or client_group_id must be provided'
            )

        logger.info(
            f'Fetching vulnerability records for special relationships with filters: '
            f'special_relationship_id={special_relationship_id}, client_group_id={client_group_id}, '
            f'skip={skip}, limit={limit}'
        )

        # Build query based on filter type
        if special_relationship_id is not None:
            # Direct filter by special relationship
            count_query = """
                SELECT COUNT(*) FROM vulnerabilities_special_relationships
                WHERE special_relationship_id = $1
            """
            total = await db.fetchval(count_query, special_relationship_id)

            query = """
                SELECT id, special_relationship_id, description, adjustments, diagnosed,
                       status, notes, created_at, date_recorded
                FROM vulnerabilities_special_relationships
                WHERE special_relationship_id = $1
                ORDER BY created_at DESC
                OFFSET $2 LIMIT $3
            """
            result = await db.fetch(query, special_relationship_id, skip, limit)

        else:
            # Filter by client group - get all special relationships in the group
            # The path is: client_groups -> client_group_product_owners -> product_owners
            #              -> product_owner_special_relationships -> special_relationships
            #              -> vulnerabilities_special_relationships
            count_query = """
                SELECT COUNT(DISTINCT vsr.id)
                FROM vulnerabilities_special_relationships vsr
                INNER JOIN special_relationships sr
                    ON vsr.special_relationship_id = sr.id
                INNER JOIN product_owner_special_relationships posr
                    ON sr.id = posr.special_relationship_id
                INNER JOIN client_group_product_owners cgpo
                    ON posr.product_owner_id = cgpo.product_owner_id
                WHERE cgpo.client_group_id = $1
            """
            total = await db.fetchval(count_query, client_group_id)

            query = """
                SELECT DISTINCT vsr.id, vsr.special_relationship_id, vsr.description, vsr.adjustments,
                       vsr.diagnosed, vsr.status, vsr.notes,
                       vsr.created_at, vsr.date_recorded
                FROM vulnerabilities_special_relationships vsr
                INNER JOIN special_relationships sr
                    ON vsr.special_relationship_id = sr.id
                INNER JOIN product_owner_special_relationships posr
                    ON sr.id = posr.special_relationship_id
                INNER JOIN client_group_product_owners cgpo
                    ON posr.product_owner_id = cgpo.product_owner_id
                WHERE cgpo.client_group_id = $1
                ORDER BY vsr.created_at DESC
                OFFSET $2 LIMIT $3
            """
            result = await db.fetch(query, client_group_id, skip, limit)

        logger.info(f'Query returned {len(result)} of {total} total vulnerability records for special relationships')

        # Set total count header for pagination
        response.headers["X-Total-Count"] = str(total or 0)

        # Convert database records to response format
        return [dict(row) for row in result]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching vulnerability records for special relationships: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while fetching vulnerability records')


@router.post('/special-relationships', response_model=VulnerabilitySpecialRelationship, status_code=status.HTTP_201_CREATED)
async def create_vulnerability_special_relationship(
    vulnerability_record: VulnerabilitySpecialRelationshipCreate,
    db=Depends(get_db)
):
    """
    Create a new vulnerability record for a special relationship.

    This endpoint creates a new vulnerability record in the database. The special_relationship_id
    must reference an existing special relationship in the system.

    Request Body:
        VulnerabilitySpecialRelationshipCreate object with:
        - special_relationship_id: ID of the special relationship (required, must exist in database)
        - description: Description of the vulnerability (required, 1-500 chars, non-empty)
        - adjustments: Adjustments made to accommodate the vulnerability (optional, max 1000 chars)
        - diagnosed: Whether the vulnerability has been officially diagnosed (default: False)
        - status: Status of the vulnerability (Active, Resolved, Monitoring, Inactive; default: Active)
        - notes: Additional notes about the vulnerability (optional, max 2000 chars)

    Returns:
        VulnerabilitySpecialRelationship: The created vulnerability record with generated id, created_at,
            and date_recorded timestamps

    Raises:
        HTTPException 404: When special_relationship_id doesn't exist in the database
        HTTPException 422: When validation fails (invalid status, empty description, etc.)

    Example:
        POST /api/vulnerabilities/special-relationships
        {
            "special_relationship_id": 1,
            "description": "Cognitive decline",
            "adjustments": "Involve family in discussions",
            "diagnosed": true,
            "status": "Active"
        }
    """
    try:
        logger.info(f'Creating new vulnerability record for special_relationship_id={vulnerability_record.special_relationship_id}')

        # Verify special relationship exists
        sr_exists = await db.fetchval(
            'SELECT EXISTS(SELECT 1 FROM special_relationships WHERE id = $1)',
            vulnerability_record.special_relationship_id
        )
        if not sr_exists:
            logger.warning(f'Special relationship not found: {vulnerability_record.special_relationship_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Special relationship with ID {vulnerability_record.special_relationship_id} not found'
            )

        # Insert the vulnerability record
        result = await db.fetchrow(
            """
            INSERT INTO vulnerabilities_special_relationships (
                special_relationship_id, description, adjustments, diagnosed,
                status, notes, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, special_relationship_id, description, adjustments, diagnosed,
                      status, notes, created_at, date_recorded
            """,
            vulnerability_record.special_relationship_id,
            vulnerability_record.description,
            vulnerability_record.adjustments,
            vulnerability_record.diagnosed,
            vulnerability_record.status,
            vulnerability_record.notes
        )

        if not result:
            raise HTTPException(
                status_code=500,
                detail='Failed to create vulnerability record - no data returned from insert'
            )

        logger.info(f"Created vulnerability record ID for special relationship: {result['id']}")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating vulnerability record for special relationship: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while creating vulnerability record')


@router.put('/special-relationships/{record_id}', response_model=VulnerabilitySpecialRelationship)
async def update_vulnerability_special_relationship(
    vulnerability_update: VulnerabilitySpecialRelationshipUpdate,
    record_id: int = Path(
        ...,
        gt=0,
        description='The ID of the vulnerability record to update (must be positive)'
    ),
    db=Depends(get_db)
):
    """
    Update an existing vulnerability record for a special relationship.

    This endpoint performs a partial update on an existing vulnerability record.
    Only fields provided in the request body will be updated; other fields
    remain unchanged.

    Path Parameters:
        record_id: The ID of the vulnerability record to update (must be positive integer)

    Request Body:
        VulnerabilitySpecialRelationshipUpdate object with any combination of:
        - description: Updated description (1-500 chars if provided)
        - adjustments: Updated adjustments (max 1000 chars)
        - diagnosed: Updated diagnosed status (boolean)
        - status: Updated status (Active, Resolved, Monitoring, Inactive)
        - notes: Updated notes (max 2000 chars)

    Returns:
        VulnerabilitySpecialRelationship: The updated vulnerability record with all fields

    Raises:
        HTTPException 404: When vulnerability record doesn't exist
        HTTPException 422: When validation fails (invalid record_id, status, description)

    Example:
        PUT /api/vulnerabilities/special-relationships/1
        {
            "status": "Resolved",
            "adjustments": "Updated adjustments"
        }
    """
    try:
        logger.info(f'Updating vulnerability record id={record_id} for special relationship')

        # Check if record exists
        existing = await db.fetchrow(
            """
            SELECT id, special_relationship_id, description, adjustments, diagnosed,
                   status, notes, created_at, date_recorded
            FROM vulnerabilities_special_relationships
            WHERE id = $1
            """,
            record_id
        )

        if not existing:
            logger.warning(f'Vulnerability record not found for special relationship: {record_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Vulnerability record with ID {record_id} not found'
            )

        # Get update data (only fields that were set)
        update_data = vulnerability_update.model_dump(exclude_unset=True)

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
            UPDATE vulnerabilities_special_relationships
            SET {', '.join(set_clauses)}
            WHERE id = $1
            RETURNING id, special_relationship_id, description, adjustments, diagnosed,
                      status, notes, created_at, date_recorded
        """

        result = await db.fetchrow(query, *values)

        if not result:
            raise HTTPException(status_code=500, detail='Failed to update vulnerability record')

        logger.info(f"Updated vulnerability record {record_id} for special relationship")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating vulnerability record {record_id} for special relationship: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while updating vulnerability record')


@router.delete('/special-relationships/{record_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_vulnerability_special_relationship(
    record_id: int = Path(
        ...,
        gt=0,
        description='The ID of the vulnerability record to delete (must be positive)'
    ),
    db=Depends(get_db)
):
    """
    Delete a vulnerability record for a special relationship.

    This endpoint permanently removes a vulnerability record from the database.
    This is a hard delete operation and cannot be undone.

    Path Parameters:
        record_id: The ID of the vulnerability record to delete (must be positive integer)

    Returns:
        204 No Content: On successful deletion (empty response body)

    Raises:
        HTTPException 404: When vulnerability record doesn't exist
        HTTPException 422: When record_id is invalid (negative, zero, or non-integer)

    Note:
        Delete operations are idempotent - deleting an already-deleted record returns 404.
        This is the expected behavior for RESTful APIs.

    Example:
        DELETE /api/vulnerabilities/special-relationships/1
    """
    try:
        logger.info(f'Deleting vulnerability record for special relationship with ID: {record_id}')

        # Check if record exists
        existing = await db.fetchval(
            'SELECT EXISTS(SELECT 1 FROM vulnerabilities_special_relationships WHERE id = $1)',
            record_id
        )

        if not existing:
            logger.warning(f'Vulnerability record not found for deletion (special relationship): {record_id}')
            raise HTTPException(
                status_code=404,
                detail=f'Vulnerability record with ID {record_id} not found'
            )

        # Delete the record
        await db.execute(
            'DELETE FROM vulnerabilities_special_relationships WHERE id = $1',
            record_id
        )

        logger.info(f'Successfully deleted vulnerability record {record_id} for special relationship')
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting vulnerability record {record_id} for special relationship: {str(e)}')
        raise HTTPException(status_code=500, detail='An error occurred while deleting vulnerability record')
