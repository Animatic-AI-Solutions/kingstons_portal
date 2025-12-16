/**
 * SpecialRelationshipRow Component (Cycle 5 - REFACTORED)
 *
 * Table row component for displaying special relationships.
 * Renders Personal vs Professional relationships with conditional field display,
 * status-based styling, and integrated action buttons.
 *
 * Features:
 * - Conditional rendering: Personal shows date_of_birth/age, Professional shows firm_name
 * - Status-based styling: Active (green), Inactive (gray), Deceased (red/dark)
 * - React.memo optimization to prevent unnecessary re-renders
 * - Age calculation from date_of_birth using calculateAge utility
 * - Null field handling: displays "-" for missing values
 * - Row click handler with event propagation control
 * - Full keyboard navigation support (Enter key)
 * - WCAG 2.1 AA compliant accessibility
 *
 * @component SpecialRelationshipRow
 * @example
 * ```tsx
 * <SpecialRelationshipRow
 *   relationship={personalRelationship}
 *   onClick={handleRowClick}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onStatusChange={handleStatusChange}
 * />
 * ```
 */

import React, { memo } from 'react';
import { format } from 'date-fns';
import {
  SpecialRelationship,
  RelationshipStatus,
} from '@/types/specialRelationship';
import { calculateAge } from '@/utils/specialRelationshipUtils';
import SpecialRelationshipActions from '@/components/SpecialRelationshipActions';

// ==========================
// Constants
// ==========================

/**
 * CSS class constants for status-based row styling
 * Maps status to Tailwind CSS classes for row background and hover states
 */
const STATUS_ROW_CLASSES = {
  Active: 'status-active bg-green-50 hover:bg-green-100',
  Inactive: 'status-inactive bg-gray-50 hover:bg-gray-100',
  Deceased: 'status-deceased bg-red-50 hover:bg-red-100',
} as const;

/**
 * CSS class constants for status badge styling
 * Maps status to Tailwind CSS classes for badge appearance
 */
const STATUS_BADGE_CLASSES = {
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-100 text-gray-800',
  Deceased: 'bg-red-100 text-red-800',
} as const;

/**
 * Shared table cell CSS classes for consistent spacing
 */
const TABLE_CELL_CLASS = 'px-4 py-3 text-sm';

/**
 * Shared status badge wrapper CSS classes for consistent badge appearance
 */
const STATUS_BADGE_BASE_CLASS = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

// ==========================
// Types
// ==========================

/**
 * Props for SpecialRelationshipRow component
 *
 * @interface SpecialRelationshipRowProps
 * @property relationship - The special relationship to display
 * @property onClick - Optional callback when row is clicked
 * @property onEdit - Callback when edit button is clicked (passed to actions)
 * @property onDelete - Callback when delete button is clicked (passed to actions)
 * @property onStatusChange - Callback when status is changed (passed to actions)
 */
interface SpecialRelationshipRowProps {
  /** The special relationship to display */
  relationship: SpecialRelationship;

  /** Optional callback when row is clicked */
  onClick?: (relationship: SpecialRelationship) => void;

  /** Callback when edit button is clicked */
  onEdit: (relationship: SpecialRelationship) => void;

  /** Callback when delete button is clicked */
  onDelete: (relationship: SpecialRelationship) => void;

  /** Callback when status is changed */
  onStatusChange: (id: number, status: RelationshipStatus) => void;
}

// ==========================
// Helper Functions
// ==========================

/**
 * Determine if a relationship is professional based on type field
 *
 * Uses the 'type' field which is either 'Personal' or 'Professional'
 *
 * @param relationship - The relationship object
 * @returns True if professional, false if personal
 */
const isProfessional = (relationship: SpecialRelationship): boolean => {
  return relationship.type === 'Professional';
};

/**
 * Get status-based CSS classes for row styling
 *
 * Returns predefined Tailwind CSS classes from STATUS_ROW_CLASSES constant
 * to apply appropriate background color and hover state based on status
 *
 * @param status - The relationship status (Active, Inactive, or Deceased)
 * @returns CSS class names for status styling
 */
const getStatusRowClassName = (status: RelationshipStatus): string => {
  return STATUS_ROW_CLASSES[status] || '';
};

/**
 * Get status-based CSS classes for badge styling
 *
 * Returns predefined Tailwind CSS classes from STATUS_BADGE_CLASSES constant
 * to apply appropriate badge colors based on status
 *
 * @param status - The relationship status (Active, Inactive, or Deceased)
 * @returns CSS class names for badge styling
 */
const getStatusBadgeClassName = (status: RelationshipStatus): string => {
  return STATUS_BADGE_CLASSES[status] || '';
};

/**
 * Format date for display
 *
 * Uses date-fns format function to convert ISO date strings to UK format (dd/MM/yyyy)
 * Handles null/invalid dates gracefully by returning placeholder
 *
 * @param dateString - ISO date string (e.g., '2000-01-15')
 * @returns Formatted date string (e.g., '15/01/2000') or "-" if invalid
 */
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch {
    return '-';
  }
};

/**
 * Format phone number for display
 *
 * Uses the single phone_number field from the relationship
 * Returns the phone number or placeholder if not available
 *
 * @param phoneNumber - The phone number value from the relationship
 * @returns Formatted phone number or "-" if no phone available
 */
