import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException
from app.main import app

client = TestClient(app)

# Mock data
mock_user = {
    "id": 1,
    "username": "testuser",
    "password_hash": "hashed_password",
    "first_name": "Test",
    "last_name": "User",
    "role": "user"
}

mock_admin = {
    "id": 2,
    "username": "admin",
    "password_hash": "hashed_password",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin"
}

mock_profiles = [mock_user, mock_admin]

class MockDBResponse:
    def __init__(self, data):
        self.data = data if data is not None else []

    def __len__(self):
        return len(self.data)

    def __bool__(self):
        return bool(self.data)

class MockTable:
    def __init__(self, data=None):
        self.data = data if data is not None else []

    def select(self, *args):
        return self

    def eq(self, field, value):
        if field == "username":
            self.data = [item for item in self.data if item.get("username") == value]
        elif field == "id":
            self.data = [item for item in self.data if item.get("id") == value]
        elif field == "session_id":
            self.data = [item for item in self.data if item.get("session_id") == value]
        elif field == "user_id":
            self.data = [item for item in self.data if item.get("user_id") == value]
        return self

    def insert(self, data):
        self.data.append(data)
        return self

    def delete(self):
        return self

    def execute(self):
        return MockDBResponse(self.data)

@pytest.fixture
def mock_db():
    with patch("app.db.database.supabase") as mock:
        mock.table.return_value = MockTable()
        yield mock

@pytest.fixture
def mock_auth():
    with patch("app.api.routes.auth.get_current_user") as mock:
        mock.return_value = mock_user
        yield mock

@pytest.fixture
def mock_auth_middleware():
    with patch("app.api.routes.auth.HTTPBearer") as mock:
        mock.return_value = MagicMock()
        mock.return_value.return_value = MagicMock(credentials="test-token")
        yield mock

@pytest.fixture
def mock_session_db():
    with patch("app.db.database.supabase") as mock:
        mock.table.return_value = MockTable([{"user_id": 1, "session_id": "test-token"}])
        yield mock

def test_signup_success(mock_db):
    test_data = {
        "username": "newuser",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User"
    }

    response = client.post("/api/auth/signup", json=test_data)
    assert response.status_code == 200
    assert response.json() == {"message": "User created successfully"}

def test_signup_username_exists(mock_db):
    # Override mock for this test
    mock_db.table.return_value = MockTable([{"id": 1, "username": "testuser"}])

    test_data = {
        "username": "testuser",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User"
    }

    response = client.post("/api/auth/signup", json=test_data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Username already exists"}

def test_signup_missing_fields(mock_db):
    test_data = {
        "username": "newuser"
    }

    response = client.post("/api/auth/signup", json=test_data)
    assert response.status_code == 422

def test_login_success(mock_db):
    # Override mock for this test
    mock_db.table.return_value = MockTable([mock_user])

    test_data = {
        "username": "testuser",
        "password": "testpass123"
    }

    response = client.post("/api/auth/login", json=test_data)
    assert response.status_code == 200
    assert "session_id" in response.json()
    assert "user" in response.json()

def test_login_invalid_credentials(mock_db):
    # Override mock for this test
    mock_db.table.return_value = MockTable([mock_user])

    test_data = {
        "username": "testuser",
        "password": "wrongpass"
    }

    response = client.post("/api/auth/login", json=test_data)
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid username or password"}

def test_logout():
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}

def test_get_all_profiles_admin(mock_db, mock_auth, mock_auth_middleware):
    mock_auth.return_value = mock_admin
    mock_db.table.return_value = MockTable(mock_profiles)

    response = client.get("/api/profiles", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    assert len(response.json()) == 2

def test_get_all_profiles_non_admin(mock_db, mock_auth, mock_auth_middleware):
    mock_auth.return_value = mock_user
    
    response = client.get("/api/profiles", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 403
    assert response.json() == {"detail": "Only administrators can view all profiles"}

def test_get_all_profiles_no_auth(mock_db, mock_auth, mock_auth_middleware):
    mock_auth.side_effect = HTTPException(status_code=401, detail="Not authenticated")

    response = client.get("/api/profiles", headers={"Authorization": "Bearer invalid-token"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}

def test_delete_profile_admin(mock_db, mock_auth, mock_auth_middleware):
    mock_auth.return_value = mock_admin
    mock_db.table.return_value = MockTable([mock_user])

    response = client.delete("/api/profiles/1", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    assert response.json() == {"message": "Profile deleted successfully"}

def test_delete_profile_non_admin(mock_db, mock_auth, mock_auth_middleware):
    mock_auth.return_value = mock_user

    response = client.delete("/api/profiles/1", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 403
    assert response.json() == {"detail": "Only administrators can delete profiles"}

def test_delete_profile_not_found(mock_db, mock_auth, mock_auth_middleware):
    mock_auth.return_value = mock_admin
    mock_db.table.return_value = MockTable([])

    response = client.delete("/api/profiles/999", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Profile not found"}

def test_delete_profile_no_auth(mock_db, mock_auth, mock_auth_middleware):
    mock_auth.side_effect = HTTPException(status_code=401, detail="Not authenticated")

    response = client.delete("/api/profiles/1", headers={"Authorization": "Bearer invalid-token"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"} 