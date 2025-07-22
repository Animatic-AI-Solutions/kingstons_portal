import axios from 'axios';

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

// Create axios instance with environment-appropriate baseURL
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to ensure API prefix
api.interceptors.request.use(
  (config) => {
    if (config.url && !config.url.startsWith('/api/')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Types for IRR History Summary
export interface IRRHistorySummaryRequest {
  product_ids: number[];
  selected_dates: string[]; // YYYY-MM-DD format
  client_group_ids?: number[];
}

export interface ProductIRRData {
  date: string;
  irr_value: number | null;
}

export interface ProductIRRHistory {
  product_id: number;
  product_name: string;
  provider_name: string;
  provider_theme_color: string;
  status: string; // Product status (active, inactive, lapsed, etc.)
  irr_data: ProductIRRData[];
}

export interface PortfolioIRRHistory {
  date: string;
  portfolio_irr: number | null;
}

export interface IRRHistorySummaryResponse {
  success: boolean;
  data: {
    product_irr_history: ProductIRRHistory[];
    portfolio_irr_history: PortfolioIRRHistory[];
  };
}

/**
 * Service for managing IRR History Summary API calls
 */
export class IRRHistorySummaryService {
  /**
   * Fetch IRR history summary data for multiple products across selected dates
   */
  static async getIRRHistorySummary(
    request: IRRHistorySummaryRequest
  ): Promise<IRRHistorySummaryResponse> {
    try {
      console.log('🔍 [IRR HISTORY SUMMARY] Fetching data with request:', request);
      
      const response = await api.post('/historical-irr/summary', request);
      
      if (response.data && response.data.success) {
        console.log('✅ [IRR HISTORY SUMMARY] Data fetched successfully:', response.data);
        return response.data;
      } else {
        throw new Error('Invalid response format from IRR history summary API');
      }
    } catch (error: any) {
      console.error('❌ [IRR HISTORY SUMMARY] Error fetching data:', error);
      throw new Error(
        error.response?.data?.detail || 
        error.message || 
        'Failed to fetch IRR history summary data'
      );
    }
  }

  /**
   * Format date for display in table headers
   */
  static formatDateForDisplay(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Format IRR value for display with different precision based on context
   * @param irrValue - The IRR value to format
   * @param formatType - Type of formatting: 'total' for portfolio totals, 'inactive' for inactive products, 'default' for individual products
   */
  static formatIRRValue(irrValue: number | null, formatType: 'total' | 'inactive' | 'default' = 'default'): string {
    if (irrValue === null || irrValue === undefined) {
      return '-';
    }
    
    switch (formatType) {
      case 'total':
        // Portfolio totals: 1 decimal place (e.g., "10.3%")
        return `${irrValue.toFixed(1)}%`;
        
      case 'inactive':
        // Inactive products: 0 decimal places if whole number, 1 decimal place otherwise
        // Use the same smart logic as ReportGenerator.tsx formatRiskFallback
        const rounded = Math.round(irrValue * 10) / 10;
        return `${rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1)}%`;
        
      case 'default':
      default:
        // Individual products: 2 decimal places (existing behavior)
        return `${irrValue.toFixed(2)}%`;
    }
  }

  /**
   * Get product display name with provider
   */
  static getProductDisplayName(product: ProductIRRHistory): string {
    return product.provider_name 
      ? `${product.product_name} - ${product.provider_name}`
      : product.product_name;
  }
}

export default IRRHistorySummaryService; 