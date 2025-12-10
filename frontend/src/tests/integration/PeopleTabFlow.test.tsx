/**
 * People Tab Integration Flow Tests - RED PHASE
 *
 * End-to-end integration tests for complete user workflows in the People Tab.
 * Tests realistic user journeys from start to finish with full component interaction.
 *
 * Test Coverage:
 * - CRUD flows (create, edit, lapse, reactivate, delete)
 * - Sorting flows (multi-column sort, inactive row positioning)
 * - Error recovery flows (network failures, validation errors, retry logic)
 * - Performance/stress flows (large datasets, concurrent operations)
 *
 * Expected Result: All tests FAIL (RED phase) until implementation complete.
 *
 * @module tests/integration/PeopleTabFlow
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PeopleSubTab from '@/pages/ClientGroupSuite/tabs/components/PeopleSubTab';
import {
  createProductOwner,
  updateProductOwner,
  deleteProductOwner,
} from '@/services/api/productOwners';
import { createClientGroupProductOwner } from '@/services/api/clientGroupProductOwners';

// Mock API modules
jest.mock('@/services/api/productOwners');
jest.mock('@/services/api/clientGroupProductOwners');
jest.mock('react-hot-toast');

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    api: {
      get: jest.fn().mockResolvedValue({ data: [] }),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
    user: { id: 1, name: 'Test User' },
    isAuthenticated: true,
  }),
}));

/**
 * Create test query client
 */
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
};

/**
 * Generate mock product owner data
 */
const createMockProductOwner = (overrides = {}) => ({
  id: Math.floor(Math.random() * 10000),
  firstname: 'John',
  surname: 'Smith',
  title: 'Mr',
  relationship_status: 'Primary',
  dob: '1980-05-15',
  email_1: 'john@example.com',
  status: 'active',
  ...overrides,
});

/**
 * Generate array of mock product owners
 */
const generateMockProductOwners = (count: number) => {
  return Array.from({ length: count }, (_, i) =>
    createMockProductOwner({
      id: i + 1,
      firstname: `Person${i + 1}`,
      surname: `Surname${i + 1}`,
      email_1: `person${i + 1}@example.com`,
      status: i % 5 === 0 ? 'lapsed' : 'active', // Every 5th person is lapsed
    })
  );
};

