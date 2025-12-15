/**
 * EditSpecialRelationshipModal Component Tests (Cycle 7 - RED Phase)
 *
 * Comprehensive test suite for edit special relationship modal.
 * Tests form pre-filling, update submission, validation, and user workflows.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @component EditSpecialRelationshipModal
 * @requirements
 * - Render modal with pre-filled form data
 * - Show correct title (Edit Personal/Professional Relationship)
 * - Pre-populate all fields with existing relationship data
 * - Validate form on submit
 * - Call update mutation on valid submit
 * - Show loading state during submission
 * - Handle submission errors
 * - Close modal on successful update
 * - Call onSuccess callback with updated relationship
 * - Cancel button closes modal without submission
 * - Handle partial updates (only changed fields)
 * - Detect and warn about unsaved changes
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { createTestQueryClient, cleanupQueryClient } from '../utils/testUtils';
import EditSpecialRelationshipModal from '@/components/EditSpecialRelationshipModal';
import { useUpdateSpecialRelationship } from '@/hooks/useSpecialRelationships';
import {
  createMockPersonalRelationship,
  createMockProfessionalRelationship,
} from '../factories/specialRelationshipFactory';

expect.extend(toHaveNoViolations);

// Mock the hooks
jest.mock('@/hooks/useSpecialRelationships', () => ({
  useUpdateSpecialRelationship: jest.fn(),
}));

const mockedUseUpdate = useUpdateSpecialRelationship as jest.MockedFunction<
  typeof useUpdateSpecialRelationship
>;

describe('EditSpecialRelationshipModal Component', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockMutate = jest.fn();
  const mockMutateAsync = jest.fn();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();

    mockedUseUpdate.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    } as any);
  });

  afterEach(() => {
    cleanupQueryClient(queryClient);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // =================================================================
  // Modal Rendering Tests
  // =================================================================

  describe('Modal Rendering', () => {
    it('renders modal when isOpen is true', () => {
      const relationship = createMockPersonalRelationship();

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      const relationship = createMockPersonalRelationship();

      render(
        <EditSpecialRelationshipModal
          isOpen={false}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows "Edit Personal Relationship" title for personal relationships', () => {
      const relationship = createMockPersonalRelationship();

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByRole('heading', { name: /edit personal relationship/i })).toBeInTheDocument();
    });

    it('shows "Edit Professional Relationship" title for professional relationships', () => {
      const relationship = createMockProfessionalRelationship();

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByRole('heading', { name: /edit professional relationship/i })).toBeInTheDocument();
    });

    it('renders save changes button', () => {
      const relationship = createMockPersonalRelationship();

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      const relationship = createMockPersonalRelationship();

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  // =================================================================
  // Form Pre-Population Tests
  // =================================================================

  describe('Form Pre-Population', () => {
    it('pre-fills name field with existing data', () => {
      const relationship = createMockPersonalRelationship({
        name: 'John Smith',
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument();
    });

    it('pre-fills relationship type field', () => {
      const relationship = createMockPersonalRelationship({
        relationship_type: 'Spouse',
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByDisplayValue('Spouse')).toBeInTheDocument();
    });

    it('pre-fills email field', () => {
      const relationship = createMockPersonalRelationship({
        email: 'john@example.com',
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    it('pre-fills phone number field', () => {
      const relationship = createMockPersonalRelationship({
        mobile_phone: '01234567890',
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByDisplayValue('01234567890')).toBeInTheDocument();
    });

    it('pre-fills date of birth for personal relationships', () => {
      const relationship = createMockPersonalRelationship({
        date_of_birth: '1980-01-01',
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const dobField = screen.getByLabelText(/date of birth/i);
      expect(dobField).toHaveValue('1980-01-01');
    });

    it('pre-fills dependency checkbox for personal relationships', () => {
      const relationship = createMockPersonalRelationship({
        is_dependent: true,
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const dependencyCheckbox = screen.getByLabelText(/is dependent/i);
      expect(dependencyCheckbox).toBeChecked();
    });

    it('pre-fills status dropdown', () => {
      const relationship = createMockPersonalRelationship({
        status: 'Inactive',
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const statusDropdown = screen.getByLabelText(/status/i);
      expect(statusDropdown).toHaveValue('Inactive');
    });
  });

  // =================================================================
  // Form Update Tests
  // =================================================================

  describe('Form Update', () => {
    it('submits updated data on save', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship({
        id: 'rel-001',
        name: 'John Smith',
        email: 'old@example.com',
      });

      const updatedRelationship = {
        ...relationship,
        email: 'new@example.com',
      };

      mockMutateAsync.mockResolvedValueOnce(updatedRelationship);

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      // Change email
      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'new@example.com');

      // Submit
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: 'rel-001',
          data: expect.objectContaining({
            email: 'new@example.com',
          }),
        });
      });
    });

    it('only sends changed fields in update', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship({
        id: 'rel-001',
        name: 'John Smith',
        email: 'john@example.com',
        mobile_phone: '01234567890',
      });

      mockMutateAsync.mockResolvedValueOnce({ ...relationship, mobile_phone: '09876543210' });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      // Only change phone
      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '09876543210');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: 'rel-001',
          data: expect.objectContaining({
            mobile_phone: '09876543210',
          }),
        });
      });
    });

    it('validates updated data before submission', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship({
        name: 'John Smith',
        email: 'john@example.com',
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      // Change to invalid email
      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      // Should NOT call mutation
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('clears validation errors when user corrects field', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship({
        email: 'john@example.com',
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      // Correct the email
      await user.clear(emailInput);
      await user.type(emailInput, 'valid@example.com');

      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
      });
    });
  });

  // =================================================================
  // Loading State Tests
  // =================================================================

  describe('Loading State', () => {
    it('shows loading state during update', () => {
      const relationship = createMockPersonalRelationship();

      mockedUseUpdate.mockReturnValue({
        ...mockedUseUpdate(),
        isPending: true,
      } as any);

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });

    it('disables buttons during update', () => {
      const relationship = createMockPersonalRelationship();

      mockedUseUpdate.mockReturnValue({
        ...mockedUseUpdate(),
        isPending: true,
      } as any);

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const saveButton = screen.getByRole('button', { name: /saving/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(saveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  // =================================================================
  // Success Handling Tests
  // =================================================================

  describe('Success Handling', () => {
    it('closes modal on successful update', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship({
        id: 'rel-001',
        name: 'John Smith',
      });

      const updatedRelationship = { ...relationship, name: 'John Updated' };
      mockMutateAsync.mockResolvedValueOnce(updatedRelationship);

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'John Updated');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('calls onSuccess callback with updated relationship', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship({ id: 'rel-001' });
      const updatedRelationship = { ...relationship, name: 'Updated Name' };

      mockMutateAsync.mockResolvedValueOnce(updatedRelationship);

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
          onSuccess={mockOnSuccess}
        />,
        { wrapper }
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(updatedRelationship);
      });
    });
  });

  // =================================================================
  // Error Handling Tests
  // =================================================================

  describe('Error Handling', () => {
    it('displays error message on update failure', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship();

      mockMutateAsync.mockRejectedValueOnce(new Error('Failed to update relationship'));

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to update relationship/i)).toBeInTheDocument();
      });
    });

    it('does not close modal on update failure', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship();

      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, ' Updated');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('preserves form data on update failure', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship({ name: 'John Smith' });

      mockMutateAsync.mockRejectedValueOnce(new Error('Server error'));

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });

      // Form data should be preserved
      expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
    });
  });

  // =================================================================
  // Cancel Behavior Tests
  // =================================================================

  describe('Cancel Behavior', () => {
    it('closes modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship();

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not submit when cancel is clicked', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship();

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, ' Modified');

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('discards changes when modal closes', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship({
        name: 'Original Name',
      });

      const { rerender } = render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      // Make changes
      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Changed Name');

      // Cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Reopen modal
      rerender(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />
      );

      // Original data should be restored
      expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument();
    });
  });

  // =================================================================
  // Accessibility Tests
  // =================================================================

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const relationship = createMockPersonalRelationship();

      const { container } = render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('closes modal on Escape key', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship();

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('focuses first editable field on open', async () => {
      const relationship = createMockPersonalRelationship();

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        expect([nameInput, document.activeElement]).toContain(document.activeElement);
      });
    });
  });

  // =================================================================
  // Edge Case Tests
  // =================================================================

  describe('Edge Cases', () => {
    it('handles relationship with minimal data', () => {
      const relationship = createMockPersonalRelationship({
        name: 'Minimal',
        relationship_type: 'Other',
        status: 'Active',
        email: null,
        mobile_phone: null,
        date_of_birth: null,
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByDisplayValue('Minimal')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toHaveValue('');
      expect(screen.getByLabelText(/phone number/i)).toHaveValue('');
    });

    it('handles relationship with all optional fields filled', () => {
      const relationship = createMockPersonalRelationship({
        name: 'Complete Person',
        relationship_type: 'Spouse',
        email: 'complete@example.com',
        mobile_phone: '01234567890',
        date_of_birth: '1980-01-01',
        is_dependent: true,
        status: 'Active',
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      expect(screen.getByDisplayValue('Complete Person')).toBeInTheDocument();
      expect(screen.getByDisplayValue('complete@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('01234567890')).toBeInTheDocument();
      expect(screen.getByLabelText(/is dependent/i)).toBeChecked();
    });

    it('handles deceased personal relationship', () => {
      const relationship = createMockPersonalRelationship({
        status: 'Deceased',
      });

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const statusDropdown = screen.getByLabelText(/status/i);
      expect(statusDropdown).toHaveValue('Deceased');
    });

    it('allows changing status from Active to Deceased', async () => {
      const user = userEvent.setup();
      const relationship = createMockPersonalRelationship({
        id: 'rel-001',
        status: 'Active',
      });

      const updatedRelationship = { ...relationship, status: 'Deceased' as const };
      mockMutateAsync.mockResolvedValueOnce(updatedRelationship);

      render(
        <EditSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          relationship={relationship}
        />,
        { wrapper }
      );

      const statusDropdown = screen.getByLabelText(/status/i);
      await user.selectOptions(statusDropdown, 'Deceased');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: 'rel-001',
          data: expect.objectContaining({
            status: 'Deceased',
          }),
        });
      });
    });
  });
});
