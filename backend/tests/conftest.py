import pytest
from datetime import datetime, date
from unittest.mock import MagicMock, AsyncMock, patch
import asyncio
from fastapi import HTTPException
import bcrypt
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

# Mock Database Response Class
class MockDBResponse:
    def __init__(self, data=None):
        self.data = data or []

# Custom MockDB class that works with async/await pattern
class MockDB:
    def __init__(self):
        self._table_name = None
        self._operation = None
        self._inserted_data = None
        self._update_data = None
        self._range_values = None
        self._eq_column = None
        self._eq_value = None
        self._calls = []
        self._data = {}
        self._side_effects = {}
        self._eq_filters = {}  # Store multiple eq filters
        
    def table(self, table_name):
        self._table_name = table_name
        self._calls.append(('table', table_name))
        return self
        
    def select(self, *fields):
        self._operation = "select"
        self._calls.append(('select', fields))
        return self
        
    def insert(self, data=None):
        self._operation = "insert"
        self._inserted_data = data
        self._calls.append(('insert', data))
        return self
        
    def update(self, data=None):
        self._operation = "update"
        self._update_data = data
        self._calls.append(('update', data))
        return self
        
    def delete(self):
        self._operation = "delete"
        self._calls.append(('delete', None))
        return self
        
    def range(self, start=0, end=99):
        self._range_values = (start, end)
        self._calls.append(('range', (start, end)))
        return self
        
    def eq(self, column, value):
        self._eq_column = column
        self._eq_value = value
        self._eq_filters[column] = value  # Store in the filters dict
        self._calls.append(('eq', (column, value)))
        return self
        
    def rpc(self, function_name, params=None):
        self._operation = "rpc"
        self._calls.append(('rpc', (function_name, params)))
        return self

    def filter_data(self, data_list):
        """Apply eq filters to a list of data records
        
        This method allows applying multiple filters to mock data, which is
        useful for implementing proper query building behavior in tests.
        
        Args:
            data_list: List of data dictionaries to filter
            
        Returns:
            Filtered list based on eq filters that have been applied
        """
        if not self._eq_filters:
            return data_list
            
        filtered_data = data_list
        for column, value in self._eq_filters.items():
            filtered_data = [item for item in filtered_data if item.get(column) == value]
            
        return filtered_data
        
    def apply_pagination(self, data_list):
        """Apply pagination to a list of data records
        
        This method simulates the behavior of the range method in Supabase for
        pagination in the mock database.
        
        Args:
            data_list: List of data dictionaries to paginate
            
        Returns:
            Paginated list based on range parameters
        """
        if not self._range_values:
            return data_list
            
        start, end = self._range_values
        # Apply pagination - end is inclusive in supabase range
        return data_list[start:end+1]

    def set_data(self, table_name, operation, data, **kwargs):
        """Set data to be returned by the execute method for specific table, operation and filters"""
        key = self._create_key(table_name, operation, kwargs)
        self._data[key] = data
        
    def set_side_effect(self, table_name, operation, exception, **kwargs):
        """Set side effect to be raised by the execute method for specific table, operation and filters"""
        key = self._create_key(table_name, operation, kwargs)
        self._side_effects[key] = exception
        
    def _create_key(self, table_name, operation, kwargs):
        """Create a unique key for storing/retrieving data based on table, operation and filter kwargs"""
        filters = tuple(sorted((k, v) for k, v in kwargs.items()))
        return (table_name, operation, filters)
        
    def get_key(self):
        """Get the current key based on the chain of methods called"""
        filters = []
        if self._eq_filters:
            filters.extend((k, v) for k, v in self._eq_filters.items())
        elif self._eq_column and self._eq_value:
            filters.append((self._eq_column, self._eq_value))
        return self._create_key(self._table_name, self._operation, dict(filters))
        
    def get_calls(self):
        """Return all tracked method calls"""
        return self._calls
        
    def execute(self):
        """Execute the mock operation and return appropriate response - NOT async to match how the routes access it"""
        self._calls.append(('execute', None))
        
        # Get the current key based on the operation and filters
        key = self.get_key()
        
        # Check if there's a side effect for this operation
        if key in self._side_effects:
            exception = self._side_effects[key]
            if isinstance(exception, HTTPException):
                # Let FastAPI HTTP exceptions pass through directly without wrapping
                raise exception
            # For other exceptions, just raise them and let them be caught in the route
            raise exception
            
        # Return the data for this operation if it exists
        if key in self._data:
            return MockDBResponse(self._data[key])
            
        # For empty data, return empty response
        return MockDBResponse([])

