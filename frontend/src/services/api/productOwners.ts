/**
 * Product Owners API Service
 *
 * Handles all API requests for product owner CRUD operations with
 * comprehensive error handling, retry logic, and user-friendly error messages.
 *
 * Features:
 * - Automatic retry for retryable errors (5xx, network issues)
 * - User-friendly error messages for all error scenarios
 * - Type-safe API responses
 * - Development logging for debugging
 *
 * @module services/api/productOwners
 */

import api from '../api';
import type { ProductOwner, ProductOwnerCreate } from '@/types/productOwner';
import { formatApiError, isRetryableError } from '@/utils/errorHandling';
import { devLog } from '@/utils/productOwnerConstants';

/**
 * Fetches product owners for a specific client group
 *
 * Retrieves all product owners (active, lapsed, deceased) associated with
 * the specified client group. Includes retry logic for transient failures.
 *
 * Error Handling:
 * - 401: Authentication required - user needs to log in
 * - 403: Permission denied - user lacks access to this client group
 * - 404: Client group not found - may have been deleted
 * - 500: Server error - retry recommended
 * - Network errors: Timeout, connection failures
 *
 * @param clientGroupId - The ID of the client group to fetch owners for
 * @param options - Optional configuration
 * @param options.retry - Whether to retry on retryable errors (default: false)
 * @returns Promise resolving to array of product owners (may be empty)
 * @throws {Error} User-friendly error message on failure
 *
 * @example
 * // Basic usage
 * const owners = await fetchProductOwnersForClientGroup(123);
 *
 * @example
 * // With retry enabled
 * const owners = await fetchProductOwnersForClientGroup(123, { retry: true });
 */
export async function fetchProductOwnersForClientGroup(
  clientGroupId: number,
  options?: { retry?: boolean }
): Promise<ProductOwner[]> {
  const endpoint = `/client-groups/${clientGroupId}/product-owners`;

  // Log API call in development
  devLog.apiCall('GET', endpoint);

  try {
    const response = await api.get(endpoint);

    // Log successful response in development
    devLog.info(`Fetched ${response.data.length} product owners for client group ${clientGroupId}`);

    return response.data;
  } catch (error: any) {
    // Log error in development
    devLog.error('fetchProductOwnersForClientGroup', error);

    // Extract HTTP status code for error handling
    const statusCode = error.response?.status;

    // Handle authentication errors - user must re-authenticate
    if (statusCode === 401) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Handle authorization errors - user lacks permission to this resource
    if (statusCode === 403) {
      throw new Error('You do not have permission to access this client group.');
    }

    // Handle not found errors - client group doesn't exist or was deleted
    if (statusCode === 404) {
      throw new Error('Client group not found. It may have been deleted.');
    }

    // Handle server errors - backend issue, possibly transient
    if (statusCode === 500) {
      throw new Error('Server error occurred. Please try again later.');
    }

    // Handle network timeout errors - connection took too long
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection and try again.');
    }

    // Handle network connectivity errors - no connection to server
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error. Please check your internet connection.');
    }

    // Retry logic for transient errors (5xx server errors, network issues)
    // Only retries if explicitly enabled via options.retry
    if (options?.retry && isRetryableError(error)) {
      devLog.info('Retrying request after retryable error');

      try {
        const retryResponse = await api.get(endpoint);

        devLog.info(`Retry successful - fetched ${retryResponse.data.length} product owners`);

        return retryResponse.data;
      } catch (retryError: any) {
        devLog.error('Retry failed', retryError);
        throw new Error(formatApiError(retryError));
      }
    }

    // Fallback: Format error using centralized error handler
    throw new Error(formatApiError(error));
  }
}

/**
 * Creates a new product owner
 *
 * Validates and creates a new product owner record in the database.
 * All required fields must be provided in the data object.
 *
 * Validation Rules:
 * - firstname and surname are required
 * - email must be valid format if provided
 * - dob must be valid date if provided
 * - status must be one of: active, lapsed, deceased
 *
 * Error Handling:
 * - 422: Validation error - invalid or missing required fields
 * - 409: Conflict - duplicate product owner (based on unique constraints)
 * - 500: Server error - database or backend issue
 *
 * @param data - Product owner creation data (see ProductOwnerCreate type)
 * @returns Promise resolving to created product owner with generated ID
 * @throws {Error} User-friendly validation or server error message
 *
 * @example
 * const newOwner = await createProductOwner({
 *   status: 'active',
 *   firstname: 'John',
 *   surname: 'Smith',
 *   email_1: 'john@example.com',
 *   dob: '1980-01-15',
 *   // ... other optional fields
 * });
 */
