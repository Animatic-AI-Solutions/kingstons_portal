/**
 * useRelationshipValidation Hook Tests (Cycle 7 - RED Phase)
 *
 * Comprehensive test suite for the relationship validation hook.
 * Tests all validation rules, error handling, blur/change behaviors, and edge cases.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @hook useRelationshipValidation
 * @requirements
 * - Validate name (required, 1-200 characters)
 * - Validate relationship category/type (required, 'Personal' or 'Professional')
 * - Validate relationship (required, 1-50 characters, e.g., 'Spouse', 'Accountant')
 * - Validate date of birth (valid date, not in future, age 0-120)
 * - Validate email (valid format, optional)
 * - Validate phone (UK format, optional, 10-15 digits)
 * - Validate status (required, valid values)
 * - Handle blur events (validate on blur)
 * - Handle change events (clear errors, validate email/phone on change)
 * - Validate entire form
 * - Clear all errors
 * - Provide hasErrors flag
 */

import { renderHook, act } from '@testing-library/react';
import { useRelationshipValidation } from '@/hooks/useRelationshipValidation';
import { SpecialRelationshipFormData } from '@/types/specialRelationship';

describe('useRelationshipValidation Hook', () => {
  // =================================================================
  // Name Validation Tests
  // =================================================================

  describe('Name Validation', () => {
    it('should return error when name is empty', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('name', '');
      });

      expect(result.current.errors.name).toBe('Name is required');
    });

    it('should return error when name is only whitespace', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('name', '   ');
      });

      expect(result.current.errors.name).toBe('Name is required');
    });

    it('should return error when name exceeds 200 characters', () => {
      const { result } = renderHook(() => useRelationshipValidation());
      const longName = 'A'.repeat(201);

      act(() => {
        result.current.handleBlur('name', longName);
      });

      expect(result.current.errors.name).toBe('Name must be 200 characters or less');
    });

    it('should accept valid name', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('name', 'John Smith');
      });

      expect(result.current.errors.name).toBeUndefined();
    });

    it('should accept name at maximum length (200 chars)', () => {
      const { result } = renderHook(() => useRelationshipValidation());
      const maxName = 'A'.repeat(200);

      act(() => {
        result.current.handleBlur('name', maxName);
      });

      expect(result.current.errors.name).toBeUndefined();
    });

    it('should trim whitespace before validation', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('name', '  Valid Name  ');
      });

      expect(result.current.errors.name).toBeUndefined();
    });
  });

  // =================================================================
  // Relationship Category (Type) Validation Tests
  // =================================================================

  describe('Relationship Category (Type) Validation', () => {
    it('should return error when type is empty', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('type', '');
      });

      expect(result.current.errors.type).toBe('Relationship category is required');
    });

    it('should return error when type is only whitespace', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('type', '   ');
      });

      expect(result.current.errors.type).toBe('Relationship category is required');
    });

    it('should return error when type is invalid', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('type', 'InvalidCategory');
      });

      expect(result.current.errors.type).toBe('Relationship category must be Personal or Professional');
    });

    it('should accept Personal as valid type', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('type', 'Personal');
      });

      expect(result.current.errors.type).toBeUndefined();
    });

    it('should accept Professional as valid type', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('type', 'Professional');
      });

      expect(result.current.errors.type).toBeUndefined();
    });
  });

  // =================================================================
  // Relationship Validation Tests
  // =================================================================

  describe('Relationship Validation', () => {
    it('should return error when relationship is empty', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('relationship', '');
      });

      expect(result.current.errors.relationship).toBe('Relationship is required');
    });

    it('should return error when relationship is only whitespace', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('relationship', '   ');
      });

      expect(result.current.errors.relationship).toBe('Relationship is required');
    });

    it('should return error when relationship exceeds 50 characters', () => {
      const { result } = renderHook(() => useRelationshipValidation());
      const longRelationship = 'A'.repeat(51);

      act(() => {
        result.current.handleBlur('relationship', longRelationship);
      });

      expect(result.current.errors.relationship).toBe('Relationship must be 50 characters or less');
    });

    it('should accept valid relationship (Spouse)', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('relationship', 'Spouse');
      });

      expect(result.current.errors.relationship).toBeUndefined();
    });

    it('should accept valid relationship (Accountant)', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('relationship', 'Accountant');
      });

      expect(result.current.errors.relationship).toBeUndefined();
    });

    it('should accept relationship at maximum length (50 chars)', () => {
      const { result } = renderHook(() => useRelationshipValidation());
      const maxRelationship = 'A'.repeat(50);

      act(() => {
        result.current.handleBlur('relationship', maxRelationship);
      });

      expect(result.current.errors.relationship).toBeUndefined();
    });
  });

  // =================================================================
  // Date of Birth Validation Tests
  // =================================================================

  describe('Date of Birth Validation', () => {
    it('should allow empty date of birth (optional field)', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('date_of_birth', '');
      });

      expect(result.current.errors.date_of_birth).toBeUndefined();
    });

    it('should allow null date of birth', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('date_of_birth', null as any);
      });

      expect(result.current.errors.date_of_birth).toBeUndefined();
    });

    it('should return error for invalid date format', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('date_of_birth', 'invalid-date');
      });

      expect(result.current.errors.date_of_birth).toBe('Please enter a valid date');
    });

    it('should return error when date is in the future', () => {
      const { result } = renderHook(() => useRelationshipValidation());
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      act(() => {
        result.current.handleBlur('date_of_birth', futureDate.toISOString());
      });

      expect(result.current.errors.date_of_birth).toBe('Date cannot be in the future');
    });

    it('should return error when age exceeds 120 years', () => {
      const { result } = renderHook(() => useRelationshipValidation());
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 121);

      act(() => {
        result.current.handleBlur('date_of_birth', oldDate.toISOString());
      });

      expect(result.current.errors.date_of_birth).toBe('Age must be between 0 and 120 years');
    });

    it('should accept valid date of birth', () => {
      const { result } = renderHook(() => useRelationshipValidation());
      const validDate = new Date('1980-01-01').toISOString();

      act(() => {
        result.current.handleBlur('date_of_birth', validDate);
      });

      expect(result.current.errors.date_of_birth).toBeUndefined();
    });

    it('should accept date exactly 120 years ago', () => {
      const { result } = renderHook(() => useRelationshipValidation());
      const date120Years = new Date();
      date120Years.setFullYear(date120Years.getFullYear() - 120);

      act(() => {
        result.current.handleBlur('date_of_birth', date120Years.toISOString());
      });

      expect(result.current.errors.date_of_birth).toBeUndefined();
    });

    it('should accept today as date of birth (newborn)', () => {
      const { result } = renderHook(() => useRelationshipValidation());
      const today = new Date().toISOString();

      act(() => {
        result.current.handleBlur('date_of_birth', today);
      });

      expect(result.current.errors.date_of_birth).toBeUndefined();
    });
  });

  // =================================================================
  // Email Validation Tests
  // =================================================================

  describe('Email Validation', () => {
    it('should allow empty email (optional field)', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('email', '');
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it('should allow null email', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('email', null as any);
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it('should return error for invalid email format', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('email', 'invalid-email');
      });

      expect(result.current.errors.email).toBe('Please enter a valid email address');
    });

    it('should return error for email without @', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('email', 'invalidemail.com');
      });

      expect(result.current.errors.email).toBe('Please enter a valid email address');
    });

    it('should return error for email without domain', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('email', 'user@');
      });

      expect(result.current.errors.email).toBe('Please enter a valid email address');
    });

    it('should accept valid email', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('email', 'user@example.com');
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it('should accept email with subdomains', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('email', 'user@mail.example.co.uk');
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it('should validate email on change for real-time feedback', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      // First blur to mark field as touched
      act(() => {
        result.current.handleBlur('email', 'test@example.com');
      });

      // Change to invalid email
      act(() => {
        result.current.handleChange('email', 'invalid');
      });

      expect(result.current.errors.email).toBe('Please enter a valid email address');
    });
  });

  // =================================================================
  // Phone Number Validation Tests
  // =================================================================

  describe('Phone Number Validation', () => {
    it('should allow empty phone number (optional field)', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('phone_number', '');
      });

      expect(result.current.errors.phone_number).toBeUndefined();
    });

    it('should allow null phone number', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('phone_number', null as any);
      });

      expect(result.current.errors.phone_number).toBeUndefined();
    });

    it('should return error for invalid characters in phone', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('phone_number', '0123-ABC-4567');
      });

      expect(result.current.errors.phone_number).toBe('Please enter a valid phone number');
    });

    it('should return error for phone with less than 10 digits', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('phone_number', '123456789');
      });

      expect(result.current.errors.phone_number).toBe('Phone number must be at least 10 digits');
    });

    it('should accept valid UK phone number', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('phone_number', '01234 567890');
      });

      expect(result.current.errors.phone_number).toBeUndefined();
    });

    it('should accept phone with +44 country code', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('phone_number', '+44-7700-900001');
      });

      expect(result.current.errors.phone_number).toBeUndefined();
    });

    it('should accept phone with parentheses', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('phone_number', '(01234) 567890');
      });

      expect(result.current.errors.phone_number).toBeUndefined();
    });

    it('should accept phone with hyphens and spaces', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('phone_number', '01234-567-890');
      });

      expect(result.current.errors.phone_number).toBeUndefined();
    });

    it('should validate phone on change for real-time feedback', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      // First blur to mark field as touched
      act(() => {
        result.current.handleBlur('phone_number', '01234567890');
      });

      // Change to invalid phone
      act(() => {
        result.current.handleChange('phone_number', '123');
      });

      expect(result.current.errors.phone_number).toBe('Phone number must be at least 10 digits');
    });
  });

  // =================================================================
  // Status Validation Tests
  // =================================================================

  describe('Status Validation', () => {
    it('should return error when status is empty', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('status', '');
      });

      expect(result.current.errors.status).toBe('Status is required');
    });

    it('should return error for invalid status value', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('status', 'InvalidStatus');
      });

      expect(result.current.errors.status).toBe('Invalid status value');
    });

    it('should accept Active status', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('status', 'Active');
      });

      expect(result.current.errors.status).toBeUndefined();
    });

    it('should accept Inactive status', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('status', 'Inactive');
      });

      expect(result.current.errors.status).toBeUndefined();
    });

    it('should accept Deceased status', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('status', 'Deceased');
      });

      expect(result.current.errors.status).toBeUndefined();
    });
  });

  // =================================================================
  // Form Validation Tests
  // =================================================================

  describe('Form Validation', () => {
    it('should validate entire form with all required fields', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      const formData: Partial<SpecialRelationshipFormData> = {
        name: 'John Smith',
        type: 'Personal',
        relationship: 'Spouse',
        status: 'Active',
      };

      let errors: any;
      act(() => {
        errors = result.current.validateForm(formData as SpecialRelationshipFormData);
      });

      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should return all errors for invalid form', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      const formData: Partial<SpecialRelationshipFormData> = {
        name: '',
        type: '',
        relationship: '',
        status: '',
        email: 'invalid-email',
        phone_number: '123',
      };

      let errors: any;
      act(() => {
        errors = result.current.validateForm(formData as SpecialRelationshipFormData);
      });

      expect(errors.name).toBeDefined();
      expect(errors.type).toBeDefined();
      expect(errors.relationship).toBeDefined();
      expect(errors.status).toBeDefined();
      expect(errors.email).toBeDefined();
      expect(errors.phone_number).toBeDefined();
    });

    it('should validate optional fields when provided', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      const formData: Partial<SpecialRelationshipFormData> = {
        name: 'John Smith',
        type: 'Personal',
        relationship: 'Spouse',
        status: 'Active',
        email: 'john@example.com',
        phone_number: '01234567890',
        date_of_birth: '1980-01-01',
      };

      let errors: any;
      act(() => {
        errors = result.current.validateForm(formData as SpecialRelationshipFormData);
      });

      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should update errors state after form validation', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      const formData: Partial<SpecialRelationshipFormData> = {
        name: '',
        type: 'Personal',
        relationship: 'Spouse',
        status: 'Active',
      };

      act(() => {
        result.current.validateForm(formData as SpecialRelationshipFormData);
      });

      expect(result.current.errors.name).toBe('Name is required');
    });

    it('should return errors when type is missing', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      const formData: Partial<SpecialRelationshipFormData> = {
        name: 'John Smith',
        relationship: 'Spouse',
        status: 'Active',
      };

      let errors: any;
      act(() => {
        errors = result.current.validateForm(formData as SpecialRelationshipFormData);
      });

      expect(errors.type).toBe('Relationship category is required');
    });

    it('should return errors when relationship is missing', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      const formData: Partial<SpecialRelationshipFormData> = {
        name: 'John Smith',
        type: 'Personal',
        status: 'Active',
      };

      let errors: any;
      act(() => {
        errors = result.current.validateForm(formData as SpecialRelationshipFormData);
      });

      expect(errors.relationship).toBe('Relationship is required');
    });
  });

  // =================================================================
  // Blur/Change Handling Tests
  // =================================================================

  describe('Blur and Change Handling', () => {
    it('should clear error when user starts typing in field', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      // Set error via blur
      act(() => {
        result.current.handleBlur('name', '');
      });

      expect(result.current.errors.name).toBe('Name is required');

      // Clear error via change
      act(() => {
        result.current.handleChange('name', 'J');
      });

      expect(result.current.errors.name).toBeUndefined();
    });

    it('should mark field as touched on blur', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('name', 'John');
      });

      // Field should be marked as touched (errors should persist even if valid)
      expect(result.current.errors.name).toBeUndefined();
    });

    it('should not validate on change unless field is email or phone', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleChange('name', '');
      });

      // Name should not be validated on change
      expect(result.current.errors.name).toBeUndefined();
    });
  });

  // =================================================================
  // Error Clearing Tests
  // =================================================================

  describe('Error Clearing', () => {
    it('should clear all errors', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      // Set multiple errors
      act(() => {
        result.current.handleBlur('name', '');
        result.current.handleBlur('type', '');
        result.current.handleBlur('relationship', '');
        result.current.handleBlur('status', '');
      });

      expect(result.current.errors.name).toBeDefined();
      expect(result.current.errors.type).toBeDefined();
      expect(result.current.errors.relationship).toBeDefined();
      expect(result.current.errors.status).toBeDefined();

      // Clear all errors
      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual({});
    });

    it('should clear touched fields when clearing errors', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      // Touch and validate fields
      act(() => {
        result.current.handleBlur('name', '');
      });

      expect(result.current.errors.name).toBeDefined();

      // Clear errors
      act(() => {
        result.current.clearErrors();
      });

      // Re-validate after clearing - should not auto-validate untouched fields
      act(() => {
        result.current.handleChange('name', '');
      });

      expect(result.current.errors.name).toBeUndefined();
    });
  });

  // =================================================================
  // hasErrors Flag Tests
  // =================================================================

  describe('hasErrors Flag', () => {
    it('should return false when no errors', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      expect(result.current.hasErrors).toBe(false);
    });

    it('should return true when errors exist', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('name', '');
      });

      expect(result.current.hasErrors).toBe(true);
    });

    it('should update when errors are cleared', () => {
      const { result } = renderHook(() => useRelationshipValidation());

      act(() => {
        result.current.handleBlur('name', '');
      });

      expect(result.current.hasErrors).toBe(true);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.hasErrors).toBe(false);
    });
  });
});
