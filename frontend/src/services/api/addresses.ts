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
 * Updates an existing address in the database
 * Used when editing product owner address information
 *
 * @param id - Address ID to update
 * @param data - Partial address data with fields to update
 * @returns Promise resolving to updated address with id and created_at
 * @throws Error if API request fails with backend error message
 *
 * @example
 * const updated = await updateAddress(42, {
 *   line_1: '456 New Street',
 *   line_5: 'SW1A 2BB'
 * });
 */
export const updateAddress = async (id: number, data: Partial<AddressFormData>): Promise<Address> => {
  try {
    const response = await api.patch(`/addresses/${id}`, data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to update address';
    throw new Error(`updateAddress: ${message}`);
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

/**
 * Utility: Check if address data has any non-empty fields
 * Used to determine if address creation is needed
 *
 * @param data - Address form data to check
 * @returns True if any field has a non-empty value
 *
 * @example
 * hasAddressData({ line_1: '123 Main St', line_2: '', line_3: '', line_4: '', line_5: '' }) // true
 * hasAddressData({ line_1: '', line_2: '', line_3: '', line_4: '', line_5: '' }) // false
 */
export const hasAddressData = (data: Partial<AddressFormData>): boolean => {
  return Object.values(data).some(
    (value) => value !== null && value !== undefined && value !== ''
  );
};
