/**
 * Legal Documents API Service Tests (TDD Cycle 2)
 *
 * TDD Red Phase: These tests define expected behavior for the API service layer
 * that does not yet exist. All tests should FAIL initially.
 *
 * Coverage:
 * - fetchLegalDocuments (GET /legal_documents)
 * - fetchLegalDocumentsByClientGroup (GET /legal_documents by client_group_id)
 * - createLegalDocument (POST /legal_documents)
 * - updateLegalDocument (PUT /legal_documents/:id)
 * - updateLegalDocumentStatus (PATCH /legal_documents/:id/status)
 * - deleteLegalDocument (DELETE /legal_documents/:id)
 *
 * Error scenarios:
 * - 400 Bad Request (validation errors)
 * - 401 Unauthorized (authentication failures)
 * - 404 Not Found (resource not found)
 * - 422 Validation Error (detailed field errors)
 * - 500 Internal Server Error (server failures)
 *
 * @module tests/services/legalDocumentsApi.test
 */

import {
  fetchLegalDocuments,
  fetchLegalDocumentsByClientGroup,
  createLegalDocument,
  updateLegalDocument,
  updateLegalDocumentStatus,
  deleteLegalDocument,
} from '@/services/legalDocumentsApi';

import type {
  LegalDocument,
  CreateLegalDocumentData,
  UpdateLegalDocumentData,
  LegalDocumentStatus,
} from '@/types/legalDocument';

// Mock the API module
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from '@/services/api';

const mockedApi = api as jest.Mocked<typeof api>;

// =============================================================================
// Test Data Factories
// =============================================================================

/**
 * Creates a mock LegalDocument for testing
 */
