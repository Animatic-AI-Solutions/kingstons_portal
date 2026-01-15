/**
 * Test suite for useLegalDocuments Query Hook
 *
 * TDD Red Phase: These tests define expected behavior for the React Query hook
 * that does not yet exist. All tests should FAIL initially.
 *
 * Test Coverage:
 * - Query key generation (legalDocumentsKeys)
 * - useLegalDocuments hook:
 *   - Fetch documents for a client group
 *   - Disabled when clientGroupId is null/undefined
 *   - Apply filters when provided
 *   - Loading state initially
 *   - Handle API errors
 *
 * @module tests/hooks/useLegalDocuments.query.test
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Import hooks that will be created
import { useLegalDocuments, legalDocumentsKeys } from '@/hooks/useLegalDocuments';

import type { LegalDocument, LegalDocumentFilters } from '@/types/legalDocument';

// Mock the API service module
jest.mock('@/services/legalDocumentsApi', () => ({
  fetchLegalDocumentsByClientGroup: jest.fn(),
  fetchLegalDocuments: jest.fn(),
  createLegalDocument: jest.fn(),
  updateLegalDocument: jest.fn(),
  updateLegalDocumentStatus: jest.fn(),
  deleteLegalDocument: jest.fn(),
}));

import * as legalDocumentsApi from '@/services/legalDocumentsApi';

const mockedApi = legalDocumentsApi as jest.Mocked<typeof legalDocumentsApi>;

// =============================================================================
// Test Setup Helpers
// =============================================================================

/**
 * Creates a wrapper component with QueryClientProvider for testing hooks
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// =============================================================================
// Test Data Factories
// =============================================================================

/**
 * Creates a mock LegalDocument record for testing
 */
