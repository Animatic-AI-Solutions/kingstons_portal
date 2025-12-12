/**
 * DeleteConfirmationModal Component
 *
 * Confirmation modal for deleting product owners and special relationships
 * with proper accessibility and user experience patterns. Uses HeadlessUI
 * Dialog for accessible modal implementation with focus trap and keyboard navigation.
 *
 * Features:
 * - Accessible dialog with ARIA labels and descriptions
 * - Focus trap within modal (HeadlessUI automatic)
 * - Keyboard navigation (Escape to close, Tab cycling)
 * - Loading state with disabled buttons
 * - Destructive action styling (red Delete button)
 * - Backdrop click and Escape key to cancel
 * - Focus restoration when modal closes
 *
 * @module components/DeleteConfirmationModal
 */

import React, { Fragment, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { ProductOwner } from '@/types/productOwner';
import type { SpecialRelationship } from '@/types/specialRelationship';

// ==========================
// Constants
// ==========================

/**
 * Modal text content constants
 * Centralized for consistency and easy updates
 */
const MODAL_TEXT = {
  TITLE_PRODUCT_OWNER: 'Delete Product Owner',
  TITLE_RELATIONSHIP: 'Delete Special Relationship',
  DESCRIPTION_PREFIX: 'Are you sure you want to delete',
  DESCRIPTION_SUFFIX_PERMANENT: 'This action is permanent and cannot be undone.',
  DESCRIPTION_SUFFIX_SOFT: 'This is a soft delete and can be restored if needed. The relationship will be marked as deleted but not permanently removed from the system.',
  BUTTON_CANCEL: 'Cancel',
  BUTTON_DELETE: 'Delete',
  BUTTON_DELETING: 'Deleting...',
  FALLBACK_NAME_OWNER: 'this product owner',
  FALLBACK_NAME_RELATIONSHIP: 'this relationship',
} as const;

/**
 * Transition duration constants for HeadlessUI animations
 * Consistent timing across enter/leave transitions
 */
const TRANSITION_DURATION = {
  ENTER: 'ease-out duration-300',
  LEAVE: 'ease-in duration-200',
} as const;

/**
 * CSS classes for button styling
 * Extracted for reusability and maintainability
 */
const BUTTON_STYLES = {
  CANCEL: 'inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors secondary outline',
  DELETE: 'inline-flex justify-center items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors destructive red danger',
  SPINNER: 'animate-spin -ml-1 mr-2 h-4 w-4 text-white',
} as const;

/**
 * DeleteConfirmationModal Props Interface
 *
 * @property isOpen - Controls modal visibility
 * @property onCancel - Callback when user cancels (backdrop, Escape, Cancel button)
 * @property onConfirm - Callback when user confirms deletion
 * @property productOwner - Product owner to be deleted (for displaying name)
 * @property relationship - Special relationship to be deleted (for displaying name)
 * @property isLoading - Loading state during deletion (disables buttons, shows spinner)
 */
interface DeleteConfirmationModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback when user cancels (backdrop, Escape, Cancel button) */
  onCancel: () => void;
  /** Callback when user confirms deletion */
  onConfirm: () => void;
  /** Product owner to be deleted (for displaying name) - mutually exclusive with relationship */
  productOwner?: ProductOwner;
  /** Special relationship to be deleted (for displaying name) - mutually exclusive with productOwner */
  relationship?: SpecialRelationship;
  /** Loading state during deletion (disables buttons, shows spinner) */
  isLoading?: boolean;
}

/**
 * Get product owner display name with fallback handling
 *
 * Constructs a user-friendly display name from product owner data.
 * Handles missing or null firstname/surname fields gracefully.
 *
 * Priority order:
 * 1. "Firstname Surname" (if both present)
 * 2. Firstname only (if surname missing)
 * 3. Surname only (if firstname missing)
 * 4. Fallback text (if both missing)
 *
 * @param productOwner - Product owner with optional firstname/surname
 * @returns Display name string for modal description
 */
const getProductOwnerDisplayName = (productOwner: ProductOwner): string => {
  if (productOwner.firstname && productOwner.surname) {
    return `${productOwner.firstname} ${productOwner.surname}`;
  }

  return productOwner.firstname || productOwner.surname || MODAL_TEXT.FALLBACK_NAME_OWNER;
};

/**
 * Get special relationship display name with fallback handling
 *
 * Constructs a user-friendly display name from special relationship data.
 * Handles missing or null first_name/last_name fields gracefully.
 *
 * Priority order:
 * 1. "First_name Last_name" (if both present)
 * 2. First_name only (if last_name missing)
 * 3. Last_name only (if first_name missing)
 * 4. Fallback text (if both missing)
 *
 * @param relationship - Special relationship with optional first_name/last_name
 * @returns Display name string for modal description
 */
