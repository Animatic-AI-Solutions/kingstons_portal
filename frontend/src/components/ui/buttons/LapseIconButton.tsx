/**
 * LapseIconButton Component
 *
 * Icon-only button for lapsing/deactivating entities (product owners, beneficiaries, etc.)
 * Used in Phase 2 table action columns for active records.
 *
 * Features:
 * - Orange color scheme indicating warning/deactivation
 * - PauseCircleIcon from Heroicons
 * - Hover state with background
 * - Disabled state support
 * - WCAG 2.1 AA compliant (44px touch target)
 * - Accessible with aria-label and title
 *
 * @module components/ui/buttons/LapseIconButton
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { PauseCircleIcon } from '@heroicons/react/24/outline';

export interface LapseIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Optional custom aria-label (defaults to "Lapse") */
  ariaLabel?: string;
  /** Optional custom tooltip text (defaults to "Lapse") */
  title?: string;
  /** Optional loading state */
  loading?: boolean;
}

/**
 * LapseIconButton Component
 *
 * Icon-only button for lapse/deactivate actions in Phase 2 tables
 */
const LapseIconButton = forwardRef<HTMLButtonElement, LapseIconButtonProps>(({
  ariaLabel = 'Lapse',
  title: tooltipTitle = 'Lapse',
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
    text-orange-600
    hover:text-orange-700
    hover:bg-orange-50
    rounded
    transition-colors
    disabled:opacity-50
    disabled:cursor-not-allowed
    focus:outline-none
    focus:ring-2
    focus:ring-orange-500/30
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
        <PauseCircleIcon className="w-4 h-4" />
      )}
    </button>
  );
});

LapseIconButton.displayName = 'LapseIconButton';

export default LapseIconButton;
