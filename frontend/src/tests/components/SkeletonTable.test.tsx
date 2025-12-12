/**
 * SkeletonTable Component Tests (Cycle 6)
 *
 * Tests loading skeleton for table components:
 * - Rendering skeleton rows
 * - Configurable row count
 * - Accessibility announcements
 * - Animation classes
 *
 * @see empty_states_specification.md for loading state patterns
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import SkeletonTable from '@/components/SkeletonTable';

expect.extend(toHaveNoViolations);

describe('SkeletonTable', () => {
  describe('Rendering', () => {
    test('renders table with skeleton rows', () => {
      render(<SkeletonTable />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    test('renders default 4 skeleton rows', () => {
      render(<SkeletonTable />);

      const rows = screen.getAllByRole('row');
      // 4 data rows + 1 header row = 5 total
      expect(rows).toHaveLength(5);
    });

    test('renders custom number of skeleton rows', () => {
      render(<SkeletonTable rowCount={7} />);

      const rows = screen.getAllByRole('row');
      // 7 data rows + 1 header row = 8 total
      expect(rows).toHaveLength(8);
    });

    test('renders table headers', () => {
      render(<SkeletonTable />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Relationship')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    test('renders skeleton cells with gray background', () => {
      const { container } = render(<SkeletonTable />);

      const skeletonCell = container.querySelector('.bg-gray-200');
      expect(skeletonCell).toBeInTheDocument();
    });

    test('skeleton cells have rounded corners', () => {
      const { container } = render(<SkeletonTable />);

      const skeletonCell = container.querySelector('.rounded');
      expect(skeletonCell).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    test('skeleton rows have animate-pulse class', () => {
      const { container } = render(<SkeletonTable />);

      const animatedRow = container.querySelector('.animate-pulse');
      expect(animatedRow).toBeInTheDocument();
    });

    test('all skeleton rows are animated', () => {
      const { container } = render(<SkeletonTable rowCount={3} />);

      const animatedRows = container.querySelectorAll('.animate-pulse');
      // Should have 3 animated rows
      expect(animatedRows.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(<SkeletonTable />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has role="status" for loading announcement', () => {
      const { container } = render(<SkeletonTable />);

      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    });

    test('has aria-live="polite" for non-intrusive announcement', () => {
      const { container } = render(<SkeletonTable />);

      expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
    });

    test('has aria-label describing loading state', () => {
      render(<SkeletonTable />);

      expect(screen.getByLabelText('Loading relationships')).toBeInTheDocument();
    });

    test('has screen reader only text announcement', () => {
      const { container } = render(<SkeletonTable />);

      const srOnlyText = container.querySelector('.sr-only');
      expect(srOnlyText).toBeInTheDocument();
      expect(srOnlyText).toHaveTextContent('Loading relationships');
    });
  });

  describe('Skeleton Cell Widths', () => {
    test('skeleton cells have varied widths for realistic appearance', () => {
      const { container } = render(<SkeletonTable />);

      const cells = container.querySelectorAll('.bg-gray-200');

      // Check that different cells have different widths
      const widths = Array.from(cells).map(
        (cell) => (cell as HTMLElement).className
      );

      // Should have variety like w-32, w-24, w-20, w-28, w-16
      const hasVariety = new Set(widths).size > 1;
      expect(hasVariety).toBe(true);
    });

    test('skeleton cells have appropriate heights', () => {
      const { container } = render(<SkeletonTable />);

      const cell = container.querySelector('.bg-gray-200');
      expect(cell).toHaveClass('h-4');
    });
  });

  describe('Props', () => {
    test('accepts rowCount prop', () => {
      render(<SkeletonTable rowCount={10} />);

      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(11); // 10 data + 1 header
    });

    test('handles zero rowCount gracefully', () => {
      render(<SkeletonTable rowCount={0} />);

      const rows = screen.getAllByRole('row');
      // Should still have header row
      expect(rows).toHaveLength(1);
    });

    test('handles single row', () => {
      render(<SkeletonTable rowCount={1} />);

      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(2); // 1 data + 1 header
    });
  });

  describe('Visual Consistency', () => {
    test('matches table structure of actual data tables', () => {
      render(<SkeletonTable />);

      // Should have same basic structure as real tables
      const table = screen.getByRole('table');
      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');

      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
    });

    test('skeleton cells use consistent padding', () => {
      const { container } = render(<SkeletonTable />);

      const cells = container.querySelectorAll('td');
      cells.forEach((cell) => {
        expect(cell).toHaveClass('px-4', 'py-3');
      });
    });
  });
});
