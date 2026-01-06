/**
 * PersonalRelationshipsTable Component Tests (Cycle 6)
 *
 * Tests personal relationships table functionality including:
 * - Rendering with personal relationship data
 * - Sortable columns (Name, Status, DOB)
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
import PersonalRelationshipsTable from '@/components/phase2/special-relationships/PersonalRelationshipsTable';
import {
  createMockPersonalRelationship,
  createMockRelationshipArray,
} from '@/tests/factories/specialRelationshipFactory';

expect.extend(toHaveNoViolations);

describe('PersonalRelationshipsTable', () => {
  const mockRelationships = createMockRelationshipArray(3, { category: 'personal' });

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
    test('renders table with personal relationships', () => {
      render(<PersonalRelationshipsTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Should have header + 3 data rows
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(4);
    });

    test('renders personal-specific columns', () => {
      render(<PersonalRelationshipsTable {...defaultProps} />);

      // Personal tables should have DOB and Age columns
      expect(screen.getByText('Date of Birth')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
    });

    test('does not render professional-specific columns', () => {
      render(<PersonalRelationshipsTable {...defaultProps} />);

      // Should NOT have company or position columns
      expect(screen.queryByText('Company')).not.toBeInTheDocument();
      expect(screen.queryByText('Position')).not.toBeInTheDocument();
    });

    test('renders all expected column headers', () => {
      render(<PersonalRelationshipsTable {...defaultProps} />);

      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
      expect(screen.getByText('Relationship')).toBeInTheDocument();
      expect(screen.getByText('Date of Birth')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    test('renders relationship data correctly', () => {
      const relationship = createMockPersonalRelationship({
        name: 'Jane Smith',
        relationship: 'Spouse',
      });

      render(
        <PersonalRelationshipsTable
          {...defaultProps}
          relationships={[relationship]}
        />
      );

      expect(screen.getByText('Jane')).toBeInTheDocument();
      expect(screen.getByText('Smith')).toBeInTheDocument();
      expect(screen.getByText('Spouse')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    test('sorts by first name ascending by default', () => {
      const relationships = [
        createMockPersonalRelationship({ name: 'Charlie Brown' }),
        createMockPersonalRelationship({ name: 'Alice Cooper' }),
        createMockPersonalRelationship({ name: 'Bob Dylan' }),
      ];

      render(
        <PersonalRelationshipsTable
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

    test('toggles sort direction when clicking same column', async () => {
      const user = userEvent.setup();

      render(<PersonalRelationshipsTable {...defaultProps} />);

      const nameButton = screen.getByRole('button', { name: /First Name/i });
      const nameHeader = nameButton.closest('th');

      // First click - ascending (default)
      await user.click(nameButton);
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

      // Second click - descending
      await user.click(nameButton);
      expect(nameHeader).toHaveAttribute('aria-sort', 'descending');

      // Third click - back to ascending
      await user.click(nameButton);
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    test('sorts by last name when header clicked', async () => {
      const user = userEvent.setup();
      const relationships = [
        createMockPersonalRelationship({ name: 'John Zebra' }),
        createMockPersonalRelationship({ name: 'Jane Apple' }),
        createMockPersonalRelationship({ name: 'Bob Mango' }),
      ];

      render(
        <PersonalRelationshipsTable
          {...defaultProps}
          relationships={relationships}
        />
      );

      const lastNameHeader = screen.getByRole('button', { name: /Last Name/i });
      await user.click(lastNameHeader);

      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Apple');
      expect(rows[2]).toHaveTextContent('Mango');
      expect(rows[3]).toHaveTextContent('Zebra');
    });

    test('sorts by status when header clicked', async () => {
      const user = userEvent.setup();
      const relationships = [
        createMockPersonalRelationship({ status: 'Inactive' }),
        createMockPersonalRelationship({ status: 'Active' }),
        createMockPersonalRelationship({ status: 'Deceased' }),
      ];

      render(
        <PersonalRelationshipsTable
          {...defaultProps}
          relationships={relationships}
        />
      );

      const statusHeader = screen.getByRole('button', { name: /Status/i });
      await user.click(statusHeader);

      const rows = screen.getAllByRole('row');
      // Status sort uses priority order: Active > Inactive > Deceased
      expect(rows[1]).toHaveTextContent('Active');
      expect(rows[2]).toHaveTextContent('Inactive');
      expect(rows[3]).toHaveTextContent('Deceased');
    });

    test('sorts by date of birth when header clicked', async () => {
      const user = userEvent.setup();
      const relationships = [
        createMockPersonalRelationship({ date_of_birth: '2000-01-01' }),
        createMockPersonalRelationship({ date_of_birth: '1985-06-15' }),
        createMockPersonalRelationship({ date_of_birth: '1995-12-25' }),
      ];

      render(
        <PersonalRelationshipsTable
          {...defaultProps}
          relationships={relationships}
        />
      );

      const dobHeader = screen.getByRole('button', { name: /Date of Birth/i });
      await user.click(dobHeader);

      const rows = screen.getAllByRole('row');
      // Should sort oldest to youngest
      expect(rows[1]).toHaveTextContent('1985');
      expect(rows[2]).toHaveTextContent('1995');
      expect(rows[3]).toHaveTextContent('2000');
    });
  });

  describe('Row Interactions', () => {
    test('calls onRowClick when row is clicked', async () => {
      const user = userEvent.setup();
      const onRowClick = jest.fn();

      render(
        <PersonalRelationshipsTable {...defaultProps} onRowClick={onRowClick} />
      );

      const rows = screen.getAllByRole('row');
      // Click first data row (skip header)
      await user.click(rows[1]);

      expect(onRowClick).toHaveBeenCalledWith(mockRelationships[0]);
      expect(onRowClick).toHaveBeenCalledTimes(1);
    });

    test('does not call onRowClick when action button is clicked', async () => {
      const user = userEvent.setup();
      const onRowClick = jest.fn();
      const onEdit = jest.fn();

      render(
        <PersonalRelationshipsTable
          {...defaultProps}
          onRowClick={onRowClick}
          onEdit={onEdit}
        />
      );

      // Click edit button (should not trigger row click)
      const editButton = screen.getAllByRole('button', { name: /Edit/i })[0];
      await user.click(editButton);

      expect(onRowClick).not.toHaveBeenCalled();
      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty States', () => {
    test('renders empty state when no relationships', () => {
      render(<PersonalRelationshipsTable {...defaultProps} relationships={[]} />);

      expect(screen.getByText('No personal relationships yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Add family members and dependents/)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Add Personal Relationship/i })
      ).toBeInTheDocument();
    });

    test('calls onAdd when Add button clicked in empty state', async () => {
      const user = userEvent.setup();
      const onAdd = jest.fn();

      render(
        <PersonalRelationshipsTable
          {...defaultProps}
          relationships={[]}
          onAdd={onAdd}
        />
      );

      const addButton = screen.getByRole('button', {
        name: /Add Personal Relationship/i,
      });
      await user.click(addButton);

      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    test('renders loading state with skeleton', () => {
      render(<PersonalRelationshipsTable {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText(/Loading relationships/i)).toBeInTheDocument();
      // Skeleton should have animated pulse class
      expect(screen.getByLabelText(/Loading relationships/i)).toContainHTML(
        'animate-pulse'
      );
    });

    test('renders error state on network failure', () => {
      render(
        <PersonalRelationshipsTable
          {...defaultProps}
          isError={true}
          error={new Error('Network error')}
        />
      );

      expect(screen.getByText('Unable to load relationships')).toBeInTheDocument();
      expect(
        screen.getByText(/Check your internet connection/)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });

    test('calls onRetry when Try Again clicked in error state', async () => {
      const user = userEvent.setup();
      const onRetry = jest.fn();

      render(
        <PersonalRelationshipsTable
          {...defaultProps}
          isError={true}
          error={new Error('Network error')}
          onRetry={onRetry}
        />
      );

      await user.click(screen.getByRole('button', { name: /Try Again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive Design', () => {
    test('hides email column on tablet (768-1023px)', () => {
      // Mock window.matchMedia for tablet viewport
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

      render(<PersonalRelationshipsTable {...defaultProps} />);

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

      render(<PersonalRelationshipsTable {...defaultProps} />);

      const phoneHeader = screen.getByText('Phone');
      expect(phoneHeader).toHaveClass('hidden', 'lg:table-cell');
    });
  });

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <PersonalRelationshipsTable {...defaultProps} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('table has accessible name', () => {
      render(<PersonalRelationshipsTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toHaveAccessibleName();
    });

    test('all sortable headers have aria-sort attribute', () => {
      render(<PersonalRelationshipsTable {...defaultProps} />);

      const sortableButtons = [
        screen.getByRole('button', { name: /First Name/i }),
        screen.getByRole('button', { name: /Last Name/i }),
        screen.getByRole('button', { name: /Status/i }),
        screen.getByRole('button', { name: /Date of Birth/i }),
      ];

      // aria-sort should be on the th element, not the button
      sortableButtons.forEach((button) => {
        const header = button.closest('th');
        expect(header).toHaveAttribute('aria-sort');
      });
    });
  });
});
