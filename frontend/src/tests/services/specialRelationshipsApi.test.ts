/**
 * Special Relationships API Service Tests (Cycle 2)
 *
 * TDD Red Phase: These tests define expected behavior for the API service layer
 * that does not yet exist. All tests should FAIL initially.
 *
 * Coverage:
 * - fetchSpecialRelationships (GET /special_relationships)
 * - createSpecialRelationship (POST /special_relationships)
 * - updateSpecialRelationship (PUT /special_relationships/:id)
 * - updateSpecialRelationshipStatus (PATCH /special_relationships/:id/status)
 * - deleteSpecialRelationship (DELETE /special_relationships/:id)
 *
 * Error scenarios:
 * - 400 Bad Request (validation errors)
 * - 401 Unauthorized (authentication failures)
 * - 404 Not Found (resource not found)
 * - 422 Validation Error (detailed field errors)
 * - 500 Internal Server Error (server failures)
 */

import {
  fetchSpecialRelationships,
  createSpecialRelationship,
  updateSpecialRelationship,
  updateSpecialRelationshipStatus,
  deleteSpecialRelationship,
} from '@/services/specialRelationshipsApi';

import {
  createMockPersonalRelationship,
  createMockProfessionalRelationship,
  createMockRelationshipArray,
} from '../factories/specialRelationshipFactory';

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

