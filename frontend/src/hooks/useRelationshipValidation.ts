/**
 * useRelationshipValidation Hook (Cycle 7)
 *
 * Provides form validation for special relationship modals with comprehensive
 * field-level and form-level validation.
 *
 * @module useRelationshipValidation
 *
 * Features:
 * - Validation on blur for each field
 * - Real-time validation for email and phone fields
 * - Form-level validation on submit
 * - Centralized error state management
 *
 * Validation Rules:
 * - Name: required, 1-200 chars
 * - Relationship Type: required, 1-50 chars
 * - DOB: optional, valid date, not future, age 0-120
 * - Email: optional, valid RFC 5322 format
 * - Phone: optional, UK format (10-15 digits)
 * - Status: required, one of 'Active', 'Inactive', 'Deceased'
 */

import { useState, useCallback } from 'react';
import {
  RelationshipStatus,
  RelationshipCategory,
  Relationship,
  SpecialRelationshipFormData,
} from '@/types/specialRelationship';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Form data structure for special relationship modals
 * Re-exports SpecialRelationshipFormData from types for consistency
 */
export type RelationshipFormData = SpecialRelationshipFormData;

/**
 * Validation errors keyed by form field name
 */
export interface ValidationErrors {
  name?: string;
  type?: string;
  relationship?: string;
  status?: string;
  date_of_birth?: string;
  email?: string;
  phone_number?: string;
  dependency?: string;
  firm_name?: string;
  product_owner_ids?: string;
}

/**
 * Return type for useRelationshipValidation hook
 */
export interface UseRelationshipValidationReturn {
  /** Current validation errors by field */
  errors: ValidationErrors;
  /** Whether any validation errors exist */
  hasErrors: boolean;
  /** Validate a single field and return error message if invalid */
  validateField: (field: keyof RelationshipFormData, value: any) => string | undefined;
  /** Handle blur event - validates field and updates error state */
  handleBlur: (field: keyof RelationshipFormData, value: any) => void;
  /** Handle change event - validates email/phone, clears errors for other fields */
  handleChange: (field: keyof RelationshipFormData, value: any) => void;
  /** Validate entire form and return all errors */
  validateForm: (data: Partial<RelationshipFormData>) => ValidationErrors;
  /** Clear error for a specific field */
  clearError: (field: keyof ValidationErrors) => void;
  /** Clear all validation errors (alias for clearAllErrors) */
  clearErrors: () => void;
  /** Clear all validation errors */
  clearAllErrors: () => void;
  /** Set validation errors (for API errors) */
  setErrors: (errors: ValidationErrors) => void;
}

// ============================================================================
// Validation Constants
// ============================================================================

/** Email validation regex - Basic RFC 5322 format */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Phone number validation - UK format allowing +, spaces, dashes, parentheses */
const PHONE_ALLOWED_CHARS_REGEX = /^[\d\s\-+()]+$/;

/** Field length constraints */
const VALIDATION_LIMITS = {
  NAME_MAX_LENGTH: 200,
  RELATIONSHIP_MAX_LENGTH: 50,
  FIRM_NAME_MAX_LENGTH: 200,
  PHONE_MIN_DIGITS: 10,
  PHONE_MAX_DIGITS: 15,
  MAX_AGE_YEARS: 120,
} as const;

/**
 * Validation error messages
 * Exported for potential reuse in components
 */
export const ERROR_MESSAGES = {
  NAME_REQUIRED: 'Name is required',
  NAME_TOO_LONG: 'Name must be 200 characters or less',
  TYPE_REQUIRED: 'Relationship category is required',
  TYPE_INVALID: 'Relationship category must be Personal or Professional',
  RELATIONSHIP_REQUIRED: 'Relationship is required',
  RELATIONSHIP_TOO_LONG: 'Relationship must be 50 characters or less',
  DATE_INVALID: 'Please enter a valid date',
  DATE_FUTURE: 'Date cannot be in the future',
  AGE_INVALID: 'Age must be between 0 and 120 years',
  EMAIL_INVALID: 'Please enter a valid email address',
  PHONE_INVALID: 'Please enter a valid phone number',
  PHONE_TOO_SHORT: 'Phone number must be at least 10 digits',
  PHONE_TOO_LONG: 'Phone number must be no more than 15 digits',
  STATUS_REQUIRED: 'Status is required',
  STATUS_INVALID: 'Invalid status value',
  FIRM_NAME_TOO_LONG: 'Firm name must be 200 characters or less',
  PRODUCT_OWNERS_REQUIRED: 'At least one product owner is required',
} as const;

/** Valid status values for relationship status field */
const VALID_STATUS_VALUES: readonly RelationshipStatus[] = ['Active', 'Inactive', 'Deceased'] as const;

