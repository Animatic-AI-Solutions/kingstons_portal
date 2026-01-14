"""
FastAPI routes for Legal Documents API.

Provides CRUD operations for legal documents in the Kingston's Portal system.

API Endpoints:
- GET /api/legal_documents - Fetch documents with optional filters
- POST /api/legal_documents - Create new document
- PUT /api/legal_documents/{document_id} - Update existing document
- PATCH /api/legal_documents/{document_id}/status - Update document status
- DELETE /api/legal_documents/{document_id} - Hard delete document
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Response, status
from typing import List, Optional
import logging
from ...db.database import get_db
from ...models.legal_document import (
    LegalDocument,
    LegalDocumentCreate,
    LegalDocumentUpdate,
    StatusUpdate
)
from app.api.routes.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# =============================================================================
# Error Message Sanitization
# =============================================================================

def sanitize_error_message(error: Exception) -> str:
    """
    Sanitize error messages to prevent leaking internal details.

    In production, this returns generic messages.
    Internal details are logged but not exposed to clients.
    """
    # Log the actual error for debugging
    logger.error(f"Internal error details: {str(error)}")

    # Return generic message - never expose raw database/system errors
    return "An unexpected error occurred. Please try again or contact support."


@router.get('/legal_documents', response_model=List[LegalDocument])
async def get_legal_documents(
    client_group_id: Optional[int] = Query(None, description="Filter by client group ID (finds documents linked to any product owner in this group)"),
    product_owner_id: Optional[int] = Query(None, description="Filter by a single product owner ID"),
    product_owner_ids: Optional[str] = Query(None, description="Comma-separated product owner IDs to filter by (documents linked to ANY of these owners)"),
    type: Optional[str] = Query(None, description="Filter by document type"),
    status: Optional[str] = Query(None, description="Filter by status (Signed/Registered/Lapsed)"),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Retrieve legal documents with optional filtering.

    Legal documents are linked to client groups indirectly through product owners.
    Use client_group_id for the most common query pattern (gets all documents for a client group).
    Use product_owner_id for filtering by a single product owner.
    Use product_owner_ids for more specific filtering by multiple product owners.

    Query Parameters:
    - client_group_id: Filter by client group (joins through product_owners table)
    - product_owner_id: Filter by a single product owner ID
    - product_owner_ids: Comma-separated list of product owner IDs (e.g., "1,2,3")
    - type: Filter by document type (e.g., Will, LPOA P&F)
    - status: Filter by Signed, Registered, or Lapsed status
    """
    try:
        logger.info(f'Fetching legal documents with filters: client_group_id={client_group_id}, product_owner_id={product_owner_id}, product_owner_ids={product_owner_ids}, type={type}, status={status}')

        # Build WHERE conditions
        where_conditions = []
        params = []
        param_count = 0

        # Base query with join to junction table and product_owners for client group filtering
        # Note: client_group_id is in client_group_product_owners junction table, not in product_owners
        base_query = """
            SELECT DISTINCT ld.*
            FROM legal_documents ld
            LEFT JOIN product_owner_legal_documents pold ON ld.id = pold.legal_document_id
            LEFT JOIN client_group_product_owners cgpo ON pold.product_owner_id = cgpo.product_owner_id
        """

        # Filter by client_group_id (joins through client_group_product_owners)
        if client_group_id is not None:
            param_count += 1
            where_conditions.append(f'cgpo.client_group_id = ${param_count}')
            params.append(client_group_id)

        # Filter by single product owner ID
        if product_owner_id is not None:
            param_count += 1
            where_conditions.append(f'pold.product_owner_id = ${param_count}')
            params.append(product_owner_id)

        # Filter by product owner IDs (comma-separated string)
        if product_owner_ids is not None:
            po_id_list = [int(id.strip()) for id in product_owner_ids.split(',') if id.strip()]
            if po_id_list:
                param_count += 1
                where_conditions.append(f'pold.product_owner_id = ANY(${param_count})')
                params.append(po_id_list)

        if type:
            param_count += 1
            where_conditions.append(f'ld.type = ${param_count}')
            params.append(type)

        if status:
            param_count += 1
            where_conditions.append(f'ld.status = ${param_count}')
            params.append(status)

        # Build WHERE clause
        where_clause = ''
        if where_conditions:
            where_clause = 'WHERE ' + ' AND '.join(where_conditions)

        query = f'{base_query} {where_clause} ORDER BY ld.created_at DESC'

        logger.info(f'Executing query: {query}')
        logger.info(f'Query params: {params}')

        result = await db.fetch(query, *params)
        logger.info(f'Query returned {len(result)} legal documents')

        # Early return if no documents found
        if not result:
            return []

        # Fetch all product owner IDs for all documents in a single query (N+1 fix)
        doc_ids = [row['id'] for row in result]
        po_ids_result = await db.fetch(
            """
            SELECT legal_document_id, array_agg(product_owner_id) as product_owner_ids
            FROM product_owner_legal_documents
            WHERE legal_document_id = ANY($1)
            GROUP BY legal_document_id
            """,
            doc_ids
        )

        # Create a mapping from document_id to product_owner_ids
        po_ids_map = {row['legal_document_id']: row['product_owner_ids'] or [] for row in po_ids_result}

        # Build documents with their product owner IDs
        documents = []
        for row in result:
            doc_dict = dict(row)
            doc_dict['product_owner_ids'] = po_ids_map.get(row['id'], [])
            documents.append(doc_dict)

        return documents

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching legal documents: {str(e)}')
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


