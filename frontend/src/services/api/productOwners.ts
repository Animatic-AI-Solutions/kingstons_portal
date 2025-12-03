/**
 * Product Owners API Service
 *
 * Handles all HTTP requests for product owner management in the client group creation flow.
 * Provides CRUD operations for product owner records with all 25 fields.
 */

import api from '../api';
import { ProductOwnerFormData } from '@/types/clientGroupForm';

/**
 * Product owner response type includes database-generated fields
 */
export interface ProductOwner extends ProductOwnerFormData {
  id: number;
  created_at: string;
  age: number | null;  // Computed field from dob
}

/**
 * Creates a new product owner in the database
 *
 * @param data - Product owner form data with all 25 fields
 * @returns Promise resolving to created product owner with id, created_at, and computed age
 * @throws Error if API request fails with backend error message
 *
 * @example
 * const productOwner = await createProductOwner({
 *   status: 'active',
 *   firstname: 'John',
 *   surname: 'Smith',
 *   known_as: 'John',
 *   title: 'Mr',
 *   middle_names: 'William',
 *   relationship_status: 'Married',
 *   gender: 'Male',
 *   previous_names: '',
 *   dob: '1980-01-15',
 *   place_of_birth: 'London',
 *   email_1: 'john.smith@example.com',
 *   email_2: '',
 *   phone_1: '07700 900000',
 *   phone_2: '',
 *   moved_in_date: '2010-06-01',
 *   address_id: 42,
 *   three_words: 'reliable professional friendly',
 *   share_data_with: 'spouse',
 *   employment_status: 'Employed',
 *   occupation: 'Software Engineer',
 *   passport_expiry_date: '2030-01-15',
 *   ni_number: 'AB123456C',
 *   aml_result: 'Pass',
 *   aml_date: '2024-01-01'
 * });
 * console.log(productOwner.id); // 123
 * console.log(productOwner.age); // 44 (computed from dob)
 */
export const createProductOwner = async (data: ProductOwnerFormData): Promise<ProductOwner> => {
  try {
    const response = await api.post('/product-owners', data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to create product owner';
    throw new Error(`createProductOwner: ${message}`);
  }
};

/**
 * Deletes a product owner from the database
 * Used for rollback operations when client group creation fails
 *
 * @param id - Product owner ID to delete
 * @returns Promise resolving when deletion is complete
 * @throws Error if API request fails with backend error message
 *
 * @example
 * await deleteProductOwner(123);
 */
export const deleteProductOwner = async (id: number): Promise<void> => {
  try {
    await api.delete(`/product-owners/${id}`);
  } catch (error: any) {
    const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to delete product owner';
    throw new Error(`deleteProductOwner: ${message}`);
  }
};
