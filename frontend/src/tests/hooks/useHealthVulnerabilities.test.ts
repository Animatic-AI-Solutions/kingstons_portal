/**
 * Health and Vulnerability React Query Hooks Tests (Cycle 6)
 *
 * TDD Red Phase: These tests define expected behavior for React Query hooks
 * that do not yet exist. All tests should FAIL initially.
 *
 * Coverage:
 * - Query Hooks:
 *   - useHealthProductOwners(clientGroupId) - fetch health for product owners
 *   - useHealthSpecialRelationships(clientGroupId) - fetch health for special relationships
 *   - useVulnerabilitiesProductOwners(clientGroupId) - fetch vulnerabilities for product owners
 *   - useVulnerabilitiesSpecialRelationships(clientGroupId) - fetch vulnerabilities for special relationships
 *
 * - Mutation Hooks:
 *   - useCreateHealthRecord() - create health record (PO or SR)
 *   - useUpdateHealthRecord() - update health record
 *   - useDeleteHealthRecord() - delete health record
 *   - useCreateVulnerability() - create vulnerability record (PO or SR)
 *   - useUpdateVulnerability() - update vulnerability record
 *   - useDeleteVulnerability() - delete vulnerability record
 *
 * Features tested:
 * - Loading states
 * - Success states
 * - Error handling
 * - Cache invalidation after mutations
 * - Disabled queries when clientGroupId is null/undefined
 *
 * @module tests/hooks/useHealthVulnerabilities.test
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Import hooks that will be created
import {
  useHealthProductOwners,
  useHealthSpecialRelationships,
  useVulnerabilitiesProductOwners,
  useVulnerabilitiesSpecialRelationships,
  useCreateHealthRecord,
  useUpdateHealthRecord,
  useDeleteHealthRecord,
  useCreateVulnerability,
  useUpdateVulnerability,
  useDeleteVulnerability,
  healthVulnerabilityKeys,
} from '@/hooks/useHealthVulnerabilities';

import type {
  HealthProductOwner,
  HealthSpecialRelationship,
  VulnerabilityProductOwner,
  VulnerabilitySpecialRelationship,
  HealthProductOwnerCreate,
  HealthSpecialRelationshipCreate,
  HealthConditionUpdate,
  VulnerabilityProductOwnerCreate,
  VulnerabilitySpecialRelationshipCreate,
  VulnerabilityUpdate,
  PersonType,
} from '@/types/healthVulnerability';

// Mock the API service module
jest.mock('@/services/healthVulnerabilityApi', () => ({
  fetchHealthProductOwners: jest.fn(),
  fetchHealthSpecialRelationships: jest.fn(),
  fetchVulnerabilitiesProductOwners: jest.fn(),
  fetchVulnerabilitiesSpecialRelationships: jest.fn(),
  createHealthRecord: jest.fn(),
  updateHealthRecord: jest.fn(),
  deleteHealthRecord: jest.fn(),
  createVulnerability: jest.fn(),
  updateVulnerability: jest.fn(),
  deleteVulnerability: jest.fn(),
}));

import * as healthVulnerabilityApi from '@/services/healthVulnerabilityApi';

const mockedApi = healthVulnerabilityApi as jest.Mocked<typeof healthVulnerabilityApi>;

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

/**
 * Creates a QueryClient instance for testing with cache access
 */
