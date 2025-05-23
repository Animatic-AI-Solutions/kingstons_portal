"""
Tests for the scheduled transactions API endpoints.
"""
import pytest
import json
from datetime import date, datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient

def test_create_scheduled_transaction_success(client, mock_db, sample_scheduled_transaction, sample_portfolio_fund):
    """Test successful creation of a scheduled transaction."""
    # Mock database responses
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(data=[sample_portfolio_fund])
    mock_db.table.return_value.insert.return_value.execute.return_value = Mock(data=[{
        **sample_scheduled_transaction,
        "id": 1,
        "next_execution_date": "2024-12-15",
        "status": "active",
        "total_executions": 0,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }])
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.post("/api/scheduled_transactions", json=sample_scheduled_transaction)
    
    assert response.status_code == 200
    data = response.json()
    assert data["portfolio_fund_id"] == sample_scheduled_transaction["portfolio_fund_id"]
    assert data["amount"] == sample_scheduled_transaction["amount"]
    assert data["status"] == "active"

def test_create_scheduled_transaction_invalid_portfolio_fund(client, mock_db, sample_scheduled_transaction):
    """Test creation with invalid portfolio fund ID."""
    # Mock database to return no portfolio fund
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(data=[])
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.post("/api/scheduled_transactions", json=sample_scheduled_transaction)
    
    assert response.status_code == 400
    assert "Portfolio fund not found" in response.json()["detail"]

def test_create_scheduled_transaction_validation_error(client, mock_db):
    """Test creation with validation errors."""
    invalid_transaction = {
        "portfolio_fund_id": 1,
        "transaction_type": "Investment",
        "amount": -100,  # Invalid negative amount
        "execution_day": 32,  # Invalid day
        "is_recurring": True,
        "recurrence_interval": None  # Missing required field for recurring
    }
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.post("/api/scheduled_transactions", json=invalid_transaction)
    
    assert response.status_code == 422

def test_create_recurring_transaction_success(client, mock_db, sample_recurring_transaction, sample_portfolio_fund):
    """Test successful creation of a recurring scheduled transaction."""
    # Mock database responses
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(data=[sample_portfolio_fund])
    mock_db.table.return_value.insert.return_value.execute.return_value = Mock(data=[{
        **sample_recurring_transaction,
        "id": 1,
        "next_execution_date": "2024-12-01",
        "status": "active",
        "total_executions": 0,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }])
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.post("/api/scheduled_transactions", json=sample_recurring_transaction)
    
    assert response.status_code == 200
    data = response.json()
    assert data["is_recurring"] == True
    assert data["recurrence_interval"] == "monthly"
    assert data["max_executions"] == 12

