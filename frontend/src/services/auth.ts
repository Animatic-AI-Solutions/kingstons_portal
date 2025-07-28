import axios from 'axios';

// Update the API_URL to use Vite's proxy configuration
export const API_URL = '';  // Empty base URL to work with Vite's proxy

/**
 * Authentication Service
 * 
 * Handles all authentication-related operations:
 * - Login
 * - Logout
 * - Password reset
 * - Token management
 * 
 * API URL Structure:
 * All API endpoints follow the pattern: /api/{resource}/{action}
 * For authentication endpoints: /api/auth/{action}
 * Example: /api/auth/login
 * 
 * The createAuthenticatedApi() function below ensures all API calls
 * follow this URL structure by adding the /api prefix when needed.
 */
export const authService = {
  /**
   * Login a user with email and password
   * 
   * @param email - User's email address
   * @param password - User's password
   * @returns User data (token is now in httpOnly cookie)
   */
  login: async (email: string, password: string) => {
    try {
      const response = await axios.post(
        `${getApiBaseUrl()}/api/auth/login`, 
        { email, password },
        { withCredentials: true } // Required to allow httpOnly cookies to be set
      );
      
      // Token is now set as httpOnly cookie by the server
      // No need to store anything in localStorage
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Log out the current user
   * 
   * Makes a logout request to the server to clear httpOnly cookies
   */
  logout: async () => {
    try {
      // Configure request with credentials to include cookies
      const config = {
        withCredentials: true
      };
      
      // Make the logout request - this will clear httpOnly cookies on the server
      await axios.post(`${getApiBaseUrl()}/api/auth/logout`, {}, config);
    } catch (error) {
      // If logout request fails, the cookies may still be cleared by the server
      // or will expire naturally
      console.warn('Logout request failed:', error);
    }
  },

  /**
   * Request a password reset email
   * 
   * @param email - User's email address
   * @returns Success message
   */
  requestPasswordReset: async (email: string) => {
    try {
      const response = await axios.post(`${getApiBaseUrl()}/api/auth/forgot-password`, { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verify a password reset token
   * 
   * @param token - Password reset token
   * @returns Success message
   */
  verifyResetToken: async (token: string) => {
    try {
      const response = await axios.post(`${getApiBaseUrl()}/api/auth/verify-reset-token`, { token });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Reset a password with a token
   * 
   * @param token - Password reset token
   * @param newPassword - New password
   * @returns Success message
   */
  resetPassword: async (token: string, newPassword: string) => {
    try {
      const response = await axios.post(`${getApiBaseUrl()}/api/auth/reset-password`, {
        token,
        new_password: newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get the current user's profile
   * 
   * @returns User profile data
   */
  getProfile: async () => {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/api/auth/me`, {
        withCredentials: true // httpOnly cookie will be sent automatically
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get the current authentication token
   * 
   * @returns Always null since tokens are now in httpOnly cookies
   * @deprecated Use cookie-based authentication instead
   */
  getToken: () => {
    return null; // Tokens are now in httpOnly cookies, not accessible to JavaScript
  },

  /**
   * Check if the user is authenticated
   * 
   * @returns False since authentication state should be checked via API call
   * @deprecated Use getProfile() or API calls to check authentication
   */
  isAuthenticated: () => {
    return false; // Cannot check httpOnly cookies from JavaScript
  },

  /**
   * Complete password reset with token and new password
   * 
   * @param token - Reset token from email
   * @param password - New password
   * @returns Success message
   */
  confirmPasswordReset: async (token: string, password: string) => {
    try {
      const response = await axios.post(`${getApiBaseUrl()}/api/auth/reset-password`, { 
        token, 
        new_password: password 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

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

/**
 * Configure Axios with authentication interceptor
 * 
 * Creates an axios instance with an interceptor to add the
 * authentication token to all requests
 */
export const createAuthenticatedApi = () => {
  try {
    const api = axios.create({
      baseURL: getApiBaseUrl(),  // Use environment-based baseURL
      withCredentials: true
    });
  
    // Add request interceptor for URL fixing and credentials
    api.interceptors.request.use(config => {
      // Ensure credentials are included for httpOnly cookies
      config.withCredentials = true;
      
      // Fix URL paths for consistent /api prefix
      if (config.url) {
        // Always ensure URL starts with /api prefix (but no duplicates)
        if (!config.url.startsWith('/api/')) {
          config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
        }
      }
      
      return config;
    }, error => {
      return Promise.reject(error);
    });
    
    // Add response interceptor for error handling
    api.interceptors.response.use(
      response => response,
      error => {
        // Log detailed information about the error
        console.error('API Error:', error.message);
        console.error('Request URL:', error.config?.url);
        console.error('Request Method:', error.config?.method);
        console.error('Response Status:', error.response?.status);
        console.error('Response Data:', error.response?.data);
        
        // Handle validation errors (422)
        if (error.response?.status === 422) {
          // Format validation errors to be more readable
          const detail = error.response.data?.detail;
          if (Array.isArray(detail)) {
            // Convert FastAPI validation errors to a readable message
            const formattedErrors = detail.map(err => {
              return `${err.loc.join('.')}: ${err.msg}`;
            }).join('; ');
            error.response.data.detail = formattedErrors;
          }
        }
        
        // Handle server errors (500) - these are usually not authentication issues
        if (error.response?.status === 500) {
          console.error('Server error - this is likely a backend issue, not authentication');
          // Don't treat 500 errors as authentication failures
        }
        
        // Only handle authentication errors specifically
        if (error.response?.status === 401) {
          console.warn('Authentication may be expired or invalid');
          // Redirect to login for authentication failures
          if (error.config?.url?.includes('/auth/') || 
              (error.response?.data?.detail && 
               error.response.data.detail.toLowerCase().includes('authentication'))) {
            // Cookies will be cleared by the server or expire naturally
            // Only redirect to login for actual authentication errors
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    return api;
  } catch (error) {
    // Fallback to a simpler axios instance if there's an error
    return axios.create({
      baseURL: getApiBaseUrl(),  // Use environment-based baseURL
      withCredentials: true
    });
  }
};

export default authService; 