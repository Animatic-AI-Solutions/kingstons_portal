/**
 * EmptyStatePersonal Component Tests (Cycle 6)
 *
 * Tests empty state for personal relationships tab:
 * - Rendering empty state message
 * - Call-to-action button
 * - Accessibility compliance
 * - ARIA live region announcements
 *
 * @see empty_states_specification.md for empty state patterns
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import EmptyStatePersonal from '@/components/EmptyStatePersonal';

expect.extend(toHaveNoViolations);

describe('EmptyStatePersonal', () => {
  const defaultProps = {
    onAddClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders empty state heading', () => {
      render(<EmptyStatePersonal {...defaultProps} />);

      expect(screen.getByText('No personal relationships yet')).toBeInTheDocument();
    });

    test('renders descriptive message', () => {
      render(<EmptyStatePersonal {...defaultProps} />);

      expect(
        screen.getByText(/Add family members and dependents/)
      ).toBeInTheDocument();
    });

    test('renders icon', () => {
      const { container } = render(<EmptyStatePersonal {...defaultProps} />);

      // Icon should be present (Users icon from lucide-react)
      const icon = container.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    test('renders Add Personal Relationship button', () => {
      render(<EmptyStatePersonal {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /Add Personal Relationship/i })
      ).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    test('calls onAddClick when Add button is clicked', async () => {
      const user = userEvent.setup();
      const onAddClick = jest.fn();

      render(<EmptyStatePersonal onAddClick={onAddClick} />);

      const addButton = screen.getByRole('button', {
        name: /Add Personal Relationship/i,
      });
      await user.click(addButton);

      expect(onAddClick).toHaveBeenCalledTimes(1);
    });

    test('Add button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const onAddClick = jest.fn();

      render(<EmptyStatePersonal onAddClick={onAddClick} />);

      const addButton = screen.getByRole('button', {
        name: /Add Personal Relationship/i,
      });

      addButton.focus();
      await user.keyboard('{Enter}');

      expect(onAddClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(<EmptyStatePersonal {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has role="status" for screen reader announcement', () => {
      const { container } = render(<EmptyStatePersonal {...defaultProps} />);

      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    });

    test('has aria-live="polite" for non-intrusive announcement', () => {
      const { container } = render(<EmptyStatePersonal {...defaultProps} />);

      expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
    });

    test('icon has aria-hidden="true"', () => {
      const { container } = render(<EmptyStatePersonal {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    test('Add button has clear accessible label', () => {
      render(<EmptyStatePersonal {...defaultProps} />);

      const addButton = screen.getByRole('button', {
        name: /Add Personal Relationship/i,
      });
      expect(addButton).toHaveAccessibleName();
    });
  });

  describe('Visual Styling', () => {
    test('applies centered layout classes', () => {
      const { container } = render(<EmptyStatePersonal {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    test('applies text-center class for centered text', () => {
      const { container } = render(<EmptyStatePersonal {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('text-center');
    });

    test('heading has appropriate font weight and size', () => {
      render(<EmptyStatePersonal {...defaultProps} />);

      const heading = screen.getByText('No personal relationships yet');
      expect(heading.tagName).toBe('H3');
      expect(heading).toHaveClass('text-lg', 'font-medium');
    });

    test('description has smaller, gray text', () => {
      render(<EmptyStatePersonal {...defaultProps} />);

      const description = screen.getByText(/Add family members and dependents/);
      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-sm', 'text-gray-600');
    });
  });
});
