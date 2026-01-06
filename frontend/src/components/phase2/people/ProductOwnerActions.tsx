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
import { PauseCircleIcon, XCircleIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import { updateProductOwnerStatus } from '@/services/api/updateProductOwner';
import { deleteProductOwner } from '@/services/api/deleteProductOwner';
import { formatApiError } from '@/utils/errorHandling';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import type { ProductOwner } from '@/types/productOwner';

// ==========================
// Constants
// ==========================

/**
 * Success notification messages for status change operations
 * Centralized for consistency across all actions
 */
const SUCCESS_MESSAGES = {
  LAPSED: 'Status updated to lapsed',
  DECEASED: 'Status updated to deceased',
  REACTIVATED: 'Product owner reactivated',
  DELETED: 'Product owner deleted successfully',
} as const;

/**
 * Fallback error messages when API error is not user-friendly
 * Used as backup when formatApiError doesn't provide a message
 */
const FALLBACK_ERROR_MESSAGES = {
  STATUS_UPDATE: 'Failed to update status',
  DELETE: 'Failed to delete product owner',
} as const;

/**
 * Button text constants for loading and default states
 */
const BUTTON_TEXT = {
  MAKE_DECEASED: 'Deceased',
  MAKE_DECEASED_LOADING: 'Loading...',
  REACTIVATE: 'Reactivate',
  REACTIVATE_LOADING: 'Loading...',
} as const;

/**
 * CSS classes for custom inline buttons
 * Extracted for reusability and consistency with design system
 *
 * Note: LapseButton and DeleteButton use design="minimal" prop instead
 */
const BUTTON_STYLES = {
  /** Gray button style for Make Deceased action */
  MAKE_DECEASED: 'inline-flex items-center px-2.5 h-11 min-w-[44px] text-sm font-medium rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-800 focus:ring-2 focus:ring-gray-500/20 border border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
  /** Green button style for Reactivate action */
  REACTIVATE: 'inline-flex items-center px-2.5 h-11 min-w-[44px] text-sm font-medium rounded-lg bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 focus:ring-2 focus:ring-green-500/20 border border-green-200 hover:border-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
} as const;

// ==========================
// Type Definitions
// ==========================

/**
 * ProductOwnerActions Props Interface
 *
 * @property productOwner - Product owner record with status and ID
 * @property onStatusChange - Optional callback invoked after successful status change
 * @property onAnnounce - Optional callback for announcing actions to screen readers
 */
interface ProductOwnerActionsProps {
  /** Product owner record with status and ID */
  productOwner: ProductOwner;
  /** Optional callback invoked after successful status change (for data refresh) */
  onStatusChange?: () => void;
  /** Optional callback for announcing actions to screen readers via aria-live */
  onAnnounce?: (message: string) => void;
}

// ==========================
// Component
// ==========================

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
  onAnnounce,
}) => {
  // ==========================
  // State Management
  // ==========================

  /**
   * Loading state for Lapse operation
   * Prevents concurrent operations when true
   */
  const [isLapsing, setIsLapsing] = useState(false);

  /**
   * Loading state for Make Deceased operation
   * Prevents concurrent operations when true
   */
  const [isMakingDeceased, setIsMakingDeceased] = useState(false);

  /**
   * Loading state for Reactivate operation
   * Prevents concurrent operations when true
   */
  const [isReactivating, setIsReactivating] = useState(false);

  /**
   * Loading state for Delete operation
   * Prevents concurrent operations when true
   */
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Modal visibility state for delete confirmation
   * True when delete confirmation modal is displayed
   */
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ==========================
  // Event Handlers
  // ==========================

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
      toast.success(SUCCESS_MESSAGES.LAPSED);

      // Announce to screen readers
      if (onAnnounce) {
        onAnnounce('Status changed to lapsed');
        setTimeout(() => onAnnounce(''), 3000);
      }

      // Trigger data refresh via callback
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error: any) {
      // Show error notification with user-friendly message
      toast.error(error.message || FALLBACK_ERROR_MESSAGES.STATUS_UPDATE);
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
      toast.success(SUCCESS_MESSAGES.DECEASED);

      // Announce to screen readers
      if (onAnnounce) {
        onAnnounce('Status changed to deceased');
        setTimeout(() => onAnnounce(''), 3000);
      }

      // Trigger data refresh via callback
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error: any) {
      // Show error notification with user-friendly message
      toast.error(error.message || FALLBACK_ERROR_MESSAGES.STATUS_UPDATE);
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
      toast.success(SUCCESS_MESSAGES.REACTIVATED);

      // Announce to screen readers
      if (onAnnounce) {
        onAnnounce('Product owner reactivated');
        setTimeout(() => onAnnounce(''), 3000);
      }

      // Trigger data refresh via callback
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error: any) {
      // Show error notification with user-friendly message
      toast.error(error.message || FALLBACK_ERROR_MESSAGES.STATUS_UPDATE);
    } finally {
      // Clear loading state
      setIsReactivating(false);
    }
  };

  /**
   * Handle Delete action
   *
   * Permanently deletes the product owner via API call after user confirmation.
   * Shows loading state, success/error notifications, and triggers refresh.
   * Keeps modal open on error to allow retry.
   */
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteProductOwner(productOwner.id);

      // Show success notification
      toast.success(SUCCESS_MESSAGES.DELETED);

      // Close modal on success
      setIsDeleteModalOpen(false);

      // Trigger data refresh via callback
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error: any) {
      // Show error notification with user-friendly message
      const errorMessage = formatApiError(error);
      toast.error(errorMessage || FALLBACK_ERROR_MESSAGES.DELETE);
      // Keep modal open on error to allow user to retry
    } finally {
      setIsDeleting(false);
    }
  };

  // ==========================
  // Render
  // ==========================

  /**
   * Conditional rendering based on product owner status
   *
   * Active status: Show Lapse and Make Deceased buttons
   * Lapsed/Deceased status: Show Reactivate and Delete buttons
   */
  if (productOwner.status === 'active') {
    // Active product owners: Show Lapse and Deceased icon buttons
    return (
      <div className="flex items-center gap-1">
        {/* Lapse button - orange icon */}
        <button
          onClick={handleLapse}
          disabled={isLapsing || isMakingDeceased}
          className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Lapse product owner"
          title="Lapse"
        >
          <PauseCircleIcon className="w-4 h-4" />
        </button>

        {/* Deceased button - gray icon */}
        <button
          onClick={handleMakeDeceased}
          disabled={isLapsing || isMakingDeceased}
          className="p-1 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Mark product owner as deceased"
          title="Deceased"
        >
          <XCircleIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Lapsed or Deceased product owners: Show Reactivate and Delete icon buttons
  return (
    <>
      <div className="flex items-center gap-1">
        {/* Reactivate button - blue icon */}
        <button
          onClick={handleReactivate}
          disabled={isReactivating || isDeleting}
          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Reactivate product owner"
          title="Reactivate"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>

        {/* Delete button - red icon */}
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          disabled={isReactivating || isDeleting}
          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Delete product owner"
          title="Delete"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Delete Confirmation Modal - shown when user clicks Delete button */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        productOwner={productOwner}
        isLoading={isDeleting}
      />
    </>
  );
};

export default ProductOwnerActions;
