#!/usr/bin/env python3
"""
Simple test script to validate the scheduled transaction service functions.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import date
from app.utils.scheduled_transaction_service import (
    calculate_next_execution_date,
    map_transaction_type_to_activity_type,
    should_execute_transaction
)

def test_calculate_next_execution_date():
    """Test the calculate_next_execution_date function."""
    print("Testing calculate_next_execution_date...")
    
    # Test one-time transaction
    today = date(2024, 11, 10)
    result = calculate_next_execution_date(15, None, today)
    assert result == date(2024, 11, 15), f"Expected 2024-11-15, got {result}"
    print("✓ One-time transaction: PASS")
    
    # Test monthly recurring
    result = calculate_next_execution_date(1, "monthly", today)
    assert result == date(2024, 12, 1), f"Expected 2024-12-01, got {result}"
    print("✓ Monthly recurring: PASS")
    
    # Test quarterly recurring
    result = calculate_next_execution_date(15, "quarterly", today)
    assert result == date(2025, 2, 15), f"Expected 2025-02-15, got {result}"
    print("✓ Quarterly recurring: PASS")
    
    # Test annual recurring
    result = calculate_next_execution_date(15, "annually", today)
    assert result == date(2025, 11, 15), f"Expected 2025-11-15, got {result}"
    print("✓ Annual recurring: PASS")
    
    # Test end-of-month handling
    feb_date = date(2024, 2, 15)
    result = calculate_next_execution_date(31, "monthly", feb_date)
    assert result == date(2024, 2, 29), f"Expected 2024-02-29, got {result}"
    print("✓ End-of-month handling: PASS")

def test_map_transaction_type_to_activity_type():
    """Test mapping transaction types to activity types."""
    print("\nTesting map_transaction_type_to_activity_type...")
    
    assert map_transaction_type_to_activity_type("Investment") == "Investment"
    print("✓ Investment mapping: PASS")
    
    assert map_transaction_type_to_activity_type("RegularInvestment") == "RegularInvestment"
    print("✓ RegularInvestment mapping: PASS")
    
    assert map_transaction_type_to_activity_type("Withdrawal") == "Withdrawal"
    print("✓ Withdrawal mapping: PASS")
    
    assert map_transaction_type_to_activity_type("RegularWithdrawal") == "RegularWithdrawal"
    print("✓ RegularWithdrawal mapping: PASS")

def test_should_execute_transaction():
    """Test the should_execute_transaction function."""
    print("\nTesting should_execute_transaction...")
    
    # Active transaction due for execution
    transaction = {
        "status": "active",
        "next_execution_date": "2024-11-01",
        "max_executions": None,
        "total_executions": 0
    }
    target_date = date(2024, 11, 15)
    assert should_execute_transaction(transaction, target_date) == True
    print("✓ Active transaction due: PASS")
    
    # Inactive transaction
    transaction["status"] = "paused"
    assert should_execute_transaction(transaction, target_date) == False
    print("✓ Paused transaction: PASS")
    
    # Transaction not yet due
    transaction["status"] = "active"
    transaction["next_execution_date"] = "2024-12-01"
    assert should_execute_transaction(transaction, target_date) == False
    print("✓ Transaction not due: PASS")
    
    # Transaction at max executions
    transaction["next_execution_date"] = "2024-11-01"
    transaction["max_executions"] = 5
    transaction["total_executions"] = 5
    assert should_execute_transaction(transaction, target_date) == False
    print("✓ Max executions reached: PASS")

def main():
    """Run all tests."""
    try:
        test_calculate_next_execution_date()
        test_map_transaction_type_to_activity_type()
        test_should_execute_transaction()
        print("\n🎉 All service function tests PASSED!")
        return 0
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 