const getRelationshipDisplayName = (relationship: SpecialRelationship): string => {
  if (relationship.first_name && relationship.last_name) {
    return `${relationship.first_name} ${relationship.last_name}`;
  }

  return relationship.first_name || relationship.last_name || MODAL_TEXT.FALLBACK_NAME_RELATIONSHIP;
};

// ==========================
// Component
// ==========================

/**
 * DeleteConfirmationModal Component
 *
 * Renders an accessible confirmation dialog for deleting product owners or special relationships.
 * Implements HeadlessUI Dialog with proper ARIA attributes, focus management,
 * and keyboard navigation.
 *
 * User can cancel via:
 * - Cancel button click
 * - Backdrop click
 * - Escape key (HeadlessUI automatic)
 *
 * @param props - Component props
 * @returns JSX element with HeadlessUI Dialog
 */
const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  productOwner,
  relationship,
  isLoading = false,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Store previously focused element when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!previousActiveElementRef.current) {
        previousActiveElementRef.current = document.activeElement as HTMLElement;
      }
      // Ensure cancel button gets focus
      if (cancelButtonRef.current) {
        cancelButtonRef.current.focus();
      }
    }
  }, [isOpen]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && previousActiveElementRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        previousActiveElementRef.current?.focus();
        previousActiveElementRef.current = null;
      }, 0);
    }
  }, [isOpen]);

  // Determine which entity is being deleted and get display info
  const isRelationship = !!relationship;
  const displayName = isRelationship
    ? getRelationshipDisplayName(relationship!)
    : getProductOwnerDisplayName(productOwner!);
  const modalTitle = isRelationship
    ? MODAL_TEXT.TITLE_RELATIONSHIP
    : MODAL_TEXT.TITLE_PRODUCT_OWNER;
  const descriptionSuffix = isRelationship
    ? MODAL_TEXT.DESCRIPTION_SUFFIX_SOFT
    : MODAL_TEXT.DESCRIPTION_SUFFIX_PERMANENT;
  const descriptionPrefix = isRelationship
    ? `${MODAL_TEXT.DESCRIPTION_PREFIX} the ${relationship!.relationship_type.toLowerCase()}`
    : MODAL_TEXT.DESCRIPTION_PREFIX;

  /**
   * Handle close with loading state check
   */
  const handleClose = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose} initialFocus={cancelButtonRef}>
        {/* Backdrop overlay with fade transition */}
        <Transition.Child
          as={Fragment}
          enter={TRANSITION_DURATION.ENTER}
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave={TRANSITION_DURATION.LEAVE}
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        {/* Modal positioning container - centers modal on screen */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-16 text-center">
            {/* Modal panel with scale and fade transition */}
            <Transition.Child
              as={Fragment}
              enter={TRANSITION_DURATION.ENTER}
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave={TRANSITION_DURATION.LEAVE}
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Dialog Title - HeadlessUI automatically sets aria-labelledby */}
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                  id="delete-modal-title"
                >
                  {modalTitle}
                </Dialog.Title>

                {/* Dialog Description - HeadlessUI automatically sets aria-describedby */}
                <Dialog.Description
                  className="mt-2 text-sm text-gray-500"
                  id="delete-modal-description"
                >
                  {descriptionPrefix}{' '}
                  <span className="font-semibold">{displayName}</span>?{' '}
                  {descriptionSuffix}
                </Dialog.Description>

                {/* Action buttons - right-aligned with gap between */}
                <div className="mt-6 flex justify-end gap-3">
                  {/* Cancel button - secondary style, dismisses modal */}
                  <button
                    ref={cancelButtonRef}
                    type="button"
                    className={BUTTON_STYLES.CANCEL}
                    onClick={onCancel}
                    disabled={isLoading}
                    aria-label="Cancel"
                  >
                    {MODAL_TEXT.BUTTON_CANCEL}
                  </button>

                  {/* Delete button - destructive red style, confirms deletion */}
                  <button
                    type="button"
                    className={BUTTON_STYLES.DELETE}
                    onClick={onConfirm}
                    disabled={isLoading}
                    aria-label={`Delete ${displayName}`}
                  >
                    {isLoading ? (
                      <>
                        {/* Loading spinner - indicates delete operation in progress */}
                        <svg
                          className={BUTTON_STYLES.SPINNER}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        {MODAL_TEXT.BUTTON_DELETING}
                      </>
                    ) : (
                      MODAL_TEXT.BUTTON_DELETE
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DeleteConfirmationModal;