# Base test fixtures
@pytest.fixture
def mock_db():
    """Fixture to create a mock database client"""
    return MockDB()

# Client fixtures
@pytest.fixture
def client_data():
    """Sample client data for tests"""
    return {
        "id": 1,
        "name": "Test Client",
        "email": "test@example.com",
        "phone": "123-456-7890",
        "address": "123 Test St",
        "active": True,
        "relationship": "Primary",
        "advisor": "John Smith",
        "created_at": "2023-01-01T00:00:00"
    }

@pytest.fixture
def clients_list():
    """List of clients for tests"""
    return [
        {
            "id": 1,
            "name": "Client One",
            "email": "client1@example.com",
            "phone": "111-111-1111",
            "address": "111 First St",
            "active": True,
            "relationship": "Primary",
            "created_at": "2023-01-01T00:00:00"
        },
        {
            "id": 2,
            "name": "Client Two",
            "email": "client2@example.com",
            "phone": "222-222-2222",
            "address": "222 Second St",
            "active": True,
            "relationship": "Spouse",
            "created_at": "2023-01-02T00:00:00"
        },
        {
            "id": 3,
            "name": "Client Three",
            "email": "client3@example.com",
            "phone": "333-333-3333",
            "address": "333 Third St",
            "active": False,
            "relationship": "Dependent",
            "created_at": "2023-01-03T00:00:00"
        }
    ]

# Product fixtures
@pytest.fixture
def product_data():
    """Sample product data for tests"""
    return {
        "id": 1,
        "name": "Test Product",
        "provider_id": 1,
        "category": "Investment",
        "description": "A test product",
        "active": True,
        "created_at": "2023-01-01T00:00:00"
    }

@pytest.fixture
def products_list():
    """List of products for tests"""
    return [
        {
            "id": 1,
            "name": "Product One",
            "provider_id": 1,
            "category": "Investment",
            "description": "First test product",
            "active": True,
            "created_at": "2023-01-01T00:00:00"
        },
        {
            "id": 2,
            "name": "Product Two",
            "provider_id": 2,
            "category": "Insurance",
            "description": "Second test product",
            "active": True,
            "created_at": "2023-01-02T00:00:00"
        },
        {
            "id": 3,
            "name": "Product Three",
            "provider_id": 1,
            "category": "Pension",
            "description": "Third test product",
            "active": False,
            "created_at": "2023-01-03T00:00:00"
        }
    ]

# Fund fixtures
@pytest.fixture
def fund_data():
    """Sample fund data for tests"""
    return {
        "id": 1,
        "name": "Test Fund",
        "provider_id": 1,
        "fund_type": "Equity",
        "description": "A test fund",
        "active": True,
        "created_at": "2023-01-01T00:00:00"
    }

@pytest.fixture
def funds_list():
    """List of funds for tests"""
    return [
        {
            "id": 1,
            "name": "Fund One",
            "provider_id": 1,
            "fund_type": "Equity",
            "description": "First test fund",
            "active": True,
            "created_at": "2023-01-01T00:00:00"
        },
        {
            "id": 2,
            "name": "Fund Two",
            "provider_id": 2,
            "fund_type": "Bond",
            "description": "Second test fund",
            "active": True,
            "created_at": "2023-01-02T00:00:00"
        },
        {
            "id": 3,
            "name": "Fund Three",
            "provider_id": 1,
            "fund_type": "Mixed",
            "description": "Third test fund",
            "active": False,
            "created_at": "2023-01-03T00:00:00"
        }
    ]

