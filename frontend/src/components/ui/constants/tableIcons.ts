/**
 * Table Icons Configuration
 *
 * Centralized icon definitions for all tables across the application.
 * Ensures consistent icon usage in People, Special Relationships, and future tables.
 *
 * Icons are from @heroicons/react/24/outline for consistency.
 *
 * @module components/ui/constants/tableIcons
 */

import {
  PauseCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

// ==========================
// Action Icons
// ==========================

/**
 * Standard action icons used across all tables
 * These match the People tab implementation
 */
export const ACTION_ICONS = {
  /** Lapse/Deactivate action - Pause circle icon (orange) */
  lapse: PauseCircleIcon,

  /** Make deceased action - X circle icon (gray) */
  deceased: XCircleIcon,

  /** Reactivate action - Circular arrow icon (blue) */
  reactivate: ArrowPathIcon,

  /** Delete action - Trash bin icon (red) */
  delete: TrashIcon,
} as const;

// ==========================
// Sorting Icons
// ==========================

/**
 * Icons for sortable column headers
 */
export const SORT_ICONS = {
  /** Ascending sort indicator */
  ascending: ChevronUpIcon,

  /** Descending sort indicator */
  descending: ChevronDownIcon,
} as const;

// ==========================
// Icon Sizes
// ==========================

/**
 * Standard icon sizes used across tables
 * Tailwind classes for width and height
 */
export const ICON_SIZES = {
  /** Small - 16px (used in action buttons) */
  sm: 'w-4 h-4',

  /** Medium - 20px (used in headers, badges) */
  md: 'w-5 h-5',

  /** Large - 24px (used in empty states) */
  lg: 'w-6 h-6',
} as const;

// ==========================
// Icon Styles by Action Type
// ==========================

/**
 * Complete button styles for each action type
 * Matches the People tab ProductOwnerActions component
 *
 * Each includes:
 * - Base padding and layout
 * - Icon color (text-{color})
 * - Hover color (hover:text-{color})
 * - Hover background (hover:bg-{color})
 * - Border radius
 * - Transition
 * - Disabled states
 */
export const ACTION_BUTTON_STYLES = {
  /** Lapse button - Orange theme */
  lapse: 'p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',

  /** Deceased button - Gray theme */
  deceased: 'p-1 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',

  /** Reactivate button - Blue theme */
  reactivate: 'p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',

  /** Delete button - Red theme */
  delete: 'p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
} as const;

// ==========================
// Icon Color Classes (for standalone use)
// ==========================

/**
 * Icon-only color classes (when you need just the color, not the full button style)
 * Useful for custom implementations
 */
export const ICON_COLORS = {
  lapse: 'text-orange-600',
  deceased: 'text-gray-600',
  reactivate: 'text-blue-600',
  delete: 'text-red-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600',
} as const;
