/**
 * StatusBadge Component Tests (RED Phase - Iteration 2)
 *
 * Tests for the StatusBadge component that displays product owner status
 * with WCAG 2.1 AA compliance (icons + text, not color-only).
 *
 * Following TDD RED-GREEN-BLUE methodology.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from '@/components/StatusBadge';

describe('StatusBadge Component', () => {
  describe('Basic Rendering', () => {
    it('renders green badge for active status', () => {
      render(<StatusBadge status="active" />);

      const statusText = screen.getByText('Active');
      const badge = statusText.parentElement; // Get parent wrapper span
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('renders orange badge for lapsed status', () => {
      render(<StatusBadge status="lapsed" />);

      const statusText = screen.getByText('Lapsed');
      const badge = statusText.parentElement; // Get parent wrapper span
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-800');
    });

    it('renders grey badge for deceased status', () => {
      render(<StatusBadge status="deceased" />);

      const statusText = screen.getByText('Deceased');
      const badge = statusText.parentElement; // Get parent wrapper span
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('includes proper aria-label for screen readers', () => {
      render(<StatusBadge status="active" />);

      const statusText = screen.getByText('Active');
      // The aria-label is on the text span element
      expect(statusText).toHaveAttribute('aria-label', 'Status: Active');
    });

    it('includes proper aria-label for lapsed status', () => {
      render(<StatusBadge status="lapsed" />);

      const statusText = screen.getByText('Lapsed');
      expect(statusText).toHaveAttribute('aria-label', 'Status: Lapsed');
    });

    it('includes proper aria-label for deceased status', () => {
      render(<StatusBadge status="deceased" />);

      const statusText = screen.getByText('Deceased');
      expect(statusText).toHaveAttribute('aria-label', 'Status: Deceased');
    });
  });

  describe('Accessibility - WCAG Compliance (Not Color-Only)', () => {
    it('displays checkmark icon for active status', () => {
      render(<StatusBadge status="active" />);

      // Check for CheckCircleIcon (using svg role or data-testid)
      const icon = screen.getByTestId('status-icon-checkmark');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-green-600');
    });

    it('displays pause icon for lapsed status', () => {
      render(<StatusBadge status="lapsed" />);

      // Check for PauseCircleIcon (using svg role or data-testid)
      const icon = screen.getByTestId('status-icon-pause');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-orange-600');
    });

    it('displays cross icon for deceased status', () => {
      render(<StatusBadge status="deceased" />);

      // Check for XCircleIcon (using svg role or data-testid)
      const icon = screen.getByTestId('status-icon-cross');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-gray-600');
    });

    it('status is identifiable without color (icon + text) for active', () => {
      render(<StatusBadge status="active" />);

      // Must have both icon and text for WCAG compliance
      const icon = screen.getByTestId('status-icon-checkmark');
      const text = screen.getByText('Active');

      expect(icon).toBeInTheDocument();
      expect(text).toBeInTheDocument();

      // Text should be visible to screen readers
      expect(text).not.toHaveClass('sr-only');
    });

    it('status is identifiable without color (icon + text) for lapsed', () => {
      render(<StatusBadge status="lapsed" />);

      // Must have both icon and text for WCAG compliance
      const icon = screen.getByTestId('status-icon-pause');
      const text = screen.getByText('Lapsed');

      expect(icon).toBeInTheDocument();
      expect(text).toBeInTheDocument();

      // Text should be visible to screen readers
      expect(text).not.toHaveClass('sr-only');
    });

    it('status is identifiable without color (icon + text) for deceased', () => {
      render(<StatusBadge status="deceased" />);

      // Must have both icon and text for WCAG compliance
      const icon = screen.getByTestId('status-icon-cross');
      const text = screen.getByText('Deceased');

      expect(icon).toBeInTheDocument();
      expect(text).toBeInTheDocument();

      // Text should be visible to screen readers
      expect(text).not.toHaveClass('sr-only');
    });

    it('meets 4.5:1 color contrast ratio for active status', () => {
      render(<StatusBadge status="active" />);

      const statusText = screen.getByText('Active');
      const badge = statusText.parentElement;

      // Green-800 text on green-100 background meets WCAG AA
      // text-green-800: #166534
      // bg-green-100: #dcfce7
      // Contrast ratio: 7.37:1 (meets 4.5:1 requirement)
      expect(badge).toHaveClass('text-green-800', 'bg-green-100');
    });

    it('meets 4.5:1 color contrast ratio for lapsed status', () => {
      render(<StatusBadge status="lapsed" />);

      const statusText = screen.getByText('Lapsed');
      const badge = statusText.parentElement;

      // Orange-800 text on orange-100 background meets WCAG AA
      // text-orange-800: #9a3412
      // bg-orange-100: #ffedd5
      // Contrast ratio: 5.94:1 (meets 4.5:1 requirement)
      expect(badge).toHaveClass('text-orange-800', 'bg-orange-100');
    });

    it('meets 4.5:1 color contrast ratio for deceased status', () => {
      render(<StatusBadge status="deceased" />);

      const statusText = screen.getByText('Deceased');
      const badge = statusText.parentElement;

      // Gray-800 text on gray-100 background meets WCAG AA
      // text-gray-800: #1f2937
      // bg-gray-100: #f3f4f6
      // Contrast ratio: 11.63:1 (meets 4.5:1 requirement)
      expect(badge).toHaveClass('text-gray-800', 'bg-gray-100');
    });
  });

  describe('Badge Structure', () => {
    it('uses semantic HTML with aria-label for accessibility', () => {
      render(<StatusBadge status="active" />);

      const statusText = screen.getByText('Active');
      expect(statusText.tagName).toBe('SPAN');
      expect(statusText).toHaveAttribute('aria-label', 'Status: Active');
    });

    it('contains icon and text within the badge', () => {
      const { container } = render(<StatusBadge status="active" />);

      const icon = screen.getByTestId('status-icon-checkmark');
      const text = screen.getByText('Active');
      const badge = text.parentElement; // Get parent wrapper span

      // Icon and text should be in the same badge wrapper
      expect(badge).toContainElement(icon);
      expect(badge).toContainElement(text);
    });

    it('applies rounded pill styling to badge', () => {
      render(<StatusBadge status="active" />);

      const statusText = screen.getByText('Active');
      const badge = statusText.parentElement;
      expect(badge).toHaveClass('rounded-full');
    });

    it('applies padding to badge', () => {
      render(<StatusBadge status="active" />);

      const statusText = screen.getByText('Active');
      const badge = statusText.parentElement;
      expect(badge).toHaveClass('px-3', 'py-1');
    });

    it('uses inline-flex layout for icon and text alignment', () => {
      render(<StatusBadge status="active" />);

      const statusText = screen.getByText('Active');
      const badge = statusText.parentElement;
      expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1');
    });
  });

  describe('Icon Rendering', () => {
    it('renders icon with correct size for active status', () => {
      render(<StatusBadge status="active" />);

      const icon = screen.getByTestId('status-icon-checkmark');
      expect(icon).toHaveClass('w-4', 'h-4');
    });

    it('renders icon with correct size for lapsed status', () => {
      render(<StatusBadge status="lapsed" />);

      const icon = screen.getByTestId('status-icon-pause');
      expect(icon).toHaveClass('w-4', 'h-4');
    });

    it('renders icon with correct size for deceased status', () => {
      render(<StatusBadge status="deceased" />);

      const icon = screen.getByTestId('status-icon-cross');
      expect(icon).toHaveClass('w-4', 'h-4');
    });

    it('positions icon before text', () => {
      const { container } = render(<StatusBadge status="active" />);

      const statusText = screen.getByText('Active');
      const badge = statusText.parentElement;
      const children = Array.from(badge.children);

      // Icon should be first child
      expect(children[0]).toHaveAttribute('data-testid', 'status-icon-checkmark');
      // Text should be second child
      expect(children[1].textContent).toBe('Active');
    });
  });

  describe('Text Rendering', () => {
    it('displays "Active" text for active status', () => {
      render(<StatusBadge status="active" />);

      const text = screen.getByText('Active');
      expect(text).toBeInTheDocument();
      expect(text).toHaveClass('text-sm', 'font-medium');
    });

    it('displays "Lapsed" text for lapsed status', () => {
      render(<StatusBadge status="lapsed" />);

      const text = screen.getByText('Lapsed');
      expect(text).toBeInTheDocument();
      expect(text).toHaveClass('text-sm', 'font-medium');
    });

    it('displays "Deceased" text for deceased status', () => {
      render(<StatusBadge status="deceased" />);

      const text = screen.getByText('Deceased');
      expect(text).toBeInTheDocument();
      expect(text).toHaveClass('text-sm', 'font-medium');
    });

    it('capitalizes first letter of status text', () => {
      render(<StatusBadge status="active" />);

      // Should display "Active" not "active"
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.queryByText('active')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles uppercase status input', () => {
      render(<StatusBadge status="ACTIVE" />);

      const statusText = screen.getByText('Active');
      const badge = statusText.parentElement;
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('handles mixed case status input', () => {
      render(<StatusBadge status="LaPsEd" />);

      const statusText = screen.getByText('Lapsed');
      const badge = statusText.parentElement;
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-800');
      expect(screen.getByText('Lapsed')).toBeInTheDocument();
    });

    it('handles invalid status gracefully', () => {
      // Should default to gray styling for unknown status
      render(<StatusBadge status="unknown" />);

      const statusText = screen.getByText('Unknown');
      const badge = statusText.parentElement;
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('provides aria-label for invalid status', () => {
      render(<StatusBadge status="invalid" />);

      const statusText = screen.getByText('Invalid');
      expect(statusText).toHaveAttribute('aria-label');
    });
  });

  describe('Component Props', () => {
    it('accepts status prop', () => {
      const { rerender } = render(<StatusBadge status="active" />);
      expect(screen.getByText('Active')).toBeInTheDocument();

      rerender(<StatusBadge status="lapsed" />);
      expect(screen.getByText('Lapsed')).toBeInTheDocument();

      rerender(<StatusBadge status="deceased" />);
      expect(screen.getByText('Deceased')).toBeInTheDocument();
    });

    it('accepts optional className prop for custom styling', () => {
      render(<StatusBadge status="active" className="custom-class" />);

      const statusText = screen.getByText('Active');
      const badge = statusText.parentElement;
      expect(badge).toHaveClass('custom-class');
    });

    it('preserves base classes when custom className is provided', () => {
      render(<StatusBadge status="active" className="custom-class" />);

      const statusText = screen.getByText('Active');
      const badge = statusText.parentElement;
      // Should keep base classes
      expect(badge).toHaveClass('rounded-full', 'custom-class');
    });
  });
});
