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

import React, { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import BaseModal from './BaseModal';
import EditProductOwnerForm from './EditProductOwnerForm';
import * as productOwnersApi from '@/services/api/productOwners';
import { createAddress, updateAddress, hasAddressData } from '@/services/api/addresses';
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
      // Extract address fields from form data
      const {
        address_line_1,
        address_line_2,
        address_line_3,
        address_line_4,
        address_line_5,
        ...productOwnerData
      } = data;

      const addressFields = {
        line_1: address_line_1 || '',
        line_2: address_line_2 || '',
        line_3: address_line_3 || '',
        line_4: address_line_4 || '',
        line_5: address_line_5 || '',
      };

      // Determine if any address field has value
      const hasAddress = hasAddressData(addressFields);

      // Handle address creation/update/removal
      if (hasAddress && productOwner.address_id) {
        // Update existing address
        try {
          await updateAddress(productOwner.address_id, addressFields);
        } catch (addressError) {
          console.error('Failed to update address:', addressError);
          toast.error('Failed to update address. Please try again.');
          setIsSubmitting(false);
          return;
        }
      } else if (hasAddress && !productOwner.address_id) {
        // Create new address
        try {
          const newAddress = await createAddress(addressFields);
          productOwnerData.address_id = newAddress.id;
        } catch (addressError) {
          console.error('Failed to create address:', addressError);
          toast.error('Failed to create address. Please try again.');
          setIsSubmitting(false);
          return;
        }
      } else if (!hasAddress && productOwner.address_id) {
        // User cleared all address fields - remove association
        productOwnerData.address_id = null;
      }

      // Update product owner
      await productOwnersApi.updateProductOwner(productOwner.id, productOwnerData);
      toast.success(MODAL_TEXT.SUCCESS_MESSAGE);
      onUpdate(); // Trigger data refresh in parent
      onClose(); // Close modal
    } catch (error: any) {
      toast.error(formatApiError(error));
      // Keep modal open on error for retry
    } finally {
      setIsSubmitting(false);
    }
  }, [productOwner.id, productOwner.address_id, onUpdate, onClose]);

  /**
   * Handle cancel button click
   *
   * Same behavior as handleClose - check for unsaved changes
   */
  const handleCancel = useCallback(() => {
    handleClose();
  }, [handleClose]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={MODAL_TEXT.TITLE}
      description={productOwnerName}
      titleId="edit-product-owner-title"
      descriptionId="edit-product-owner-description"
    >
      <EditProductOwnerForm
        productOwner={productOwner}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        onDirtyChange={setFormIsDirty}
      />
    </BaseModal>
  );
};

export default EditProductOwnerModal;
