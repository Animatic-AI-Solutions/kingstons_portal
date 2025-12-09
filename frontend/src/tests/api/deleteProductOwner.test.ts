/**
 * deleteProductOwner API Service Tests (RED Phase - Iteration 5)
 *
 * Tests for the API service function that handles product owner deletion.
 * This permanently removes a product owner from the system.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @function deleteProductOwner
 * @requirements
 * - Send DELETE request to /product-owners/{id}
 * - Include proper authentication headers
 * - Handle successful deletion (204 No Content)
 * - Handle error responses (404, 403, 409, 500, network errors)
 * - Return user-friendly error messages
 * - Validate product owner ID format
 */

import {
  createLapsedProductOwner,
  createDeceasedProductOwner,
} from '../factories/productOwnerFactory';

// Create mock api object
const mockApi = {
  delete: jest.fn(),
};

// Mock the underlying axios api service
jest.mock('@/services/api', () => mockApi);

// Import after mocking
import { deleteProductOwner } from '@/services/api/deleteProductOwner';

const mockedApi = mockApi;

describe('deleteProductOwner API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =================================================================
  // API Request Tests
  // =================================================================

  describe('API Requests', () => {
    it('sends DELETE request to /product-owners/{id}', async () => {
      const productOwnerId = 123;

      mockedApi.delete.mockResolvedValueOnce({ status: 204 });

      await deleteProductOwner(productOwnerId);

      // Verify DELETE request was made to correct endpoint
      expect(mockedApi.delete).toHaveBeenCalledWith(`/product-owners/${productOwnerId}`);
    });

    it('includes proper authentication headers', async () => {
      const productOwnerId = 456;

      mockedApi.delete.mockResolvedValueOnce({ status: 204 });

      await deleteProductOwner(productOwnerId);

      // Verify DELETE was called (authentication is handled by axios interceptors)
      expect(mockedApi.delete).toHaveBeenCalled();
    });

    it('uses correct endpoint with product owner ID', async () => {
      const productOwnerId = 789;

      mockedApi.delete.mockResolvedValueOnce({ status: 204 });

      await deleteProductOwner(productOwnerId);

      // Verify correct endpoint format
      expect(mockedApi.delete).toHaveBeenCalledWith(`/product-owners/${productOwnerId}`);
    });

    it('works with different product owner IDs', async () => {
      const testIds = [1, 100, 9999, 12345];

      for (const id of testIds) {
        mockedApi.delete.mockResolvedValueOnce({ status: 204 });

        await deleteProductOwner(id);

        expect(mockedApi.delete).toHaveBeenCalledWith(`/product-owners/${id}`);
        jest.clearAllMocks();
      }
    });
  });

  // =================================================================
  // Response Handling Tests
  // =================================================================

  describe('Response Handling', () => {
    it('handles successful deletion (204 No Content)', async () => {
      const productOwnerId = 123;

      mockedApi.delete.mockResolvedValueOnce({ status: 204 });

      const result = await deleteProductOwner(productOwnerId);

      // Verify successful response
      expect(result.status).toBe(204);
    });

    it('returns success response', async () => {
      const productOwnerId = 456;

      mockedApi.delete.mockResolvedValueOnce({
        status: 204,
        statusText: 'No Content',
      });

      const result = await deleteProductOwner(productOwnerId);

      // Verify response structure
      expect(result.status).toBe(204);
      expect(result.statusText).toBe('No Content');
    });

    it('handles empty response body', async () => {
      const productOwnerId = 789;

      mockedApi.delete.mockResolvedValueOnce({
        status: 204,
        data: null,
      });

      const result = await deleteProductOwner(productOwnerId);

      // 204 responses typically have no body
      expect(result.status).toBe(204);
      expect(result.data).toBeNull();
    });

    it('handles successful deletion with 200 OK response', async () => {
      const productOwnerId = 101;

      // Some APIs return 200 OK instead of 204 No Content
      mockedApi.delete.mockResolvedValueOnce({
        status: 200,
        data: { message: 'Product owner deleted successfully' },
      });

      const result = await deleteProductOwner(productOwnerId);

      // Verify successful response
      expect(result.status).toBe(200);
      expect(result.data.message).toContain('deleted');
    });
  });

  // =================================================================
  // Error Handling Tests
  // =================================================================

  describe('Error Handling', () => {
    it('handles 404 not found error (already deleted)', async () => {
      const productOwnerId = 999;

      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            detail: 'Product owner not found',
          },
        },
      });

      await expect(deleteProductOwner(productOwnerId)).rejects.toMatchObject({
        response: {
          status: 404,
        },
      });
    });

    it('handles 403 forbidden error (no permission)', async () => {
      const productOwnerId = 123;

      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            detail: 'You do not have permission to delete this product owner',
          },
        },
      });

      await expect(deleteProductOwner(productOwnerId)).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });

    it('handles 409 conflict error (referenced by other records)', async () => {
      const productOwnerId = 456;

      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            detail: 'Cannot delete product owner - referenced by active products',
          },
        },
      });

      await expect(deleteProductOwner(productOwnerId)).rejects.toMatchObject({
        response: {
          status: 409,
        },
      });
    });

    it('handles 500 server error', async () => {
      const productOwnerId = 789;

      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            detail: 'Internal server error',
          },
        },
      });

      await expect(deleteProductOwner(productOwnerId)).rejects.toMatchObject({
        response: {
          status: 500,
        },
      });
    });

    it('handles network timeout', async () => {
      const productOwnerId = 101;

      mockedApi.delete.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      });

      await expect(deleteProductOwner(productOwnerId)).rejects.toMatchObject({
        code: 'ECONNABORTED',
      });
    });

    it('handles network connection error', async () => {
      const productOwnerId = 202;

      mockedApi.delete.mockRejectedValueOnce({
        code: 'ERR_NETWORK',
        message: 'Network Error',
      });

      await expect(deleteProductOwner(productOwnerId)).rejects.toMatchObject({
        code: 'ERR_NETWORK',
      });
    });

    it('throws user-friendly error message for 404', async () => {
      const productOwnerId = 303;

      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            detail: 'Product owner not found',
          },
        },
        message: 'Request failed with status code 404',
      });

      try {
        await deleteProductOwner(productOwnerId);
        fail('Expected error to be thrown');
      } catch (error: any) {
        // Error should contain user-friendly message
        expect(error.response.status).toBe(404);
        expect(error.response.data.detail).toContain('not found');
      }
    });

    it('throws user-friendly error message for 409 conflict', async () => {
      const productOwnerId = 404;

      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            detail: 'Cannot delete - referenced by other records',
          },
        },
        message: 'Request failed with status code 409',
      });

      try {
        await deleteProductOwner(productOwnerId);
        fail('Expected error to be thrown');
      } catch (error: any) {
        // Error should contain user-friendly message
        expect(error.response.status).toBe(409);
        expect(error.response.data.detail).toContain('Cannot delete');
      }
    });
  });

  // =================================================================
  // Edge Case Tests
  // =================================================================

  describe('Edge Cases', () => {
    it('handles deletion of already-deleted product owner', async () => {
      const productOwnerId = 555;

      // First deletion succeeds
      mockedApi.delete.mockResolvedValueOnce({ status: 204 });
      await deleteProductOwner(productOwnerId);

      // Second deletion returns 404
      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            detail: 'Product owner not found',
          },
        },
      });

      await expect(deleteProductOwner(productOwnerId)).rejects.toMatchObject({
        response: {
          status: 404,
        },
      });
    });

    it('handles concurrent delete attempts', async () => {
      const productOwnerId = 666;

      // Mock API to respond to multiple concurrent requests
      mockedApi.delete
        .mockResolvedValueOnce({ status: 204 }) // First succeeds
        .mockRejectedValueOnce({
          response: {
            status: 404,
            data: { detail: 'Product owner not found' },
          },
        }); // Second fails (already deleted)

      // Fire off multiple concurrent requests
      const promises = [
        deleteProductOwner(productOwnerId),
        deleteProductOwner(productOwnerId),
      ];

      const results = await Promise.allSettled(promises);

      // First should succeed, second should fail
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
    });

    it('validates product owner ID format (positive integer)', async () => {
      const invalidIds = [-1, 0, NaN, Infinity];

      for (const invalidId of invalidIds) {
        mockedApi.delete.mockRejectedValueOnce({
          response: {
            status: 400,
            data: {
              detail: 'Invalid product owner ID',
            },
          },
        });

        await expect(deleteProductOwner(invalidId)).rejects.toMatchObject({
          response: {
            status: 400,
          },
        });
      }
    });

    it('handles missing product owner ID', async () => {
      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            detail: 'Product owner ID is required',
          },
        },
      });

      await expect(deleteProductOwner(null as any)).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });

    it('handles deletion of lapsed product owner', async () => {
      const lapsedProductOwner = createLapsedProductOwner({ id: 777 });

      mockedApi.delete.mockResolvedValueOnce({ status: 204 });

      const result = await deleteProductOwner(lapsedProductOwner.id);

      // Verify successful deletion
      expect(result.status).toBe(204);
      expect(mockedApi.delete).toHaveBeenCalledWith(`/product-owners/${lapsedProductOwner.id}`);
    });

    it('handles deletion of deceased product owner', async () => {
      const deceasedProductOwner = createDeceasedProductOwner({ id: 888 });

      mockedApi.delete.mockResolvedValueOnce({ status: 204 });

      const result = await deleteProductOwner(deceasedProductOwner.id);

      // Verify successful deletion
      expect(result.status).toBe(204);
      expect(mockedApi.delete).toHaveBeenCalledWith(`/product-owners/${deceasedProductOwner.id}`);
    });

    it('preserves error details in thrown exception', async () => {
      const productOwnerId = 999;
      const errorDetail = 'Detailed error message from server';

      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            detail: errorDetail,
          },
        },
        message: 'Request failed',
      });

      try {
        await deleteProductOwner(productOwnerId);
        fail('Expected error to be thrown');
      } catch (error: any) {
        // Error details should be preserved
        expect(error.response.data.detail).toBe(errorDetail);
        expect(error.response.status).toBe(500);
      }
    });
  });
});
