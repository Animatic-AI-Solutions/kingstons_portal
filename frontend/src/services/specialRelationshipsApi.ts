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
  RelationshipType,
} from '@/types/specialRelationship';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Filter options for fetching special relationships
 */
export interface SpecialRelationshipFilters {
  /** Filter by relationship type (personal/professional) */
  type?: 'personal' | 'professional';
  /** Filter by relationship status */
  status?: RelationshipStatus;
}

/**
 * Data structure for creating a new special relationship
 */
export interface CreateSpecialRelationshipData {
  client_group_id: string;
  relationship_type: RelationshipType;
  status: RelationshipStatus;
  title?: string | null;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  email?: string | null;
  mobile_phone?: string | null;
  home_phone?: string | null;
  work_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  notes?: string | null;
  company_name?: string | null;
  position?: string | null;
  professional_id?: string | null;
}

/**
 * Data structure for updating an existing special relationship
 */
export interface UpdateSpecialRelationshipData {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  mobile_phone?: string | null;
  home_phone?: string | null;
  work_phone?: string | null;
  status?: RelationshipStatus;
  company_name?: string | null;
  position?: string | null;
  professional_id?: string | null;
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
 * Fetches special relationships for a client group with optional filters
 *
 * @param clientGroupId - Client group ID to fetch relationships for
 * @param filters - Optional filters (type, status)
 * @returns Promise resolving to array of special relationships
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * // Fetch all relationships
 * const relationships = await fetchSpecialRelationships('group-001');
 *
 * @example
 * // Fetch only active personal relationships
 * const activePersonal = await fetchSpecialRelationships('group-001', {
 *   type: 'personal',
 *   status: 'Active'
 * });
 */
export const fetchSpecialRelationships = async (
  clientGroupId: string,
  filters?: SpecialRelationshipFilters
): Promise<SpecialRelationship[]> => {
  try {
    const params: Record<string, string> = {
      client_group_id: clientGroupId,
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
 * @param data - Special relationship data (required: client_group_id, relationship_type, status, first_name, last_name)
 * @returns Promise resolving to created special relationship with generated ID
 * @throws {ApiError} Error with status code and message on API failure (400, 401, 422, 500)
 *
 * @example
 * // Create a personal relationship
 * const spouse = await createSpecialRelationship({
 *   client_group_id: 'group-001',
 *   relationship_type: 'Spouse',
 *   status: 'Active',
 *   first_name: 'Jane',
 *   last_name: 'Doe',
 *   email: 'jane@example.com'
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
 * const updated = await updateSpecialRelationship('rel-001', {
 *   email: 'newemail@example.com',
 *   mobile_phone: '+44-7700-900000'
 * });
 */
export const updateSpecialRelationship = async (
  id: string,
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
 * const updated = await updateSpecialRelationshipStatus('rel-001', 'Inactive');
 */
export const updateSpecialRelationshipStatus = async (
  id: string,
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
 * Deletes a special relationship (soft delete - marks as deleted, doesn't remove from database)
 *
 * @param id - Relationship ID to delete
 * @returns Promise resolving when deletion is complete (void)
 * @throws {ApiError} Error with status code and message on API failure (401, 404, 500)
 *
 * @example
 * // Soft delete a relationship
 * await deleteSpecialRelationship('rel-001');
 */
export const deleteSpecialRelationship = async (id: string): Promise<void> => {
  try {
    await api.delete(`/special_relationships/${id}`);
  } catch (error: any) {
    return handleApiError(error);
  }
};
