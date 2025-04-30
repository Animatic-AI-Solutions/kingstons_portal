import pytest
from fastapi import HTTPException, Response
from app.api.routes.auth import login, logout, get_current_user
from app.models.auth import LoginRequest
from fastapi.security import HTTPAuthorizationCredentials
from tests.conftest import MockDBResponse

# Test successful login
@pytest.mark.asyncio
async def test_login_success(mock_db, test_user):
    # Create login request
    login_data = LoginRequest(
        username="testuser",
        password="testpass123"
    )
    
    # Configure mock
    mock_db.set_data("profiles", "select", [test_user], username="testuser")
    
    # Create a custom execute method for this test
    original_execute = mock_db.execute
    
    def custom_execute():
        mock_db._calls.append(('execute', None))
        if mock_db._table_name == "profiles" and mock_db._operation == "select":
            return MockDBResponse([test_user])
        elif mock_db._table_name == "sessions" and mock_db._operation == "insert":
            # Return the inserted data with the session ID from the insert operation
            return MockDBResponse([mock_db._data])
        return MockDBResponse([])
    
    # Set the custom execute method
    mock_db.execute = custom_execute
    
    # Create a mock response object
    response = Response()
    
    # Call the endpoint
    result = await login(login_data=login_data, response=response, db=mock_db)
    
    # Restore original execute
    mock_db.execute = original_execute
    
    # Verify the result
    assert result.message == "Login successful"
    assert "session_id" in result.model_dump()
    assert result.user["id"] == test_user["id"]
    assert result.user["username"] == test_user["username"]
    assert "password_hash" not in result.user
    
    # Verify the database calls
    calls = mock_db.get_calls()
    assert ('table', 'profiles') in calls
    assert ('select', ('*',)) in calls
    assert ('eq', ('username', 'testuser')) in calls
    assert ('table', 'sessions') in calls
    assert ('insert', {'user_id': test_user["id"], 'id': result.session_id}) in calls

# Test login with invalid username
@pytest.mark.asyncio
async def test_login_invalid_username(mock_db):
    # Create login request with non-existent username
    login_data = LoginRequest(
        username="nonexistent",
        password="testpass123"
    )
    
    # Configure mock to return empty result
    mock_db.set_data("profiles", "select", [], username="nonexistent")
    
    # Create a mock response object
    response = Response()
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await login(login_data=login_data, response=response, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Invalid username or password"

# Test login with invalid password
@pytest.mark.asyncio
async def test_login_invalid_password(mock_db, test_user):
    # Create login request with wrong password
    login_data = LoginRequest(
        username="testuser",
        password="wrongpass"
    )
    
    # Configure mock
    mock_db.set_data("profiles", "select", [test_user], username="testuser")
    
    # Create a mock response object
    response = Response()
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await login(login_data=login_data, response=response, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Invalid username or password"

# Test successful logout
@pytest.mark.asyncio
async def test_logout_success():
    # Create a mock response object
    response = Response()
    
    # Call the endpoint
    result = await logout(response=response, session_id="test_session")
    
    # Verify the result
    assert result.message == "Logged out successfully"

# Test get_current_user success
@pytest.mark.asyncio
async def test_get_current_user_success(mock_db, test_user, test_session):
    # Create mock credentials
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=test_session["id"])
    
    # Configure mock
    mock_db.set_data("sessions", "select", [test_session], id=test_session["id"])
    mock_db.set_data("profiles", "select", [test_user], id=test_user["id"])
    
    # Call the endpoint
    result = await get_current_user(credentials=credentials, db=mock_db)
    
    # Verify the result
    assert result["id"] == test_user["id"]
    assert result["username"] == test_user["username"]
    assert "password_hash" not in result
    
    # Verify the database calls
    calls = mock_db.get_calls()
    assert ('table', 'sessions') in calls
    assert ('select', ('*',)) in calls
    assert ('eq', ('id', test_session["id"])) in calls
    assert ('table', 'profiles') in calls
    assert ('eq', ('id', test_user["id"])) in calls

# Test get_current_user with invalid session
@pytest.mark.asyncio
async def test_get_current_user_invalid_session(mock_db):
    # Create mock credentials with invalid session ID
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid_session")
    
    # Configure mock to return empty result
    mock_db.set_data("sessions", "select", [], id="invalid_session")
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user(credentials=credentials, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Invalid session"

# Test get_current_user with valid session but invalid user
@pytest.mark.asyncio
async def test_get_current_user_invalid_user(mock_db, test_session):
    # Create mock credentials
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=test_session["id"])
    
    # Configure mock to return session but no user
    mock_db.set_data("sessions", "select", [test_session], id=test_session["id"])
    mock_db.set_data("profiles", "select", [], id=test_session["user_id"])
    
    # Call the endpoint and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user(credentials=credentials, db=mock_db)
    
    # Verify exception details
    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "User not found" 