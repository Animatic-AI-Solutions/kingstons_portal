/**
 * Validation utilities index
 *
 * Exports all validation functions for use throughout the application
 */

// Common validators
export {
  isValidEmail,
  isValidNINumber,
  isValidDate,
  isFutureDate,
  isPastDate,
  isValidPhoneNumber,
} from './commonValidators';

// Specific validators
export { validateAddress } from './addressValidation';
export { validateClientGroup } from './clientGroupValidation';
export { validateProductOwner } from './productOwnerValidation';
