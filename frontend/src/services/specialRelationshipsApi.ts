/**
 * Special Relationships API Service (Cycle 2 - Refactored)
 *
 * Provides API functions for managing special relationships (personal and professional)
 * associated with client groups in the Kingston's Portal system.
 *
 * API Endpoints:
 * - GET /api/special_relationships - Fetch relationships with optional filters
 * - POST /api/special_relationships - Create new relationship
 * - PUT /api/special_relationships/:id - Update existing relationship
 * - PATCH /api/special_relationships/:id/status - Update relationship status
 * - DELETE /api/special_relationships/:id - Soft delete relationship
 *
 * @module specialRelationshipsApi
 *
 * Performance Considerations:
 * - TODO: Add request timeout handling with AbortController (defer to later cycle)
 * - TODO: Add request caching headers for GET operations (defer to later cycle)
 * - TODO: Implement retry logic for transient failures (defer to later cycle)
 */

import api from '@/services/api';
import {
  SpecialRelationship,
  SpecialRelationshipFormData,
  RelationshipStatus,
  RelationshipCategory,
} from '@/types/specialRelationship';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Filter options for fetching special relationships
 */
export interface SpecialRelationshipFilters {
  /** Filter by relationship category (Personal/Professional) */
  type?: RelationshipCategory;
  /** Filter by relationship status */
  status?: RelationshipStatus;
}

/**
 * Data structure for creating a new special relationship
 * Uses SpecialRelationshipFormData plus product_owner_ids array
 */
export interface CreateSpecialRelationshipData extends SpecialRelationshipFormData {
  /** Product owner IDs to associate with this relationship */
  product_owner_ids: number[];
}

/**
 * Data structure for updating an existing special relationship
 * All fields are optional for partial updates
 */
export interface UpdateSpecialRelationshipData extends Partial<SpecialRelationshipFormData> {
  /** Update product owner associations (optional) */
  product_owner_ids?: number[];
}

// =============================================================================
// Error Handling Utility
// =============================================================================

/**
 * Custom error class for API-specific errors with enhanced context
 */
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Centralized error handler for API responses
 * Extracts error message from response body and includes response context
 *
 * @param error - Error object from axios
 * @throws {ApiError} Enhanced error with status code and response body
 */
const handleApiError = (error: any): never => {
  const statusCode = error.response?.status;
  const responseBody = error.response?.data;
  const message = responseBody?.message || error.message || 'An unexpected error occurred';

  throw new ApiError(message, statusCode, responseBody);
};

// =============================================================================
// API Service Functions
// =============================================================================

/**
 * Fetches special relationships for a product owner with optional filters
 *
 * @param productOwnerId - Product owner ID to fetch relationships for
 * @param filters - Optional filters (type, status)
 * @returns Promise resolving to array of special relationships
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * // Fetch all relationships
 * const relationships = await fetchSpecialRelationships(123);
 *
 * @example
 * // Fetch only active personal relationships
 * const activePersonal = await fetchSpecialRelationships(123, {
 *   type: 'Personal',
 *   status: 'Active'
 * });
 */
export const fetchSpecialRelationships = async (
  productOwnerId: number,
  filters?: SpecialRelationshipFilters
): Promise<SpecialRelationship[]> => {
  try {
    const params: Record<string, string | number> = {
      product_owner_id: productOwnerId,
    };

    if (filters?.type) {
      params.type = filters.type;
    }

    if (filters?.status) {
      params.status = filters.status;
    }

    const response = await api.get('/special_relationships', { params });
    return response.data;
  } catch (error: any) {
    return handleApiError(error);
  }
};

/**
 * Creates a new special relationship
 *
 * @param data - Special relationship data (required: product_owner_ids, type, relationship, status, name)
 * @returns Promise resolving to created special relationship with generated ID
 * @throws {ApiError} Error with status code and message on API failure (400, 401, 422, 500)
 *
 * @example
 * // Create a personal relationship
 * const spouse = await createSpecialRelationship({
 *   product_owner_ids: [123],
 *   name: 'Jane Doe',
 *   type: 'Personal',
 *   relationship: 'Spouse',
 *   status: 'Active',
 *   email: 'jane@example.com',
 *   dependency: false
 * });
 *
 * @example
 * // Create a professional relationship
 * const accountant = await createSpecialRelationship({
 *   product_owner_ids: [123, 456],
 *   name: 'Robert Johnson',
 *   type: 'Professional',
 *   relationship: 'Accountant',
 *   status: 'Active',
 *   firm_name: 'Accounting Partners Ltd',
 *   email: 'rjohnson@accountingpartners.com'
 * });
 */
export const createSpecialRelationship = async (
  data: CreateSpecialRelationshipData
): Promise<SpecialRelationship> => {
  try {
    const response = await api.post('/special_relationships', data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error);
  }
};

/**
 * Updates an existing special relationship
 *
 * @param id - Relationship ID to update
 * @param data - Updated relationship data (partial update supported)
 * @returns Promise resolving to updated special relationship
 * @throws {ApiError} Error with status code and message on API failure (401, 404, 422)
 *
 * @example
 * // Update contact information
 * const updated = await updateSpecialRelationship(123, {
 *   email: 'newemail@example.com',
 *   phone_number: '+44-7700-900000'
 * });
 *
 * @example
 * // Update professional firm name
 * const updated = await updateSpecialRelationship(456, {
 *   firm_name: 'New Accounting Firm Ltd'
 * });
 */
export const updateSpecialRelationship = async (
  id: number,
  data: UpdateSpecialRelationshipData
): Promise<SpecialRelationship> => {
  try {
    const response = await api.put(`/special_relationships/${id}`, data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error);
  }
};

/**
 * Updates the status of a special relationship (PATCH endpoint for status-only changes)
 *
 * @param id - Relationship ID to update
 * @param status - New status value (Active, Inactive, or Deceased)
 * @returns Promise resolving to updated special relationship
 * @throws {ApiError} Error with status code and message on API failure (401, 404, 422)
 *
 * @example
 * // Mark relationship as inactive
 * const updated = await updateSpecialRelationshipStatus(123, 'Inactive');
 */
export const updateSpecialRelationshipStatus = async (
  id: number,
  status: RelationshipStatus
): Promise<SpecialRelationship> => {
  try {
    const response = await api.patch(`/special_relationships/${id}/status`, {
      status,
    });
    return response.data;
  } catch (error: any) {
    return handleApiError(error);
  }
};

/**
 * Deletes a special relationship (hard delete - permanently removes from database)
 *
 * @param id - Relationship ID to delete
 * @returns Promise resolving when deletion is complete (void)
 * @throws {ApiError} Error with status code and message on API failure (401, 404, 500)
 *
 * @example
 * // Delete a relationship
 * await deleteSpecialRelationship(123);
 */
export const deleteSpecialRelationship = async (id: number): Promise<void> => {
  try {
    await api.delete(`/special_relationships/${id}`);
  } catch (error: any) {
    return handleApiError(error);
  }
};
