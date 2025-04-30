import pytest
from fastapi import HTTPException

from tests.conftest import MockDBResponse
from app.api.routes.providers import get_providers, get_provider, create_provider, update_provider, delete_provider
from app.models.provider import ProviderCreate, ProviderUpdate

# Test get_providers endpoint
@pytest.mark.asyncio
async def test_get_providers_success(mock_db, providers_list):
    # Create a customized execute for pagination
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Return the full providers list since we're not actually filtering or paginating in the mock
        return MockDBResponse(providers_list)
    
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await get_providers(db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == providers_list  # In this case, no filters so all data is returned

@pytest.mark.asyncio
async def test_get_providers_with_active_filter(mock_db, providers_list):
    # Create a customized execute for pagination
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Use the enhanced MockDB methods to properly filter and paginate
        filtered_data = mock_db.filter_data(providers_list)
        paginated_data = mock_db.apply_pagination(filtered_data)
        return MockDBResponse(paginated_data)
    
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint with active filter
    result = await get_providers(active=True, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result - all returned providers should be active
    assert all(provider.get("active", False) for provider in result)

@pytest.mark.asyncio
async def test_get_providers_exception(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        raise Exception("Database error")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_providers(db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test get_provider endpoint
@pytest.mark.asyncio
async def test_get_provider_success(mock_db, provider_data):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "providers" and mock_db._operation == "select":
            return MockDBResponse([provider_data])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await get_provider(provider_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == provider_data
    assert ("providers", "select") in calls

@pytest.mark.asyncio
async def test_get_provider_not_found(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute

    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Return empty data for select to simulate not found
        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_provider(provider_id=999, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Provider with ID 999 not found"

@pytest.mark.asyncio
async def test_get_provider_exception(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        raise Exception("Database error")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_provider(provider_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test create_provider endpoint
@pytest.mark.asyncio
async def test_create_provider_success(mock_db, provider_data):
    # Provider data for creation
    new_provider = ProviderCreate(
        name="New Provider"
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "providers" and mock_db._operation == "insert":
            return MockDBResponse([provider_data])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await create_provider(provider=new_provider, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == provider_data
    assert ("providers", "insert") in calls

@pytest.mark.asyncio
async def test_create_provider_failure(mock_db):
    # Provider data for creation
    new_provider = ProviderCreate(
        name="New Provider"
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Return empty data for insert to simulate failure
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_provider(provider=new_provider, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Failed to create provider" in excinfo.value.detail

@pytest.mark.asyncio
async def test_create_provider_exception(mock_db):
    # Provider data for creation
    new_provider = ProviderCreate(
        name="New Provider"
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        raise Exception("Database error")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_provider(provider=new_provider, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test update_provider endpoint
@pytest.mark.asyncio
async def test_update_provider_success(mock_db, provider_data):
    # Provider data for update
    update_data = ProviderUpdate(
        name="Updated Provider"
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "providers" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "providers" and mock_db._operation == "update":
            return MockDBResponse([provider_data])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint with correct parameter name
    result = await update_provider(provider_id=1, provider_update=update_data, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == provider_data
    assert ("providers", "select") in calls
    assert ("providers", "update") in calls

@pytest.mark.asyncio
async def test_update_provider_not_found(mock_db):
    # Provider data for update
    update_data = ProviderUpdate(
        name="Updated Provider"
    )

    # Create a completely customized execute for this test
    original_execute = mock_db.execute

    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Return empty data for select to simulate not found
        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await update_provider(provider_id=999, provider_update=update_data, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Provider with ID 999 not found"

@pytest.mark.asyncio
async def test_update_provider_failure(mock_db):
    # Provider data for update
    update_data = ProviderUpdate(
        name="Updated Provider"
    )

    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []

    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))

        if mock_db._table_name == "providers" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "providers" and mock_db._operation == "update":
            # Return empty data for update to simulate failure
            return MockDBResponse([])

        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await update_provider(provider_id=1, provider_update=update_data, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify exception details
    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Failed to update provider"

# Test delete_provider endpoint
@pytest.mark.asyncio
async def test_delete_provider_success(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "providers" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "products" and mock_db._operation == "select":
            # No products reference this provider
            return MockDBResponse([])
        elif mock_db._table_name == "funds_under_management" and mock_db._operation == "select":
            # No funds reference this provider
            return MockDBResponse([])
        elif mock_db._table_name == "providers" and mock_db._operation == "delete":
            return MockDBResponse([{"success": True}])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await delete_provider(provider_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == {"message": "Provider with ID 1 deleted successfully"}
    assert ("providers", "select") in calls
    assert ("providers", "delete") in calls

@pytest.mark.asyncio
async def test_delete_provider_not_found(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute

    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Return empty data for select to simulate not found
        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await delete_provider(provider_id=999, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Provider with ID 999 not found"

@pytest.mark.asyncio
async def test_delete_provider_with_funds(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []

    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))

        if mock_db._table_name == "providers" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "providers" and mock_db._operation == "delete":
            return MockDBResponse([])

        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint and expect success
    result = await delete_provider(1, db=mock_db)
    assert result == {"message": "Provider with ID 1 deleted successfully"}
    
    # Verify the correct calls were made
    assert calls == [
        ("providers", "select"),
        ("providers", "delete")
    ]

@pytest.mark.asyncio
async def test_delete_provider_exception(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "providers" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "products" and mock_db._operation == "select":
            # No products reference this provider
            return MockDBResponse([])
        elif mock_db._table_name == "funds_under_management" and mock_db._operation == "select":
            # No funds reference this provider
            return MockDBResponse([])
        elif mock_db._table_name == "providers" and mock_db._operation == "delete":
            raise Exception("Database error")
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await delete_provider(provider_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail 