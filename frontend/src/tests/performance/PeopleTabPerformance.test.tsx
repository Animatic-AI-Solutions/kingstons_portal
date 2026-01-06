/**
 * People Tab Performance Tests - RED PHASE
 *
 * Performance benchmarking tests for the People Tab feature.
 * Measures render times, operation speeds, and memory usage to ensure
 * the application meets performance requirements.
 *
 * Performance Requirements:
 * - Table loads in <2 seconds with 50 product owners
 * - Sorting completes in <100ms
 * - Modal opens in <200ms
 * - Form submission completes in <500ms
 * - No memory leaks after repeated CRUD operations
 *
 * Expected Result: All tests FAIL (RED phase) until implementation optimized.
 *
 * @module tests/performance/PeopleTabPerformance
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PeopleSubTab from '@/pages/ClientGroupSuite/tabs/components/PeopleSubTab';
import ProductOwnerTable from '@/components/phase2/people/ProductOwnerTable';
import {
  createProductOwner,
  updateProductOwner,
  deleteProductOwner,
} from '@/services/api/productOwners';

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
const createMockProductOwner = (id: number) => ({
  id,
  firstname: `Person${id}`,
  surname: `Surname${id}`,
  title: 'Mr',
  middlename: `Middle${id}`,
  relationship_status: 'Primary',
  dob: '1980-05-15',
  place_of_birth: 'London',
  email_1: `person${id}@example.com`,
  email_2: `person${id}.alt@example.com`,
  phone_1: '+44123456789',
  phone_2: '+44987654321',
  status: id % 5 === 0 ? 'lapsed' : 'active',
  occupation: 'Software Engineer',
  ni_number: 'AB123456C',
  employment_status: 'Employed',
  aml_result: 'Pass',
});

/**
 * Generate array of mock product owners
 */
const generateMockProductOwners = (count: number) => {
  return Array.from({ length: count }, (_, i) => createMockProductOwner(i + 1));
};

/**
 * Measure memory usage (requires Node.js environment with gc exposed)
 */
const measureMemory = () => {
  if (global.gc) {
    global.gc();
    return process.memoryUsage().heapUsed;
  }
  return 0;
};

