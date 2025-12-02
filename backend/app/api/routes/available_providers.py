from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from app.models.available_provider import AvailableProvider, AvailableProviderCreate, AvailableProviderUpdate, ColorOption, ProviderThemeColor, AvailableProviderWithProductCount
from app.db.database import get_db
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
router = APIRouter()
DEFAULT_COLORS = [{'name': 'Blue', 'value': '#2563EB'}, {'name': 'Red', 'value': '#DC2626'}, {'name': 'Green', 'value': '#16A34A'}, {'name': 'Purple', 'value': '#8B5CF6'}, {'name': 'Orange', 'value': '#F97316'}, {'name': 'Sky Blue', 'value': '#38BDF8'}, {'name': 'Mint', 'value': '#4ADE80'}, {'name': 'Lavender', 'value': '#C4B5FD'}, {'name': 'Peach', 'value': '#FDBA74'}, {'name': 'Rose', 'value': '#FDA4AF'}, {'name': 'Navy', 'value': '#1E40AF'}, {'name': 'Forest', 'value': '#15803D'}, {'name': 'Maroon', 'value': '#9F1239'}, {'name': 'Indigo', 'value': '#4338CA'}, {'name': 'Slate', 'value': '#334155'}]

@router.get('/available-providers', response_model=List[AvailableProvider])
async def get_available_providers(skip: int=Query(0, ge=0, description='Number of records to skip for pagination'), limit: int=Query(100000, ge=1, le=100000, description='Max number of records to return'), status: Optional[str]=Query(None, description='Filter by status'), db=Depends(get_db)):
    """
    What it does: Retrieves a paginated list of available providers from the database.
    Why it's needed: Provides a way to view all available providers in the system with optional filtering.
    How it works:
        1. Connects to the PostgreSQL database
        2. Queries the 'available_providers' table with pagination and optional filters
        3. Returns the data as a list of AvailableProvider objects
    Expected output: A JSON array of provider objects with all their details
    """
    try:
        logger.info(f'Fetching available providers with skip={skip}, limit={limit}')
        base_query = 'SELECT * FROM available_providers'
        conditions = []
        params = []
        if status is not None:
            conditions.append('status = $' + str(len(params) + 1))
            params.append(status)
        if conditions:
            query = base_query + ' WHERE ' + ' AND '.join(conditions)
        else:
            query = base_query
        query += f' ORDER BY id LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}'
        params.extend([limit, skip])
        result = await db.fetch(query, *params)
        logger.info(f'Query returned {len(result)} providers')
        if not result:
            logger.warning('No available providers found in the database')
        return [dict(row) for row in result]
    except Exception as e:
        logger.error(f'Error fetching available providers: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to fetch available providers: {str(e)}')

@router.post('/available-providers', response_model=AvailableProvider)
async def create_available_provider(provider: AvailableProviderCreate, db=Depends(get_db)):
    """
    What it does: Creates a new available provider in the database.
    Why it's needed: Allows adding new available providers to the system.
    How it works:
        1. Validates the provider data using the AvailableProviderCreate model
        2. Checks if the theme color is already in use by another provider
        3. Inserts the validated data into the 'available_providers' table
        4. Returns the newly created provider with its generated ID
    Expected output: A JSON object containing the created provider with all fields including ID and created_at timestamp
    """
    try:
        if provider.theme_color:
            color_check = await db.fetchrow('SELECT id FROM available_providers WHERE theme_color = $1', provider.theme_color)
            if color_check:
                raise HTTPException(status_code=400, detail=f'The selected color is already in use by another provider')
        provider_data = provider.model_dump()
        columns = list(provider_data.keys())
        placeholders = [f'${i + 1}' for i in range(len(columns))]
        values = list(provider_data.values())
        query = f"\n            INSERT INTO available_providers ({', '.join(columns)}) \n            VALUES ({', '.join(placeholders)}) \n            RETURNING *\n        "
        result = await db.fetchrow(query, *values)
        if result:
            return dict(result)
        raise HTTPException(status_code=400, detail='Failed to create available provider')
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error creating available provider: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to create available provider: {str(e)}')

@router.get('/available-providers/theme-colors', response_model=List[ProviderThemeColor])
async def get_provider_theme_colors(db=Depends(get_db)):
    """
    What it does: Retrieves a list of provider theme colors for UI components.
    Why it's needed: Frontend components need provider theme colors for styling and UI consistency.
    How it works:
        1. Queries the 'available_providers' table for ID, name, and theme_color
        2. Returns a list of objects containing these fields for each provider
    Expected output: A JSON array of provider objects with ID, name, and theme_color
    """
    try:
        result = await db.fetch('SELECT id, name, theme_color FROM available_providers')
        if not result:
            logger.info('Consider calling /available_providers/update-theme-colors to initialize missing colors')
        return [dict(row) for row in result]
    except Exception as e:
        logger.error(f'Error fetching provider theme colors: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to fetch provider theme colors: {str(e)}')

