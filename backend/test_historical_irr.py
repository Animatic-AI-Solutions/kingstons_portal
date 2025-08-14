import requests
import json

def test_historical_irr_endpoint():
    """Test the new historical IRR endpoint with real portfolio fund IDs from client group 52"""
    url = "http://localhost:8001/api/portfolio_funds/multiple/historical_irr"
    
    # Use actual portfolio fund IDs from client group 52 (McKie, Jayne)
    # These are from portfolio 160 (AJ Bell - JISA - Archie)
    portfolio_fund_ids = [894, 895, 896, 897, 898, 899, 900, 901, 902, 903]
    
    # Test data with the specific historical dates requested
    test_data = {
        "portfolio_fund_ids": portfolio_fund_ids,
        "historical_dates": [
            "2021-08-31",  # August 2021
            "2022-08-31",  # August 2022  
            "2024-08-31"   # August 2024
        ]
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print("🔄 Testing new historical IRR endpoint...")
        print(f"URL: {url}")
        print(f"Portfolio Fund IDs: {test_data['portfolio_fund_ids']}")
        print(f"Historical Dates: {test_data['historical_dates']}")
        
        response = requests.post(url, json=test_data, headers=headers)
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Endpoint is working correctly!")
            print(f"\n🔍 Debug - Raw Response Structure:")
            print(json.dumps(result, indent=2, default=str))
            
            # Check if response has the expected structure
            if isinstance(result, dict):
                if 'success' in result:
                    print(f"\n📊 Success: {result.get('success')}")
                    if 'historical_irr_results' in result:
                        print("\n📈 Historical IRR Results:")
                        for date, irr_data in result['historical_irr_results'].items():
                            print(f"\n📅 {date}:")
                            print(f"   IRR: {irr_data.get('irr', 'N/A')}%")
                            print(f"   Total Investment: ${irr_data.get('total_investment', 0):,.2f}")
                            print(f"   Total Valuation: ${irr_data.get('total_valuation', 0):,.2f}")
                            print(f"   Fund Count: {irr_data.get('fund_count', 0)}")
                else:
                    # Direct date results format
                    print("\n📈 Historical IRR Results:")
                    for date, irr_data in result.items():
                        if isinstance(irr_data, dict):
                            print(f"\n📅 {date}:")
                            print(f"   IRR: {irr_data.get('irr', 'N/A')}%")
                            print(f"   Total Investment: ${irr_data.get('total_investment', 0):,.2f}")
                            print(f"   Total Valuation: ${irr_data.get('total_valuation', 0):,.2f}")
                            print(f"   Fund Count: {irr_data.get('fund_count', 0)}")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_historical_irr_endpoint()
