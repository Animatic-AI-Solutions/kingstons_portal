/**
 * Integration tests for Client Group Creation API Services
 * Tests the complete API flow: addresses → product owners → client groups → junctions
 */

import { createAddress, deleteAddress } from '../../../services/api/addresses';
import { createProductOwner, deleteProductOwner } from '../../../services/api/productOwners';
import { createClientGroup, deleteClientGroup } from '../../../services/api/clientGroups';
import { createClientGroupProductOwner, deleteClientGroupProductOwner } from '../../../services/api/clientGroupProductOwners';

// Mock axios
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from '../../../services/api';

const mockedApi = api as jest.Mocked<typeof api>;

describe('Client Group Creation API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAddress', () => {
    it('should successfully create an address', async () => {
      const addressData = {
        line_1: '123 Main St',
        line_2: 'Apt 4B',
        line_3: '',
        line_4: 'London',
        line_5: 'SW1A 1AA',
      };

      const mockResponse = {
        data: {
          id: 1,
          ...addressData,
          created_at: '2024-12-03T10:00:00Z',
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await createAddress(addressData);

      expect(mockedApi.post).toHaveBeenCalledWith('/addresses', addressData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error with backend message on failure', async () => {
      const addressData = {
        line_1: '',
        line_2: '',
        line_3: '',
        line_4: '',
        line_5: '',
      };

      mockedApi.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Address line_1 is required',
          },
        },
      });

      await expect(createAddress(addressData)).rejects.toThrow('createAddress: Address line_1 is required');
    });
  });

  describe('createProductOwner', () => {
    it('should successfully create a product owner with minimal fields', async () => {
      const productOwnerData = {
        status: 'active' as const,
        firstname: 'John',
        surname: 'Smith',
        known_as: '',
        title: '',
        middle_names: '',
        relationship_status: '',
        gender: '',
        previous_names: '',
        dob: '',
        place_of_birth: '',
        email_1: '',
        email_2: '',
        phone_1: '',
        phone_2: '',
        moved_in_date: '',
        address_id: null,
        three_words: '',
        share_data_with: '',
        employment_status: '',
        occupation: '',
        passport_expiry_date: '',
        ni_number: '',
        aml_result: '',
        aml_date: '',
      };

      const mockResponse = {
        data: {
          id: 1,
          ...productOwnerData,
          created_at: '2024-12-03T10:00:00Z',
          age: null,
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await createProductOwner(productOwnerData);

      expect(mockedApi.post).toHaveBeenCalledWith('/product-owners', productOwnerData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should successfully create a product owner with all fields', async () => {
      const productOwnerData = {
        status: 'active' as const,
        firstname: 'Jane',
        surname: 'Doe',
        known_as: 'JD',
        title: 'Dr',
        middle_names: 'Marie',
        relationship_status: 'Married',
        gender: 'Female',
        previous_names: 'Jane Smith',
        dob: '1985-03-15',
        place_of_birth: 'London',
        email_1: 'jane@example.com',
        email_2: 'jane.doe@work.com',
        phone_1: '+44 7700 900000',
        phone_2: '+44 20 7946 0958',
        moved_in_date: '2010-06-01',
        address_id: 1,
        three_words: 'professional reliable friendly',
        share_data_with: 'spouse',
        employment_status: 'Employed',
        occupation: 'Doctor',
        passport_expiry_date: '2030-01-15',
        ni_number: 'AB123456C',
        aml_result: 'Pass',
        aml_date: '2024-01-15',
      };

      const mockResponse = {
        data: {
          id: 2,
          ...productOwnerData,
          created_at: '2024-12-03T10:00:00Z',
          age: 39,
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await createProductOwner(productOwnerData);

      expect(mockedApi.post).toHaveBeenCalledWith('/product-owners', productOwnerData);
      expect(result.id).toBe(2);
      expect(result.firstname).toBe('Jane');
      expect(result.email_1).toBe('jane@example.com');
    });

    it('should throw error when firstname is missing', async () => {
      const productOwnerData = {
        status: 'active' as const,
        firstname: '',
        surname: 'Smith',
        // ... other fields
      } as any;

      mockedApi.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: [
              {
                loc: ['body', 'firstname'],
                msg: 'field required',
                type: 'value_error.missing',
              },
            ],
          },
        },
      });

      await expect(createProductOwner(productOwnerData)).rejects.toThrow('createProductOwner:');
    });
  });

  describe('createClientGroup', () => {
    it('should successfully create a client group', async () => {
      const clientGroupData = {
        name: 'Test Client Group',
        type: 'Joint',
        status: 'active' as const,
        ongoing_start: '',
        client_declaration: '',
        privacy_declaration: '',
        full_fee_agreement: '',
        last_satisfactory_discussion: '',
        notes: '',
      };

      const mockResponse = {
        data: {
          id: 1,
          ...clientGroupData,
          created_at: '2024-12-03T10:00:00Z',
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await createClientGroup(clientGroupData);

      expect(mockedApi.post).toHaveBeenCalledWith('/client-groups', clientGroupData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when name is too short', async () => {
      const clientGroupData = {
        name: 'A',
        type: 'Joint',
        status: 'active' as const,
        // ... other fields
      } as any;

      mockedApi.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Name must be at least 2 characters',
          },
        },
      });

      await expect(createClientGroup(clientGroupData)).rejects.toThrow('createClientGroup: Name must be at least 2 characters');
    });
  });

  describe('createClientGroupProductOwner', () => {
    it('should successfully create a junction record', async () => {
      const junctionData = {
        client_group_id: 1,
        product_owner_id: 1,
      };

      const mockResponse = {
        data: {
          id: 1,
          ...junctionData,
          created_at: '2024-12-03T10:00:00Z',
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const result = await createClientGroupProductOwner(junctionData);

      expect(mockedApi.post).toHaveBeenCalledWith('/client-group-product-owners', junctionData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Rollback Operations', () => {
    it('should successfully delete address', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: null });

      await deleteAddress(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/addresses/1');
    });

    it('should successfully delete product owner', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: null });

      await deleteProductOwner(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/product-owners/1');
    });

    it('should successfully delete client group', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: null });

      await deleteClientGroup(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/client-groups/1');
    });

    it('should successfully delete junction record', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: null });

      await deleteClientGroupProductOwner(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/client-group-product-owners/1');
    });
  });

  describe('Complete Flow Simulation', () => {
    it('should successfully execute full client group creation flow', async () => {
      // Step 1: Create address
      mockedApi.post.mockResolvedValueOnce({
        data: { id: 1, line_1: '123 Main St', created_at: '2024-12-03T10:00:00Z' },
      });

      const address = await createAddress({ line_1: '123 Main St', line_2: '', line_3: '', line_4: '', line_5: '' });
      expect(address.id).toBe(1);

      // Step 2: Create product owner with address_id
      mockedApi.post.mockResolvedValueOnce({
        data: {
          id: 1,
          firstname: 'John',
          surname: 'Smith',
          address_id: 1,
          created_at: '2024-12-03T10:00:00Z',
        },
      });

      const productOwner = await createProductOwner({
        status: 'active',
        firstname: 'John',
        surname: 'Smith',
        address_id: 1,
      } as any);
      expect(productOwner.id).toBe(1);
      expect(productOwner.address_id).toBe(1);

      // Step 3: Create client group
      mockedApi.post.mockResolvedValueOnce({
        data: { id: 1, name: 'Test Group', status: 'active', created_at: '2024-12-03T10:00:00Z' },
      });

      const clientGroup = await createClientGroup({
        name: 'Test Group',
        status: 'active',
      } as any);
      expect(clientGroup.id).toBe(1);

      // Step 4: Create junction
      mockedApi.post.mockResolvedValueOnce({
        data: { id: 1, client_group_id: 1, product_owner_id: 1, created_at: '2024-12-03T10:00:00Z' },
      });

      const junction = await createClientGroupProductOwner({
        client_group_id: 1,
        product_owner_id: 1,
      });
      expect(junction.id).toBe(1);

      // Verify all calls were made in correct order
      expect(mockedApi.post).toHaveBeenCalledTimes(4);
    });

    it('should rollback on failure at step 2', async () => {
      // Step 1: Create address (success)
      mockedApi.post.mockResolvedValueOnce({
        data: { id: 1, line_1: '123 Main St', created_at: '2024-12-03T10:00:00Z' },
      });

      const address = await createAddress({ line_1: '123 Main St', line_2: '', line_3: '', line_4: '', line_5: '' });

      // Step 2: Create product owner (failure)
      mockedApi.post.mockRejectedValueOnce({
        response: { data: { detail: 'Invalid data' } },
      });

      // Attempt to create product owner (should fail)
      await expect(
        createProductOwner({
          status: 'active',
          firstname: '',
          surname: '',
        } as any)
      ).rejects.toThrow();

      // Rollback: Delete address
      mockedApi.delete.mockResolvedValueOnce({ data: null });
      await deleteAddress(address.id);

      expect(mockedApi.delete).toHaveBeenCalledWith('/addresses/1');
    });
  });
});
