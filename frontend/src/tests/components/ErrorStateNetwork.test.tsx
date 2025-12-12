/**
 * ErrorStateNetwork Component Tests (Cycle 6)
 *
 * Tests network error state component:
 * - Rendering error message and icon
 * - Retry button functionality
 * - Accessibility compliance (role="alert")
 * - ARIA live region with assertive announcement
 *
 * @see empty_states_specification.md for error state patterns
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ErrorStateNetwork from '@/components/ErrorStateNetwork';

expect.extend(toHaveNoViolations);

describe('ErrorStateNetwork', () => {
  const defaultProps = {
    onRetry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders error heading', () => {
      render(<ErrorStateNetwork {...defaultProps} />);

      expect(screen.getByText('Unable to load relationships')).toBeInTheDocument();
    });

    test('renders descriptive error message', () => {
      render(<ErrorStateNetwork {...defaultProps} />);

      expect(
        screen.getByText(/Check your internet connection/)
      ).toBeInTheDocument();
    });

    test('renders error icon', () => {
      const { container } = render(<ErrorStateNetwork {...defaultProps} />);

      // WifiOff icon from lucide-react
      const icon = container.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    test('renders Try Again button', () => {
      render(<ErrorStateNetwork {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /Try Again/i })
      ).toBeInTheDocument();
    });

    test('error icon has red color', () => {
      const { container } = render(<ErrorStateNetwork {...defaultProps} />);

      const iconWrapper = container.querySelector('.text-red-400');
      expect(iconWrapper).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    test('calls onRetry when Try Again button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = jest.fn();

      render(<ErrorStateNetwork onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /Try Again/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    test('Try Again button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const onRetry = jest.fn();

      render(<ErrorStateNetwork onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /Try Again/i });
      retryButton.focus();
      await user.keyboard('{Enter}');

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    test('allows multiple retry attempts', async () => {
      const user = userEvent.setup();
      const onRetry = jest.fn();

      render(<ErrorStateNetwork onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /Try Again/i });

      await user.click(retryButton);
      await user.click(retryButton);
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(<ErrorStateNetwork {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has role="alert" for immediate error announcement', () => {
      const { container } = render(<ErrorStateNetwork {...defaultProps} />);

      expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
    });

    test('has aria-live="assertive" for priority announcement', () => {
      const { container } = render(<ErrorStateNetwork {...defaultProps} />);

      expect(
        container.querySelector('[aria-live="assertive"]')
      ).toBeInTheDocument();
    });

    test('icon has aria-hidden="true"', () => {
      const { container } = render(<ErrorStateNetwork {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    test('Try Again button has clear accessible label', () => {
      render(<ErrorStateNetwork {...defaultProps} />);

      const retryButton = screen.getByRole('button', { name: /Try Again/i });
      expect(retryButton).toHaveAccessibleName();
    });
  });

  describe('Visual Styling', () => {
    test('applies centered layout classes', () => {
      const { container } = render(<ErrorStateNetwork {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass(
        'flex',
        'flex-col',
        'items-center',
        'justify-center'
      );
    });

    test('applies text-center class for centered text', () => {
      const { container } = render(<ErrorStateNetwork {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('text-center');
    });

    test('heading has appropriate font weight and size', () => {
      render(<ErrorStateNetwork {...defaultProps} />);

      const heading = screen.getByText('Unable to load relationships');
      expect(heading.tagName).toBe('H3');
      expect(heading).toHaveClass('text-lg', 'font-medium');
    });

    test('description has smaller, gray text', () => {
      render(<ErrorStateNetwork {...defaultProps} />);

      const description = screen.getByText(/Check your internet connection/);
      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-sm', 'text-gray-600');
    });

    test('Try Again button has primary variant styling', () => {
      render(<ErrorStateNetwork {...defaultProps} />);

      const retryButton = screen.getByRole('button', { name: /Try Again/i });
      // Should have primary button styling (blue background, white text)
      expect(retryButton).toHaveClass('bg-blue-600');
    });
  });

  describe('User Experience', () => {
    test('provides actionable guidance', () => {
      render(<ErrorStateNetwork {...defaultProps} />);

      // Message should guide user on what to do
      const message = screen.getByText(/Check your internet connection/);
      expect(message).toBeInTheDocument();
    });

    test('focuses on network-specific issue', () => {
      render(<ErrorStateNetwork {...defaultProps} />);

      // Should specifically mention network/connection issue
      expect(
        screen.getByText(/internet connection/)
      ).toBeInTheDocument();
    });
  });
});
