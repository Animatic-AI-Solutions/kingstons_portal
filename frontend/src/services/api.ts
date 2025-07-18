import axios from 'axios';

/**
 * Main API service module
 * 
 * This file configures the application's API client and provides
 * methods for making requests to various backend endpoints.
 * It handles URL formatting, error handling, and request/response interceptors.
 */

// Environment-based API configuration
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

/**
 * Request Interceptor
 * 
 * Intercepts all outgoing requests to:
 * 1. Ensure all API URLs have the /api prefix for proper routing
 */
api.interceptors.request.use(
  (config) => {
    // Ensure URL starts with /api prefix (but no duplicates)
    if (config.url && !config.url.startsWith('/api/')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }
    
    // Add logging for fund_valuations requests
    if (config.url && config.url.includes('fund_valuations')) {
      console.log('🔍 API REQUEST: Making request to', config.url);
      console.log('🔍 API REQUEST: Method:', config.method);
      console.log('🔍 API REQUEST: Data:', config.data);
      console.log('🔍 API REQUEST: Headers:', config.headers);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * 
 * Intercepts all incoming responses to:
 * 1. Handle various error types (server errors, network errors, etc.)
 * 2. Provide consistent error handling across the application
 */
api.interceptors.response.use(
  (response) => {
    // Add logging for fund_valuations responses
    if (response.config.url && response.config.url.includes('fund_valuations')) {
      console.log('🔍 API RESPONSE: Success response from', response.config.url);
      console.log('🔍 API RESPONSE: Status:', response.status);
      console.log('🔍 API RESPONSE: Data:', response.data);
    }
    return response;
  },
  (error) => {
    // Add logging for fund_valuations errors
    if (error.config?.url && error.config.url.includes('fund_valuations')) {
      console.error('🔍 API ERROR: Error response from', error.config.url);
      console.error('🔍 API ERROR: Status:', error.response?.status);
      console.error('🔍 API ERROR: Data:', error.response?.data);
      console.error('🔍 API ERROR: Full error:', error);
    }
    return Promise.reject(error);
  }
);

/**
 * AVAILABLE PORTFOLIOS API ENDPOINTS
 * 
 * Functions for managing portfolio templates
 */

/**
 * Fetches all available portfolio templates
 * @returns {Promise} - API response with portfolio templates
 */
export const getAvailablePortfolios = () => {
  return api.get('available_portfolios');
};

/**
 * Fetches details for a specific portfolio template
 * @param {number} id - Portfolio template ID
 * @returns {Promise} - API response with portfolio template details
 */
export const getAvailablePortfolioDetails = (id: number) => {
  return api.get(`available_portfolios/${id}`);
};

/**
 * Fetches all template portfolio generations that are not inactive
 * @returns {Promise} - API response with active template portfolio generations
 */
export const getActiveTemplatePortfolioGenerations = () => {
  return api.get('available_portfolios/template-portfolio-generations/active');
};

/**
 * Creates a new portfolio template
 * @param {Object} data - Portfolio data
 * @param {string} data.name - Portfolio template name
 * @param {Array} data.funds - Funds to include in the portfolio
 * @param {number} data.funds[].fund_id - Fund ID
 * @param {number} data.funds[].target_weighting - Target allocation percentage
 * @returns {Promise} - API response with created portfolio template
 */
export const createAvailablePortfolio = (data: {
  name: string;
  funds: Array<{
    fund_id: number;
    target_weighting: number;
  }>;
}) => {
  return api.post('available_portfolios', data);
};

/**
 * Creates a portfolio from an existing template
 * @param {Object} data - Template data
 * @param {number} data.template_id - Template ID to use
 * @param {string} data.portfolio_name - Name for the new portfolio
 * @returns {Promise} - API response with created portfolio
 */
export const createPortfolioFromTemplate = (data: {
  template_id: number;
  portfolio_name: string;
}) => {
  return api.post('available_portfolios/from-template', data);
};

/**
 * IRR (INTERNAL RATE OF RETURN) API ENDPOINTS
 * 
 * Functions for managing investment performance calculations
 */

/**
 * Fetches IRR values for a specific portfolio fund
 * @param {number} portfolioFundId - Portfolio-Fund relationship ID
 * @returns {Promise} - API response with IRR values
 */
export const getFundIRRValues = (portfolioFundId: number) => {
  return api.get(`portfolio_funds/${portfolioFundId}/irr-values`);
};

/**
 * Fetches the latest IRR value for a specific portfolio fund
 * @param {number} portfolioFundId - Portfolio-Fund relationship ID
 * @returns {Promise} - API response with the latest IRR value
 */
export const getLatestFundIRR = (portfolioFundId: number) => {
  return api.get(`portfolio_funds/${portfolioFundId}/latest-irr`);
};

/**
 * Fetches the latest IRR values for multiple portfolio funds
 * @param {number[]} fundIds - Array of portfolio fund IDs
 * @returns {Promise} - API response with latest IRR values
 */
export const getLatestFundIRRs = (fundIds: number[]) => {
  const fundIdsString = fundIds.join(',');
  return api.get(`portfolio-funds/latest-irr?fund_ids=${fundIdsString}`);
};

/**
 * Fetches IRR values for multiple funds in batch
 * @param {number[]} fundIds - Array of portfolio fund IDs
 * @returns {Promise} - API response with IRR values grouped by fund ID
 */
export const getBatchFundIRRValues = (fundIds: number[]) => {
  return api.post('portfolio_funds/batch/irr-values', {
    fund_ids: fundIds
  });
};

/**
 * Fetches IRR values for multiple funds filtered by specific month/year
 * @param {number[]} fundIds - Array of portfolio fund IDs
 * @param {number} month - Target month (1-12)
 * @param {number} year - Target year (e.g., 2024)
 * @returns {Promise} - API response with IRR values for the specified date
 */
export const getBatchFundIRRValuesByDate = (fundIds: number[], month: number, year: number) => {
  return api.post('portfolio_funds/batch/irr-values-by-date', {
    fund_ids: fundIds,
    target_month: month,
    target_year: year
  });
};

/**
 * Fetches pre-aggregated IRR history data organized by month/year
 * @param {Object} params - Request parameters
 * @param {number[]} [params.fundIds] - Array of portfolio fund IDs
 * @param {number} [params.portfolioId] - Portfolio ID to filter funds (if fund_ids not provided)
 * @param {boolean} [params.includeFundDetails=true] - Whether to include detailed fund information
 * @param {boolean} [params.includePortfolioIRR=true] - Whether to include portfolio IRR
 * @returns {Promise} - API response with pre-formatted IRR history data
 */
export const getAggregatedIRRHistory = (params: {
  fundIds?: number[];
  portfolioId?: number;
  includeFundDetails?: boolean;
  includePortfolioIRR?: boolean;
}) => {
  const payload: any = {};
  
  if (params.fundIds && params.fundIds.length > 0) {
    payload.fund_ids = params.fundIds;
  }
  
  if (params.portfolioId) {
    payload.portfolio_id = params.portfolioId;
  }
  
  if (params.includeFundDetails !== undefined) {
    payload.include_fund_details = params.includeFundDetails;
  }
  
  if (params.includePortfolioIRR !== undefined) {
    payload.include_portfolio_irr = params.includePortfolioIRR;
  }
  
  return api.post('portfolio_funds/aggregated-irr-history', payload);
};

/**
 * Updates an existing IRR value
 * @param {number} irrValueId - IRR value record ID
 * @param {Object} data - Updated IRR data
 * @param {string} [data.date] - Date of the valuation
 * @param {number} [data.valuation] - New valuation amount
 * @returns {Promise} - API response with updated IRR value
 */
export const updateIRRValue = (irrValueId: number, data: {
  date?: string;
  valuation?: number;
}) => {
  return api.patch(`irr-values/${irrValueId}`, data);
};

/**
 * Deletes an IRR value record
 * @param {number} irrValueId - IRR value record ID to delete
 * @returns {Promise} - API response confirming deletion
 */
export const deleteIRRValue = (irrValueId: number) => {
  return api.delete(`irr-values/${irrValueId}`);
};

/**
 * FUND VALUATIONS API ENDPOINTS
 * 
 * Functions for managing fund valuation data
 */

/**
 * Fetches fund valuations, optionally filtered by portfolio fund
 * @param {number} [portfolioFundId] - Optional portfolio-fund ID filter
 * @returns {Promise} - API response with fund valuations
 */
export const getFundValuations = (portfolioFundId?: number) => {
  const params = portfolioFundId ? { portfolio_fund_id: portfolioFundId } : {};
  return api.get('fund_valuations', { params });
};

/**
 * Fetches the most recent valuation for a portfolio fund
 * @param {number} portfolioFundId - Portfolio-Fund relationship ID
 * @returns {Promise} - API response with latest fund valuation
 */
export const getLatestFundValuation = (portfolioFundId: number) => {
  return api.get(`fund_valuations/latest/${portfolioFundId}`);
};

/**
 * Creates a new fund valuation record
 * @param {Object} data - Valuation data
 * @param {number} data.portfolio_fund_id - Portfolio-Fund relationship ID
 * @param {string} data.valuation_date - Date of the valuation
 * @param {number} data.value - Valuation amount
 * @returns {Promise} - API response with created valuation
 */
export const createFundValuation = (data: {
  portfolio_fund_id: number;
  valuation_date: string;
  valuation: number;
}) => {
  console.log('🔍 API: createFundValuation called with data:', data);
  console.log('🔍 API: Making POST request to fund_valuations endpoint');
  return api.post('fund_valuations', data);
};

/**
 * Updates an existing fund valuation
 * @param {number} valuationId - Valuation record ID
 * @param {Object} data - Updated valuation data
 * @param {number} [data.portfolio_fund_id] - Portfolio-Fund relationship ID
 * @param {string} [data.valuation_date] - Date of the valuation
 * @param {number} [data.value] - New valuation amount
 * @returns {Promise} - API response with updated valuation
 */
export const updateFundValuation = (valuationId: number, data: {
  portfolio_fund_id?: number;
  valuation_date?: string;
  valuation?: number;
}) => {
  return api.patch(`fund_valuations/${valuationId}`, data);
};

/**
 * Deletes a fund valuation record
 * @param {number} valuationId - Valuation record ID to delete
 * @returns {Promise} - API response confirming deletion
 */
export const deleteFundValuation = (valuationId: number) => {
  return api.delete(`fund_valuations/${valuationId}`);
};

/**
 * Calculate IRRs for all portfolio funds in a portfolio
 * @param {number} portfolioId - Portfolio ID
 * @returns {Promise} - API response with calculation results
 */
export const calculatePortfolioIRR = (portfolioId: number) => {
  console.log(`🔍 DEBUG: API calling POST portfolios/${portfolioId}/calculate-irr`);
  return api.post(`portfolios/${portfolioId}/calculate-irr`);
};

/**
 * Get the latest stored portfolio IRR value
 * @param {number} portfolioId - Portfolio ID
 * @returns {Promise} - API response with the latest portfolio IRR
 */
export const getLatestPortfolioIRR = (portfolioId: number) => {
  return api.get(`portfolios/${portfolioId}/latest-irr`);
};

/**
 * Calculate IRRs for all portfolio funds in a portfolio for a specific date
 * @param {number} portfolioId - Portfolio ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise} - API response with calculation results
 */
export const calculatePortfolioIRRForDate = (portfolioId: number, date: string) => {
  return api.post(`portfolios/${portfolioId}/calculate-irr-for-date?date=${encodeURIComponent(date)}`);
};

/**
 * Calculate total IRR across all active funds in a portfolio for a specific year
 * @param {number} portfolioId - Portfolio ID
 * @param {number} year - Year for which to calculate the IRR
 * @returns {Promise} - API response with the total IRR calculation result
 */
export const calculatePortfolioTotalIRR = (portfolioId: number, year: number) => {
  return api.post(`portfolios/${portfolioId}/calculate-total-irr?year=${year}`);
};

/**
 * PROVIDER API ENDPOINTS
 * 
 * Functions for managing provider data
 */

/**
 * Fetches all providers with their theme colors
 * @returns {Promise} - API response with providers and theme colors
 */
export const getProviderThemeColors = async () => {
  try {
    // Use the /api/available_providers endpoint which we know is working
    const response = await axios({
      method: 'get',
      url: `${getApiBaseUrl()}/api/available_providers`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    // Define provider type
    interface Provider {
      id: number;
      name: string;
      theme_color?: string;
      status?: string;
      created_at?: string;
    }
    
    // Map the response to match the expected format from the theme-colors endpoint
    const providers = response.data as Provider[];
    const themeColors = providers.map((provider: Provider) => ({
      id: provider.id,
      name: provider.name,
      theme_color: provider.theme_color
    }));
    
    // Return in the same format expected from the original endpoint
    return {
      data: themeColors
    };
  } catch (error) {
    console.error('Error fetching provider colors:', error);
    throw error;
  }
};

/**
 * Initializes provider theme colors for any providers that don't have one set
 * @returns {Promise} - API response with update results
 */
export const initializeProviderThemeColors = () => {
  // Use axios directly without any interceptors
  return axios({
    method: 'post',
    url: `${getApiBaseUrl()}/api/available_providers/update-theme-colors`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    withCredentials: true // Include credentials if your API requires authentication
  });
};

/**
 * Fetches all available colors that are not already used by existing providers
 * @returns {Promise} - API response with available colors
 */
export const getAvailableColors = () => {
  return api.get('available_providers/available-colors');
};

/**
 * PORTFOLIO API ENDPOINTS
 * 
 * Functions for managing portfolio data
 */

/**
 * Fetches all portfolios with template information
 * @param {Object} params - Optional query parameters
 * @param {number} [params.skip] - Number of records to skip for pagination
 * @param {number} [params.limit] - Maximum number of records to return
 * @param {string} [params.status] - Filter by portfolio status
 * @returns {Promise} - API response with portfolios including template info
 */
export const getPortfoliosWithTemplate = (params?: {
  skip?: number;
  limit?: number;
  status?: string;
}) => {
  return api.get('portfolios/with-template', { params });
};

/**
 * Fetches a single portfolio with template information
 * @param {number} portfolioId - Portfolio ID
 * @returns {Promise} - API response with portfolio including template info
 */
export const getPortfolioWithTemplate = (portfolioId: number) => {
  return api.get(`portfolios/${portfolioId}`);
};

/**
 * Fetches fund under management summary for all client groups
 * @returns {Promise} - API response with client group FUM data
 */
export const getClientGroupFUMSummary = () => {
  return api.get('client_group_fum_summary');
};

/**
 * Fetches all client groups with complete data and FUM calculations in one optimized call
 * @returns {Promise} - API response with client groups including products, FUM, and metadata
 */
export const getBulkClientData = () => {
  return api.get('bulk_client_data');
};

/**
 * Fetches fund under management summary for a specific client group
 * @param {number} clientGroupId - Client group ID
 * @returns {Promise} - API response with client group FUM data
 */
export const getClientGroupFUMById = (clientGroupId: number) => {
  return api.get(`client_group_fum_summary/${clientGroupId}`);
};

/**
 * Fetches weighted IRR calculation for a specific client group
 * @param {number} clientGroupId - Client group ID
 * @returns {Promise} - API response with client group IRR data
 */
export const getClientGroupIRR = (clientGroupId: number) => {
  return api.get(`client_groups/${clientGroupId}/irr`);
};

// Add new standardized client IRR function
export const getStandardizedClientIRR = (clientId: number) => {
  return api.get(`analytics/client/${clientId}/irr`);
};

/**
 * Fetches funds under management for a specific product
 * @param {number} productId - Product ID
 * @returns {Promise} - API response with product FUM data
 */
export const getProductFUM = (productId: number) => {
  return api.get(`client_products/${productId}/fum`);
};

/**
 * Fetches weighted IRR calculation for a specific product
 * @param {number} productId - Product ID
 * @returns {Promise} - API response with product IRR data
 */
export const getProductIRR = (productId: number) => {
  return api.get(`client_products/${productId}/irr`);
};

/**
 * Lapses a product by changing its status to inactive when total value is zero
 * @param {number} productId - Product ID to lapse
 * @returns {Promise} - API response with updated product
 */
export const lapseProduct = (productId: number) => {
  return api.patch(`client_products/${productId}/lapse`);
};

/**
 * Reactivates a lapsed product by changing its status from inactive to active
 * @param {number} productId - Product ID to reactivate
 * @returns {Promise} - API response with updated product
 */
export const reactivateProduct = (productId: number) => {
  return api.patch(`client_products/${productId}/reactivate`);
};

/**
 * Calculates standardized IRR for multiple portfolio funds using the new standardized endpoint
 * @param {Object} params - IRR calculation parameters
 * @param {number[]} params.portfolioFundIds - Array of portfolio fund IDs
 * @param {string} params.irrDate - Date for the IRR calculation (YYYY-MM-DD format)
 * @returns {Promise} - API response with standardized IRR calculation
 */
export const calculateStandardizedMultipleFundsIRR = (params: {
  portfolioFundIds: number[];
  irrDate?: string;
}) => {
  console.log('🔍 DEBUG: api.ts calculateStandardizedMultipleFundsIRR called with:', params);
  console.log('🔍 DEBUG: portfolioFundIds being sent to backend:', params.portfolioFundIds);
  
  return api.post('portfolio_funds/multiple/irr', {
    portfolio_fund_ids: params.portfolioFundIds,
    irr_date: params.irrDate || null
  });
};

/**
 * Calculates standardized IRR for a single portfolio fund using the new standardized endpoint
 * @param {Object} params - IRR calculation parameters
 * @param {number} params.portfolioFundId - Portfolio fund ID
 * @param {string} params.irrDate - Date for the IRR calculation (YYYY-MM-DD format)
 * @returns {Promise} - API response with standardized IRR calculation
 */
export const calculateStandardizedSingleFundIRR = (params: {
  portfolioFundId: number;
  irrDate?: string;
}) => {
  return api.post(`portfolio_funds/${params.portfolioFundId}/irr`, {
    irr_date: params.irrDate || null
  });
};

/**
 * Creates a new IRR value record in the database
 * @param {Object} params - IRR value data
 * @param {number} params.fundId - Portfolio fund ID
 * @param {number} params.irrResult - IRR result as percentage (e.g., 5.25 for 5.25%)
 * @param {string} params.date - Date for the IRR calculation (YYYY-MM-DD format)
 * @param {number} [params.fundValuationId] - Optional fund valuation ID reference
 * @returns {Promise} - API response with created/updated IRR value
 */
export const createIRRValue = (params: {
  fundId: number;
  irrResult: number;
  date: string;
  fundValuationId?: number;
}) => {
  return api.post('irr-values', {
    fund_id: params.fundId,
    irr_result: params.irrResult,
    date: params.date,
    fund_valuation_id: params.fundValuationId || null
  });
};

/**
 * FUND API ENDPOINTS
 */

/**
 * Fetches all products and their owners that use a specific fund
 * @param {number} fundId - Fund ID to get products for
 * @returns {Promise} - API response with products and their owners
 */
export const getFundProductsWithOwners = (fundId: number) => {
  return api.get(`funds/${fundId}/products-with-owners`);
};

/**
 * CLIENT GROUPS API ENDPOINTS
 * 
 * Functions for managing client groups
 */

/**
 * Fetches all client groups
 * @param {Object} params - Query parameters
 * @param {number} [params.skip] - Number of records to skip for pagination
 * @param {number} [params.limit] - Max number of records to return
 * @param {string} [params.status] - Filter by status
 * @param {string} [params.search] - Search by name, email, account number
 * @returns {Promise} - API response with client groups
 */
export const getClientGroups = (params?: {
  skip?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);
  
  const queryString = queryParams.toString();
  return api.get(`client_groups${queryString ? `?${queryString}` : ''}`);
};

/**
 * CLIENT PRODUCTS API ENDPOINTS
 * 
 * Functions for managing client products
 */

/**
 * Fetches client products, optionally filtered by client group or provider
 * @param {Object} params - Query parameters
 * @param {number} [params.client_id] - Filter by client group ID
 * @param {number} [params.provider_id] - Filter by provider ID
 * @param {number} [params.skip] - Number of records to skip for pagination
 * @param {number} [params.limit] - Max number of records to return
 * @param {string} [params.status] - Filter by status
 * @returns {Promise} - API response with client products
 */
export const getClientProducts = (params?: {
  client_id?: number;
  provider_id?: number;
  skip?: number;
  limit?: number;
  status?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.client_id !== undefined) queryParams.append('client_id', params.client_id.toString());
  if (params?.provider_id !== undefined) queryParams.append('provider_id', params.provider_id.toString());
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  
  const queryString = queryParams.toString();
  return api.get(`client_products${queryString ? `?${queryString}` : ''}`);
};

/**
 * PORTFOLIO FUNDS API ENDPOINTS
 * 
 * Functions for managing portfolio funds by product
 */

/**
 * Fetches portfolio funds for a specific product
 * @param {number} productId - Product ID
 * @returns {Promise} - API response with portfolio funds
 */
export const getPortfolioFundsByProduct = (productId: number) => {
  return api.get(`client_products/${productId}/complete`);
};

/**
 * GLOBAL SEARCH API ENDPOINTS
 * 
 * Functions for searching across all entities in the system
 */

/**
 * Performs a global search across all entities (client groups, products, funds, providers, portfolios)
 * @param {string} query - Search query string
 * @param {number} limit - Maximum number of results to return (default: 20)
 * @returns {Promise} - API response with search results
 */
export const globalSearch = async (query: string) => {
  const encodedQuery = encodeURIComponent(query);
  return api.get(`/search?query=${encodedQuery}`);
};

export const getRiskDifferences = async (limit: number = 10) => {
  return api.get(`/analytics/risk_differences?limit=${limit}`);
};

// Activity API functions
export const createActivity = async (activityData: {
  product_id: number;
  portfolio_fund_id: number;
  activity_timestamp: string;
  activity_type: string;
  amount: number;
}) => {
  const response = await api.post('/activities', activityData);
  return response.data;
};

// Product Owners API endpoints
export const getProductOwners = async () => {
  return api.get('product_owners');
};

export const getClientGroupProductOwners = async (clientGroupId: number) => {
  return api.get(`client_group_product_owners?client_group_id=${clientGroupId}`);
};

export const addClientGroupProductOwner = async (clientGroupId: number, productOwnerId: number) => {
  return api.post('client_group_product_owners', {
    client_group_id: clientGroupId,
    product_owner_id: productOwnerId
  });
};

export const removeClientGroupProductOwner = async (associationId: number) => {
  return api.delete(`client_group_product_owners/${associationId}`);
};

export const getProductOwnersForProducts = async (clientId: number) => {
  // Get all client products with their associated product owners
  const associations = await api.get(`client_products_with_owners?client_id=${clientId}`);
  return associations;
};

/**
 * REVENUE ANALYTICS API ENDPOINTS
 * 
 * Functions for managing company revenue analytics
 */

/**
 * Fetches company-wide revenue analytics from the database view
 * @returns {Promise} - API response with total revenue, active products, etc.
 */
export const getCompanyRevenueAnalytics = async () => {
  return api.get('company-revenue-analytics');
};

/**
 * Fetches revenue breakdown by client groups
 * @returns {Promise} - API response with client group revenue data
 */
export const getClientGroupRevenueBreakdown = async () => {
  return api.get('client-groups/revenue-breakdown');
};

export const getRevenueRateAnalytics = async () => {
  return api.get('revenue-rate-analytics');
};

export const refreshRevenueRateCache = async () => {
  return api.post('revenue-rate-analytics/refresh');
};

// ⚡ PHASE 1 OPTIMIZATION: Analytics Dashboard Service
export const getOptimizedAnalyticsDashboard = async (
  fundLimit: number = 10,
  providerLimit: number = 10,
  templateLimit: number = 10
) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Phase 1: Fetching optimized analytics dashboard...');
    
    // Single aggregated call using database views
    const response = await api.get('/analytics/dashboard-fast', {
      params: { 
        fund_limit: fundLimit, 
        provider_limit: providerLimit, 
        template_limit: templateLimit 
      }
    });

    const endTime = Date.now();
    const loadTime = (endTime - startTime) / 1000;
    
    console.log(`✅ Phase 1 optimization completed in ${loadTime.toFixed(2)}s`);
    console.log('📊 Optimized data structure:', {
      metrics: response.data.metrics,
      distributions: {
        funds: response.data.distributions?.funds?.length || 0,
        providers: response.data.distributions?.providers?.length || 0,
        templates: response.data.distributions?.templates?.length || 0
      },
      performance: {
        topPerformers: response.data.performance?.topPerformers?.length || 0,
        clientRisks: response.data.performance?.clientRisks?.length || 0
      },
      revenue: response.data.revenue ? 'Available' : 'Not Available',
      optimized: response.data.optimized,
      phase: response.data.phase
    });

    return {
      data: response.data,
      loadTime,
      optimized: true
    };
  } catch (error) {
    const endTime = Date.now();
    const loadTime = (endTime - startTime) / 1000;
    
    console.error(`❌ Phase 1 optimization failed after ${loadTime.toFixed(2)}s:`, error);
    throw error;
  }
};

// Fallback function for original analytics endpoints
export const getFallbackAnalyticsDashboard = async (
  fundLimit: number = 10,
  providerLimit: number = 10,
  templateLimit: number = 10
) => {
  console.log('🔄 Using fallback analytics endpoints...');
  
  const [
    dashboardResponse,
    performanceResponse,
    clientRisksResponse
  ] = await Promise.all([
    api.get('/analytics/dashboard_all', {
      params: { fund_limit: fundLimit, provider_limit: providerLimit, template_limit: templateLimit }
    }),
    api.get('/analytics/performance_data', {
      params: { entity_type: 'overview', sort_order: 'highest', limit: 10 }
    }).catch(err => {
      console.warn('Performance data failed, continuing without it:', err);
      return { data: { performanceData: [] } };
    }),
    api.get('/analytics/client_risks')
  ]);

  return {
    data: {
      metrics: dashboardResponse.data.metrics,
      distributions: {
        funds: dashboardResponse.data.funds || [],
        providers: dashboardResponse.data.providers || [],
        templates: dashboardResponse.data.templates || []
      },
      performance: {
        topPerformers: performanceResponse.data.performanceData || [],
        clientRisks: clientRisksResponse.data || []
      },
      revenue: null,
      optimized: false,
      phase: 'Fallback - Original Endpoints'
    },
    loadTime: 0,
    optimized: false
  };
};

export default api; 