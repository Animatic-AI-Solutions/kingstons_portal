/**
 * Product Owner Helper Utilities
 *
 * Utility functions for processing and formatting product owner data:
 * - Age calculation from date of birth with validation
 * - Full name formatting with various display options
 * - Status badge color mapping for UI
 * - UK phone number formatting (mobile and landline)
 * - Product owner completeness validation
 *
 * All functions include comprehensive validation, error handling, and
 * null-safety checks for production use.
 *
 * @module utils/productOwnerHelpers
 */

import type { ProductOwner, FormatFullNameOptions } from '@/types/productOwner';
import {
  MAX_POSSIBLE_AGE,
  STATUS_BADGE_COLORS,
  UK_MOBILE_LENGTH,
  UK_MOBILE_PREFIX,
  UK_LANDLINE_PREFIX,
} from './productOwnerConstants';

/**
 * Calculates age from date of birth
 *
 * Computes current age in years from a date of birth string. Handles edge cases
 * including leap years, null values, and validates date ranges for data quality.
 *
 * Algorithm:
 * 1. Calculate year difference
 * 2. Check if birthday has occurred this year
 * 3. Subtract 1 from age if birthday hasn't occurred yet
 *
 * Validation Rules:
 * - Date must be valid ISO format (YYYY-MM-DD)
 * - Date cannot be in the future
 * - Date cannot be more than 120 years ago (MAX_POSSIBLE_AGE constant)
 * - Null/undefined/empty values return null (not an error)
 *
 * @param dob - Date of birth in ISO format (YYYY-MM-DD), or null
 * @returns Age in years, or null if dob is not provided
 * @throws {Error} If date is invalid, in the future, or more than 120 years ago
 *
 * @example
 * // Valid date returns age
 * const age = calculateAge('1980-05-15'); // Returns current age
 *
 * @example
 * // Null/empty returns null (not an error)
 * const age = calculateAge(null); // Returns null
 * const age2 = calculateAge(''); // Returns null
 *
 * @example
 * // Invalid date throws error
 * try {
 *   calculateAge('invalid-date'); // Throws Error
 * } catch (error) {
 *   console.error(error.message); // "Invalid date format"
 * }
 */