const formatPhone = (phoneNumber: string | null): string => {
  return phoneNumber && phoneNumber.trim() !== '' ? phoneNumber : '-';
};

/**
 * Display value or placeholder for missing fields
 *
 * Handles null, undefined, or empty string values gracefully
 * Returns placeholder "-" for missing data to maintain consistent table layout
 *
 * @param value - The value to display (string, null, or undefined)
 * @returns Value or "-" if null/empty
 */
const displayValue = (value: string | null | undefined): string => {
  return value && value.trim() !== '' ? value : '-';
};

/**
 * Calculate and format age display from date of birth
 *
 * Uses calculateAge utility for age calculation logic
 * Returns empty string for missing dates to maintain clean layout
 *
 * @param dateOfBirth - ISO date string for date of birth
 * @returns Age as string or empty string if no date
 */
const formatAge = (dateOfBirth: string | null): string => {
  if (!dateOfBirth) return '';
  const age = calculateAge(dateOfBirth);
  return age !== undefined ? age.toString() : '';
};

// ==========================
// Component
// ==========================

/**
 * Custom comparison function for React.memo optimization
 *
 * Optimizes re-render performance by comparing only the fields that affect rendering:
 * - relationship object reference (shallow comparison sufficient as it's immutable)
 * - callback function references (onClick, onEdit, onDelete, onStatusChange)
 *
 * We use shallow comparison of the relationship object because it's treated as immutable
 * in the application. If any field changes, a new object is created with a new reference.
 *
 * @param prev - Previous props
 * @param next - Next props
 * @returns True if props are equal (skip re-render), false if different (re-render)
 */
const arePropsEqual = (
  prev: SpecialRelationshipRowProps,
  next: SpecialRelationshipRowProps
): boolean => {
  // Shallow comparison of relationship object reference
  // This is sufficient because relationship objects are immutable
  if (prev.relationship !== next.relationship) {
    return false;
  }

  // Check if any callbacks changed
  // Only compare callbacks, not their internal implementations
  if (
    prev.onClick !== next.onClick ||
    prev.onEdit !== next.onEdit ||
    prev.onDelete !== next.onDelete ||
    prev.onStatusChange !== next.onStatusChange
  ) {
    return false;
  }

  // Props are equal, skip re-render
  return true;
};

/**
 * SpecialRelationshipRow component
 *
 * Renders a table row with conditional fields based on relationship type:
 * - Personal relationships display: date_of_birth, age
 * - Professional relationships display: firm_name
 *
 * Both types share: name, relationship, email, phone, status
 *
 * Includes status-based styling, action buttons, and accessibility features
 * Optimized with React.memo to prevent unnecessary re-renders
 *
 * @param props - Component props
 * @returns React table row element
 */
const SpecialRelationshipRow: React.FC<SpecialRelationshipRowProps> = ({
  relationship,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const isProf = isProfessional(relationship);

  /**
   * Handle row click
   * Triggers onClick callback if provided
   */
  const handleRowClick = () => {
    if (onClick) {
      onClick(relationship);
    }
  };

  /**
   * Handle row keyboard events
   * Supports Enter key for accessibility (WCAG 2.1 AA requirement)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' && onClick) {
      onClick(relationship);
    }
  };

  /**
   * Stop event propagation from actions area
   * Prevents row click when clicking action buttons
   * This ensures edit/delete/status buttons don't trigger row selection
   */
  const handleActionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <tr
      className={`cursor-pointer transition-colors ${getStatusRowClassName(relationship.status)}`}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `View details for ${relationship.name}` : undefined}
    >
      {/* Name */}
      <td className={TABLE_CELL_CLASS}>{displayValue(relationship.name)}</td>

      {/* Relationship */}
      <td className={TABLE_CELL_CLASS}>{relationship.relationship}</td>

      {/* Conditional Fields: Personal vs Professional */}
      {isProf ? (
        <>
          {/* Professional: Firm Name */}
          <td className={TABLE_CELL_CLASS}>{displayValue(relationship.firm_name)}</td>
        </>
      ) : (
        <>
          {/* Personal: Date of Birth */}
          <td className={TABLE_CELL_CLASS}>
            {formatDate(relationship.date_of_birth)}
          </td>

          {/* Personal: Age */}
          <td className={TABLE_CELL_CLASS}>
            {formatAge(relationship.date_of_birth)}
          </td>
        </>
      )}

      {/* Email */}
      <td className={TABLE_CELL_CLASS}>{displayValue(relationship.email)}</td>

      {/* Phone */}
      <td className={TABLE_CELL_CLASS}>{formatPhone(relationship.phone_number)}</td>

      {/* Status */}
      <td className={TABLE_CELL_CLASS}>
        <span className={`${STATUS_BADGE_BASE_CLASS} ${getStatusBadgeClassName(relationship.status)}`}>
          {relationship.status}
        </span>
      </td>

      {/* Actions */}
      <td className={TABLE_CELL_CLASS} onClick={handleActionsClick}>
        <SpecialRelationshipActions relationship={relationship} />
      </td>
    </tr>
  );
};

// Wrap with React.memo for performance optimization
// Uses custom arePropsEqual comparison function to optimize re-render behavior
export default memo(SpecialRelationshipRow, arePropsEqual);
