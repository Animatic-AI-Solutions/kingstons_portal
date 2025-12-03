import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

export interface FieldErrorProps {
  error?: string | null;
  className?: string;
}

/**
 * FieldError - Inline error message display component
 *
 * Displays validation error messages below form fields with consistent styling.
 * Only renders when an error message is provided.
 *
 * @param error - Error message to display (conditionally rendered)
 * @param className - Additional CSS classes for customization
 *
 * @example
 * ```tsx
 * <BaseInput label="Email" value={email} onChange={...} />
 * <FieldError error={validationErrors.email} />
 * ```
 */
const FieldError: React.FC<FieldErrorProps> = ({ error, className = '' }) => {
  if (!error) {
    return null;
  }

  return (
    <div className={`mt-1 flex items-center gap-1 text-sm text-red-600 ${className}`}>
      <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
};

export default FieldError;
