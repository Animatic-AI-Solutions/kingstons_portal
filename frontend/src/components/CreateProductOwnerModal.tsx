/**
 * CreateProductOwnerModal Component
 *
 * Modal dialog for creating new product owners with all 30 fields.
 * Reuses EditProductOwnerForm component in 'create' mode for consistency.
 *
 * Features:
 * - All 30 product owner fields with progressive disclosure
 * - Form validation with yup schema
 * - Unsaved changes warning on close
 * - Client group association on creation
 * - User-friendly error messages
 *
 * @module components/CreateProductOwnerModal
 */

import React, { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import BaseModal from './BaseModal';
import EditProductOwnerForm from './EditProductOwnerForm';
import { createProductOwner } from '@/services/api/productOwners';
import { createClientGroupProductOwner } from '@/services/api/clientGroupProductOwners';
import { createAddress, hasAddressData } from '@/services/api/addresses';
import { formatApiError } from '@/utils/errorHandling';
import type { ProductOwner } from '@/types/productOwner';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * CreateProductOwnerModal Props Interface
 *
 * @property isOpen - Whether modal is visible
 * @property onClose - Callback when modal should close
 * @property clientGroupId - ID of client group to associate new product owner with
 * @property onCreate - Callback after successful creation to refresh data
 */
interface CreateProductOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientGroupId: number;
  onCreate: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Modal text constants
 */
const MODAL_TEXT = {
  TITLE: 'Create Product Owner',
  SUBTITLE: 'Add a new person to this client group',
  SUCCESS_MESSAGE: 'Product owner created successfully',
} as const;


// ============================================================================
// Component
// ============================================================================

/**
 * CreateProductOwnerModal Component
 *
 * Displays modal dialog for creating new product owners.
 * Uses EditProductOwnerForm component in create mode.
 *
 * @param props - Component props
 * @returns JSX element with modal dialog
 */
const CreateProductOwnerModal: React.FC<CreateProductOwnerModalProps> = ({
  isOpen,
  onClose,
  clientGroupId,
  onCreate,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  /**
   * Handle modal close with unsaved changes warning
   */
  const handleClose = useCallback(() => {
    if (isFormDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  }, [isFormDirty, onClose]);

  /**
   * Handle cancel button click
   */
  const handleCancel = useCallback(() => {
    handleClose();
  }, [handleClose]);

  /**
   * Handle form submission
   *
   * Creates product owner and associates with client group.
   * On success: Shows success message, triggers refresh, closes modal
   * On error: Shows error message, keeps modal open for retry
   *
   * @param data - Product owner data from form
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

      // Create address if any field has value
      if (hasAddressData(addressFields)) {
        try {
          const newAddress = await createAddress(addressFields);
          productOwnerData.address_id = newAddress.id;
        } catch (addressError) {
          console.error('Failed to create address:', addressError);
          toast.error('Failed to create address. Please try again.');
          setIsSubmitting(false);
          return; // Stop submission if address creation fails
        }
      }

      // Create the product owner
      const newProductOwner = await createProductOwner(productOwnerData);

      // Associate product owner with client group
      if (newProductOwner?.id) {
        try {
          await createClientGroupProductOwner({
            client_group_id: clientGroupId,
            product_owner_id: newProductOwner.id,
          });
        } catch (associationError) {
          console.error('Failed to associate product owner with client group:', associationError);
          // Continue - product owner was created successfully
          // User can manually associate later if needed
        }
      }

      toast.success(MODAL_TEXT.SUCCESS_MESSAGE);
      onCreate(); // Trigger data refresh
      onClose(); // Close modal
    } catch (error) {
      console.error('Error creating product owner:', error);
      toast.error(formatApiError(error));
      // Keep modal open on error for retry
    } finally {
      setIsSubmitting(false);
    }
  }, [clientGroupId, onCreate, onClose]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={MODAL_TEXT.TITLE}
      description={MODAL_TEXT.SUBTITLE}
      titleId="create-product-owner-title"
      descriptionId="create-product-owner-description"
    >
      <EditProductOwnerForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        onDirtyChange={setIsFormDirty}
      />
    </BaseModal>
  );
};

export default CreateProductOwnerModal;
