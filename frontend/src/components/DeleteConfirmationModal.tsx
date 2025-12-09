/**
 * DeleteConfirmationModal Component
 *
 * Confirmation modal for deleting product owners with proper accessibility
 * and user experience patterns. Uses HeadlessUI Dialog for accessible modal
 * implementation with focus trap and keyboard navigation.
 *
 * Features:
 * - Accessible dialog with ARIA labels and descriptions
 * - Focus trap within modal (HeadlessUI automatic)
 * - Keyboard navigation (Escape to close, Tab cycling)
 * - Loading state with disabled buttons
 * - Destructive action styling (red Delete button)
 * - Backdrop click and Escape key to cancel
 *
 * @module components/DeleteConfirmationModal
 */

import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { ProductOwner } from '@/types/productOwner';

// ==========================
// Constants
// ==========================

/**
 * Modal text content constants
 * Centralized for consistency and easy updates
 */
const MODAL_TEXT = {
  TITLE: 'Delete Product Owner',
  DESCRIPTION_PREFIX: 'Are you sure you want to delete',
  DESCRIPTION_SUFFIX: 'This action is permanent and cannot be undone.',
  BUTTON_CANCEL: 'Cancel',
  BUTTON_DELETE: 'Delete',
  BUTTON_DELETING: 'Deleting...',
  FALLBACK_NAME: 'this product owner',
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
  CANCEL: 'inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors secondary',
  DELETE: 'inline-flex justify-center items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  SPINNER: 'animate-spin -ml-1 mr-2 h-4 w-4 text-white',
} as const;

/**
 * DeleteConfirmationModal Props Interface
 *
 * @property isOpen - Controls modal visibility
 * @property onCancel - Callback when user cancels (backdrop, Escape, Cancel button)
 * @property onConfirm - Callback when user confirms deletion
 * @property productOwner - Product owner to be deleted (for displaying name)
 * @property isLoading - Loading state during deletion (disables buttons, shows spinner)
 */
interface DeleteConfirmationModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback when user cancels (backdrop, Escape, Cancel button) */
  onCancel: () => void;
  /** Callback when user confirms deletion */
  onConfirm: () => void;
  /** Product owner to be deleted (for displaying name) */
  productOwner: ProductOwner;
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

  return productOwner.firstname || productOwner.surname || MODAL_TEXT.FALLBACK_NAME;
};

// ==========================
// Component
// ==========================

/**
 * DeleteConfirmationModal Component
 *
 * Renders an accessible confirmation dialog for deleting product owners.
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
  isLoading = false,
}) => {
  // Construct product owner name with fallback for missing fields
  const productOwnerName = getProductOwnerDisplayName(productOwner);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel}>
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
          <div className="flex min-h-full items-center justify-center p-4 text-center">
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
                  tabIndex={0}
                >
                  {MODAL_TEXT.TITLE}
                </Dialog.Title>

                {/* Dialog Description - HeadlessUI automatically sets aria-describedby */}
                <Dialog.Description className="mt-2 text-sm text-gray-500">
                  {MODAL_TEXT.DESCRIPTION_PREFIX}{' '}
                  <span className="font-semibold">{productOwnerName}</span>?{' '}
                  {MODAL_TEXT.DESCRIPTION_SUFFIX}
                </Dialog.Description>

                {/* Action buttons - right-aligned with gap between */}
                <div className="mt-6 flex justify-end gap-3">
                  {/* Cancel button - secondary style, dismisses modal */}
                  <button
                    type="button"
                    className={BUTTON_STYLES.CANCEL}
                    onClick={onCancel}
                    disabled={isLoading}
                  >
                    {MODAL_TEXT.BUTTON_CANCEL}
                  </button>

                  {/* Delete button - destructive red style, confirms deletion */}
                  <button
                    type="button"
                    className={BUTTON_STYLES.DELETE}
                    onClick={onConfirm}
                    disabled={isLoading}
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
