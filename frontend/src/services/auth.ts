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
   * @returns Token and user data
   */
  login: async (email: string, password: string) => {
    try {
      const response = await axios.post(
        `/api/auth/login`, 
        { email, password },
        { withCredentials: true } // Include this option to allow cookies to be set
      );
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Log out the current user
   * 
   * Removes the token from localStorage and makes a logout request to the server
   */
  logout: async () => {
    try {
      // Get the current token
      const token = localStorage.getItem('token');
      
      // Configure request with credentials to include cookies
      const config = {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      };
      
      // Make the logout request - this will clear the session cookie on the server
      await axios.post(`/api/auth/logout`, {}, config);
      
      // Remove the token from localStorage
      localStorage.removeItem('token');
    } catch (error) {
      // Still remove the token even if the request fails
      localStorage.removeItem('token');
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
      const response = await axios.post(`/api/auth/forgot-password`, { email });
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
      const response = await axios.post(`/api/auth/verify-reset-token`, { token });
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
      const response = await axios.post(`/api/auth/reset-password`, {
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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get(`/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get the current authentication token
   * 
   * @returns JWT token or null if not authenticated
   */
  getToken: () => {
    return localStorage.getItem('token');
  },

  /**
   * Check if the user is authenticated
   * 
   * @returns True if authenticated, false otherwise
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
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
      const response = await axios.post(`/api/auth/reset-password`, { 
        token, 
        new_password: password 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
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
      baseURL: '',  // Empty baseURL to work with Vite's proxy
      withCredentials: true
    });
  
    // Add request interceptor for authentication and URL fixing
    api.interceptors.request.use(config => {
      // Add auth token
      const token = authService.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
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
          console.warn('Authentication token may be expired or invalid');
          // Clear invalid token on actual authentication failures
          if (error.config?.url?.includes('/auth/') || 
              (error.response?.data?.detail && 
               error.response.data.detail.toLowerCase().includes('authentication'))) {
            localStorage.removeItem('token');
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
      baseURL: '',  // Empty baseURL to work with Vite's proxy
      withCredentials: true
    });
  }
};

export default authService; 