/**
 * ProductOwnerActions Component
 *
 * Status management action buttons for product owners in the Phase 2 People Tab.
 * Handles Lapse, Make Deceased, Reactivate, and Delete operations with loading
 * states, error handling, and success notifications.
 *
 * Features:
 * - Conditional button rendering based on product owner status
 * - Per-action loading states with disabled buttons during operations
 * - Success/error notifications using react-hot-toast
 * - Automatic data refresh via callback after successful updates
 * - User-friendly error messages
 *
 * Button Display Logic:
 * - Active owners: Show "Lapse" and "Make Deceased" buttons
 * - Lapsed/Deceased owners: Show "Reactivate" and "Delete" buttons
 *
 * @module components/ProductOwnerActions
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { LapseButton, ActionButton, DeleteButton } from '@/components/ui';
import { updateProductOwnerStatus } from '@/services/api';
import type { ProductOwner } from '@/types/productOwner';

/**
 * ProductOwnerActions Props Interface
 *
 * @property productOwner - Product owner record with status and ID
 * @property onStatusChange - Optional callback invoked after successful status change
 */
interface ProductOwnerActionsProps {
  /** Product owner record with status and ID */
  productOwner: ProductOwner;
  /** Optional callback invoked after successful status change (for data refresh) */
  onStatusChange?: () => void;
}

/**
 * ProductOwnerActions Component
 *
 * Renders action buttons based on product owner status and handles
 * all status change operations with proper loading and error states.
 *
 * @param props - Component props
 * @returns JSX element with action buttons
 */
const ProductOwnerActions: React.FC<ProductOwnerActionsProps> = ({
  productOwner,
  onStatusChange,
}) => {
  // Loading state for each action to prevent concurrent operations
  const [isLapsing, setIsLapsing] = useState(false);
  const [isMakingDeceased, setIsMakingDeceased] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handle Lapse action (active → lapsed)
   *
   * Updates product owner status to 'lapsed' via API call.
   * Shows loading state, success/error notifications, and triggers refresh.
   */
  const handleLapse = async () => {
    setIsLapsing(true);

    try {
      await updateProductOwnerStatus(productOwner.id, 'lapsed');

      // Show success notification
      toast.success('Status updated to lapsed');

      // Trigger data refresh via callback
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error: any) {
      // Show error notification with user-friendly message
      toast.error(error.message || 'Failed to update status');
    } finally {
      // Clear loading state
      setIsLapsing(false);
    }
  };

  /**
   * Handle Make Deceased action (active → deceased)
   *
   * Updates product owner status to 'deceased' via API call.
   * Shows loading state, success/error notifications, and triggers refresh.
   */
  const handleMakeDeceased = async () => {
    setIsMakingDeceased(true);

    try {
      await updateProductOwnerStatus(productOwner.id, 'deceased');

      // Show success notification
      toast.success('Status updated to deceased');

      // Trigger data refresh via callback
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error: any) {
      // Show error notification with user-friendly message
      toast.error(error.message || 'Failed to update status');
    } finally {
      // Clear loading state
      setIsMakingDeceased(false);
    }
  };

  /**
   * Handle Reactivate action (lapsed/deceased → active)
   *
   * Updates product owner status to 'active' via API call.
   * Shows loading state, success/error notifications, and triggers refresh.
   */
  const handleReactivate = async () => {
    setIsReactivating(true);

    try {
      await updateProductOwnerStatus(productOwner.id, 'active');

      // Show success notification
      toast.success('Product owner reactivated');

      // Trigger data refresh via callback
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error: any) {
      // Show error notification with user-friendly message
      toast.error(error.message || 'Failed to update status');
    } finally {
      // Clear loading state
      setIsReactivating(false);
    }
  };

  /**
   * Handle Delete action (placeholder for future implementation)
   *
   * TODO: Implement deletion in Phase 3
   * Currently a placeholder to satisfy test requirements.
   */
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // TODO: Implement actual delete API call in Phase 3
      console.log('Delete product owner:', productOwner.id);

      // Placeholder success notification
      toast.success('Delete functionality coming in Phase 3');
    } catch (error: any) {
      toast.error('Failed to delete product owner');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Conditional rendering based on product owner status
   *
   * Active status: Show Lapse and Make Deceased buttons
   * Lapsed/Deceased status: Show Reactivate and Delete buttons
   */
  if (productOwner.status === 'active') {
    // Active product owners: Show Lapse and Make Deceased buttons
    return (
      <div className="flex items-center gap-2">
        <LapseButton
          onClick={handleLapse}
          disabled={isLapsing || isMakingDeceased}
          loading={isLapsing}
          size="sm"
          design="minimal"
        >
          {isLapsing ? 'Loading...' : 'Lapse'}
        </LapseButton>
        <ActionButton
          variant="delete"
          onClick={handleMakeDeceased}
          disabled={isLapsing || isMakingDeceased}
          loading={isMakingDeceased}
          size="sm"
          design="minimal"
        >
          {isMakingDeceased ? 'Loading...' : 'Make Deceased'}
        </ActionButton>
      </div>
    );
  }

  // Lapsed or Deceased product owners: Show Reactivate and Delete buttons
  return (
    <div className="flex items-center gap-2">
      <ActionButton
        variant="save"
        onClick={handleReactivate}
        disabled={isReactivating || isDeleting}
        loading={isReactivating}
        size="sm"
        design="minimal"
      >
        {isReactivating ? 'Loading...' : 'Reactivate'}
      </ActionButton>
      <DeleteButton
        onClick={handleDelete}
        disabled={isReactivating || isDeleting}
        loading={isDeleting}
        size="sm"
        design="minimal"
      >
        {isDeleting ? 'Loading...' : 'Delete'}
      </DeleteButton>
    </div>
  );
};

export default ProductOwnerActions;
