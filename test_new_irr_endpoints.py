#!/usr/bin/env python3
"""
Test script for the new standardized IRR endpoints.

This script tests:
1. POST /portfolio_funds/{portfolio_fund_id}/irr - Single fund IRR calculation
2. POST /portfolio_funds/multiple/irr - Multiple funds aggregated IRR calculation

Both endpoints use the standardized calculate_excel_style_irr method.
"""

import requests
import json
from datetime import date, datetime
import sys

# Configuration
BASE_URL = "http://localhost:8000/api"
HEADERS = {"Content-Type": "application/json"}

def get_portfolio_funds(portfolio_id):
    """Fetch all portfolio funds for a given portfolio ID"""
    try:
        response = requests.get(f"{BASE_URL}/portfolio_funds?portfolio_id={portfolio_id}")
        if response.status_code == 200:
            funds = response.json()
            print(f"Found {len(funds)} funds in portfolio {portfolio_id}")
            for fund in funds:
                print(f"  - Fund ID: {fund['id']}, Available Fund ID: {fund['available_funds_id']}")
            return funds
        else:
            print(f"Error fetching portfolio funds: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"Error fetching portfolio funds: {str(e)}")
        return []

def test_single_fund_irr(fund_id):
    """Test the single portfolio fund IRR endpoint"""
    print("=" * 60)
    print("Testing Single Portfolio Fund IRR Calculation")
    print("=" * 60)
    
    url = f"{BASE_URL}/portfolio_funds/{fund_id}/irr"
    
    # Test data
    test_data = {
        "valuation_date": "2024-12-31",
        "valuation_amount": 15000.0
    }
    
    print(f"POST {url}")
    print(f"Request body: {json.dumps(test_data, indent=2)}")
    print()
    
    try:
        response = requests.post(url, json=test_data)
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print()
        
        if response.status_code == 200:
            data = response.json()
            print("SUCCESS! Response:")
            print(json.dumps(data, indent=2))
            
            # Validate expected fields
            expected_fields = ["portfolio_fund_id", "irr", "irr_percentage", "days_in_period", "calculation_method"]
            missing_fields = [field for field in expected_fields if field not in data]
            if missing_fields:
                print(f"WARNING: Missing expected fields: {missing_fields}")
            else:
                print("✓ All expected fields present")
                
        else:
            print("ERROR! Response:")
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2))
            except:
                print(f"Raw response text: {response.text}")
                
    except Exception as e:
        print(f"Request failed: {str(e)}")
    
    print()

def test_multiple_funds_irr(fund_ids):
    """Test the multiple portfolio funds aggregated IRR endpoint"""
    print("=" * 60)
    print("Testing Multiple Portfolio Funds Aggregated IRR Calculation")
    print("=" * 60)
    
    url = f"{BASE_URL}/portfolio_funds/multiple/irr"
    
    # Create fund valuations dict - use first 2 funds if available
    test_fund_ids = fund_ids[:2] if len(fund_ids) >= 2 else fund_ids
    fund_valuations = {}
    for i, fund_id in enumerate(test_fund_ids):
        fund_valuations[str(fund_id)] = 10000.0 + (i * 5000.0)  # Different valuations for each fund
    
    test_data = {
        "portfolio_fund_ids": test_fund_ids,
        "valuation_date": "2024-12-31",
        "fund_valuations": fund_valuations
    }
    
    print(f"POST {url}")
    print(f"Request body: {json.dumps(test_data, indent=2)}")
    print()
    
    try:
        response = requests.post(url, json=test_data)
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print()
        
        if response.status_code == 200:
            data = response.json()
            print("SUCCESS! Response:")
            print(json.dumps(data, indent=2))
            
            # Validate expected fields
            expected_fields = ["portfolio_fund_ids", "irr", "irr_percentage", "days_in_period", "calculation_method", "total_valuation"]
            missing_fields = [field for field in expected_fields if field not in data]
            if missing_fields:
                print(f"WARNING: Missing expected fields: {missing_fields}")
            else:
                print("✓ All expected fields present")
                
        else:
            print("ERROR! Response:")
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2))
            except:
                print(f"Raw response text: {response.text}")
                
    except Exception as e:
        print(f"Request failed: {str(e)}")
    
    print()