/** Valid relationship category values */
const VALID_CATEGORY_VALUES: readonly RelationshipCategory[] = ['Personal', 'Professional'] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract digits from phone number for length validation
 * @param phone - Phone number string with formatting characters
 * @returns String containing only digits
 */
const extractDigits = (phone: string): string => {
  return phone.replace(/[^\d]/g, '');
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate name field
 * @param name - Name value to validate
 * @returns Error message if invalid, undefined if valid
 */
const validateName = (name: string): string | undefined => {
  if (!name || name.trim().length === 0) {
    return ERROR_MESSAGES.NAME_REQUIRED;
  }

  if (name.length > VALIDATION_LIMITS.NAME_MAX_LENGTH) {
    return ERROR_MESSAGES.NAME_TOO_LONG;
  }

  return undefined;
};

/**
 * Validate relationship category (type) field
 * @param type - Relationship category value to validate
 * @returns Error message if invalid, undefined if valid
 */
const validateType = (type: string): string | undefined => {
  if (!type || type.trim().length === 0) {
    return ERROR_MESSAGES.TYPE_REQUIRED;
  }

  if (!VALID_CATEGORY_VALUES.includes(type as RelationshipCategory)) {
    return ERROR_MESSAGES.TYPE_INVALID;
  }

  return undefined;
};

/**
 * Validate relationship field (specific relationship like 'Spouse', 'Accountant')
 * @param relationship - Relationship value to validate
 * @returns Error message if invalid, undefined if valid
 */
const validateRelationship = (relationship: string): string | undefined => {
  if (!relationship || relationship.trim().length === 0) {
    return ERROR_MESSAGES.RELATIONSHIP_REQUIRED;
  }

  if (relationship.length > VALIDATION_LIMITS.RELATIONSHIP_MAX_LENGTH) {
    return ERROR_MESSAGES.RELATIONSHIP_TOO_LONG;
  }

  return undefined;
};

/**
 * Validate date of birth
 * - Must be valid date
 * - Not in future
 * - Age between 0-120 years
 * @param dob - Date of birth string (ISO format)
 * @returns Error message if invalid, undefined if valid
 */
const validateDateOfBirth = (dob: string): string | undefined => {
  if (!dob) return undefined; // Optional field

  const date = new Date(dob);
  const now = new Date();

  // Check if valid date
  if (isNaN(date.getTime())) {
    return ERROR_MESSAGES.DATE_INVALID;
  }

  // Check if not in future
  if (date > now) {
    return ERROR_MESSAGES.DATE_FUTURE;
  }

  // Check age range (0-120 years)
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  const dayDiff = now.getDate() - date.getDate();

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  if (age > VALIDATION_LIMITS.MAX_AGE_YEARS) {
    return ERROR_MESSAGES.AGE_INVALID;
  }

  return undefined;
};

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns Error message if invalid, undefined if valid
 */
const validateEmail = (email: string): string | undefined => {
  if (!email) return undefined; // Optional field

  if (!EMAIL_REGEX.test(email)) {
    return ERROR_MESSAGES.EMAIL_INVALID;
  }

  return undefined;
};

/**
 * Validate phone number (UK format)
 * @param phone - Phone number to validate
 * @returns Error message if invalid, undefined if valid
 */
const validatePhone = (phone: string): string | undefined => {
  if (!phone) return undefined; // Optional field

  // Check for invalid characters (only digits, spaces, dashes, parentheses, and + allowed)
  if (!PHONE_ALLOWED_CHARS_REGEX.test(phone)) {
    return ERROR_MESSAGES.PHONE_INVALID;
  }

  const digits = extractDigits(phone);

  if (digits.length < VALIDATION_LIMITS.PHONE_MIN_DIGITS) {
    return ERROR_MESSAGES.PHONE_TOO_SHORT;
  }

  if (digits.length > VALIDATION_LIMITS.PHONE_MAX_DIGITS) {
    return ERROR_MESSAGES.PHONE_TOO_LONG;
  }

  return undefined;
};

/**
 * Validate status field
 * @param status - Status value to validate
 * @returns Error message if invalid, undefined if valid
 */
const validateStatus = (status: string): string | undefined => {
  if (!status) {
    return ERROR_MESSAGES.STATUS_REQUIRED;
  }

  if (!VALID_STATUS_VALUES.includes(status as RelationshipStatus)) {
    return ERROR_MESSAGES.STATUS_INVALID;
  }

  return undefined;
};

/**
 * Validate product_owner_ids field
 * @param productOwnerIds - Array of product owner IDs to validate
 * @returns Error message if invalid, undefined if valid
 */
const validateProductOwnerIds = (productOwnerIds: number[] | undefined): string | undefined => {
  if (!productOwnerIds || productOwnerIds.length === 0) {
    return ERROR_MESSAGES.PRODUCT_OWNERS_REQUIRED;
  }

  return undefined;
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for validating special relationship form data
 * @returns Validation state and methods
 */
export const useRelationshipValidation = (): UseRelationshipValidationReturn => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  /**
   * Validate a single form field
   * @param field - Field name to validate
   * @param value - Field value to validate
   * @returns Error message if invalid, undefined if valid
   */
  const validateField = useCallback(
    (field: keyof RelationshipFormData, value: any): string | undefined => {
      let error: string | undefined;

      switch (field) {
        case 'name':
          error = validateName(value);
          break;
        case 'type':
          error = validateType(value);
          break;
        case 'relationship':
          error = validateRelationship(value);
          break;
        case 'status':
          error = validateStatus(value);
          break;
        case 'date_of_birth':
          error = validateDateOfBirth(value);
          break;
        case 'email':
          error = validateEmail(value);
          break;
        case 'phone_number':
          error = validatePhone(value);
          break;
        case 'product_owner_ids':
          error = validateProductOwnerIds(value);
          break;
        default:
          break;
      }

      // Update errors state
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }

      return error;
    },
    []
  );

  /**
   * Validate entire form
   * @param data - Form data to validate (partial for flexibility)
   * @returns Object with validation errors (empty object if valid)
   */
  const validateForm = useCallback(
    (data: Partial<RelationshipFormData>): ValidationErrors => {
      const newErrors: ValidationErrors = {};

      // Validate name (required)
      if (data.name !== undefined) {
        const error = validateName(data.name);
        if (error) newErrors.name = error;
      } else {
        newErrors.name = ERROR_MESSAGES.NAME_REQUIRED;
      }

      // Validate type (required)
      if (data.type !== undefined) {
        const error = validateType(data.type);
        if (error) newErrors.type = error;
      } else {
        newErrors.type = ERROR_MESSAGES.TYPE_REQUIRED;
      }

      // Validate relationship (required)
      if (data.relationship !== undefined) {
        const error = validateRelationship(data.relationship);
        if (error) newErrors.relationship = error;
      } else {
        newErrors.relationship = ERROR_MESSAGES.RELATIONSHIP_REQUIRED;
      }

      // Validate status (required)
      if (data.status) {
        const error = validateStatus(data.status);
        if (error) newErrors.status = error;
      } else {
        newErrors.status = ERROR_MESSAGES.STATUS_REQUIRED;
      }

      // Validate optional fields
      if (data.date_of_birth) {
        const error = validateDateOfBirth(data.date_of_birth);
        if (error) newErrors.date_of_birth = error;
      }

      if (data.email) {
        const error = validateEmail(data.email);
        if (error) newErrors.email = error;
      }

      if (data.phone_number) {
        const error = validatePhone(data.phone_number);
        if (error) newErrors.phone_number = error;
      }

      if (data.firm_name && data.firm_name.length > VALIDATION_LIMITS.FIRM_NAME_MAX_LENGTH) {
        newErrors.firm_name = ERROR_MESSAGES.FIRM_NAME_TOO_LONG;
      }

      // Validate product_owner_ids (required)
      if (data.product_owner_ids !== undefined) {
        const error = validateProductOwnerIds(data.product_owner_ids);
        if (error) newErrors.product_owner_ids = error;
      } else {
        newErrors.product_owner_ids = ERROR_MESSAGES.PRODUCT_OWNERS_REQUIRED;
      }

      setErrors(newErrors);
      return newErrors;
    },
    []
  );

  /**
   * Clear validation error for a specific field
   * @param field - Field name to clear error for
   */
  const clearError = useCallback((field: keyof ValidationErrors) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  /**
   * Clear all validation errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Handle blur event - validates field and updates error state
   * @param field - Field name that was blurred
   * @param value - Current field value
   */
  const handleBlur = useCallback((field: keyof RelationshipFormData, value: any) => {
    validateField(field, value);
  }, [validateField]);

  /**
   * Handle change event - provides real-time validation for email/phone
   * For other fields, clears error when user types to allow correction
   * @param field - Field name that changed
   * @param value - New field value
   */
  const handleChange = useCallback((field: keyof RelationshipFormData, value: any) => {
    // Only validate email and phone on change for real-time feedback
    if (field === 'email' || field === 'phone_number') {
      validateField(field, value);
    } else {
      // For other fields, just clear the error if it exists
      setErrors((prev) => {
        if (prev[field]) {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        }
        return prev;
      });
    }
  }, [validateField]);

  // Computed property: hasErrors
  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    hasErrors,
    validateField,
    handleBlur,
    handleChange,
    validateForm,
    clearError,
    clearErrors: clearAllErrors, // Alias for compatibility
    clearAllErrors,
    setErrors,
  };
};
