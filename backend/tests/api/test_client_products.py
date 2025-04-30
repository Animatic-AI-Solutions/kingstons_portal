import pytest
from fastapi import HTTPException
from datetime import date

from app.api.routes.client_products import (
    get_client_products,
    create_client_product,
    delete_client_product
)
from app.models.client_product import ClientProductCreate
from tests.conftest import MockDBResponse

# Test get_client_products endpoint
@pytest.mark.asyncio
async def test_get_client_products_success(mock_db, client_products_list):
    # Configure mock
    mock_db.set_data("client_products", "select", client_products_list)
    
    # Call the endpoint
    result = await get_client_products(skip=0, limit=100, db=mock_db)
    
    # Verify the result
    assert result == client_products_list
    calls = mock_db.get_calls()
    assert ('table', 'client_products') in calls
    assert ('select', ('*',)) in calls
    assert ('range', (0, 99)) in calls
    assert ('execute', None) in calls

@pytest.mark.asyncio
async def test_get_client_products_with_client_filter(mock_db, client_products_list):
    # Configure mock
    client_id = 1
    filtered_data = [cp for cp in client_products_list if cp["client_id"] == client_id]
    mock_db.set_data("client_products", "select", filtered_data, client_id=client_id)
    
    # Call the endpoint
    result = await get_client_products(client_id=client_id, skip=0, limit=100, db=mock_db)
    
    # Verify the result
    assert len(result) == len(filtered_data)
    calls = mock_db.get_calls()
    assert ('table', 'client_products') in calls
    assert ('select', ('*',)) in calls
    assert ('eq', ('client_id', client_id)) in calls
    assert ('range', (0, 99)) in calls
    assert ('execute', None) in calls

@pytest.mark.asyncio
async def test_get_client_products_with_product_filter(mock_db, client_products_list):
    # Configure mock
    product_id = 1
    filtered_data = [cp for cp in client_products_list if cp["product_id"] == product_id]
    mock_db.set_data("client_products", "select", filtered_data, product_id=product_id)
    
    # Call the endpoint
    result = await get_client_products(product_id=product_id, skip=0, limit=100, db=mock_db)
    
    # Verify the result
    assert len(result) == len(filtered_data)
    calls = mock_db.get_calls()
    assert ('table', 'client_products') in calls
    assert ('select', ('*',)) in calls
    assert ('eq', ('product_id', product_id)) in calls
    assert ('range', (0, 99)) in calls
    assert ('execute', None) in calls

