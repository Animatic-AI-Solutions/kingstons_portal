import requests
import json

def test_db_view(view_name, description):
    """Test if a database view exists by querying it through a direct API call"""
    try:
        print(f"\nTesting {description}:")
        
        # We'll test this by making a request that should use the view
        # First let's just check if we can query the view directly
        # Since we're using Supabase, we should test through our endpoint
        
        if view_name == "client_group_complete_data":
            # Test the view that should be used by our bulk endpoint
            response = requests.get("http://localhost:8000/api/client_groups/20")
            if response.status_code == 200:
                client_data = response.json()
                print(f"Client exists: {client_data['name']}")
                print("✅ Basic client query works")
            else:
                print("❌ Basic client query failed")
                return
                
        print(f"View name: {view_name}")
        print("Status: Checking if view exists...")
        
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")

# Let's check what's happening in the backend logs by creating our own debug endpoint
def test_debug_endpoint():
    try:
        print(f"\nTesting debug information:")
        # Let's try to hit the endpoint and see what happens
        response = requests.get("http://localhost:8000/api/client_groups/20/complete", timeout=30)
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"Exception: {str(e)}")

# Test views
test_db_view("client_group_complete_data", "Client Group Complete Data View")
test_db_view("complete_fund_data", "Complete Fund Data View") 
test_db_view("fund_activity_summary", "Fund Activity Summary View")

# Test our endpoint again with more details
test_debug_endpoint()

print("\n" + "="*50)
print("DEBUG TEST COMPLETE")
print("="*50) 