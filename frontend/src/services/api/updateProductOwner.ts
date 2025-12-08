/**
 * Product Owner Status Update API Service
 *
 * Handles status update operations for product owners (lapse, deceased, reactivate).
 * This service provides a dedicated function for status changes to support the
 * ProductOwnerActions component with proper error handling and type safety.
 *
 * Features:
 * - Type-safe status updates with TypeScript
 * - User-friendly error messages
 * - Automatic axios interceptor handling (authentication, /api prefix)
 *
 * @module services/api/updateProductOwner
 */

import api from '../api';
import type { ProductOwner } from '@/types/productOwner';
import { formatApiError } from '@/utils/errorHandling';

/**
 * Updates product owner status
 *
 * Sends PATCH request to update the status field of a product owner.
 * Supports three status transitions:
 * - active → lapsed (Lapse operation)
 * - active → deceased (Make Deceased operation)
 * - lapsed/deceased → active (Reactivate operation)
 *
 * Error Handling:
 * - 404: Product owner not found - may have been deleted
 * - 422: Validation error - invalid status value
 * - 409: Conflict - modified by another user (optimistic locking)
 * - 500: Server error - database or backend issue
 *
 * @param id - The ID of the product owner to update
 * @param status - New status value ('active', 'lapsed', or 'deceased')
 * @returns Promise resolving to updated product owner with all fields
 * @throws {Error} User-friendly error message on failure
 *
 * @example
 * // Lapse an active product owner
 * const updated = await updateProductOwnerStatus(123, 'lapsed');
 *
 * @example
 * // Mark product owner as deceased
 * const updated = await updateProductOwnerStatus(456, 'deceased');
 *
 * @example
 * // Reactivate a lapsed product owner
 * const updated = await updateProductOwnerStatus(789, 'active');
 */
export async function updateProductOwnerStatus(
  id: number,
  status: 'active' | 'lapsed' | 'deceased'
): Promise<{ data: ProductOwner }> {
  try {
    // Send PATCH request with status payload
    // axios interceptor will add /api prefix and authentication headers
    const response = await api.patch(`/product-owners/${id}`, { status });

    // Return full response object to match test expectations
    return response;
  } catch (error: any) {
    // Format error using centralized error handler for user-friendly messages
    throw new Error(formatApiError(error));
  }
}