export async function createProductOwner(data: ProductOwnerCreate): Promise<ProductOwner> {
  const endpoint = '/product-owners';

  // Log API call in development
  devLog.apiCall('POST', endpoint, data);

  try {
    const response = await api.post(endpoint, data);

    // Log successful creation in development
    devLog.info(`Created product owner with ID ${response.data.id}`, response.data);

    return response.data;
  } catch (error: any) {
    // Log error in development
    devLog.error('createProductOwner', error);

    const statusCode = error.response?.status;

    // Handle validation errors (422) - invalid or missing required fields
    // FastAPI returns detailed validation errors in this format
    if (statusCode === 422) {
      const detail = error.response.data?.detail;
      if (detail) {
        // Return server's validation message which includes specific field errors
        throw new Error(detail);
      }
      throw new Error('Validation error occurred.');
    }

    // Handle duplicate conflicts (409) - unique constraint violation
    // Occurs when creating a product owner that already exists
    if (statusCode === 409) {
      const detail = error.response.data?.detail;
      if (detail) {
        // Return server's conflict message which may include specific duplicate field
        throw new Error(detail);
      }
      throw new Error('Product owner already exists.');
    }

    // Handle server errors (500) - database or backend issue
    if (statusCode === 500) {
      throw new Error('Failed to create product owner. Please try again.');
    }

    // Fallback: Format error using centralized error handler
    throw new Error(formatApiError(error));
  }
}

/**
 * Updates an existing product owner
 *
 * Performs partial update of product owner record. Only provided fields
 * are updated; omitted fields remain unchanged.
 *
 * Concurrency Control:
 * The backend may implement optimistic locking to prevent conflicting updates
 * from multiple users. If a conflict is detected (409), the user should refresh
 * and retry the update with current data.
 *
 * Error Handling:
 * - 404: Product owner not found - may have been deleted
 * - 422: Validation error - invalid field values
 * - 409: Conflict - modified by another user (optimistic locking)
 * - 500: Server error - database or backend issue
 *
 * @param id - The ID of the product owner to update
 * @param data - Partial product owner data containing only fields to update
 * @returns Promise resolving to updated product owner with all fields
 * @throws {Error} User-friendly error message on failure
 *
 * @example
 * // Update email only
 * const updated = await updateProductOwner(123, {
 *   email_1: 'newemail@example.com'
 * });
 *
 * @example
 * // Update multiple fields
 * const updated = await updateProductOwner(123, {
 *   status: 'lapsed',
 *   phone_1: '07700 900123'
 * });
 */
export async function updateProductOwner(
  id: number,
  data: Partial<ProductOwner>
): Promise<ProductOwner> {
  const endpoint = `/product-owners/${id}`;

  // Log API call in development
  devLog.apiCall('PATCH', endpoint, data);

  try {
    const response = await api.patch(endpoint, data);

    // Log successful update in development
    devLog.info(`Updated product owner ${id}`, response.data);

    return response.data;
  } catch (error: any) {
    // Log error in development
    devLog.error('updateProductOwner', error);

    const statusCode = error.response?.status;

    // Handle not found (404) - product owner doesn't exist or was deleted
    if (statusCode === 404) {
      throw new Error('Product owner not found');
    }

    // Handle validation errors (422) - invalid field values
    // Server returns specific validation messages for each field
    if (statusCode === 422) {
      const detail = error.response.data?.detail;
      if (detail) {
        // Return server's validation message with field-specific errors
        throw new Error(detail);
      }
      throw new Error('Invalid data provided.');
    }

    // Handle optimistic locking conflicts (409)
    // Occurs when another user modified the record between read and update
    // User should refresh to get latest data and retry
    if (statusCode === 409) {
      const detail = error.response.data?.detail;
      if (detail && detail.toLowerCase().includes('modified by another user')) {
        throw new Error('Product owner was modified by another user. Please refresh and try again.');
      }
      // Fallback for other conflict types
      throw new Error(formatApiError(error));
    }

    // Handle server errors (500) - database or backend issue
    if (statusCode === 500) {
      throw new Error('Failed to update product owner. Please try again.');
    }

    // Fallback: Format error using centralized error handler
    throw new Error(formatApiError(error));
  }
}

