"""
Test script for the bulk activity endpoint
"""

import asyncio
import logging
from datetime import datetime
import requests
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_bulk_activity_endpoint():
    """Test the bulk activity creation endpoint"""
    
    print("🧪 Testing Bulk Activity Endpoint")
    print("=" * 40)
    
    # Test data - minimal valid activities with real IDs
    test_activities = [
        {
            "portfolio_fund_id": 2,  # Valid ID from API response
            "product_id": 26,  # Product created by user for testing
            "activity_type": "investment",
            "activity_timestamp": "2025-08-01T00:00:00Z",
            "amount": 100.0
        },
        {
            "portfolio_fund_id": 3,  # Valid ID from API response
            "product_id": 26,  # Product created by user for testing
            "activity_type": "withdrawal", 
            "activity_timestamp": "2025-08-01T00:00:00Z",
            "amount": 50.0
        }
    ]
    
    try:
        print(f"📤 Sending {len(test_activities)} activities to bulk endpoint...")
        
        # Make request to bulk endpoint
        response = requests.post(
            "http://localhost:8001/api/holding_activity_logs/bulk",
            json=test_activities,
            params={"skip_irr_calculation": True},  # Skip IRR calc for testing
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Successfully created {len(result)} activities")
            
            # Print some details
            for i, activity in enumerate(result[:2]):  # Show first 2
                print(f"   Activity {i+1}: ID={activity['id']}, Fund={activity['portfolio_fund_id']}, Amount={activity['amount']}")
        
        elif response.status_code == 422:
            print("❌ Validation Error:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Error {response.status_code}:")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the FastAPI server is running on localhost:8001")
    except Exception as e:
        print(f"❌ Test failed: {e}")

def test_sequence_health_endpoint():
    """Test the sequence health endpoint"""
    
    print("\n🔍 Testing Sequence Health Endpoint")
    print("=" * 40)
    
    try:
        response = requests.get("http://localhost:8001/api/system/sequence-health")
        
        print(f"📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Overall Health: {result['overall_health']}")
            print(f"   Healthy Sequences: {result['healthy_sequences']}/{result['total_sequences']}")
            
            # Show details for first sequence
            if result['sequences']:
                seq = result['sequences'][0]
                print(f"   Example - {seq['table']}: {seq['status']} (Seq: {seq['sequence_value']}, Max: {seq['table_max_id']})")
        else:
            print(f"❌ Error {response.status_code}:")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the FastAPI server is running on localhost:8001")
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    print("🚀 Kingston's Portal - Bulk Endpoint Tests")
    print("Testing Phase 1 API Endpoints")
    print("=" * 50)
    
    # Test bulk activity endpoint
    test_bulk_activity_endpoint()
    
    # Test system health endpoint
    test_sequence_health_endpoint()
    
    print("\n🎉 API Tests Complete!")
    print("=" * 50)
