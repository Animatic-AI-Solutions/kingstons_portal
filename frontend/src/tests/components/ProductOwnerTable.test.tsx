/**
 * ProductOwnerTable Component Tests (RED Phase - Iteration 2)
 *
 * Tests for the Product Owners table component that displays client group
 * product owners with 7 columns and accessibility features.
 *
 * Following TDD RED-GREEN-BLUE methodology.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createProductOwner, createActiveProductOwner, createLapsedProductOwner, createDeceasedProductOwner } from '../factories/productOwnerFactory';
import ProductOwnerTable from '@/components/ProductOwnerTable';

// Create a test query client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
};

describe('ProductOwnerTable Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Semantic HTML Structure', () => {
    it('renders semantic HTML table with thead, tbody, th, tr, td', () => {
      const mockProductOwners = [createProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for semantic table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check for thead and tbody (both have role="rowgroup")
      const rowgroups = screen.getAllByRole('rowgroup');
      expect(rowgroups).toHaveLength(2); // thead and tbody

      const thead = rowgroups[0];
      expect(thead.tagName).toBe('THEAD');

      const tbody = rowgroups[1];
      expect(tbody.tagName).toBe('TBODY');

      // Check for header cells (th)
      const headerCells = within(thead).getAllByRole('columnheader');
      expect(headerCells.length).toBeGreaterThan(0);
      headerCells.forEach(cell => {
        expect(cell.tagName).toBe('TH');
      });

      // Check for table rows (tr)
      const rows = within(tbody).getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach(row => {
        expect(row.tagName).toBe('TR');
      });

      // Check for table cells (td)
      const cells = within(rows[0]).getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
      cells.forEach(cell => {
        expect(cell.tagName).toBe('TD');
      });
    });
  });

  describe('Column Headers', () => {
    it('renders 7 columns with correct headers', () => {
      const mockProductOwners = [createProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for all 7 column headers
      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /relationship/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /age/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /dob/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    });
  });

  describe('ARIA Attributes', () => {
    it('applies aria-sort="none" to all headers initially', () => {
      const mockProductOwners = [createProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const headers = screen.getAllByRole('columnheader');

      headers.forEach(header => {
        expect(header).toHaveAttribute('aria-sort', 'none');
      });
    });
  });

  describe('Data Display', () => {
    it('displays product owner name correctly formatted (title + firstname + surname)', () => {
      const mockProductOwner = createProductOwner({
        title: 'Mr',
        firstname: 'John',
        surname: 'Smith',
      });

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for formatted name: "Mr John Smith"
      expect(screen.getByText('Mr John Smith')).toBeInTheDocument();
    });

    it('displays product owner name without title when title is null', () => {
      const mockProductOwner = createProductOwner({
        title: null,
        firstname: 'Jane',
        surname: 'Doe',
      });

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for formatted name without title: "Jane Doe"
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('displays calculated age in Age column', () => {
      const mockProductOwner = createProductOwner({
        dob: '1990-01-15', // Age should be ~34-35 depending on current date
      });

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Age column should display calculated age
      const ageCell = screen.getByRole('cell', { name: /^3[45]$/ });
      expect(ageCell).toBeInTheDocument();
    });

    it('displays DOB in correct format (DD/MM/YYYY)', () => {
      const mockProductOwner = createProductOwner({
        dob: '1990-01-15',
      });

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // DOB should be formatted as DD/MM/YYYY
      expect(screen.getByText('15/01/1990')).toBeInTheDocument();
    });

    it('displays dash when DOB is null', () => {
      const mockProductOwner = createProductOwner({
        dob: null,
      });

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Should display dash for missing DOB
      const dobCells = screen.getAllByRole('cell');
      const dobCell = dobCells.find(cell => cell.textContent === '-');
      expect(dobCell).toBeInTheDocument();
    });

    it('displays email_1 in Email column', () => {
      const mockProductOwner = createProductOwner({
        email_1: 'john.smith@example.com',
      });

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      expect(screen.getByText('john.smith@example.com')).toBeInTheDocument();
    });

    it('displays dash when email_1 is null', () => {
      const mockProductOwner = createProductOwner({
        email_1: null,
      });

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Should display dash for missing email
      const emailCells = screen.getAllByRole('cell');
      const emailCell = emailCells.find(cell => cell.textContent === '-');
      expect(emailCell).toBeInTheDocument();
    });

    it('displays status badge with correct color for active status', () => {
      const mockProductOwner = createActiveProductOwner();

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for StatusBadge with active status
      const statusBadge = screen.getByRole('status', { name: /active/i });
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('displays status badge with correct color for lapsed status', () => {
      const mockProductOwner = createLapsedProductOwner();

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for StatusBadge with lapsed status
      const statusBadge = screen.getByRole('status', { name: /lapsed/i });
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-orange-100', 'text-orange-800');
    });

    it('displays status badge with correct color for deceased status', () => {
      const mockProductOwner = createDeceasedProductOwner();

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for StatusBadge with deceased status
      const statusBadge = screen.getByRole('status', { name: /deceased/i });
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('renders action buttons in Actions column', () => {
      const mockProductOwner = createProductOwner();

      render(
        <ProductOwnerTable
          productOwners={[mockProductOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for Edit and Delete buttons
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });

  describe('Inactive Rows Styling', () => {
    it('applies greyed out styling to inactive rows (lapsed status)', () => {
      const mockProductOwners = [
        createActiveProductOwner(),
        createLapsedProductOwner(),
      ];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      const lapsedRow = rows[2]; // Second data row

      // Lapsed row should have greyed out styling
      expect(lapsedRow).toHaveClass('opacity-50', 'bg-gray-50');
    });

    it('applies greyed out styling to inactive rows (deceased status)', () => {
      const mockProductOwners = [
        createActiveProductOwner(),
        createDeceasedProductOwner(),
      ];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      const deceasedRow = rows[2]; // Second data row

      // Deceased row should have greyed out styling
      expect(deceasedRow).toHaveClass('opacity-50', 'bg-gray-50');
    });

    it('does not apply greyed out styling to active rows', () => {
      const mockProductOwners = [
        createActiveProductOwner(),
        createActiveProductOwner(),
      ];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      const activeRow = rows[1]; // First data row

      // Active row should not have greyed out styling
      expect(activeRow).not.toHaveClass('opacity-50');
    });

    it('positions inactive rows at bottom of table', () => {
      const mockProductOwners = [
        createLapsedProductOwner({ firstname: 'Lapsed', surname: 'Person' }),
        createActiveProductOwner({ firstname: 'Active', surname: 'Person' }),
        createDeceasedProductOwner({ firstname: 'Deceased', surname: 'Person' }),
      ];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const rows = screen.getAllByRole('row');

      // First data row should be active
      expect(within(rows[1]).getByText(/Active Person/i)).toBeInTheDocument();

      // Inactive rows should be at bottom
      expect(within(rows[2]).getByText(/Lapsed Person/i)).toBeInTheDocument();
      expect(within(rows[3]).getByText(/Deceased Person/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton during data fetch', () => {
      render(
        <ProductOwnerTable
          productOwners={[]}
          isLoading={true}
          error={null}
        />,
        { wrapper }
      );

      // Check for loading skeleton
      expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();

      // Table headers should still be visible
      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    });

    it('hides loading skeleton after data is loaded', () => {
      const mockProductOwners = [createProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Loading skeleton should not be present
      expect(screen.queryByTestId('table-skeleton')).not.toBeInTheDocument();

      // Table data should be visible
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no product owners', () => {
      render(
        <ProductOwnerTable
          productOwners={[]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for empty state message
      expect(screen.getByText(/no product owners found/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first product owner to get started/i)).toBeInTheDocument();
    });

    it('displays Add Product Owner button in empty state', () => {
      render(
        <ProductOwnerTable
          productOwners={[]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for add button in empty state
      expect(screen.getByRole('button', { name: /add product owner/i })).toBeInTheDocument();
    });

    it('hides empty state when product owners are present', () => {
      const mockProductOwners = [createProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Empty state should not be visible
      expect(screen.queryByText(/no product owners found/i)).not.toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows error state on API failure', () => {
      const error = new Error('Failed to fetch product owners');

      render(
        <ProductOwnerTable
          productOwners={[]}
          isLoading={false}
          error={error}
        />,
        { wrapper }
      );

      // Check for error message
      expect(screen.getByText(/error loading product owners/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch product owners/i)).toBeInTheDocument();
    });

    it('displays retry button in error state', () => {
      const error = new Error('Network error');

      render(
        <ProductOwnerTable
          productOwners={[]}
          isLoading={false}
          error={error}
          onRetry={() => {}}
        />,
        { wrapper }
      );

      // Check for retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('hides error state when data loads successfully', () => {
      const mockProductOwners = [createProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Error state should not be visible
      expect(screen.queryByText(/error loading product owners/i)).not.toBeInTheDocument();
    });
  });

  describe('Multiple Rows', () => {
    it('displays multiple product owners correctly', () => {
      const mockProductOwners = [
        createProductOwner({ firstname: 'John', surname: 'Smith' }),
        createProductOwner({ firstname: 'Jane', surname: 'Doe' }),
        createProductOwner({ firstname: 'Bob', surname: 'Johnson' }),
      ];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check all names are displayed
      expect(screen.getByText(/John Smith/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/Bob Johnson/i)).toBeInTheDocument();

      // Check row count (excluding header)
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(4); // 1 header + 3 data rows
    });
  });

  describe('Accessibility', () => {
    it('has accessible table structure with proper roles', () => {
      const mockProductOwners = [createProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Check for proper ARIA roles
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader').length).toBe(7);
      expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
    });

    it('provides aria-label for the table', () => {
      const mockProductOwners = [createProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Product Owners');
    });

    it('includes scope attribute on header cells', () => {
      const mockProductOwners = [createProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const headers = screen.getAllByRole('columnheader');
      headers.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });
  });
});