@router.get('/available-providers/available-colors', response_model=List[ColorOption])
async def get_available_colors(db=Depends(get_db)):
    """
    What it does: Returns a list of colors that are available for assignment to providers.
    Why it's needed: To prevent color conflicts and provide users with available color options.
    How it works:
        1. Gets all colors currently used by providers
        2. Filters the default color palette to show only unused colors
        3. Returns the available colors for assignment
    Expected output: A JSON array of color objects with name and value properties
    """
    try:
        result = await db.fetch('SELECT theme_color FROM available_providers WHERE theme_color IS NOT NULL')
        used_colors = set()
        if result:
            used_colors = {row['theme_color'] for row in result}
        available_colors = [color for color in DEFAULT_COLORS if color['value'] not in used_colors]
        return available_colors
    except Exception as e:
        logger.error(f'Error fetching available colors: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to fetch available colors: {str(e)}')

@router.get('/available-providers/{provider_id}', response_model=AvailableProvider)
async def get_available_provider(provider_id: int, db=Depends(get_db)):
    """
    What it does: Retrieves a single available provider by ID.
    Why it's needed: Allows viewing detailed information about a specific available provider.
    How it works:
        1. Takes the provider_id from the URL path
        2. Queries the 'available_providers' table for a record with matching ID
        3. Returns the provider data or raises a 404 error if not found
    Expected output: A JSON object containing the requested provider's details
    """
    try:
        result = await db.fetchrow('SELECT * FROM available_providers WHERE id = $1', provider_id)
        if result:
            return dict(result)
        raise HTTPException(status_code=404, detail=f'Available provider with ID {provider_id} not found')
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error fetching available provider: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to fetch available provider: {str(e)}')

@router.patch('/available-providers/{provider_id}', response_model=AvailableProvider)
async def update_available_provider(provider_id: int, provider_update: AvailableProviderUpdate, db=Depends(get_db)):
    """
    What it does: Updates an existing available provider's information.
    Why it's needed: Allows modifying provider details when they change.
    How it works:
        1. Takes the provider_id from the URL path and update data from request body
        2. Verifies the provider exists
        3. Checks if the new theme color conflicts with existing providers
        4. Updates the provider record with the new data
        5. Returns the updated provider information
    Expected output: A JSON object containing the updated provider's details
    """
    try:
        check_result = await db.fetchrow('SELECT id FROM available_providers WHERE id = $1', provider_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f'Available provider with ID {provider_id} not found')
        update_data = provider_update.model_dump(exclude_unset=True)
        if not update_data:
            return await get_available_provider(provider_id, db)
        if 'theme_color' in update_data and update_data['theme_color']:
            color_check = await db.fetchrow('SELECT id FROM available_providers WHERE theme_color = $1 AND id != $2', update_data['theme_color'], provider_id)
            if color_check:
                raise HTTPException(status_code=400, detail=f'The selected color is already in use by another provider')
        set_clauses = []
        params = []
        for i, (column, value) in enumerate(update_data.items(), 1):
            set_clauses.append(f'{column} = ${i}')
            params.append(value)
        query = f"\n            UPDATE available_providers \n            SET {', '.join(set_clauses)} \n            WHERE id = ${len(params) + 1} \n            RETURNING *\n        "
        params.append(provider_id)
        result = await db.fetchrow(query, *params)
        if result:
            return dict(result)
        raise HTTPException(status_code=400, detail='Failed to update available provider')
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error updating available provider: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to update available provider: {str(e)}')

@router.delete('/available-providers/{provider_id}', response_model=dict)
async def delete_available_provider(provider_id: int, db=Depends(get_db)):
    """
    What it does: Deletes an available provider from the database.
    Why it's needed: Allows removing providers who are no longer relevant to the business.
    How it works:
        1. Verifies the provider exists
        2. Deletes the provider record from the 'available_providers' table
        3. Returns a success message
    Expected output: A JSON object with a success message confirmation
    """
    try:
        check_result = await db.fetchrow('SELECT id FROM available_providers WHERE id = $1', provider_id)
        if not check_result:
            raise HTTPException(status_code=404, detail=f'Available provider with ID {provider_id} not found')
        await db.execute('DELETE FROM available_providers WHERE id = $1', provider_id)
        return {'message': f'Available provider with ID {provider_id} deleted successfully'}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error deleting available provider: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to delete available provider: {str(e)}')

