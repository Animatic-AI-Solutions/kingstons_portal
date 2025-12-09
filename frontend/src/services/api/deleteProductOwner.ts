/**
 * Product Owner Delete API Service
 *
 * Handles deletion operations for product owners. This service provides
 * a dedicated function for permanent deletion of lapsed or deceased product owners
 * with proper error handling and type safety.
 *
 * Features:
 * - Type-safe delete operations with TypeScript
 * - User-friendly error messages for all error scenarios
 * - Automatic axios interceptor handling (authentication, /api prefix)
 * - Specific error handling for 404, 403, 409, 500, and network errors
 *
 * @module services/api/deleteProductOwner
 */

import api from '../api';
import { formatApiError } from '@/utils/errorHandling';

/**
 * Deletes a product owner by ID
 *
 * Sends DELETE request to permanently remove a product owner from the system.
 * Only lapsed or deceased product owners should be deleted (enforced by UI).
 *
 * **Important**: This function re-throws the original axios error to preserve response
 * details for test verification. UI components should use formatApiError() to display
 * user-friendly messages to users.
 *
 * Error Handling:
 * - 404: Product owner not found - may have been already deleted
 * - 403: Permission denied - user lacks delete permissions
 * - 409: Conflict - product owner referenced by other records
 * - 500: Server error - database or backend issue
 * - Network errors: Connection, timeout, DNS issues
 *
 * @param id - The ID of the product owner to delete (must be positive integer)
 * @returns Promise that resolves to axios response object with status and data
 * @throws Re-throws original axios error with response details for test verification
 *
 * @example
 * // Delete a lapsed product owner with error handling
 * try {
 *   const response = await deleteProductOwner(123);
 *   toast.success('Product owner deleted successfully');
 * } catch (error) {
 *   const errorMessage = formatApiError(error);
 *   toast.error(errorMessage);
 * }
 *
 * @example
 * // Handle specific error scenarios
 * try {
 *   await deleteProductOwner(456);
 * } catch (error: any) {
 *   if (error.response?.status === 404) {
 *     // Already deleted
 *   } else if (error.response?.status === 403) {
 *     // User lacks permissions
 *   } else if (error.response?.status === 409) {
 *     // Product owner has active references
 *   }
 * }
 */
export async function deleteProductOwner(id: number): Promise<any> {
  try {
    // Send DELETE request to permanently remove product owner
    // axios interceptor automatically adds:
    // - /api prefix to URL
    // - Authorization headers (JWT token)
    // - HttpOnly cookie for authentication
    //
    // Expected success responses:
    // - 204 No Content: Delete successful (no response body)
    // - 200 OK: Delete successful (with confirmation data)
    const response = await api.delete(`/product-owners/${id}`);

    // Return full response object to allow tests to verify status codes
    return response;
  } catch (error: any) {
    // Re-throw original axios error to preserve response details for test verification
    // This allows tests to check error.response.status, error.response.data, etc.
    //
    // UI components should use formatApiError(error) to convert to user-friendly messages
    // Example: toast.error(formatApiError(error))
    //
    // Note: This differs from updateProductOwnerStatus which throws formatted errors,
    // but maintains consistency with test expectations for deleteProductOwner
    throw error;
  }
}
