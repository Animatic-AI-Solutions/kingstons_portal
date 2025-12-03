/**
 * Address validation utilities
 *
 * Validates address form data according to business rules:
 * - If any address line has content, line_1 is required
 * - All lines have a max length of 100 characters
 */

import { AddressFormData } from '../../types/clientGroupForm';

/**
 * Validates address form data
 * @param data - The address form data to validate
 * @returns Object with field names as keys and error messages as values, or null if no errors
 */
export function validateAddress(data: AddressFormData): Record<string, string> | null {
  const errors: Record<string, string> = {};

  // Check if any address line has content (excluding whitespace-only)
  const hasAnyAddressContent = Object.values(data).some(
    (value) => value && value.trim() !== ''
  );

  // If any address line has content, line_1 is required
  if (hasAnyAddressContent && (!data.line_1 || data.line_1.trim() === '')) {
    errors.line_1 = 'Address line 1 is required when providing an address';
  }

  // Validate max length for all lines
  const maxLength = 100;
  const lines: (keyof AddressFormData)[] = ['line_1', 'line_2', 'line_3', 'line_4', 'line_5'];

  lines.forEach((line) => {
    if (data[line] && data[line].length > maxLength) {
      errors[line] = `Address ${line.replace('_', ' ')} must not exceed ${maxLength} characters`;
    }
  });

  return Object.keys(errors).length > 0 ? errors : null;
}
