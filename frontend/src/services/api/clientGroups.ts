/**
 * Client Groups API Service
 *
 * Handles all HTTP requests for client group management in the client group creation flow.
 * Provides CRUD operations for client group records with all 10 fields.
 */

import api from '../api';
import { ClientGroupFormData } from '@/types/clientGroupForm';

/**
 * Client group response type includes database-generated fields
 */
export interface ClientGroup extends ClientGroupFormData {
  id: number;
  created_at: string;
}

/**
 * Creates a new client group in the database
 *
 * @param data - Client group form data with all 10 fields
 * @returns Promise resolving to created client group with id and created_at
 * @throws Error if API request fails with backend error message
 *
 * @example
 * const clientGroup = await createClientGroup({
 *   name: 'Smith Family',
 *   type: 'Family',
 *   status: 'active',
 *   ongoing_start: '2024-01-01',
 *   client_declaration: '2024-01-01',
 *   privacy_declaration: '2024-01-01',
 *   full_fee_agreement: '2024-01-01',
 *   last_satisfactory_discussion: '2024-06-01',
 *   notes: 'High net worth family with diverse portfolio'
 * });
 * console.log(clientGroup.id); // 456
 */
export const createClientGroup = async (data: ClientGroupFormData): Promise<ClientGroup> => {
  try {
    // Convert empty strings to null for date and optional fields
    // Backend expects null for empty optional fields, not empty strings
    const transformedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === '' ? null : value,
      ])
    );

    const response = await api.post('/client-groups', transformedData);
    return response.data;
  } catch (error: any) {
    // Extract error message - handle various error formats from FastAPI/Pydantic
    let message = 'Failed to create client group';

    if (error.response?.data) {
      const errorData = error.response.data;

      // Handle Pydantic validation errors (array of errors)
      if (Array.isArray(errorData.detail)) {
        message = errorData.detail
          .map((err: any) => {
            const field = err.loc?.slice(1).join('.') || 'unknown field';
            return `${field}: ${err.msg}`;
          })
          .join('; ');
      }
      // Handle string detail message
      else if (typeof errorData.detail === 'string') {
        message = errorData.detail;
      }
      // Handle object detail (convert to string)
      else if (typeof errorData.detail === 'object') {
        message = JSON.stringify(errorData.detail);
      }
      // Handle message field
      else if (errorData.message) {
        message = errorData.message;
      }
    }

    throw new Error(message);
  }
};

/**
 * Deletes a client group from the database
 * Used for rollback operations when client group creation fails
 *
 * @param id - Client group ID to delete
 * @returns Promise resolving when deletion is complete
 * @throws Error if API request fails with backend error message
 *
 * @example
 * await deleteClientGroup(456);
 */
export const deleteClientGroup = async (id: number): Promise<void> => {
  try {
    await api.delete(`/client-groups/${id}`);
  } catch (error: any) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to delete client group';
    throw new Error(`deleteClientGroup: ${message}`);
  }
};
