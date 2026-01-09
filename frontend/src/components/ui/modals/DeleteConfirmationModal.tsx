/**
 * DeleteConfirmationModal Component
 *
 * A reusable modal for confirming deletion of entities.
 * Uses HeadlessUI Dialog for accessibility with smooth transitions.
 *
 * Features:
 * - Accessible dialog with proper ARIA attributes
 * - Focus management (initial focus on Cancel button)
 * - Smooth enter/leave transitions
 * - Customizable entity type and name display
 * - Cancel and Remove action buttons
 *
 * @module components/ui/modals/DeleteConfirmationModal
 */

import React, { useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

// =============================================================================
// Types
// =============================================================================

export interface DeleteConfirmationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when cancel is clicked or modal is closed */
  onCancel: () => void;
  /** Callback when removal is confirmed */
  onConfirm: () => void;
  /** Type of entity being deleted (e.g., "Health Condition", "Vulnerability") */
  entityType: string;
  /** Name/description of the specific entity being deleted */
  entityName: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DeleteConfirmationModal Component
 *
 * Displays a confirmation dialog before deleting an entity.
 * Uses HeadlessUI Dialog for full accessibility support.
 *
 * @example
 * ```tsx
 * <DeleteConfirmationModal
 *   isOpen={isDeleteModalOpen}
 *   onCancel={() => setIsDeleteModalOpen(false)}
 *   onConfirm={handleDelete}
 *   entityType="Health Condition"
 *   entityName="Diabetes Type 2"
 * />
 * ```
 */
const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  entityType,
  entityName,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={onCancel}
        initialFocus={cancelButtonRef}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-16 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Confirm Delete
                </Dialog.Title>

                <Dialog.Description className="mt-2 text-sm text-gray-500">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold">{entityName}</span>?
                  This action cannot be undone.
                </Dialog.Description>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    ref={cancelButtonRef}
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    onClick={onCancel}
                    aria-label="Cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    onClick={onConfirm}
                    aria-label="Delete"
                  >
                    Delete
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

DeleteConfirmationModal.displayName = 'DeleteConfirmationModal';

export default DeleteConfirmationModal;
