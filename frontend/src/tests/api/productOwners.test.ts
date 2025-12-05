/**
 * Product Owners API Integration Tests (RED Phase)
 *
 * Tests for fetching, creating, updating, and deleting product owners
 * with comprehensive error handling and edge cases.
 */

import {
  fetchProductOwnersForClientGroup,
  createProductOwner,
  updateProductOwner,
  deleteProductOwner
} from '@/services/api/productOwners';
import { createProductOwner as createTestProductOwner } from '../factories/productOwnerFactory';
import type { ProductOwner } from '../factories/productOwnerFactory';

// Mock axios
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from '@/services/api';

const mockedApi = api as jest.Mocked<typeof api>;

describe('Product Owners API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchProductOwnersForClientGroup', () => {
    describe('Happy Path', () => {
      it('should fetch product owners for a client group with all fields', async () => {
        const clientGroupId = 1;
        const mockProductOwners = [
          createTestProductOwner(),
          createTestProductOwner(),
        ];

        mockedApi.get.mockResolvedValueOnce({
          data: mockProductOwners,
        });

        const result = await fetchProductOwnersForClientGroup(clientGroupId);

        expect(mockedApi.get).toHaveBeenCalledWith(`/client-groups/${clientGroupId}/product-owners`);
        expect(result).toEqual(mockProductOwners);
        expect(result).toHaveLength(2);
      });

      it('should return empty array when client group has no product owners', async () => {
        const clientGroupId = 999;

        mockedApi.get.mockResolvedValueOnce({
          data: [],
        });

        const result = await fetchProductOwnersForClientGroup(clientGroupId);

        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should include address fields when product owner has address', async () => {
        const clientGroupId = 1;
        const productOwnerWithAddress = createTestProductOwner({
          address_id: 42,
          address_line_1: '123 Main Street',
          address_line_2: 'Apt 4B',
          address_line_3: 'Westminster',
          address_line_4: 'London',
          address_line_5: 'SW1A 1AA',
        });

        mockedApi.get.mockResolvedValueOnce({
          data: [productOwnerWithAddress],
        });

        const result = await fetchProductOwnersForClientGroup(clientGroupId);

        expect(result[0].address_id).toBe(42);
        expect(result[0].address_line_1).toBe('123 Main Street');
        expect(result[0].address_line_5).toBe('SW1A 1AA');
      });
    });

    describe('Error Handling - HTTP Status Codes', () => {
      it('should throw error with user-friendly message on 401 Unauthorized', async () => {
        const clientGroupId = 1;

        mockedApi.get.mockRejectedValueOnce({
          response: {
            status: 401,
            data: {
              detail: 'Unauthorized',
            },
          },
        });

        await expect(fetchProductOwnersForClientGroup(clientGroupId)).rejects.toThrow(
          'Authentication required. Please log in again.'
        );
      });

      it('should throw error with user-friendly message on 403 Forbidden', async () => {
        const clientGroupId = 1;

        mockedApi.get.mockRejectedValueOnce({
          response: {
            status: 403,
            data: {
              detail: 'Forbidden',
            },
          },
        });

        await expect(fetchProductOwnersForClientGroup(clientGroupId)).rejects.toThrow(
          'You do not have permission to access this client group.'
        );
      });

      it('should throw error with user-friendly message on 404 Not Found', async () => {
        const clientGroupId = 999;

        mockedApi.get.mockRejectedValueOnce({
          response: {
            status: 404,
            data: {
              detail: 'Client group not found',
            },
          },
        });

        await expect(fetchProductOwnersForClientGroup(clientGroupId)).rejects.toThrow(
          'Client group not found. It may have been deleted.'
        );
      });

      it('should throw error with user-friendly message on 500 Internal Server Error', async () => {
        const clientGroupId = 1;

        mockedApi.get.mockRejectedValueOnce({
          response: {
            status: 500,
            data: {
              detail: 'Database connection failed',
            },
          },
        });

        await expect(fetchProductOwnersForClientGroup(clientGroupId)).rejects.toThrow(
          'Server error occurred. Please try again later.'
        );
      });
    });

    describe('Error Handling - Network Issues', () => {
      it('should throw error on network timeout', async () => {
        const clientGroupId = 1;

        mockedApi.get.mockRejectedValueOnce({
          code: 'ECONNABORTED',
          message: 'timeout of 30000ms exceeded',
        });

        await expect(fetchProductOwnersForClientGroup(clientGroupId)).rejects.toThrow(
          'Request timeout. Please check your connection and try again.'
        );
      });

      it('should throw error on network failure', async () => {
        const clientGroupId = 1;

        mockedApi.get.mockRejectedValueOnce({
          code: 'ERR_NETWORK',
          message: 'Network Error',
        });

        await expect(fetchProductOwnersForClientGroup(clientGroupId)).rejects.toThrow(
          'Network error. Please check your internet connection.'
        );
      });

      it('should handle malformed JSON response', async () => {
        const clientGroupId = 1;

        mockedApi.get.mockRejectedValueOnce({
          response: {
            status: 200,
            data: 'not valid json',
          },
          message: 'JSON parse error',
        });

        await expect(fetchProductOwnersForClientGroup(clientGroupId)).rejects.toThrow();
      });
    });

    describe('Error Handling - Retry Logic', () => {
      it('should support retry on temporary failures', async () => {
        const clientGroupId = 1;
        const mockProductOwners = [createTestProductOwner()];

        // First attempt fails, second succeeds
        mockedApi.get
          .mockRejectedValueOnce({
            response: {
              status: 503,
              data: { detail: 'Service temporarily unavailable' },
            },
          })
          .mockResolvedValueOnce({
            data: mockProductOwners,
          });

        // Note: This test expects retry logic to be implemented
        await expect(fetchProductOwnersForClientGroup(clientGroupId, { retry: true })).resolves.toEqual(
          mockProductOwners
        );
      });

      it('should not retry on client errors (4xx)', async () => {
        const clientGroupId = 1;

        mockedApi.get.mockRejectedValueOnce({
          response: {
            status: 400,
            data: { detail: 'Bad request' },
          },
        });

        await expect(fetchProductOwnersForClientGroup(clientGroupId, { retry: true })).rejects.toThrow();

        // Should only be called once (no retry on 4xx)
        expect(mockedApi.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('createProductOwner', () => {
    describe('Happy Path', () => {
      it('should successfully create product owner with minimal fields', async () => {
        const newProductOwner = {
          status: 'active' as const,
          firstname: 'John',
          surname: 'Smith',
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

        const mockResponse = {
          data: {
            id: 1,
            ...newProductOwner,
            created_at: '2024-12-05T10:00:00Z',
          },
        };

        mockedApi.post.mockResolvedValueOnce(mockResponse);

        const result = await createProductOwner(newProductOwner);

        expect(mockedApi.post).toHaveBeenCalledWith('/product-owners', newProductOwner);
        expect(result.id).toBe(1);
        expect(result.firstname).toBe('John');
        expect(result.created_at).toBeDefined();
      });

      it('should successfully create product owner with all fields populated', async () => {
        const fullProductOwner = createTestProductOwner();
        const { id, created_at, address_line_1, address_line_2, address_line_3, address_line_4, address_line_5, ...createData } = fullProductOwner;

        const mockResponse = {
          data: fullProductOwner,
        };

        mockedApi.post.mockResolvedValueOnce(mockResponse);

        const result = await createProductOwner(createData);

        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('created_at');
        expect(result.firstname).toBe(createData.firstname);
        expect(result.surname).toBe(createData.surname);
      });
    });

    describe('Error Handling', () => {
      it('should throw error when firstname is missing', async () => {
        const invalidData = {
          status: 'active' as const,
          firstname: '',
          surname: 'Smith',
        } as any;

        mockedApi.post.mockRejectedValueOnce({
          response: {
            status: 422,
            data: {
              detail: 'Firstname is required',
            },
          },
        });

        await expect(createProductOwner(invalidData)).rejects.toThrow('Firstname is required');
      });

      it('should throw error when surname is missing', async () => {
        const invalidData = {
          status: 'active' as const,
          firstname: 'John',
          surname: '',
        } as any;

        mockedApi.post.mockRejectedValueOnce({
          response: {
            status: 422,
            data: {
              detail: 'Surname is required',
            },
          },
        });

        await expect(createProductOwner(invalidData)).rejects.toThrow('Surname is required');
      });

      it('should throw error on duplicate email', async () => {
        const duplicateEmailData = createTestProductOwner();
        const { id, created_at, address_line_1, address_line_2, address_line_3, address_line_4, address_line_5, ...createData } = duplicateEmailData;

        mockedApi.post.mockRejectedValueOnce({
          response: {
            status: 409,
            data: {
              detail: 'Product owner with this email already exists',
            },
          },
        });

        await expect(createProductOwner(createData)).rejects.toThrow(
          'Product owner with this email already exists'
        );
      });

      it('should provide user-friendly error message on server error', async () => {
        const newProductOwner = createTestProductOwner();
        const { id, created_at, address_line_1, address_line_2, address_line_3, address_line_4, address_line_5, ...createData } = newProductOwner;

        mockedApi.post.mockRejectedValueOnce({
          response: {
            status: 500,
            data: {
              detail: 'Internal server error',
            },
          },
        });

        await expect(createProductOwner(createData)).rejects.toThrow(
          'Failed to create product owner. Please try again.'
        );
      });
    });
  });

  describe('updateProductOwner', () => {
    describe('Happy Path', () => {
      it('should successfully update product owner fields', async () => {
        const productOwnerId = 1;
        const updates = {
          firstname: 'Jane',
          surname: 'Doe',
          email_1: 'jane.doe@example.com',
        };

        const mockResponse = {
          data: {
            id: productOwnerId,
            ...updates,
            created_at: '2024-12-05T10:00:00Z',
          },
        };

        mockedApi.patch.mockResolvedValueOnce(mockResponse);

        const result = await updateProductOwner(productOwnerId, updates);

        expect(mockedApi.patch).toHaveBeenCalledWith(`/product-owners/${productOwnerId}`, updates);
        expect(result.firstname).toBe('Jane');
        expect(result.email_1).toBe('jane.doe@example.com');
      });

      it('should successfully update single field', async () => {
        const productOwnerId = 1;
        const updates = {
          phone_1: '+44 7700 900999',
        };

        const mockResponse = {
          data: {
            id: productOwnerId,
            ...createTestProductOwner(),
            ...updates,
          },
        };

        mockedApi.patch.mockResolvedValueOnce(mockResponse);

        const result = await updateProductOwner(productOwnerId, updates);

        expect(result.phone_1).toBe('+44 7700 900999');
      });
    });

    describe('Error Handling', () => {
      it('should throw error when product owner not found', async () => {
        const productOwnerId = 999;
        const updates = { firstname: 'Jane' };

        mockedApi.patch.mockRejectedValueOnce({
          response: {
            status: 404,
            data: {
              detail: 'Product owner not found',
            },
          },
        });

        await expect(updateProductOwner(productOwnerId, updates)).rejects.toThrow(
          'Product owner not found'
        );
      });

      it('should throw error on invalid field value', async () => {
        const productOwnerId = 1;
        const updates = {
          email_1: 'invalid-email',
        };

        mockedApi.patch.mockRejectedValueOnce({
          response: {
            status: 422,
            data: {
              detail: 'Invalid email format',
            },
          },
        });

        await expect(updateProductOwner(productOwnerId, updates)).rejects.toThrow('Invalid email format');
      });

      it('should provide user-friendly error on optimistic locking failure', async () => {
        const productOwnerId = 1;
        const updates = { firstname: 'Jane' };

        mockedApi.patch.mockRejectedValueOnce({
          response: {
            status: 409,
            data: {
              detail: 'Product owner was modified by another user',
            },
          },
        });

        await expect(updateProductOwner(productOwnerId, updates)).rejects.toThrow(
          'Product owner was modified by another user. Please refresh and try again.'
        );
      });
    });
  });

  describe('deleteProductOwner', () => {
    describe('Happy Path', () => {
      it('should successfully delete product owner', async () => {
        const productOwnerId = 1;

        mockedApi.delete.mockResolvedValueOnce({ data: null });

        await deleteProductOwner(productOwnerId);

        expect(mockedApi.delete).toHaveBeenCalledWith(`/product-owners/${productOwnerId}`);
      });
    });

    describe('Error Handling', () => {
      it('should throw error when product owner not found', async () => {
        const productOwnerId = 999;

        mockedApi.delete.mockRejectedValueOnce({
          response: {
            status: 404,
            data: {
              detail: 'Product owner not found',
            },
          },
        });

        await expect(deleteProductOwner(productOwnerId)).rejects.toThrow('Product owner not found');
      });

      it('should throw error when product owner is referenced by client groups', async () => {
        const productOwnerId = 1;

        mockedApi.delete.mockRejectedValueOnce({
          response: {
            status: 409,
            data: {
              detail: 'Cannot delete product owner that is associated with client groups',
            },
          },
        });

        await expect(deleteProductOwner(productOwnerId)).rejects.toThrow(
          'Cannot delete product owner that is associated with client groups'
        );
      });

      it('should provide user-friendly error on deletion failure', async () => {
        const productOwnerId = 1;

        mockedApi.delete.mockRejectedValueOnce({
          response: {
            status: 500,
            data: {
              detail: 'Internal server error',
            },
          },
        });

        await expect(deleteProductOwner(productOwnerId)).rejects.toThrow(
          'Failed to delete product owner. Please try again.'
        );
      });
    });
  });
});