@router.post('/available-providers/update-theme-colors', response_model=dict)
async def update_provider_theme_colors(db=Depends(get_db)):
    """
    What it does: Assigns theme colors to providers that don't have one.
    Why it's needed: Ensures all providers have theme colors for consistent UI styling.
    How it works:
        1. Gets all providers from the database
        2. Identifies providers without theme colors
        3. Assigns available colors from the default palette
        4. Updates each provider with their new theme color
        5. Returns statistics about the update operation
    Expected output: A JSON object with update statistics and color assignments
    """
    try:
        result = await db.fetch('SELECT * FROM available_providers')
        if not result:
            return {'message': 'No providers found to update'}
        all_providers = [dict(row) for row in result]
        providers_without_colors = [provider for provider in all_providers if not provider.get('theme_color')]
        if not providers_without_colors:
            return {'message': 'All providers already have theme colors assigned', 'total_providers': len(all_providers), 'providers_updated': 0}
        used_colors = set()
        for provider in all_providers:
            if provider.get('theme_color'):
                used_colors.add(provider['theme_color'])
        available_colors = [color['value'] for color in DEFAULT_COLORS if color['value'] not in used_colors]
        if len(providers_without_colors) > len(available_colors):
            available_colors.extend([color['value'] for color in DEFAULT_COLORS])
        updates_made = 0
        color_assignments = []
        for i, provider in enumerate(providers_without_colors):
            if i < len(available_colors):
                provider_id = provider['id']
                theme_color = available_colors[i]
                update_result = await db.execute('UPDATE available_providers SET theme_color = $1 WHERE id = $2', theme_color, provider_id)
                updates_made += 1
                color_assignments.append({'provider_id': provider_id, 'provider_name': provider.get('name', 'Unknown'), 'assigned_color': theme_color})
        return {'message': f'Successfully updated {updates_made} providers with theme colors', 'total_providers': len(all_providers), 'providers_updated': updates_made, 'color_assignments': color_assignments}
    except Exception as e:
        logger.error(f'Error updating provider theme colors: {str(e)}')
        raise HTTPException(status_code=500, detail=f'Failed to update provider theme colors: {str(e)}')

@router.get('/available-providers-with-count', response_model=List[AvailableProviderWithProductCount])
async def get_available_providers_with_product_count(skip: int=Query(0, ge=0, description='Number of records to skip for pagination'), limit: int=Query(100000, ge=1, le=100000, description='Max number of records to return'), status: Optional[str]=Query(None, description='Filter by status'), db=Depends(get_db)):
    """
    What it does: Retrieves a paginated list of available providers with their associated product counts.
    Why it's needed: Provides a comprehensive view of providers and their usage in the system.
    How it works:
        1. Connects to the PostgreSQL database
        2. Queries the 'available_providers' table
        3. Joins with product counts or calculates them
        4. Returns providers with their product count information
    Expected output: A JSON array of provider objects with product count data
    """
    try:
        base_query = "\n            SELECT \n                ap.*,\n                COALESCE(product_counts.product_count, 0) as product_count\n            FROM available_providers ap\n            LEFT JOIN (\n                SELECT \n                    provider_id, \n                    COUNT(*) as product_count \n                FROM client_products \n                WHERE status = 'active'\n                GROUP BY provider_id\n            ) product_counts ON ap.id = product_counts.provider_id\n        "
        conditions = []
        params = []
        if status is not None:
            conditions.append('ap.status = $' + str(len(params) + 1))
            params.append(status)
        if conditions:
            query = base_query + ' WHERE ' + ' AND '.join(conditions)
        else:
            query = base_query
        query += f' ORDER BY ap.id LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}'
        params.extend([limit, skip])
        result = await db.fetch(query, *params)
        return [dict(row) for row in result]
    except Exception as e:
        logger.error(f'Error fetching available providers with count: {str(e)}')
        try:
            base_query = 'SELECT *, 0 as product_count FROM available_providers'
            conditions = []
            params = []
            if status is not None:
                conditions.append('status = $' + str(len(params) + 1))
                params.append(status)
            if conditions:
                query = base_query + ' WHERE ' + ' AND '.join(conditions)
            else:
                query = base_query
            query += f' ORDER BY id LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}'
            params.extend([limit, skip])
            result = await db.fetch(query, *params)
            return [dict(row) for row in result]
        except Exception as fallback_error:
            logger.error(f'Fallback query also failed: {str(fallback_error)}')
            raise HTTPException(status_code=500, detail=f'Failed to fetch available providers: {str(e)}')