export function calculateAge(dob: string | null | undefined): number | null {
  // Handle null, undefined, or empty string - return null (not an error)
  // This allows optional DOB fields to be gracefully handled
  if (!dob || dob.trim() === '') {
    return null;
  }

  // Parse date string into Date object
  const birthDate = new Date(dob);

  // Validate date is a valid JavaScript Date object
  // Invalid dates return NaN for getTime()
  if (isNaN(birthDate.getTime())) {
    throw new Error('Invalid date format');
  }

  const today = new Date();

  // Validate date is not in the future
  // Future dates indicate data entry error
  if (birthDate > today) {
    throw new Error('Date of birth cannot be in the future');
  }

  // Validate date is not more than MAX_POSSIBLE_AGE (120) years ago
  // This prevents ancient dates from typos (e.g., 1880 instead of 1980)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - MAX_POSSIBLE_AGE);
  if (birthDate < minDate) {
    throw new Error(`Date of birth cannot be more than ${MAX_POSSIBLE_AGE} years ago`);
  }

  // Calculate age by comparing years
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred yet this year
  // This handles cases where month/day are later than today's date
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Formats full name from product owner fields
 *
 * Constructs formatted name from title, firstname, middle_names, surname, and known_as.
 * Supports multiple formatting styles for different display contexts (formal, informal,
 * directory listings, etc.).
 *
 * Formatting Options:
 * - includeKnownAs: Add known_as in quotes after firstname (e.g., John "Jack" Smith)
 * - includeMiddleNames: Include middle names (default: true)
 * - lastNameFirst: Format as "Surname, Title Firstname" for directory/sorting
 *
 * Validation:
 * - firstname and surname are required fields (throws error if missing)
 * - All whitespace is trimmed
 * - Empty strings after trimming are rejected
 * - Null/optional fields (title, middle_names, known_as) are safely handled
 *
 * @param productOwner - Product owner object or partial with name fields
 * @param options - Formatting options (all optional, see FormatFullNameOptions)
 * @returns Formatted full name string with proper spacing
 * @throws {Error} If firstname or surname is missing, undefined, or empty after trimming
 *
 * @example
 * // Standard format: "Mr John Smith"
 * formatFullName({ title: 'Mr', firstname: 'John', surname: 'Smith' });
 *
 * @example
 * // With known_as: "John "Jack" Smith"
 * formatFullName(
 *   { firstname: 'John', surname: 'Smith', known_as: 'Jack' },
 *   { includeKnownAs: true }
 * );
 *
 * @example
 * // Last name first for directory: "Smith, Mr John"
 * formatFullName(
 *   { title: 'Mr', firstname: 'John', surname: 'Smith' },
 *   { lastNameFirst: true }
 * );
 *
 * @example
 * // Without middle names/title: "John Smith"
 * formatFullName(
 *   { title: 'Mr', firstname: 'John', middle_names: 'Paul', surname: 'Smith' },
 *   { includeMiddleNames: false }
 * );
 */
export function formatFullName(
  productOwner: Pick<ProductOwner, 'title' | 'firstname' | 'surname' | 'middle_names'> & {
    known_as?: string | null;
  },
  options: FormatFullNameOptions = {}
): string {
  // Extract options with defaults
  const { includeKnownAs = false, includeMiddleNames = true, lastNameFirst = false } = options;

  // Validate required field: firstname
  // firstname is mandatory for all product owners
  if (!productOwner.firstname || productOwner.firstname === undefined) {
    throw new Error('Firstname is required');
  }

  // Validate required field: surname
  // surname is mandatory for all product owners
  if (!productOwner.surname || productOwner.surname === undefined) {
    throw new Error('Surname is required');
  }

  // Trim whitespace from required fields
  const firstname = productOwner.firstname.trim();
  const surname = productOwner.surname.trim();

  // Validate firstname is not empty after trimming
  // Catches cases like "   " (whitespace only)
  if (firstname === '') {
    throw new Error('Firstname cannot be empty');
  }

  // Validate surname is not empty after trimming
  // Catches cases like "   " (whitespace only)
  if (surname === '') {
    throw new Error('Surname cannot be empty');
  }

  // Build name parts based on formatting options
  const parts: string[] = [];

  if (lastNameFirst) {
    // Format: "Surname, Title Firstname MiddleNames"
    // Used for directory listings, sorting, formal contexts
    parts.push(surname);

    // Build first name parts (everything after the comma)
    const firstNameParts: string[] = [];
    if (productOwner.title) {
      firstNameParts.push(productOwner.title.trim());
    }
    firstNameParts.push(firstname);

    if (includeKnownAs && productOwner.known_as) {
      // Known_as appears in quotes to distinguish it from legal names
      firstNameParts.push(`"${productOwner.known_as.trim()}"`);
    }

    if (includeMiddleNames && productOwner.middle_names) {
      firstNameParts.push(productOwner.middle_names.trim());
    }

    // Join with comma separator for last-name-first format
    return `${surname}, ${firstNameParts.join(' ')}`;
  } else {
    // Standard format: "Title Firstname MiddleNames Surname"
    // Used for most UI displays, letters, communications

    // Title is included only if includeMiddleNames is not explicitly false
    // This maintains consistent behavior with middle names
    if (productOwner.title && includeMiddleNames !== false) {
      parts.push(productOwner.title.trim());
    }

    parts.push(firstname);

    if (includeKnownAs && productOwner.known_as) {
      // Known_as appears in quotes to distinguish it from legal names
      parts.push(`"${productOwner.known_as.trim()}"`);
    }

    // Only include middle names if includeMiddleNames is true (or undefined/default)
    // When explicitly false, omit for informal/brief displays
    if (includeMiddleNames !== false && productOwner.middle_names) {
      parts.push(productOwner.middle_names.trim());
    }

    parts.push(surname);
  }

  // Join parts with single space and normalize any double spaces
  // This handles cases where optional fields create extra spaces
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Returns badge color for product owner status
 *
 * Maps product owner status values to UI badge colors for consistent
 * visual representation across the application.
 *
 * Color Scheme (from STATUS_BADGE_COLORS constant):
 * - active: green (positive, current customer)
 * - lapsed: gray (neutral, former customer)
 * - deceased: red (important, requires special handling)
 * - unknown/null: gray (safe default)
 *
 * The function is case-insensitive to handle variations in status values
 * from the database or user input.
 *
 * @param status - Product owner status string (case-insensitive) or null
 * @returns Color name for badge styling ('green', 'gray', or 'red')
 *
 * @example
 * // Active status returns green
 * getStatusBadgeColor('active'); // 'green'
 * getStatusBadgeColor('ACTIVE'); // 'green' (case-insensitive)
 *
 * @example
 * // Lapsed status returns gray
 * getStatusBadgeColor('lapsed'); // 'gray'
 *
 * @example
 * // Deceased status returns red
 * getStatusBadgeColor('deceased'); // 'red'
 *
 * @example
 * // Null/unknown returns default gray
 * getStatusBadgeColor(null); // 'gray'
 * getStatusBadgeColor('unknown'); // 'gray'
 */
export function getStatusBadgeColor(status: string | null): string {
  // Handle null or undefined status - return safe default
  if (!status) {
    return STATUS_BADGE_COLORS.DEFAULT;
  }

  // Normalize status to lowercase for case-insensitive comparison
  // This handles database values that may be stored in different cases
  const normalizedStatus = status.toLowerCase();

  // Map status to color using STATUS_BADGE_COLORS constant
  // This centralizes color definitions for consistency
  switch (normalizedStatus) {
    case 'active':
      return STATUS_BADGE_COLORS.active;
    case 'lapsed':
      return STATUS_BADGE_COLORS.lapsed;
    case 'deceased':
      return STATUS_BADGE_COLORS.deceased;
    default:
      // Unknown statuses default to gray for safety
      return STATUS_BADGE_COLORS.DEFAULT;
  }
}

/**
 * Formats UK phone number for display
 *
 * Applies standard UK formatting conventions to phone numbers for consistent
 * display in the UI. Handles both mobile and landline formats.
 *
 * Formatting Rules:
 * - UK Mobile: 07xxx xxxxxx → "07xxx xxx xxx" (11 digits starting with 07)
 * - UK Landline: 0xx xxxx xxxx → "0xx xxxx xxxx" (11 digits starting with 0)
 * - International: +44... → preserved as-is
 * - Other: Returned trimmed without formatting
 *
 * The function is conservative - if it doesn't recognize the format, it returns
 * the number trimmed but otherwise unchanged to avoid data loss.
 *
 * @param phone - Phone number string (any format) or null
 * @returns Formatted phone number string or null if input is null/empty
 *
 * @example
 * // UK mobile formatting
 * formatPhoneNumber('07700900123'); // "07700 900 123"
 * formatPhoneNumber('07700 900123'); // "07700 900 123"
 *
 * @example
 * // UK landline formatting
 * formatPhoneNumber('02071234567'); // "020 7123 4567"
 *
 * @example
 * // International format preserved
 * formatPhoneNumber('+44 7700 900123'); // "+44 7700 900123"
 *
 * @example
 * // Null/empty returns null
 * formatPhoneNumber(null); // null
 * formatPhoneNumber(''); // null
 *
 * @example
 * // Unknown format returned trimmed
 * formatPhoneNumber('123'); // "123"
 */
export function formatPhoneNumber(phone: string | null): string | null {
  // Handle null, undefined, or empty string - return null
  // This allows optional phone fields to be safely displayed
  if (!phone || phone.trim() === '') {
    return null;
  }

  // If already has international format (+44, +1, etc.), preserve it
  // International numbers may have various formatting conventions
  if (phone.includes('+')) {
    return phone.trim();
  }

  // Remove all non-digit characters for pattern matching
  // This handles inputs like "07700-900-123" or "(07700) 900123"
  const digitsOnly = phone.replace(/\D/g, '');

  // Format UK mobile numbers: 07xxx xxxxxx
  // UK mobiles are 11 digits starting with 07 (using UK_MOBILE_PREFIX constant)
  if (digitsOnly.startsWith(UK_MOBILE_PREFIX) && digitsOnly.length === UK_MOBILE_LENGTH) {
    // Format: "07700 900 123" for readability
    return `${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5, 8)} ${digitsOnly.slice(8)}`;
  }

  // Format UK landline numbers: 0xx xxxx xxxx
  // UK landlines are 11 digits starting with 0 (using UK_LANDLINE_PREFIX constant)
  if (digitsOnly.startsWith(UK_LANDLINE_PREFIX) && digitsOnly.length === UK_MOBILE_LENGTH) {
    // Format: "020 7123 4567" for readability
    // First 3 digits are area code (020 = London, 0161 = Manchester, etc.)
    return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 7)} ${digitsOnly.slice(7)}`;
  }

  // Return trimmed if no pattern matches
  // Conservative approach: don't modify unrecognized formats to avoid data loss
  return phone.trim();
}

/**
 * Checks if product owner has all required fields populated
 *
 * Validates that a product owner record has sufficient data for operational use.
 * This is used to identify incomplete records that need data entry follow-up.
 *
 * Completeness Criteria:
 * 1. Identity fields (always required):
 *    - firstname: Legal first name
 *    - surname: Legal surname
 *
 * 2. Personal information:
 *    - dob: Date of birth (required for age calculations, compliance)
 *
 * 3. Contact information (at least one method required):
 *    - email_1 OR email_2: At least one email address
 *    - phone_1 OR phone_2: At least one phone number
 *
 * Business Rules:
 * - All identity and personal info fields must be present
 * - At least one contact method (email + phone) must be available
 * - Empty strings are treated as missing (same as null)
 *
 * @param owner - Product owner object to validate
 * @returns True if all required fields are present, false if any are missing
 *
 * @example
 * // Complete owner returns true
 * isProductOwnerComplete({
 *   firstname: 'John',
 *   surname: 'Smith',
 *   dob: '1980-01-15',
 *   email_1: 'john@example.com',
 *   phone_1: '07700900123',
 *   // ... other fields
 * }); // true
 *
 * @example
 * // Missing email returns false
 * isProductOwnerComplete({
 *   firstname: 'John',
 *   surname: 'Smith',
 *   dob: '1980-01-15',
 *   email_1: null,
 *   email_2: null,
 *   phone_1: '07700900123',
 *   // ... other fields
 * }); // false
 *
 * @example
 * // Missing DOB returns false
 * isProductOwnerComplete({
 *   firstname: 'John',
 *   surname: 'Smith',
 *   dob: null,
 *   email_1: 'john@example.com',
 *   phone_1: '07700900123',
 *   // ... other fields
 * }); // false
 */
export function isProductOwnerComplete(owner: ProductOwner): boolean {
  // Check required identity fields
  // firstname and surname are mandatory for all product owners
  if (!owner.firstname || !owner.surname) {
    return false;
  }

  // Check date of birth
  // Required for age calculations, regulatory compliance, and client profiling
  if (!owner.dob) {
    return false;
  }

  // Check at least one email address is present
  // Email is primary communication channel for most clients
  // Allow flexibility: either email_1 or email_2 is acceptable
  if (!owner.email_1 && !owner.email_2) {
    return false;
  }

  // Check at least one phone number is present
  // Phone is essential for urgent communications and verification
  // Allow flexibility: either phone_1 or phone_2 is acceptable
  if (!owner.phone_1 && !owner.phone_2) {
    return false;
  }

  // All required fields are present
  return true;
}
