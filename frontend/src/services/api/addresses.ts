/**
 * Addresses API Service
 *
 * Handles all HTTP requests for address management in the client group creation flow.
 * Provides CRUD operations for address records.
 */

import api from '../api';
import { AddressFormData } from '@/types/clientGroupForm';

/**
 * Address response type includes database-generated fields
 */
export interface Address extends AddressFormData {
  id: number;
  created_at: string;
}

/**
 * Creates a new address in the database
 *
 * @param data - Address form data with all 5 address lines
 * @returns Promise resolving to created address with id and created_at
 * @throws Error if API request fails with backend error message
 *
 * @example
 * const address = await createAddress({
 *   line_1: '123 Main St',
 *   line_2: 'Apt 4B',
 *   line_3: '',
 *   line_4: 'London',
 *   line_5: 'SW1A 1AA'
 * });
 * console.log(address.id); // 42
 */
export const createAddress = async (data: AddressFormData): Promise<Address> => {
  try {
    const response = await api.post('/addresses', data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to create address';
    throw new Error(`createAddress: ${message}`);
  }
};

/**
 * Deletes an address from the database
 * Used for rollback operations when client group creation fails
 *
 * @param id - Address ID to delete
 * @returns Promise resolving when deletion is complete
 * @throws Error if API request fails with backend error message
 *
 * @example
 * await deleteAddress(42);
 */
export const deleteAddress = async (id: number): Promise<void> => {
  try {
    await api.delete(`/addresses/${id}`);
  } catch (error: any) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to delete address';
    throw new Error(`deleteAddress: ${message}`);
  }
};
