/**
 * Client group validation utilities
 *
 * Validates client group form data according to business rules:
 * - Required fields: name, status
 * - Name length: min 2, max 200 characters
 * - Type must be in CLIENT_GROUP_TYPES (if provided)
 * - Status must be in STATUS_OPTIONS
 * - Optional date fields must be valid if provided
 * - Notes max 1000 characters
 */

import { ClientGroupFormData } from '../../types/clientGroupForm';
import { CLIENT_GROUP_TYPES, STATUS_OPTIONS } from '../../constants/clientGroup';
import { isValidDate } from './commonValidators';

/**
 * Validates client group form data
 * @param data - The client group form data to validate
 * @returns Object with field names as keys and error messages as values, or null if no errors
 */
export function validateClientGroup(data: ClientGroupFormData): Record<string, string> | null {
  const errors: Record<string, string> = {};

  // Name validation
  if (!data.name || data.name.trim() === '') {
    errors.name = 'Client group name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Client group name must be at least 2 characters';
  } else if (data.name.length > 200) {
    errors.name = 'Client group name must not exceed 200 characters';
  }

  // Type validation (optional, but must be valid if provided)
  if (data.type && data.type.trim() !== '' && !CLIENT_GROUP_TYPES.includes(data.type as any)) {
    errors.type = 'Please select a valid client group type';
  }

  // Status validation
  if (!data.status || data.status.trim() === '') {
    errors.status = 'Status is required';
  } else if (!STATUS_OPTIONS.includes(data.status as any)) {
    errors.status = 'Status must be either active or inactive';
  }

  // Optional date field validations

  // ongoing_start validation (optional date field)
  if (data.ongoing_start && data.ongoing_start.trim() !== '') {
    if (!isValidDate(data.ongoing_start)) {
      errors.ongoing_start = 'Please enter a valid ongoing start date';
    }
  }
  if (data.client_declaration && data.client_declaration.trim() !== '') {
    if (!isValidDate(data.client_declaration)) {
      errors.client_declaration = 'Please enter a valid client declaration date';
    }
  }

  if (data.privacy_declaration && data.privacy_declaration.trim() !== '') {
    if (!isValidDate(data.privacy_declaration)) {
      errors.privacy_declaration = 'Please enter a valid privacy declaration date';
    }
  }

  if (data.full_fee_agreement && data.full_fee_agreement.trim() !== '') {
    if (!isValidDate(data.full_fee_agreement)) {
      errors.full_fee_agreement = 'Please enter a valid full fee agreement date';
    }
  }

  if (data.last_satisfactory_discussion && data.last_satisfactory_discussion.trim() !== '') {
    if (!isValidDate(data.last_satisfactory_discussion)) {
      errors.last_satisfactory_discussion = 'Please enter a valid last satisfactory discussion date';
    }
  }

  // Notes validation
  if (data.notes && data.notes.length > 1000) {
    errors.notes = 'Notes must not exceed 1000 characters';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
