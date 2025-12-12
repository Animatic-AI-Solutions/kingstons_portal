/**
 * EmptyStateProfessional Component Tests (Cycle 6)
 *
 * Tests empty state for professional relationships tab:
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
import EmptyStateProfessional from '@/components/EmptyStateProfessional';

expect.extend(toHaveNoViolations);

describe('EmptyStateProfessional', () => {
  const defaultProps = {
    onAddClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders empty state heading', () => {
      render(<EmptyStateProfessional {...defaultProps} />);

      expect(
        screen.getByText('No professional relationships yet')
      ).toBeInTheDocument();
    });

    test('renders descriptive message', () => {
      render(<EmptyStateProfessional {...defaultProps} />);

      expect(
        screen.getByText(/Add accountants, solicitors/)
      ).toBeInTheDocument();
    });

    test('renders icon', () => {
      const { container } = render(<EmptyStateProfessional {...defaultProps} />);

      // Icon should be present (Briefcase icon from lucide-react)
      const icon = container.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    test('renders Add Professional Relationship button', () => {
      render(<EmptyStateProfessional {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /Add Professional Relationship/i })
      ).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    test('calls onAddClick when Add button is clicked', async () => {
      const user = userEvent.setup();
      const onAddClick = jest.fn();

      render(<EmptyStateProfessional onAddClick={onAddClick} />);

      const addButton = screen.getByRole('button', {
        name: /Add Professional Relationship/i,
      });
      await user.click(addButton);

      expect(onAddClick).toHaveBeenCalledTimes(1);
    });

    test('Add button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const onAddClick = jest.fn();

      render(<EmptyStateProfessional onAddClick={onAddClick} />);

      const addButton = screen.getByRole('button', {
        name: /Add Professional Relationship/i,
      });

      addButton.focus();
      await user.keyboard('{Enter}');

      expect(onAddClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(<EmptyStateProfessional {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has role="status" for screen reader announcement', () => {
      const { container } = render(<EmptyStateProfessional {...defaultProps} />);

      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    });

    test('has aria-live="polite" for non-intrusive announcement', () => {
      const { container } = render(<EmptyStateProfessional {...defaultProps} />);

      expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
    });

    test('icon has aria-hidden="true"', () => {
      const { container } = render(<EmptyStateProfessional {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    test('Add button has clear accessible label', () => {
      render(<EmptyStateProfessional {...defaultProps} />);

      const addButton = screen.getByRole('button', {
        name: /Add Professional Relationship/i,
      });
      expect(addButton).toHaveAccessibleName();
    });
  });

  describe('Visual Styling', () => {
    test('applies centered layout classes', () => {
      const { container } = render(<EmptyStateProfessional {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    test('applies text-center class for centered text', () => {
      const { container } = render(<EmptyStateProfessional {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('text-center');
    });

    test('heading has appropriate font weight and size', () => {
      render(<EmptyStateProfessional {...defaultProps} />);

      const heading = screen.getByText('No professional relationships yet');
      expect(heading.tagName).toBe('H3');
      expect(heading).toHaveClass('text-lg', 'font-medium');
    });

    test('description has smaller, gray text', () => {
      render(<EmptyStateProfessional {...defaultProps} />);

      const description = screen.getByText(/Add accountants, solicitors/);
      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-sm', 'text-gray-600');
    });
  });

  describe('Differences from Personal Empty State', () => {
    test('uses Briefcase icon instead of Users icon', () => {
      const { container: personalContainer } = render(
        <EmptyStateProfessional {...defaultProps} />
      );

      // Briefcase icon should be present (different from Users icon in Personal)
      const icon = personalContainer.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    test('has professional-specific messaging', () => {
      render(<EmptyStateProfessional {...defaultProps} />);

      // Professional message mentions accountants, solicitors
      expect(
        screen.getByText(/accountants, solicitors/)
      ).toBeInTheDocument();

      // Should NOT have personal-specific messaging
      expect(
        screen.queryByText(/family members/)
      ).not.toBeInTheDocument();
    });

    test('button label specifies "Professional Relationship"', () => {
      render(<EmptyStateProfessional {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /Add Professional Relationship/i,
      });
      expect(button).toBeInTheDocument();

      // Should NOT say "Personal Relationship"
      expect(
        screen.queryByRole('button', { name: /Add Personal Relationship/i })
      ).not.toBeInTheDocument();
    });
  });
});
