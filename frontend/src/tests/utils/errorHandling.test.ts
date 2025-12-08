/**
 * Error Handling Utilities Tests (RED Phase)
 *
 * Tests for shared error handling utilities used across the application:
 * - formatApiError: Converts API errors to user-friendly messages
 * - isRetryableError: Determines if an error should trigger a retry
 * - getErrorStatusCode: Extracts HTTP status code from errors
 */

import {
  formatApiError,
  isRetryableError,
  getErrorStatusCode,
  createErrorMessage,
  isNetworkError,
  shouldShowErrorDetails,
} from '@/utils/errorHandling';

describe('Error Handling Utilities', () => {
  describe('formatApiError', () => {
    describe('Happy Path', () => {
      it('should extract error message from response.data.detail', () => {
        const error = {
          response: {
            status: 400,
            data: {
              detail: 'Invalid input provided',
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toBe('Invalid input provided');
      });

      it('should extract error message from response.data.message', () => {
        const error = {
          response: {
            status: 500,
            data: {
              message: 'Internal server error occurred',
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toBe('Internal server error occurred');
      });

      it('should use error.message when no response data available', () => {
        const error = {
          message: 'Network request failed',
        };

        const message = formatApiError(error);

        expect(message).toBe('Network request failed');
      });
    });

    describe('Network Errors', () => {
      it('should handle network timeout errors', () => {
        const error = {
          code: 'ECONNABORTED',
          message: 'timeout of 30000ms exceeded',
        };

        const message = formatApiError(error);

        expect(message).toBe('Request timeout. Please check your connection and try again.');
      });

      it('should handle general network errors', () => {
        const error = {
          code: 'ERR_NETWORK',
          message: 'Network Error',
        };

        const message = formatApiError(error);

        expect(message).toBe('Network error. Please check your internet connection.');
      });

      it('should handle connection refused errors', () => {
        const error = {
          code: 'ECONNREFUSED',
          message: 'Connection refused',
        };

        const message = formatApiError(error);

        expect(message).toBe('Unable to connect to server. Please try again later.');
      });

      it('should handle DNS resolution failures', () => {
        const error = {
          code: 'ENOTFOUND',
          message: 'getaddrinfo ENOTFOUND',
        };

        const message = formatApiError(error);

        expect(message).toBe('Server not found. Please check your internet connection.');
      });
    });

    describe('HTTP Status Code Errors', () => {
      it('should format 401 Unauthorized error', () => {
        const error = {
          response: {
            status: 401,
            data: {
              detail: 'Token expired',
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toBe('Authentication required. Please log in again.');
      });

      it('should format 403 Forbidden error', () => {
        const error = {
          response: {
            status: 403,
            data: {
              detail: 'Access denied',
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toBe('You do not have permission to perform this action.');
      });

      it('should format 404 Not Found error', () => {
        const error = {
          response: {
            status: 404,
            data: {
              detail: 'Resource not found',
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toBe('Resource not found. It may have been deleted.');
      });

      it('should format 409 Conflict error', () => {
        const error = {
          response: {
            status: 409,
            data: {
              detail: 'Duplicate entry',
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toBe('This record already exists. Please use a different value.');
      });

      it('should format 422 Validation error', () => {
        const error = {
          response: {
            status: 422,
            data: {
              detail: 'Email format is invalid',
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toBe('Email format is invalid');
      });

      it('should format 500 Internal Server Error', () => {
        const error = {
          response: {
            status: 500,
            data: {
              detail: 'Database connection failed',
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toBe('Server error occurred. Please try again later.');
      });

      it('should format 503 Service Unavailable error', () => {
        const error = {
          response: {
            status: 503,
            data: {
              detail: 'Service temporarily unavailable',
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toBe('Service is temporarily unavailable. Please try again in a few minutes.');
      });
    });

    describe('Fallback Messages', () => {
      it('should provide generic fallback when no specific message available', () => {
        const error = {
          response: {
            status: 400,
            data: {},
          },
        };

        const message = formatApiError(error);

        expect(message).toBe('An error occurred. Please try again.');
      });

      it('should handle null error object', () => {
        const message = formatApiError(null);

        expect(message).toBe('An unexpected error occurred.');
      });

      it('should handle undefined error object', () => {
        const message = formatApiError(undefined);

        expect(message).toBe('An unexpected error occurred.');
      });

      it('should handle error with no response and no message', () => {
        const error = {};

        const message = formatApiError(error);

        expect(message).toBe('An error occurred. Please try again.');
      });
    });

    describe('Validation Error Arrays', () => {
      it('should format array of validation errors', () => {
        const error = {
          response: {
            status: 422,
            data: {
              detail: [
                { loc: ['body', 'email'], msg: 'field required' },
                { loc: ['body', 'phone'], msg: 'invalid format' },
              ],
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toContain('email');
        expect(message).toContain('phone');
      });

      it('should handle single validation error in array', () => {
        const error = {
          response: {
            status: 422,
            data: {
              detail: [{ loc: ['body', 'firstname'], msg: 'field required' }],
            },
          },
        };

        const message = formatApiError(error);

        expect(message).toContain('firstname');
      });
    });
  });

  describe('isRetryableError', () => {
    describe('Retryable Errors', () => {
      it('should identify 500 errors as retryable', () => {
        const error = {
          response: {
            status: 500,
          },
        };

        expect(isRetryableError(error)).toBe(true);
      });

      it('should identify 502 Bad Gateway as retryable', () => {
        const error = {
          response: {
            status: 502,
          },
        };

        expect(isRetryableError(error)).toBe(true);
      });

      it('should identify 503 Service Unavailable as retryable', () => {
        const error = {
          response: {
            status: 503,
          },
        };

        expect(isRetryableError(error)).toBe(true);
      });

      it('should identify 504 Gateway Timeout as retryable', () => {
        const error = {
          response: {
            status: 504,
          },
        };

        expect(isRetryableError(error)).toBe(true);
      });

      it('should identify network timeout as retryable', () => {
        const error = {
          code: 'ECONNABORTED',
        };

        expect(isRetryableError(error)).toBe(true);
      });

      it('should identify connection refused as retryable', () => {
        const error = {
          code: 'ECONNREFUSED',
        };

        expect(isRetryableError(error)).toBe(true);
      });

      it('should identify network errors as retryable', () => {
        const error = {
          code: 'ERR_NETWORK',
        };

        expect(isRetryableError(error)).toBe(true);
      });
    });

    describe('Non-Retryable Errors', () => {
      it('should identify 400 Bad Request as non-retryable', () => {
        const error = {
          response: {
            status: 400,
          },
        };

        expect(isRetryableError(error)).toBe(false);
      });

      it('should identify 401 Unauthorized as non-retryable', () => {
        const error = {
          response: {
            status: 401,
          },
        };

        expect(isRetryableError(error)).toBe(false);
      });

      it('should identify 403 Forbidden as non-retryable', () => {
        const error = {
          response: {
            status: 403,
          },
        };

        expect(isRetryableError(error)).toBe(false);
      });

      it('should identify 404 Not Found as non-retryable', () => {
        const error = {
          response: {
            status: 404,
          },
        };

        expect(isRetryableError(error)).toBe(false);
      });

      it('should identify 422 Validation Error as non-retryable', () => {
        const error = {
          response: {
            status: 422,
          },
        };

        expect(isRetryableError(error)).toBe(false);
      });

      it('should exclude all 4xx errors from retry', () => {
        const statuses = [400, 401, 403, 404, 409, 422, 429];

        statuses.forEach((status) => {
          const error = { response: { status } };
          expect(isRetryableError(error)).toBe(false);
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle null error', () => {
        expect(isRetryableError(null)).toBe(false);
      });

      it('should handle undefined error', () => {
        expect(isRetryableError(undefined)).toBe(false);
      });

      it('should handle error with no response or code', () => {
        const error = { message: 'Unknown error' };

        expect(isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('getErrorStatusCode', () => {
    it('should extract status code from error response', () => {
      const error = {
        response: {
          status: 404,
        },
      };

      expect(getErrorStatusCode(error)).toBe(404);
    });

    it('should return null when no status code available', () => {
      const error = {
        message: 'Error',
      };

      expect(getErrorStatusCode(error)).toBeNull();
    });

    it('should return null for null error', () => {
      expect(getErrorStatusCode(null)).toBeNull();
    });

    it('should return null for undefined error', () => {
      expect(getErrorStatusCode(undefined)).toBeNull();
    });
  });

  describe('createErrorMessage', () => {
    it('should create formatted error message with context', () => {
      const message = createErrorMessage('Failed to save', 'product owner');

      expect(message).toContain('Failed to save');
      expect(message).toContain('product owner');
    });

    it('should handle missing context', () => {
      const message = createErrorMessage('Operation failed');

      expect(message).toBe('Operation failed');
    });

    it('should capitalize first letter', () => {
      const message = createErrorMessage('failed to load data');

      expect(message[0]).toBe(message[0].toUpperCase());
    });
  });

  describe('isNetworkError', () => {
    it('should identify timeout as network error', () => {
      const error = { code: 'ECONNABORTED' };

      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify connection refused as network error', () => {
      const error = { code: 'ECONNREFUSED' };

      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify ERR_NETWORK as network error', () => {
      const error = { code: 'ERR_NETWORK' };

      expect(isNetworkError(error)).toBe(true);
    });

    it('should not identify API errors as network errors', () => {
      const error = {
        response: {
          status: 500,
        },
      };

      expect(isNetworkError(error)).toBe(false);
    });

    it('should handle null error', () => {
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('shouldShowErrorDetails', () => {
    it('should show details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      expect(shouldShowErrorDetails()).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      expect(shouldShowErrorDetails()).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('should allow override via parameter', () => {
      expect(shouldShowErrorDetails(true)).toBe(true);
      expect(shouldShowErrorDetails(false)).toBe(false);
    });
  });
});
