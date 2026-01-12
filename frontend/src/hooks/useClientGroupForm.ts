/**
 * Custom hook for managing client group form state
 *
 * Manages all form state for the CreateClientGroup page including:
 * - Client group details (10 fields)
 * - Product owners with addresses (25 + 5 fields per owner)
 * - Validation errors
 * - Form actions (add/update/remove)
 *
 * @returns Form state and actions for client group creation
 */

import { useState, useCallback } from 'react';
import type {
  ClientGroupFormData,
  ProductOwnerFormData,
  AddressFormData,
  ProductOwnerWithAddress,
  ValidationErrors,
} from '@/types/clientGroupForm';
import { validateClientGroup } from '@/utils/validation/clientGroupValidation';
import { validateProductOwner } from '@/utils/validation/productOwnerValidation';

/**
 * Creates initial empty client group form data
 * All required fields initialized to empty strings or default values
 */
const createInitialClientGroup = (): ClientGroupFormData => ({
  name: '',
  type: '',
  status: 'active',
  advisor_id: null,
  client_start_date: '',
  ongoing_start: '',
  client_declaration: '',
  privacy_declaration: '',
  full_fee_agreement: '',
  last_satisfactory_discussion: '',
  notes: '',
});

/**
 * Creates initial empty product owner form data
 * All required fields initialized to empty strings or default values
 */
const createInitialProductOwner = (): ProductOwnerFormData => ({
  // Core Identity (4 fields)
  status: 'active',
  firstname: '',
  surname: '',
  known_as: '',

  // Personal Details (8 fields)
  title: '',
  middle_names: '',
  relationship_status: '',
  gender: '',
  previous_names: '',
  dob: '',
  place_of_birth: '',

  // Contact Information (4 fields)
  email_1: '',
  email_2: '',
  phone_1: '',
  phone_2: '',

  // Residential Information (2 fields)
  moved_in_date: '',
  address_id: null,

  // Profiling (2 fields)
  three_words: '',
  share_data_with: '',

  // Employment (2 fields)
  employment_status: '',
  occupation: '',

  // Compliance (4 fields)
  passport_expiry_date: '',
  ni_number: '',
  aml_complete: false,
  aml_date: '',

  // Notes (1 field)
  notes: '',
});

/**
 * Creates initial empty address form data
 * All fields initialized to empty strings
 */
const createInitialAddress = (): AddressFormData => ({
  line_1: '',
  line_2: '',
  line_3: '',
  line_4: '',
  line_5: '',
});

/**
 * Generates a unique temporary ID for frontend tracking
 * Uses timestamp plus random suffix for uniqueness
 *
 * @returns Unique temporary ID string
 */
const generateTempId = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
};

/**
 * Hook return type defining all state and actions
 */
interface UseClientGroupFormReturn {
  // State
  clientGroup: ClientGroupFormData;
  productOwners: ProductOwnerWithAddress[];
  validationErrors: ValidationErrors;

  // Actions
  updateClientGroup: (field: keyof ClientGroupFormData, value: any) => void;
  addProductOwner: () => ProductOwnerWithAddress;
  updateProductOwner: (tempId: string, field: keyof ProductOwnerFormData, value: any) => void;
  updateProductOwnerAddress: (tempId: string, field: keyof AddressFormData, value: any) => void;
  removeProductOwner: (tempId: string) => void;
  setValidationErrors: (errors: ValidationErrors) => void;
  clearValidationErrors: () => void;
  validateAll: () => boolean;
  reset: () => void;
}

/**
 * Custom hook for managing client group form state
 *
 * Provides centralized state management for the complex client group creation form.
 * Handles multiple product owners with addresses, validation, and form actions.
 *
 * @example
 * ```typescript
 * const {
 *   clientGroup,
 *   productOwners,
 *   validationErrors,
 *   updateClientGroup,
 *   addProductOwner,
 *   validateAll
 * } = useClientGroupForm();
 *
 * // Update client group field
 * updateClientGroup('name', 'Smith Family');
 *
 * // Add a new product owner
 * addProductOwner();
 *
 * // Validate before submission
 * if (validateAll()) {
 *   // Submit form
 * }
 * ```
 */
