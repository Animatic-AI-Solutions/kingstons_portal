/**
 * DeleteConfirmationModal Component Tests (RED Phase - Iteration 5)
 *
 * Tests for the confirmation modal component that handles product owner deletion.
 * Uses HeadlessUI Dialog for accessibility-focused modal implementation.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @component DeleteConfirmationModal
 * @requirements
 * - Render modal dialog with confirmation message
 * - Show product owner name in confirmation text
 * - Display warning about permanent deletion
 * - Show Delete and Cancel buttons
 * - Handle user interactions (confirm, cancel, backdrop click, Escape key)
 * - Display loading state during deletion
 * - Implement proper accessibility (ARIA labels, focus trap)
 * - Handle edge cases (missing name, rapid open/close)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createLapsedProductOwner, createDeceasedProductOwner } from '../factories/productOwnerFactory';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

describe('DeleteConfirmationModal Component', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =================================================================
  // Modal Rendering Tests
  // =================================================================

  describe('Modal Rendering', () => {
    it('renders modal when open prop is true', () => {
      const lapsedProductOwner = createLapsedProductOwner({
        firstname: 'John',
        surname: 'Smith',
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Modal should be visible in the document
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render modal when open prop is false', () => {
      const lapsedProductOwner = createLapsedProductOwner({
        firstname: 'John',
        surname: 'Smith',
      });

      render(
        <DeleteConfirmationModal
          isOpen={false}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Modal should not be visible in the document
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows product owner name in confirmation message', () => {
      const lapsedProductOwner = createLapsedProductOwner({
        firstname: 'Jane',
        surname: 'Doe',
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Confirmation message should include product owner name
      expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    });

    it('displays warning text about permanent deletion', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Warning text should be present
      expect(screen.getByText(/permanent/i)).toBeInTheDocument();
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    it('shows Delete button', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Delete button should be visible
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('shows Cancel button', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Cancel button should be visible
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  // =================================================================
  // User Interaction Tests
  // =================================================================

  describe('User Interactions', () => {
    it('calls onConfirm when Delete button clicked', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner({ id: 123 });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onCancel when Cancel button clicked', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner({ id: 456 });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onCancel when backdrop clicked', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Click on backdrop (outside modal content)
      const dialog = screen.getByRole('dialog');
      const backdrop = dialog.parentElement;

      if (backdrop) {
        await user.click(backdrop);

        await waitFor(() => {
          expect(mockOnCancel).toHaveBeenCalledTimes(1);
        });
      }
    });

    it('calls onCancel when Escape key pressed', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Press Escape key
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
      });
    });

    it('disables buttons during loading state', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      // Both buttons should be disabled during loading
      const deleteButton = screen.getByRole('button', { name: /delete|deleting/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(deleteButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('shows loading spinner on Delete button when loading', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      // Loading text or spinner should be visible
      expect(screen.getByText(/deleting/i)).toBeInTheDocument();
    });
  });

  // =================================================================
  // Accessibility Tests
  // =================================================================

  describe('Accessibility', () => {
    it('has proper ARIA label for dialog', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dialog = screen.getByRole('dialog');

      // Dialog should have aria-labelledby or aria-label
      expect(
        dialog.hasAttribute('aria-labelledby') || dialog.hasAttribute('aria-label')
      ).toBe(true);
    });

    it('has proper ARIA description for dialog content', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dialog = screen.getByRole('dialog');

      // Dialog should have aria-describedby
      expect(dialog.hasAttribute('aria-describedby')).toBe(true);
    });

    it('traps focus within modal when open', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const dialogTitle = screen.getByRole('heading', { name: /delete product owner/i });

      // HeadlessUI auto-focuses first focusable element (dialog title with tabIndex={0})
      // Tab through elements - focus should cycle within modal
      await user.tab();
      expect(document.activeElement).toBe(cancelButton);

      await user.tab();
      expect(document.activeElement).toBe(deleteButton);

      // Tab again should wrap back to first focusable element
      await user.tab();
      expect([cancelButton, deleteButton, dialogTitle]).toContain(document.activeElement);
    });

    it('returns focus to trigger element on close', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner();

      // Create a button to trigger the modal
      const { rerender } = render(
        <div>
          <button>Open Modal</button>
          <DeleteConfirmationModal
            isOpen={false}
            productOwner={lapsedProductOwner}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        </div>
      );

      const triggerButton = screen.getByRole('button', { name: /open modal/i });
      triggerButton.focus();

      // Open modal
      rerender(
        <div>
          <button>Open Modal</button>
          <DeleteConfirmationModal
            isOpen={true}
            productOwner={lapsedProductOwner}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        </div>
      );

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Rerender with modal closed
      rerender(
        <div>
          <button>Open Modal</button>
          <DeleteConfirmationModal
            isOpen={false}
            productOwner={lapsedProductOwner}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        </div>
      );

      // Focus should return to trigger button (HeadlessUI handles this automatically)
      // Note: In test environment, focus behavior may vary
      await waitFor(() => {
        expect(document.activeElement).toBe(triggerButton);
      });
    });

    it('Delete button has destructive styling (red)', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });

      // Delete button should have destructive styling (red colors)
      const buttonClasses = deleteButton.className;
      expect(
        buttonClasses.includes('red') ||
        buttonClasses.includes('danger') ||
        buttonClasses.includes('destructive')
      ).toBe(true);
    });

    it('Cancel button has secondary styling', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Cancel button should have secondary styling
      const buttonClasses = cancelButton.className;
      expect(
        buttonClasses.includes('secondary') ||
        buttonClasses.includes('outline') ||
        buttonClasses.includes('ghost')
      ).toBe(true);
    });
  });

  // =================================================================
  // Edge Case Tests
  // =================================================================

  describe('Edge Cases', () => {
    it('handles missing product owner name gracefully', () => {
      const lapsedProductOwner = createLapsedProductOwner({
        firstname: null as any,
        surname: null as any,
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Modal should still render with fallback text
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('prevents multiple simultaneous delete attempts', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner({ id: 123 });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete|deleting/i });

      // Button should be disabled, preventing clicks
      expect(deleteButton).toBeDisabled();

      // Attempt to click disabled button
      await user.click(deleteButton);

      // onConfirm should not be called
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('handles rapid open/close cycles', async () => {
      const lapsedProductOwner = createLapsedProductOwner();

      const { rerender } = render(
        <DeleteConfirmationModal
          isOpen={false}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Rapidly open and close modal multiple times
      for (let i = 0; i < 5; i++) {
        // Open
        rerender(
          <DeleteConfirmationModal
            isOpen={true}
            productOwner={lapsedProductOwner}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );

        // Close
        rerender(
          <DeleteConfirmationModal
            isOpen={false}
            productOwner={lapsedProductOwner}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );
      }

      // No errors should occur
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('works with deceased product owners', () => {
      const deceasedProductOwner = createDeceasedProductOwner({
        firstname: 'Robert',
        surname: 'Brown',
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={deceasedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Modal should render correctly for deceased product owners
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Robert Brown/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('handles very long product owner names', () => {
      const longName = 'A'.repeat(100);
      const lapsedProductOwner = createLapsedProductOwner({
        firstname: longName,
        surname: longName,
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          productOwner={lapsedProductOwner}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Modal should render without breaking layout
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(new RegExp(longName))).toBeInTheDocument();
    });
  });
});