@router.post('/legal_documents', response_model=LegalDocument, status_code=status.HTTP_201_CREATED)
async def create_legal_document(
    document: LegalDocumentCreate,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Create a new legal document and link it to product owners.

    Legal documents are linked to client groups indirectly through product owners.
    The product_owner_ids determine which client group the document belongs to.

    Request Body:
    - Must include at least one product_owner_id
    - type is required
    - status defaults to 'Signed' if not provided
    """
    try:
        logger.info(f'Creating new legal document: type={document.type}, product_owner_ids_count={len(document.product_owner_ids)}')

        # Verify all product owners exist
        for po_id in document.product_owner_ids:
            po_exists = await db.fetchval(
                'SELECT EXISTS(SELECT 1 FROM product_owners WHERE id = $1)',
                po_id
            )
            if not po_exists:
                raise HTTPException(
                    status_code=404,
                    detail=f'Product owner with ID {po_id} not found'
                )

        # Use transaction for multi-table operation to ensure data integrity
        async with db.transaction():
            # Create the legal document
            result = await db.fetchrow(
                """
                INSERT INTO legal_documents (type, document_date, status, notes)
                VALUES ($1, $2, $3, $4)
                RETURNING *
                """,
                document.type,
                document.document_date,
                document.status,
                document.notes
            )

            if not result:
                raise HTTPException(
                    status_code=500,
                    detail='Failed to create legal document - no data returned from insert'
                )

            document_id = result['id']
            logger.info(f"Created legal document ID: {document_id}")

            # Create junction table entries (within same transaction)
            for po_id in document.product_owner_ids:
                await db.execute(
                    """
                    INSERT INTO product_owner_legal_documents (product_owner_id, legal_document_id)
                    VALUES ($1, $2)
                    """,
                    po_id,
                    document_id
                )
                logger.info(f"Linked legal document {document_id} to product owner {po_id}")

        # Return the created document with product owner IDs
        doc_dict = dict(result)
        doc_dict['product_owner_ids'] = document.product_owner_ids

        return doc_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating legal document: {str(e)}')
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


@router.put('/legal_documents/{document_id}', response_model=LegalDocument)
async def update_legal_document(
    document_update: LegalDocumentUpdate,
    document_id: int = Path(..., description='The ID of the legal document to update'),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Update an existing legal document.

    Path Parameters:
    - document_id: The ID of the document to update

    Request Body:
    - Any fields from LegalDocumentUpdate model
    """
    try:
        logger.info(f'Updating legal document {document_id} with data: {document_update.model_dump()}')

        # Check if document exists
        existing = await db.fetchrow(
            'SELECT * FROM legal_documents WHERE id = $1',
            document_id
        )

        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f'Legal document with ID {document_id} not found'
            )

        # Get update data (only fields that were set)
        update_data = document_update.model_dump(exclude_unset=True)

        # Handle product_owner_ids separately if provided
        product_owner_ids = update_data.pop('product_owner_ids', None)

        # Get existing product owner IDs
        existing_po_ids = await db.fetch(
            'SELECT product_owner_id FROM product_owner_legal_documents WHERE legal_document_id = $1',
            document_id
        )

        if not update_data and product_owner_ids is None:
            # No updates, return existing document
            doc_dict = dict(existing)
            doc_dict['product_owner_ids'] = [po['product_owner_id'] for po in existing_po_ids]
            return doc_dict

        # Use transaction for multi-table operation to ensure data integrity
        async with db.transaction():
            # Update document fields if any
            if update_data:
                set_clauses = [f'{col} = ${i + 2}' for i, col in enumerate(update_data.keys())]
                values = [document_id] + list(update_data.values())

                query = f"""
                    UPDATE legal_documents
                    SET {', '.join(set_clauses)}
                    WHERE id = $1
                    RETURNING *
                """

                result = await db.fetchrow(query, *values)

                if not result:
                    raise HTTPException(status_code=500, detail='Failed to update legal document')
            else:
                result = existing

            logger.info(f"Updated legal document {document_id}")

            # Update product owner associations if provided (within same transaction)
            if product_owner_ids is not None:
                # Verify all product owners exist
                for po_id in product_owner_ids:
                    po_exists = await db.fetchval(
                        'SELECT EXISTS(SELECT 1 FROM product_owners WHERE id = $1)',
                        po_id
                    )
                    if not po_exists:
                        raise HTTPException(
                            status_code=404,
                            detail=f'Product owner with ID {po_id} not found'
                        )

                # Delete existing associations
                await db.execute(
                    'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
                    document_id
                )

                # Create new associations
                for po_id in product_owner_ids:
                    await db.execute(
                        """
                        INSERT INTO product_owner_legal_documents (product_owner_id, legal_document_id)
                        VALUES ($1, $2)
                        """,
                        po_id,
                        document_id
                    )

        # Get current product owner IDs
        po_ids = await db.fetch(
            'SELECT product_owner_id FROM product_owner_legal_documents WHERE legal_document_id = $1',
            document_id
        )

        doc_dict = dict(result)
        doc_dict['product_owner_ids'] = [po['product_owner_id'] for po in po_ids]

        return doc_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating legal document {document_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


@router.patch('/legal_documents/{document_id}/status', response_model=LegalDocument)
async def update_document_status(
    status_update: StatusUpdate,
    document_id: int = Path(..., description='The ID of the legal document to update'),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Update only the status of a legal document.

    Path Parameters:
    - document_id: The ID of the document to update

    Request Body:
    - status: Must be "Signed", "Lapsed", or "Registered"
    """
    try:
        logger.info(f'Updating status for legal document {document_id} to {status_update.status}')

        # Check if document exists
        existing = await db.fetchrow(
            'SELECT * FROM legal_documents WHERE id = $1',
            document_id
        )

        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f'Legal document with ID {document_id} not found'
            )

        # Update status
        result = await db.fetchrow(
            """
            UPDATE legal_documents
            SET status = $2
            WHERE id = $1
            RETURNING *
            """,
            document_id,
            status_update.status
        )

        if not result:
            raise HTTPException(status_code=500, detail='Failed to update document status')

        logger.info(f"Updated status for legal document {document_id}")

        # Get product owner IDs
        po_ids = await db.fetch(
            'SELECT product_owner_id FROM product_owner_legal_documents WHERE legal_document_id = $1',
            document_id
        )

        doc_dict = dict(result)
        doc_dict['product_owner_ids'] = [po['product_owner_id'] for po in po_ids]

        return doc_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating document status {document_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))


@router.delete('/legal_documents/{document_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_legal_document(
    document_id: int = Path(..., description='The ID of the legal document to delete'),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Hard delete a legal document and all its associations.

    Path Parameters:
    - document_id: The ID of the document to delete

    This will:
    1. Delete all junction table entries (product_owner_legal_documents)
    2. Delete the legal document record
    """
    try:
        logger.info(f'Deleting legal document with ID: {document_id}')

        # Check if document exists
        existing = await db.fetchrow(
            'SELECT * FROM legal_documents WHERE id = $1',
            document_id
        )

        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f'Legal document with ID {document_id} not found'
            )

        # Use transaction for multi-table delete to ensure data integrity
        async with db.transaction():
            # Delete junction table entries first (foreign key constraint)
            logger.info(f'Deleting junction table entries for legal document {document_id}')
            await db.execute(
                'DELETE FROM product_owner_legal_documents WHERE legal_document_id = $1',
                document_id
            )
            logger.info(f'Successfully deleted junction table entries for legal document {document_id}')

            # Delete the legal document record
            logger.info(f'Deleting legal document record {document_id}')
            await db.execute(
                'DELETE FROM legal_documents WHERE id = $1',
                document_id
            )
            logger.info(f'Successfully deleted legal document {document_id}')

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting legal document {document_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=sanitize_error_message(e))
