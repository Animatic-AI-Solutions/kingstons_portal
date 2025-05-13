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
  value: number;
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
  value?: number;
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

export default api; 