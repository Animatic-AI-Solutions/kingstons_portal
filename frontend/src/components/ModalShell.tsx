/**
 * ModalShell Component (Cycle 7)
 *
 * A reusable, accessible modal dialog shell component with comprehensive
 * keyboard navigation and focus management.
 *
 * @module ModalShell
 *
 * Accessibility Features (WCAG 2.1 AA compliant):
 * - Focus trap using focus-trap-react library
 * - ESC key closes modal (standard keyboard interaction)
 * - Backdrop click handling (configurable)
 * - Saves and restores focus on open/close (returns to trigger element)
 * - ARIA attributes: aria-modal, aria-labelledby, aria-describedby
 * - Prevents body scroll when modal is open
 * - Focus returns to trigger button when modal closes
 *
 * Features:
 * - Size variants: sm (448px), md (512px), lg (672px), xl (896px)
 * - Optional close button with aria-label
 * - Configurable backdrop click behavior
 * - Custom className support for modal content
 *
 * Usage:
 * ```tsx
 * <ModalShell
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Modal Title"
 *   size="md"
 * >
 *   <YourFormContent />
 * </ModalShell>
 * ```
 */

import React, { useEffect, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Props for ModalShell component
 */
export interface ModalShellProps {
  /** Whether modal is currently open */
  isOpen: boolean;
  /** Callback invoked when modal should close */
  onClose: () => void;
  /** Modal title for header and aria-labelledby */
  title: string;
  /** Optional modal description for aria-describedby */
  description?: string;
  /** Modal content (form, text, etc.) */
  children: React.ReactNode;
  /** Size variant (affects max-width) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show X close button in header */
  showCloseButton?: boolean;
  /** Whether clicking backdrop closes modal */
  closeOnBackdropClick?: boolean;
  /** Additional CSS classes for modal content container */
  className?: string;
}

/**
 * Accessible modal dialog shell component
 *
 * Provides a fully accessible modal with focus management, keyboard navigation,
 * and customizable size and behavior.
 *
 * @param props - Component props
 * @returns Modal dialog or null if not open
 */
const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = '',
}) => {
  // Ref to store the element that had focus before modal opened
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // Ref to the modal container for focus trap fallback
  const modalRef = useRef<HTMLDivElement>(null);

  /**
   * Save and restore focus when modal opens/closes
   * This ensures users return to the element they were interacting with
   */
  useEffect(() => {
    if (isOpen) {
      // Save currently focused element when modal opens
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      // Restore focus when modal closes
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  /**
   * Handle ESC key to close modal (standard keyboard interaction)
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  /**
   * Prevent body scroll when modal is open
   * Restores original overflow style on close
   */
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  /**
   * Handle backdrop (overlay) click
   * Only closes modal if closeOnBackdropClick is true and click was on backdrop
   * @param event - Mouse click event
   */
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  /** Size classes for modal max-width */
  const sizeClasses = {
    sm: 'max-w-md',    // 448px
    md: 'max-w-lg',    // 512px
    lg: 'max-w-2xl',   // 672px
    xl: 'max-w-4xl',   // 896px
  };

  if (!isOpen) {
    return null;
  }

  return (
    <FocusTrap
      active={isOpen}
      focusTrapOptions={{
        allowOutsideClick: (e) => {
          // Allow clicks on backdrop for closing
          return true;
        },
        escapeDeactivates: false, // We handle ESC ourselves
        clickOutsideDeactivates: false, // Don't deactivate on outside click
        fallbackFocus: () => modalRef.current || document.body,
        returnFocusOnDeactivate: true,
        delayInitialFocus: false,
      }}
    >
      <div
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900 bg-opacity-50 py-8"
        data-testid="modal-backdrop"
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby={description ? 'modal-description' : undefined}
          className={`relative w-full ${sizeClasses[size]} mx-4 my-auto bg-white rounded-lg shadow-xl ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                aria-label="Close modal"
                tabIndex={0}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Description (if provided) */}
          {description && (
            <div id="modal-description" className="px-6 py-2 text-sm text-gray-600">
              {description}
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </FocusTrap>
  );
};

export default ModalShell;
