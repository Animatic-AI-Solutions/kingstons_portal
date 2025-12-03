/**
 * Client Group Product Owners Junction API Service
 *
 * Handles all HTTP requests for managing the many-to-many relationship between
 * client groups and product owners. This junction table links product owners to
 * client groups, allowing multiple owners per group.
 */

import api from '../api';

/**
 * Request data for creating a client group product owner junction record
 */
export interface ClientGroupProductOwnerRequest {
  client_group_id: number;
  product_owner_id: number;
}

/**
 * Client group product owner junction response type includes database-generated fields
 */
export interface ClientGroupProductOwner extends ClientGroupProductOwnerRequest {
  id: number;
  created_at: string;
}

/**
 * Creates a new client group product owner junction record
 * Links a product owner to a client group in the many-to-many relationship
 *
 * @param data - Junction data with client_group_id and product_owner_id
 * @returns Promise resolving to created junction record with id and created_at
 * @throws Error if API request fails with backend error message
 *
 * @example
 * const junction = await createClientGroupProductOwner({
 *   client_group_id: 456,
 *   product_owner_id: 123
 * });
 * console.log(junction.id); // 789
 */
export const createClientGroupProductOwner = async (
  data: ClientGroupProductOwnerRequest
): Promise<ClientGroupProductOwner> => {
  try {
    const response = await api.post('/client-group-product-owners', data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to create client group product owner junction';
    throw new Error(`createClientGroupProductOwner: ${message}`);
  }
};

/**
 * Deletes a client group product owner junction record
 * Removes the link between a product owner and a client group
 * Used for rollback operations when client group creation fails
 *
 * @param id - Junction record ID to delete
 * @returns Promise resolving when deletion is complete
 * @throws Error if API request fails with backend error message
 *
 * @example
 * await deleteClientGroupProductOwner(789);
 */
export const deleteClientGroupProductOwner = async (id: number): Promise<void> => {
  try {
    await api.delete(`/client-group-product-owners/${id}`);
  } catch (error: any) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to delete client group product owner junction';
    throw new Error(`deleteClientGroupProductOwner: ${message}`);
  }
};
