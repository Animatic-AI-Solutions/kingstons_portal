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

// Global request cache and deduplication
interface CachedRequest {
  promise: Promise<any>;
  timestamp: number;
  data?: any;
}

class IRRHistoryRequestManager {
  private activeRequests = new Map<string, CachedRequest>();
  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  generateRequestKey(request: IRRHistorySummaryRequest): string {
    const productIds = request.product_ids.sort().join(',');
    const dates = request.selected_dates.sort().join(',');
    const clientGroups = request.client_group_ids?.sort().join(',') || 'none';
    return `irr_summary_${productIds}_${dates}_${clientGroups}`;
  }

  async executeRequest(request: IRRHistorySummaryRequest): Promise<any> {
    const requestKey = this.generateRequestKey(request);

    // Check cache first
    if (this.cache.has(requestKey)) {
      const cached = this.cache.get(requestKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      } else {
        this.cache.delete(requestKey);
      }
    }

    // Check if request is already in progress
    if (this.activeRequests.has(requestKey)) {
      const activeRequest = this.activeRequests.get(requestKey)!;
      return activeRequest.promise;
    }

    // Create new request
    const promise = this.performActualRequest(request).then(
      (data) => {
        // Cache successful response
        this.cache.set(requestKey, { data, timestamp: Date.now() });
        this.activeRequests.delete(requestKey);
        return data;
      },
      (error) => {
        // Remove from active requests on error
        this.activeRequests.delete(requestKey);
        console.error('❌ [GLOBAL IRR REQUEST MANAGER] Request failed:', requestKey, error);
        throw error;
      }
    );

    this.activeRequests.set(requestKey, { promise, timestamp: Date.now() });
    return promise;
  }

  private async performActualRequest(request: IRRHistorySummaryRequest): Promise<any> {
    const response = await api.post('/historical-irr/summary', request);
    
    if (response.data && response.data.success) {
      return response.data.data; // Return just the data portion
    } else {
      throw new Error('Invalid response format from IRR history summary API');
    }
  }

  clearCache(): void {
    this.activeRequests.clear();
    this.cache.clear();
  }
}

// Global instance
const requestManager = new IRRHistoryRequestManager();

export class IRRHistorySummaryService {
  private api: any;

  constructor(api: any) {
    this.api = api;
  }

  async getIRRHistorySummary(request: IRRHistorySummaryRequest): Promise<IRRHistorySummaryResponse> {
    try {
      // Use global request manager for deduplication
      const response = await requestManager.executeRequest(request);

      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      console.error('❌ [IRR HISTORY SUMMARY] Failed to fetch IRR history summary:', error);
      throw new Error(error.message || 'Failed to fetch IRR history summary');
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
   * @param formatType - Type of formatting: 'total' for portfolio totals (1 decimal), 'inactive' for inactive products (1 decimal), 'default' for individual products (2 decimals)
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
        // Inactive products: Always show 1 decimal place for consistency (e.g., "3.0%")
        return `${irrValue.toFixed(1)}%`;
        
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