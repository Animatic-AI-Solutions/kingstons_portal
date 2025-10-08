// Debug script to test historical IRR endpoint
// Run this in the browser console to test the endpoint

const testHistoricalIRR = async (productId = 160) => {
  try {
    console.log(`🔍 Testing historical IRR endpoint for product ${productId}`);
    
    const url = `/api/historical-irr/combined/${productId}?limit=100000`;
    console.log(`📡 URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`, [...response.headers.entries()]);
    
    const contentType = response.headers.get('content-type');
    console.log(`📊 Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`✅ Success! Data received:`, data);
      return data;
    } else {
      const text = await response.text();
      console.log(`❌ Non-JSON response:`, text.substring(0, 500));
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Error testing endpoint:`, error);
    return null;
  }
};

// Test the endpoint
testHistoricalIRR();

// Also test if backend is accessible at all
const testBackendHealth = async () => {
  try {
    console.log(`🔍 Testing backend health`);
    
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📊 Health check status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Backend is healthy:`, data);
      return true;
    } else {
      console.log(`❌ Backend health check failed`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Backend health check error:`, error);
    return false;
  }
};

// Test backend health
testBackendHealth();

console.log(`
🔧 Debug Instructions:
1. Open browser console on the report generator page
2. Run: testHistoricalIRR(160) - replace 160 with your product ID
3. Run: testBackendHealth() - to check if backend is running
4. Check the console output for detailed information

📋 Expected responses:
- Health check should return 200 with JSON data
- Historical IRR should return 200 with JSON data containing portfolio_historical_irr and funds_historical_irr arrays
- If you get HTML responses, the backend is likely not running or the endpoint doesn't exist
`); 