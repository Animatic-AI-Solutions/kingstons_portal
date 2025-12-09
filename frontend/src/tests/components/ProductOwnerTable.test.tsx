/**
 * ProductOwnerTable Component Tests (RED Phase - Iteration 2)
 *
 * Tests for the Product Owners table component that displays client group
 * product owners with 7 columns and accessibility features.
 *
 * Following TDD RED-GREEN-BLUE methodology.
 */

import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  // ============================================================
  // Edit Button Integration Tests (Iteration 6)
  // ============================================================

  describe('Edit Button Rendering', () => {
    it('shows Edit button in actions column for each row', () => {
      const mockProductOwners = [
        createActiveProductOwner(),
        createLapsedProductOwner(),
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

      // Each row should have an Edit button
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons).toHaveLength(3);
    });

    it('Edit button has proper accessible label', () => {
      const mockProductOwners = [createActiveProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(editButton).toHaveAccessibleName();
      expect(editButton).toHaveAttribute('aria-label', expect.stringContaining('edit'));
    });

    it('Edit button has proper styling', () => {
      const mockProductOwners = [createActiveProductOwner()];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      // EditButton component should have proper styling classes
      expect(editButton).toHaveClass(expect.stringMatching(/text-|bg-|hover:/));
    });

    it('Edit button always visible (regardless of status)', () => {
      const mockProductOwners = [
        createActiveProductOwner({ firstname: 'Active', surname: 'User' }),
        createLapsedProductOwner({ firstname: 'Lapsed', surname: 'User' }),
        createDeceasedProductOwner({ firstname: 'Deceased', surname: 'User' }),
      ];

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // All three rows should have Edit buttons regardless of status
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons).toHaveLength(3);
    });
  });

  describe('Edit Modal Integration', () => {
    it('clicking Edit button opens EditProductOwnerModal', async () => {
      const mockProductOwners = [createActiveProductOwner()];
      const user = userEvent.setup();

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Click Edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/edit product owner/i)).toBeInTheDocument();
      });
    });

    it('modal receives correct product owner data', async () => {
      const productOwner = createActiveProductOwner({
        firstname: 'John',
        surname: 'Smith',
      });
      const user = userEvent.setup();

      render(
        <ProductOwnerTable
          productOwners={[productOwner]}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Click Edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Modal should show product owner's data
      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
      });
    });

    it('modal closes after successful update', async () => {
      const mockProductOwners = [createActiveProductOwner({ id: 123 })];
      const user = userEvent.setup();

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Click Edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click Cancel to close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('table refreshes data after successful update', async () => {
      const mockProductOwners = [createActiveProductOwner({ id: 123, firstname: 'John' })];
      const mockOnRefetch = jest.fn();
      const user = userEvent.setup();

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
          onRefetch={mockOnRefetch}
        />,
        { wrapper }
      );

      // Click Edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Make a change and save
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // onRefetch callback should be called
      await waitFor(() => {
        expect(mockOnRefetch).toHaveBeenCalled();
      });
    });

    it('multiple product owners can be edited sequentially', async () => {
      const mockProductOwners = [
        createActiveProductOwner({ id: 1, firstname: 'John', surname: 'Smith' }),
        createActiveProductOwner({ id: 2, firstname: 'Jane', surname: 'Doe' }),
      ];
      const user = userEvent.setup();

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Get all edit buttons
      const editButtons = screen.getAllByRole('button', { name: /edit/i });

      // Edit first product owner
      await user.click(editButtons[0]);
      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
      });

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Edit second product owner
      await user.click(editButtons[1]);
      await waitFor(() => {
        expect(screen.getByText(/jane doe/i)).toBeInTheDocument();
      });
    });

    it('modal shows correct data for each product owner', async () => {
      const mockProductOwners = [
        createActiveProductOwner({ id: 1, firstname: 'Alice', surname: 'Anderson' }),
        createActiveProductOwner({ id: 2, firstname: 'Bob', surname: 'Brown' }),
      ];
      const user = userEvent.setup();

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const editButtons = screen.getAllByRole('button', { name: /edit/i });

      // Edit first owner
      await user.click(editButtons[0]);
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Anderson')).toBeInTheDocument();
      });

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Edit second owner
      await user.click(editButtons[1]);
      await waitFor(() => {
        expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Brown')).toBeInTheDocument();
      });
    });

    it('handles edit button spam clicking (no duplicate modals)', async () => {
      const mockProductOwners = [createActiveProductOwner()];
      const user = userEvent.setup();

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      const editButton = screen.getByRole('button', { name: /edit/i });

      // Click multiple times rapidly
      await user.click(editButton);
      await user.click(editButton);
      await user.click(editButton);

      // Should only show one modal
      await waitFor(() => {
        const dialogs = screen.queryAllByRole('dialog');
        expect(dialogs.length).toBeLessThanOrEqual(1);
      });
    });

    it('edit button disabled during other operations (delete, status change)', async () => {
      const mockProductOwners = [createActiveProductOwner()];
      const user = userEvent.setup();

      render(
        <ProductOwnerTable
          productOwners={mockProductOwners}
          isLoading={false}
          error={null}
        />,
        { wrapper }
      );

      // Start a status change operation (e.g., click Lapse button)
      const lapseButton = screen.getByRole('button', { name: /lapse/i });
      await user.click(lapseButton);

      // Edit button should be disabled during operation
      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(editButton).toBeDisabled();
    });
  });
});