# Provider fixtures
@pytest.fixture
def provider_data():
    """Sample provider data for tests"""
    return {
        "id": 1,
        "name": "Test Provider",
        "created_at": "2023-01-01T00:00:00"
    }

@pytest.fixture
def providers_list():
    """List of providers for tests"""
    return [
        {
            "id": 1,
            "name": "Provider One",
            "created_at": "2023-01-01T00:00:00"
        },
        {
            "id": 2,
            "name": "Provider Two",
            "created_at": "2023-01-02T00:00:00"
        },
        {
            "id": 3,
            "name": "Provider Three",
            "created_at": "2023-01-03T00:00:00"
        }
    ]

@pytest.fixture
def test_user():
    """Sample user data for authentication tests"""
    return {
        "id": 1,
        "username": "testuser",
        "password_hash": bcrypt.hashpw("testpass123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        "first_name": "Test",
        "last_name": "User",
        "role": "admin",
        "created_at": "2024-01-01T00:00:00"
    }

@pytest.fixture
def test_session():
    """Sample session data for authentication tests"""
    return {
        "id": "test-session-id",
        "user_id": 1,
        "created_at": "2024-01-01T00:00:00"
    }

# Portfolio fixtures
@pytest.fixture
def portfolio_data():
    """Sample portfolio data for tests"""
    return {
        "id": 1,
        "client_id": 1,
        "name": "Test Portfolio",
        "description": "A test portfolio",
        "created_at": "2023-01-01T00:00:00"
    }

@pytest.fixture
def portfolios_list():
    """List of portfolios for tests"""
    return [
        {
            "id": 1,
            "client_id": 1,
            "name": "Portfolio One",
            "description": "First test portfolio",
            "created_at": "2023-01-01T00:00:00"
        },
        {
            "id": 2,
            "client_id": 2,
            "name": "Portfolio Two",
            "description": "Second test portfolio",
            "created_at": "2023-01-02T00:00:00"
        },
        {
            "id": 3,
            "client_id": 1,
            "name": "Portfolio Three",
            "description": "Third test portfolio",
            "created_at": "2023-01-03T00:00:00"
        }
    ]

# Client-Product fixtures
@pytest.fixture
def client_product_data():
    """Sample client-product association data for tests"""
    return {
        "id": 1,
        "client_id": 1,
        "product_id": 1,
        "start_date": "2023-01-01",
        "created_at": "2023-01-01T00:00:00"
    }

@pytest.fixture
def client_products_list():
    """List of client-product associations for tests"""
    return [
        {
            "id": 1,
            "client_id": 1,
            "product_id": 1,
            "start_date": "2023-01-01",
            "created_at": "2023-01-01T00:00:00"
        },
        {
            "id": 2,
            "client_id": 1,
            "product_id": 2,
            "start_date": "2023-01-02",
            "created_at": "2023-01-02T00:00:00"
        },
        {
            "id": 3,
            "client_id": 2,
            "product_id": 1,
            "start_date": "2023-01-03",
            "created_at": "2023-01-03T00:00:00"
        }
    ]

# Analytics fixtures
@pytest.fixture
def analytics_product_client_counts():
    """Sample analytics data for product client counts"""
    return [
        {
            "product_id": 1,
            "product_name": "Product One",
            "total_clients": 2
        },
        {
            "product_id": 2,
            "product_name": "Product Two",
            "total_clients": 1
        }
    ]

@pytest.fixture
def analytics_data():
    """
    Returns sample analytics data for testing.
    """
    return {
        "relationships": ["Primary", "Secondary"],
        "products": ["Test Product 1", "Test Product 2"],
        "data": [
            {
                "relationship": "Primary",
                "counts": {"Test Product 1": 2, "Test Product 2": 1}
            },
            {
                "relationship": "Secondary",
                "counts": {"Test Product 1": 1, "Test Product 2": 0}
            }
        ]
    } 