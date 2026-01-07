/**
 * EditIconButton Component
 *
 * Icon-only button for editing entities (health conditions, vulnerabilities, etc.)
 * Used in Phase 2 table action columns for inline edit actions.
 *
 * Features:
 * - Primary color scheme indicating edit action
 * - PencilIcon from Heroicons
 * - Hover state with background
 * - Disabled state support
 * - WCAG 2.1 AA compliant (44px touch target)
 * - Accessible with aria-label and title
 *
 * @module components/ui/table-icons/EditIconButton
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';

export interface EditIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Optional custom aria-label (defaults to "Edit") */
  ariaLabel?: string;
  /** Optional custom tooltip text (defaults to "Edit") */
  title?: string;
  /** Optional loading state */
  loading?: boolean;
}

/**
 * EditIconButton Component
 *
 * Icon-only button for edit actions in Phase 2 tables
 * Opens edit modal or inline edit form when clicked
 *
 * @param {EditIconButtonProps} props - Component props
 * @param {string} [props.ariaLabel='Edit'] - Accessible label for screen readers
 * @param {string} [props.title='Edit'] - Tooltip text on hover
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {boolean} [props.loading=false] - Whether button shows loading spinner
 * @returns {JSX.Element} Rendered edit icon button
 *
 * @example
 * <EditIconButton
 *   onClick={() => openEditModal(record)}
 *   ariaLabel={`Edit health condition for ${person.name}`}
 * />
 */
const EditIconButton = forwardRef<HTMLButtonElement, EditIconButtonProps>(({
  ariaLabel = 'Edit',
  title: tooltipTitle = 'Edit',
  disabled = false,
  loading = false,
  className = '',
  ...props
}, ref) => {
  const buttonClasses = `
    p-1
    min-w-[44px]
    min-h-[44px]
    inline-flex
    items-center
    justify-center
    text-primary-600
    hover:text-primary-700
    hover:bg-primary-50
    rounded
    transition-colors
    disabled:opacity-50
    disabled:cursor-not-allowed
    focus:outline-none
    focus:ring-2
    focus:ring-primary-500/30
    leading-tight
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={buttonClasses}
      aria-label={ariaLabel}
      title={tooltipTitle}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <PencilIcon className="w-4 h-4" />
      )}
    </button>
  );
});

EditIconButton.displayName = 'EditIconButton';

export default EditIconButton;
