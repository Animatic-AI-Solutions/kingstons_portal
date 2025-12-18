from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging
from ...db.database import get_db
from ...models.address import Address, AddressCreate, AddressUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get('/addresses', response_model=List[Address])
async def get_all_addresses(db=Depends(get_db)):
    """
    Retrieve all addresses from the database.
    """
    try:
        logger.info('Retrieving all addresses')

        results = await db.fetch('SELECT * FROM addresses ORDER BY id DESC')

        logger.info(f'Retrieved {len(results)} addresses')
        return [dict(row) for row in results]

    except Exception as e:
        logger.error(f'Error retrieving addresses: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')


@router.post('/addresses', response_model=Address, status_code=status.HTTP_201_CREATED)
async def create_address(address: AddressCreate, db=Depends(get_db)):
    """
    Create a new address.
    """
    try:
        logger.info(f'Creating new address: {address.model_dump()}')

        result = await db.fetchrow(
            """
            INSERT INTO addresses (line_1, line_2, line_3, line_4, line_5)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, line_1, line_2, line_3, line_4, line_5, created_at
            """,
            address.line_1, address.line_2, address.line_3, address.line_4, address.line_5
        )

        if not result:
            raise HTTPException(status_code=500, detail='Failed to create address')

        logger.info(f"Created address ID: {result['id']}")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating address: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')


@router.get('/addresses/{address_id}', response_model=Address)
async def get_address(address_id: int, db=Depends(get_db)):
    """
    Retrieve a specific address by ID.
    """
    try:
        logger.info(f'Retrieving address with ID: {address_id}')

        result = await db.fetchrow('SELECT * FROM addresses WHERE id = $1', address_id)

        if not result:
            raise HTTPException(status_code=404, detail=f'Address with ID {address_id} not found')

        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error retrieving address {address_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')


@router.patch('/addresses/{address_id}', response_model=Address)
async def update_address(address_id: int, address_update: AddressUpdate, db=Depends(get_db)):
    """
    Update an existing address.
    """
    try:
        logger.info(f'Updating address ID {address_id} with: {address_update.model_dump(exclude_unset=True)}')

        # Check if address exists
        existing = await db.fetchrow('SELECT * FROM addresses WHERE id = $1', address_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f'Address with ID {address_id} not found')

        # Build update query dynamically
        update_data = address_update.model_dump(exclude_unset=True)
        if not update_data:
            return dict(existing)

        set_clauses = [f"{key} = ${i+2}" for i, key in enumerate(update_data.keys())]
        query = f"""
            UPDATE addresses
            SET {', '.join(set_clauses)}
            WHERE id = $1
            RETURNING id, line_1, line_2, line_3, line_4, line_5, created_at
        """

        result = await db.fetchrow(query, address_id, *update_data.values())

        if not result:
            raise HTTPException(status_code=500, detail='Failed to update address')

        logger.info(f'Successfully updated address ID {address_id}')
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating address {address_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')


@router.delete('/addresses/{address_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(address_id: int, db=Depends(get_db)):
    """
    Delete an address by ID.
    """
    try:
        logger.info(f'Deleting address ID: {address_id}')

        # Check if address exists
        existing = await db.fetchrow('SELECT id FROM addresses WHERE id = $1', address_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f'Address with ID {address_id} not found')

        # Delete the address
        await db.execute('DELETE FROM addresses WHERE id = $1', address_id)

        logger.info(f'Successfully deleted address ID {address_id}')
        return

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting address {address_id}: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')
