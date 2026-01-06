/**
 * ModalShell Component Tests (Cycle 7 - RED Phase)
 *
 * Comprehensive test suite for the accessible modal shell component with focus trap.
 * Tests accessibility patterns, focus management, keyboard interactions, and edge cases.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @component ModalShell
 * @requirements
 * - Render modal dialog with accessible structure
 * - Implement focus trap to prevent Tab from leaving modal
 * - Restore focus to trigger element on close
 * - Handle Escape key to close modal
 * - Handle backdrop click to close modal
 * - Prevent body scroll when modal is open
 * - Display modal title with proper ARIA associations
 * - Show close button with accessible label
 * - Support different modal sizes (sm, md, lg, xl)
 * - Handle edge cases (rapid open/close, missing title, no children)
 */

import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ModalShell from '@/components/ui/modals/ModalShell';

expect.extend(toHaveNoViolations);

describe('ModalShell Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  // =================================================================
  // Modal Rendering Tests
  // =================================================================

  describe('Modal Rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </ModalShell>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      render(
        <ModalShell isOpen={false} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </ModalShell>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('renders modal with title', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Add Personal Relationship">
          <p>Form fields</p>
        </ModalShell>
      );

      expect(screen.getByRole('heading', { name: /add personal relationship/i })).toBeInTheDocument();
    });

    it('renders modal with children content', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>
            <input type="text" placeholder="Name" />
            <button>Submit</button>
          </div>
        </ModalShell>
      );

      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Content</p>
        </ModalShell>
      );

      expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
    });
  });

  // =================================================================
  // Modal Size Tests
  // =================================================================

  describe('Modal Size', () => {
    it('renders with small size', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Small Modal" size="sm">
          <p>Content</p>
        </ModalShell>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('max-w-md');
    });

    it('renders with medium size by default', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Medium Modal">
          <p>Content</p>
        </ModalShell>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('max-w-lg');
    });

    it('renders with large size', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Large Modal" size="lg">
          <p>Content</p>
        </ModalShell>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('max-w-2xl');
    });

    it('renders with extra-large size', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="XL Modal" size="xl">
          <p>Content</p>
        </ModalShell>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('max-w-4xl');
    });
  });

  // =================================================================
  // Focus Management Tests
  // =================================================================

  describe('Focus Management', () => {
    it('traps focus within modal when open', async () => {
      const user = userEvent.setup();

      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Focus Trap Test">
          <div>
            <button>First Button</button>
            <button>Second Button</button>
          </div>
        </ModalShell>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      const firstButton = screen.getByRole('button', { name: /first button/i });
      const secondButton = screen.getByRole('button', { name: /second button/i });

      // Tab through elements - focus should cycle within modal
      await user.tab();
      expect([closeButton, firstButton, secondButton]).toContain(document.activeElement);

      await user.tab();
      expect([closeButton, firstButton, secondButton]).toContain(document.activeElement);

      await user.tab();
      expect([closeButton, firstButton, secondButton]).toContain(document.activeElement);

      // Tab again should wrap back to first focusable element
      await user.tab();
      expect([closeButton, firstButton, secondButton]).toContain(document.activeElement);
    });

    it('restores focus to trigger element on close', async () => {
      const user = userEvent.setup();

      function TestComponent() {
        const [isOpen, setIsOpen] = useState(false);

        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            <ModalShell isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test Modal">
              <button onClick={() => setIsOpen(false)}>Close from inside</button>
            </ModalShell>
          </div>
        );
      }

      render(<TestComponent />);

      const openButton = screen.getByRole('button', { name: /open modal/i });

      // Focus and click open button
      openButton.focus();
      await user.click(openButton);

      // Modal should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close from inside/i });
      await user.click(closeButton);

      // Focus should return to open button
      await waitFor(() => {
        expect(document.activeElement).toBe(openButton);
      });
    });

    it('focuses first interactive element on open', async () => {
      function TestComponent() {
        const [isOpen, setIsOpen] = useState(false);

        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open</button>
            <ModalShell isOpen={isOpen} onClose={() => setIsOpen(false)} title="Focus Test">
              <input type="text" placeholder="First input" />
              <button>Submit</button>
            </ModalShell>
          </div>
        );
      }

      const user = userEvent.setup();
      render(<TestComponent />);

      await user.click(screen.getByRole('button', { name: /open/i }));

      // First focusable element should receive focus
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close modal/i });
        const firstInput = screen.getByPlaceholderText('First input');
        expect([closeButton, firstInput]).toContain(document.activeElement);
      });
    });
  });

  // =================================================================
  // Keyboard Interaction Tests
  // =================================================================

  describe('Keyboard Interactions', () => {
    it('closes modal when Escape key is pressed', async () => {
      const user = userEvent.setup();

      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Escape Test">
          <p>Press Escape to close</p>
        </ModalShell>
      );

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('does not close modal on Escape if prevented', async () => {
      const user = userEvent.setup();

      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Escape Prevented">
          <input
            type="text"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
              }
            }}
          />
        </ModalShell>
      );

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{Escape}');

      // onClose should not be called because event was stopped
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('allows Tab navigation within modal', async () => {
      const user = userEvent.setup();

      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Tab Navigation">
          <div>
            <input type="text" placeholder="Name" />
            <input type="email" placeholder="Email" />
            <button>Submit</button>
          </div>
        </ModalShell>
      );

      const nameInput = screen.getByPlaceholderText('Name');
      const emailInput = screen.getByPlaceholderText('Email');
      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Tab through elements
      await user.tab();
      expect([nameInput, emailInput, submitButton]).toContain(document.activeElement);

      await user.tab();
      expect([nameInput, emailInput, submitButton]).toContain(document.activeElement);
    });

    it('allows Shift+Tab reverse navigation', async () => {
      const user = userEvent.setup();

      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Reverse Tab">
          <div>
            <button>First</button>
            <button>Second</button>
            <button>Third</button>
          </div>
        </ModalShell>
      );

      // Focus last button
      const thirdButton = screen.getByRole('button', { name: /third/i });
      thirdButton.focus();

      // Shift+Tab should move backwards
      await user.keyboard('{Shift>}{Tab}{/Shift}');

      const secondButton = screen.getByRole('button', { name: /second/i });
      expect(document.activeElement).toBe(secondButton);
    });
  });

  // =================================================================
  // Mouse Interaction Tests
  // =================================================================

  describe('Mouse Interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Close Button Test">
          <p>Content</p>
        </ModalShell>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Backdrop Test">
          <p>Content</p>
        </ModalShell>
      );

      // Find backdrop (parent of dialog)
      const dialog = screen.getByRole('dialog');
      const backdrop = dialog.parentElement?.parentElement;

      if (backdrop) {
        await user.click(backdrop);

        await waitFor(() => {
          expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
      }
    });

    it('does not close when clicking inside modal content', async () => {
      const user = userEvent.setup();

      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Content Click Test">
          <div>
            <p>Click me</p>
            <button>Action</button>
          </div>
        </ModalShell>
      );

      const content = screen.getByText('Click me');
      await user.click(content);

      const actionButton = screen.getByRole('button', { name: /action/i });
      await user.click(actionButton);

      // onClose should not be called
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // =================================================================
  // Body Scroll Prevention Tests
  // =================================================================

  describe('Body Scroll Prevention', () => {
    it('prevents body scroll when modal is open', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Scroll Test">
          <p>Content</p>
        </ModalShell>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal closes', () => {
      const { rerender } = render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Scroll Restore">
          <p>Content</p>
        </ModalShell>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <ModalShell isOpen={false} onClose={mockOnClose} title="Scroll Restore">
          <p>Content</p>
        </ModalShell>
      );

      expect(document.body.style.overflow).toBe('');
    });

    it('restores body scroll on unmount', () => {
      const { unmount } = render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Unmount Test">
          <p>Content</p>
        </ModalShell>
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  // =================================================================
  // Accessibility Tests
  // =================================================================

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="ARIA Test">
          <p>Content</p>
        </ModalShell>
      );

      const dialog = screen.getByRole('dialog');

      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('associates title with dialog via aria-labelledby', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Title Association">
          <p>Content</p>
        </ModalShell>
      );

      const dialog = screen.getByRole('dialog');
      const titleId = dialog.getAttribute('aria-labelledby');

      expect(titleId).toBe('modal-title');

      const title = document.getElementById(titleId!);
      expect(title).toHaveTextContent('Title Association');
    });

    it('has accessible close button', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Close Button">
          <p>Content</p>
        </ModalShell>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toHaveAccessibleName();
    });

    it('has no accessibility violations', async () => {
      const { container } = render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Accessibility Test">
          <div>
            <label htmlFor="test-input">Name</label>
            <input id="test-input" type="text" />
            <button>Submit</button>
          </div>
        </ModalShell>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('backdrop is hidden from screen readers', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Backdrop Hidden">
          <p>Content</p>
        </ModalShell>
      );

      const dialog = screen.getByRole('dialog');
      const backdrop = dialog.parentElement?.previousSibling as HTMLElement;

      if (backdrop) {
        expect(backdrop).toHaveAttribute('aria-hidden', 'true');
      }
    });
  });

  // =================================================================
  // Edge Case Tests
  // =================================================================

  describe('Edge Cases', () => {
    it('handles rapid open/close cycles', () => {
      const { rerender } = render(
        <ModalShell isOpen={false} onClose={mockOnClose} title="Rapid Cycles">
          <p>Content</p>
        </ModalShell>
      );

      for (let i = 0; i < 10; i++) {
        rerender(
          <ModalShell isOpen={true} onClose={mockOnClose} title="Rapid Cycles">
            <p>Content</p>
          </ModalShell>
        );

        rerender(
          <ModalShell isOpen={false} onClose={mockOnClose} title="Rapid Cycles">
            <p>Content</p>
          </ModalShell>
        );
      }

      // Should not error
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');
    });

    it('handles empty children', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Empty Children">
          {null}
        </ModalShell>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Empty Children')).toBeInTheDocument();
    });

    it('handles long titles', () => {
      const longTitle = 'A'.repeat(200);

      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title={longTitle}>
          <p>Content</p>
        </ModalShell>
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles complex nested content', () => {
      render(
        <ModalShell isOpen={true} onClose={mockOnClose} title="Complex Content">
          <div>
            <section>
              <h2>Section 1</h2>
              <input type="text" />
            </section>
            <section>
              <h2>Section 2</h2>
              <select>
                <option>Option 1</option>
              </select>
            </section>
            <section>
              <h2>Section 3</h2>
              <button>Action</button>
            </section>
          </div>
        </ModalShell>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
      expect(screen.getByText('Section 3')).toBeInTheDocument();
    });

    it('handles missing onClose gracefully', async () => {
      const user = userEvent.setup();

      render(
        <ModalShell isOpen={true} onClose={undefined as any} title="No Close Handler">
          <p>Content</p>
        </ModalShell>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });

      // Should not error when clicked
      await user.click(closeButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