function createQueryClient() {
  return new QueryClient({
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
}

/**
 * Creates a wrapper with a specific QueryClient for cache inspection
 */
function createWrapperWithClient(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// =============================================================================
// Test Data Factories
// =============================================================================

/**
 * Creates a mock HealthProductOwner record for testing
 */
function createMockHealthProductOwner(
  overrides: Partial<HealthProductOwner> = {}
): HealthProductOwner {
  return {
    id: 1,
    product_owner_id: 100,
    condition: 'Diabetes',
    name: 'Type 2 Diabetes',
    date_of_diagnosis: '2020-05-15',
    status: 'Active',
    medication: 'Metformin 500mg',
    notes: 'Monitor blood sugar levels regularly',
    created_at: '2025-01-01T10:00:00Z',
    date_recorded: '2025-01-01T10:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock HealthSpecialRelationship record for testing
 */
function createMockHealthSpecialRelationship(
  overrides: Partial<HealthSpecialRelationship> = {}
): HealthSpecialRelationship {
  return {
    id: 10,
    special_relationship_id: 200,
    condition: 'Dementia',
    name: "Early-stage Alzheimer's",
    date_of_diagnosis: '2023-03-20',
    status: 'Active',
    medication: 'Donepezil',
    notes: 'Requires supervision for financial decisions',
    created_at: '2025-01-01T12:00:00Z',
    date_recorded: null,
    ...overrides,
  };
}

/**
 * Creates a mock VulnerabilityProductOwner record for testing
 */
function createMockVulnerabilityProductOwner(
  overrides: Partial<VulnerabilityProductOwner> = {}
): VulnerabilityProductOwner {
  return {
    id: 1,
    product_owner_id: 100,
    description: 'Cognitive decline affecting financial decisions',
    adjustments: 'Speak slowly, provide written summaries',
    diagnosed: true,
    status: 'Active',
    notes: 'Family member should be present at meetings',
    created_at: '2025-01-01T10:00:00Z',
    date_recorded: '2025-01-01T10:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock VulnerabilitySpecialRelationship record for testing
 */
function createMockVulnerabilitySpecialRelationship(
  overrides: Partial<VulnerabilitySpecialRelationship> = {}
): VulnerabilitySpecialRelationship {
  return {
    id: 10,
    special_relationship_id: 200,
    description: 'Recent bereavement affecting judgment',
    adjustments: 'Delay major financial decisions if possible',
    diagnosed: false,
    status: 'Monitoring',
    notes: 'Review in 6 months',
    created_at: '2025-01-01T12:00:00Z',
    date_recorded: null,
    ...overrides,
  };
}

describe('Health and Vulnerability React Query Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // QUERY KEY FACTORY
  // ===========================================================================
  describe('healthVulnerabilityKeys', () => {
    it('should have all query key factory', () => {
      expect(healthVulnerabilityKeys.all).toEqual(['healthVulnerability']);
    });

    it('should have health query keys', () => {
      expect(healthVulnerabilityKeys.health).toEqual(['healthVulnerability', 'health']);
      expect(healthVulnerabilityKeys.healthProductOwners(50)).toEqual([
        'healthVulnerability',
        'health',
        'productOwners',
        50,
      ]);
      expect(healthVulnerabilityKeys.healthSpecialRelationships(50)).toEqual([
        'healthVulnerability',
        'health',
        'specialRelationships',
        50,
      ]);
    });

    it('should have vulnerability query keys', () => {
      expect(healthVulnerabilityKeys.vulnerabilities).toEqual([
        'healthVulnerability',
        'vulnerabilities',
      ]);
      expect(healthVulnerabilityKeys.vulnerabilitiesProductOwners(50)).toEqual([
        'healthVulnerability',
        'vulnerabilities',
        'productOwners',
        50,
      ]);
      expect(healthVulnerabilityKeys.vulnerabilitiesSpecialRelationships(50)).toEqual([
        'healthVulnerability',
        'vulnerabilities',
        'specialRelationships',
        50,
      ]);
    });
  });

  // ===========================================================================
  // HEALTH QUERY HOOKS
  // ===========================================================================
  describe('useHealthProductOwners', () => {
    const clientGroupId = 50;

    it('should start in loading state', () => {
      mockedApi.fetchHealthProductOwners.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useHealthProductOwners(clientGroupId), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch health records for product owners successfully', async () => {
      const mockHealthRecords = [
        createMockHealthProductOwner({ id: 1, product_owner_id: 100 }),
        createMockHealthProductOwner({ id: 2, product_owner_id: 101, condition: 'Asthma' }),
      ];

      mockedApi.fetchHealthProductOwners.mockResolvedValueOnce(mockHealthRecords);

      const { result } = renderHook(() => useHealthProductOwners(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockHealthRecords);
      expect(result.current.data).toHaveLength(2);
      expect(mockedApi.fetchHealthProductOwners).toHaveBeenCalledWith(clientGroupId);
    });

    it('should return empty array when no health records exist', async () => {
      mockedApi.fetchHealthProductOwners.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useHealthProductOwners(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch health records');
      mockedApi.fetchHealthProductOwners.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHealthProductOwners(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should be disabled when clientGroupId is null', () => {
      const { result } = renderHook(() => useHealthProductOwners(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockedApi.fetchHealthProductOwners).not.toHaveBeenCalled();
    });

    it('should be disabled when clientGroupId is undefined', () => {
      const { result } = renderHook(() => useHealthProductOwners(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockedApi.fetchHealthProductOwners).not.toHaveBeenCalled();
    });
  });

  describe('useHealthSpecialRelationships', () => {
    const clientGroupId = 50;

    it('should start in loading state', () => {
      mockedApi.fetchHealthSpecialRelationships.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useHealthSpecialRelationships(clientGroupId), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch health records for special relationships successfully', async () => {
      const mockHealthRecords = [
        createMockHealthSpecialRelationship({ id: 10, special_relationship_id: 200 }),
        createMockHealthSpecialRelationship({
          id: 11,
          special_relationship_id: 201,
          condition: 'Heart Disease',
        }),
      ];

      mockedApi.fetchHealthSpecialRelationships.mockResolvedValueOnce(mockHealthRecords);

      const { result } = renderHook(() => useHealthSpecialRelationships(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockHealthRecords);
      expect(result.current.data).toHaveLength(2);
      expect(mockedApi.fetchHealthSpecialRelationships).toHaveBeenCalledWith(clientGroupId);
    });

    it('should return empty array when no health records exist', async () => {
      mockedApi.fetchHealthSpecialRelationships.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useHealthSpecialRelationships(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch health records');
      mockedApi.fetchHealthSpecialRelationships.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHealthSpecialRelationships(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should be disabled when clientGroupId is null', () => {
      const { result } = renderHook(() => useHealthSpecialRelationships(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockedApi.fetchHealthSpecialRelationships).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // VULNERABILITY QUERY HOOKS
  // ===========================================================================
  describe('useVulnerabilitiesProductOwners', () => {
    const clientGroupId = 50;

    it('should start in loading state', () => {
      mockedApi.fetchVulnerabilitiesProductOwners.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useVulnerabilitiesProductOwners(clientGroupId), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch vulnerability records for product owners successfully', async () => {
      const mockVulnerabilityRecords = [
        createMockVulnerabilityProductOwner({ id: 1, product_owner_id: 100 }),
        createMockVulnerabilityProductOwner({
          id: 2,
          product_owner_id: 101,
          description: 'Hearing impairment',
        }),
      ];

      mockedApi.fetchVulnerabilitiesProductOwners.mockResolvedValueOnce(mockVulnerabilityRecords);

      const { result } = renderHook(() => useVulnerabilitiesProductOwners(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockVulnerabilityRecords);
      expect(result.current.data).toHaveLength(2);
      expect(mockedApi.fetchVulnerabilitiesProductOwners).toHaveBeenCalledWith(clientGroupId);
    });

    it('should return empty array when no vulnerability records exist', async () => {
      mockedApi.fetchVulnerabilitiesProductOwners.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useVulnerabilitiesProductOwners(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch vulnerability records');
      mockedApi.fetchVulnerabilitiesProductOwners.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useVulnerabilitiesProductOwners(clientGroupId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should be disabled when clientGroupId is null', () => {
      const { result } = renderHook(() => useVulnerabilitiesProductOwners(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockedApi.fetchVulnerabilitiesProductOwners).not.toHaveBeenCalled();
    });
  });

  describe('useVulnerabilitiesSpecialRelationships', () => {
    const clientGroupId = 50;

    it('should start in loading state', () => {
      mockedApi.fetchVulnerabilitiesSpecialRelationships.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useVulnerabilitiesSpecialRelationships(clientGroupId), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch vulnerability records for special relationships successfully', async () => {
      const mockVulnerabilityRecords = [
        createMockVulnerabilitySpecialRelationship({ id: 10, special_relationship_id: 200 }),
        createMockVulnerabilitySpecialRelationship({
          id: 11,
          special_relationship_id: 201,
          description: 'Language barrier',
        }),
      ];

      mockedApi.fetchVulnerabilitiesSpecialRelationships.mockResolvedValueOnce(
        mockVulnerabilityRecords
      );

      const { result } = renderHook(
        () => useVulnerabilitiesSpecialRelationships(clientGroupId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockVulnerabilityRecords);
      expect(result.current.data).toHaveLength(2);
      expect(mockedApi.fetchVulnerabilitiesSpecialRelationships).toHaveBeenCalledWith(
        clientGroupId
      );
    });

    it('should return empty array when no vulnerability records exist', async () => {
      mockedApi.fetchVulnerabilitiesSpecialRelationships.mockResolvedValueOnce([]);

      const { result } = renderHook(
        () => useVulnerabilitiesSpecialRelationships(clientGroupId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch vulnerability records');
      mockedApi.fetchVulnerabilitiesSpecialRelationships.mockRejectedValueOnce(error);

      const { result } = renderHook(
        () => useVulnerabilitiesSpecialRelationships(clientGroupId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should be disabled when clientGroupId is null', () => {
      const { result } = renderHook(() => useVulnerabilitiesSpecialRelationships(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockedApi.fetchVulnerabilitiesSpecialRelationships).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // HEALTH MUTATION HOOKS
  // ===========================================================================
  describe('useCreateHealthRecord', () => {
    it('should create a health record for product owner successfully', async () => {
      const createData: HealthProductOwnerCreate = {
        product_owner_id: 100,
        condition: 'Diabetes',
        status: 'Active',
      };

      const mockCreatedRecord = createMockHealthProductOwner({
        id: 1,
        ...createData,
      });

      mockedApi.createHealthRecord.mockResolvedValueOnce(mockCreatedRecord);

      const { result } = renderHook(() => useCreateHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          data: createData,
          personType: 'product_owner',
        });
      });

      expect(mockedApi.createHealthRecord).toHaveBeenCalledWith(createData, 'product_owner');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should create a health record for special relationship successfully', async () => {
      const createData: HealthSpecialRelationshipCreate = {
        special_relationship_id: 200,
        condition: 'Dementia',
        status: 'Active',
      };

      const mockCreatedRecord = createMockHealthSpecialRelationship({
        id: 10,
        ...createData,
      });

      mockedApi.createHealthRecord.mockResolvedValueOnce(mockCreatedRecord);

      const { result } = renderHook(() => useCreateHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          data: createData,
          personType: 'special_relationship',
        });
      });

      expect(mockedApi.createHealthRecord).toHaveBeenCalledWith(createData, 'special_relationship');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle create error', async () => {
      const createData: HealthProductOwnerCreate = {
        product_owner_id: 100,
        condition: 'Diabetes',
      };

      const error = new Error('Failed to create health record');
      mockedApi.createHealthRecord.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCreateHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            data: createData,
            personType: 'product_owner',
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should invalidate queries after successful creation', async () => {
      const queryClient = createQueryClient();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const createData: HealthProductOwnerCreate = {
        product_owner_id: 100,
        condition: 'Diabetes',
      };

      mockedApi.createHealthRecord.mockResolvedValueOnce(
        createMockHealthProductOwner({ id: 1, ...createData })
      );

      const { result } = renderHook(() => useCreateHealthRecord(), {
        wrapper: createWrapperWithClient(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          data: createData,
          personType: 'product_owner',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  describe('useUpdateHealthRecord', () => {
    it('should update a health record for product owner successfully', async () => {
      const updateData: HealthConditionUpdate = {
        status: 'Resolved',
        notes: 'Condition resolved',
      };

      const mockUpdatedRecord = createMockHealthProductOwner({
        id: 1,
        status: 'Resolved',
        notes: 'Condition resolved',
      });

      mockedApi.updateHealthRecord.mockResolvedValueOnce(mockUpdatedRecord);

      const { result } = renderHook(() => useUpdateHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: updateData,
          personType: 'product_owner',
        });
      });

      expect(mockedApi.updateHealthRecord).toHaveBeenCalledWith(1, updateData, 'product_owner');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should update a health record for special relationship successfully', async () => {
      const updateData: HealthConditionUpdate = {
        status: 'Monitoring',
      };

      const mockUpdatedRecord = createMockHealthSpecialRelationship({
        id: 10,
        status: 'Monitoring',
      });

      mockedApi.updateHealthRecord.mockResolvedValueOnce(mockUpdatedRecord);

      const { result } = renderHook(() => useUpdateHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 10,
          data: updateData,
          personType: 'special_relationship',
        });
      });

      expect(mockedApi.updateHealthRecord).toHaveBeenCalledWith(
        10,
        updateData,
        'special_relationship'
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle update error', async () => {
      const updateData: HealthConditionUpdate = {
        status: 'Resolved',
      };

      const error = new Error('Failed to update health record');
      mockedApi.updateHealthRecord.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUpdateHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            id: 1,
            data: updateData,
            personType: 'product_owner',
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should invalidate queries after successful update', async () => {
      const queryClient = createQueryClient();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const updateData: HealthConditionUpdate = {
        status: 'Resolved',
      };

      mockedApi.updateHealthRecord.mockResolvedValueOnce(
        createMockHealthProductOwner({ id: 1, status: 'Resolved' })
      );

      const { result } = renderHook(() => useUpdateHealthRecord(), {
        wrapper: createWrapperWithClient(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: updateData,
          personType: 'product_owner',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  describe('useDeleteHealthRecord', () => {
    it('should delete a health record for product owner successfully', async () => {
      mockedApi.deleteHealthRecord.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          personType: 'product_owner',
        });
      });

      expect(mockedApi.deleteHealthRecord).toHaveBeenCalledWith(1, 'product_owner');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should delete a health record for special relationship successfully', async () => {
      mockedApi.deleteHealthRecord.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 10,
          personType: 'special_relationship',
        });
      });

      expect(mockedApi.deleteHealthRecord).toHaveBeenCalledWith(10, 'special_relationship');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle delete error', async () => {
      const error = new Error('Failed to delete health record');
      mockedApi.deleteHealthRecord.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDeleteHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            id: 1,
            personType: 'product_owner',
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should invalidate queries after successful deletion', async () => {
      const queryClient = createQueryClient();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      mockedApi.deleteHealthRecord.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteHealthRecord(), {
        wrapper: createWrapperWithClient(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          personType: 'product_owner',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // VULNERABILITY MUTATION HOOKS
  // ===========================================================================
  describe('useCreateVulnerability', () => {
    it('should create a vulnerability record for product owner successfully', async () => {
      const createData: VulnerabilityProductOwnerCreate = {
        product_owner_id: 100,
        description: 'Cognitive decline',
        diagnosed: true,
        status: 'Active',
      };

      const mockCreatedRecord = createMockVulnerabilityProductOwner({
        id: 1,
        ...createData,
      });

      mockedApi.createVulnerability.mockResolvedValueOnce(mockCreatedRecord);

      const { result } = renderHook(() => useCreateVulnerability(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          data: createData,
          personType: 'product_owner',
        });
      });

      expect(mockedApi.createVulnerability).toHaveBeenCalledWith(createData, 'product_owner');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should create a vulnerability record for special relationship successfully', async () => {
      const createData: VulnerabilitySpecialRelationshipCreate = {
        special_relationship_id: 200,
        description: 'Recent bereavement',
        diagnosed: false,
        status: 'Monitoring',
      };

      const mockCreatedRecord = createMockVulnerabilitySpecialRelationship({
        id: 10,
        ...createData,
      });

      mockedApi.createVulnerability.mockResolvedValueOnce(mockCreatedRecord);

      const { result } = renderHook(() => useCreateVulnerability(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          data: createData,
          personType: 'special_relationship',
        });
      });

      expect(mockedApi.createVulnerability).toHaveBeenCalledWith(
        createData,
        'special_relationship'
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle create error', async () => {
      const createData: VulnerabilityProductOwnerCreate = {
        product_owner_id: 100,
        description: 'Cognitive decline',
      };

      const error = new Error('Failed to create vulnerability record');
      mockedApi.createVulnerability.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCreateVulnerability(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            data: createData,
            personType: 'product_owner',
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should invalidate queries after successful creation', async () => {
      const queryClient = createQueryClient();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const createData: VulnerabilityProductOwnerCreate = {
        product_owner_id: 100,
        description: 'Cognitive decline',
      };

      mockedApi.createVulnerability.mockResolvedValueOnce(
        createMockVulnerabilityProductOwner({ id: 1, ...createData })
      );

      const { result } = renderHook(() => useCreateVulnerability(), {
        wrapper: createWrapperWithClient(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          data: createData,
          personType: 'product_owner',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  describe('useUpdateVulnerability', () => {
    it('should update a vulnerability record for product owner successfully', async () => {
      const updateData: VulnerabilityUpdate = {
        status: 'Resolved',
        notes: 'Vulnerability addressed',
      };

      const mockUpdatedRecord = createMockVulnerabilityProductOwner({
        id: 1,
        status: 'Resolved',
        notes: 'Vulnerability addressed',
      });

      mockedApi.updateVulnerability.mockResolvedValueOnce(mockUpdatedRecord);

      const { result } = renderHook(() => useUpdateVulnerability(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: updateData,
          personType: 'product_owner',
        });
      });

      expect(mockedApi.updateVulnerability).toHaveBeenCalledWith(1, updateData, 'product_owner');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should update a vulnerability record for special relationship successfully', async () => {
      const updateData: VulnerabilityUpdate = {
        status: 'Inactive',
        diagnosed: true,
      };

      const mockUpdatedRecord = createMockVulnerabilitySpecialRelationship({
        id: 10,
        status: 'Inactive',
        diagnosed: true,
      });

      mockedApi.updateVulnerability.mockResolvedValueOnce(mockUpdatedRecord);

      const { result } = renderHook(() => useUpdateVulnerability(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 10,
          data: updateData,
          personType: 'special_relationship',
        });
      });

      expect(mockedApi.updateVulnerability).toHaveBeenCalledWith(
        10,
        updateData,
        'special_relationship'
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle update error', async () => {
      const updateData: VulnerabilityUpdate = {
        status: 'Resolved',
      };

      const error = new Error('Failed to update vulnerability record');
      mockedApi.updateVulnerability.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUpdateVulnerability(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            id: 1,
            data: updateData,
            personType: 'product_owner',
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should invalidate queries after successful update', async () => {
      const queryClient = createQueryClient();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const updateData: VulnerabilityUpdate = {
        status: 'Resolved',
      };

      mockedApi.updateVulnerability.mockResolvedValueOnce(
        createMockVulnerabilityProductOwner({ id: 1, status: 'Resolved' })
      );

      const { result } = renderHook(() => useUpdateVulnerability(), {
        wrapper: createWrapperWithClient(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: updateData,
          personType: 'product_owner',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  describe('useDeleteVulnerability', () => {
    it('should delete a vulnerability record for product owner successfully', async () => {
      mockedApi.deleteVulnerability.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteVulnerability(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          personType: 'product_owner',
        });
      });

      expect(mockedApi.deleteVulnerability).toHaveBeenCalledWith(1, 'product_owner');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should delete a vulnerability record for special relationship successfully', async () => {
      mockedApi.deleteVulnerability.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteVulnerability(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 10,
          personType: 'special_relationship',
        });
      });

      expect(mockedApi.deleteVulnerability).toHaveBeenCalledWith(10, 'special_relationship');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle delete error', async () => {
      const error = new Error('Failed to delete vulnerability record');
      mockedApi.deleteVulnerability.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDeleteVulnerability(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            id: 1,
            personType: 'product_owner',
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should invalidate queries after successful deletion', async () => {
      const queryClient = createQueryClient();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      mockedApi.deleteVulnerability.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteVulnerability(), {
        wrapper: createWrapperWithClient(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          personType: 'product_owner',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // CACHE BEHAVIOR TESTS
  // ===========================================================================
  describe('Cache Behavior', () => {
    it('should not refetch when data is fresh', async () => {
      const mockHealthRecords = [createMockHealthProductOwner()];
      mockedApi.fetchHealthProductOwners.mockResolvedValue(mockHealthRecords);

      const { result, rerender } = renderHook(() => useHealthProductOwners(50), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApi.fetchHealthProductOwners).toHaveBeenCalledTimes(1);

      // Rerender should not trigger another fetch
      rerender();

      // Still only one call
      expect(mockedApi.fetchHealthProductOwners).toHaveBeenCalledTimes(1);
    });

    it('should use separate cache keys for different client groups', async () => {
      const mockHealthRecords1 = [createMockHealthProductOwner({ id: 1 })];
      const mockHealthRecords2 = [createMockHealthProductOwner({ id: 2 })];

      mockedApi.fetchHealthProductOwners
        .mockResolvedValueOnce(mockHealthRecords1)
        .mockResolvedValueOnce(mockHealthRecords2);

      const { result: result1 } = renderHook(() => useHealthProductOwners(50), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      const { result: result2 } = renderHook(() => useHealthProductOwners(51), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Both should have been called
      expect(mockedApi.fetchHealthProductOwners).toHaveBeenCalledWith(50);
      expect(mockedApi.fetchHealthProductOwners).toHaveBeenCalledWith(51);
      expect(mockedApi.fetchHealthProductOwners).toHaveBeenCalledTimes(2);
    });

    it('should maintain separate caches for health and vulnerability queries', async () => {
      const mockHealthRecords = [createMockHealthProductOwner()];
      const mockVulnerabilityRecords = [createMockVulnerabilityProductOwner()];

      mockedApi.fetchHealthProductOwners.mockResolvedValueOnce(mockHealthRecords);
      mockedApi.fetchVulnerabilitiesProductOwners.mockResolvedValueOnce(mockVulnerabilityRecords);

      const wrapper = createWrapper();

      const { result: healthResult } = renderHook(() => useHealthProductOwners(50), { wrapper });
      const { result: vulnResult } = renderHook(() => useVulnerabilitiesProductOwners(50), {
        wrapper,
      });

      await waitFor(() => {
        expect(healthResult.current.isSuccess).toBe(true);
        expect(vulnResult.current.isSuccess).toBe(true);
      });

      // Both endpoints should have been called
      expect(mockedApi.fetchHealthProductOwners).toHaveBeenCalledTimes(1);
      expect(mockedApi.fetchVulnerabilitiesProductOwners).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // MUTATION CALLBACK TESTS
  // ===========================================================================
  describe('Mutation Callbacks', () => {
    it('should call onSuccess callback after successful create', async () => {
      const onSuccess = jest.fn();
      const createData: HealthProductOwnerCreate = {
        product_owner_id: 100,
        condition: 'Diabetes',
      };

      mockedApi.createHealthRecord.mockResolvedValueOnce(
        createMockHealthProductOwner({ id: 1, ...createData })
      );

      const { result } = renderHook(() => useCreateHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(
          { data: createData, personType: 'product_owner' },
          { onSuccess }
        );
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should call onError callback after failed create', async () => {
      const onError = jest.fn();
      const createData: HealthProductOwnerCreate = {
        product_owner_id: 100,
        condition: 'Diabetes',
      };

      const error = new Error('Failed to create');
      mockedApi.createHealthRecord.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCreateHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(
          { data: createData, personType: 'product_owner' },
          { onError }
        );
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should call onSettled callback after mutation completes', async () => {
      const onSettled = jest.fn();
      const createData: HealthProductOwnerCreate = {
        product_owner_id: 100,
        condition: 'Diabetes',
      };

      mockedApi.createHealthRecord.mockResolvedValueOnce(
        createMockHealthProductOwner({ id: 1, ...createData })
      );

      const { result } = renderHook(() => useCreateHealthRecord(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(
          { data: createData, personType: 'product_owner' },
          { onSettled }
        );
      });

      await waitFor(() => {
        expect(onSettled).toHaveBeenCalled();
      });
    });
  });
});
