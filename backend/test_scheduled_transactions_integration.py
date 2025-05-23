#!/usr/bin/env python3
"""
Integration tests for the scheduled transactions API endpoints.
Tests the actual API server with real HTTP requests.
"""

import requests
import json
from datetime import date, datetime
import time
import sys

# Configuration
BASE_URL = "http://localhost:8000/api"
HEADERS = {"Content-Type": "application/json"}

def test_api_connectivity():
    """Test that the API is running and accessible."""
    print("🔗 Testing API connectivity...")
    try:
        response = requests.get(f"{BASE_URL}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ API is running and accessible")
        return True
    except Exception as e:
        print(f"❌ API connectivity failed: {e}")
        return False

def test_get_empty_scheduled_transactions():
    """Test getting scheduled transactions when none exist."""
    print("\n📋 Testing GET /scheduled_transactions (empty)...")
    try:
        response = requests.get(f"{BASE_URL}/scheduled_transactions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected a list response"
        print(f"✅ GET scheduled_transactions returned {len(data)} items")
        return True
    except Exception as e:
        print(f"❌ GET scheduled_transactions failed: {e}")
        return False

def test_create_scheduled_transaction():
    """Test creating a new scheduled transaction."""
    print("\n➕ Testing POST /scheduled_transactions...")
    
    # First, let's get a valid portfolio_fund_id from the database
    try:
        portfolio_funds_response = requests.get(f"{BASE_URL}/portfolio_funds")
        if portfolio_funds_response.status_code == 200:
            portfolio_funds = portfolio_funds_response.json()
            if portfolio_funds:
                portfolio_fund_id = portfolio_funds[0]["id"]
                print(f"Using portfolio_fund_id: {portfolio_fund_id}")
            else:
                print("⚠️ No portfolio funds found, using ID 1")
                portfolio_fund_id = 1
        else:
            print("⚠️ Could not fetch portfolio funds, using ID 1")
            portfolio_fund_id = 1
    except Exception as e:
        print(f"⚠️ Error fetching portfolio funds: {e}, using ID 1")
        portfolio_fund_id = 1
    
    transaction_data = {
        "portfolio_fund_id": portfolio_fund_id,
        "transaction_type": "Investment",
        "amount": 1000.00,
        "execution_day": 15,
        "description": "Test investment transaction",
        "is_recurring": False,
        "recurrence_interval": None,
        "max_executions": None
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/scheduled_transactions", 
            json=transaction_data,
            headers=HEADERS
        )
        
        if response.status_code != 200:
            print(f"❌ CREATE failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return None
        
        data = response.json()
        print(f"✅ Created scheduled transaction with ID: {data['id']}")
        
        # Validate the response structure
        required_fields = ["id", "portfolio_fund_id", "transaction_type", "amount", "execution_day", "status", "next_execution_date"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        assert data["portfolio_fund_id"] == portfolio_fund_id
        assert data["amount"] == 1000.00
        assert data["status"] == "active"
        
        return data["id"]
    except Exception as e:
        print(f"❌ CREATE scheduled transaction failed: {e}")
        return None

def test_create_recurring_transaction():
    """Test creating a recurring scheduled transaction."""
    print("\n🔄 Testing POST /scheduled_transactions (recurring)...")
    
    # Get a portfolio fund ID (reusing logic from above)
    try:
        portfolio_funds_response = requests.get(f"{BASE_URL}/portfolio_funds")
        if portfolio_funds_response.status_code == 200:
            portfolio_funds = portfolio_funds_response.json()
            portfolio_fund_id = portfolio_funds[0]["id"] if portfolio_funds else 1
        else:
            portfolio_fund_id = 1
    except:
        portfolio_fund_id = 1
    
    transaction_data = {
        "portfolio_fund_id": portfolio_fund_id,
        "transaction_type": "RegularInvestment",
        "amount": 500.00,
        "execution_day": 1,
        "description": "Monthly recurring investment",
        "is_recurring": True,
        "recurrence_interval": "monthly",
        "max_executions": 12
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/scheduled_transactions", 
            json=transaction_data,
            headers=HEADERS
        )
        
        if response.status_code != 200:
            print(f"❌ CREATE recurring failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return None
        
        data = response.json()
        print(f"✅ Created recurring transaction with ID: {data['id']}")
        
        assert data["is_recurring"] == True
        assert data["recurrence_interval"] == "monthly"
        assert data["max_executions"] == 12
        
        return data["id"]
    except Exception as e:
        print(f"❌ CREATE recurring transaction failed: {e}")
        return None

def test_get_scheduled_transaction_by_id(transaction_id):
    """Test getting a specific scheduled transaction by ID."""
    print(f"\n🔍 Testing GET /scheduled_transactions/{transaction_id}...")
    try:
        response = requests.get(f"{BASE_URL}/scheduled_transactions/{transaction_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == transaction_id
        print(f"✅ Retrieved transaction ID: {data['id']}")
        return data
    except Exception as e:
        print(f"❌ GET transaction by ID failed: {e}")
        return None

def test_update_scheduled_transaction(transaction_id):
    """Test updating a scheduled transaction."""
    print(f"\n✏️ Testing PATCH /scheduled_transactions/{transaction_id}...")
    try:
        update_data = {
            "amount": 1500.00,
            "description": "Updated test investment"
        }
        
        response = requests.patch(
            f"{BASE_URL}/scheduled_transactions/{transaction_id}",
            json=update_data,
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["amount"] == 1500.00
        assert data["description"] == "Updated test investment"
        print(f"✅ Updated transaction amount to {data['amount']}")
        return True
    except Exception as e:
        print(f"❌ UPDATE transaction failed: {e}")
        return False

def test_get_all_scheduled_transactions():
    """Test getting all scheduled transactions."""
    print("\n📋 Testing GET /scheduled_transactions (with data)...")
    try:
        response = requests.get(f"{BASE_URL}/scheduled_transactions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected a list response"
        print(f"✅ Retrieved {len(data)} scheduled transactions")
        return data
    except Exception as e:
        print(f"❌ GET all transactions failed: {e}")
        return None

def test_get_transactions_with_filters():
    """Test getting scheduled transactions with filters."""
    print("\n🔎 Testing GET /scheduled_transactions with filters...")
    try:
        # Test filtering by status
        response = requests.get(f"{BASE_URL}/scheduled_transactions?status=active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"✅ Filtered by status=active, got {len(data)} results")
        return True
    except Exception as e:
        print(f"❌ GET transactions with filters failed: {e}")
        return False

def test_pause_and_resume_transaction(transaction_id):
    """Test pausing and resuming a scheduled transaction."""
    print(f"\n⏸️ Testing POST /scheduled_transactions/{transaction_id}/pause...")
    try:
        # Pause the transaction
        response = requests.post(f"{BASE_URL}/scheduled_transactions/{transaction_id}/pause")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        assert "paused successfully" in result["message"]
        print("✅ Transaction paused successfully")
        
        # Resume the transaction
        print(f"▶️ Testing POST /scheduled_transactions/{transaction_id}/resume...")
        response = requests.post(f"{BASE_URL}/scheduled_transactions/{transaction_id}/resume")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        assert "resumed successfully" in result["message"]
        print("✅ Transaction resumed successfully")
        return True
    except Exception as e:
        print(f"❌ Pause/Resume transaction failed: {e}")
        return False

def test_get_transaction_executions(transaction_id):
    """Test getting execution history for a transaction."""
    print(f"\n📊 Testing GET /scheduled_transactions/{transaction_id}/executions...")
    try:
        response = requests.get(f"{BASE_URL}/scheduled_transactions/{transaction_id}/executions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected a list response"
        print(f"✅ Retrieved {len(data)} execution records")
        return True
    except Exception as e:
        print(f"❌ GET transaction executions failed: {e}")
        return False

def test_execute_pending_transactions():
    """Test the execute pending transactions endpoint."""
    print("\n⚡ Testing POST /scheduled_transactions/execute_pending...")
    try:
        response = requests.post(f"{BASE_URL}/scheduled_transactions/execute_pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "executed" in data
        assert "message" in data
        print(f"✅ Execute pending completed: {data['message']}")
        return True
    except Exception as e:
        print(f"❌ Execute pending transactions failed: {e}")
        return False

def test_delete_transaction(transaction_id):
    """Test cancelling (soft delete) a scheduled transaction."""
    print(f"\n🗑️ Testing DELETE /scheduled_transactions/{transaction_id}...")
    try:
        response = requests.delete(f"{BASE_URL}/scheduled_transactions/{transaction_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        assert "cancelled successfully" in result["message"]
        print("✅ Transaction cancelled successfully")
        return True
    except Exception as e:
        print(f"❌ DELETE transaction failed: {e}")
        return False

def test_validation_errors():
    """Test validation error handling."""
    print("\n❌ Testing validation errors...")
    try:
        # Test invalid transaction data
        invalid_data = {
            "portfolio_fund_id": 999999,  # Non-existent portfolio fund
            "transaction_type": "Investment",
            "amount": -100,  # Invalid negative amount
            "execution_day": 35,  # Invalid day
        }
        
        response = requests.post(
            f"{BASE_URL}/scheduled_transactions",
            json=invalid_data,
            headers=HEADERS
        )
        
        # Should get either 400 (business logic error) or 422 (validation error)
        assert response.status_code in [400, 422], f"Expected 400 or 422, got {response.status_code}"
        print("✅ Validation errors handled correctly")
        return True
    except Exception as e:
        print(f"❌ Validation error test failed: {e}")
        return False

def main():
    """Run all integration tests."""
    print("🧪 Starting Scheduled Transactions API Integration Tests")
    print("=" * 60)
    
    # Track test results
    tests_passed = 0
    tests_total = 0
    
    # Test 1: API Connectivity
    tests_total += 1
    if test_api_connectivity():
        tests_passed += 1
    
    # Test 2: Empty state
    tests_total += 1
    if test_get_empty_scheduled_transactions():
        tests_passed += 1
    
    # Test 3: Create transaction
    tests_total += 1
    transaction_id = test_create_scheduled_transaction()
    if transaction_id:
        tests_passed += 1
    
    # Test 4: Create recurring transaction
    tests_total += 1
    recurring_id = test_create_recurring_transaction()
    if recurring_id:
        tests_passed += 1
    
    # Only continue with remaining tests if we have a valid transaction ID
    if transaction_id:
        # Test 5: Get by ID
        tests_total += 1
        if test_get_scheduled_transaction_by_id(transaction_id):
            tests_passed += 1
        
        # Test 6: Update transaction
        tests_total += 1
        if test_update_scheduled_transaction(transaction_id):
            tests_passed += 1
        
        # Test 7: Get all transactions
        tests_total += 1
        if test_get_all_scheduled_transactions():
            tests_passed += 1
        
        # Test 8: Get with filters
        tests_total += 1
        if test_get_transactions_with_filters():
            tests_passed += 1
        
        # Test 9: Pause and resume
        tests_total += 1
        if test_pause_and_resume_transaction(transaction_id):
            tests_passed += 1
        
        # Test 10: Get executions
        tests_total += 1
        if test_get_transaction_executions(transaction_id):
            tests_passed += 1
        
        # Test 11: Execute pending
        tests_total += 1
        if test_execute_pending_transactions():
            tests_passed += 1
        
        # Test 12: Delete transaction
        tests_total += 1
        if test_delete_transaction(transaction_id):
            tests_passed += 1
    
    # Test 13: Validation errors
    tests_total += 1
    if test_validation_errors():
        tests_passed += 1
    
    # Clean up recurring transaction if created
    if recurring_id:
        try:
            requests.delete(f"{BASE_URL}/scheduled_transactions/{recurring_id}")
        except:
            pass
    
    # Summary
    print("\n" + "=" * 60)
    print(f"🏁 Test Results: {tests_passed}/{tests_total} tests passed")
    
    if tests_passed == tests_total:
        print("🎉 All tests PASSED! The scheduled transactions API is working correctly.")
        return 0
    else:
        print(f"⚠️  {tests_total - tests_passed} tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    exit(main()) 