import axios from 'axios';

/**
 * Main API service module
 * 
 * This file configures the application's API client and provides
 * methods for making requests to various backend endpoints.
 * It handles URL formatting, error handling, and request/response interceptors.
 */

// Create axios instance with the correct baseURL that works with Vite's proxy
const api = axios.create({
  baseURL: '',  // Empty base URL since we're using Vite's proxy configuration
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
    return response;
  },
  (error) => {
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
  return api.post(`portfolios/${portfolioId}/calculate-irr`);
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
      url: 'http://localhost:8000/api/available_providers',
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
    url: 'http://localhost:8000/api/available_providers/update-theme-colors',
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
  // Use axios directly without any interceptors
  return axios({
    method: 'get',
    url: 'http://localhost:8000/api/available_providers/available-colors',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    withCredentials: true // Include credentials if your API requires authentication
  });
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
  return api.post(`portfolio_funds/${params.portfolioFundId}/irr`, params.irrDate || null);
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

export default api; 