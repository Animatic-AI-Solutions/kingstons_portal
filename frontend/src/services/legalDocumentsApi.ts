/**
 * Legal Documents API Service
 *
 * Provides API functions for managing legal documents in the
 * Kingston's Portal wealth management system.
 *
 * API Endpoints:
 * - GET /api/legal_documents - Fetch documents with optional filters
 * - POST /api/legal_documents - Create new document
 * - PUT /api/legal_documents/:id - Update existing document
 * - PATCH /api/legal_documents/:id/status - Update document status
 * - DELETE /api/legal_documents/:id - Hard delete document
 *
 * @module services/legalDocumentsApi
 */

import api from '@/services/api';
import { ApiError, handleApiError } from '@/utils/apiError';
import type {
  LegalDocument,
  CreateLegalDocumentData,
  UpdateLegalDocumentData,
  LegalDocumentFilters,
  LegalDocumentStatus,
} from '@/types/legalDocument';

// Re-export ApiError for consumers who import from this module
export { ApiError };

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetches legal documents for a specific product owner with optional filters.
 * Use fetchLegalDocumentsByClientGroup for the more common client group query.
 *
 * @param productOwnerId - Product owner ID to fetch documents for
 * @param filters - Optional filters (type, status)
 * @returns Promise resolving to array of legal documents
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * // Fetch all documents for a product owner
 * const documents = await fetchLegalDocuments(123);
 *
 * @example
 * // Fetch only active Wills for a product owner
 * const activeWills = await fetchLegalDocuments(123, {
 *   type: 'Will',
 *   status: 'Signed'
 * });
 */
export const fetchLegalDocuments = async (
  productOwnerId: number,
  filters?: LegalDocumentFilters
): Promise<LegalDocument[]> => {
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

    const response = await api.get('/legal_documents', { params });
    // Return empty array for null/malformed data for safety
    return response.data ?? [];
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Fetches legal documents for a client group with optional filters.
 * This is the primary query pattern - documents are linked to client groups
 * indirectly through product owners.
 *
 * @param clientGroupId - Client group ID to fetch documents for
 * @param filters - Optional filters (type, status)
 * @returns Promise resolving to array of legal documents
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * // Fetch all documents for a client group
 * const documents = await fetchLegalDocumentsByClientGroup(123);
 *
 * @example
 * // Fetch only active Wills for a client group
 * const activeWills = await fetchLegalDocumentsByClientGroup(123, {
 *   type: 'Will',
 *   status: 'Signed'
 * });
 */
export const fetchLegalDocumentsByClientGroup = async (
  clientGroupId: number,
  filters?: LegalDocumentFilters
): Promise<LegalDocument[]> => {
  try {
    const params: Record<string, string | number> = {
      client_group_id: clientGroupId,
    };

    if (filters?.type) {
      params.type = filters.type;
    }

    if (filters?.status) {
      params.status = filters.status;
    }

    const response = await api.get('/legal_documents', { params });
    // Return empty array for null/malformed data for safety
    return response.data ?? [];
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Creates a new legal document.
 *
 * @param data - Legal document data (required: type, product_owner_ids)
 * @returns Promise resolving to created legal document with generated ID
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * const newDoc = await createLegalDocument({
 *   type: 'Will',
 *   product_owner_ids: [123],
 *   document_date: '2024-06-15',
 *   notes: 'Last Will and Testament'
 * });
 */
export const createLegalDocument = async (
  data: CreateLegalDocumentData
): Promise<LegalDocument> => {
  try {
    const response = await api.post('/legal_documents', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Updates an existing legal document.
 *
 * @param id - Document ID to update
 * @param data - Updated document data (partial update supported)
 * @returns Promise resolving to updated legal document
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * const updated = await updateLegalDocument(1, {
 *   notes: 'Updated notes',
 *   document_date: '2024-07-01'
 * });
 */
export const updateLegalDocument = async (
  id: number,
  data: UpdateLegalDocumentData
): Promise<LegalDocument> => {
  try {
    const response = await api.put(`/legal_documents/${id}`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Updates the status of a legal document (PATCH endpoint).
 *
 * @param id - Document ID to update
 * @param status - New status value (Signed, Registered, or Lapsed)
 * @returns Promise resolving to updated legal document
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * // Lapse a document
 * const lapsed = await updateLegalDocumentStatus(1, 'Lapsed');
 *
 * @example
 * // Reactivate a document
 * const reactivated = await updateLegalDocumentStatus(1, 'Signed');
 */
export const updateLegalDocumentStatus = async (
  id: number,
  status: LegalDocumentStatus
): Promise<LegalDocument> => {
  try {
    const response = await api.patch(`/legal_documents/${id}/status`, { status });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Deletes a legal document (hard delete - permanent removal).
 *
 * @param id - Document ID to delete
 * @returns Promise resolving when deletion is complete
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * await deleteLegalDocument(1);
 */
export const deleteLegalDocument = async (id: number): Promise<void> => {
  try {
    await api.delete(`/legal_documents/${id}`);
  } catch (error) {
    return handleApiError(error);
  }
};
