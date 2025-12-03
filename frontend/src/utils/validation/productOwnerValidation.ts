/**
 * Product owner validation utilities
 *
 * Validates product owner form data according to business rules:
 * - Required fields: firstname, surname, dob, at least one email, at least one phone
 * - Date of birth: valid date, not in future, not more than 120 years ago
 * - Email format validation
 * - Phone format validation
 * - UK NI number format validation
 * - Dropdown fields must match allowed options
 * - Status must be 'active' or 'inactive'
 * - Address validation when address provided
 */

import { ProductOwnerFormData, AddressFormData } from '../../types/clientGroupForm';
import {
  TITLE_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
  GENDER_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  AML_RESULT_OPTIONS,
} from '../../constants/clientGroup';
import {
  isValidEmail,
  isValidNINumber,
  isValidDate,
  isFutureDate,
  isValidPhoneNumber,
} from './commonValidators';
import { validateAddress } from './addressValidation';

/**
 * Validates product owner form data including address
 * @param data - The product owner form data to validate
 * @param address - The address form data to validate
 * @returns Object with field names as keys and error messages as values, or null if no errors
 */
export function validateProductOwner(
  data: ProductOwnerFormData,
  address: AddressFormData
): Record<string, string> | null {
  const errors: Record<string, string> = {};

  // Required field: firstname
  if (!data.firstname || data.firstname.trim() === '') {
    errors.firstname = 'First name is required';
  }

  // Required field: surname
  if (!data.surname || data.surname.trim() === '') {
    errors.surname = 'Surname is required';
  }

  // Required field: dob
  if (!data.dob || data.dob.trim() === '') {
    errors.dob = 'Date of birth is required';
  } else {
    // Validate dob format
    if (!isValidDate(data.dob)) {
      errors.dob = 'Please enter a valid date of birth';
    } else {
      // Check if dob is not in the future
      if (isFutureDate(data.dob)) {
        errors.dob = 'Date of birth cannot be in the future';
      } else {
        // Check if dob is not more than 120 years ago
        const dobDate = new Date(data.dob);
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear();
        if (age > 120) {
          errors.dob = 'Date of birth cannot be more than 120 years ago';
        }
      }
    }
  }

  // At least one email required (email_1 OR email_2)
  const hasEmail1 = data.email_1 && data.email_1.trim() !== '';
  const hasEmail2 = data.email_2 && data.email_2.trim() !== '';

  if (!hasEmail1 && !hasEmail2) {
    errors.email_1 = 'At least one email address is required';
  }

  // Validate email_1 format if provided
  if (hasEmail1 && !isValidEmail(data.email_1)) {
    errors.email_1 = 'Please enter a valid email address';
  }

  // Validate email_2 format if provided
  if (hasEmail2 && !isValidEmail(data.email_2)) {
    errors.email_2 = 'Please enter a valid email address';
  }

  // At least one phone required (phone_1 OR phone_2)
  const hasPhone1 = data.phone_1 && data.phone_1.trim() !== '';
  const hasPhone2 = data.phone_2 && data.phone_2.trim() !== '';

  if (!hasPhone1 && !hasPhone2) {
    errors.phone_1 = 'At least one phone number is required';
  }

  // Validate phone_1 format if provided
  if (hasPhone1 && !isValidPhoneNumber(data.phone_1)) {
    errors.phone_1 = 'Please enter a valid UK phone number';
  }

  // Validate phone_2 format if provided
  if (hasPhone2 && !isValidPhoneNumber(data.phone_2)) {
    errors.phone_2 = 'Please enter a valid UK phone number';
  }

  // Optional field: title (if provided, must be in TITLE_OPTIONS)
  if (data.title && data.title.trim() !== '') {
    if (!TITLE_OPTIONS.includes(data.title as any)) {
      errors.title = 'Please select a valid title';
    }
  }

  // Optional field: middle_names (max 100 characters)
  if (data.middle_names && data.middle_names.length > 100) {
    errors.middle_names = 'Middle names must not exceed 100 characters';
  }

  // Optional field: relationship_status (if provided, must be in RELATIONSHIP_STATUS_OPTIONS)
  if (data.relationship_status && data.relationship_status.trim() !== '') {
    if (!RELATIONSHIP_STATUS_OPTIONS.includes(data.relationship_status as any)) {
      errors.relationship_status = 'Please select a valid relationship status';
    }
  }

  // Optional field: gender (if provided, must be in GENDER_OPTIONS)
  if (data.gender && data.gender.trim() !== '') {
    if (!GENDER_OPTIONS.includes(data.gender as any)) {
      errors.gender = 'Please select a valid gender';
    }
  }

  // Optional field: ni_number (if provided, must be valid UK NI format)
  if (data.ni_number && data.ni_number.trim() !== '') {
    if (!isValidNINumber(data.ni_number)) {
      errors.ni_number = 'Please enter a valid UK National Insurance number';
    }
  }

  // Optional field: passport_expiry_date (if provided, must be valid date)
  if (data.passport_expiry_date && data.passport_expiry_date.trim() !== '') {
    if (!isValidDate(data.passport_expiry_date)) {
      errors.passport_expiry_date = 'Please enter a valid passport expiry date';
    }
  }

  // Optional field: aml_result (if provided, must be in AML_RESULT_OPTIONS)
  if (data.aml_result && data.aml_result.trim() !== '') {
    if (!AML_RESULT_OPTIONS.includes(data.aml_result as any)) {
      errors.aml_result = 'Please select a valid AML result';
    }
  }

  // Optional field: aml_date (if provided, must be valid date)
  if (data.aml_date && data.aml_date.trim() !== '') {
    if (!isValidDate(data.aml_date)) {
      errors.aml_date = 'Please enter a valid AML date';
    }
  }

  // Optional field: employment_status (if provided, must be in EMPLOYMENT_STATUS_OPTIONS)
  if (data.employment_status && data.employment_status.trim() !== '') {
    if (!EMPLOYMENT_STATUS_OPTIONS.includes(data.employment_status as any)) {
      errors.employment_status = 'Please select a valid employment status';
    }
  }

  // Optional field: moved_in_date (if provided, must be valid date and not in future)
  if (data.moved_in_date && data.moved_in_date.trim() !== '') {
    if (!isValidDate(data.moved_in_date)) {
      errors.moved_in_date = 'Please enter a valid move-in date';
    } else if (isFutureDate(data.moved_in_date)) {
      errors.moved_in_date = 'Move-in date cannot be in the future';
    }
  }

  // Required field: status (must be 'active' or 'inactive')
  if (data.status !== 'active' && data.status !== 'inactive') {
    errors.status = 'Status must be either active or inactive';
  }

  // Validate address if any address field is provided
  const addressErrors = validateAddress(address);
  if (addressErrors) {
    // Prefix address errors with 'address.' to namespace them
    Object.entries(addressErrors).forEach(([key, value]) => {
      errors[`address.${key}`] = value;
    });
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
