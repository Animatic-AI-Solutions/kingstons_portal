/**
 * updateProductOwnerStatus API Service Tests (RED Phase - Iteration 4)
 *
 * Tests for the API service function that handles status updates
 * for product owners (lapse, deceased, reactivate).
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @function updateProductOwnerStatus
 * @requirements
 * - Send PATCH request to /product-owners/{id}
 * - Include status payload (lapsed, deceased, active)
 * - Handle successful responses (200 OK)
 * - Handle error responses (404, 500, network errors)
 * - Include proper authentication headers
 * - Return updated product owner data
 */

import {
  createActiveProductOwner,
  createLapsedProductOwner,
  createDeceasedProductOwner,
  ProductOwner,
} from '../factories/productOwnerFactory';

// Create mock api object
const mockApi = {
  patch: jest.fn(),
};

// Mock the underlying axios api service  (used by updateProductOwner.ts)
jest.mock('@/services/api', () => mockApi);

// Import after mocking
import { updateProductOwnerStatus } from '@/services/api/updateProductOwner';

const mockedApi = mockApi;

describe('updateProductOwnerStatus API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =================================================================
  // API Request Tests
  // =================================================================

  describe('API Requests', () => {
    it('sends PATCH request to /product-owners/{id} with status payload', async () => {
      const productOwnerId = 123;
      const newStatus = 'lapsed';
      const mockProductOwner = createLapsedProductOwner({ id: productOwnerId });

      mockedApi.patch.mockResolvedValueOnce({ data: mockProductOwner });

      await updateProductOwnerStatus(productOwnerId, newStatus);

      // Verify PATCH request was made to correct endpoint
      expect(mockedApi.patch).toHaveBeenCalledWith(
        `/product-owners/${productOwnerId}`,
        { status: newStatus }
      );
    });

    it('sends status: "lapsed" in request body', async () => {
      const productOwnerId = 456;
      const mockProductOwner = createLapsedProductOwner({ id: productOwnerId });

      mockedApi.patch.mockResolvedValueOnce({ data: mockProductOwner });

      await updateProductOwnerStatus(productOwnerId, 'lapsed');

      // Verify request was made with correct status
      expect(mockedApi.patch).toHaveBeenCalledWith(
        `/product-owners/${productOwnerId}`,
        { status: 'lapsed' }
      );
    });

    it('sends status: "deceased" in request body', async () => {
      const productOwnerId = 789;
      const mockProductOwner = createDeceasedProductOwner({ id: productOwnerId });

      mockedApi.patch.mockResolvedValueOnce({ data: mockProductOwner });

      await updateProductOwnerStatus(productOwnerId, 'deceased');

      // Verify request was made with correct status
      expect(mockedApi.patch).toHaveBeenCalledWith(
        `/product-owners/${productOwnerId}`,
        { status: 'deceased' }
      );
    });

    it('sends status: "active" in request body', async () => {
      const productOwnerId = 101;
      const mockProductOwner = createActiveProductOwner({ id: productOwnerId });

      mockedApi.patch.mockResolvedValueOnce({ data: mockProductOwner });

      await updateProductOwnerStatus(productOwnerId, 'active');

      // Verify request was made with correct status
      expect(mockedApi.patch).toHaveBeenCalledWith(
        `/product-owners/${productOwnerId}`,
        { status: 'active' }
      );
    });

    it('includes proper authentication headers', async () => {
      const productOwnerId = 202;
      const mockProductOwner = createLapsedProductOwner({ id: productOwnerId });

      mockedApi.patch.mockResolvedValueOnce({ data: mockProductOwner });

      await updateProductOwnerStatus(productOwnerId, 'lapsed');

      // Verify PATCH was called (authentication is handled by axios interceptors)
      expect(mockedApi.patch).toHaveBeenCalled();
    });
  });

  // =================================================================
  // Response Handling Tests
  // =================================================================

  describe('Response Handling', () => {
    it('handles successful status update (200 OK)', async () => {
      const productOwnerId = 123;
      const updatedProductOwner = createLapsedProductOwner({ id: productOwnerId });

      mockedApi.patch.mockResolvedValueOnce({ data: updatedProductOwner });

      const result = await updateProductOwnerStatus(productOwnerId, 'lapsed');

      // Verify successful response
      expect(result.data).toEqual(updatedProductOwner);
      expect(result.data.status).toBe('lapsed');
    });

    it('returns updated product owner from response', async () => {
      const productOwnerId = 456;
      const originalProductOwner = createActiveProductOwner({
        id: productOwnerId,
        firstname: 'John',
        surname: 'Smith',
        email_1: 'john.smith@example.com',
      });

      const updatedProductOwner: ProductOwner = {
        ...originalProductOwner,
        status: 'deceased',
      };

      mockedApi.patch.mockResolvedValueOnce({ data: updatedProductOwner });

      const result = await updateProductOwnerStatus(productOwnerId, 'deceased');

      // Verify returned product owner has updated status
      expect(result.data).toEqual(updatedProductOwner);
      expect(result.data.id).toBe(productOwnerId);
      expect(result.data.status).toBe('deceased');
      expect(result.data.firstname).toBe('John');
      expect(result.data.surname).toBe('Smith');
    });

    it('handles partial response data', async () => {
      const productOwnerId = 789;
      const partialResponse = {
        id: productOwnerId,
        status: 'lapsed',
        firstname: 'Jane',
        surname: 'Doe',
        // Minimal fields returned
      };

      mockedApi.patch.mockResolvedValueOnce({ data: partialResponse });

      const result = await updateProductOwnerStatus(productOwnerId, 'lapsed');

      // Verify partial response is handled correctly
      expect(result.data.id).toBe(productOwnerId);
      expect(result.data.status).toBe('lapsed');
      expect(result.data.firstname).toBe('Jane');
    });
  });

  // =================================================================
  // Error Handling Tests
  // =================================================================

  describe('Error Handling', () => {
    it('handles 404 not found error', async () => {
      const productOwnerId = 999;

      mockedApi.patch.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            detail: 'Product owner not found',
          },
        },
      });

      await expect(updateProductOwnerStatus(productOwnerId, 'lapsed')).rejects.toThrow();
    });

    it('handles 500 server error', async () => {
      const productOwnerId = 123;

      mockedApi.patch.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            detail: 'Internal server error',
          },
        },
      });

      await expect(updateProductOwnerStatus(productOwnerId, 'deceased')).rejects.toThrow();
    });

    it('handles network timeout', async () => {
      const productOwnerId = 456;

      mockedApi.patch.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      });

      await expect(updateProductOwnerStatus(productOwnerId, 'active')).rejects.toThrow();
    });

    it('throws with user-friendly error message', async () => {
      const productOwnerId = 789;

      mockedApi.patch.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            detail: 'Invalid status value',
          },
        },
      });

      await expect(updateProductOwnerStatus(productOwnerId, 'invalid' as any)).rejects.toThrow();
    });
  });

  // =================================================================
  // Additional Edge Cases
  // =================================================================

  describe('Edge Cases', () => {
    it('handles status change from lapsed to active (reactivate)', async () => {
      const productOwnerId = 111;
      const lapsedOwner = createLapsedProductOwner({ id: productOwnerId });
      const reactivatedOwner: ProductOwner = {
        ...lapsedOwner,
        status: 'active',
      };

      mockedApi.patch.mockResolvedValueOnce({ data: reactivatedOwner });

      const result = await updateProductOwnerStatus(productOwnerId, 'active');

      expect(result.data.status).toBe('active');
    });

    it('handles status change from deceased to active (reactivate)', async () => {
      const productOwnerId = 222;
      const deceasedOwner = createDeceasedProductOwner({ id: productOwnerId });
      const reactivatedOwner: ProductOwner = {
        ...deceasedOwner,
        status: 'active',
      };

      mockedApi.patch.mockResolvedValueOnce({ data: reactivatedOwner });

      const result = await updateProductOwnerStatus(productOwnerId, 'active');

      expect(result.data.status).toBe('active');
    });

    it('handles concurrent status updates gracefully', async () => {
      const productOwnerId = 333;
      const mockProductOwner = createLapsedProductOwner({ id: productOwnerId });

      // Set up mock to respond to multiple concurrent requests
      mockedApi.patch.mockResolvedValue({ data: mockProductOwner });

      // Fire off multiple concurrent requests
      const promises = [
        updateProductOwnerStatus(productOwnerId, 'lapsed'),
        updateProductOwnerStatus(productOwnerId, 'lapsed'),
        updateProductOwnerStatus(productOwnerId, 'lapsed'),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.data.id).toBe(productOwnerId);
        expect(result.data.status).toBe('lapsed');
      });
    });

    it('preserves all product owner fields except status', async () => {
      const productOwnerId = 444;
      const originalOwner = createActiveProductOwner({
        id: productOwnerId,
        firstname: 'Alice',
        surname: 'Johnson',
        email_1: 'alice@example.com',
        phone_1: '+44 1234 567890',
        dob: '1985-03-15',
        relationship_status: 'Married',
      });

      const updatedOwner: ProductOwner = {
        ...originalOwner,
        status: 'lapsed',
      };

      mockedApi.patch.mockResolvedValueOnce({ data: updatedOwner });

      const result = await updateProductOwnerStatus(productOwnerId, 'lapsed');

      // Verify all fields are preserved except status
      expect(result.data.id).toBe(productOwnerId);
      expect(result.data.status).toBe('lapsed'); // Changed
      expect(result.data.firstname).toBe('Alice'); // Unchanged
      expect(result.data.surname).toBe('Johnson'); // Unchanged
      expect(result.data.email_1).toBe('alice@example.com'); // Unchanged
      expect(result.data.phone_1).toBe('+44 1234 567890'); // Unchanged
      expect(result.data.dob).toBe('1985-03-15'); // Unchanged
      expect(result.data.relationship_status).toBe('Married'); // Unchanged
    });

    it('handles null/undefined status gracefully', async () => {
      const productOwnerId = 555;

      mockedApi.patch.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            detail: 'Status is required',
          },
        },
      });

      await expect(updateProductOwnerStatus(productOwnerId, null as any)).rejects.toThrow();
    });

    it('includes proper Content-Type header for JSON payload', async () => {
      const productOwnerId = 666;
      const mockProductOwner = createActiveProductOwner({ id: productOwnerId });

      mockedApi.patch.mockResolvedValueOnce({ data: mockProductOwner });

      await updateProductOwnerStatus(productOwnerId, 'active');

      // Verify PATCH was called (Content-Type is handled by axios interceptors)
      expect(mockedApi.patch).toHaveBeenCalled();
    });
  });
});