export const useClientGroupForm = (): UseClientGroupFormReturn => {
  // State
  const [clientGroup, setClientGroup] = useState<ClientGroupFormData>(createInitialClientGroup());
  const [productOwners, setProductOwners] = useState<ProductOwnerWithAddress[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  /**
   * Updates a single field in the client group form data
   *
   * @param field - The field name to update
   * @param value - The new value for the field
   */
  const updateClientGroup = useCallback((field: keyof ClientGroupFormData, value: any) => {
    setClientGroup((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Adds a new empty product owner with address to the form
   * Generates a unique tempId for frontend tracking
   */
  const addProductOwner = useCallback(() => {
    const newProductOwner: ProductOwnerWithAddress = {
      tempId: generateTempId(),
      productOwner: createInitialProductOwner(),
      address: createInitialAddress(),
    };

    setProductOwners((prev) => [...prev, newProductOwner]);
    return newProductOwner;
  }, []);

  /**
   * Updates a single field in a product owner's data
   * Finds the owner by tempId and updates the specified field
   *
   * @param tempId - Temporary ID of the product owner to update
   * @param field - The field name to update
   * @param value - The new value for the field
   */
  const updateProductOwner = useCallback(
    (tempId: string, field: keyof ProductOwnerFormData, value: any) => {
      setProductOwners((prev) =>
        prev.map((po) =>
          po.tempId === tempId
            ? {
                ...po,
                productOwner: {
                  ...po.productOwner,
                  [field]: value,
                },
              }
            : po
        )
      );
    },
    []
  );

  /**
   * Updates a single field in a product owner's address
   * Finds the owner by tempId and updates the address field
   *
   * @param tempId - Temporary ID of the product owner whose address to update
   * @param field - The address field name to update
   * @param value - The new value for the field
   */
  const updateProductOwnerAddress = useCallback(
    (tempId: string, field: keyof AddressFormData, value: any) => {
      setProductOwners((prev) =>
        prev.map((po) =>
          po.tempId === tempId
            ? {
                ...po,
                address: {
                  ...po.address,
                  [field]: value,
                },
              }
            : po
        )
      );
    },
    []
  );

  /**
   * Removes a product owner from the form
   * Filters out the owner by tempId
   *
   * @param tempId - Temporary ID of the product owner to remove
   */
  const removeProductOwner = useCallback((tempId: string) => {
    setProductOwners((prev) => prev.filter((po) => po.tempId !== tempId));
  }, []);

  /**
   * Clears all validation errors
   */
  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  /**
   * Validates all form data (client group and all product owners)
   * Sets validation errors state and returns overall validity
   *
   * @returns True if all validation passes, false otherwise
   */
  const validateAll = useCallback((): boolean => {
    const errors: ValidationErrors = {
      clientGroup: {},
      productOwners: {},
    };

    // Validate client group
    const cgErrors = validateClientGroup(clientGroup);
    if (cgErrors) {
      errors.clientGroup = cgErrors;
    }

    // Validate each product owner and address
    productOwners.forEach((po) => {
      const poErrors = validateProductOwner(po.productOwner, po.address);
      if (poErrors) {
        // Handle nested address errors properly
        const ownerErrors: Record<string, any> = {};

        Object.entries(poErrors).forEach(([key, value]) => {
          // If key starts with 'address.', nest it under address object
          if (key.startsWith('address.')) {
            if (!ownerErrors.address) {
              ownerErrors.address = {};
            }
            const addressField = key.replace('address.', '');
            ownerErrors.address[addressField] = value;
          } else {
            ownerErrors[key] = value;
          }
        });

        errors.productOwners![po.tempId] = ownerErrors;
      }
    });

    // Check if there are any errors
    const hasErrors =
      Object.keys(errors.clientGroup || {}).length > 0 ||
      Object.keys(errors.productOwners || {}).length > 0;

    if (hasErrors) {
      setValidationErrors(errors);
      return false;
    }

    // Clear errors on successful validation
    setValidationErrors({});
    return true;
  }, [clientGroup, productOwners]);

  /**
   * Resets all form state back to initial values
   * Clears client group, product owners, and validation errors
   */
  const reset = useCallback(() => {
    setClientGroup(createInitialClientGroup());
    setProductOwners([]);
    setValidationErrors({});
  }, []);

  return {
    // State
    clientGroup,
    productOwners,
    validationErrors,

    // Actions
    updateClientGroup,
    addProductOwner,
    updateProductOwner,
    updateProductOwnerAddress,
    removeProductOwner,
    setValidationErrors,
    clearValidationErrors,
    validateAll,
    reset,
  };
};
