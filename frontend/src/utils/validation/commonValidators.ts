/**
 * Common validation utilities for form fields
 *
 * These validators provide reusable validation logic for common field types
 * like emails, phone numbers, dates, and UK National Insurance numbers.
 */

/**
 * Validates email format using RFC 5322 simplified regex
 * @param email - The email address to validate
 * @returns true if valid email format, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.trim() === '') {
    return false;
  }

  // RFC 5322 simplified email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates UK National Insurance number format
 * Format: 2 letters, 6 digits, 1 letter (e.g., AB123456C)
 * Excludes certain prefixes: BG, GB, NK, KN, TN, NT, ZZ
 * @param ni - The National Insurance number to validate
 * @returns true if valid UK NI number, false otherwise
 */
export function isValidNINumber(ni: string): boolean {
  if (!ni || ni.trim() === '') {
    return false;
  }

  // Remove spaces and convert to uppercase for validation
  const cleanNI = ni.replace(/\s/g, '').toUpperCase();

  // UK NI number format: 2 letters, 6 digits, 1 letter
  const niRegex = /^[A-Z]{2}\d{6}[A-Z]$/;

  if (!niRegex.test(cleanNI)) {
    return false;
  }

  // Check for excluded prefixes
  const prefix = cleanNI.substring(0, 2);
  const excludedPrefixes = ['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ'];

  return !excludedPrefixes.includes(prefix);
}

/**
 * Validates ISO date string format (YYYY-MM-DD)
 * @param dateStr - The date string to validate
 * @returns true if valid ISO date, false otherwise
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr || dateStr.trim() === '') {
    return false;
  }

  // Check ISO format YYYY-MM-DD
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(dateStr)) {
    return false;
  }

  // Validate the date is actually valid (e.g., not 2023-02-29)
  const date = new Date(dateStr);
  const [year, month, day] = dateStr.split('-').map(Number);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Checks if a date is in the future
 * @param dateStr - The date string to check (ISO format YYYY-MM-DD)
 * @returns true if date is in the future, false otherwise
 */
export function isFutureDate(dateStr: string): boolean {
  if (!isValidDate(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date > today;
}

/**
 * Checks if a date is in the past
 * @param dateStr - The date string to check (ISO format YYYY-MM-DD)
 * @returns true if date is in the past, false otherwise
 */
export function isPastDate(dateStr: string): boolean {
  if (!isValidDate(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date < today;
}

/**
 * Validates UK phone number format
 * Accepts various formats: +44, 07, (020), etc.
 * @param phone - The phone number to validate
 * @returns true if valid UK phone format, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || phone.trim() === '') {
    return false;
  }

  // Remove all spaces, brackets, and hyphens for validation
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // UK phone number patterns:
  // - +44 followed by 10 digits
  // - 0 followed by 10 digits
  // - Minimum 10 digits, maximum 11 digits (including leading 0)
  const ukPhoneRegex = /^(\+44\d{10}|0\d{9,10})$/;

  return ukPhoneRegex.test(cleanPhone);
}
