/**
 * Shared API Error Handling Utilities
 *
 * Provides standardized error handling for API services.
 * Used by legalDocumentsApi, specialRelationshipsApi, and other API services.
 *
 * @module utils/apiError
 */

// =============================================================================
// Error Class
// =============================================================================

/**
 * Custom error class for API-specific errors with enhanced context.
 *
 * @example
 * throw new ApiError('Not found', 404, { detail: 'Resource not found' });
 *
 * @example
 * try {
 *   await fetchData();
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 401) {
 *     // Handle unauthorized
 *   }
 * }
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// =============================================================================
// Error Handler
// =============================================================================

/**
 * Type definition for axios-like error structure
 */
interface AxiosLikeError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      detail?: string | Array<{ msg: string }>;
    };
  };
  message?: string;
}

/**
 * Centralized error handler for API responses.
 * Extracts error message from response body and includes response context.
 * Includes defensive null checks for all response properties.
 *
 * @param error - Error object from axios
 * @throws {ApiError} Enhanced error with status code and response body
 *
 * @example
 * try {
 *   const response = await api.get('/endpoint');
 *   return response.data;
 * } catch (error) {
 *   return handleApiError(error);
 * }
 */
export const handleApiError = (error: unknown): never => {
  const axiosError = error as AxiosLikeError;

  const statusCode = axiosError?.response?.status;
  const responseBody = axiosError?.response?.data;

  // Extract message from various response formats with defensive null checks
  let message = 'An unexpected error occurred';

  if (responseBody?.message) {
    message = responseBody.message;
  } else if (typeof responseBody?.detail === 'string') {
    message = responseBody.detail;
  } else if (Array.isArray(responseBody?.detail) && responseBody.detail.length > 0) {
    message = responseBody.detail
      .filter((d): d is { msg: string } => d != null && typeof d.msg === 'string')
      .map((d) => d.msg)
      .join(', ') || message;
  } else if (axiosError?.message) {
    message = axiosError.message;
  }

  throw new ApiError(message, statusCode, responseBody);
};
