interface HistoricalIRRRecord {
  irr_id: number;
  irr_result: number | null;
  irr_date: string;
  fund_valuation_id?: number;
  portfolio_valuation_id?: number;
}

interface PortfolioHistoricalIRR {
  irr_id: number;
  portfolio_id: number;
  irr_result: number | null;
  irr_date: string;
  portfolio_valuation_id: number | null;
  portfolio_name: string;
  product_name: string;
  provider_name: string;
}

interface FundHistoricalIRR {
  portfolio_fund_id: number;
  fund_name: string;
  isin_number: string | null;
  risk_factor: number | null;
  fund_status: string;
  target_weighting: number | null;
  historical_irr: HistoricalIRRRecord[];
}

interface PortfolioHistoricalIRRResponse {
  product_id: number;
  portfolio_historical_irr: PortfolioHistoricalIRR[];
  count: number;
}

interface FundsHistoricalIRRResponse {
  product_id: number;
  funds_historical_irr: FundHistoricalIRR[];
  total_funds: number;
  total_records: number;
}

interface CombinedHistoricalIRRResponse {
  product_id: number;
  portfolio_historical_irr: PortfolioHistoricalIRR[];
  funds_historical_irr: FundHistoricalIRR[];
  portfolio_count: number;
  funds_count: number;
  total_fund_records: number;
}

class HistoricalIRRService {
  private baseUrl: string;

  constructor() {
    // Environment-based API configuration (same as api.ts)
    const getApiBaseUrl = () => {
      // Check if we're in development mode (localhost or Vite dev server)
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.port === '3000';
      
      // In development (Vite dev server), use proxy (empty baseURL)
      if (isDevelopment) {
        return '';  // Vite proxy handles /api requests
      }
      
      // In production (built app), use direct API server
      return 'http://intranet.kingston.local:8001';
    };

    this.baseUrl = getApiBaseUrl();
  }

  /**
   * Fetch historical IRR data for a specific product's portfolio
   * @param productId - The product ID
   * @param limit - Maximum number of historical records to return (default: 12)
   */
  async getPortfolioHistoricalIRR(productId: number, limit: number = 12): Promise<PortfolioHistoricalIRRResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/historical-irr/portfolio/${productId}?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 Portfolio historical IRR fetched for product ${productId}:`, data);
      return data;
    } catch (error) {
      console.error(`Error fetching portfolio historical IRR for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch historical IRR data for all funds within a specific product
   * @param productId - The product ID
   * @param limit - Maximum number of historical records per fund (default: 12)
   */
  async getFundsHistoricalIRR(productId: number, limit: number = 12): Promise<FundsHistoricalIRRResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/historical-irr/funds/${productId}?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 Funds historical IRR fetched for product ${productId}:`, data);
      return data;
    } catch (error) {
      console.error(`Error fetching funds historical IRR for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch both portfolio and fund historical IRR data for a product
   * @param productId - The product ID
   * @param limit - Maximum number of historical records (default: 12)
   */
  async getCombinedHistoricalIRR(productId: number, limit: number = 12): Promise<CombinedHistoricalIRRResponse> {
    try {
      const url = `${this.baseUrl}/api/historical-irr/combined/${productId}?limit=${limit}`;
      console.log(`📊 Attempting to fetch combined historical IRR from: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      console.log(`📊 Response status: ${response.status}, Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('text/html')) {
        console.warn(`⚠️ Received HTML response instead of JSON for product ${productId}. This likely means the backend endpoint is not available.`);
        
        // Try to get the HTML content for debugging
        const htmlContent = await response.text();
        console.error(`📋 HTML Response content (first 200 chars): ${htmlContent.substring(0, 200)}`);
        
        // Return empty response as fallback
        return {
          product_id: productId,
          portfolio_historical_irr: [],
          funds_historical_irr: [],
          portfolio_count: 0,
          funds_count: 0,
          total_fund_records: 0
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP error ${response.status}: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Combined historical IRR fetched successfully for product ${productId}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Error fetching combined historical IRR for product ${productId}:`, error);
      
      // Check if it's a JSON parsing error (common when receiving HTML)
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        console.warn(`⚠️ JSON parsing error for product ${productId} - likely received HTML instead of JSON. Returning empty response.`);
        
        // Return empty response as fallback
        return {
          product_id: productId,
          portfolio_historical_irr: [],
          funds_historical_irr: [],
          portfolio_count: 0,
          funds_count: 0,
          total_fund_records: 0
        };
      }
      
      throw error;
    }
  }

  /**
   * Format IRR value for display
   * @param irr - The IRR value to format
   * @param precision - Number of decimal places (default: 1)
   */
  formatIRR(irr: number | null, precision: number = 1): string {
    if (irr === null || irr === undefined) return '-';
    return `${irr.toFixed(precision)}%`;
  }

  /**
   * Format date for display
   * @param dateString - The date string to format
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short'
      });
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return dateString;
    }
  }

  /**
   * Get the latest IRR from historical data
   * @param historicalData - Array of historical IRR records
   */
  getLatestIRR(historicalData: HistoricalIRRRecord[]): number | null {
    if (!historicalData || historicalData.length === 0) return null;
    
    // Data should already be sorted by date DESC from the API
    return historicalData[0]?.irr_result || null;
  }

  /**
   * Get IRR trend (positive, negative, or neutral)
   * @param historicalData - Array of historical IRR records (sorted by date DESC)
   */
  getIRRTrend(historicalData: HistoricalIRRRecord[]): 'up' | 'down' | 'neutral' {
    if (!historicalData || historicalData.length < 2) return 'neutral';
    
    const latest = historicalData[0]?.irr_result;
    const previous = historicalData[1]?.irr_result;
    
    if (latest === null || previous === null) return 'neutral';
    
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'neutral';
  }
}

// Create and export a singleton instance
const historicalIRRService = new HistoricalIRRService();
export default historicalIRRService;

// Export types for use in components
export type {
  HistoricalIRRRecord,
  PortfolioHistoricalIRR,
  FundHistoricalIRR,
  PortfolioHistoricalIRRResponse,
  FundsHistoricalIRRResponse,
  CombinedHistoricalIRRResponse
}; 