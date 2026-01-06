/**
 * SpecialRelationshipActions Component Tests (Cycle 4 - RED Phase)
 *
 * Tests for the action buttons component that handles status management
 * (Active/Inactive/Deceased) and deletion for special relationships.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 * These tests WILL FAIL because the component doesn't exist yet.
 *
 * @component SpecialRelationshipActions
 * @requirements
 * - Show Deactivate and Make Deceased buttons for active relationships
 * - Show Activate button for inactive relationships
 * - Show Delete button for inactive/deceased relationships (NOT active)
 * - Handle status change with optimistic updates
 * - Display success/error notifications
 * - Implement proper accessibility (ARIA labels, keyboard navigation)
 * - Open DeleteConfirmationModal on delete button click
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import SpecialRelationshipActions from '@/components/_archive/SpecialRelationshipActions';
import {
  SpecialRelationship,
  RelationshipStatus,
} from '@/types/specialRelationship';
import {
  useUpdateSpecialRelationshipStatus,
  useDeleteSpecialRelationship,
} from '@/hooks/useSpecialRelationships';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock the hooks
jest.mock('@/hooks/useSpecialRelationships', () => ({
  useUpdateSpecialRelationshipStatus: jest.fn(),
  useDeleteSpecialRelationship: jest.fn(),
}));

// Create test query client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Factory functions for test data
const createActiveRelationship = (
  overrides?: Partial<SpecialRelationship>
): SpecialRelationship => ({
  id: 101,
  product_owner_ids: [123],
  type: 'Personal',
  relationship: 'Spouse',
  status: 'Active',
  title: 'Mrs',
  name: 'Jane Smith',
  date_of_birth: '1960-05-15',
  email: 'jane.smith@example.com',
  phone_number: '+44-7700-900001',
  address_id: null,
  address_line1: '123 Main St',
  address_line2: null,
  city: 'London',
  county: null,
  postcode: 'SW1A 1AA',
  country: 'United Kingdom',
  notes: null,
  firm_name: null,
  dependency: false,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  ...overrides,
});

const createInactiveRelationship = (
  overrides?: Partial<SpecialRelationship>
): SpecialRelationship => ({
  ...createActiveRelationship(),
  id: 102,
  status: 'Inactive',
  ...overrides,
});

const createDeceasedRelationship = (
  overrides?: Partial<SpecialRelationship>
): SpecialRelationship => ({
  ...createActiveRelationship(),
  id: 103,
  status: 'Deceased',
  ...overrides,
});

describe('SpecialRelationshipActions Component', () => {
  let queryClient: QueryClient;

  const mockMutate = jest.fn();
  const mockMutateAsync = jest.fn();
  const mockUpdateStatusMutation = {
    mutate: mockMutate,
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  };

  const mockDeleteMutate = jest.fn();
  const mockDeleteMutateAsync = jest.fn();
  const mockDeleteMutation = {
    mutate: mockDeleteMutate,
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  };

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();

    (useUpdateSpecialRelationshipStatus as jest.Mock).mockReturnValue(
      mockUpdateStatusMutation
    );
    (useDeleteSpecialRelationship as jest.Mock).mockReturnValue(
      mockDeleteMutation
    );
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // =================================================================
  // Button Visibility Tests
  // =================================================================

  describe('Button Visibility', () => {
    it('shows Deactivate button for active relationships', () => {
      const activeRelationship = createActiveRelationship();

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      expect(
        screen.getByRole('button', { name: /deactivate/i })
      ).toBeInTheDocument();
    });

    it('shows Make Deceased button for active relationships', () => {
      const activeRelationship = createActiveRelationship();

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      expect(
        screen.getByRole('button', { name: /mark deceased|deceased/i })
      ).toBeInTheDocument();
    });

    it('shows Activate button for inactive relationships', () => {
      const inactiveRelationship = createInactiveRelationship();

      render(
        <SpecialRelationshipActions relationship={inactiveRelationship} />,
        { wrapper }
      );

      expect(
        screen.getByRole('button', { name: /activate/i })
      ).toBeInTheDocument();
    });

    it('shows Activate button for deceased relationships', () => {
      const deceasedRelationship = createDeceasedRelationship();

      render(
        <SpecialRelationshipActions relationship={deceasedRelationship} />,
        { wrapper }
      );

      expect(
        screen.getByRole('button', { name: /activate/i })
      ).toBeInTheDocument();
    });

    it('hides Delete button for active relationships', () => {
      const activeRelationship = createActiveRelationship();

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      expect(
        screen.queryByRole('button', { name: /delete/i })
      ).not.toBeInTheDocument();
    });

    it('shows Delete button for inactive relationships', () => {
      const inactiveRelationship = createInactiveRelationship();

      render(
        <SpecialRelationshipActions relationship={inactiveRelationship} />,
        { wrapper }
      );

      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();
    });

    it('shows Delete button for deceased relationships', () => {
      const deceasedRelationship = createDeceasedRelationship();

      render(
        <SpecialRelationshipActions relationship={deceasedRelationship} />,
        { wrapper }
      );

      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();
    });
  });

  // =================================================================
  // Status Change Interaction Tests
  // =================================================================

  describe('Status Change Interactions', () => {
    it('calls status change mutation on Deactivate button click', async () => {
      const user = userEvent.setup();
      const activeRelationship = createActiveRelationship({ id: 123 });

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      const deactivateButton = screen.getByRole('button', {
        name: /deactivate/i,
      });
      await user.click(deactivateButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          id: 123,
          status: 'Inactive',
        });
      });
    });

    it('calls status change mutation on Make Deceased button click', async () => {
      const user = userEvent.setup();
      const activeRelationship = createActiveRelationship({ id: 456 });

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      const deceasedButton = screen.getByRole('button', {
        name: /mark deceased|deceased/i,
      });
      await user.click(deceasedButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          id: 456,
          status: 'Deceased',
        });
      });
    });

    it('calls status change mutation on Activate button click', async () => {
      const user = userEvent.setup();
      const inactiveRelationship = createInactiveRelationship({
        id: 789,
      });

      render(
        <SpecialRelationshipActions relationship={inactiveRelationship} />,
        { wrapper }
      );

      const activateButton = screen.getByRole('button', { name: /activate/i });
      await user.click(activateButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          id: 789,
          status: 'Active',
        });
      });
    });
  });

  // =================================================================
  // Loading State Tests
  // =================================================================

  describe('Loading States', () => {
    it('disables buttons during status change operation', () => {
      const activeRelationship = createActiveRelationship();

      (useUpdateSpecialRelationshipStatus as jest.Mock).mockReturnValue({
        ...mockUpdateStatusMutation,
        isPending: true,
      });

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      const deactivateButton = screen.getByRole('button', {
        name: /deactivate|deactivating/i,
      });
      const deceasedButton = screen.getByRole('button', {
        name: /mark deceased|deceased|marking/i,
      });

      expect(deactivateButton).toBeDisabled();
      expect(deceasedButton).toBeDisabled();
    });

    it('shows loading state on status change button', () => {
      const activeRelationship = createActiveRelationship();

      (useUpdateSpecialRelationshipStatus as jest.Mock).mockReturnValue({
        ...mockUpdateStatusMutation,
        isPending: true,
      });

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      // Button text should indicate loading state
      expect(
        screen.getByText(/deactivating|marking|processing/i)
      ).toBeInTheDocument();
    });

    it('disables Delete button during delete operation', () => {
      const inactiveRelationship = createInactiveRelationship();

      (useDeleteSpecialRelationship as jest.Mock).mockReturnValue({
        ...mockDeleteMutation,
        isPending: true,
      });

      render(
        <SpecialRelationshipActions relationship={inactiveRelationship} />,
        { wrapper }
      );

      const deleteButton = screen.getByRole('button', {
        name: /delete|deleting/i,
      });

      expect(deleteButton).toBeDisabled();
    });
  });

  // =================================================================
  // Delete Functionality Tests
  // =================================================================

  describe('Delete Functionality', () => {
    it('opens DeleteConfirmationModal when Delete button clicked', async () => {
      const user = userEvent.setup();
      const inactiveRelationship = createInactiveRelationship();

      render(
        <SpecialRelationshipActions relationship={inactiveRelationship} />,
        { wrapper }
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // DeleteConfirmationModal should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('calls delete mutation when deletion confirmed', async () => {
      const user = userEvent.setup();
      const inactiveRelationship = createInactiveRelationship({
        id: 999,
      });

      render(
        <SpecialRelationshipActions relationship={inactiveRelationship} />,
        { wrapper }
      );

      // Open modal
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', {
        name: /confirm|delete/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteMutate).toHaveBeenCalledWith(999);
      });
    });

    it('closes modal when Cancel clicked', async () => {
      const user = userEvent.setup();
      const inactiveRelationship = createInactiveRelationship();

      render(
        <SpecialRelationshipActions relationship={inactiveRelationship} />,
        { wrapper }
      );

      // Open modal
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Cancel deletion
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('does not call delete mutation when cancelled', async () => {
      const user = userEvent.setup();
      const inactiveRelationship = createInactiveRelationship();

      render(
        <SpecialRelationshipActions relationship={inactiveRelationship} />,
        { wrapper }
      );

      // Open and cancel
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Delete should not be called
      expect(mockDeleteMutate).not.toHaveBeenCalled();
    });
  });

  // =================================================================
  // Keyboard Navigation Tests
  // =================================================================

  describe('Keyboard Navigation', () => {
    it('supports Tab navigation through buttons', async () => {
      const user = userEvent.setup();
      const activeRelationship = createActiveRelationship();

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      const deactivateButton = screen.getByRole('button', {
        name: /deactivate/i,
      });
      const deceasedButton = screen.getByRole('button', {
        name: /mark deceased|deceased/i,
      });

      // Tab to first button
      await user.tab();
      expect(document.activeElement).toBe(deactivateButton);

      // Tab to second button
      await user.tab();
      expect(document.activeElement).toBe(deceasedButton);
    });

    it('supports Enter key to activate buttons', async () => {
      const user = userEvent.setup();
      const activeRelationship = createActiveRelationship({ id: 111 });

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      const deactivateButton = screen.getByRole('button', {
        name: /deactivate/i,
      });
      deactivateButton.focus();

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          id: 111,
          status: 'Inactive',
        });
      });
    });

    it('supports Space key to activate buttons', async () => {
      const user = userEvent.setup();
      const activeRelationship = createActiveRelationship({ id: 222 });

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      const deceasedButton = screen.getByRole('button', {
        name: /mark deceased|deceased/i,
      });
      deceasedButton.focus();

      await user.keyboard(' ');

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          id: 222,
          status: 'Deceased',
        });
      });
    });
  });

  // =================================================================
  // Accessibility Tests with jest-axe
  // =================================================================

  describe('Accessibility', () => {
    it('should have no accessibility violations for active relationship', async () => {
      const activeRelationship = createActiveRelationship();

      const { container } = render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations for inactive relationship', async () => {
      const inactiveRelationship = createInactiveRelationship();

      const { container } = render(
        <SpecialRelationshipActions relationship={inactiveRelationship} />,
        { wrapper }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations for deceased relationship', async () => {
      const deceasedRelationship = createDeceasedRelationship();

      const { container } = render(
        <SpecialRelationshipActions relationship={deceasedRelationship} />,
        { wrapper }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has descriptive ARIA labels on buttons with relationship name', () => {
      const activeRelationship = createActiveRelationship({
        name: 'Jane Smith',
      });

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      const deactivateButton = screen.getByRole('button', {
        name: /deactivate/i,
      });

      // Button should have aria-label with relationship name
      const ariaLabel = deactivateButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('Jane Smith');
    });

    it('has proper button type attributes', () => {
      const activeRelationship = createActiveRelationship();

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      const deactivateButton = screen.getByRole('button', {
        name: /deactivate/i,
      });
      const deceasedButton = screen.getByRole('button', {
        name: /mark deceased|deceased/i,
      });

      // All buttons should have type="button" to prevent form submission
      expect(deactivateButton).toHaveAttribute('type', 'button');
      expect(deceasedButton).toHaveAttribute('type', 'button');
    });

    it('has visible focus indicators on all buttons', () => {
      const activeRelationship = createActiveRelationship();

      render(
        <SpecialRelationshipActions relationship={activeRelationship} />,
        { wrapper }
      );

      const deactivateButton = screen.getByRole('button', {
        name: /deactivate/i,
      });

      // Button should have focus-visible classes
      const buttonClasses = deactivateButton.className;
      expect(
        buttonClasses.includes('focus:ring') ||
          buttonClasses.includes('focus:outline')
      ).toBe(true);
    });

    it('Delete button has destructive styling (red)', () => {
      const inactiveRelationship = createInactiveRelationship();

      render(
        <SpecialRelationshipActions relationship={inactiveRelationship} />,
        { wrapper }
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });

      // Delete button should have red/destructive styling
      const buttonClasses = deleteButton.className;
      expect(
        buttonClasses.includes('red') ||
          buttonClasses.includes('danger') ||
          buttonClasses.includes('destructive')
      ).toBe(true);
    });
  });

  // =================================================================
  // Event Propagation Tests
  // =================================================================

  describe('Event Propagation', () => {
    it('stops propagation on button clicks to prevent row click', async () => {
      const user = userEvent.setup();
      const activeRelationship = createActiveRelationship();
      const mockRowClick = jest.fn();

      render(
        <div onClick={mockRowClick}>
          <SpecialRelationshipActions relationship={activeRelationship} />
        </div>,
        { wrapper }
      );

      const deactivateButton = screen.getByRole('button', {
        name: /deactivate/i,
      });
      await user.click(deactivateButton);

      // Row click handler should NOT be called
      expect(mockRowClick).not.toHaveBeenCalled();
    });

    it('stops propagation on keyboard events', async () => {
      const user = userEvent.setup();
      const activeRelationship = createActiveRelationship();
      const mockKeyDown = jest.fn();

      render(
        <div onKeyDown={mockKeyDown}>
          <SpecialRelationshipActions relationship={activeRelationship} />
        </div>,
        { wrapper }
      );

      const deactivateButton = screen.getByRole('button', {
        name: /deactivate/i,
      });
      deactivateButton.focus();
      await user.keyboard('{Enter}');

      // Parent keyDown should NOT be triggered
      expect(mockKeyDown).not.toHaveBeenCalled();
    });
  });
});
