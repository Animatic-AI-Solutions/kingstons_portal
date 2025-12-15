/**
 * useRelationshipValidation Hook (Cycle 7)
 *
 * Provides form validation for special relationship modals.
 * - Validation on blur for each field
 * - Validation on submit
 * - Error state management
 *
 * Validation Rules:
 * - Name: required, 1-200 chars
 * - Relationship Type: required, 1-50 chars
 * - DOB: optional, valid date, not future, age 0-120
 * - Email: optional, valid format
 * - Phone: optional, UK format (10-15 digits)
 * - Status: required
 */

import { useState, useCallback } from 'react';
import { RelationshipStatus, RelationshipType } from '@/types/specialRelationship';

export interface RelationshipFormData {
  name: string;
  relationship_type: string;
  status: RelationshipStatus;
  date_of_birth?: string;
  email?: string;
  phone_number?: string;
}

export interface ValidationErrors {
  name?: string;
  relationship_type?: string;
  status?: string;
  date_of_birth?: string;
  email?: string;
  phone_number?: string;
}

export interface UseRelationshipValidationReturn {
  errors: ValidationErrors;
  hasErrors: boolean;
  validateField: (field: keyof RelationshipFormData, value: any) => string | undefined;
  handleBlur: (field: keyof RelationshipFormData, value: any) => void;
  handleChange: (field: keyof RelationshipFormData, value: any) => void;
  validateForm: (data: Partial<RelationshipFormData>) => ValidationErrors;
  clearError: (field: keyof ValidationErrors) => void;
  clearErrors: () => void;
  clearAllErrors: () => void;
  setErrors: (errors: ValidationErrors) => void;
}

/**
 * Email validation regex
 * Basic email format validation
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone number validation
 * UK format: 10-15 digits (allowing spaces, dashes, parentheses)
 */
const PHONE_REGEX = /^[\d\s\-()]{10,15}$/;

/**
 * Extract digits from phone number for length validation
 */
const extractDigits = (phone: string): string => {
  return phone.replace(/[^\d]/g, '');
};

/**
 * Validate date of birth
 * - Must be valid date
 * - Not in future
 * - Age between 0-120 years
 */
const validateDateOfBirth = (dob: string): string | undefined => {
  if (!dob) return undefined; // Optional field

  const date = new Date(dob);
  const now = new Date();

  // Check if valid date
  if (isNaN(date.getTime())) {
    return 'Please enter a valid date';
  }

  // Check if not in future
  if (date > now) {
    return 'Date cannot be in the future';
  }

  // Check age range (0-120 years)
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  const dayDiff = now.getDate() - date.getDate();

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  if (age > 120) {
    return 'Age must be between 0 and 120 years';
  }

  return undefined;
};

/**
 * Validate email format
 */
const validateEmail = (email: string): string | undefined => {
  if (!email) return undefined; // Optional field

  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address';
  }

  return undefined;
};

/**
 * Validate phone number
 */
const validatePhone = (phone: string): string | undefined => {
  if (!phone) return undefined; // Optional field

  // Check for invalid characters (only digits, spaces, dashes, parentheses, and + allowed)
  if (!/^[\d\s\-+()]+$/.test(phone)) {
    return 'Please enter a valid phone number';
  }

  const digits = extractDigits(phone);

  if (digits.length < 10) {
    return 'Phone number must be at least 10 digits';
  }

  if (digits.length > 15) {
    return 'Phone number must be no more than 15 digits';
  }

  return undefined;
};

/**
 * Validate name field
 */
const validateName = (name: string): string | undefined => {
  if (!name || name.trim().length === 0) {
    return 'Name is required';
  }

  if (name.length > 200) {
    return 'Name must be 200 characters or less';
  }

  return undefined;
};

/**
 * Validate relationship type
 */
const validateRelationshipType = (type: string): string | undefined => {
  if (!type || type.trim().length === 0) {
    return 'Relationship type is required';
  }

  if (type.length > 50) {
    return 'Relationship type must be 50 characters or less';
  }

  return undefined;
};

export const useRelationshipValidation = (): UseRelationshipValidationReturn => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (field: keyof RelationshipFormData, value: any): string | undefined => {
      let error: string | undefined;

      switch (field) {
        case 'name':
          error = validateName(value);
          break;
        case 'relationship_type':
          error = validateRelationshipType(value);
          break;
        case 'status':
          if (!value) {
            error = 'Status is required';
          } else if (value !== 'Active' && value !== 'Inactive' && value !== 'Deceased') {
            error = 'Invalid status value';
          }
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
   * Returns errors object (empty if valid)
   */
  const validateForm = useCallback(
    (data: Partial<RelationshipFormData>): ValidationErrors => {
      const newErrors: ValidationErrors = {};

      // Validate name
      if (data.name !== undefined) {
        const error = validateName(data.name);
        if (error) newErrors.name = error;
      } else {
        newErrors.name = 'Name is required';
      }

      // Validate relationship type
      if (data.relationship_type !== undefined) {
        const error = validateRelationshipType(data.relationship_type);
        if (error) newErrors.relationship_type = error;
      } else {
        newErrors.relationship_type = 'Relationship type is required';
      }

      // Validate status
      if (!data.status) {
        newErrors.status = 'Status is required';
      } else if (data.status !== 'Active' && data.status !== 'Inactive' && data.status !== 'Deceased') {
        newErrors.status = 'Invalid status value';
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

      setErrors(newErrors);
      return newErrors;
    },
    []
  );

  /**
   * Clear error for specific field
   */
  const clearError = useCallback((field: keyof ValidationErrors) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Handle blur event - validate field
   * Wrapper around validateField for blur event handling
   */
  const handleBlur = useCallback((field: keyof RelationshipFormData, value: any) => {
    validateField(field, value);
  }, [validateField]);

  /**
   * Handle change event - only validates email and phone for real-time feedback
   * Clears error for other fields when user types
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
