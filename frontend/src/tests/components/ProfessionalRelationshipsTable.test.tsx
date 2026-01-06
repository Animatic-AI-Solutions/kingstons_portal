/**
 * ProfessionalRelationshipsTable Component Tests (Cycle 6)
 *
 * Tests professional relationships table functionality including:
 * - Rendering with professional relationship data
 * - Professional-specific columns (Company, Position)
 * - Sortable columns (Name, Status, Company)
 * - Empty states (no data, loading, error)
 * - Responsive design (tablet 768-1023px)
 * - Row interactions
 * - Accessibility compliance
 *
 * @see empty_states_specification.md for empty state patterns
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ProfessionalRelationshipsTable from '@/components/phase2/special-relationships/ProfessionalRelationshipsTable';
import {
  createMockProfessionalRelationship,
  createMockRelationshipArray,
} from '@/tests/factories/specialRelationshipFactory';

expect.extend(toHaveNoViolations);

describe('ProfessionalRelationshipsTable', () => {
  const mockRelationships = createMockRelationshipArray(3, {
    category: 'professional',
  });

  const defaultProps = {
    relationships: mockRelationships,
    onRowClick: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onStatusChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders table with professional relationships', () => {
      render(<ProfessionalRelationshipsTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Should have header + 3 data rows
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(4);
    });

    test('renders professional-specific columns', () => {
      render(<ProfessionalRelationshipsTable {...defaultProps} />);

      // Professional tables should have Company column
      expect(screen.getByText('Company')).toBeInTheDocument();
    });

    test('does not render personal-specific columns', () => {
      render(<ProfessionalRelationshipsTable {...defaultProps} />);

      // Should NOT have DOB or Age columns
      expect(screen.queryByText('Date of Birth')).not.toBeInTheDocument();
      expect(screen.queryByText('Age')).not.toBeInTheDocument();
    });

    test('renders all expected column headers', () => {
      render(<ProfessionalRelationshipsTable {...defaultProps} />);

      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
      expect(screen.getByText('Relationship')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    test('renders professional relationship data correctly', () => {
      const relationship = createMockProfessionalRelationship({
        name: 'Robert Johnson',
        relationship: 'Financial Advisor',
        firm_name: 'Wealth Management Ltd',
      });

      render(
        <ProfessionalRelationshipsTable
          {...defaultProps}
          relationships={[relationship]}
        />
      );

      expect(screen.getByText('Robert')).toBeInTheDocument();
      expect(screen.getByText('Johnson')).toBeInTheDocument();
      expect(screen.getByText('Financial Advisor')).toBeInTheDocument();
      expect(screen.getByText('Wealth Management Ltd')).toBeInTheDocument();
    });

    test('displays placeholder for missing company name', () => {
      const relationship = createMockProfessionalRelationship({
        firm_name: null,
      });

      render(
        <ProfessionalRelationshipsTable
          {...defaultProps}
          relationships={[relationship]}
        />
      );

      // Should show "-" for null firm name
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('-');
    });
  });

  describe('Sorting', () => {
    test('sorts by first name ascending by default', () => {
      const relationships = [
        createMockProfessionalRelationship({ name: 'Charlie Brown' }),
        createMockProfessionalRelationship({ name: 'Alice Cooper' }),
        createMockProfessionalRelationship({ name: 'Bob Dylan' }),
      ];

      render(
        <ProfessionalRelationshipsTable
          {...defaultProps}
          relationships={relationships}
        />
      );

      const rows = screen.getAllByRole('row');
      // Skip header row
      expect(rows[1]).toHaveTextContent('Alice');
      expect(rows[2]).toHaveTextContent('Bob');
      expect(rows[3]).toHaveTextContent('Charlie');
    });

    test('sorts by company name when header clicked', async () => {
      const user = userEvent.setup();
      const relationships = [
        createMockProfessionalRelationship({ firm_name: 'Zebra Corp' }),
        createMockProfessionalRelationship({ firm_name: 'Alpha Inc' }),
        createMockProfessionalRelationship({ firm_name: 'Beta LLC' }),
      ];

      render(
        <ProfessionalRelationshipsTable
          {...defaultProps}
          relationships={relationships}
        />
      );

      const companyHeader = screen.getByRole('button', { name: /Company/i });
      await user.click(companyHeader);

      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Alpha Inc');
      expect(rows[2]).toHaveTextContent('Beta LLC');
      expect(rows[3]).toHaveTextContent('Zebra Corp');
    });

    test('handles null values in sorting gracefully', async () => {
      const user = userEvent.setup();
      const relationships = [
        createMockProfessionalRelationship({ firm_name: 'Beta Inc' }),
        createMockProfessionalRelationship({ firm_name: null }),
        createMockProfessionalRelationship({ firm_name: 'Alpha Corp' }),
      ];

      render(
        <ProfessionalRelationshipsTable
          {...defaultProps}
          relationships={relationships}
        />
      );

      const companyHeader = screen.getByRole('button', { name: /Company/i });
      await user.click(companyHeader);

      // Null values should be sorted to the end
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Alpha Corp');
      expect(rows[2]).toHaveTextContent('Beta Inc');
      // Row 3 should have null/placeholder
    });

    test('toggles sort direction when clicking same column', async () => {
      const user = userEvent.setup();

      render(<ProfessionalRelationshipsTable {...defaultProps} />);

      const nameButton = screen.getByRole('button', { name: /First Name/i });
      const nameHeader = nameButton.closest('th');

      // First click - ascending
      await user.click(nameButton);
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

      // Second click - descending
      await user.click(nameButton);
      expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    });
  });

  describe('Product Owner Association', () => {
    test('displays product owner count when available', () => {
      const relationship = createMockProfessionalRelationship({
        name: 'John Advisor',
        product_owner_ids: [1, 2, 3, 4, 5],
      });

      render(
        <ProfessionalRelationshipsTable
          {...defaultProps}
          relationships={[relationship]}
        />
      );

      // Should show "5 Products" or similar indicator
      expect(screen.getByText(/5.*Product/i)).toBeInTheDocument();
    });

    test('shows zero product owners gracefully', () => {
      const relationship = createMockProfessionalRelationship({
        product_owner_ids: [],
      });

      render(
        <ProfessionalRelationshipsTable
          {...defaultProps}
          relationships={[relationship]}
        />
      );

      // Should show "0 Products" or "No Products"
      expect(screen.getByText(/0.*Product|No Product/i)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    test('renders empty state when no relationships', () => {
      render(
        <ProfessionalRelationshipsTable {...defaultProps} relationships={[]} />
      );

      expect(
        screen.getByText('No professional relationships yet')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Add accountants, solicitors/)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Add Professional Relationship/i })
      ).toBeInTheDocument();
    });

    test('calls onAdd when Add button clicked in empty state', async () => {
      const user = userEvent.setup();
      const onAdd = jest.fn();

      render(
        <ProfessionalRelationshipsTable
          {...defaultProps}
          relationships={[]}
          onAdd={onAdd}
        />
      );

      const addButton = screen.getByRole('button', {
        name: /Add Professional Relationship/i,
      });
      await user.click(addButton);

      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    test('renders loading state with skeleton', () => {
      render(<ProfessionalRelationshipsTable {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText(/Loading relationships/i)).toBeInTheDocument();
    });

    test('renders error state on server failure', () => {
      render(
        <ProfessionalRelationshipsTable
          {...defaultProps}
          isError={true}
          error={new Error('Server error')}
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });
  });

  describe('Row Interactions', () => {
    test('calls onRowClick when row is clicked', async () => {
      const user = userEvent.setup();
      const onRowClick = jest.fn();

      render(
        <ProfessionalRelationshipsTable
          {...defaultProps}
          onRowClick={onRowClick}
        />
      );

      const rows = screen.getAllByRole('row');
      await user.click(rows[1]);

      expect(onRowClick).toHaveBeenCalledWith(mockRelationships[0]);
    });
  });

  describe('Responsive Design', () => {
    test('hides email column on tablet (768-1023px)', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(min-width: 768px) and (max-width: 1023px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<ProfessionalRelationshipsTable {...defaultProps} />);

      const emailHeader = screen.getByText('Email');
      expect(emailHeader).toHaveClass('hidden', 'lg:table-cell');
    });

    test('hides phone column on tablet (768-1023px)', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(min-width: 768px) and (max-width: 1023px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<ProfessionalRelationshipsTable {...defaultProps} />);

      const phoneHeader = screen.getByText('Phone');
      expect(phoneHeader).toHaveClass('hidden', 'lg:table-cell');
    });
  });

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <ProfessionalRelationshipsTable {...defaultProps} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('table has accessible name', () => {
      render(<ProfessionalRelationshipsTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toHaveAccessibleName();
    });

    test('all sortable headers have aria-sort attribute', () => {
      render(<ProfessionalRelationshipsTable {...defaultProps} />);

      const sortableButtons = [
        screen.getByRole('button', { name: /First Name/i }),
        screen.getByRole('button', { name: /Last Name/i }),
        screen.getByRole('button', { name: /Company/i }),
        screen.getByRole('button', { name: /Status/i }),
      ];

      // aria-sort should be on the th element, not the button
      sortableButtons.forEach((button) => {
        const header = button.closest('th');
        expect(header).toHaveAttribute('aria-sort');
      });
    });
  });
});
