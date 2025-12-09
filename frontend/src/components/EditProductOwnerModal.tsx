/**
 * EditProductOwnerModal Component
 *
 * Modal dialog for editing product owner data with comprehensive form.
 * Uses HeadlessUI Dialog for accessibility and EditProductOwnerForm for data management.
 *
 * Features:
 * - Accessible dialog with ARIA labels and focus trap
 * - Unsaved changes warning on close attempt
 * - Product owner name subtitle
 * - API integration with updateProductOwner
 * - Success/error toast notifications
 * - Responsive modal sizing (max-w-4xl)
 *
 * @module components/EditProductOwnerModal
 */

import React, { Fragment, useState, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
import EditProductOwnerForm from './EditProductOwnerForm';
import * as productOwnersApi from '@/services/api/productOwners';
import { formatApiError } from '@/utils/errorHandling';
import type { ProductOwner } from '@/types/productOwner';

/**
 * EditProductOwnerModal Props Interface
 *
 * @property isOpen - Controls modal visibility
 * @property onClose - Callback when modal should close (user cancels or completes)
 * @property productOwner - Product owner data to edit
 * @property onUpdate - Callback after successful update (triggers data refresh)
 */
interface EditProductOwnerModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback when modal should close (user cancels or completes) */
  onClose: () => void;
  /** Product owner data to edit */
  productOwner: ProductOwner;
  /** Callback after successful update (triggers data refresh) */
  onUpdate: () => void;
}

/**
 * Modal text content constants
 */
const MODAL_TEXT = {
  TITLE: 'Edit Product Owner',
  SUCCESS_MESSAGE: 'Product owner updated successfully',
  UNSAVED_CHANGES_WARNING: 'You have unsaved changes. Are you sure you want to close?',
} as const;

/**
 * Transition duration constants for HeadlessUI animations
 */
const TRANSITION_DURATION = {
  ENTER: 'ease-out duration-300',
  LEAVE: 'ease-in duration-200',
} as const;

/**
 * Format product owner full name for subtitle
 *
 * Constructs display name: "title firstname middlename surname"
 * Handles missing fields gracefully
 *
 * @param productOwner - Product owner with name fields
 * @returns Formatted full name string
 */
const formatProductOwnerName = (productOwner: ProductOwner): string => {
  const nameParts = [
    productOwner.title,
    productOwner.firstname,
    productOwner.middle_names,
    productOwner.surname,
  ].filter(Boolean); // Remove null/undefined/empty values

  return nameParts.join(' ');
};

/**
 * EditProductOwnerModal Component
 *
 * Renders accessible modal dialog with edit form.
 * Handles form submission, API calls, and user confirmations.
 *
 * @param props - Component props
 * @returns JSX element with HeadlessUI Dialog
 */
const EditProductOwnerModal: React.FC<EditProductOwnerModalProps> = ({
  isOpen,
  onClose,
  productOwner,
  onUpdate,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formIsDirty, setFormIsDirty] = useState(false);

  // Format product owner name for subtitle
  const productOwnerName = formatProductOwnerName(productOwner);

  /**
   * Handle close with unsaved changes warning
   *
   * If form has unsaved changes, show confirmation dialog.
   * If user confirms, close modal and discard changes.
   * If no changes, close immediately.
   */
  const handleClose = useCallback(() => {
    if (formIsDirty) {
      const confirmed = window.confirm(MODAL_TEXT.UNSAVED_CHANGES_WARNING);
      if (confirmed) {
        setFormIsDirty(false); // Reset dirty state
        onClose();
      }
      // If not confirmed, stay on modal (do nothing)
    } else {
      onClose();
    }
  }, [formIsDirty, onClose]);

  /**
   * Handle form submission
   *
   * Calls updateProductOwner API with changed fields.
   * Shows success toast and closes modal on success.
   * Shows error toast and keeps modal open on failure.
   *
   * @param data - Partial product owner data with only changed fields
   */
  const handleSubmit = useCallback(async (data: Partial<ProductOwner>) => {
    setIsSubmitting(true);
    try {
      await productOwnersApi.updateProductOwner(productOwner.id, data);
      toast.success(MODAL_TEXT.SUCCESS_MESSAGE);
      onUpdate(); // Trigger data refresh in parent
      onClose(); // Close modal
    } catch (error: any) {
      toast.error(formatApiError(error));
      // Keep modal open on error for retry
    } finally {
      setIsSubmitting(false);
    }
  }, [productOwner.id, onUpdate, onClose]);

  /**
   * Handle cancel button click
   *
   * Same behavior as handleClose - check for unsaved changes
   */
  const handleCancel = useCallback(() => {
    handleClose();
  }, [handleClose]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 max-w-4xl" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all" role="document">
                {/* Dialog Title - HeadlessUI automatically sets aria-labelledby */}
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-2"
                  id="edit-product-owner-title"
                >
                  {MODAL_TEXT.TITLE}
                </Dialog.Title>

                {/* Dialog Description - Product owner name subtitle */}
                <Dialog.Description
                  className="text-sm text-gray-500 mb-6"
                  id="edit-product-owner-description"
                >
                  {productOwnerName}
                </Dialog.Description>

                {/* Edit Form */}
                <EditProductOwnerForm
                  productOwner={productOwner}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isSubmitting={isSubmitting}
                  onDirtyChange={setFormIsDirty}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditProductOwnerModal;
