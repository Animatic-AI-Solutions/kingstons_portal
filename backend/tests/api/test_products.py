import pytest
from fastapi import HTTPException

from app.api.routes.products import get_products, get_product, create_product, update_product, delete_product
from app.models.product import ProductCreate, ProductUpdate
from tests.conftest import MockDBResponse

# Test get_products endpoint
@pytest.mark.asyncio
async def test_get_products_success(mock_db, products_list):
    """Test getting products with enhanced MockDB methods"""
    # Create a customized execute for pagination
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Use the enhanced MockDB methods to properly filter and paginate
        filtered_data = mock_db.filter_data(products_list)
        paginated_data = mock_db.apply_pagination(filtered_data)
        return MockDBResponse(paginated_data)
    
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await get_products(db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == products_list  # In this case, no filters so all data is returned

@pytest.mark.asyncio
async def test_get_products_with_active_filter(mock_db, products_list):
    """Test getting active products with enhanced MockDB methods"""
    # Create a customized execute for pagination
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Use the enhanced MockDB methods to properly filter and paginate
        filtered_data = mock_db.filter_data(products_list)
        paginated_data = mock_db.apply_pagination(filtered_data)
        return MockDBResponse(paginated_data)
    
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint with active filter
    result = await get_products(active=True, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result - all returned products should be active
    assert all(product.get("active", False) for product in result)

@pytest.mark.asyncio
async def test_get_products_exception(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        raise Exception("Database error")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_products(db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test get_product endpoint
@pytest.mark.asyncio
async def test_get_product_success(mock_db, product_data):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        return MockDBResponse([product_data])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await get_product(product_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == product_data

@pytest.mark.asyncio
async def test_get_product_not_found(mock_db):
    # Set up the mock database to raise a not found exception
    mock_db.set_side_effect("products", "select", HTTPException(status_code=404, detail="Product with ID 999 not found"), id=999)

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_product(product_id=999, db=mock_db)

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Product with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_get_product_exception(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        raise Exception("Database error")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_product(product_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test create_product endpoint
@pytest.mark.asyncio
async def test_create_product_success(mock_db, product_data):
    # Product data for creation
    new_product = ProductCreate(
        name="New Product",
        provider_id=2,
        portfolio_id=2,
        active=True
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        return MockDBResponse([product_data])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await create_product(product=new_product, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == product_data

@pytest.mark.asyncio
async def test_create_product_failure(mock_db):
    # Set up the mock database to raise an error for insert operation
    mock_db.set_side_effect("products", "insert", HTTPException(status_code=400, detail="Failed to create product"))

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_product(product=ProductCreate(name="Test Product", description="Test Description"), db=mock_db)

    # Verify exception details
    assert excinfo.value.status_code == 400
    assert "Failed to create product" in excinfo.value.detail

@pytest.mark.asyncio
async def test_create_product_exception(mock_db):
    # Product data for creation
    new_product = ProductCreate(
        name="New Product",
        provider_id=2,
        portfolio_id=2,
        active=True
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
        await create_product(product=new_product, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test update_product endpoint
@pytest.mark.asyncio
async def test_update_product_success(mock_db, product_data):
    # Product data for update
    update_data = ProductUpdate(
        name="Updated Product",
        active=False
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        mock_db._calls.append(('execute', None))
        calls.append((mock_db._table_name, mock_db._operation))
        
        if mock_db._table_name == "products" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "products" and mock_db._operation == "update":
            return MockDBResponse([product_data])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint with the correct parameter name
    result = await update_product(product_id=1, product_update=update_data, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == product_data
    assert ("products", "select") in calls
    assert ("products", "update") in calls

@pytest.mark.asyncio
async def test_update_product_not_found(mock_db):
    # Set up the mock database to raise a not found exception
    mock_db.set_side_effect("products", "select", HTTPException(status_code=404, detail="Product with ID 999 not found"), id=999)

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await update_product(product_id=999, product_update=ProductUpdate(name="Updated Product", description="Updated Description"), db=mock_db)

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Product with ID 999 not found" in excinfo.value.detail

# Test delete_product endpoint
@pytest.mark.asyncio
async def test_delete_product_success(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        mock_db._calls.append(('execute', None))
        calls.append((mock_db._table_name, mock_db._operation))
        
        if mock_db._table_name == "products" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "products" and mock_db._operation == "delete":
            return MockDBResponse([{"success": True}])
        elif mock_db._table_name == "client_products" and mock_db._operation == "delete":
            return MockDBResponse([])
        elif mock_db._table_name == "funds_under_management" and mock_db._operation == "update":
            return MockDBResponse([])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await delete_product(product_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result with the correct message that includes the ID
    assert result == {"message": "Product with ID 1 deleted successfully"}
    assert ("products", "select") in calls
    assert ("products", "delete") in calls

@pytest.mark.asyncio
async def test_delete_product_not_found(mock_db):
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
        await delete_product(product_id=999, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Product with ID 999 not found"

@pytest.mark.asyncio
async def test_delete_product_exception(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        mock_db._calls.append(('execute', None))
        calls.append((mock_db._table_name, mock_db._operation))
        
        if mock_db._table_name == "products" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "products" and mock_db._operation == "delete":
            raise Exception("Database error")
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await delete_product(product_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail 