/**
 * SpecialRelationshipsSubTab Component Tests (Cycle 8 - RED Phase)
 *
 * Comprehensive test suite for the main container component that orchestrates
 * the Special Relationships feature.
 *
 * This container component:
 * - Manages tab switching between Personal/Professional relationships
 * - Fetches data using useSpecialRelationships hook (Cycle 3)
 * - Renders appropriate tables based on active tab (Cycle 6)
 * - Opens create/edit modals (Cycle 7)
 * - Handles loading, error, and empty states
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @component SpecialRelationshipsSubTab
 * @requirements
 * - Tab navigation between Personal/Professional
 * - Data fetching with loading state
 * - Error handling with retry capability
 * - Empty state display
 * - Create button opens correct modal type
 * - Table rendering based on active tab
 * - Full integration test of component tree
 * - Accessibility compliance
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { createTestQueryClient, cleanupQueryClient } from '../utils/testUtils';
import SpecialRelationshipsSubTab from '@/components/SpecialRelationshipsSubTab';
import { useSpecialRelationships } from '@/hooks/useSpecialRelationships';
import {
  createMockPersonalRelationship,
  createMockProfessionalRelationship,
  createMockRelationshipArray,
} from '../factories/specialRelationshipFactory';

expect.extend(toHaveNoViolations);

// Mock the useSpecialRelationships hook
jest.mock('@/hooks/useSpecialRelationships', () => ({
  useSpecialRelationships: jest.fn(),
  useCreateSpecialRelationship: jest.fn(),
  useUpdateSpecialRelationship: jest.fn(),
  useUpdateSpecialRelationshipStatus: jest.fn(),
  useDeleteSpecialRelationship: jest.fn(),
}));

const mockedUseSpecialRelationships = useSpecialRelationships as jest.MockedFunction<
  typeof useSpecialRelationships
>;

// Import the mocked module to access mutation hooks
const useSpecialRelationshipsMock = jest.requireMock('@/hooks/useSpecialRelationships');

describe('SpecialRelationshipsSubTab Component', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;
  const mockClientGroupId = 'group-001';

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();

    // Default mock - successful data fetch with mixed relationships
    const mockRelationships = createMockRelationshipArray(6, { type: 'mixed' });
    mockedUseSpecialRelationships.mockReturnValue({
      data: mockRelationships,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isSuccess: true,
      isFetching: false,
      isPending: false,
      isRefetching: false,
      status: 'success',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isLoadingError: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isStale: false,
    } as any);

    // Mock mutation hooks with default values
    useSpecialRelationshipsMock.useCreateSpecialRelationship.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: jest.fn(),
    } as any);

    useSpecialRelationshipsMock.useUpdateSpecialRelationship.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: jest.fn(),
    } as any);

    useSpecialRelationshipsMock.useUpdateSpecialRelationshipStatus.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: jest.fn(),
    } as any);

    useSpecialRelationshipsMock.useDeleteSpecialRelationship.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: jest.fn(),
    } as any);
  });

  afterEach(() => {
    cleanupQueryClient(queryClient);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // =================================================================
  // Component Rendering Tests
  // =================================================================

  describe('Component Rendering', () => {
    it('renders container component', () => {
      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('renders tab navigation', () => {
      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(screen.getByRole('tab', { name: /personal/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /professional/i })).toBeInTheDocument();
    });

    it('renders create button', () => {
      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(
        screen.getByRole('button', { name: /add (personal|professional) relationship/i })
      ).toBeInTheDocument();
    });

    it('renders Personal tab as active by default', () => {
      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      expect(personalTab).toHaveAttribute('aria-selected', 'true');
    });

    it('renders Professional tab as inactive by default', () => {
      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      expect(professionalTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  // =================================================================
  // Tab Switching Tests
  // =================================================================

  describe('Tab Switching', () => {
    it('switches to Professional tab when clicked', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      await user.click(professionalTab);

      expect(professionalTab).toHaveAttribute('aria-selected', 'true');
    });

    it('switches back to Personal tab when clicked', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      const personalTab = screen.getByRole('tab', { name: /personal/i });

      // Switch to Professional
      await user.click(professionalTab);
      expect(professionalTab).toHaveAttribute('aria-selected', 'true');

      // Switch back to Personal
      await user.click(personalTab);
      expect(personalTab).toHaveAttribute('aria-selected', 'true');
      expect(professionalTab).toHaveAttribute('aria-selected', 'false');
    });

    it('updates create button text based on active tab', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Default Personal tab
      expect(
        screen.getByRole('button', { name: /add personal relationship/i })
      ).toBeInTheDocument();

      // Switch to Professional tab
      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      await user.click(professionalTab);

      expect(
        screen.getByRole('button', { name: /add professional relationship/i })
      ).toBeInTheDocument();
    });

    it('renders correct table based on active tab', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Personal tab should show Date of Birth column
      expect(screen.getByText('Date of Birth')).toBeInTheDocument();
      expect(screen.queryByText('Company')).not.toBeInTheDocument();

      // Switch to Professional tab
      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      await user.click(professionalTab);

      // Professional tab should show Company column
      await waitFor(() => {
        expect(screen.getByText('Company')).toBeInTheDocument();
        expect(screen.queryByText('Date of Birth')).not.toBeInTheDocument();
      });
    });
  });

  // =================================================================
  // Data Fetching Tests
  // =================================================================

  describe('Data Fetching', () => {
    it('calls useSpecialRelationships hook with clientGroupId', () => {
      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(mockedUseSpecialRelationships).toHaveBeenCalledWith(
        mockClientGroupId,
        expect.any(Object)
      );
    });

    it('filters personal relationships when Personal tab is active', () => {
      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Should call hook without professional filter (or with personal filter)
      expect(mockedUseSpecialRelationships).toHaveBeenCalled();
    });

    it('filters professional relationships when Professional tab is active', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      await user.click(professionalTab);

      // Should have been called again with different filter
      expect(mockedUseSpecialRelationships).toHaveBeenCalledTimes(2);
    });

    it('separates personal and professional relationships correctly', () => {
      const personalRelationships = [
        createMockPersonalRelationship({ id: 'rel-1', relationship_type: 'Spouse' }),
        createMockPersonalRelationship({ id: 'rel-2', relationship_type: 'Child' }),
      ];
      const professionalRelationships = [
        createMockProfessionalRelationship({ id: 'rel-3', relationship_type: 'Accountant' }),
      ];

      mockedUseSpecialRelationships.mockReturnValue({
        data: [...personalRelationships, ...professionalRelationships],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Personal tab should only show personal relationships
      expect(screen.getByText('Spouse')).toBeInTheDocument();
      expect(screen.getByText('Child')).toBeInTheDocument();
      expect(screen.queryByText('Accountant')).not.toBeInTheDocument();
    });
  });

  // =================================================================
  // Loading State Tests
  // =================================================================

  describe('Loading State', () => {
    it('shows skeleton loader while fetching data', () => {
      mockedUseSpecialRelationships.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(screen.getByLabelText(/loading relationships/i)).toBeInTheDocument();
    });

    it('hides skeleton loader after data loads', async () => {
      const mockRelationships = createMockRelationshipArray(3, { type: 'personal' });

      mockedUseSpecialRelationships.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { rerender } = render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(screen.getByLabelText(/loading relationships/i)).toBeInTheDocument();

      // Simulate data loaded
      mockedUseSpecialRelationships.mockReturnValue({
        data: mockRelationships,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      rerender(
        <QueryClientProvider client={queryClient}>
          <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.queryByLabelText(/loading relationships/i)).not.toBeInTheDocument();
      });
    });

    it('does not render create button while loading', () => {
      mockedUseSpecialRelationships.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(
        screen.queryByRole('button', { name: /add relationship/i })
      ).not.toBeInTheDocument();
    });
  });

  // =================================================================
  // Error State Tests
  // =================================================================

  describe('Error State', () => {
    it('shows error message when data fetch fails', () => {
      mockedUseSpecialRelationships.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(screen.getByText('Unable to load relationships')).toBeInTheDocument();
    });

    it('renders retry button on error', () => {
      mockedUseSpecialRelationships.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = jest.fn();

      mockedUseSpecialRelationships.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('hides create button on error', () => {
      mockedUseSpecialRelationships.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(
        screen.queryByRole('button', { name: /add relationship/i })
      ).not.toBeInTheDocument();
    });
  });

  // =================================================================
  // Empty State Tests
  // =================================================================

  describe('Empty State', () => {
    it('shows personal empty state when no personal relationships', () => {
      mockedUseSpecialRelationships.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(screen.getByText('No personal relationships yet')).toBeInTheDocument();
    });

    it('shows professional empty state when no professional relationships', async () => {
      const user = userEvent.setup();

      mockedUseSpecialRelationships.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      await user.click(professionalTab);

      expect(screen.getByText('No professional relationships yet')).toBeInTheDocument();
    });

    it('renders add button in empty state', () => {
      mockedUseSpecialRelationships.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(
        screen.getByRole('button', { name: /add personal relationship/i })
      ).toBeInTheDocument();
    });
  });

  // =================================================================
  // Create Button Tests
  // =================================================================

  describe('Create Button', () => {
    it('opens CreateSpecialRelationshipModal when create button clicked', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const createButton = screen.getByRole('button', {
        name: /add personal relationship/i,
      });
      await user.click(createButton);

      // Modal should be opened (check for modal dialog)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('opens modal with isProfessional=false for Personal tab', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const createButton = screen.getByRole('button', {
        name: /add personal relationship/i,
      });
      await user.click(createButton);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /add personal relationship/i })
        ).toBeInTheDocument();
      });
    });

    it('opens modal with isProfessional=true for Professional tab', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Switch to Professional tab
      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      await user.click(professionalTab);

      // Click create button
      const createButton = screen.getByRole('button', {
        name: /add professional relationship/i,
      });
      await user.click(createButton);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /add professional relationship/i })
        ).toBeInTheDocument();
      });
    });

    it('closes modal when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const createButton = screen.getByRole('button', {
        name: /add personal relationship/i,
      });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // =================================================================
  // Table Rendering Tests
  // =================================================================

  describe('Table Rendering', () => {
    it('renders PersonalRelationshipsTable with personal data', () => {
      const personalRelationships = createMockRelationshipArray(3, {
        category: 'personal',
      });

      mockedUseSpecialRelationships.mockReturnValue({
        data: personalRelationships,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Should render table with correct columns
      expect(screen.getByText('Date of Birth')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();

      // Should have correct number of rows (header + 3 data)
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(4);
    });

    it('renders ProfessionalRelationshipsTable with professional data', async () => {
      const user = userEvent.setup();
      const professionalRelationships = createMockRelationshipArray(2, {
        category: 'professional',
      });

      mockedUseSpecialRelationships.mockReturnValue({
        data: professionalRelationships,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Switch to Professional tab
      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      await user.click(professionalTab);

      await waitFor(() => {
        expect(screen.getByText('Company')).toBeInTheDocument();
        expect(screen.getByText('Position')).toBeInTheDocument();
      });

      // Should have correct number of rows (header + 2 data)
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(3);
    });

    it('passes correct event handlers to table', () => {
      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Table should have edit and delete buttons
      expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(3);
      expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(3);
    });
  });

  // =================================================================
  // Integration Tests
  // =================================================================

  describe('Integration Tests', () => {
    it('full component tree renders without errors', () => {
      const { container } = render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(container).toBeTruthy();
    });

    it('data flows from hook to table correctly', () => {
      const relationship = createMockPersonalRelationship({
        id: 'rel-test',
        first_name: 'Integration',
        last_name: 'Test',
        relationship_type: 'Spouse',
      });

      mockedUseSpecialRelationships.mockReturnValue({
        data: [relationship],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      expect(screen.getByText('Integration')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('Spouse')).toBeInTheDocument();
    });

    it('tab switching updates table content', async () => {
      const user = userEvent.setup();
      const personalRel = createMockPersonalRelationship({
        first_name: 'Personal',
        relationship_type: 'Spouse',
      });
      const professionalRel = createMockProfessionalRelationship({
        first_name: 'Professional',
        relationship_type: 'Accountant',
      });

      mockedUseSpecialRelationships.mockReturnValue({
        data: [personalRel, professionalRel],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Personal tab shows personal relationship
      expect(screen.getByText('Spouse')).toBeInTheDocument();
      expect(screen.queryByText('Accountant')).not.toBeInTheDocument();

      // Switch to Professional tab
      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      await user.click(professionalTab);

      // Professional tab shows professional relationship
      await waitFor(() => {
        expect(screen.getByText('Accountant')).toBeInTheDocument();
        expect(screen.queryByText('Spouse')).not.toBeInTheDocument();
      });
    });

    it('handles modal submission and table update', async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();

      // Mock the create mutation
      jest.requireMock('@/hooks/useSpecialRelationships').useCreateSpecialRelationship.mockReturnValue({
        mutate: mockMutate,
        mutateAsync: jest.fn(),
        isPending: false,
      } as any);

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Open modal
      const createButton = screen.getByRole('button', {
        name: /add personal relationship/i,
      });
      await user.click(createButton);

      // Modal should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  // =================================================================
  // Accessibility Tests
  // =================================================================

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('tab navigation has correct ARIA attributes', () => {
      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      expect(personalTab).toHaveAttribute('aria-selected', 'true');
      expect(professionalTab).toHaveAttribute('aria-selected', 'false');
    });

    it('keyboard navigation works for tabs', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      personalTab.focus();

      // Press right arrow to move to next tab
      await user.keyboard('{ArrowRight}');

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      expect(professionalTab).toHaveFocus();
    });

    it('all interactive elements are keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <SpecialRelationshipsSubTab clientGroupId={mockClientGroupId} />,
        { wrapper }
      );

      // Tab through all interactive elements
      await user.tab(); // First tab
      await user.tab(); // Second tab
      await user.tab(); // Create button

      const createButton = screen.getByRole('button', {
        name: /add personal relationship/i,
      });
      expect(createButton).toHaveFocus();

      // Should be able to activate with Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});
