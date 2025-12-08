/**
 * Error Handling Utilities
 *
 * Provides standardized error handling and formatting utilities for API errors,
 * network errors, and user-facing error messages.
 */

/**
 * Error message constants for common scenarios
 */
export const ERROR_MESSAGES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'Authentication required. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',

  // Resource Errors
  NOT_FOUND: 'Resource not found. It may have been deleted.',
  CONFLICT: 'This record already exists. Please use a different value.',

  // Server Errors
  INTERNAL_SERVER_ERROR: 'Server error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again in a few minutes.',

  // Network Errors
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  TIMEOUT: 'Request timeout. Please check your connection and try again.',
  CONNECTION_REFUSED: 'Unable to connect to server. Please try again later.',
  DNS_ERROR: 'Server not found. Please check your internet connection.',

  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred.',
  GENERIC_ERROR: 'An error occurred. Please try again.',
};

/**
 * Formats API error into user-friendly message
 *
 * Extracts error details from various error shapes (axios errors, network errors)
 * and returns appropriate user-facing message.
 *
 * @param error - Error object from API call
 * @returns User-friendly error message
 */
export function formatApiError(error: any): string {
  // Handle null/undefined errors
  if (!error) {
    return ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  // Handle network errors by error code
  if (error.code) {
    switch (error.code) {
      case 'ECONNABORTED':
        return ERROR_MESSAGES.TIMEOUT;
      case 'ERR_NETWORK':
        return ERROR_MESSAGES.NETWORK_ERROR;
      case 'ECONNREFUSED':
        return ERROR_MESSAGES.CONNECTION_REFUSED;
      case 'ENOTFOUND':
        return ERROR_MESSAGES.DNS_ERROR;
    }
  }

  // Handle HTTP status code errors
  if (error.response?.status) {
    const status = error.response.status;

    // Extract specific error message from response first
    const detail = error.response.data?.detail;
    const message = error.response.data?.message;

    switch (status) {
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 403:
        return ERROR_MESSAGES.FORBIDDEN;
      case 404:
        return ERROR_MESSAGES.NOT_FOUND;
      case 409:
        // Extract specific conflict message if available
        if (detail) {
          // Check for specific conflict scenarios
          if (detail.toLowerCase().includes('modified by another user')) {
            return 'Product owner was modified by another user. Please refresh and try again.';
          }
          // For generic "Duplicate entry" message, use our standardized message
          if (detail.toLowerCase().includes('duplicate')) {
            return ERROR_MESSAGES.CONFLICT;
          }
          return detail;
        }
        return ERROR_MESSAGES.CONFLICT;
      case 422:
        // Validation errors - extract specific message
        const validationDetail = error.response.data?.detail;
        if (Array.isArray(validationDetail)) {
          // FastAPI validation error format
          return validationDetail
            .map((err: any) => {
              const field = err.loc?.[err.loc.length - 1] || 'field';
              const msg = err.msg || 'validation error';
              return `${field}: ${msg}`;
            })
            .join(', ');
        }
        if (validationDetail) {
          return validationDetail;
        }
        return 'Validation error occurred.';
      case 500:
        // Return message if present, otherwise use default
        if (message) {
          return message;
        }
        return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
      case 503:
        return ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    }

    // Extract specific error message from response for other status codes
    if (detail) {
      return detail;
    }
    if (message) {
      return message;
    }
  }

  // Fallback to error message property
  if (error.message) {
    return error.message;
  }

  // Ultimate fallback
  return ERROR_MESSAGES.GENERIC_ERROR;
}

/**
 * Determines if an error should trigger a retry
 *
 * Retryable errors: 5xx server errors, network timeouts, connection failures
 * Non-retryable errors: 4xx client errors (bad request, auth, validation)
 *
 * @param error - Error object from API call
 * @returns True if error is retryable, false otherwise
 */
export function isRetryableError(error: any): boolean {
  // Handle null/undefined
  if (!error) {
    return false;
  }

  // Network errors are retryable
  if (error.code) {
    const retryableCodes = ['ECONNABORTED', 'ECONNREFUSED', 'ERR_NETWORK', 'ENOTFOUND'];
    if (retryableCodes.includes(error.code)) {
      return true;
    }
  }

  // HTTP status codes
  if (error.response?.status) {
    const status = error.response.status;

    // 5xx server errors are retryable
    if (status >= 500 && status < 600) {
      return true;
    }

    // 4xx client errors are NOT retryable
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // Unknown errors - don't retry
  return false;
}

/**
 * Extracts HTTP status code from error object
 *
 * @param error - Error object from API call
 * @returns HTTP status code or null if not available
 */
export function getErrorStatusCode(error: any): number | null {
  if (!error) {
    return null;
  }

  return error.response?.status || null;
}

/**
 * Creates a formatted error message with context
 *
 * @param message - Base error message
 * @param context - Optional context to append
 * @returns Formatted error message
 */
export function createErrorMessage(message: string, context?: string): string {
  // Capitalize first letter
  const capitalizedMessage = message.charAt(0).toUpperCase() + message.slice(1);

  if (context) {
    return `${capitalizedMessage} (${context})`;
  }

  return capitalizedMessage;
}

/**
 * Determines if error is a network error (not API error)
 *
 * @param error - Error object from API call
 * @returns True if network error, false if API error
 */
export function isNetworkError(error: any): boolean {
  if (!error) {
    return false;
  }

  // Check for network error codes
  const networkCodes = ['ECONNABORTED', 'ECONNREFUSED', 'ERR_NETWORK', 'ENOTFOUND'];
  if (error.code && networkCodes.includes(error.code)) {
    return true;
  }

  // If it has a response, it's an API error, not network error
  if (error.response) {
    return false;
  }

  return false;
}

/**
 * Determines if error details should be shown to user
 *
 * @param forceShow - Force show details regardless of environment
 * @returns True if should show details, false otherwise
 */
export function shouldShowErrorDetails(forceShow?: boolean): boolean {
  if (forceShow !== undefined) {
    return forceShow;
  }

  return process.env.NODE_ENV === 'development';
}
