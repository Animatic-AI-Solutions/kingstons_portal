/**
 * BaseModal Component
 *
 * Shared modal wrapper using HeadlessUI Dialog and Transition.
 * Eliminates 70+ lines of duplication between CreateProductOwnerModal and EditProductOwnerModal.
 *
 * Features:
 * - Accessible HeadlessUI Dialog with ARIA labels
 * - Backdrop overlay with fade transition
 * - Modal panel with scale and fade animation
 * - Responsive max-width (max-w-4xl)
 * - Overflow handling for long content
 *
 * @module components/BaseModal
 */

import React, { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * BaseModal Props Interface
 *
 * @property isOpen - Whether modal is visible
 * @property onClose - Callback when modal should close
 * @property title - Modal title text (h3 heading)
 * @property description - Optional subtitle/description text
 * @property children - Modal body content
 * @property titleId - Optional custom ID for title (for aria-labelledby)
 * @property descriptionId - Optional custom ID for description (for aria-describedby)
 */
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  titleId?: string;
  descriptionId?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Transition duration constants for modal animations
 * Consistent with HeadlessUI best practices
 */
const TRANSITION_DURATION = {
  ENTER: 'ease-out duration-300',
  LEAVE: 'ease-in duration-200',
} as const;

// ============================================================================
// Component
// ============================================================================

/**
 * BaseModal Component
 *
 * Reusable modal wrapper with HeadlessUI Dialog.
 * Provides consistent modal behavior across the application.
 *
 * @param props - Component props
 * @returns JSX element with modal dialog
 */
const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  titleId = 'modal-title',
  descriptionId = 'modal-description',
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel
                className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
              >
                {/* Close button for accessibility */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="absolute top-4 right-4 h-11 min-w-[44px] text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                >
                  <span className="sr-only">Close modal</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Dialog Title - HeadlessUI automatically sets aria-labelledby */}
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-2"
                  id={titleId}
                >
                  {title}
                </Dialog.Title>

                {/* Optional Description */}
                {description && (
                  <Dialog.Description
                    className="text-sm text-gray-500 mb-6"
                    id={descriptionId}
                  >
                    {description}
                  </Dialog.Description>
                )}

                {/* Modal body content */}
                <div className="mt-4">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BaseModal;
