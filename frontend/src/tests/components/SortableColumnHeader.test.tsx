/**
 * Tests for SortableColumnHeader component
 *
 * RED Phase (Iteration 3): All tests should FAIL until implementation is complete
 *
 * SortableColumnHeader provides:
 * - Visual sort indicators (arrows)
 * - Click cycling through sort states (asc → desc → none)
 * - ARIA attributes for accessibility
 * - Callback to parent with sort configuration
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SortableColumnHeader from '@/components/ui/tables/SortableColumnHeader';

/**
 * Sort Configuration Interface
 * Matches the interface expected by parent components
 */
interface SortConfig {
  column: 'name' | 'relationship' | 'age' | 'dob' | 'email' | 'status';
  direction: 'asc' | 'desc';
}

describe('SortableColumnHeader', () => {
  // ========================================
  // VISUAL INDICATORS
  // ========================================
  describe('Visual Indicators', () => {
    it('displays sort arrow when sorted ascending', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'name', direction: 'asc' };

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      // Should show ascending arrow (↑ or similar)
      const header = screen.getByRole('button', { name: /name/i });
      expect(header).toHaveTextContent(/↑|▲|⬆/); // Various arrow representations
    });

    it('displays sort arrow when sorted descending', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'name', direction: 'desc' };

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      // Should show descending arrow (↓ or similar)
      const header = screen.getByRole('button', { name: /name/i });
      expect(header).toHaveTextContent(/↓|▼|⬇/); // Various arrow representations
    });

    it('hides sort arrow when not sorted', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig | null = null;

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      // Should not show any arrow
      const header = screen.getByRole('button', { name: /name/i });
      expect(header).not.toHaveTextContent(/↑|↓|▲|▼|⬆|⬇/);
    });

    it('hides sort arrow when different column is sorted', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'age', direction: 'asc' }; // Different column

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      // Should not show arrow since a different column is sorted
      const header = screen.getByRole('button', { name: /name/i });
      expect(header).not.toHaveTextContent(/↑|↓|▲|▼|⬆|⬇/);
    });
  });

  // ========================================
  // ARIA ATTRIBUTES
  // ========================================
  describe('ARIA Attributes', () => {
    it('applies aria-sort="ascending" when sorted ascending', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'name', direction: 'asc' };

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      // aria-sort should be on the <th> element (columnheader role), not the button
      const columnHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(columnHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('applies aria-sort="descending" when sorted descending', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'name', direction: 'desc' };

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      // aria-sort should be on the <th> element (columnheader role), not the button
      const columnHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(columnHeader).toHaveAttribute('aria-sort', 'descending');
    });

    it('applies aria-sort="none" when not sorted', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig | null = null;

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      // aria-sort should be on the <th> element (columnheader role), not the button
      const columnHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(columnHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('applies aria-sort="none" when different column is sorted', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'age', direction: 'asc' };

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      // aria-sort should be on the <th> element (columnheader role), not the button
      const columnHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(columnHeader).toHaveAttribute('aria-sort', 'none');
    });
  });

  // ========================================
  // CLICK CYCLING BEHAVIOR
  // ========================================
  describe('Click Cycling', () => {
    it('cycles through asc → desc → none on clicks', () => {
      const mockOnSort = jest.fn();
      let currentSort: SortConfig | null = null;

      const { rerender } = render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /name/i });

      // First click: should call with 'asc'
      fireEvent.click(header);
      expect(mockOnSort).toHaveBeenCalledWith('name', 'asc');

      // Simulate parent updating state to 'asc'
      currentSort = { column: 'name', direction: 'asc' };
      rerender(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      // Second click: should call with 'desc'
      fireEvent.click(header);
      expect(mockOnSort).toHaveBeenCalledWith('name', 'desc');

      // Simulate parent updating state to 'desc'
      currentSort = { column: 'name', direction: 'desc' };
      rerender(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      // Third click: should call with null (clear sort)
      fireEvent.click(header);
      expect(mockOnSort).toHaveBeenCalledWith('name', null);
    });

    it('first click sets ascending', () => {
      const mockOnSort = jest.fn();

      render(
        <SortableColumnHeader
          label="Age"
          column="age"
          currentSort={null}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /age/i });
      fireEvent.click(header);

      expect(mockOnSort).toHaveBeenCalledWith('age', 'asc');
      expect(mockOnSort).toHaveBeenCalledTimes(1);
    });

    it('second click sets descending', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'age', direction: 'asc' };

      render(
        <SortableColumnHeader
          label="Age"
          column="age"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /age/i });
      fireEvent.click(header);

      expect(mockOnSort).toHaveBeenCalledWith('age', 'desc');
    });

    it('third click returns to default (none)', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'age', direction: 'desc' };

      render(
        <SortableColumnHeader
          label="Age"
          column="age"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /age/i });
      fireEvent.click(header);

      expect(mockOnSort).toHaveBeenCalledWith('age', null);
    });

    it('clicking different column resets to ascending', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'name', direction: 'desc' }; // Name is sorted desc

      render(
        <SortableColumnHeader
          label="Age"
          column="age"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /age/i });
      fireEvent.click(header);

      // Should start at 'asc' since this column wasn't previously sorted
      expect(mockOnSort).toHaveBeenCalledWith('age', 'asc');
    });
  });

  // ========================================
  // CALLBACK BEHAVIOR
  // ========================================
  describe('Callback Behavior', () => {
    it('calls onSort callback with correct parameters on first click', () => {
      const mockOnSort = jest.fn();

      render(
        <SortableColumnHeader
          label="Email"
          column="email"
          currentSort={null}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /email/i });
      fireEvent.click(header);

      expect(mockOnSort).toHaveBeenCalledWith('email', 'asc');
      expect(mockOnSort).toHaveBeenCalledTimes(1);
    });

    it('calls onSort callback with column and "asc" direction', () => {
      const mockOnSort = jest.fn();

      render(
        <SortableColumnHeader
          label="Status"
          column="status"
          currentSort={null}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /status/i });
      fireEvent.click(header);

      expect(mockOnSort).toHaveBeenCalledWith('status', 'asc');
    });

    it('calls onSort callback with column and "desc" direction', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'status', direction: 'asc' };

      render(
        <SortableColumnHeader
          label="Status"
          column="status"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /status/i });
      fireEvent.click(header);

      expect(mockOnSort).toHaveBeenCalledWith('status', 'desc');
    });

    it('calls onSort callback with null on third click', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'status', direction: 'desc' };

      render(
        <SortableColumnHeader
          label="Status"
          column="status"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /status/i });
      fireEvent.click(header);

      expect(mockOnSort).toHaveBeenCalledWith('status', null);
    });

    it('does not call onSort multiple times for single click', () => {
      const mockOnSort = jest.fn();

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={null}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /name/i });
      fireEvent.click(header);

      expect(mockOnSort).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================
  // VISUAL STYLING
  // ========================================
  describe('Visual Styling', () => {
    it('shows visual indicator for current sort column', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'name', direction: 'asc' };

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /name/i });

      // Should have some visual distinction (class, style, or content)
      // Testing for presence of arrow or specific class
      expect(header).toHaveTextContent(/↑|▲|⬆/);
    });

    it('removes visual indicator from previously sorted column', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'age', direction: 'asc' }; // Different column sorted

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={currentSort}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /name/i });

      // Should NOT have arrow since different column is sorted
      expect(header).not.toHaveTextContent(/↑|↓|▲|▼|⬆|⬇/);
    });

    it('applies hover styles on interactive headers', () => {
      const mockOnSort = jest.fn();

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={null}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /name/i });

      // Should be a button element (interactive)
      expect(header.tagName).toBe('BUTTON');

      // Should have cursor pointer or similar interactive styling
      // This is a visual check - component should have appropriate CSS classes
      expect(header).toBeInTheDocument();
    });

    it('has distinct styling for sorted vs unsorted columns', () => {
      const mockOnSort = jest.fn();

      const { container: sortedContainer } = render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={{ column: 'name', direction: 'asc' }}
          onSort={mockOnSort}
        />
      );

      const { container: unsortedContainer } = render(
        <SortableColumnHeader
          label="Age"
          column="age"
          currentSort={{ column: 'name', direction: 'asc' }}
          onSort={mockOnSort}
        />
      );

      const sortedHeader = sortedContainer.querySelector('button');
      const unsortedHeader = unsortedContainer.querySelector('button');

      // Visual distinction should exist (classes, content, or attributes differ)
      expect(sortedHeader?.className).not.toBe(unsortedHeader?.className);
    });
  });

  // ========================================
  // ACCESSIBILITY
  // ========================================
  describe('Accessibility', () => {
    it('renders as a button for keyboard navigation', () => {
      const mockOnSort = jest.fn();

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={null}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /name/i });
      expect(header).toBeInTheDocument();
    });

    it('supports keyboard activation with Enter key', () => {
      const mockOnSort = jest.fn();

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={null}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /name/i });
      fireEvent.keyDown(header, { key: 'Enter', code: 'Enter' });

      expect(mockOnSort).toHaveBeenCalled();
    });

    it('supports keyboard activation with Space key', () => {
      const mockOnSort = jest.fn();

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={null}
          onSort={mockOnSort}
        />
      );

      const header = screen.getByRole('button', { name: /name/i });
      fireEvent.keyDown(header, { key: ' ', code: 'Space' });

      expect(mockOnSort).toHaveBeenCalled();
    });

    it('has descriptive accessible label', () => {
      const mockOnSort = jest.fn();

      render(
        <SortableColumnHeader
          label="Name"
          column="name"
          currentSort={null}
          onSort={mockOnSort}
        />
      );

      // Should find button by accessible name
      const header = screen.getByRole('button', { name: /name/i });
      expect(header).toBeInTheDocument();
    });
  });

  // ========================================
  // MULTIPLE COLUMNS INTEGRATION
  // ========================================
  describe('Multiple Columns Integration', () => {
    it('only one column shows sorted state at a time', () => {
      const mockOnSort = jest.fn();
      const currentSort: SortConfig = { column: 'name', direction: 'asc' };

      const { container } = render(
        <table>
          <thead>
            <tr>
              <SortableColumnHeader
                label="Name"
                column="name"
                currentSort={currentSort}
                onSort={mockOnSort}
              />
              <SortableColumnHeader
                label="Age"
                column="age"
                currentSort={currentSort}
                onSort={mockOnSort}
              />
              <SortableColumnHeader
                label="Email"
                column="email"
                currentSort={currentSort}
                onSort={mockOnSort}
              />
            </tr>
          </thead>
        </table>
      );

      const headers = container.querySelectorAll('button');

      // Only "Name" column should have arrow
      const nameHeader = headers[0];
      const ageHeader = headers[1];
      const emailHeader = headers[2];

      expect(nameHeader.textContent).toMatch(/↑|▲|⬆/);
      expect(ageHeader.textContent).not.toMatch(/↑|↓|▲|▼|⬆|⬇/);
      expect(emailHeader.textContent).not.toMatch(/↑|↓|▲|▼|⬆|⬇/);
    });

    it('clicking new column clears previous column sort indicator', () => {
      const mockOnSort = jest.fn();
      let currentSort: SortConfig | null = { column: 'name', direction: 'asc' };

      const { rerender } = render(
        <table>
          <thead>
            <tr>
              <SortableColumnHeader
                label="Name"
                column="name"
                currentSort={currentSort}
                onSort={mockOnSort}
              />
              <SortableColumnHeader
                label="Age"
                column="age"
                currentSort={currentSort}
                onSort={mockOnSort}
              />
            </tr>
          </thead>
        </table>
      );

      // Click Age column
      const ageHeader = screen.getByRole('button', { name: /age/i });
      fireEvent.click(ageHeader);

      expect(mockOnSort).toHaveBeenCalledWith('age', 'asc');

      // Simulate parent updating state
      currentSort = { column: 'age', direction: 'asc' };
      rerender(
        <table>
          <thead>
            <tr>
              <SortableColumnHeader
                label="Name"
                column="name"
                currentSort={currentSort}
                onSort={mockOnSort}
              />
              <SortableColumnHeader
                label="Age"
                column="age"
                currentSort={currentSort}
                onSort={mockOnSort}
              />
            </tr>
          </thead>
        </table>
      );

      // Name should no longer show arrow, Age should show arrow
      const nameHeader = screen.getByRole('button', { name: /name/i });
      const ageHeaderAfter = screen.getByRole('button', { name: /age/i });

      expect(nameHeader).not.toHaveTextContent(/↑|↓|▲|▼|⬆|⬇/);
      expect(ageHeaderAfter).toHaveTextContent(/↑|▲|⬆/);
    });
  });
});
