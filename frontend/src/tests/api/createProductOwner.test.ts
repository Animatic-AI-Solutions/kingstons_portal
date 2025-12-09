/**
 * createProductOwner API Tests (RED Phase - Iteration 7)
 *
 * Comprehensive tests for the createProductOwner API function.
 * Tests cover API requests, response handling, error handling, and edge cases.
 *
 * Following TDD RED-GREEN-BLUE methodology.
 * All tests should FAIL until implementation is complete (GREEN phase).
 */

import { createProductOwner } from '@/services/api/productOwners';
import api from '@/services/api';
import type { ProductOwnerCreate } from '@/types/productOwner';

// Mock the api module
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe('createProductOwner API', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    mockPost = api.post as jest.Mock;
    mockPost.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // API Request Tests (4 tests)
  // ============================================================

  describe('API Requests', () => {
    it('sends POST request to /product-owners endpoint', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockResolvedValue({ data: { id: 999, ...data } });

      await createProductOwner(data);

      expect(mockPost).toHaveBeenCalledWith('/product-owners', data);
    });

    it('includes auth headers automatically via api instance', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockResolvedValue({ data: { id: 999, ...data } });

      await createProductOwner(data);

      // Auth headers should be added by api instance interceptors
      expect(mockPost).toHaveBeenCalled();
    });

    it('sends all filled fields in request', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        email_1: 'john@example.com',
        phone_1: '07700900123',
        dob: '1990-01-15',
        known_as: null,
        title: 'Mr',
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        place_of_birth: null,
        email_2: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockResolvedValue({ data: { id: 999, ...data } });

      await createProductOwner(data);

      expect(mockPost).toHaveBeenCalledWith('/product-owners', expect.objectContaining({
        firstname: 'John',
        surname: 'Smith',
        email_1: 'john@example.com',
        phone_1: '07700900123',
        dob: '1990-01-15',
        title: 'Mr',
      }));
    });

    it('requires firstname, surname, client_group_id', async () => {
      const minimalData: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockResolvedValue({ data: { id: 999, ...minimalData } });

      await createProductOwner(minimalData);

      expect(mockPost).toHaveBeenCalledWith('/product-owners', expect.objectContaining({
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
      }));
    });
  });

  // ============================================================
  // Response Handling Tests (4 tests)
  // ============================================================

  describe('Response Handling', () => {
    it('returns 201 Created response', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      const createdProductOwner = {
        id: 999,
        ...data,
        created_at: '2025-01-01T00:00:00Z',
      };

      mockPost.mockResolvedValue({
        status: 201,
        data: createdProductOwner,
      });

      const result = await createProductOwner(data);

      expect(result).toEqual(createdProductOwner);
    });

    it('returns product owner with generated id', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'Jane',
        surname: 'Doe',
        client_group_id: 456,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockResolvedValue({
        data: { id: 888, ...data, created_at: '2025-01-01T00:00:00Z' },
      });

      const result = await createProductOwner(data);

      expect(result).toHaveProperty('id');
      expect(result.id).toBe(888);
    });

    it('returns complete product owner object', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'Complete',
        surname: 'Person',
        client_group_id: 789,
        email_1: 'complete@example.com',
        dob: '1985-05-15',
        known_as: null,
        title: 'Dr',
        middle_names: 'Middle',
        relationship_status: 'Married',
        gender: null,
        previous_names: null,
        place_of_birth: null,
        email_2: null,
        phone_1: '07700900123',
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: 'Doctor',
        passport_expiry_date: null,
        ni_number: 'AB123456C',
        aml_result: null,
        aml_date: null,
      };

      const createdProductOwner = {
        id: 777,
        ...data,
        created_at: '2025-01-01T00:00:00Z',
      };

      mockPost.mockResolvedValue({ data: createdProductOwner });

      const result = await createProductOwner(data);

      expect(result).toEqual(createdProductOwner);
      expect(result.firstname).toBe('Complete');
      expect(result.email_1).toBe('complete@example.com');
      expect(result.occupation).toBe('Doctor');
    });

    it('includes created_at timestamp in response', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockResolvedValue({
        data: { id: 999, ...data, created_at: '2025-01-01T12:34:56Z' },
      });

      const result = await createProductOwner(data);

      expect(result).toHaveProperty('created_at');
      expect(result.created_at).toBe('2025-01-01T12:34:56Z');
    });
  });

  // ============================================================
  // Error Handling Tests (8 tests)
  // ============================================================

  describe('Error Handling', () => {
    it('throws error on 422 validation error', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: '', // Invalid: empty required field
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockRejectedValue({
        response: {
          status: 422,
          data: { detail: 'Validation error: firstname is required' },
        },
      });

      await expect(createProductOwner(data)).rejects.toThrow();
    });

    it('throws error on 409 conflict (duplicate)', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'Duplicate',
        surname: 'Person',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockRejectedValue({
        response: {
          status: 409,
          data: { detail: 'Product owner already exists' },
        },
      });

      await expect(createProductOwner(data)).rejects.toThrow();
    });

    it('throws error on 500 server error', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockRejectedValue({
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      });

      await expect(createProductOwner(data)).rejects.toThrow();
    });

    it('throws error on network error', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockRejectedValue({
        code: 'ERR_NETWORK',
        message: 'Network error',
      });

      await expect(createProductOwner(data)).rejects.toThrow();
    });

    it('provides user-friendly validation error messages', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        email_1: 'invalid-email', // Invalid email format
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockRejectedValue({
        response: {
          status: 422,
          data: { detail: 'Invalid email format' },
        },
      });

      try {
        await createProductOwner(data);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toMatch(/email/i);
      }
    });

    it('provides user-friendly conflict error messages', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockRejectedValue({
        response: {
          status: 409,
          data: { detail: 'Product owner already exists' },
        },
      });

      try {
        await createProductOwner(data);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toMatch(/already exists/i);
      }
    });

    it('provides user-friendly server error messages', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockRejectedValue({
        response: {
          status: 500,
        },
      });

      try {
        await createProductOwner(data);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toMatch(/error|fail/i);
      }
    });

    it('provides user-friendly network error messages', async () => {
      const data: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockRejectedValue({
        code: 'ERR_NETWORK',
        message: 'Network error',
      });

      try {
        await createProductOwner(data);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toMatch(/network|connection/i);
      }
    });
  });

  // ============================================================
  // Edge Cases Tests (4 tests)
  // ============================================================

  describe('Edge Cases', () => {
    it('handles minimal required fields only', async () => {
      const minimalData: ProductOwnerCreate = {
        status: 'active',
        firstname: 'Min',
        surname: 'Person',
        client_group_id: 1,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockResolvedValue({
        data: { id: 111, ...minimalData, created_at: '2025-01-01T00:00:00Z' },
      });

      const result = await createProductOwner(minimalData);

      expect(result).toHaveProperty('id');
      expect(result.firstname).toBe('Min');
      expect(result.surname).toBe('Person');
    });

    it('handles all fields filled', async () => {
      const completeData: ProductOwnerCreate = {
        status: 'active',
        firstname: 'Complete',
        surname: 'Person',
        client_group_id: 999,
        title: 'Dr',
        middle_names: 'Middle',
        relationship_status: 'Married',
        gender: 'Male',
        previous_names: 'OldName',
        dob: '1980-01-15',
        place_of_birth: 'London',
        email_1: 'complete@example.com',
        email_2: 'second@example.com',
        phone_1: '07700900123',
        phone_2: '07700900456',
        moved_in_date: '2020-01-01',
        address_id: 42,
        three_words: 'word1 word2 word3',
        share_data_with: 'Spouse',
        employment_status: 'Employed',
        occupation: 'Doctor',
        passport_expiry_date: '2030-12-31',
        ni_number: 'AB123456C',
        aml_result: 'Pass',
        aml_date: '2024-06-01',
        known_as: 'Doc',
      };

      mockPost.mockResolvedValue({
        data: { id: 222, ...completeData, created_at: '2025-01-01T00:00:00Z' },
      });

      const result = await createProductOwner(completeData);

      expect(result.id).toBe(222);
      expect(result.email_1).toBe('complete@example.com');
      expect(result.occupation).toBe('Doctor');
      expect(result.ni_number).toBe('AB123456C');
    });

    it('validates client_group_id is provided', async () => {
      const dataWithoutClientGroup: any = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        // client_group_id missing
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockRejectedValue({
        response: {
          status: 422,
          data: { detail: 'client_group_id is required' },
        },
      });

      await expect(createProductOwner(dataWithoutClientGroup)).rejects.toThrow();
    });

    it('handles null optional fields correctly', async () => {
      const dataWithNulls: ProductOwnerCreate = {
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        client_group_id: 123,
        known_as: null,
        title: null,
        middle_names: null,
        relationship_status: null,
        gender: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
        moved_in_date: null,
        address_id: null,
        three_words: null,
        share_data_with: null,
        employment_status: null,
        occupation: null,
        passport_expiry_date: null,
        ni_number: null,
        aml_result: null,
        aml_date: null,
      };

      mockPost.mockResolvedValue({
        data: { id: 333, ...dataWithNulls, created_at: '2025-01-01T00:00:00Z' },
      });

      const result = await createProductOwner(dataWithNulls);

      expect(result).toHaveProperty('id');
      expect(result.email_1).toBeNull();
      expect(result.dob).toBeNull();
      expect(result.occupation).toBeNull();
    });
  });
});
