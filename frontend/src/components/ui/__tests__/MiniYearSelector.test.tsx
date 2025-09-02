import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MiniYearSelector from '../MiniYearSelector';

describe('MiniYearSelector', () => {
  const mockOnYearChange = jest.fn();
  
  const defaultProps = {
    currentYear: 2024,
    availableYears: [2022, 2023, 2024, 2025, 2026],
    onYearChange: mockOnYearChange,
    isVisible: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders year and navigation buttons correctly', () => {
      render(<MiniYearSelector {...defaultProps} />);
      
      expect(screen.getByText('2024')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous year/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next year/i })).toBeInTheDocument();
    });

    test('does not render when isVisible is false', () => {
      render(<MiniYearSelector {...defaultProps} isVisible={false} />);
      
      expect(screen.queryByText('2024')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /previous year/i })).not.toBeInTheDocument();
    });

    test('does not render when only one year is available', () => {
      render(<MiniYearSelector {...defaultProps} availableYears={[2024]} />);
      
      expect(screen.queryByText('2024')).not.toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(<MiniYearSelector {...defaultProps} className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    test('applies position classes correctly', () => {
      const { container: leftContainer } = render(<MiniYearSelector {...defaultProps} position="left" />);
      expect(leftContainer.firstChild).toHaveClass('justify-start');

      const { container: centerContainer } = render(<MiniYearSelector {...defaultProps} position="center" />);
      expect(centerContainer.firstChild).toHaveClass('justify-center');

      const { container: rightContainer } = render(<MiniYearSelector {...defaultProps} position="right" />);
      expect(rightContainer.firstChild).toHaveClass('justify-end');
    });
  });

  describe('Navigation Functionality', () => {
    test('calls onYearChange when clicking next year button', () => {
      render(<MiniYearSelector {...defaultProps} />);
      
      const nextButton = screen.getByRole('button', { name: /next year/i });
      fireEvent.click(nextButton);
      
      expect(mockOnYearChange).toHaveBeenCalledWith(2025);
      expect(mockOnYearChange).toHaveBeenCalledTimes(1);
    });

    test('calls onYearChange when clicking previous year button', () => {
      render(<MiniYearSelector {...defaultProps} />);
      
      const prevButton = screen.getByRole('button', { name: /previous year/i });
      fireEvent.click(prevButton);
      
      expect(mockOnYearChange).toHaveBeenCalledWith(2023);
      expect(mockOnYearChange).toHaveBeenCalledTimes(1);
    });

    test('disables previous button when at first year', () => {
      render(<MiniYearSelector {...defaultProps} currentYear={2022} />);
      
      const prevButton = screen.getByRole('button', { name: /previous year/i });
      expect(prevButton).toBeDisabled();
      
      fireEvent.click(prevButton);
      expect(mockOnYearChange).not.toHaveBeenCalled();
    });

    test('disables next button when at last year', () => {
      render(<MiniYearSelector {...defaultProps} currentYear={2026} />);
      
      const nextButton = screen.getByRole('button', { name: /next year/i });
      expect(nextButton).toBeDisabled();
      
      fireEvent.click(nextButton);
      expect(mockOnYearChange).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    test('handles Enter key on previous button', () => {
      render(<MiniYearSelector {...defaultProps} />);
      
      const prevButton = screen.getByRole('button', { name: /previous year/i });
      fireEvent.keyDown(prevButton, { key: 'Enter' });
      
      expect(mockOnYearChange).toHaveBeenCalledWith(2023);
    });

    test('handles Space key on next button', () => {
      render(<MiniYearSelector {...defaultProps} />);
      
      const nextButton = screen.getByRole('button', { name: /next year/i });
      fireEvent.keyDown(nextButton, { key: ' ' });
      
      expect(mockOnYearChange).toHaveBeenCalledWith(2025);
    });

    test('ignores other keys', () => {
      render(<MiniYearSelector {...defaultProps} />);
      
      const nextButton = screen.getByRole('button', { name: /next year/i });
      fireEvent.keyDown(nextButton, { key: 'Tab' });
      fireEvent.keyDown(nextButton, { key: 'Escape' });
      
      expect(mockOnYearChange).not.toHaveBeenCalled();
    });

    test('prevents default behavior for Enter and Space keys', () => {
      render(<MiniYearSelector {...defaultProps} />);
      
      const nextButton = screen.getByRole('button', { name: /next year/i });
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      
      const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault');
      fireEvent.keyDown(nextButton, enterEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();

      const preventDefaultSpaceSpy = jest.spyOn(spaceEvent, 'preventDefault');
      fireEvent.keyDown(nextButton, spaceEvent);
      expect(preventDefaultSpaceSpy).toHaveBeenCalled();
    });

    test('does not trigger action when button is disabled', () => {
      render(<MiniYearSelector {...defaultProps} currentYear={2022} />);
      
      const prevButton = screen.getByRole('button', { name: /previous year/i });
      fireEvent.keyDown(prevButton, { key: 'Enter' });
      
      expect(mockOnYearChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(<MiniYearSelector {...defaultProps} />);
      
      const group = screen.getByRole('group', { name: /year selector/i });
      expect(group).toBeInTheDocument();
      
      const prevButton = screen.getByRole('button', { name: /previous year/i });
      expect(prevButton).toHaveAttribute('aria-label', 'Previous year');
      
      const nextButton = screen.getByRole('button', { name: /next year/i });
      expect(nextButton).toHaveAttribute('aria-label', 'Next year');
      
      const yearDisplay = screen.getByText('2024');
      expect(yearDisplay).toHaveAttribute('aria-label', 'Current year: 2024');
    });

    test('has proper title attributes for tooltips', () => {
      render(<MiniYearSelector {...defaultProps} />);
      
      const prevButton = screen.getByRole('button', { name: /previous year/i });
      expect(prevButton).toHaveAttribute('title', 'Go to 2023');
      
      const nextButton = screen.getByRole('button', { name: /next year/i });
      expect(nextButton).toHaveAttribute('title', 'Go to 2025');
      
      const yearDisplay = screen.getByText('2024');
      expect(yearDisplay).toHaveAttribute('title', 'Current year: 2024');
    });

    test('shows appropriate title when buttons are disabled', () => {
      render(<MiniYearSelector {...defaultProps} currentYear={2022} />);
      
      const prevButton = screen.getByRole('button', { name: /previous year/i });
      expect(prevButton).toHaveAttribute('title', 'No previous year available');
    });

    test('has focus styles for keyboard navigation', () => {
      render(<MiniYearSelector {...defaultProps} />);
      
      const nextButton = screen.getByRole('button', { name: /next year/i });
      expect(nextButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty availableYears array', () => {
      render(<MiniYearSelector {...defaultProps} availableYears={[]} />);
      
      expect(screen.queryByText('2024')).not.toBeInTheDocument();
    });

    test('handles currentYear not in availableYears', () => {
      render(<MiniYearSelector {...defaultProps} currentYear={2030} availableYears={[2022, 2023, 2024]} />);
      
      // Component should render but buttons should be disabled
      expect(screen.getByText('2030')).toBeInTheDocument();
      
      const prevButton = screen.getByRole('button', { name: /previous year/i });
      const nextButton = screen.getByRole('button', { name: /next year/i });
      
      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    test('handles single year in middle of availableYears', () => {
      render(<MiniYearSelector {...defaultProps} currentYear={2024} availableYears={[2024]} />);
      
      // Should not render when only one year available
      expect(screen.queryByText('2024')).not.toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    test('applies hover and disabled styles correctly', () => {
      render(<MiniYearSelector {...defaultProps} currentYear={2022} />);
      
      const nextButton = screen.getByRole('button', { name: /next year/i });
      const prevButton = screen.getByRole('button', { name: /previous year/i });
      
      // Next button should have hover styles
      expect(nextButton).toHaveClass('hover:text-blue-700', 'hover:bg-blue-50');
      
      // Previous button should be disabled
      expect(prevButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
      expect(prevButton).toBeDisabled();
    });
  });
});