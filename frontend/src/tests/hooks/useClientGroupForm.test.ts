/**
 * Unit tests for useClientGroupForm hook
 * Tests state management, form actions, and validation integration
 */

import { renderHook, act } from '@testing-library/react';
import { useClientGroupForm } from '../../hooks/useClientGroupForm';

describe('useClientGroupForm', () => {
  describe('Initial State', () => {
    it('should initialize with empty client group', () => {
      const { result } = renderHook(() => useClientGroupForm());

      expect(result.current.clientGroup.name).toBe('');
      expect(result.current.clientGroup.type).toBe('');
      expect(result.current.clientGroup.status).toBe('active');
    });

    it('should initialize with empty product owners array', () => {
      const { result } = renderHook(() => useClientGroupForm());

      expect(result.current.productOwners).toEqual([]);
    });

    it('should initialize with no validation errors', () => {
      const { result } = renderHook(() => useClientGroupForm());

      expect(result.current.validationErrors).toEqual({});
    });
  });

  describe('updateClientGroup', () => {
    it('should update client group name', () => {
      const { result } = renderHook(() => useClientGroupForm());

      act(() => {
        result.current.updateClientGroup('name', 'Test Client Group');
      });

      expect(result.current.clientGroup.name).toBe('Test Client Group');
    });

    it('should update client group type', () => {
      const { result } = renderHook(() => useClientGroupForm());

      act(() => {
        result.current.updateClientGroup('type', 'Joint');
      });

      expect(result.current.clientGroup.type).toBe('Joint');
    });

    it('should update client group status', () => {
      const { result } = renderHook(() => useClientGroupForm());

      act(() => {
        result.current.updateClientGroup('status', 'inactive');
      });

      expect(result.current.clientGroup.status).toBe('inactive');
    });
  });

  describe('addProductOwner', () => {
    it('should add a new product owner with unique tempId', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let newOwner: any;
      act(() => {
        newOwner = result.current.addProductOwner();
      });

      expect(result.current.productOwners).toHaveLength(1);
      expect(result.current.productOwners[0]).toBe(newOwner);
      expect(newOwner.tempId).toBeDefined();
    });

    it('should add product owner with empty default values', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let newOwner: any;
      act(() => {
        newOwner = result.current.addProductOwner();
      });

      expect(newOwner.productOwner.firstname).toBe('');
      expect(newOwner.productOwner.surname).toBe('');
      expect(newOwner.productOwner.status).toBe('active');
      expect(newOwner.address.line_1).toBe('');
    });

    it('should generate unique tempIds for multiple owners', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner1: any, owner2: any;
      act(() => {
        owner1 = result.current.addProductOwner();
        owner2 = result.current.addProductOwner();
      });

      expect(owner1.tempId).not.toBe(owner2.tempId);
      expect(result.current.productOwners).toHaveLength(2);
    });

    it('should return the newly created product owner', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let returnedOwner: any;
      act(() => {
        returnedOwner = result.current.addProductOwner();
      });

      expect(returnedOwner).toBeDefined();
      expect(returnedOwner.tempId).toBeDefined();
      expect(returnedOwner.productOwner).toBeDefined();
      expect(returnedOwner.address).toBeDefined();
    });
  });

  describe('updateProductOwner', () => {
    it('should update product owner firstname', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner: any;
      act(() => {
        owner = result.current.addProductOwner();
        result.current.updateProductOwner(owner.tempId, 'firstname', 'John');
      });

      expect(result.current.productOwners[0].productOwner.firstname).toBe('John');
    });

    it('should update product owner surname', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner: any;
      act(() => {
        owner = result.current.addProductOwner();
        result.current.updateProductOwner(owner.tempId, 'surname', 'Smith');
      });

      expect(result.current.productOwners[0].productOwner.surname).toBe('Smith');
    });

    it('should not update other product owners', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner1: any, owner2: any;
      act(() => {
        owner1 = result.current.addProductOwner();
        owner2 = result.current.addProductOwner();
        result.current.updateProductOwner(owner1.tempId, 'firstname', 'John');
      });

      expect(result.current.productOwners[0].productOwner.firstname).toBe('John');
      expect(result.current.productOwners[1].productOwner.firstname).toBe('');
    });
  });

  describe('updateProductOwnerAddress', () => {
    it('should update address line_1', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner: any;
      act(() => {
        owner = result.current.addProductOwner();
        result.current.updateProductOwnerAddress(owner.tempId, 'line_1', '123 Main St');
      });

      expect(result.current.productOwners[0].address.line_1).toBe('123 Main St');
    });

    it('should update address line_2', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner: any;
      act(() => {
        owner = result.current.addProductOwner();
        result.current.updateProductOwnerAddress(owner.tempId, 'line_2', 'Apt 4B');
      });

      expect(result.current.productOwners[0].address.line_2).toBe('Apt 4B');
    });
  });

  describe('removeProductOwner', () => {
    it('should remove product owner by tempId', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner: any;
      act(() => {
        owner = result.current.addProductOwner();
        result.current.removeProductOwner(owner.tempId);
      });

      expect(result.current.productOwners).toHaveLength(0);
    });

    it('should remove correct product owner when multiple exist', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner1: any, owner2: any;
      act(() => {
        owner1 = result.current.addProductOwner();
        owner2 = result.current.addProductOwner();
        result.current.updateProductOwner(owner1.tempId, 'firstname', 'John');
        result.current.updateProductOwner(owner2.tempId, 'firstname', 'Jane');
        result.current.removeProductOwner(owner1.tempId);
      });

      expect(result.current.productOwners).toHaveLength(1);
      expect(result.current.productOwners[0].productOwner.firstname).toBe('Jane');
    });
  });

  describe('validateAll', () => {
    it('should return false when client group name is empty', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let isValid: boolean = true;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid).toBe(false);
      expect(result.current.validationErrors.clientGroup?.name).toBeDefined();
    });

    it('should return false when client group status is empty', () => {
      const { result } = renderHook(() => useClientGroupForm());

      act(() => {
        result.current.updateClientGroup('name', 'Test Group');
        result.current.updateClientGroup('status', '');
      });

      let isValid: boolean = true;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid).toBe(false);
      expect(result.current.validationErrors.clientGroup?.status).toBeDefined();
    });

    it('should return false when product owner firstname is empty', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner: any;
      act(() => {
        result.current.updateClientGroup('name', 'Test Group');
        result.current.updateClientGroup('status', 'active');
        owner = result.current.addProductOwner();
        result.current.updateProductOwner(owner.tempId, 'surname', 'Smith');
      });

      let isValid: boolean = true;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid).toBe(false);
      expect(result.current.validationErrors.productOwners?.[owner.tempId]?.firstname).toBeDefined();
    });

    it('should return false when product owner surname is empty', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner: any;
      act(() => {
        result.current.updateClientGroup('name', 'Test Group');
        result.current.updateClientGroup('status', 'active');
        owner = result.current.addProductOwner();
        result.current.updateProductOwner(owner.tempId, 'firstname', 'John');
      });

      let isValid: boolean = true;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid).toBe(false);
      expect(result.current.validationErrors.productOwners?.[owner.tempId]?.surname).toBeDefined();
    });

    it('should return true when all required fields are valid', () => {
      const { result } = renderHook(() => useClientGroupForm());

      let owner: any;
      act(() => {
        result.current.updateClientGroup('name', 'Test Group');
        result.current.updateClientGroup('status', 'active');
        owner = result.current.addProductOwner();
        result.current.updateProductOwner(owner.tempId, 'firstname', 'John');
        result.current.updateProductOwner(owner.tempId, 'surname', 'Smith');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid).toBe(true);
      expect(result.current.validationErrors.clientGroup).toBeUndefined();
      expect(result.current.validationErrors.productOwners?.[owner.tempId]).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset client group to initial state', () => {
      const { result } = renderHook(() => useClientGroupForm());

      act(() => {
        result.current.updateClientGroup('name', 'Test Group');
        result.current.updateClientGroup('type', 'Joint');
        result.current.reset();
      });

      expect(result.current.clientGroup.name).toBe('');
      expect(result.current.clientGroup.type).toBe('');
      expect(result.current.clientGroup.status).toBe('active');
    });

    it('should clear all product owners', () => {
      const { result } = renderHook(() => useClientGroupForm());

      act(() => {
        result.current.addProductOwner();
        result.current.addProductOwner();
        result.current.reset();
      });

      expect(result.current.productOwners).toHaveLength(0);
    });

    it('should clear all validation errors', () => {
      const { result } = renderHook(() => useClientGroupForm());

      act(() => {
        result.current.validateAll();
        result.current.reset();
      });

      expect(result.current.validationErrors).toEqual({});
    });
  });
});
