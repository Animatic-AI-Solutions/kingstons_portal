/**
 * Shared Form Styles for Health/Vulnerability Modals
 *
 * Centralized CSS class constants and utility functions for consistent
 * styling across Add and Edit modals.
 *
 * @module components/phase2/health-vulnerabilities/shared/formStyles
 */

// =============================================================================
// CSS Class Constants
// =============================================================================

/**
 * Base input styles shared across text, select, and textarea fields
 */
export const INPUT_BASE_CLASSES = 'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

/**
 * Disabled state styling for inputs
 */
export const INPUT_DISABLED_CLASSES = 'bg-gray-100 cursor-not-allowed';

/**
 * Error state border styling
 */
export const INPUT_ERROR_BORDER = 'border-red-300';

/**
 * Normal state border styling
 */
export const INPUT_NORMAL_BORDER = 'border-gray-300';

/**
 * Label styling for form fields
 */
export const LABEL_CLASSES = 'block text-sm font-medium text-gray-700 mb-1';

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate input class names based on error and disabled state
 *
 * @param hasError - Whether the field has a validation error
 * @param isDisabled - Whether the field is disabled
 * @returns Combined CSS class string
 *
 * @example
 * ```tsx
 * <input className={getInputClasses(Boolean(errors.field), isPending)} />
 * ```
 */
export function getInputClasses(hasError: boolean, isDisabled: boolean): string {
  return `${INPUT_BASE_CLASSES} ${hasError ? INPUT_ERROR_BORDER : INPUT_NORMAL_BORDER} ${isDisabled ? INPUT_DISABLED_CLASSES : ''}`.trim();
}