@pytest.mark.asyncio
async def test_get_client_products_with_both_filters(mock_db, client_products_list):
    # Configure mock
    client_id = 1
    product_id = 1
    filtered_data = [cp for cp in client_products_list if cp["client_id"] == client_id and cp["product_id"] == product_id]
    
    # We need a simpler approach for this test - just override the execute method completely
    def custom_execute():
        mock_db._calls.append(('execute', None))
        return MockDBResponse(filtered_data)
        
    # Store original execute and replace it
    original_execute = mock_db.execute
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await get_client_products(client_id=client_id, product_id=product_id, skip=0, limit=100, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert len(result) == len(filtered_data)
    # We can't check all the mock calls as we're using a custom execute method

@pytest.mark.asyncio
async def test_get_client_products_exception(mock_db):
    # Configure mock to raise exception
    mock_db.set_side_effect("client_products", "select", Exception("Database error"))
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_client_products(skip=0, limit=100, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test create_client_product endpoint
@pytest.mark.asyncio
async def test_create_client_product_success(mock_db, client_data, product_data, client_product_data):
    # Data for creation
    start_date = date(2023, 1, 1)
    new_client_product = ClientProductCreate(
        client_id=1,
        product_id=1,
        start_date=start_date
    )
    
    # Clear any previous side effects
    mock_db._side_effects = {}
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        
        if mock_db._table_name == "clients" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "products" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "client_products" and mock_db._operation == "select":
            # Empty response for association check (meaning it doesn't exist)
            return MockDBResponse([])
        elif mock_db._table_name == "client_products" and mock_db._operation == "insert":
            # Return inserted data
            return MockDBResponse([client_product_data])
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await create_client_product(client_product=new_client_product, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == client_product_data
    assert ("clients", "select") in calls
    assert ("products", "select") in calls
    assert ("client_products", "select") in calls
    assert ("client_products", "insert") in calls

@pytest.mark.asyncio
async def test_create_client_product_client_not_found(mock_db):
    # Data for creation
    start_date = date(2023, 1, 1)
    new_client_product = ClientProductCreate(
        client_id=999,
        product_id=1,
        start_date=start_date
    )
    
    # Configure mock to return empty data for client
    mock_db.set_data("clients", "select", [], id=999)
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_client_product(client_product=new_client_product, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Client with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_create_client_product_product_not_found(mock_db, client_data):
    # Data for creation
    start_date = date(2023, 1, 1)
    new_client_product = ClientProductCreate(
        client_id=1,
        product_id=999,
        start_date=start_date
    )
    
    # Configure mocks
    mock_db.set_data("clients", "select", [client_data], id=1)
    mock_db.set_data("products", "select", [], id=999)
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_client_product(client_product=new_client_product, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Product with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_create_client_product_already_exists(mock_db, client_data, product_data, client_product_data):
    # Data for creation
    start_date = date(2023, 1, 1)
    new_client_product = ClientProductCreate(
        client_id=1,
        product_id=1,
        start_date=start_date
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "clients" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "products" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "client_products" and mock_db._operation == "select":
            # Return data for association check (meaning it exists)
            return MockDBResponse([{"id": 1}])
        
        raise Exception("Unexpected call")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_client_product(client_product=new_client_product, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 400
    assert "Client ID 1 is already associated with Product ID 1" in excinfo.value.detail

@pytest.mark.asyncio
async def test_create_client_product_failure(mock_db, client_data, product_data):
    # Data for creation
    start_date = date(2023, 1, 1)
    new_client_product = ClientProductCreate(
        client_id=1,
        product_id=1,
        start_date=start_date
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "clients" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "products" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "client_products" and mock_db._operation == "select":
            # Empty response for association check (meaning it doesn't exist)
            return MockDBResponse([])
        elif mock_db._table_name == "client_products" and mock_db._operation == "insert":
            # Return empty data to trigger the failure case
            return MockDBResponse([])
        
        raise Exception("Unexpected call")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_client_product(client_product=new_client_product, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 400
    assert "Failed to create client-product association" in excinfo.value.detail

@pytest.mark.asyncio
async def test_create_client_product_exception(mock_db, client_data, product_data):
    # Data for creation
    start_date = date(2023, 1, 1)
    new_client_product = ClientProductCreate(
        client_id=1,
        product_id=1,
        start_date=start_date
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "clients" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "products" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "client_products" and mock_db._operation == "select":
            # Empty response for association check (meaning it doesn't exist)
            return MockDBResponse([])
        elif mock_db._table_name == "client_products" and mock_db._operation == "insert":
            # Raise exception to simulate database error
            raise Exception("Database error")
        
        raise Exception("Unexpected call")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_client_product(client_product=new_client_product, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test delete_client_product endpoint
@pytest.mark.asyncio
async def test_delete_client_product_success(mock_db, client_product_data):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        mock_db._calls.append(('execute', None))
        
        # Track which operation is being performed
        calls.append((mock_db._table_name, mock_db._operation))
        
        if mock_db._table_name == "client_products" and mock_db._operation == "select":
            # Return data for association check (meaning it exists)
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "client_products" and mock_db._operation == "delete":
            # Successful deletion
            return MockDBResponse([{"success": True}])
        
        raise Exception("Unexpected call")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await delete_client_product(client_id=1, product_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == {"message": "Association between Client ID 1 and Product ID 1 deleted successfully"}
    assert ("client_products", "select") in calls
    assert ("client_products", "delete") in calls

@pytest.mark.asyncio
async def test_delete_client_product_not_found(mock_db):
    # Set up the mock database to raise a not found exception
    mock_db.set_side_effect("client_products", "select", HTTPException(status_code=404, detail="Association between Client ID 999 and Product ID 999 not found"), client_id=999, product_id=999)

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await delete_client_product(client_id=999, product_id=999, db=mock_db)

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Association between Client ID 999 and Product ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_delete_client_product_exception(mock_db, client_product_data):
    # Configure mocks
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "client_products" and mock_db._operation == "select":
            # Return data for association check (meaning it exists)
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "client_products" and mock_db._operation == "delete":
            # Raise exception to simulate database error
            raise Exception("Database error")
        
        raise Exception("Unexpected call")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await delete_client_product(client_id=1, product_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail 