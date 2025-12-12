/**
 * SpecialRelationshipActions Component (Cycle 4 - BLUE Phase - Refactored)
 *
 * Action buttons component for special relationship status management and deletion.
 * Provides status change buttons (Active/Inactive/Deceased) and delete functionality.
 *
 * Features:
 * - Status buttons based on current status (Active shows Deactivate/Mark Deceased, Inactive/Deceased show Activate)
 * - Delete button (only for inactive/deceased relationships)
 * - Optimistic updates with React Query mutations
 * - Loading states with disabled buttons and loading text
 * - Full keyboard navigation support (Tab, Enter, Space)
 * - WCAG 2.1 AA compliant ARIA labels with relationship names
 * - Event propagation control (prevents row click when clicking action buttons)
 * - DeleteConfirmationModal integration for safe deletion workflow
 *
 * Accessibility:
 * - All buttons have descriptive aria-labels including relationship name
 * - Focus indicators (focus:ring focus:outline)
 * - Keyboard event propagation stopped to prevent conflicts
 * - Destructive actions use danger variant (red styling)
 * - Loading states announced via button text changes
 *
 * @component SpecialRelationshipActions
 * @example
 * ```tsx
 * <SpecialRelationshipActions
 *   relationship={activeRelationship}
 * />
 * ```
 */

import React, { useState } from 'react';
import {
  SpecialRelationship,
  RelationshipStatus,
} from '@/types/specialRelationship';
import {
  useUpdateSpecialRelationshipStatus,
  useDeleteSpecialRelationship,
} from '@/hooks/useSpecialRelationships';
import Button from '@/components/ui/buttons/Button';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

// ==========================
// Constants
// ==========================

/**
 * Button text constants
 * Centralized for consistency and easy i18n support
 */
const BUTTON_TEXT = {
  DEACTIVATE: 'Deactivate',
  DEACTIVATING: 'Deactivating...',
  MARK_DECEASED: 'Mark Deceased',
  MARKING_DECEASED: 'Marking Deceased...',
  ACTIVATE: 'Activate',
  ACTIVATING: 'Activating...',
  DELETE: 'Delete',
  DELETING: 'Deleting...',
} as const;

/**
 * ARIA label templates
 * Provides context for screen readers by including relationship name
 */
const ARIA_LABELS = {
  DEACTIVATE: (name: string) => `Deactivate ${name}`,
  MARK_DECEASED: (name: string) => `Mark ${name} as deceased`,
  ACTIVATE: (name: string) => `Activate ${name}`,
  DELETE: (name: string) => `Delete ${name}`,
} as const;

/**
 * Common button CSS classes
 * Focus indicators required for WCAG 2.1 AA compliance
 */
const BUTTON_FOCUS_CLASSES = 'focus:ring focus:outline' as const;

// ==========================
// Types
// ==========================

/**
 * Props for SpecialRelationshipActions component
 *
 * @interface SpecialRelationshipActionsProps
 * @property relationship - The special relationship to display actions for (includes id, name, status, type)
 */
interface SpecialRelationshipActionsProps {
  /** The special relationship to display actions for */
  relationship: SpecialRelationship;
}

/**
 * Type for tracking which button was clicked to show specific loading state
 */
type ClickedButton = 'deactivate' | 'deceased' | 'activate' | null;

// ==========================
// Component
// ==========================

/**
 * Action buttons for managing special relationship status and deletion
 *
 * Displays conditional action buttons based on current relationship status:
 * - Active: Shows "Deactivate" and "Mark Deceased" buttons
 * - Inactive/Deceased: Shows "Activate" and "Delete" buttons
 *
 * @param props - Component props
 * @returns JSX element with action buttons and delete confirmation modal
 */
