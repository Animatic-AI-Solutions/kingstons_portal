/**
 * DeleteConfirmationModal Component Tests for Special Relationships (Cycle 4 - RED Phase)
 *
 * Tests for the confirmation modal component that handles special relationship deletion.
 * Uses HeadlessUI Dialog for accessibility-focused modal implementation.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 * These tests WILL FAIL because the component doesn't exist yet.
 *
 * @component DeleteConfirmationModal (Special Relationships variant)
 * @requirements
 * - Render modal dialog with confirmation message
 * - Show relationship name in confirmation text
 * - Display warning about soft deletion (can be restored)
 * - Show Delete and Cancel buttons
 * - Handle user interactions (confirm, cancel, backdrop click, Escape key)
 * - Display loading state during deletion
 * - Implement proper accessibility (ARIA labels, focus trap, focus restoration)
 * - Accessibility testing with jest-axe
 * - Handle edge cases (missing name, rapid open/close)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import DeleteConfirmationModal from '@/components/phase2/people/DeleteConfirmationModal';
import { SpecialRelationship } from '@/types/specialRelationship';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Factory functions for test data
const createInactiveRelationship = (
  overrides?: Partial<SpecialRelationship>
): SpecialRelationship => ({
  id: 1,
  name: 'Jane Smith',
  type: 'Personal',
  relationship: 'Spouse',
  status: 'Inactive',
  date_of_birth: '1960-05-15',
  dependency: false,
  email: 'jane.smith@example.com',
  phone_number: '+44-7700-900001',
  address_id: 1,
  notes: null,
  firm_name: null,
  product_owner_ids: [1, 2],
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  ...overrides,
});

const createDeceasedRelationship = (
  overrides?: Partial<SpecialRelationship>
): SpecialRelationship => ({
  ...createInactiveRelationship(),
  id: 'rel-2',
  status: 'Deceased',
  ...overrides,
});

describe('DeleteConfirmationModal Component (Special Relationships)', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =================================================================
  // Modal Rendering Tests
  // =================================================================

  describe('Modal Rendering', () => {
    it('renders modal when isOpen prop is true', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render modal when isOpen prop is false', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={false}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows relationship full name in confirmation message', () => {
      const relationship = createInactiveRelationship({
        name: 'Jane Doe',
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    });

    it('shows relationship type in confirmation message', () => {
      const relationship = createInactiveRelationship({
        relationship: 'Spouse',
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/spouse/i)).toBeInTheDocument();
    });

    it('displays warning about soft deletion', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Should mention soft delete and ability to restore
      expect(
        screen.getByText(/soft delete|can be restored|undo/i)
      ).toBeInTheDocument();
    });

    it('shows Delete button', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();
    });

    it('shows Cancel button', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
    });

    it('shows modal title', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByRole('heading', { name: /delete.*relationship/i })
      ).toBeInTheDocument();
    });
  });

  // =================================================================
  // User Interaction Tests
  // =================================================================

  describe('User Interactions', () => {
    it('calls onConfirm when Delete button clicked', async () => {
      const user = userEvent.setup();
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
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
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
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

    it('calls onCancel when Escape key pressed', async () => {
      const user = userEvent.setup();
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onCancel when backdrop clicked', async () => {
      const user = userEvent.setup();
      const relationship = createInactiveRelationship();

      const { container } = render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Find backdrop (the parent of the dialog)
      const dialog = screen.getByRole('dialog');
      const backdrop = dialog.parentElement;

      if (backdrop && backdrop !== container) {
        await user.click(backdrop);

        await waitFor(() => {
          expect(mockOnCancel).toHaveBeenCalled();
        });
      }
    });
  });

  // =================================================================
  // Loading State Tests
  // =================================================================

  describe('Loading States', () => {
    it('disables buttons during loading state', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const deleteButton = screen.getByRole('button', {
        name: /delete|deleting/i,
      });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(deleteButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('shows loading text on Delete button when loading', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByText(/deleting/i)).toBeInTheDocument();
    });

    it('prevents multiple delete attempts when loading', async () => {
      const user = userEvent.setup();
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const deleteButton = screen.getByRole('button', {
        name: /delete|deleting/i,
      });

      // Button is disabled, so click should not trigger callback
      expect(deleteButton).toBeDisabled();
      await user.click(deleteButton);

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  // =================================================================
  // Accessibility Tests with jest-axe
  // =================================================================

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const relationship = createInactiveRelationship();

      const { container } = render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations during loading', async () => {
      const relationship = createInactiveRelationship();

      const { container } = render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA label or labelledby for dialog', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(
        dialog.hasAttribute('aria-labelledby') ||
          dialog.hasAttribute('aria-label')
      ).toBe(true);
    });

    it('has proper ARIA description for dialog content', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.hasAttribute('aria-describedby')).toBe(true);
    });

    it('has aria-modal="true" on dialog', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('Delete button has destructive styling (red)', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      const buttonClasses = deleteButton.className;

      expect(
        buttonClasses.includes('red') ||
          buttonClasses.includes('danger') ||
          buttonClasses.includes('destructive')
      ).toBe(true);
    });

    it('Cancel button has secondary/outline styling', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const buttonClasses = cancelButton.className;

      expect(
        buttonClasses.includes('secondary') ||
          buttonClasses.includes('outline') ||
          buttonClasses.includes('ghost') ||
          buttonClasses.includes('border')
      ).toBe(true);
    });

    it('buttons have type="button" attribute', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(deleteButton).toHaveAttribute('type', 'button');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });

    it('has visible focus indicators on buttons', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      const buttonClasses = deleteButton.className;

      expect(
        buttonClasses.includes('focus:ring') ||
          buttonClasses.includes('focus:outline')
      ).toBe(true);
    });
  });

  // =================================================================
  // Focus Management Tests
  // =================================================================

  describe('Focus Management', () => {
    it('traps focus within modal when open', async () => {
      const user = userEvent.setup();
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Tab through elements - focus should cycle within modal
      await user.tab();
      expect([deleteButton, cancelButton]).toContain(document.activeElement);

      await user.tab();
      expect([deleteButton, cancelButton]).toContain(document.activeElement);

      // Tab again should wrap back
      await user.tab();
      expect([deleteButton, cancelButton]).toContain(document.activeElement);
    });

    it('focuses Cancel button by default when modal opens', () => {
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Cancel button should receive initial focus (safer default)
      expect(document.activeElement).toBe(cancelButton);
    });

    it('restores focus to trigger element on close', async () => {
      const user = userEvent.setup();
      const relationship = createInactiveRelationship();

      const { rerender } = render(
        <div>
          <button>Open Delete Modal</button>
          <DeleteConfirmationModal
            isOpen={false}
            relationship={relationship}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        </div>
      );

      const triggerButton = screen.getByRole('button', {
        name: /open delete modal/i,
      });
      triggerButton.focus();

      // Open modal
      rerender(
        <div>
          <button>Open Delete Modal</button>
          <DeleteConfirmationModal
            isOpen={true}
            relationship={relationship}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        </div>
      );

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      rerender(
        <div>
          <button>Open Delete Modal</button>
          <DeleteConfirmationModal
            isOpen={false}
            relationship={relationship}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        </div>
      );

      // Focus should return to trigger button
      await waitFor(() => {
        expect(document.activeElement).toBe(triggerButton);
      });
    });
  });

  // =================================================================
  // Edge Case Tests
  // =================================================================

  describe('Edge Cases', () => {
    it('handles missing relationship name gracefully', () => {
      const relationship = createInactiveRelationship({
        name: '',
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Modal should still render with fallback text
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();
    });

    it('handles very long relationship names', () => {
      const longName = 'A'.repeat(100);
      const relationship = createInactiveRelationship({
        name: `${longName} ${longName}`,
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Modal should render without breaking layout
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(new RegExp(longName))).toBeInTheDocument();
    });

    it('handles rapid open/close cycles', () => {
      const relationship = createInactiveRelationship();

      const { rerender } = render(
        <DeleteConfirmationModal
          isOpen={false}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Rapidly open and close 5 times
      for (let i = 0; i < 5; i++) {
        rerender(
          <DeleteConfirmationModal
            isOpen={true}
            relationship={relationship}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );

        rerender(
          <DeleteConfirmationModal
            isOpen={false}
            relationship={relationship}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );
      }

      // No errors should occur
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('works with deceased relationships', () => {
      const deceasedRelationship = createDeceasedRelationship({
        name: 'Robert Brown',
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={deceasedRelationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Robert Brown/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();
    });

    it('works with professional relationships', () => {
      const professionalRelationship = createInactiveRelationship({
        type: 'Professional',
        relationship: 'Solicitor',
        firm_name: 'Smith & Associates',
      });

      render(
        <DeleteConfirmationModal
          isOpen={true}
          relationship={professionalRelationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/solicitor/i)).toBeInTheDocument();
    });

    it('does not call callbacks when modal is closed', async () => {
      const user = userEvent.setup();
      const relationship = createInactiveRelationship();

      render(
        <DeleteConfirmationModal
          isOpen={false}
          relationship={relationship}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Try to press Escape (should do nothing since modal is closed)
      await user.keyboard('{Escape}');

      expect(mockOnCancel).not.toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });
});