describe('People Tab Integration Flows', () => {
  let queryClient: QueryClient;
  let mockProductOwners: any[];

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockProductOwners = [
      createMockProductOwner({ id: 1, firstname: 'John', surname: 'Smith', status: 'active' }),
      createMockProductOwner({ id: 2, firstname: 'Jane', surname: 'Doe', status: 'lapsed' }),
    ];

    jest.clearAllMocks();

    // Mock useProductOwners hook
    require('@/hooks/useProductOwners').useProductOwners = jest.fn(() => ({
      data: mockProductOwners,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    }));

    // Mock window.confirm
    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderPeopleTab = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/client-groups/123']}>
          <Routes>
            <Route path="/client-groups/:clientGroupId" element={<PeopleSubTab />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  // ============================================================
  // CRUD Flows (5 tests)
  // ============================================================

  describe('CRUD Flows', () => {
    it('complete flow: create new product owner', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // Mock successful creation
      (createProductOwner as jest.Mock).mockResolvedValue({
        id: 999,
        firstname: 'Alice',
        surname: 'Johnson',
        status: 'active',
      });
      (createClientGroupProductOwner as jest.Mock).mockResolvedValue({ id: 1 });

      renderPeopleTab();

      // Wait for table to load
      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      // Step 1: Click "Add Person" button
      const addButton = screen.getByRole('button', { name: /add new person/i });
      await user.click(addButton);

      // Step 2: Modal opens
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/create product owner/i)).toBeInTheDocument();
      });

      // Step 3: Fill in required fields
      const firstNameInput = screen.getByLabelText(/first name/i);
      const surnameInput = screen.getByLabelText(/surname/i);

      await user.type(firstNameInput, 'Alice');
      await user.type(surnameInput, 'Johnson');

      // Step 4: Click Create button
      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      // Step 5: Verify API called correctly
      await waitFor(() => {
        expect(createProductOwner).toHaveBeenCalledWith(
          expect.objectContaining({
            firstname: 'Alice',
            surname: 'Johnson',
          })
        );
      });

      // Step 6: Verify modal closes
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Step 7: Verify success toast shown
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('created'));

      // Step 8: Verify refetch triggered (new person would appear in table)
      // This is verified by the onRefetch callback being called
    });

    it('complete flow: edit existing product owner', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // Mock successful update
      (updateProductOwner as jest.Mock).mockResolvedValue({
        id: 1,
        firstname: 'Jonathan',
        surname: 'Smith',
        status: 'active',
      });

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      // Step 1: Click Edit button for John Smith
      const editButton = screen.getAllByLabelText(/edit.*john/i)[0];
      await user.click(editButton);

      // Step 2: Modal opens with existing data
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });

      // Step 3: Modify firstname
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jonathan');

      // Step 4: Click Save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Step 5: Verify API called with correct data
      await waitFor(() => {
        expect(updateProductOwner).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            firstname: 'Jonathan',
          })
        );
      });

      // Step 6: Verify modal closes and success toast
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(toast.success).toHaveBeenCalled();
    });

    it('complete flow: lapse active product owner', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // Mock successful status change
      (updateProductOwner as jest.Mock).mockResolvedValue({
        id: 1,
        firstname: 'John',
        surname: 'Smith',
        status: 'lapsed',
      });

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      // Step 1: Find John Smith row (active)
      const johnRow = screen.getByText('John').closest('tr');
      expect(johnRow).toBeInTheDocument();

      // Step 2: Click Lapse button
      const lapseButton = within(johnRow!).getByLabelText(/lapse/i);
      await user.click(lapseButton);

      // Step 3: Verify API called
      await waitFor(() => {
        expect(updateProductOwner).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            status: 'lapsed',
          })
        );
      });

      // Step 4: Verify success feedback
      expect(toast.success).toHaveBeenCalled();

      // Step 5: Verify refetch triggered (row would update to lapsed styling)
    });

    it('complete flow: reactivate lapsed product owner', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // Mock successful reactivation
      (updateProductOwner as jest.Mock).mockResolvedValue({
        id: 2,
        firstname: 'Jane',
        surname: 'Doe',
        status: 'active',
      });

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      // Step 1: Find Jane Doe row (lapsed)
      const janeRow = screen.getByText('Jane').closest('tr');
      expect(janeRow).toBeInTheDocument();

      // Step 2: Click Reactivate button
      const reactivateButton = within(janeRow!).getByLabelText(/reactivate/i);
      await user.click(reactivateButton);

      // Step 3: Verify API called
      await waitFor(() => {
        expect(updateProductOwner).toHaveBeenCalledWith(
          2,
          expect.objectContaining({
            status: 'active',
          })
        );
      });

      // Step 4: Verify success feedback
      expect(toast.success).toHaveBeenCalled();
    });

    it('complete flow: delete inactive product owner', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // Mock successful deletion
      (deleteProductOwner as jest.Mock).mockResolvedValue({});

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      // Step 1: Find Jane Doe row (lapsed/inactive)
      const janeRow = screen.getByText('Jane').closest('tr');
      expect(janeRow).toBeInTheDocument();

      // Step 2: Click Delete button
      const deleteButton = within(janeRow!).getByLabelText(/delete/i);
      await user.click(deleteButton);

      // Step 3: Confirm deletion in modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/confirm.*delete/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /delete/i });
      await user.click(confirmButton);

      // Step 4: Verify API called
      await waitFor(() => {
        expect(deleteProductOwner).toHaveBeenCalledWith(2);
      });

      // Step 5: Verify success toast and modal closes
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(toast.success).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Sorting Flows (3 tests)
  // ============================================================

  describe('Sorting Flows', () => {
    it('complete flow: sort by multiple columns in sequence', async () => {
      const user = userEvent.setup();

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      // Step 1: Sort by name ascending
      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      const nameSortButton = nameHeader.querySelector('button');
      await user.click(nameSortButton!);

      await waitFor(() => {
        expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
      });

      // Step 2: Sort by email ascending
      const emailHeader = screen.getByRole('columnheader', { name: /email/i });
      const emailSortButton = emailHeader.querySelector('button');
      await user.click(emailSortButton!);

      await waitFor(() => {
        expect(emailHeader).toHaveAttribute('aria-sort', 'ascending');
        expect(nameHeader).toHaveAttribute('aria-sort', 'none');
      });

      // Step 3: Sort by status descending
      const statusHeader = screen.getByRole('columnheader', { name: /status/i });
      const statusSortButton = statusHeader.querySelector('button');
      await user.click(statusSortButton!);
      await user.click(statusSortButton!); // Click twice for descending

      await waitFor(() => {
        expect(statusHeader).toHaveAttribute('aria-sort', 'descending');
        expect(emailHeader).toHaveAttribute('aria-sort', 'none');
      });
    });

    it('complete flow: inactive rows stay at bottom when sorting by any column', async () => {
      const user = userEvent.setup();

      // Add more data with mix of active and inactive
      mockProductOwners = [
        createMockProductOwner({ id: 1, firstname: 'Alice', status: 'active' }),
        createMockProductOwner({ id: 2, firstname: 'Bob', status: 'lapsed' }),
        createMockProductOwner({ id: 3, firstname: 'Charlie', status: 'active' }),
        createMockProductOwner({ id: 4, firstname: 'David', status: 'deceased' }),
      ];

      require('@/hooks/useProductOwners').useProductOwners = jest.fn(() => ({
        data: mockProductOwners,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      }));

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      // Step 1: Sort by name ascending
      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      const sortButton = nameHeader.querySelector('button');
      await user.click(sortButton!);

      await waitFor(() => {
        const rows = screen.getAllByRole('row').slice(1); // Skip header row

        // Last two rows should be inactive (lapsed/deceased)
        const lastRow = rows[rows.length - 1];
        const secondLastRow = rows[rows.length - 2];

        // Check that these rows have opacity-50 class (inactive styling)
        expect(lastRow.className).toMatch(/opacity-50/);
        expect(secondLastRow.className).toMatch(/opacity-50/);
      });

      // Step 2: Sort by email - inactive should still be at bottom
      const emailHeader = screen.getByRole('columnheader', { name: /email/i });
      const emailSortButton = emailHeader.querySelector('button');
      await user.click(emailSortButton!);

      await waitFor(() => {
        const rows = screen.getAllByRole('row').slice(1);
        const lastRow = rows[rows.length - 1];
        const secondLastRow = rows[rows.length - 2];

        expect(lastRow.className).toMatch(/opacity-50/);
        expect(secondLastRow.className).toMatch(/opacity-50/);
      });
    });

    it('complete flow: sort returns to default on third click', async () => {
      const user = userEvent.setup();

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      const sortButton = nameHeader.querySelector('button');

      // Step 1: Initial state - no sort
      expect(nameHeader).toHaveAttribute('aria-sort', 'none');

      // Step 2: First click - ascending
      await user.click(sortButton!);
      await waitFor(() => {
        expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
      });

      // Step 3: Second click - descending
      await user.click(sortButton!);
      await waitFor(() => {
        expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
      });

      // Step 4: Third click - back to no sort
      await user.click(sortButton!);
      await waitFor(() => {
        expect(nameHeader).toHaveAttribute('aria-sort', 'none');
      });
    });
  });

  // ============================================================
  // Error Recovery Flows (4 tests)
  // ============================================================

  describe('Error Recovery Flows', () => {
    it('error recovery: handle network failure gracefully', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // Mock network error on create
      (createProductOwner as jest.Mock).mockRejectedValue({
        code: 'ERR_NETWORK',
        message: 'Network error',
      });

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      // Step 1: Open create modal
      const addButton = screen.getByRole('button', { name: /add new person/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Step 2: Fill form and submit
      await user.type(screen.getByLabelText(/first name/i), 'Test');
      await user.type(screen.getByLabelText(/surname/i), 'User');

      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      // Step 3: Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Step 4: Verify modal stays open for retry
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Step 5: Verify form data preserved
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
      expect(screen.getByDisplayValue('User')).toBeInTheDocument();
    });

    it('error recovery: handle validation errors', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // Mock 422 validation error
      (createProductOwner as jest.Mock).mockRejectedValue({
        response: {
          status: 422,
          data: {
            detail: [
              { loc: ['body', 'email_1'], msg: 'Invalid email format' },
            ],
          },
        },
      });

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      // Step 1: Open modal and fill invalid data
      const addButton = screen.getByRole('button', { name: /add new person/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/first name/i), 'Test');
      await user.type(screen.getByLabelText(/surname/i), 'User');

      // Expand contact section and enter invalid email
      await user.click(screen.getByText(/contact information/i));
      await user.type(screen.getByLabelText(/primary email/i), 'invalid-email');

      // Step 2: Submit
      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      // Step 3: Verify error displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });

      // Step 4: Modal stays open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('error recovery: recover from 500 server error', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // Mock 500 error then success
      (createProductOwner as jest.Mock)
        .mockRejectedValueOnce({
          response: { status: 500, data: { detail: 'Internal server error' } },
        })
        .mockResolvedValueOnce({
          id: 999,
          firstname: 'Test',
          surname: 'User',
        });

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      // Step 1: Open modal and submit
      const addButton = screen.getByRole('button', { name: /add new person/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/first name/i), 'Test');
      await user.type(screen.getByLabelText(/surname/i), 'User');

      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      // Step 2: First attempt fails
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Step 3: Retry succeeds
      await user.click(createButton);

      await waitFor(() => {
        expect(createProductOwner).toHaveBeenCalledTimes(2);
        expect(toast.success).toHaveBeenCalled();
      });

      // Step 4: Modal closes
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('error recovery: retry failed API calls', async () => {
      const user = userEvent.setup();

      // Mock loading error
      require('@/hooks/useProductOwners').useProductOwners = jest.fn(() => ({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load product owners'),
        refetch: jest.fn().mockResolvedValue({ data: mockProductOwners }),
      }));

      renderPeopleTab();

      // Step 1: Error state displays
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/error loading/i)).toBeInTheDocument();
      });

      // Step 2: Retry button exists
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Step 3: Click retry
      await user.click(retryButton);

      // Step 4: Verify refetch called
      const mockRefetch = require('@/hooks/useProductOwners').useProductOwners().refetch;
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Performance/Stress Flows (2 tests)
  // ============================================================

  describe('Performance Flows', () => {
    it('complete flow: handle 50 product owners smoothly (<2s load)', async () => {
      // Generate 50 product owners
      const largeDataset = generateMockProductOwners(50);

      require('@/hooks/useProductOwners').useProductOwners = jest.fn(() => ({
        data: largeDataset,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      }));

      // Measure render time
      const startTime = performance.now();

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Step 1: Verify all rows rendered
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(51); // 50 data rows + 1 header row

      // Step 2: Verify render time < 2 seconds
      expect(renderTime).toBeLessThan(2000);

      // Step 3: Verify table is scrollable if needed
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Step 4: Verify actions are still clickable
      const editButtons = screen.getAllByLabelText(/edit/i);
      expect(editButtons.length).toBe(50);
    }, 10000); // 10 second timeout

    it('complete flow: handle 100 product owners (stress test)', async () => {
      // Generate 100 product owners
      const veryLargeDataset = generateMockProductOwners(100);

      require('@/hooks/useProductOwners').useProductOwners = jest.fn(() => ({
        data: veryLargeDataset,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      }));

      const startTime = performance.now();

      renderPeopleTab();

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Step 1: Verify all rows rendered
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(101); // 100 data rows + 1 header row

      // Step 2: Log performance for analysis
      console.log(`Render time for 100 rows: ${renderTime}ms`);

      // Step 3: Verify sorting still works with large dataset
      const user = userEvent.setup();
      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      const sortButton = nameHeader.querySelector('button');

      const sortStartTime = performance.now();
      await user.click(sortButton!);

      await waitFor(() => {
        expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
      });

      const sortEndTime = performance.now();
      const sortTime = sortEndTime - sortStartTime;

      // Step 4: Verify sort time is reasonable (<500ms)
      expect(sortTime).toBeLessThan(500);

      console.log(`Sort time for 100 rows: ${sortTime}ms`);
    }, 15000); // 15 second timeout
  });
});