const SpecialRelationshipActions: React.FC<SpecialRelationshipActionsProps> = ({
  relationship,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clickedButton, setClickedButton] = useState<ClickedButton>(null);

  const updateStatusMutation = useUpdateSpecialRelationshipStatus();
  const deleteMutation = useDeleteSpecialRelationship();

  const isLoading = updateStatusMutation.isPending || deleteMutation.isPending;

  /**
   * Get full name for ARIA labels
   * Trims whitespace to handle cases where first_name or last_name might be empty
   */
  const fullName = `${relationship.first_name} ${relationship.last_name}`.trim();

  /**
   * Reset clicked button tracking when status update completes
   * Ensures correct button shows loading state
   */
  React.useEffect(() => {
    if (!updateStatusMutation.isPending) {
      setClickedButton(null);
    }
  }, [updateStatusMutation.isPending]);

  // ==========================
  // Event Handlers
  // ==========================

  /**
   * Handle status change with event propagation control
   *
   * Prevents event from bubbling up to parent elements (e.g., table row click).
   * Tracks which button was clicked to show specific loading state.
   * Uses React Query mutation for optimistic updates.
   *
   * @param e - Mouse or keyboard event
   * @param newStatus - Target status for the relationship
   * @param buttonType - Which button was clicked (for loading state tracking)
   */
  const handleStatusChange = (
    e: React.MouseEvent | React.KeyboardEvent,
    newStatus: RelationshipStatus,
    buttonType: ClickedButton
  ) => {
    e.stopPropagation();
    setClickedButton(buttonType);
    updateStatusMutation.mutate({
      id: relationship.id,
      status: newStatus,
    });
  };

  /**
   * Handle delete button click
   *
   * Opens confirmation modal instead of immediately deleting.
   * Prevents event propagation to avoid triggering row click.
   *
   * @param e - Mouse or keyboard event
   */
  const handleDeleteClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  /**
   * Handle delete confirmation from modal
   *
   * Executes the delete mutation and closes modal.
   * Soft deletes the relationship (can be restored).
   */
  const handleDeleteConfirm = () => {
    deleteMutation.mutate(relationship.id);
    setIsDeleteModalOpen(false);
  };

  /**
   * Handle delete cancellation from modal
   *
   * Closes modal without executing delete.
   */
  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
  };

  /**
   * Stop keyboard event propagation
   *
   * Prevents keyboard events (Enter, Space) on action buttons from
   * bubbling up to parent elements that might have keyboard handlers.
   *
   * @param e - Keyboard event
   */
  const stopKeyboardPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  // ==========================
  // Render
  // ==========================

  return (
    <>
      <div className="flex items-center gap-2" onKeyDown={stopKeyboardPropagation}>
        {/* Active relationship: Show Deactivate and Mark Deceased buttons */}
        {relationship.status === 'Active' && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => handleStatusChange(e, 'Inactive', 'deactivate')}
              disabled={isLoading}
              aria-label={ARIA_LABELS.DEACTIVATE(fullName)}
              className={BUTTON_FOCUS_CLASSES}
            >
              {(clickedButton === 'deactivate' || (isLoading && !clickedButton)) && isLoading
                ? BUTTON_TEXT.DEACTIVATING
                : BUTTON_TEXT.DEACTIVATE}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => handleStatusChange(e, 'Deceased', 'deceased')}
              disabled={isLoading}
              aria-label={ARIA_LABELS.MARK_DECEASED(fullName)}
              className={BUTTON_FOCUS_CLASSES}
            >
              {clickedButton === 'deceased' && isLoading
                ? BUTTON_TEXT.MARKING_DECEASED
                : BUTTON_TEXT.MARK_DECEASED}
            </Button>
          </>
        )}

        {/* Inactive or Deceased relationship: Show Activate and Delete buttons */}
        {(relationship.status === 'Inactive' || relationship.status === 'Deceased') && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => handleStatusChange(e, 'Active', 'activate')}
              disabled={isLoading}
              aria-label={ARIA_LABELS.ACTIVATE(fullName)}
              className={BUTTON_FOCUS_CLASSES}
            >
              {clickedButton === 'activate' && isLoading
                ? BUTTON_TEXT.ACTIVATING
                : BUTTON_TEXT.ACTIVATE}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isLoading}
              aria-label={ARIA_LABELS.DELETE(fullName)}
              className={`${BUTTON_FOCUS_CLASSES} destructive`}
            >
              {deleteMutation.isPending
                ? BUTTON_TEXT.DELETING
                : BUTTON_TEXT.DELETE}
            </Button>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal - soft delete with restore capability */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        relationship={relationship}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};

export default SpecialRelationshipActions;
