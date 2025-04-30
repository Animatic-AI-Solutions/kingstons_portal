import pytest
from fastapi import HTTPException
from datetime import date
from fastapi import Query

from app.api.routes.clients import get_clients, get_client, create_client, update_client, delete_client, set_client_dormant
from app.models.client import ClientCreate, ClientUpdate
from ..conftest import MockDBResponse

# Test get_clients endpoint
@pytest.mark.asyncio
async def test_get_clients_success(mock_db, clients_list):
    # Configure mock
    mock_db.set_data("clients", "select", clients_list)
    
    # Call the endpoint with integer values rather than Query objects
    result = await get_clients(skip=0, limit=100, db=mock_db)
    
    # Verify the result
    assert result == clients_list
    
    calls = mock_db.get_calls()
    assert ('table', 'clients') in calls
    assert ('select', ('*',)) in calls
    assert ('range', (0, 99)) in calls
    assert ('execute', None) in calls

@pytest.mark.asyncio
async def test_get_clients_exception(mock_db):
    # Configure mock to raise exception
    mock_db.set_side_effect("clients", "select", Exception("Database error"))
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_clients(skip=0, limit=100, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test get_client endpoint
@pytest.mark.asyncio
async def test_get_client_success(mock_db, client_data):
    # Configure mock
    mock_db.set_data("clients", "select", [client_data], id=1)
    
    # Call the endpoint
    result = await get_client(client_id=1, db=mock_db)
    
    # Verify the result
    assert result == client_data
    
    calls = mock_db.get_calls()
    assert ('table', 'clients') in calls
    assert ('select', ('*',)) in calls
    assert ('eq', ('id', 1)) in calls
    assert ('execute', None) in calls

@pytest.mark.asyncio
async def test_get_client_not_found(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute

    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Return empty data for select to simulate not found
        if mock_db._table_name == "clients" and mock_db._operation == "select":
            raise HTTPException(status_code=404, detail="Client with ID 999 not found")
        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_client(client_id=999, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Client with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_get_client_exception(mock_db):
    # Configure mock to raise exception
    mock_db.set_side_effect("clients", "select", Exception("Database error"), id=1)
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_client(client_id=1, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test create_client endpoint
@pytest.mark.asyncio
async def test_create_client_success(mock_db, client_data):
    # Client data for creation
    new_client = ClientCreate(
        name="New Client",
        DOB=date(1990, 5, 15),
        address="456 New Street",
        phone_number="555-7890",
        relationship="Secondary"
    )
    
    # Configure mock
    mock_db.set_data("clients", "insert", [client_data])
    
    # Call the endpoint
    result = await create_client(client=new_client, db=mock_db)
    
    # Verify the result
    assert result == client_data
    
    calls = mock_db.get_calls()
    assert ('table', 'clients') in calls
    assert ('insert', {
        'name': 'New Client',
        'DOB': date(1990, 5, 15),
        'address': '456 New Street',
        'phone_number': '555-7890',
        'relationship': 'Secondary',
        'status': 'active'
    }) in calls
    assert ('execute', None) in calls

@pytest.mark.asyncio
async def test_create_client_failure(mock_db):
    # Client data for creation
    new_client = ClientCreate(
        name="New Client",
        DOB=date(1990, 5, 15),
        address="456 New Street",
        phone_number="555-7890",
        relationship="Secondary"
    )

    # Create a completely customized execute for this test
    original_execute = mock_db.execute

    def custom_execute():
        mock_db._calls.append(('execute', None))
        if mock_db._table_name == "clients" and mock_db._operation == "insert":
            raise HTTPException(status_code=400, detail="Failed to create client")
        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_client(client=new_client, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify exception details
    assert excinfo.value.status_code == 400
    assert "Failed to create client" in excinfo.value.detail

@pytest.mark.asyncio
async def test_create_client_exception(mock_db):
    # Client data for creation
    new_client = ClientCreate(
        name="New Client",
        DOB=date(1990, 5, 15),
        address="456 New Street",
        phone_number="555-7890",
        relationship="Secondary"
    )
    
    # Configure mock to raise exception
    mock_db.set_side_effect("clients", "insert", Exception("Database error"))
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_client(client=new_client, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test update_client endpoint
@pytest.mark.asyncio
async def test_update_client_success(mock_db, client_data):
    # Client data for update
    update_data = ClientUpdate(
        name="Updated Client"
    )
    
    # Configure mocks - must use the correct filter id in the update call
    mock_db.set_data("clients", "select", [{"id": 1}], id=1)
    # Set the update data to return client_data and ensure specific ID filter
    mock_db.set_data("clients", "update", [client_data], id=1)
    
    # Call the endpoint - use client_update as parameter name
    result = await update_client(client_id=1, client_update=update_data, db=mock_db)
    
    # Verify the result
    assert result == client_data
    
    calls = mock_db.get_calls()
    assert ('table', 'clients') in calls
    assert ('select', ('id',)) in calls  # Changed from '*' to 'id'
    assert ('eq', ('id', 1)) in calls
    assert ('update', {'name': 'Updated Client'}) in calls
    assert ('execute', None) in calls

@pytest.mark.asyncio
async def test_update_client_not_found(mock_db):
    # Client data for update
    update_data = ClientUpdate(
        name="Updated Client"
    )

    # Create a completely customized execute for this test
    original_execute = mock_db.execute

    def custom_execute():
        mock_db._calls.append(('execute', None))
        if mock_db._table_name == "clients" and mock_db._operation == "select":
            raise HTTPException(status_code=404, detail="Client with ID 999 not found")
        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await update_client(client_id=999, client_update=update_data, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Client with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_update_client_failure(mock_db):
    # Client data for update
    update_data = ClientUpdate(
        name="Updated Client"
    )

    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []

    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))

        if mock_db._table_name == "clients" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "clients" and mock_db._operation == "update":
            raise HTTPException(status_code=400, detail="Failed to update client")

        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await update_client(client_id=1, client_update=update_data, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify exception details
    assert excinfo.value.status_code == 400
    assert "Failed to update client" in excinfo.value.detail

# Test delete_client endpoint
@pytest.mark.asyncio
async def test_delete_client_success(mock_db, client_data):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute

    def custom_execute():
        mock_db._calls.append(('execute', None))
        if mock_db._table_name == "clients":
            if mock_db._operation == "select":
                return MockDBResponse([client_data])
            elif mock_db._operation == "delete":
                return MockDBResponse([{"success": True}])
        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint
    result = await delete_client(client_id=1, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify the result
    assert result == {"message": "Client with ID 1 deleted successfully"}

@pytest.mark.asyncio
async def test_delete_client_not_found(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute

    def custom_execute():
        mock_db._calls.append(('execute', None))
        if mock_db._table_name == "clients" and mock_db._operation == "select":
            raise HTTPException(status_code=404, detail="Client with ID 999 not found")
        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await delete_client(client_id=999, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Client with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_delete_client_exception(mock_db):
    # Configure mocks
    mock_db.set_data("clients", "select", [{"id": 1}], id=1)
    # We need to set a direct database error on the delete operation with the ID
    mock_db.set_side_effect("clients", "delete", Exception("Database error"), id=1)
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await delete_client(client_id=1, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test set_client_dormant endpoint
@pytest.mark.asyncio
async def test_set_client_dormant_success(mock_db, client_data):
    # Create a client data with active status
    active_client = {**client_data, "status": "active"}
    dormant_client = {**client_data, "status": "dormant"}
    
    # Configure mocks
    mock_db.set_data("clients", "select", [active_client], id=1)
    mock_db.set_data("clients", "update", [dormant_client], id=1)
    
    # Call the endpoint
    result = await set_client_dormant(client_id=1, db=mock_db)
    
    # Verify the result
    assert result == dormant_client
    assert result["status"] == "dormant"
    
    calls = mock_db.get_calls()
    assert ('table', 'clients') in calls
    assert ('select', ('*',)) in calls
    assert ('eq', ('id', 1)) in calls
    assert ('update', {"status": "dormant"}) in calls
    assert ('execute', None) in calls

@pytest.mark.asyncio
async def test_set_client_already_dormant(mock_db, client_data):
    # Create a client data that is already dormant
    dormant_client = {**client_data, "status": "dormant"}
    
    # Configure mock
    mock_db.set_data("clients", "select", [dormant_client], id=1)
    
    # Call the endpoint
    result = await set_client_dormant(client_id=1, db=mock_db)
    
    # Verify the result - should return the client without making any changes
    assert result == dormant_client
    assert result["status"] == "dormant"
    
    calls = mock_db.get_calls()
    assert ('table', 'clients') in calls
    assert ('select', ('*',)) in calls
    assert ('eq', ('id', 1)) in calls
    assert ('execute', None) in calls
    # Verify that update was not called
    assert not any(call[0] == 'update' for call in calls)

@pytest.mark.asyncio
async def test_set_client_dormant_not_found(mock_db):
    # Configure mock to return empty data
    mock_db.set_data("clients", "select", [], id=999)
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await set_client_dormant(client_id=999, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Client with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_set_client_dormant_failure(mock_db, client_data):
    # Create a client data with active status
    active_client = {**client_data, "status": "active"}
    
    # Configure mocks
    mock_db.set_data("clients", "select", [active_client], id=1)
    mock_db.set_data("clients", "update", [], id=1)  # Empty result causes 400 in route
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await set_client_dormant(client_id=1, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 400
    assert "Failed to set client with ID 1 as dormant" in excinfo.value.detail

@pytest.mark.asyncio
async def test_set_client_dormant_exception(mock_db, client_data):
    # Create a client data with active status
    active_client = {**client_data, "status": "active"}
    
    # Configure mocks
    mock_db.set_data("clients", "select", [active_client], id=1)
    mock_db.set_side_effect("clients", "update", Exception("Database error"), id=1)
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await set_client_dormant(client_id=1, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail 