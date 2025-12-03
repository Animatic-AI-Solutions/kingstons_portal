"""
Quick test script to verify product owner API accepts all 25 fields
Run this after starting the backend server:
  python test_product_owner_api.py
"""

import requests
import json

# Test data matching frontend form structure
test_product_owner = {
    # Required fields
    "status": "active",
    "firstname": "John",
    "surname": "Smith",

    # Optional fields (as sent by frontend)
    "known_as": "",
    "title": "",
    "middle_names": "",
    "relationship_status": "",
    "gender": "",
    "previous_names": "",
    "dob": "",  # Empty string, not null
    "place_of_birth": "",
    "email_1": "",
    "email_2": "",
    "phone_1": "",
    "phone_2": "",
    "moved_in_date": "",
    "address_id": None,
    "three_words": "",
    "share_data_with": "",
    "employment_status": "",
    "occupation": "",
    "passport_expiry_date": "",
    "ni_number": "",
    "aml_result": "",
    "aml_date": ""
}

def test_create_product_owner():
    """Test creating a product owner with minimal required fields"""
    url = "http://localhost:8001/api/product-owners"

    print(f"Testing POST {url}")
    print(f"Data: {json.dumps(test_product_owner, indent=2)}")

    try:
        response = requests.post(url, json=test_product_owner)

        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 201:
            print("✅ SUCCESS! Product owner created")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            return True
        else:
            print(f"❌ FAILED with status {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to backend. Is it running on port 8001?")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False


def test_with_dates():
    """Test creating a product owner with date fields"""
    test_data = test_product_owner.copy()
    test_data.update({
        "firstname": "Jane",
        "surname": "Doe",
        "dob": "1985-03-15",
        "email_1": "jane@example.com",
        "phone_1": "+44 7700 900000",
        "moved_in_date": "2010-06-01",
        "aml_date": "2024-01-15"
    })

    url = "http://localhost:8001/api/product-owners"

    print(f"\n\nTesting POST {url} with dates")
    print(f"Data: {json.dumps(test_data, indent=2)}")

    try:
        response = requests.post(url, json=test_data)

        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 201:
            print("✅ SUCCESS! Product owner with dates created")
            print(f"Response: {json.dumps(response.json(), indent=2, default=str)}")
            return True
        else:
            print(f"❌ FAILED with status {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Product Owner API Test")
    print("=" * 60)

    # Test 1: Minimal required fields
    result1 = test_create_product_owner()

    # Test 2: With dates
    result2 = test_with_dates()

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"Test 1 (minimal fields): {'✅ PASS' if result1 else '❌ FAIL'}")
    print(f"Test 2 (with dates):     {'✅ PASS' if result2 else '❌ FAIL'}")

    if result1 and result2:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Some tests failed. Check backend logs for details.")
