/**
 * Product Owner Constants
 *
 * Centralized constants for product owner operations including validation limits,
 * retry configuration, cache settings, and error messages.
 *
 * Following project pattern from reportConstants.ts for consistency.
 */

// ============================================================================
// AGE VALIDATION CONSTANTS
// ============================================================================

/**
 * Minimum age for product ownership (18 years)
 * Used in age validation to ensure product owners are adults
 */
export const MIN_PRODUCT_OWNER_AGE = 18;

/**
 * Maximum reasonable age for validation (90 years)
 * Practical upper limit for active product ownership
 */
export const MAX_REASONABLE_AGE = 90;

/**
 * Maximum possible age for validation (120 years)
 * Prevents date of birth more than 120 years in the past
 * Based on realistic human lifespan limits
 */
export const MAX_POSSIBLE_AGE = 120;

// ============================================================================
// API RETRY CONFIGURATION
// ============================================================================

/**
 * Maximum number of retry attempts for failed API requests
 * Applied to retryable errors (5xx server errors, network timeouts)
 */
export const MAX_RETRY_ATTEMPTS = 1;

/**
 * Delay in milliseconds before retrying failed request
 * Gives server time to recover from temporary issues
 */
export const RETRY_DELAY_MS = 1000;

/**
 * API request timeout in milliseconds (30 seconds)
 * Prevents hanging requests from blocking the UI
 */
export const API_TIMEOUT_MS = 30000;

// ============================================================================
// REACT QUERY CACHE CONFIGURATION
// ============================================================================

/**
 * Default stale time for React Query cache (5 minutes)
 * Data is considered fresh for 5 minutes after fetching
 * Reduces unnecessary API calls while keeping data reasonably fresh
 */
export const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Cache time for React Query (10 minutes)
 * Cached data is kept in memory for 10 minutes after becoming stale
 * Allows instant display when navigating back to cached data
 */
export const DEFAULT_CACHE_TIME_MS = 10 * 60 * 1000;

/**
 * Stale time for frequently changing data (1 minute)
 * Use for data that changes frequently and needs to be fresh
 */
export const SHORT_STALE_TIME_MS = 1 * 60 * 1000;

/**
 * Stale time for rarely changing data (15 minutes)
 * Use for reference data that rarely changes
 */
export const LONG_STALE_TIME_MS = 15 * 60 * 1000;

// ============================================================================
// PRODUCT OWNER STATUS VALUES
// ============================================================================

/**
 * Valid product owner status values
 * Maps to database enum type
 */
export const PRODUCT_OWNER_STATUS = {
  ACTIVE: 'active',
  LAPSED: 'lapsed',
  DECEASED: 'deceased',
} as const;

/**
 * Type for product owner status
 */
export type ProductOwnerStatus = typeof PRODUCT_OWNER_STATUS[keyof typeof PRODUCT_OWNER_STATUS];

// ============================================================================
// STATUS BADGE COLORS
// ============================================================================

/**
 * Status to badge color mapping for UI display
 * Used by getStatusBadgeColor helper
 */
export const STATUS_BADGE_COLORS = {
  [PRODUCT_OWNER_STATUS.ACTIVE]: 'green',
  [PRODUCT_OWNER_STATUS.LAPSED]: 'gray',
  [PRODUCT_OWNER_STATUS.DECEASED]: 'red',
  DEFAULT: 'gray',
} as const;

// ============================================================================
// PHONE NUMBER FORMATS
// ============================================================================

/**
 * UK mobile phone number length (11 digits)
 */
export const UK_MOBILE_LENGTH = 11;

/**
 * UK mobile prefix
 */
export const UK_MOBILE_PREFIX = '07';

/**
 * UK landline prefix
 */
export const UK_LANDLINE_PREFIX = '0';

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * React Query key factory for product owner queries
 * Provides consistent query key structure across the application
 */
export const PRODUCT_OWNER_QUERY_KEYS = {
  all: ['productOwners'] as const,
  byClientGroup: (clientGroupId: number) => ['productOwners', clientGroupId] as const,
  detail: (id: number) => ['productOwners', 'detail', id] as const,
} as const;

// ============================================================================
// DEVELOPMENT LOGGING
// ============================================================================

/**
 * Determines if development logging should be enabled
 * Only logs in development environment to avoid production noise
 */
export const isDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Development logger utility
 * Only logs in development mode
 */
export const devLog = {
  /**
   * Log API calls in development
   */
  apiCall: (method: string, endpoint: string, data?: any) => {
    if (isDevelopment()) {
      console.log(`[API] ${method} ${endpoint}`, data || '');
    }
  },

  /**
   * Log cache operations in development
   */
  cache: (operation: string, key: any, data?: any) => {
    if (isDevelopment()) {
      console.log(`[Cache] ${operation}`, key, data || '');
    }
  },

  /**
   * Log errors in development
   */
  error: (context: string, error: any) => {
    if (isDevelopment()) {
      console.error(`[Error] ${context}:`, error);
    }
  },

  /**
   * Log info messages in development
   */
  info: (message: string, data?: any) => {
    if (isDevelopment()) {
      console.log(`[Info] ${message}`, data || '');
    }
  },
};