/**
 * Deletes a product owner
 *
 * Permanently removes a product owner record from the database.
 * This operation cannot be undone.
 *
 * Referential Integrity:
 * Cannot delete a product owner that is associated with client groups or
 * other entities. The server will return 409 conflict if deletion would
 * violate referential integrity constraints.
 *
 * Error Handling:
 * - 404: Product owner not found - may have already been deleted
 * - 409: Conflict - product owner is associated with other entities
 * - 500: Server error - database or backend issue
 *
 * @param id - The ID of the product owner to delete
 * @returns Promise resolving when deletion is complete (void)
 * @throws {Error} User-friendly error message on failure
 *
 * @example
 * // Delete product owner
 * await deleteProductOwner(123);
 *
 * @example
 * // Handle deletion with error handling
 * try {
 *   await deleteProductOwner(123);
 *   console.log('Product owner deleted successfully');
 * } catch (error) {
 *   if (error.message.includes('associated with')) {
 *     console.error('Cannot delete - still referenced');
 *   }
 * }
 */
export async function deleteProductOwner(id: number): Promise<void> {
  const endpoint = `/product-owners/${id}`;

  // Log API call in development
  devLog.apiCall('DELETE', endpoint);

  try {
    await api.delete(endpoint);

    // Log successful deletion in development
    devLog.info(`Deleted product owner ${id}`);
  } catch (error: any) {
    // Log error in development
    devLog.error('deleteProductOwner', error);

    const statusCode = error.response?.status;

    // Handle not found (404) - product owner doesn't exist
    // May have already been deleted by another user
    if (statusCode === 404) {
      throw new Error('Product owner not found');
    }

    // Handle referential integrity conflicts (409)
    // Cannot delete product owner that is referenced by other entities
    // (e.g., associated with client groups, products, etc.)
    if (statusCode === 409) {
      const detail = error.response.data?.detail;
      if (detail) {
        // Return server's specific message about which entities reference this owner
        throw new Error(detail);
      }
      throw new Error('Cannot delete product owner that is associated with client groups');
    }

    // Handle server errors (500) - database or backend issue
    if (statusCode === 500) {
      throw new Error('Failed to delete product owner. Please try again.');
    }

    // Fallback: Format error using centralized error handler
    throw new Error(formatApiError(error));
  }
}

/**
 * Associates a product owner with a client group
 *
 * Creates a many-to-many relationship between a product owner and client group.
 * This allows the same product owner to be associated with multiple client groups
 * (e.g., a person who is a member of multiple family groups).
 *
 * Business Rules:
 * - A product owner can be associated with multiple client groups
 * - A client group can have multiple product owners
 * - The same association cannot be created twice (409 conflict)
 *
 * Error Handling:
 * - 404: Client group or product owner not found
 * - 409: Association already exists
 * - 500: Server error - database or backend issue
 *
 * @param clientGroupId - The ID of the client group
 * @param productOwnerId - The ID of the product owner to associate
 * @returns Promise resolving when association is created (void)
 * @throws {Error} User-friendly error message on failure
 *
 * @example
 * // Associate product owner 123 with client group 456
 * await associateProductOwner(456, 123);
 *
 * @example
 * // Handle association with error handling
 * try {
 *   await associateProductOwner(clientGroupId, productOwnerId);
 *   console.log('Association created successfully');
 * } catch (error) {
 *   if (error.message.includes('already exists')) {
 *     console.error('Association already exists');
 *   }
 * }
 */
export async function associateProductOwner(
  clientGroupId: number,
  productOwnerId: number
): Promise<void> {
  const endpoint = '/client-group-product-owners';
  const data = {
    client_group_id: clientGroupId,
    product_owner_id: productOwnerId,
  };

  // Log API call in development
  devLog.apiCall('POST', endpoint, data);

  try {
    await api.post(endpoint, data);

    // Log successful association in development
    devLog.info(`Associated product owner ${productOwnerId} with client group ${clientGroupId}`);
  } catch (error: any) {
    // Log error in development
    devLog.error('associateProductOwner', error);

    // Use centralized error formatting for all errors
    // Server will return specific messages for 404, 409, 500, etc.
    throw new Error(formatApiError(error));
  }
}
