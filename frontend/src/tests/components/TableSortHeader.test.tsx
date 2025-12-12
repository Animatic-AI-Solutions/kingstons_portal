/**
 * TableSortHeader Component Tests (Cycle 6)
 *
 * Tests sortable table header functionality including:
 * - Rendering with sort indicators
 * - Click handling for sorting
 * - Keyboard navigation (Enter/Space)
 * - ARIA attributes (aria-sort, aria-label)
 * - Accessibility compliance
 *
 * @see accessibility_implementation_guide.md for ARIA patterns
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import TableSortHeader from '@/components/TableSortHeader';

expect.extend(toHaveNoViolations);

describe('TableSortHeader', () => {
  const defaultProps = {
    label: 'Name',
    column: 'name',
    sortConfig: { column: 'name', direction: 'asc' as const },
    onSort: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders header label', () => {
      render(<TableSortHeader {...defaultProps} />);
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    test('renders as table header cell with scope="col"', () => {
      render(<TableSortHeader {...defaultProps} />);
      const header = screen.getByRole('columnheader');
      expect(header).toBeInTheDocument();
      expect(header).toHaveAttribute('scope', 'col');
    });

    test('renders sort button inside header', () => {
      render(<TableSortHeader {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('applies custom className to header', () => {
      render(<TableSortHeader {...defaultProps} className="custom-class" />);
      const header = screen.getByRole('columnheader');
      expect(header).toHaveClass('custom-class');
    });
  });

  describe('Sort Indicators', () => {
    test('shows ascending indicator when sorted ascending', () => {
      render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'name', direction: 'asc' }}
        />
      );
      // Visual indicator should be present (↑)
      expect(screen.getByText('Name').parentElement).toHaveTextContent('↑');
    });

    test('shows descending indicator when sorted descending', () => {
      render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'name', direction: 'desc' }}
        />
      );
      // Visual indicator should be present (↓)
      expect(screen.getByText('Name').parentElement).toHaveTextContent('↓');
    });

    test('shows no indicator when not sorted', () => {
      render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'email', direction: 'asc' }}
        />
      );
      const button = screen.getByRole('button');
      expect(button).not.toHaveTextContent('↑');
      expect(button).not.toHaveTextContent('↓');
    });

    test('sort indicator has aria-hidden="true"', () => {
      const { container } = render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'name', direction: 'asc' }}
        />
      );
      const indicator = container.querySelector('[aria-hidden="true"]');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Click Handling', () => {
    test('calls onSort with column name when clicked', async () => {
      const user = userEvent.setup();
      const onSort = jest.fn();

      render(<TableSortHeader {...defaultProps} onSort={onSort} />);

      await user.click(screen.getByRole('button'));
      expect(onSort).toHaveBeenCalledWith('name');
      expect(onSort).toHaveBeenCalledTimes(1);
    });

    test('calls onSort when clicking unsorted column', async () => {
      const user = userEvent.setup();
      const onSort = jest.fn();

      render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'email', direction: 'asc' }}
          onSort={onSort}
        />
      );

      await user.click(screen.getByRole('button'));
      expect(onSort).toHaveBeenCalledWith('name');
    });
  });

  describe('Keyboard Navigation', () => {
    test('calls onSort when Enter key pressed', async () => {
      const user = userEvent.setup();
      const onSort = jest.fn();

      render(<TableSortHeader {...defaultProps} onSort={onSort} />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(onSort).toHaveBeenCalledWith('name');
      expect(onSort).toHaveBeenCalledTimes(1);
    });

    test('calls onSort when Space key pressed', async () => {
      const user = userEvent.setup();
      const onSort = jest.fn();

      render(<TableSortHeader {...defaultProps} onSort={onSort} />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');

      expect(onSort).toHaveBeenCalledWith('name');
      expect(onSort).toHaveBeenCalledTimes(1);
    });

    test('is keyboard focusable with tabIndex={0}', () => {
      render(<TableSortHeader {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('ARIA Attributes', () => {
    test('has aria-sort="ascending" when sorted ascending', () => {
      render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'name', direction: 'asc' }}
        />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-sort', 'ascending');
    });

    test('has aria-sort="descending" when sorted descending', () => {
      render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'name', direction: 'desc' }}
        />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-sort', 'descending');
    });

    test('has aria-sort="none" when not sorted', () => {
      render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'email', direction: 'asc' }}
        />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-sort', 'none');
    });

    test('has descriptive aria-label when sorted ascending', () => {
      render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'name', direction: 'asc' }}
        />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('sorted ascending')
      );
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('descending')
      );
    });

    test('has descriptive aria-label when sorted descending', () => {
      render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'name', direction: 'desc' }}
        />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('sorted descending')
      );
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('ascending')
      );
    });

    test('has descriptive aria-label when not sorted', () => {
      render(
        <TableSortHeader
          {...defaultProps}
          sortConfig={{ column: 'email', direction: 'asc' }}
        />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('not sorted')
      );
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Sort by Name')
      );
    });
  });

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <table>
          <thead>
            <tr>
              <TableSortHeader {...defaultProps} />
            </tr>
          </thead>
        </table>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has visible focus indicator', () => {
      render(<TableSortHeader {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
    });
  });
});