def test_error_cases():
    """Test various error scenarios"""
    print("=" * 60)
    print("Testing Error Cases")
    print("=" * 60)
    
    # Test 1: Non-existent portfolio fund
    print("\n1. Testing non-existent portfolio fund...")
    try:
        response = requests.post(f"{BASE_URL}/portfolio_funds/99999/irr", json={
            "valuation_date": "2024-12-31",
            "valuation_amount": 10000.0
        })
        print(f"Status: {response.status_code}")
        if response.status_code == 404:
            try:
                error_data = response.json()
                print(f"✓ Expected 404 error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"✓ Expected 404 error: {response.text}")
        else:
            print(f"✗ Expected 404 but got {response.status_code}")
            try:
                error_data = response.json()
                print(f"Response: {error_data}")
            except:
                print(f"Response: {response.text}")
    except Exception as e:
        print(f"✗ Request failed: {str(e)}")
    
    # Test 2: Missing valuations for multiple funds
    print("\n2. Testing missing valuations for multiple funds...")
    try:
        response = requests.post(f"{BASE_URL}/portfolio_funds/multiple/irr", json={
            "portfolio_fund_ids": [220, 221],
            "valuation_date": "2024-12-31",
            "fund_valuations": {"220": 10000.0}  # Missing valuation for 221
        })
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            try:
                error_data = response.json()
                error_detail = error_data.get('detail', 'Unknown error')
                print(f"✓ Expected 400 error: {error_detail}")
                if "missing" in error_detail.lower() or "221" in error_detail:
                    print("✓ Error message correctly identifies missing valuation")
                else:
                    print(f"⚠ Error message might not be specific enough: {error_detail}")
            except:
                print(f"✓ Expected 400 error: {response.text}")
        else:
            print(f"✗ Expected 400 but got {response.status_code}")
            try:
                error_data = response.json()
                print(f"Response: {error_data}")
            except:
                print(f"Response: {response.text}")
    except Exception as e:
        print(f"✗ Request failed: {str(e)}")
    
    # Test 3: Empty portfolio fund list
    print("\n3. Testing empty portfolio fund list...")
    try:
        response = requests.post(f"{BASE_URL}/portfolio_funds/multiple/irr", json={
            "portfolio_fund_ids": [],
            "valuation_date": "2024-12-31",
            "fund_valuations": {}
        })
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            try:
                error_data = response.json()
                error_detail = error_data.get('detail', 'Unknown error')
                print(f"✓ Expected 400 error: {error_detail}")
                if "at least one" in error_detail.lower():
                    print("✓ Error message correctly identifies empty list issue")
                else:
                    print(f"⚠ Error message might not be specific enough: {error_detail}")
            except:
                print(f"✓ Expected 400 error: {response.text}")
        else:
            print(f"✗ Expected 400 but got {response.status_code}")
            try:
                error_data = response.json()
                print(f"Response: {error_data}")
            except:
                print(f"Response: {response.text}")
    except Exception as e:
        print(f"✗ Request failed: {str(e)}")
    
    # Test 4: Invalid fund ID in valuations
    print("\n4. Testing invalid fund ID in valuations...")
    try:
        response = requests.post(f"{BASE_URL}/portfolio_funds/multiple/irr", json={
            "portfolio_fund_ids": [206],
            "valuation_date": "2024-12-31",
            "fund_valuations": {"invalid_id": 10000.0}  # Invalid fund ID
        })
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            try:
                error_data = response.json()
                error_detail = error_data.get('detail', 'Unknown error')
                print(f"✓ Expected 400 error: {error_detail}")
                if "invalid" in error_detail.lower() or "integer" in error_detail.lower():
                    print("✓ Error message correctly identifies invalid fund ID")
                else:
                    print(f"⚠ Error message might not be specific enough: {error_detail}")
            except:
                print(f"✓ Expected 400 error: {response.text}")
        else:
            print(f"✗ Expected 400 but got {response.status_code}")
            try:
                error_data = response.json()
                print(f"Response: {error_data}")
            except:
                print(f"Response: {response.text}")
    except Exception as e:
        print(f"✗ Request failed: {str(e)}")
    
    # Test 5: Non-existent funds in multiple fund request
    print("\n5. Testing non-existent funds in multiple fund request...")
    try:
        response = requests.post(f"{BASE_URL}/portfolio_funds/multiple/irr", json={
            "portfolio_fund_ids": [99998, 99999],
            "valuation_date": "2024-12-31",
            "fund_valuations": {"99998": 10000.0, "99999": 15000.0}
        })
        print(f"Status: {response.status_code}")
        if response.status_code == 404:
            try:
                error_data = response.json()
                error_detail = error_data.get('detail', 'Unknown error')
                print(f"✓ Expected 404 error: {error_detail}")
                if "not found" in error_detail.lower():
                    print("✓ Error message correctly identifies missing funds")
                else:
                    print(f"⚠ Error message might not be specific enough: {error_detail}")
            except:
                print(f"✓ Expected 404 error: {response.text}")
        else:
            print(f"✗ Expected 404 but got {response.status_code}")
            try:
                error_data = response.json()
                print(f"Response: {error_data}")
            except:
                print(f"Response: {response.text}")
    except Exception as e:
        print(f"✗ Request failed: {str(e)}")

def check_server_status():
    """Check if the backend server is running"""
    try:
        response = requests.get(f"{BASE_URL}")
        if response.status_code == 200:
            print("✓ Backend server is running")
            return True
        else:
            print(f"✗ Backend server returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Backend server is not accessible: {str(e)}")
        return False

def main():
    print("Testing New Standardized IRR Endpoints")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Check server status
    if not check_server_status():
        print("Cannot proceed without backend server. Please start the backend first.")
        return
    
    # Get portfolio funds from portfolio 5
    portfolio_id = 5
    portfolio_funds = get_portfolio_funds(portfolio_id)
    
    if not portfolio_funds:
        print(f"No funds found in portfolio {portfolio_id}. Cannot run tests.")
        return
    
    # Extract fund IDs
    fund_ids = [fund['id'] for fund in portfolio_funds]
    print(f"Using fund IDs for testing: {fund_ids}")
    print()
    
    # Test single fund IRR (use first fund)
    test_single_fund_irr(fund_ids[0])
    
    # Test multiple funds IRR
    test_multiple_funds_irr(fund_ids)
    
    # Test error cases
    test_error_cases()
    
    print("=" * 60)
    print("Test Summary")
    print("=" * 60)
    print("✓ Single fund IRR endpoint tested")
    print("✓ Multiple funds IRR endpoint tested")
    print("✓ Error cases tested")
    print()
    print(f"Note: Tests used portfolio {portfolio_id} with {len(fund_ids)} funds")

if __name__ == "__main__":
    main() 