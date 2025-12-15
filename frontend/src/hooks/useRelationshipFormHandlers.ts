/**
 * Relationship Form Helper Utilities
 *
 * Shared utility functions for Create and Edit special relationship modals.
 * Provides common helper functions to reduce code duplication.
 *
 * @module useRelationshipFormHandlers
 *
 * Utilities:
 * - Focus management for validation errors
 * - Detecting changed fields for efficient updates
 */

import { ValidationErrors } from './useRelationshipValidation';
import { RelationshipFormData } from './useRelationshipValidation';

/**
 * Focus first error field in the validation errors object
 * Uses document.getElementById to find and focus the field
 *
 * @param errors - Validation errors object
 */
export const focusFirstError = (errors: ValidationErrors): void => {
  if (Object.keys(errors).length > 0) {
    const firstErrorField = Object.keys(errors)[0];
    const input = document.getElementById(firstErrorField) as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }
};

/**
 * Detect which field changed by comparing two form data objects
 *
 * @param oldData - Previous form data
 * @param newData - New form data
 * @returns The name of the field that changed, or undefined if no change detected
 */
export const detectChangedField = (
  oldData: RelationshipFormData,
  newData: RelationshipFormData
): keyof RelationshipFormData | undefined => {
  return Object.keys(newData).find(
    (key) => newData[key as keyof RelationshipFormData] !== oldData[key as keyof RelationshipFormData]
  ) as keyof RelationshipFormData | undefined;
};