function createMockLegalDocument(
  overrides: Partial<LegalDocument> = {}
): LegalDocument {
  return {
    id: 1,
    type: 'Will',
    document_date: '2024-01-15',
    status: 'Signed',
    notes: 'Test notes',
    product_owner_ids: [123, 456],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Creates an array of mock LegalDocuments for testing
 */
function createMockLegalDocumentArray(
  count: number,
  overrides: Partial<LegalDocument> = {}
): LegalDocument[] {
  return Array.from({ length: count }, (_, index) =>
    createMockLegalDocument({
      id: index + 1,
      ...overrides,
    })
  );
}

describe('Legal Documents API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // fetchLegalDocuments - GET /legal_documents
  // ===========================================================================
  describe('fetchLegalDocuments', () => {
    const productOwnerId = 123;

    it('should fetch all documents for a product owner', async () => {
      const mockDocuments = createMockLegalDocumentArray(3, {
        product_owner_ids: [productOwnerId],
      });

      mockedApi.get.mockResolvedValueOnce({
        data: mockDocuments,
      });

      const result = await fetchLegalDocuments(productOwnerId);

      expect(mockedApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { product_owner_id: productOwnerId },
      });
      expect(result).toEqual(mockDocuments);
      expect(result).toHaveLength(3);
    });

    it('should apply type filter when provided', async () => {
      const mockDocuments = [createMockLegalDocument({ type: 'Will' })];

      mockedApi.get.mockResolvedValueOnce({
        data: mockDocuments,
      });

      const result = await fetchLegalDocuments(productOwnerId, { type: 'Will' });

      expect(mockedApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { product_owner_id: productOwnerId, type: 'Will' },
      });
      expect(result).toEqual(mockDocuments);
    });

    it('should apply status filter when provided', async () => {
      const mockDocuments = [createMockLegalDocument({ status: 'Signed' })];

      mockedApi.get.mockResolvedValueOnce({
        data: mockDocuments,
      });

      const result = await fetchLegalDocuments(productOwnerId, { status: 'Signed' });

      expect(mockedApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { product_owner_id: productOwnerId, status: 'Signed' },
      });
      expect(result).toEqual(mockDocuments);
    });

    it('should apply multiple filters when provided', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: [],
      });

      await fetchLegalDocuments(productOwnerId, { type: 'Will', status: 'Signed' });

      expect(mockedApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { product_owner_id: productOwnerId, type: 'Will', status: 'Signed' },
      });
    });

    it('should return empty array when no documents exist', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: [],
      });

      const result = await fetchLegalDocuments(productOwnerId);

      expect(result).toEqual([]);
    });

    it('should throw error on unauthorized access (401)', async () => {
      mockedApi.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: 'Unauthorized',
            message: 'Authentication credentials were not provided or are invalid',
          },
        },
      });

      await expect(fetchLegalDocuments(productOwnerId)).rejects.toThrow(
        'Authentication credentials were not provided or are invalid'
      );
    });

    it('should throw error on server failure (500)', async () => {
      mockedApi.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: 'InternalServerError',
            message: 'Database error',
          },
        },
      });

      await expect(fetchLegalDocuments(productOwnerId)).rejects.toThrow('Database error');
    });
  });

  // ===========================================================================
  // fetchLegalDocumentsByClientGroup - GET /legal_documents by client_group_id
  // ===========================================================================
  describe('fetchLegalDocumentsByClientGroup', () => {
    const sampleDocument = createMockLegalDocument();
    const sampleDocuments = createMockLegalDocumentArray(3);

    it('should fetch all documents for a client group', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: sampleDocuments });

      const result = await fetchLegalDocumentsByClientGroup(456);

      expect(mockedApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { client_group_id: 456 },
      });
      expect(result).toEqual(sampleDocuments);
    });

    it('should apply type filter when provided', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [sampleDocument] });

      await fetchLegalDocumentsByClientGroup(456, { type: 'Will' });

      expect(mockedApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { client_group_id: 456, type: 'Will' },
      });
    });

    it('should apply status filter when provided', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [sampleDocument] });

      await fetchLegalDocumentsByClientGroup(456, { status: 'Signed' });

      expect(mockedApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { client_group_id: 456, status: 'Signed' },
      });
    });

    it('should apply multiple filters when provided', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await fetchLegalDocumentsByClientGroup(456, { type: 'Will', status: 'Signed' });

      expect(mockedApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { client_group_id: 456, type: 'Will', status: 'Signed' },
      });
    });

    it('should return empty array when no documents found', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      const result = await fetchLegalDocumentsByClientGroup(456);

      expect(result).toEqual([]);
    });

    it('should throw ApiError on 404 client group not found', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { detail: 'Client group not found' },
        },
      };
      mockedApi.get.mockRejectedValueOnce(errorResponse);

      await expect(fetchLegalDocumentsByClientGroup(999)).rejects.toThrow('Client group not found');
    });

    it('should throw ApiError on 500 server error', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };
      mockedApi.get.mockRejectedValueOnce(errorResponse);

      await expect(fetchLegalDocumentsByClientGroup(456)).rejects.toThrow('Internal server error');
    });
  });

  // ===========================================================================
  // createLegalDocument - POST /legal_documents
  // ===========================================================================
  describe('createLegalDocument', () => {
    const createData: CreateLegalDocumentData = {
      type: 'Will',
      product_owner_ids: [123],
      document_date: '2024-06-15',
      notes: 'New document',
    };

    it('should create a new document with all fields', async () => {
      const mockCreatedDocument = createMockLegalDocument({
        id: 101,
        ...createData,
        status: 'Signed',
        created_at: '2024-12-11T15:30:00Z',
        updated_at: '2024-12-11T15:30:00Z',
      });

      mockedApi.post.mockResolvedValueOnce({
        data: mockCreatedDocument,
      });

      const result = await createLegalDocument(createData);

      expect(mockedApi.post).toHaveBeenCalledWith('/legal_documents', createData);
      expect(result.id).toBe(101);
      expect(result.type).toBe('Will');
      expect(result.status).toBe('Signed');
    });

    it('should create a document with minimal required fields', async () => {
      const minimalData: CreateLegalDocumentData = {
        type: 'EPA',
        product_owner_ids: [456],
      };

      const mockCreatedDocument = createMockLegalDocument({
        id: 102,
        type: 'EPA',
        product_owner_ids: [456],
        document_date: null,
        notes: null,
        status: 'Signed',
      });

      mockedApi.post.mockResolvedValueOnce({
        data: mockCreatedDocument,
      });

      const result = await createLegalDocument(minimalData);

      expect(mockedApi.post).toHaveBeenCalledWith('/legal_documents', minimalData);
      expect(result.id).toBe(102);
      expect(result.type).toBe('EPA');
    });

    it('should create a document with custom type', async () => {
      const customTypeData: CreateLegalDocumentData = {
        type: 'Custom: Family Trust Agreement',
        product_owner_ids: [123, 456],
      };

      const mockCreatedDocument = createMockLegalDocument({
        id: 103,
        type: 'Custom: Family Trust Agreement',
        product_owner_ids: [123, 456],
      });

      mockedApi.post.mockResolvedValueOnce({
        data: mockCreatedDocument,
      });

      const result = await createLegalDocument(customTypeData);

      expect(result.type).toBe('Custom: Family Trust Agreement');
    });

    it('should create a document with multiple product owners', async () => {
      const multiOwnerData: CreateLegalDocumentData = {
        type: 'Will',
        product_owner_ids: [123, 456, 789],
      };

      const mockCreatedDocument = createMockLegalDocument({
        id: 104,
        product_owner_ids: [123, 456, 789],
      });

      mockedApi.post.mockResolvedValueOnce({
        data: mockCreatedDocument,
      });

      const result = await createLegalDocument(multiOwnerData);

      expect(result.product_owner_ids).toEqual([123, 456, 789]);
    });

    it('should throw validation error when type is missing (422)', async () => {
      const invalidData = {
        product_owner_ids: [123],
      };

      mockedApi.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            error: 'ValidationError',
            message: 'Request validation failed',
            details: {
              type: 'Type is required',
            },
          },
        },
      });

      await expect(
        createLegalDocument(invalidData as CreateLegalDocumentData)
      ).rejects.toThrow('Request validation failed');
    });

    it('should throw validation error when product_owner_ids is empty (422)', async () => {
      const invalidData: CreateLegalDocumentData = {
        type: 'Will',
        product_owner_ids: [],
      };

      mockedApi.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            error: 'ValidationError',
            message: 'Request validation failed',
            details: {
              product_owner_ids: 'At least one product owner is required',
            },
          },
        },
      });

      await expect(createLegalDocument(invalidData)).rejects.toThrow(
        'Request validation failed'
      );
    });

    it('should throw error when product owner not found (404)', async () => {
      const dataWithInvalidOwner: CreateLegalDocumentData = {
        type: 'Will',
        product_owner_ids: [99999],
      };

      mockedApi.post.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            error: 'NotFound',
            message: 'Product owner with ID 99999 not found',
          },
        },
      });

      await expect(createLegalDocument(dataWithInvalidOwner)).rejects.toThrow(
        'Product owner with ID 99999 not found'
      );
    });

    it('should throw error on unauthorized access (401)', async () => {
      mockedApi.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: 'Unauthorized',
            message: 'Authentication credentials were not provided or are invalid',
          },
        },
      });

      await expect(createLegalDocument(createData)).rejects.toThrow(
        'Authentication credentials were not provided or are invalid'
      );
    });

    it('should throw error on server failure (500)', async () => {
      mockedApi.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: 'InternalServerError',
            message: 'An unexpected error occurred. Please try again later.',
          },
        },
      });

      await expect(createLegalDocument(createData)).rejects.toThrow(
        'An unexpected error occurred'
      );
    });
  });

  // ===========================================================================
  // updateLegalDocument - PUT /legal_documents/:id
  // ===========================================================================
  describe('updateLegalDocument', () => {
    const documentId = 1;

    it('should update a document with notes', async () => {
      const updateData: UpdateLegalDocumentData = {
        notes: 'Updated notes',
      };

      const mockUpdatedDocument = createMockLegalDocument({
        id: documentId,
        notes: 'Updated notes',
        updated_at: '2024-12-11T16:00:00Z',
      });

      mockedApi.put.mockResolvedValueOnce({
        data: mockUpdatedDocument,
      });

      const result = await updateLegalDocument(documentId, updateData);

      expect(mockedApi.put).toHaveBeenCalledWith(`/legal_documents/${documentId}`, updateData);
      expect(result.id).toBe(documentId);
      expect(result.notes).toBe('Updated notes');
    });

    it('should update multiple fields at once', async () => {
      const updateData: UpdateLegalDocumentData = {
        type: 'EPA',
        status: 'Lapsed',
        document_date: '2024-12-01',
      };

      const mockUpdatedDocument = createMockLegalDocument({
        id: documentId,
        type: 'EPA',
        status: 'Lapsed',
        document_date: '2024-12-01',
      });

      mockedApi.put.mockResolvedValueOnce({
        data: mockUpdatedDocument,
      });

      const result = await updateLegalDocument(documentId, updateData);

      expect(result.type).toBe('EPA');
      expect(result.status).toBe('Lapsed');
      expect(result.document_date).toBe('2024-12-01');
    });

    it('should update product_owner_ids', async () => {
      const updateData: UpdateLegalDocumentData = {
        product_owner_ids: [789, 101],
      };

      const mockUpdatedDocument = createMockLegalDocument({
        id: documentId,
        product_owner_ids: [789, 101],
      });

      mockedApi.put.mockResolvedValueOnce({
        data: mockUpdatedDocument,
      });

      const result = await updateLegalDocument(documentId, updateData);

      expect(result.product_owner_ids).toEqual([789, 101]);
    });

    it('should update document to custom type', async () => {
      const updateData: UpdateLegalDocumentData = {
        type: 'Custom: Living Will',
      };

      const mockUpdatedDocument = createMockLegalDocument({
        id: documentId,
        type: 'Custom: Living Will',
      });

      mockedApi.put.mockResolvedValueOnce({
        data: mockUpdatedDocument,
      });

      const result = await updateLegalDocument(documentId, updateData);

      expect(result.type).toBe('Custom: Living Will');
    });

    it('should throw error when document not found (404)', async () => {
      const updateData: UpdateLegalDocumentData = {
        notes: 'test',
      };

      mockedApi.put.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            error: 'NotFound',
            message: `Legal document with ID ${documentId} not found`,
          },
        },
      });

      await expect(updateLegalDocument(documentId, updateData)).rejects.toThrow(
        `Legal document with ID ${documentId} not found`
      );
    });

    it('should throw validation error on invalid update data (422)', async () => {
      const updateData: UpdateLegalDocumentData = {
        notes: 'x'.repeat(3000), // Exceeds max length of 2000
      };

      mockedApi.put.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            error: 'ValidationError',
            message: 'Request validation failed',
            details: {
              notes: 'Notes must not exceed 2000 characters',
            },
          },
        },
      });

      await expect(updateLegalDocument(documentId, updateData)).rejects.toThrow(
        'Request validation failed'
      );
    });

    it('should throw error on unauthorized access (401)', async () => {
      mockedApi.put.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: 'Unauthorized',
            message: 'Authentication credentials were not provided or are invalid',
          },
        },
      });

      await expect(updateLegalDocument(documentId, { notes: 'test' })).rejects.toThrow(
        'Authentication credentials were not provided or are invalid'
      );
    });

    it('should throw error on server failure (500)', async () => {
      mockedApi.put.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: 'InternalServerError',
            message: 'An unexpected error occurred. Please try again later.',
          },
        },
      });

      await expect(updateLegalDocument(documentId, { notes: 'test' })).rejects.toThrow(
        'An unexpected error occurred'
      );
    });
  });

  // ===========================================================================
  // updateLegalDocumentStatus - PATCH /legal_documents/:id/status
  // ===========================================================================
  describe('updateLegalDocumentStatus', () => {
    const documentId = 1;

    it('should update status to Lapsed', async () => {
      const mockUpdatedDocument = createMockLegalDocument({
        id: documentId,
        status: 'Lapsed',
        updated_at: '2024-12-11T16:00:00Z',
      });

      mockedApi.patch.mockResolvedValueOnce({
        data: mockUpdatedDocument,
      });

      const result = await updateLegalDocumentStatus(documentId, 'Lapsed');

      expect(mockedApi.patch).toHaveBeenCalledWith(`/legal_documents/${documentId}/status`, {
        status: 'Lapsed',
      });
      expect(result.id).toBe(documentId);
      expect(result.status).toBe('Lapsed');
    });

    it('should update status to Registered', async () => {
      const mockUpdatedDocument = createMockLegalDocument({
        id: documentId,
        status: 'Registered',
        updated_at: '2024-12-11T16:00:00Z',
      });

      mockedApi.patch.mockResolvedValueOnce({
        data: mockUpdatedDocument,
      });

      const result = await updateLegalDocumentStatus(documentId, 'Registered');

      expect(result.status).toBe('Registered');
    });

    it('should reactivate by setting status to Signed', async () => {
      const mockUpdatedDocument = createMockLegalDocument({
        id: documentId,
        status: 'Signed',
        updated_at: '2024-12-11T16:00:00Z',
      });

      mockedApi.patch.mockResolvedValueOnce({
        data: mockUpdatedDocument,
      });

      const result = await updateLegalDocumentStatus(documentId, 'Signed');

      expect(result.status).toBe('Signed');
    });

    it('should throw error when document not found (404)', async () => {
      mockedApi.patch.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            error: 'NotFound',
            message: `Legal document with ID ${documentId} not found`,
          },
        },
      });

      await expect(updateLegalDocumentStatus(documentId, 'Lapsed')).rejects.toThrow(
        `Legal document with ID ${documentId} not found`
      );
    });

    it('should throw validation error on invalid status value (422)', async () => {
      mockedApi.patch.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            error: 'ValidationError',
            message: 'Request validation failed',
            details: {
              status: 'Status must be one of: Signed, Registered, Lapsed',
            },
          },
        },
      });

      // @ts-expect-error - Testing invalid status
      await expect(updateLegalDocumentStatus(documentId, 'Invalid')).rejects.toThrow(
        'Request validation failed'
      );
    });

    it('should throw error on unauthorized access (401)', async () => {
      mockedApi.patch.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: 'Unauthorized',
            message: 'Authentication credentials were not provided or are invalid',
          },
        },
      });

      await expect(updateLegalDocumentStatus(documentId, 'Lapsed')).rejects.toThrow(
        'Authentication credentials were not provided or are invalid'
      );
    });
  });

  // ===========================================================================
  // deleteLegalDocument - DELETE /legal_documents/:id
  // ===========================================================================
  describe('deleteLegalDocument', () => {
    const documentId = 1;

    it('should delete a document successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({
        status: 204,
        data: null,
      });

      await deleteLegalDocument(documentId);

      expect(mockedApi.delete).toHaveBeenCalledWith(`/legal_documents/${documentId}`);
    });

    it('should throw error when document not found (404)', async () => {
      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            error: 'NotFound',
            message: `Legal document with ID ${documentId} not found`,
          },
        },
      });

      await expect(deleteLegalDocument(documentId)).rejects.toThrow(
        `Legal document with ID ${documentId} not found`
      );
    });

    it('should throw error on unauthorized access (401)', async () => {
      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: 'Unauthorized',
            message: 'Authentication credentials were not provided or are invalid',
          },
        },
      });

      await expect(deleteLegalDocument(documentId)).rejects.toThrow(
        'Authentication credentials were not provided or are invalid'
      );
    });

    it('should throw error on server failure (500)', async () => {
      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: 'InternalServerError',
            message: 'An unexpected error occurred. Please try again later.',
          },
        },
      });

      await expect(deleteLegalDocument(documentId)).rejects.toThrow(
        'An unexpected error occurred'
      );
    });
  });

  // ===========================================================================
  // Edge Cases and Error Handling
  // ===========================================================================
  describe('Edge Cases', () => {
    it('should handle network timeout errors gracefully', async () => {
      mockedApi.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      });

      await expect(fetchLegalDocuments(123)).rejects.toThrow();
    });

    it('should handle network connection errors gracefully', async () => {
      mockedApi.get.mockRejectedValueOnce({
        code: 'ENOTFOUND',
        message: 'Network Error',
      });

      await expect(fetchLegalDocuments(123)).rejects.toThrow();
    });

    it('should handle malformed response data', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: null,
      });

      // The API service should handle null data gracefully by returning empty array
      const result = await fetchLegalDocuments(123);
      expect(result).toEqual([]);
    });

    it('should correctly build params for fetchLegalDocuments with all filters', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await fetchLegalDocuments(123, { type: 'Will', status: 'Signed' });

      expect(mockedApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: {
          product_owner_id: 123,
          type: 'Will',
          status: 'Signed',
        },
      });
    });

    it('should correctly build params for fetchLegalDocumentsByClientGroup with all filters', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await fetchLegalDocumentsByClientGroup(50, { type: 'EPA', status: 'Lapsed' });

      expect(mockedApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: {
          client_group_id: 50,
          type: 'EPA',
          status: 'Lapsed',
        },
      });
    });

    it('should handle document with all null optional fields', async () => {
      const documentWithNulls = createMockLegalDocument({
        document_date: null,
        notes: null,
      });

      mockedApi.get.mockResolvedValueOnce({
        data: [documentWithNulls],
      });

      const result = await fetchLegalDocuments(123);

      expect(result[0].document_date).toBeNull();
      expect(result[0].notes).toBeNull();
    });

    it('should handle document with empty product_owner_ids array', async () => {
      // Edge case: document that somehow has empty owners array
      const documentWithNoOwners = createMockLegalDocument({
        product_owner_ids: [],
      });

      mockedApi.get.mockResolvedValueOnce({
        data: [documentWithNoOwners],
      });

      const result = await fetchLegalDocuments(123);

      expect(result[0].product_owner_ids).toEqual([]);
    });
  });
});