describe('Special Relationships API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // fetchSpecialRelationships - GET /special_relationships
  // =========================================================================
  describe('fetchSpecialRelationships', () => {
    const clientGroupId = 'group-001';

    it('should fetch all special relationships for a client group', async () => {
      const mockRelationships = createMockRelationshipArray(3, {
        client_group_id: clientGroupId,
        type: 'mixed',
      });

      mockedApi.get.mockResolvedValueOnce({
        data: mockRelationships,
      });

      const result = await fetchSpecialRelationships(clientGroupId);

      expect(mockedApi.get).toHaveBeenCalledWith('/special_relationships', {
        params: { client_group_id: clientGroupId },
      });
      expect(result).toEqual(mockRelationships);
      expect(result).toHaveLength(3);
    });

    it('should fetch relationships filtered by type (personal)', async () => {
      const mockRelationships = createMockRelationshipArray(2, {
        client_group_id: clientGroupId,
        type: 'personal',
      });

      mockedApi.get.mockResolvedValueOnce({
        data: mockRelationships,
      });

      const result = await fetchSpecialRelationships(clientGroupId, { type: 'personal' });

      expect(mockedApi.get).toHaveBeenCalledWith('/special_relationships', {
        params: { client_group_id: clientGroupId, type: 'personal' },
      });
      expect(result).toEqual(mockRelationships);
    });

    it('should fetch relationships filtered by status (Active)', async () => {
      const mockRelationships = createMockRelationshipArray(5, {
        client_group_id: clientGroupId,
        status: 'Active',
      });

      mockedApi.get.mockResolvedValueOnce({
        data: mockRelationships,
      });

      const result = await fetchSpecialRelationships(clientGroupId, { status: 'Active' });

      expect(mockedApi.get).toHaveBeenCalledWith('/special_relationships', {
        params: { client_group_id: clientGroupId, status: 'Active' },
      });
      expect(result).toHaveLength(5);
    });

    it('should return empty array when no relationships exist', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: [],
      });

      const result = await fetchSpecialRelationships(clientGroupId);

      expect(result).toEqual([]);
    });

    it('should throw error with message when client_group_id is missing', async () => {
      mockedApi.get.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'BadRequest',
            message: 'client_group_id query parameter is required',
          },
        },
      });

      await expect(fetchSpecialRelationships('')).rejects.toThrow(
        'client_group_id query parameter is required'
      );
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

      await expect(fetchSpecialRelationships(clientGroupId)).rejects.toThrow(
        'Authentication credentials were not provided or are invalid'
      );
    });

    it('should throw error on server failure (500)', async () => {
      mockedApi.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: 'InternalServerError',
            message: 'An unexpected error occurred. Please try again later.',
          },
        },
      });

      await expect(fetchSpecialRelationships(clientGroupId)).rejects.toThrow(
        'An unexpected error occurred'
      );
    });
  });

  // =========================================================================
  // createSpecialRelationship - POST /special_relationships
  // =========================================================================
  describe('createSpecialRelationship', () => {
    it('should successfully create a personal relationship', async () => {
      const personalData = {
        client_group_id: 'group-001',
        relationship_type: 'Spouse',
        status: 'Active' as const,
        title: 'Mrs',
        first_name: 'Jane',
        last_name: 'Smith',
        date_of_birth: '1985-06-15',
        email: 'jane.smith@example.com',
        mobile_phone: '+44-7700-900000',
        home_phone: null,
        work_phone: null,
        address_line1: '123 Main Street',
        address_line2: null,
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom',
        notes: null,
        company_name: null,
        position: null,
        professional_id: null,
      };

      const mockCreatedRelationship = createMockPersonalRelationship({
        id: 'rel-new-001',
        ...personalData,
        created_at: '2024-12-11T15:30:00Z',
        updated_at: '2024-12-11T15:30:00Z',
      });

      mockedApi.post.mockResolvedValueOnce({
        data: mockCreatedRelationship,
      });

      const result = await createSpecialRelationship(personalData);

      expect(mockedApi.post).toHaveBeenCalledWith('/special_relationships', personalData);
      expect(result.id).toBe('rel-new-001');
      expect(result.first_name).toBe('Jane');
      expect(result.relationship_type).toBe('Spouse');
      expect(result.status).toBe('Active');
    });

    it('should successfully create a professional relationship', async () => {
      const professionalData = {
        client_group_id: 'group-001',
        relationship_type: 'Financial Advisor',
        status: 'Active' as const,
        title: 'Dr',
        first_name: 'Robert',
        last_name: 'Johnson',
        date_of_birth: null,
        email: 'robert.johnson@advisor.com',
        mobile_phone: null,
        home_phone: null,
        work_phone: '+44-20-7946-0123',
        address_line1: '456 Business Park',
        address_line2: 'Suite 200',
        city: 'London',
        county: 'Greater London',
        postcode: 'EC1A 1BB',
        country: 'United Kingdom',
        notes: 'Senior financial advisor',
        company_name: 'Financial Advisors Ltd',
        position: 'Senior Advisor',
        professional_id: 'FCA-123456',
      };

      const mockCreatedRelationship = createMockProfessionalRelationship({
        id: 'rel-professional-new',
        ...professionalData,
        created_at: '2024-12-11T15:30:00Z',
        updated_at: '2024-12-11T15:30:00Z',
      });

      mockedApi.post.mockResolvedValueOnce({
        data: mockCreatedRelationship,
      });

      const result = await createSpecialRelationship(professionalData);

      expect(mockedApi.post).toHaveBeenCalledWith('/special_relationships', professionalData);
      expect(result.id).toBe('rel-professional-new');
      expect(result.relationship_type).toBe('Financial Advisor');
      expect(result.company_name).toBe('Financial Advisors Ltd');
      expect(result.professional_id).toBe('FCA-123456');
    });

    it('should throw validation error when required fields are missing (422)', async () => {
      const invalidData = {
        client_group_id: 'group-001',
        relationship_type: '',
        status: 'Active' as const,
      };

      mockedApi.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            error: 'ValidationError',
            message: 'Request validation failed',
            details: {
              first_name: 'First name is required',
              last_name: 'Last name is required',
              relationship_type: 'Relationship type is required and must be between 1 and 100 characters',
            },
          },
        },
      });

      await expect(createSpecialRelationship(invalidData as any)).rejects.toThrow(
        'Request validation failed'
      );
    });

    it('should throw error when email format is invalid', async () => {
      const invalidEmailData = {
        client_group_id: 'group-001',
        relationship_type: 'Spouse',
        status: 'Active' as const,
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
      };

      mockedApi.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            error: 'ValidationError',
            message: 'Request validation failed',
            details: {
              email: 'Invalid email format',
            },
          },
        },
      });

      await expect(createSpecialRelationship(invalidEmailData as any)).rejects.toThrow(
        'Request validation failed'
      );
    });

    it('should throw error when date of birth is in the future', async () => {
      const futureDobData = {
        client_group_id: 'group-001',
        relationship_type: 'Child',
        status: 'Active' as const,
        first_name: 'Future',
        last_name: 'Baby',
        date_of_birth: '2030-01-01',
      };

      mockedApi.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            error: 'ValidationError',
            message: 'Request validation failed',
            details: {
              date_of_birth: 'Date of birth cannot be in the future (age would be over 120)',
            },
          },
        },
      });

      await expect(createSpecialRelationship(futureDobData as any)).rejects.toThrow(
        'Request validation failed'
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

      await expect(
        createSpecialRelationship({
          client_group_id: 'group-001',
          relationship_type: 'Spouse',
          status: 'Active',
        } as any)
      ).rejects.toThrow('Authentication credentials were not provided or are invalid');
    });
  });

  // =========================================================================
  // updateSpecialRelationship - PUT /special_relationships/:id
  // =========================================================================
  describe('updateSpecialRelationship', () => {
    const relationshipId = 'rel-001';

    it('should successfully update a relationship', async () => {
      const updateData = {
        first_name: 'John',
        last_name: 'Smith Jr.',
        email: 'john.smith.jr@example.com',
        mobile_phone: '+44-7890-123456',
        status: 'Active' as const,
      };

      const mockUpdatedRelationship = createMockPersonalRelationship({
        id: relationshipId,
        ...updateData,
        updated_at: '2024-12-11T16:00:00Z',
      });

      mockedApi.put.mockResolvedValueOnce({
        data: mockUpdatedRelationship,
      });

      const result = await updateSpecialRelationship(relationshipId, updateData);

      expect(mockedApi.put).toHaveBeenCalledWith(
        `/special_relationships/${relationshipId}`,
        updateData
      );
      expect(result.id).toBe(relationshipId);
      expect(result.first_name).toBe('John');
      expect(result.last_name).toBe('Smith Jr.');
      expect(result.email).toBe('john.smith.jr@example.com');
    });

    it('should successfully update professional relationship details', async () => {
      const updateData = {
        company_name: 'New Financial Corp',
        position: 'Lead Advisor',
        professional_id: 'FCA-999999',
        work_phone: '+44-20-1234-5678',
      };

      const mockUpdatedRelationship = createMockProfessionalRelationship({
        id: relationshipId,
        ...updateData,
        updated_at: '2024-12-11T16:00:00Z',
      });

      mockedApi.put.mockResolvedValueOnce({
        data: mockUpdatedRelationship,
      });

      const result = await updateSpecialRelationship(relationshipId, updateData);

      expect(result.company_name).toBe('New Financial Corp');
      expect(result.position).toBe('Lead Advisor');
      expect(result.professional_id).toBe('FCA-999999');
    });

    it('should throw error when relationship not found (404)', async () => {
      mockedApi.put.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            error: 'NotFound',
            message: `Special relationship with id '${relationshipId}' not found`,
          },
        },
      });

      await expect(
        updateSpecialRelationship(relationshipId, { first_name: 'Test' } as any)
      ).rejects.toThrow(`Special relationship with id '${relationshipId}' not found`);
    });

    it('should throw validation error on invalid update data (422)', async () => {
      const invalidData = {
        email: 'not-an-email',
        mobile_phone: 'invalid-phone-format',
      };

      mockedApi.put.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            error: 'ValidationError',
            message: 'Request validation failed',
            details: {
              email: 'Invalid email format',
            },
          },
        },
      });

      await expect(updateSpecialRelationship(relationshipId, invalidData as any)).rejects.toThrow(
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

      await expect(
        updateSpecialRelationship(relationshipId, { first_name: 'Test' } as any)
      ).rejects.toThrow('Authentication credentials were not provided or are invalid');
    });
  });

  // =========================================================================
  // updateSpecialRelationshipStatus - PATCH /special_relationships/:id/status
  // =========================================================================
  describe('updateSpecialRelationshipStatus', () => {
    const relationshipId = 'rel-001';

    it('should successfully update status to Inactive', async () => {
      const mockUpdatedRelationship = createMockPersonalRelationship({
        id: relationshipId,
        status: 'Inactive',
        updated_at: '2024-12-11T16:00:00Z',
      });

      mockedApi.patch.mockResolvedValueOnce({
        data: mockUpdatedRelationship,
      });

      const result = await updateSpecialRelationshipStatus(relationshipId, 'Inactive');

      expect(mockedApi.patch).toHaveBeenCalledWith(`/special_relationships/${relationshipId}/status`, {
        status: 'Inactive',
      });
      expect(result.id).toBe(relationshipId);
      expect(result.status).toBe('Inactive');
    });

    it('should successfully update status to Deceased', async () => {
      const mockUpdatedRelationship = createMockPersonalRelationship({
        id: relationshipId,
        status: 'Deceased',
        updated_at: '2024-12-11T16:00:00Z',
      });

      mockedApi.patch.mockResolvedValueOnce({
        data: mockUpdatedRelationship,
      });

      const result = await updateSpecialRelationshipStatus(relationshipId, 'Deceased');

      expect(mockedApi.patch).toHaveBeenCalledWith(`/special_relationships/${relationshipId}/status`, {
        status: 'Deceased',
      });
      expect(result.status).toBe('Deceased');
    });

    it('should successfully reactivate status to Active', async () => {
      const mockUpdatedRelationship = createMockPersonalRelationship({
        id: relationshipId,
        status: 'Active',
        updated_at: '2024-12-11T16:00:00Z',
      });

      mockedApi.patch.mockResolvedValueOnce({
        data: mockUpdatedRelationship,
      });

      const result = await updateSpecialRelationshipStatus(relationshipId, 'Active');

      expect(result.status).toBe('Active');
    });

    it('should throw error when relationship not found (404)', async () => {
      mockedApi.patch.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            error: 'NotFound',
            message: `Special relationship with id '${relationshipId}' not found`,
          },
        },
      });

      await expect(updateSpecialRelationshipStatus(relationshipId, 'Inactive')).rejects.toThrow(
        `Special relationship with id '${relationshipId}' not found`
      );
    });

    it('should throw validation error on invalid status value', async () => {
      mockedApi.patch.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            error: 'ValidationError',
            message: 'Request validation failed',
            details: {
              status: 'Status must be one of: Active, Inactive, Deceased',
            },
          },
        },
      });

      await expect(updateSpecialRelationshipStatus(relationshipId, 'InvalidStatus' as any)).rejects.toThrow(
        'Request validation failed'
      );
    });
  });

  // =========================================================================
  // deleteSpecialRelationship - DELETE /special_relationships/:id
  // =========================================================================
  describe('deleteSpecialRelationship', () => {
    const relationshipId = 'rel-001';

    it('should successfully delete a relationship (soft delete)', async () => {
      mockedApi.delete.mockResolvedValueOnce({
        status: 204,
        data: null,
      });

      await deleteSpecialRelationship(relationshipId);

      expect(mockedApi.delete).toHaveBeenCalledWith(`/special_relationships/${relationshipId}`);
    });

    it('should throw error when relationship not found (404)', async () => {
      mockedApi.delete.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            error: 'NotFound',
            message: `Special relationship with id '${relationshipId}' not found`,
          },
        },
      });

      await expect(deleteSpecialRelationship(relationshipId)).rejects.toThrow(
        `Special relationship with id '${relationshipId}' not found`
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

      await expect(deleteSpecialRelationship(relationshipId)).rejects.toThrow(
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

      await expect(deleteSpecialRelationship(relationshipId)).rejects.toThrow(
        'An unexpected error occurred'
      );
    });
  });
});