def test_get_scheduled_transactions(client, mock_db, sample_scheduled_transaction_in_db):
    """Test getting all scheduled transactions."""
    mock_db.table.return_value.select.return_value.order.return_value.execute.return_value = Mock(
        data=[sample_scheduled_transaction_in_db]
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.get("/api/scheduled_transactions")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == sample_scheduled_transaction_in_db["id"]

def test_get_scheduled_transactions_with_filters(client, mock_db, sample_scheduled_transaction_in_db):
    """Test getting scheduled transactions with filters."""
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = Mock(
        data=[sample_scheduled_transaction_in_db]
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.get("/api/scheduled_transactions?portfolio_fund_id=1&status=active")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

def test_get_scheduled_transaction_by_id(client, mock_db, sample_scheduled_transaction_in_db):
    """Test getting a specific scheduled transaction by ID."""
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
        data=[sample_scheduled_transaction_in_db]
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.get("/api/scheduled_transactions/1")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1

def test_get_scheduled_transaction_not_found(client, mock_db):
    """Test getting a non-existent scheduled transaction."""
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(data=[])
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.get("/api/scheduled_transactions/999")
    
    assert response.status_code == 404

def test_update_scheduled_transaction(client, mock_db, sample_scheduled_transaction_in_db):
    """Test updating a scheduled transaction."""
    # Mock getting existing transaction
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
        data=[sample_scheduled_transaction_in_db]
    )
    # Mock update
    updated_transaction = sample_scheduled_transaction_in_db.copy()
    updated_transaction["amount"] = 1500.00
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock(
        data=[updated_transaction]
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.patch("/api/scheduled_transactions/1", json={"amount": 1500.00})
    
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 1500.00

def test_update_scheduled_transaction_execution_day(client, mock_db, sample_scheduled_transaction_in_db):
    """Test updating execution day recalculates next execution date."""
    # Mock getting existing transaction
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
        data=[sample_scheduled_transaction_in_db]
    )
    # Mock update
    updated_transaction = sample_scheduled_transaction_in_db.copy()
    updated_transaction["execution_day"] = 20
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock(
        data=[updated_transaction]
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.patch("/api/scheduled_transactions/1", json={"execution_day": 20})
    
    assert response.status_code == 200

def test_delete_scheduled_transaction(client, mock_db, sample_scheduled_transaction_in_db):
    """Test cancelling (soft delete) a scheduled transaction."""
    # Mock getting existing transaction
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
        data=[sample_scheduled_transaction_in_db]
    )
    # Mock update to cancelled
    cancelled_transaction = sample_scheduled_transaction_in_db.copy()
    cancelled_transaction["status"] = "cancelled"
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock(
        data=[cancelled_transaction]
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.delete("/api/scheduled_transactions/1")
    
    assert response.status_code == 200
    assert "cancelled successfully" in response.json()["message"]

def test_pause_scheduled_transaction(client, mock_db, sample_scheduled_transaction_in_db):
    """Test pausing a scheduled transaction."""
    paused_transaction = sample_scheduled_transaction_in_db.copy()
    paused_transaction["status"] = "paused"
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock(
        data=[paused_transaction]
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.post("/api/scheduled_transactions/1/pause")
    
    assert response.status_code == 200
    assert "paused successfully" in response.json()["message"]

def test_resume_scheduled_transaction(client, mock_db, sample_scheduled_transaction_in_db):
    """Test resuming a paused scheduled transaction."""
    resumed_transaction = sample_scheduled_transaction_in_db.copy()
    resumed_transaction["status"] = "active"
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock(
        data=[resumed_transaction]
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.post("/api/scheduled_transactions/1/resume")
    
    assert response.status_code == 200
    assert "resumed successfully" in response.json()["message"]

def test_get_transaction_executions(client, mock_db):
    """Test getting execution history for a scheduled transaction."""
    execution_data = [{
        "id": 1,
        "scheduled_transaction_id": 1,
        "execution_date": "2024-11-15",
        "execution_timestamp": datetime.now().isoformat(),
        "status": "success",
        "executed_amount": 1000.00,
        "activity_log_id": 1,
        "error_message": None,
        "notes": None
    }]
    
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = Mock(
        data=execution_data
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.get("/api/scheduled_transactions/1/executions")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "success"

def test_execute_pending_transactions_no_transactions(client, mock_db):
    """Test executing pending transactions when there are none."""
    mock_db.table.return_value.select.return_value.eq.return_value.lte.return_value.execute.return_value = Mock(
        data=[]
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.post("/api/scheduled_transactions/execute_pending")
    
    assert response.status_code == 200
    data = response.json()
    assert data["executed"] == 0
    assert "No pending transactions" in data["message"]

def test_execute_pending_transactions_with_transactions(client, mock_db, sample_scheduled_transaction_in_db):
    """Test executing pending transactions when there are some to execute."""
    # Mock active transactions due for execution
    pending_transactions = [sample_scheduled_transaction_in_db]
    mock_db.table.return_value.select.return_value.eq.return_value.lte.return_value.execute.return_value = Mock(
        data=pending_transactions
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        with patch('app.api.routes.scheduled_transactions.should_execute_transaction', return_value=True):
            response = client.post("/api/scheduled_transactions/execute_pending")
    
    assert response.status_code == 200
    data = response.json()
    assert data["executed"] == 1

def test_execute_pending_transactions_with_custom_date(client, mock_db):
    """Test executing pending transactions with a custom date."""
    mock_db.table.return_value.select.return_value.eq.return_value.lte.return_value.execute.return_value = Mock(
        data=[]
    )
    
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.post("/api/scheduled_transactions/execute_pending?target_date=2024-12-25")
    
    assert response.status_code == 200
    data = response.json()
    assert data["execution_date"] == "2024-12-25"

def test_execute_pending_transactions_invalid_date(client, mock_db):
    """Test executing pending transactions with invalid date format."""
    with patch('app.api.routes.scheduled_transactions.get_db', return_value=mock_db):
        response = client.post("/api/scheduled_transactions/execute_pending?target_date=invalid-date")
    
    assert response.status_code == 400
    assert "Invalid date format" in response.json()["detail"]

# Service function tests
def test_calculate_next_execution_date():
    """Test the calculate_next_execution_date function."""
    from app.utils.scheduled_transaction_service import calculate_next_execution_date
    
    # Test one-time transaction
    today = date(2024, 11, 10)
    next_date = calculate_next_execution_date(15, None, today)
    assert next_date == date(2024, 11, 15)
    
    # Test monthly recurring
    next_date = calculate_next_execution_date(1, "monthly", today)
    assert next_date == date(2024, 12, 1)
    
    # Test quarterly recurring
    next_date = calculate_next_execution_date(15, "quarterly", today)
    assert next_date == date(2025, 2, 15)
    
    # Test annual recurring
    next_date = calculate_next_execution_date(15, "annually", today)
    assert next_date == date(2025, 11, 15)

def test_calculate_next_execution_date_end_of_month():
    """Test handling of end-of-month dates."""
    from app.utils.scheduled_transaction_service import calculate_next_execution_date
    
    # Test execution day 31 in February
    feb_date = date(2024, 2, 15)
    next_date = calculate_next_execution_date(31, "monthly", feb_date)
    # Should be February 29th (2024 is a leap year)
    assert next_date == date(2024, 2, 29)

def test_map_transaction_type_to_activity_type():
    """Test mapping transaction types to activity types."""
    from app.utils.scheduled_transaction_service import map_transaction_type_to_activity_type
    
    assert map_transaction_type_to_activity_type("Investment") == "Investment"
    assert map_transaction_type_to_activity_type("RegularInvestment") == "RegularInvestment"
    assert map_transaction_type_to_activity_type("Withdrawal") == "Withdrawal"
    assert map_transaction_type_to_activity_type("RegularWithdrawal") == "Withdrawal"

def test_should_execute_transaction():
    """Test the should_execute_transaction function."""
    from app.utils.scheduled_transaction_service import should_execute_transaction
    
    # Active transaction due for execution
    transaction = {
        "status": "active",
        "next_execution_date": "2024-11-01",
        "max_executions": None,
        "total_executions": 0
    }
    target_date = date(2024, 11, 15)
    assert should_execute_transaction(transaction, target_date) == True
    
    # Inactive transaction
    transaction["status"] = "paused"
    assert should_execute_transaction(transaction, target_date) == False
    
    # Transaction not yet due
    transaction["status"] = "active"
    transaction["next_execution_date"] = "2024-12-01"
    assert should_execute_transaction(transaction, target_date) == False
    
    # Transaction at max executions
    transaction["next_execution_date"] = "2024-11-01"
    transaction["max_executions"] = 5
    transaction["total_executions"] = 5
    assert should_execute_transaction(transaction, target_date) == False

def test_validate_scheduled_transaction_data(mock_db, sample_portfolio_fund):
    """Test validation of scheduled transaction data."""
    from app.utils.scheduled_transaction_service import validate_scheduled_transaction_data
    
    # Mock successful portfolio fund lookup
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
        data=[sample_portfolio_fund]
    )
    
    transaction_data = {
        "portfolio_fund_id": 1,
        "transaction_type": "Investment",
        "amount": 1000.00,
        "execution_day": 15,
        "is_recurring": False
    }
    
    validated_data = validate_scheduled_transaction_data(transaction_data, mock_db)
    
    assert "next_execution_date" in validated_data
    assert validated_data["status"] == "active"
    assert validated_data["total_executions"] == 0
    assert "created_at" in validated_data
    assert "updated_at" in validated_data

def test_validate_scheduled_transaction_data_invalid_fund(mock_db):
    """Test validation with invalid portfolio fund."""
    from app.utils.scheduled_transaction_service import validate_scheduled_transaction_data
    
    # Mock failed portfolio fund lookup
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(data=[])
    
    transaction_data = {
        "portfolio_fund_id": 999,
        "transaction_type": "Investment",
        "amount": 1000.00,
        "execution_day": 15
    }
    
    with pytest.raises(ValueError, match="Portfolio fund not found"):
        validate_scheduled_transaction_data(transaction_data, mock_db) 