function createMockLegalDocument(overrides: Partial<LegalDocument> = {}): LegalDocument {
  return {
    id: 1,
    type: 'Will',
    document_date: '2024-01-15',
    status: 'Signed',
    notes: 'Test notes',
    product_owner_ids: [123],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

// Sample test data
const sampleDocuments: LegalDocument[] = [
  createMockLegalDocument({
    id: 1,
    type: 'Will',
    document_date: '2024-01-15',
    status: 'Signed',
    notes: 'Test notes',
    product_owner_ids: [123],
  }),
  createMockLegalDocument({
    id: 2,
    type: 'EPA',
    document_date: '2024-02-20',
    status: 'Lapsed',
    notes: null,
    product_owner_ids: [123, 456],
  }),
];

// =============================================================================
// Tests
// =============================================================================

describe('Legal Documents Query Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // QUERY KEY FACTORY
  // ===========================================================================
  describe('legalDocumentsKeys', () => {
    it('should have correct base key', () => {
      expect(legalDocumentsKeys.all).toEqual(['legalDocuments']);
    });

    it('should generate correct key for client group without filters', () => {
      const key = legalDocumentsKeys.byClientGroup(123);
      expect(key).toEqual(['legalDocuments', 'clientGroup', 123, {}]);
    });

    it('should generate correct key for client group with filters', () => {
      const filters: LegalDocumentFilters = { type: 'Will', status: 'Signed' };
      const key = legalDocumentsKeys.byClientGroup(123, filters);
      expect(key).toEqual(['legalDocuments', 'clientGroup', 123, filters]);
    });

    it('should generate unique keys for different client groups', () => {
      const key1 = legalDocumentsKeys.byClientGroup(123);
      const key2 = legalDocumentsKeys.byClientGroup(456);
      expect(JSON.stringify(key1)).not.toEqual(JSON.stringify(key2));
    });

    it('should generate unique keys for same client group with different filters', () => {
      const key1 = legalDocumentsKeys.byClientGroup(123, { type: 'Will' });
      const key2 = legalDocumentsKeys.byClientGroup(123, { type: 'EPA' });
      expect(JSON.stringify(key1)).not.toEqual(JSON.stringify(key2));
    });
  });

  // ===========================================================================
  // useLegalDocuments HOOK
  // ===========================================================================
  describe('useLegalDocuments', () => {
    const clientGroupId = 50;

    it('should fetch documents for a client group', async () => {
      mockedApi.fetchLegalDocumentsByClientGroup.mockResolvedValueOnce(sampleDocuments);

      const { result } = renderHook(() => useLegalDocuments(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledWith(
        clientGroupId
      );
      expect(result.current.data).toEqual(sampleDocuments);
      expect(result.current.data).toHaveLength(2);
    });

    it('should be disabled when clientGroupId is null', () => {
      const { result } = renderHook(() => useLegalDocuments(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockedApi.fetchLegalDocumentsByClientGroup).not.toHaveBeenCalled();
    });

    it('should be disabled when clientGroupId is undefined', () => {
      const { result } = renderHook(() => useLegalDocuments(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockedApi.fetchLegalDocumentsByClientGroup).not.toHaveBeenCalled();
    });

    it('should apply filters when provided', async () => {
      const filters: LegalDocumentFilters = { type: 'Will', status: 'Signed' };
      const filteredDocuments = [sampleDocuments[0]]; // Only the Will

      mockedApi.fetchLegalDocumentsByClientGroup.mockResolvedValueOnce(filteredDocuments);

      const { result } = renderHook(() => useLegalDocuments(clientGroupId, { filters }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledWith(
        clientGroupId,
        filters
      );
      expect(result.current.data).toEqual(filteredDocuments);
    });

    it('should return loading state initially', () => {
      // Make the promise never resolve to keep it in loading state
      mockedApi.fetchLegalDocumentsByClientGroup.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useLegalDocuments(clientGroupId), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockedApi.fetchLegalDocumentsByClientGroup.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLegalDocuments(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('API Error');
    });

    it('should return empty array when no documents exist', async () => {
      mockedApi.fetchLegalDocumentsByClientGroup.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useLegalDocuments(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should apply type filter only', async () => {
      const filters: LegalDocumentFilters = { type: 'EPA' };

      mockedApi.fetchLegalDocumentsByClientGroup.mockResolvedValueOnce([sampleDocuments[1]]);

      const { result } = renderHook(() => useLegalDocuments(clientGroupId, { filters }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledWith(
        clientGroupId,
        filters
      );
    });

    it('should apply status filter only', async () => {
      const filters: LegalDocumentFilters = { status: 'Lapsed' };

      mockedApi.fetchLegalDocumentsByClientGroup.mockResolvedValueOnce([sampleDocuments[1]]);

      const { result } = renderHook(() => useLegalDocuments(clientGroupId, { filters }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledWith(
        clientGroupId,
        filters
      );
    });
  });

  // ===========================================================================
  // CACHE BEHAVIOR TESTS
  // ===========================================================================
  describe('Cache Behavior', () => {
    const clientGroupId = 50;

    it('should not refetch when data is fresh', async () => {
      mockedApi.fetchLegalDocumentsByClientGroup.mockResolvedValue(sampleDocuments);

      const { result, rerender } = renderHook(() => useLegalDocuments(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledTimes(1);

      // Rerender should not trigger another fetch
      rerender();

      // Still only one call
      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledTimes(1);
    });

    it('should use separate cache keys for different client groups', async () => {
      const documents1 = [createMockLegalDocument({ id: 1 })];
      const documents2 = [createMockLegalDocument({ id: 2 })];

      mockedApi.fetchLegalDocumentsByClientGroup
        .mockResolvedValueOnce(documents1)
        .mockResolvedValueOnce(documents2);

      const { result: result1 } = renderHook(() => useLegalDocuments(50), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      const { result: result2 } = renderHook(() => useLegalDocuments(51), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Both should have been called
      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledWith(50);
      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledWith(51);
      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledTimes(2);
    });

    it('should use separate cache keys for different filters', async () => {
      const willDocs = [createMockLegalDocument({ id: 1, type: 'Will' })];
      const epaDocs = [createMockLegalDocument({ id: 2, type: 'EPA' })];

      mockedApi.fetchLegalDocumentsByClientGroup
        .mockResolvedValueOnce(willDocs)
        .mockResolvedValueOnce(epaDocs);

      const { result: result1 } = renderHook(
        () => useLegalDocuments(50, { filters: { type: 'Will' } }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      const { result: result2 } = renderHook(
        () => useLegalDocuments(50, { filters: { type: 'EPA' } }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Both should have been called with different filters
      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledWith(50, { type: 'Will' });
      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledWith(50, { type: 'EPA' });
      expect(mockedApi.fetchLegalDocumentsByClientGroup).toHaveBeenCalledTimes(2);
    });
  });
});
