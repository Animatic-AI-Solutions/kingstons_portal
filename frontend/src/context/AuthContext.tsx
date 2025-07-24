import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, createAuthenticatedApi } from '../services/auth';
import axios, { AxiosInstance } from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

// Environment detection function
const getApiBaseUrl = () => {
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '3000';
  
  return isDevelopment ? '' : 'http://intranet.kingston.local:8001';
};

/**
 * Auth Context Type Definition
 * 
 * Defines the shape of the authentication context that will be available
 * throughout the application via the useAuth hook.
 * 
 * @property {boolean} isAuthenticated - Whether the user is currently authenticated
 * @property {any | null} user - The authenticated user's profile data
 * @property {boolean} isLoading - Loading state for authentication operations
 * @property {Function} login - Function to authenticate a user
 * @property {Function} logout - Function to end the user's session
 * @property {Function} resetPassword - Function to request a password reset
 * @property {Function} confirmPasswordReset - Function to set a new password
 * @property {AxiosInstance} api - Axios instance with authentication headers
 */
interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  api: AxiosInstance;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  confirmPasswordReset: async () => {},
  api: axios.create({ baseURL: '' }),
});

/**
 * Authentication Provider Component
 * 
 * Wraps the application with authentication state and methods.
 * Manages user authentication state, login/logout operations,
 * and provides an authenticated API instance for API calls.
 * 
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Create authenticated API instance
  const [api, setApi] = useState<AxiosInstance>(() => {
    return createAuthenticatedApi();
  });

  /**
   * Check authentication on component mount
   * Verifies if the user has a valid authentication token
   * and retrieves user profile data if authenticated
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Check if token exists in local storage
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          return;
        }
        
        // Validate token by requesting user profile
        const userResponse = await axios.get(`${getApiBaseUrl()}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        
        setIsAuthenticated(true);
        setUser(userResponse.data);
      } catch (error) {
        // Clear invalid token
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Redirect to preferred landing page when authenticated
  useEffect(() => {
    // Only redirect if:
    // 1. User is authenticated
    // 2. Has a preferred landing page  
    // 3. We're on home page (/) - which is where LoginForm redirects
    // 4. Hasn't been redirected before in this session
    // 5. User has a preference other than home
    if (isAuthenticated && 
        user?.preferred_landing_page && 
        location.pathname === '/' &&
        !sessionStorage.getItem('hasRedirected') &&
        user.preferred_landing_page !== '/') {
      sessionStorage.setItem('hasRedirected', 'true');
      
      // Valid landing pages - fallback to home if user has invalid preference
      const validLandingPages = ['/', '/client_groups'];
      const landingPage = validLandingPages.includes(user.preferred_landing_page) 
        ? user.preferred_landing_page 
        : '/';
      
      navigate(landingPage);
    }
  }, [isAuthenticated, user, navigate, location.pathname]);

  /**
   * User login function
   * Authenticates user with credentials and sets auth state
   * 
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<any>} Login response
   */
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authService.login(email, password);
      setIsAuthenticated(true);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * User logout function
   * Ends the user's session and clears auth state
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setIsAuthenticated(false);
      setUser(null);
      // Clear redirect flag so preferred landing page works on next login
      sessionStorage.removeItem('hasRedirected');
    } catch (error) {
      // Still clear the auth state even if the API call fails
      setIsAuthenticated(false);
      setUser(null);
      // Clear redirect flag even if logout fails
      sessionStorage.removeItem('hasRedirected');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Password reset request function
   * Initiates the password reset process by sending a reset link
   * 
   * @param {string} email - User's email
   * @returns {Promise<any>} Reset request response
   */
  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      const response = await authService.requestPasswordReset(email);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Password reset confirmation function
   * Completes the password reset process with a new password
   * 
   * @param {string} token - Password reset token
   * @param {string} password - New password
   * @returns {Promise<any>} Reset confirmation response
   */
  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authService.confirmPasswordReset(token, password);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Context value to be provided to consuming components
  const value = {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    resetPassword,
    confirmPasswordReset,
    api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use the auth context
 * Provides easy access to authentication state and methods
 * 
 * @returns {AuthContextType} Authentication context
 */
export const useAuth = () => useContext(AuthContext);

export default AuthContext; 