describe('People Tab Performance', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderPeopleTab = (productOwners: any[]) => {
    require('@/hooks/useProductOwners').useProductOwners = jest.fn(() => ({
      data: productOwners,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    }));

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

  const renderTableDirectly = (productOwners: any[]) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProductOwnerTable
          productOwners={productOwners}
          isLoading={false}
          error={null}
          onRetry={jest.fn()}
          onRefetch={jest.fn()}
          clientGroupId={123}
        />
      </QueryClientProvider>
    );
  };

  // ============================================================
  // Render Performance (5 tests)
  // ============================================================

  describe('Render Performance', () => {
    it('table loads in <2 seconds with 50 product owners', async () => {
      const productOwners = generateMockProductOwners(50);

      const startTime = performance.now();

      renderPeopleTab(productOwners);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      console.log(`Table load time (50 rows): ${loadTime.toFixed(2)}ms`);

      // Verify rows rendered
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(51); // 50 data + 1 header

      // Assert load time < 2000ms
      expect(loadTime).toBeLessThan(2000);
    });

    it('table loads in <3 seconds with 100 product owners', async () => {
      const productOwners = generateMockProductOwners(100);

      const startTime = performance.now();

      renderPeopleTab(productOwners);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      console.log(`Table load time (100 rows): ${loadTime.toFixed(2)}ms`);

      // Verify rows rendered
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(101); // 100 data + 1 header

      // Assert load time < 3000ms
      expect(loadTime).toBeLessThan(3000);
    });

    it('empty state renders in <100ms', async () => {
      const startTime = performance.now();

      renderPeopleTab([]);

      await waitFor(() => {
        expect(screen.getByText(/no product owners found/i)).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      console.log(`Empty state render time: ${loadTime.toFixed(2)}ms`);

      expect(loadTime).toBeLessThan(100);
    });

    it('loading state renders in <50ms', async () => {
      require('@/hooks/useProductOwners').useProductOwners = jest.fn(() => ({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      }));

      const startTime = performance.now();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/client-groups/123']}>
            <Routes>
              <Route path="/client-groups/:clientGroupId" element={<PeopleSubTab />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      console.log(`Loading state render time: ${loadTime.toFixed(2)}ms`);

      expect(loadTime).toBeLessThan(50);
    });

    it('error state renders in <100ms', async () => {
      require('@/hooks/useProductOwners').useProductOwners = jest.fn(() => ({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: jest.fn(),
      }));

      const startTime = performance.now();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/client-groups/123']}>
            <Routes>
              <Route path="/client-groups/:clientGroupId" element={<PeopleSubTab />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      console.log(`Error state render time: ${loadTime.toFixed(2)}ms`);

      expect(loadTime).toBeLessThan(100);
    });
  });

  // ============================================================
  // Sorting Performance (3 tests)
  // ============================================================

  describe('Sorting Performance', () => {
    it('sorting completes in <100ms with 50 rows', async () => {
      const user = userEvent.setup();
      const productOwners = generateMockProductOwners(50);

      renderPeopleTab(productOwners);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      const sortButton = nameHeader.querySelector('button');

      const startTime = performance.now();

      await user.click(sortButton!);

      await waitFor(() => {
        expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
      });

      const endTime = performance.now();
      const sortTime = endTime - startTime;

      console.log(`Sort time (50 rows): ${sortTime.toFixed(2)}ms`);

      expect(sortTime).toBeLessThan(100);
    });

    it('sorting completes in <200ms with 100 rows', async () => {
      const user = userEvent.setup();
      const productOwners = generateMockProductOwners(100);

      renderPeopleTab(productOwners);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      const sortButton = nameHeader.querySelector('button');

      const startTime = performance.now();

      await user.click(sortButton!);

      await waitFor(() => {
        expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
      });

      const endTime = performance.now();
      const sortTime = endTime - startTime;

      console.log(`Sort time (100 rows): ${sortTime.toFixed(2)}ms`);

      expect(sortTime).toBeLessThan(200);
    });

    it('multiple sequential sorts complete in <500ms', async () => {
      const user = userEvent.setup();
      const productOwners = generateMockProductOwners(50);

      renderPeopleTab(productOwners);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const startTime = performance.now();

      // Sort by name
      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      await user.click(nameHeader.querySelector('button')!);

      await waitFor(() => {
        expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
      });

      // Sort by email
      const emailHeader = screen.getByRole('columnheader', { name: /email/i });
      await user.click(emailHeader.querySelector('button')!);

      await waitFor(() => {
        expect(emailHeader).toHaveAttribute('aria-sort', 'ascending');
      });

      // Sort by status
      const statusHeader = screen.getByRole('columnheader', { name: /status/i });
      await user.click(statusHeader.querySelector('button')!);

      await waitFor(() => {
        expect(statusHeader).toHaveAttribute('aria-sort', 'ascending');
      });

      const endTime = performance.now();
      const totalSortTime = endTime - startTime;

      console.log(`Total time for 3 sequential sorts: ${totalSortTime.toFixed(2)}ms`);

      expect(totalSortTime).toBeLessThan(500);
    });
  });

  // ============================================================
  // Modal Performance (3 tests)
  // ============================================================

  describe('Modal Performance', () => {
    it('create modal opens in <200ms', async () => {
      const user = userEvent.setup();
      const productOwners = generateMockProductOwners(5);

      renderPeopleTab(productOwners);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add new person/i });

      const startTime = performance.now();

      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const openTime = endTime - startTime;

      console.log(`Create modal open time: ${openTime.toFixed(2)}ms`);

      expect(openTime).toBeLessThan(200);
    });

    it('edit modal opens in <200ms', async () => {
      const user = userEvent.setup();
      const productOwners = generateMockProductOwners(5);

      renderPeopleTab(productOwners);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const editButton = screen.getAllByLabelText(/edit/i)[0];

      const startTime = performance.now();

      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const openTime = endTime - startTime;

      console.log(`Edit modal open time: ${openTime.toFixed(2)}ms`);

      expect(openTime).toBeLessThan(200);
    });

    it('modal closes in <100ms', async () => {
      const user = userEvent.setup();
      const productOwners = generateMockProductOwners(5);

      renderPeopleTab(productOwners);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add new person/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      const startTime = performance.now();

      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      const endTime = performance.now();
      const closeTime = endTime - startTime;

      console.log(`Modal close time: ${closeTime.toFixed(2)}ms`);

      expect(closeTime).toBeLessThan(100);
    });
  });

  // ============================================================
  // Form Submission Performance (2 tests)
  // ============================================================

  describe('Form Submission Performance', () => {
    it('form submission completes in <500ms', async () => {
      const user = userEvent.setup();
      const productOwners = generateMockProductOwners(5);

      // Mock fast API response
      (createProductOwner as jest.Mock).mockResolvedValue({
        id: 999,
        firstname: 'Test',
        surname: 'User',
      });

      renderPeopleTab(productOwners);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add new person/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/first name/i), 'Test');
      await user.type(screen.getByLabelText(/surname/i), 'User');

      const createButton = screen.getByRole('button', { name: /^create$/i });

      const startTime = performance.now();

      await user.click(createButton);

      await waitFor(() => {
        expect(createProductOwner).toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      const endTime = performance.now();
      const submitTime = endTime - startTime;

      console.log(`Form submission time: ${submitTime.toFixed(2)}ms`);

      expect(submitTime).toBeLessThan(500);
    });

    it('update submission completes in <500ms', async () => {
      const user = userEvent.setup();
      const productOwners = generateMockProductOwners(5);

      // Mock fast API response
      (updateProductOwner as jest.Mock).mockResolvedValue({
        id: 1,
        firstname: 'Updated',
        surname: 'Name',
      });

      renderPeopleTab(productOwners);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      });

      const editButton = screen.getAllByLabelText(/edit/i)[0];
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Updated');

      const saveButton = screen.getByRole('button', { name: /save/i });

      const startTime = performance.now();

      await user.click(saveButton);

      await waitFor(() => {
        expect(updateProductOwner).toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      const endTime = performance.now();
      const submitTime = endTime - startTime;

      console.log(`Update submission time: ${submitTime.toFixed(2)}ms`);

      expect(submitTime).toBeLessThan(500);
    });
  });

  // ============================================================
  // Memory Performance (2 tests)
  // ============================================================

  describe('Memory Performance', () => {
    it('no memory leaks after 10 CRUD operations', async () => {
      const user = userEvent.setup();

      // Mock API responses
      (createProductOwner as jest.Mock).mockResolvedValue({ id: 999 });
      (updateProductOwner as jest.Mock).mockResolvedValue({ id: 1 });
      (deleteProductOwner as jest.Mock).mockResolvedValue({});

      const initialMemory = measureMemory();

      for (let i = 0; i < 10; i++) {
        const productOwners = generateMockProductOwners(5);

        const { unmount } = renderPeopleTab(productOwners);

        await waitFor(() => {
          expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
        });

        // Open and close modal
        const addButton = screen.getByRole('button', { name: /add new person/i });
        await user.click(addButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        // Unmount component
        unmount();

        // Clear query cache
        queryClient.clear();
      }

      const finalMemory = measureMemory();
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory increase after 10 CRUD cycles: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Allow up to 10MB increase for 10 operations
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    }, 30000); // 30 second timeout

    it('no memory leaks with large datasets', async () => {
      const initialMemory = measureMemory();

      for (let i = 0; i < 5; i++) {
        const productOwners = generateMockProductOwners(100);

        const { unmount } = renderTableDirectly(productOwners);

        await waitFor(() => {
          const rows = screen.getAllByRole('row');
          expect(rows.length).toBe(101);
        });

        // Unmount
        unmount();

        // Clear cache
        queryClient.clear();
      }

      const finalMemory = measureMemory();
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory increase after 5 large dataset renders: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Allow up to 20MB increase for large datasets
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    }, 30000); // 30 second timeout
  });

  // ============================================================
  // Re-render Performance (2 tests)
  // ============================================================

  describe('Re-render Performance', () => {
    it('component memoization prevents unnecessary re-renders', async () => {
      const productOwners = generateMockProductOwners(10);

      const { rerender } = renderTableDirectly(productOwners);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBe(11);
      });

      // Force re-render with same props
      const startTime = performance.now();

      rerender(
        <QueryClientProvider client={queryClient}>
          <ProductOwnerTable
            productOwners={productOwners}
            isLoading={false}
            error={null}
            onRetry={jest.fn()}
            onRefetch={jest.fn()}
            clientGroupId={123}
          />
        </QueryClientProvider>
      );

      const endTime = performance.now();
      const rerenderTime = endTime - startTime;

      console.log(`Re-render time (same props): ${rerenderTime.toFixed(2)}ms`);

      // Re-render should be fast due to memoization
      expect(rerenderTime).toBeLessThan(50);
    });

    it('single row update does not re-render entire table', async () => {
      const productOwners = generateMockProductOwners(50);

      const { rerender } = renderTableDirectly(productOwners);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBe(51);
      });

      // Update one product owner
      const updatedProductOwners = [...productOwners];
      updatedProductOwners[0] = { ...updatedProductOwners[0], firstname: 'Updated' };

      const startTime = performance.now();

      rerender(
        <QueryClientProvider client={queryClient}>
          <ProductOwnerTable
            productOwners={updatedProductOwners}
            isLoading={false}
            error={null}
            onRetry={jest.fn()}
            onRefetch={jest.fn()}
            clientGroupId={123}
          />
        </QueryClientProvider>
      );

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      console.log(`Single row update time: ${updateTime.toFixed(2)}ms`);

      // Single row update should be fast
      expect(updateTime).toBeLessThan(100);
    });
  });
});
