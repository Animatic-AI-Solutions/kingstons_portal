/**
 * Error utilities for legal document components
 *
 * @module components/phase2/legal-documents/shared/errorUtils
 */

/**
 * Sanitizes error messages before display to avoid exposing internal details
 *
 * @param error - The error to sanitize
 * @returns A user-friendly error message
 */
export const sanitizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
      return 'Network error. Please check your connection and try again.';
    }

    // Server errors
    if (message.includes('500') || message.includes('internal') || message.includes('server error')) {
      return 'Server error. Please try again later.';
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'The request timed out. Please try again.';
    }

    // Authentication errors
    if (message.includes('401') || message.includes('unauthorized')) {
      return 'Your session has expired. Please log in again.';
    }

    // Permission errors
    if (message.includes('403') || message.includes('forbidden')) {
      return 'You do not have permission to perform this action.';
    }

    // Not found errors
    if (message.includes('404') || message.includes('not found')) {
      return 'The requested resource was not found.';
    }

    // Validation errors - these are usually safe to show
    if (message.includes('validation') || message.includes('invalid')) {
      return error.message;
    }

    // Return original message if it doesn't contain sensitive info
    // These are likely user-friendly messages from the backend
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};
