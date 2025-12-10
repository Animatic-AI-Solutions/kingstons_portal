/**
 * ProductOwnerActions Component Tests (RED Phase - Iteration 4)
 *
 * Tests for the status management action buttons component that handles
 * Lapse, Make Deceased, and Reactivate operations for product owners.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @component ProductOwnerActions
 * @requirements
 * - Show Lapse and Make Deceased buttons for active product owners
 * - Show Reactivate and Delete buttons for lapsed/deceased product owners
 * - Handle status change API calls with loading states
 * - Display success/error notifications
 * - Refetch data after successful status changes
 * - Optimistic UI updates (optional)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createActiveProductOwner,
  createLapsedProductOwner,
  createDeceasedProductOwner,
} from '../factories/productOwnerFactory';
import ProductOwnerActions from '@/components/ProductOwnerActions';
import { updateProductOwnerStatus } from '@/services/api/updateProductOwner';
import { deleteProductOwner } from '@/services/api/deleteProductOwner';
import toast from 'react-hot-toast';

// Mock the API modules (matching the actual import paths in the component)
jest.mock('@/services/api/updateProductOwner', () => ({
  updateProductOwnerStatus: jest.fn(),
}));

jest.mock('@/services/api/deleteProductOwner', () => ({
  deleteProductOwner: jest.fn(),
}));

// Mock error handling utilities
jest.mock('@/utils/errorHandling', () => ({
  formatApiError: jest.fn((error) => error.response?.data?.detail || error.message || 'An error occurred'),
}));

// Mock notification system (react-hot-toast)
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Create a test query client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // React Query v5: renamed from cacheTime
      },
      mutations: {
        retry: false,
      },
    },
    // Note: logger option removed in React Query v5
  });
};

describe('ProductOwnerActions Component', () => {
  let queryClient: QueryClient;
  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
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
    it('shows Lapse button for active product owners', () => {
      const activeProductOwner = createActiveProductOwner();

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      // Active product owners should have a Lapse button
      expect(screen.getByRole('button', { name: /lapse/i })).toBeInTheDocument();
    });

    it('shows Make Deceased button for active product owners', () => {
      const activeProductOwner = createActiveProductOwner();

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      // Active product owners should have a Make Deceased button
      expect(screen.getByRole('button', { name: /make deceased|deceased/i })).toBeInTheDocument();
    });

    it('shows Reactivate button for lapsed product owners', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <ProductOwnerActions
          productOwner={lapsedProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      // Lapsed product owners should have a Reactivate button
      expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
    });

    it('shows Reactivate button for deceased product owners', () => {
      const deceasedProductOwner = createDeceasedProductOwner();

      render(
        <ProductOwnerActions
          productOwner={deceasedProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      // Deceased product owners should have a Reactivate button
      expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
    });

    it('hides Delete button for active product owners', () => {
      const activeProductOwner = createActiveProductOwner();

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      // Active product owners should NOT have a Delete button visible
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('shows Delete button for lapsed product owners', () => {
      const lapsedProductOwner = createLapsedProductOwner();

      render(
        <ProductOwnerActions
          productOwner={lapsedProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      // Lapsed product owners should have a Delete button
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('shows Delete button for deceased product owners', () => {
      const deceasedProductOwner = createDeceasedProductOwner();

      render(
        <ProductOwnerActions
          productOwner={deceasedProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      // Deceased product owners should have a Delete button
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });

  // =================================================================
  // Status Change API Call Tests
  // =================================================================

  describe('Status Change API Calls', () => {
    it('calls status change API on Lapse button click', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({ id: 123 });
      (updateProductOwnerStatus as jest.Mock).mockResolvedValue({
        data: { ...activeProductOwner, status: 'lapsed' },
      });

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const lapseButton = screen.getByRole('button', { name: /lapse/i });
      await user.click(lapseButton);

      await waitFor(() => {
        expect(updateProductOwnerStatus).toHaveBeenCalledWith(123, 'lapsed');
      });
    });

    it('calls status change API on Make Deceased button click', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({ id: 456 });
      (updateProductOwnerStatus as jest.Mock).mockResolvedValue({
        data: { ...activeProductOwner, status: 'deceased' },
      });

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const deceasedButton = screen.getByRole('button', { name: /make deceased|deceased/i });
      await user.click(deceasedButton);

      await waitFor(() => {
        expect(updateProductOwnerStatus).toHaveBeenCalledWith(456, 'deceased');
      });
    });

    it('calls status change API on Reactivate button click', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner({ id: 789 });
      (updateProductOwnerStatus as jest.Mock).mockResolvedValue({
        data: { ...lapsedProductOwner, status: 'active' },
      });

      render(
        <ProductOwnerActions
          productOwner={lapsedProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const reactivateButton = screen.getByRole('button', { name: /reactivate/i });
      await user.click(reactivateButton);

      await waitFor(() => {
        expect(updateProductOwnerStatus).toHaveBeenCalledWith(789, 'active');
      });
    });
  });

  // =================================================================
  // Loading State Tests
  // =================================================================

  describe('Loading States', () => {
    it('shows loading state during Lapse operation', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({ id: 123 });

      // Create a promise we can control
      let resolvePromise: (value: any) => void;
      (updateProductOwnerStatus as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      });

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const lapseButton = screen.getByRole('button', { name: /lapse/i });
      await user.click(lapseButton);

      // Button should show loading state
      await waitFor(() => {
        expect(lapseButton).toBeDisabled();
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });

      // Clean up
      resolvePromise!({ data: { ...activeProductOwner, status: 'lapsed' } });
    });

    it('shows loading state during Make Deceased operation', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({ id: 456 });

      // Create a promise we can control
      let resolvePromise: (value: any) => void;
      (updateProductOwnerStatus as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      });

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const deceasedButton = screen.getByRole('button', { name: /make deceased|deceased/i });
      await user.click(deceasedButton);

      // Button should show loading state
      await waitFor(() => {
        expect(deceasedButton).toBeDisabled();
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });

      // Clean up
      resolvePromise!({ data: { ...activeProductOwner, status: 'deceased' } });
    });

    it('shows loading state during Reactivate operation', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner({ id: 789 });

      // Create a promise we can control
      let resolvePromise: (value: any) => void;
      (updateProductOwnerStatus as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      });

      render(
        <ProductOwnerActions
          productOwner={lapsedProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const reactivateButton = screen.getByRole('button', { name: /reactivate/i });
      await user.click(reactivateButton);

      // Button should show loading state
      await waitFor(() => {
        expect(reactivateButton).toBeDisabled();
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });

      // Clean up
      resolvePromise!({ data: { ...lapsedProductOwner, status: 'active' } });
    });
  });

  // =================================================================
  // Success Handling Tests
  // =================================================================

  describe('Success Handling', () => {
    it('displays success notification on successful lapse', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({ id: 123 });
      (updateProductOwnerStatus as jest.Mock).mockResolvedValue({
        data: { ...activeProductOwner, status: 'lapsed' },
      });

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const lapseButton = screen.getByRole('button', { name: /lapse/i });
      await user.click(lapseButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('lapsed')
        );
      });
    });

    it('displays success notification on successful deceased', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({ id: 456 });
      (updateProductOwnerStatus as jest.Mock).mockResolvedValue({
        data: { ...activeProductOwner, status: 'deceased' },
      });

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const deceasedButton = screen.getByRole('button', { name: /make deceased|deceased/i });
      await user.click(deceasedButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('deceased')
        );
      });
    });

    it('displays success notification on successful reactivate', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner({ id: 789 });
      (updateProductOwnerStatus as jest.Mock).mockResolvedValue({
        data: { ...lapsedProductOwner, status: 'active' },
      });

      render(
        <ProductOwnerActions
          productOwner={lapsedProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const reactivateButton = screen.getByRole('button', { name: /reactivate/i });
      await user.click(reactivateButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('reactivated')
        );
      });
    });

    it('refetches product owners after status change', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({ id: 123 });
      (updateProductOwnerStatus as jest.Mock).mockResolvedValue({
        data: { ...activeProductOwner, status: 'lapsed' },
      });

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const lapseButton = screen.getByRole('button', { name: /lapse/i });
      await user.click(lapseButton);

      await waitFor(() => {
        // onStatusChange callback should be called to trigger refetch
        expect(mockOnStatusChange).toHaveBeenCalled();
      });
    });
  });

  // =================================================================
  // Error Handling Tests
  // =================================================================

  describe('Error Handling', () => {
    it('displays error notification on failed lapse', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({ id: 123 });

      (updateProductOwnerStatus as jest.Mock).mockRejectedValue(
        new Error('Failed to update status')
      );

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const lapseButton = screen.getByRole('button', { name: /lapse/i });
      await user.click(lapseButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed')
        );
      });
    });

    it('displays error notification on failed deceased', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({ id: 456 });

      (updateProductOwnerStatus as jest.Mock).mockRejectedValue(
        new Error('Failed to update status')
      );

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const deceasedButton = screen.getByRole('button', { name: /make deceased|deceased/i });
      await user.click(deceasedButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed')
        );
      });
    });

    it('displays error notification on failed reactivate', async () => {
      const user = userEvent.setup();
      const lapsedProductOwner = createLapsedProductOwner({ id: 789 });

      (updateProductOwnerStatus as jest.Mock).mockRejectedValue(
        new Error('Failed to update status')
      );

      render(
        <ProductOwnerActions
          productOwner={lapsedProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const reactivateButton = screen.getByRole('button', { name: /reactivate/i });
      await user.click(reactivateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed')
        );
      });
    });
  });

  // =================================================================
  // Optimistic Updates Tests (Optional)
  // =================================================================

  describe('Optimistic Updates', () => {
    it('shows optimistic UI update during status change', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({
        id: 123,
        firstname: 'John',
        surname: 'Smith'
      });

      // Create a promise we can control
      let resolvePromise: (value: any) => void;
      (updateProductOwnerStatus as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      });

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const lapseButton = screen.getByRole('button', { name: /lapse/i });
      await user.click(lapseButton);

      // UI should optimistically update (e.g., show "Lapsing..." or disable certain actions)
      await waitFor(() => {
        expect(lapseButton).toBeDisabled();
      });

      // Clean up
      resolvePromise!({ data: { ...activeProductOwner, status: 'lapsed' } });
    });

    it('reverts optimistic update on error', async () => {
      const user = userEvent.setup();
      const activeProductOwner = createActiveProductOwner({
        id: 123,
        firstname: 'John',
        surname: 'Smith'
      });

      const mockUpdateStatus = jest.fn().mockRejectedValue(
        new Error('Network error')
      );
      (updateProductOwnerStatus as jest.Mock) = mockUpdateStatus;

      render(
        <ProductOwnerActions
          productOwner={activeProductOwner}
          onStatusChange={mockOnStatusChange}
        />,
        { wrapper }
      );

      const lapseButton = screen.getByRole('button', { name: /lapse/i });
      await user.click(lapseButton);

      // After error, UI should revert to original state
      await waitFor(() => {
        // Button should be re-enabled after error
        expect(lapseButton).not.toBeDisabled();
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  // =================================================================
  // Delete Functionality Tests (Iteration 5)
  // =================================================================

  describe('Delete Functionality', () => {
    describe('Delete Button Rendering', () => {
      it('shows Delete button for lapsed product owners', () => {
        const lapsedProductOwner = createLapsedProductOwner();

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Lapsed product owners should have a Delete button
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      it('shows Delete button for deceased product owners', () => {
        const deceasedProductOwner = createDeceasedProductOwner();

        render(
          <ProductOwnerActions
            productOwner={deceasedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Deceased product owners should have a Delete button
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      it('does not show Delete button for active product owners', () => {
        const activeProductOwner = createActiveProductOwner();

        render(
          <ProductOwnerActions
            productOwner={activeProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Active product owners should NOT have a Delete button visible
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      });
    });

    describe('Delete Flow', () => {
      it('opens DeleteConfirmationModal when Delete button clicked', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 123 });

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        // DeleteConfirmationModal should open
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
      });

      it('calls deleteProductOwner API when confirmed', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 456 });

        // Set up mock return value
        (deleteProductOwner as jest.Mock).mockResolvedValue({ status: 204 });

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button to open modal
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        // Confirm deletion in modal
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        // API should be called
        await waitFor(() => {
          expect(deleteProductOwner).toHaveBeenCalledWith(456);
        });
      });

      it('shows success toast on successful deletion', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 789 });
        const mockDeleteProductOwner = jest.fn().mockResolvedValue({ status: 204 });

        jest.mock('@/services/api', () => ({
          updateProductOwnerStatus: jest.fn(),
          deleteProductOwner: mockDeleteProductOwner,
        }));

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button and confirm
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        // Success toast should be shown
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith(
            expect.stringContaining('deleted')
          );
        });
      });

      it('calls onStatusChange callback after deletion', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 101 });
        const mockDeleteProductOwner = jest.fn().mockResolvedValue({ status: 204 });

        jest.mock('@/services/api', () => ({
          updateProductOwnerStatus: jest.fn(),
          deleteProductOwner: mockDeleteProductOwner,
        }));

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button and confirm
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        // onStatusChange should be called
        await waitFor(() => {
          expect(mockOnStatusChange).toHaveBeenCalled();
        });
      });

      it('closes modal after successful deletion', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 202 });
        const mockDeleteProductOwner = jest.fn().mockResolvedValue({ status: 204 });

        jest.mock('@/services/api', () => ({
          updateProductOwnerStatus: jest.fn(),
          deleteProductOwner: mockDeleteProductOwner,
        }));

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button and confirm
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        // Modal should close after successful deletion
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      });
    });

    describe('Delete Cancellation', () => {
      it('closes modal when Cancel clicked', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner();

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button to open modal
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Click Cancel button
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        // Modal should close
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      });

      it('does not call API when cancelled', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 303 });
        const mockDeleteProductOwner = jest.fn();

        jest.mock('@/services/api', () => ({
          updateProductOwnerStatus: jest.fn(),
          deleteProductOwner: mockDeleteProductOwner,
        }));

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button and cancel
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        // API should not be called
        expect(mockDeleteProductOwner).not.toHaveBeenCalled();
      });

      it('does not show success toast when cancelled', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner();

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button and cancel
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        // Success toast should not be shown
        expect(toast.success).not.toHaveBeenCalled();
      });
    });

    describe('Delete Error Handling', () => {
      it('shows error toast on API failure', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 404 });

        // Set up mock to reject
        (deleteProductOwner as jest.Mock).mockRejectedValue(
          new Error('Failed to delete product owner')
        );

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button and confirm
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        // Error toast should be shown
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed')
          );
        });
      });

      it('keeps modal open on error', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 505 });

        // Set up mock to reject
        (deleteProductOwner as jest.Mock).mockRejectedValue(
          new Error('Network error')
        );

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button and confirm
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        // Modal should remain open after error
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalled();
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      it('allows retry after error', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 606 });

        // Set up mock to fail once then succeed
        (deleteProductOwner as jest.Mock)
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ status: 204 });

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // First attempt - fails
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        let confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalled();
        });

        // Second attempt - succeeds
        confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(deleteProductOwner).toHaveBeenCalledTimes(2);
          expect(toast.success).toHaveBeenCalled();
        });
      });

      it('handles specific error messages (404 not found)', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 707 });

        // Set up mock to reject with 404 error
        (deleteProductOwner as jest.Mock).mockRejectedValue({
          response: {
            status: 404,
            data: {
              detail: 'Product owner not found',
            },
          },
        });

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button and confirm
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        // Error toast should show specific message
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('not found')
          );
        });
      });

      it('handles specific error messages (403 forbidden)', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 808 });

        // Set up mock to reject with 403 error
        (deleteProductOwner as jest.Mock).mockRejectedValue({
          response: {
            status: 403,
            data: {
              detail: 'No permission to delete',
            },
          },
        });

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button and confirm
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        // Error toast should show specific message
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('permission')
          );
        });
      });

      it('handles specific error messages (409 conflict)', async () => {
        const user = userEvent.setup();
        const lapsedProductOwner = createLapsedProductOwner({ id: 909 });

        // Set up mock to reject with 409 error
        (deleteProductOwner as jest.Mock).mockRejectedValue({
          response: {
            status: 409,
            data: {
              detail: 'Cannot delete - referenced by other records',
            },
          },
        });

        render(
          <ProductOwnerActions
            productOwner={lapsedProductOwner}
            onStatusChange={mockOnStatusChange}
          />,
          { wrapper }
        );

        // Click Delete button and confirm
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: /delete|confirm/i });
        await user.click(confirmButton);

        // Error toast should show specific message
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('Cannot delete')
          );
        });
      });
    });
  });
});
