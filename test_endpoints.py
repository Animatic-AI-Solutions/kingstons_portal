import requests
import json

def test_endpoint(url, description):
    try:
        print(f"\nTesting {description}:")
        print(f"URL: {url}")
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS")
            if isinstance(data, dict):
                print(f"Response keys: {list(data.keys())}")
            elif isinstance(data, list):
                print(f"Response length: {len(data)}")
        else:
            print("❌ FAILED")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")

# Test basic client group endpoint
test_endpoint("http://localhost:8000/api/client_groups/20", "Basic Client Group #20")

# Test all client groups
test_endpoint("http://localhost:8000/api/client_groups", "All Client Groups")

# Test the new bulk endpoint
test_endpoint("http://localhost:8000/api/client_groups/20/complete", "Bulk Endpoint for Client #20")

# Test with a different client ID that might exist
test_endpoint("http://localhost:8000/api/client_groups/1/complete", "Bulk Endpoint for Client #1")

# Test database views directly through an endpoint that should work
test_endpoint("http://localhost:8000/api/analytics/dashboard_all", "Dashboard (working endpoint)")

print("\n" + "="*50)
print("TEST SUMMARY COMPLETE")
print("="*50) 