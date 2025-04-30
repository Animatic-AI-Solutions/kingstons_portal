import pytest
from fastapi import HTTPException
from app.api.routes.funds import (
    get_funds,
    get_fund,
    create_fund,
    update_fund,
    delete_fund
)
from app.models.fund import FundCreate, FundUpdate
from tests.conftest import MockDB, MockDBResponse

# Test get_funds endpoint
@pytest.mark.asyncio
async def test_get_funds_success(mock_db, funds_list):
    # Create a customized execute for pagination issues
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Use the enhanced MockDB methods to properly filter and paginate
        filtered_data = mock_db.filter_data(funds_list)
        paginated_data = mock_db.apply_pagination(filtered_data)
        return MockDBResponse(paginated_data)
    
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await get_funds(db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == funds_list  # In this case, no filters so all data is returned

@pytest.mark.asyncio
async def test_get_funds_with_active_filter(mock_db, funds_list):
    # Create a customized execute for pagination issues
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Use the enhanced MockDB methods to properly filter and paginate
        filtered_data = mock_db.filter_data(funds_list)
        paginated_data = mock_db.apply_pagination(filtered_data)
        return MockDBResponse(paginated_data)
    
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint with active filter
    result = await get_funds(active=True, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result - all returned funds should be active
    assert all(fund.get("active", False) for fund in result)

@pytest.mark.asyncio
async def test_get_funds_with_provider_filter(mock_db, funds_list):
    # Create a customized execute for pagination issues
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Use the enhanced MockDB methods to properly filter and paginate
        filtered_data = mock_db.filter_data(funds_list)
        paginated_data = mock_db.apply_pagination(filtered_data)
        return MockDBResponse(paginated_data)
    
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint with provider filter
    result = await get_funds(provider_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify that all returned funds have the specified provider_id
    assert all(fund.get("provider_id") == 1 for fund in result)

@pytest.mark.asyncio
async def test_get_funds_exception(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        raise Exception("Database error")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_funds(db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test get_fund endpoint
@pytest.mark.asyncio
async def test_get_fund_success(mock_db, fund_data):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        return MockDBResponse([fund_data])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await get_fund(fund_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == fund_data

@pytest.mark.asyncio
async def test_get_fund_not_found(mock_db):
    # Set up the mock database to raise a not found exception
    mock_db.set_side_effect("funds_under_management", "select", HTTPException(status_code=404, detail="Fund with ID 999 not found"), id=999)

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_fund(fund_id=999, db=mock_db)

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Fund with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_get_fund_exception(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        raise Exception("Database error")
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_fund(fund_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail

# Test create_fund endpoint
@pytest.mark.asyncio
async def test_create_fund_success(mock_db, fund_data):
    # Fund data for creation
    new_fund = FundCreate(
        product_id=1,
        provider_id=1,
        active=True,
        fund_name="New Test Fund",
        risk_factor=4,
        ISIN="NEW123456789",
        fund_cost=0.85
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "products" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "providers" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "funds_under_management" and mock_db._operation == "insert":
            return MockDBResponse([fund_data])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint
    result = await create_fund(fund=new_fund, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == fund_data
    assert ("products", "select") in calls
    assert ("providers", "select") in calls
    assert ("funds_under_management", "insert") in calls

@pytest.mark.asyncio
async def test_create_fund_product_not_found(mock_db):
    # Fund data for creation
    new_fund = FundCreate(
        product_id=999,
        provider_id=1,
        fund_name="New Test Fund"
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        # Return empty data for product check to simulate not found
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_fund(fund=new_fund, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Product with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_create_fund_provider_not_found(mock_db):
    # Fund data for creation
    new_fund = FundCreate(
        product_id=1,
        provider_id=999,
        fund_name="New Test Fund"
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "products" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "providers" and mock_db._operation == "select":
            # Return empty data for provider check to simulate not found
            return MockDBResponse([])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_fund(fund=new_fund, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Provider with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_create_fund_failure(mock_db):
    # Fund data for creation
    new_fund = FundCreate(
        product_id=1,
        provider_id=1,
        fund_name="New Test Fund"
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "products" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "providers" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "funds_under_management" and mock_db._operation == "insert":
            # Return empty data for insert to simulate failure
            return MockDBResponse([])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await create_fund(fund=new_fund, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 400
    assert "Failed to create fund" in excinfo.value.detail

# Test update_fund endpoint
@pytest.mark.asyncio
async def test_update_fund_success(mock_db, fund_data):
    # Fund data for update
    update_data = FundUpdate(
        fund_name="Updated Fund",
        risk_factor=5
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "funds_under_management" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "funds_under_management" and mock_db._operation == "update":
            return MockDBResponse([fund_data])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint with correct parameter name
    result = await update_fund(fund_id=1, fund_update=update_data, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result == fund_data
    assert ("funds_under_management", "select") in calls
    assert ("funds_under_management", "update") in calls

@pytest.mark.asyncio
async def test_update_fund_not_found(mock_db):
    # Fund data for update
    update_data = FundUpdate(
        fund_name="Updated Fund"
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
        await update_fund(fund_id=999, fund_update=update_data, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Fund with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_update_fund_invalid_product(mock_db):
    # Fund data for update with invalid product
    update_data = FundUpdate(
        product_id=999
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "funds_under_management" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "products" and mock_db._operation == "select":
            # Return empty data to simulate product not found
            return MockDBResponse([])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await update_fund(fund_id=1, fund_update=update_data, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Product with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_update_fund_invalid_provider(mock_db):
    # Fund data for update with invalid provider
    update_data = FundUpdate(
        provider_id=999
    )
    
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "funds_under_management" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "providers" and mock_db._operation == "select":
            # Return empty data to simulate provider not found
            return MockDBResponse([])
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await update_fund(fund_id=1, fund_update=update_data, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Provider with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_delete_fund_success(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []

    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))

        if mock_db._table_name == "funds_under_management" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "funds_under_management" and mock_db._operation == "delete":
            return MockDBResponse([{"success": True}])
        elif mock_db._table_name == "fund_histories" and mock_db._operation == "delete":
            return MockDBResponse([{"success": True}])

        return MockDBResponse([])

    # Set the custom execute method
    mock_db.execute = custom_execute

    # Call the endpoint
    result = await delete_fund(fund_id=1, db=mock_db)

    # Restore original execute
    mock_db.execute = original_execute

    # Verify the result
    assert result == {"message": "Fund with ID 1 and all associated records deleted successfully"}
    
    # Verify the correct sequence of operations
    assert calls == [
        ("funds_under_management", "select"),
        ("fund_histories", "delete"),
        ("funds_under_management", "delete")
    ]

@pytest.mark.asyncio
async def test_delete_fund_not_found(mock_db):
    # Set up the mock database to return empty data for the select operation
    mock_db.set_data("funds_under_management", "select", [], id=999)

    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await delete_fund(fund_id=999, db=mock_db)

    # Verify exception details
    assert excinfo.value.status_code == 404
    assert "Fund with ID 999 not found" in excinfo.value.detail

@pytest.mark.asyncio
async def test_delete_fund_exception(mock_db):
    # Create a completely customized execute for this test
    original_execute = mock_db.execute
    calls = []
    
    def custom_execute():
        nonlocal calls
        calls.append((mock_db._table_name, mock_db._operation))
        mock_db._calls.append(('execute', None))
        
        if mock_db._table_name == "funds_under_management" and mock_db._operation == "select":
            return MockDBResponse([{"id": 1}])
        elif mock_db._table_name == "funds_under_management" and mock_db._operation == "delete":
            raise Exception("Database error")
        
        return MockDBResponse([])
        
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await delete_fund(fund_id=1, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify exception details
    assert excinfo.value.status_code == 500
    assert "Database error" in excinfo.value.detail 