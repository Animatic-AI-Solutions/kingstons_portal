"""
Test configuration and fixtures for the scheduled transactions tests.
"""
import pytest
import asyncio
from typing import AsyncGenerator
from unittest.mock import Mock, MagicMock
from fastapi.testclient import TestClient
from datetime import date, datetime
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)

@pytest.fixture
def mock_db():
    """Create a mock database connection."""
    db_mock = Mock()
    
    # Mock the table method to return a query builder
    table_mock = Mock()
    db_mock.table.return_value = table_mock
    
    # Mock query builder methods
    table_mock.select.return_value = table_mock
    table_mock.insert.return_value = table_mock
    table_mock.update.return_value = table_mock
    table_mock.delete.return_value = table_mock
    table_mock.eq.return_value = table_mock
    table_mock.neq.return_value = table_mock
    table_mock.lt.return_value = table_mock
    table_mock.lte.return_value = table_mock
    table_mock.gt.return_value = table_mock
    table_mock.gte.return_value = table_mock
    table_mock.order.return_value = table_mock
    table_mock.limit.return_value = table_mock
    
    # Mock execute method
    table_mock.execute.return_value = Mock(data=[])
    
    return db_mock

@pytest.fixture
def sample_portfolio_fund():
    """Sample portfolio fund data for testing."""
    return {
        "id": 1,
        "portfolio_id": 1,
        "available_funds_id": 1,
        "weighting": 50.0,
        "start_date": "2024-01-01",
        "end_date": None,
        "amount_invested": 10000.0,
        "status": "active"
    }

@pytest.fixture
def sample_client_product():
    """Sample client product data for testing."""
    return {
        "id": 1,
        "client_id": 1,
        "product_name": "Test Product",
        "status": "active",
        "start_date": "2024-01-01",
        "portfolio_id": 1
    }

@pytest.fixture
def sample_scheduled_transaction():
    """Sample scheduled transaction data for testing."""
    return {
        "portfolio_fund_id": 1,
        "transaction_type": "Investment",
        "amount": 1000.00,
        "execution_day": 15,
        "description": "Test investment",
        "is_recurring": False,
        "recurrence_interval": None,
        "max_executions": None
    }

@pytest.fixture
def sample_recurring_transaction():
    """Sample recurring scheduled transaction data for testing."""
    return {
        "portfolio_fund_id": 1,
        "transaction_type": "RegularInvestment",
        "amount": 500.00,
        "execution_day": 1,
        "description": "Monthly investment",
        "is_recurring": True,
        "recurrence_interval": "monthly",
        "max_executions": 12
    }

@pytest.fixture
def sample_scheduled_transaction_in_db():
    """Sample scheduled transaction as it would appear in the database."""
    return {
        "id": 1,
        "portfolio_fund_id": 1,
        "transaction_type": "Investment",
        "amount": 1000.00,
        "execution_day": 15,
        "description": "Test investment",
        "is_recurring": False,
        "recurrence_interval": None,
        "max_executions": None,
        "next_execution_date": date.today().isoformat(),
        "status": "active",
        "last_executed_date": None,
        "total_executions": 0,
        "created_by": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    } 