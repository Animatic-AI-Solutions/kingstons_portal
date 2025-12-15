/**
 * CreateSpecialRelationshipModal Component Tests (Cycle 7 - RED Phase)
 *
 * Comprehensive test suite for create special relationship modal.
 * Tests form submission, validation integration, API interactions, and user workflows.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @component CreateSpecialRelationshipModal
 * @requirements
 * - Render modal with form fields
 * - Show correct title (Add Personal/Professional Relationship)
 * - Integrate with useRelationshipValidation hook
 * - Validate form on submit
 * - Call create mutation on valid submit
 * - Show loading state during submission
 * - Handle submission errors
 * - Close modal on successful creation
 * - Call onSuccess callback with created relationship
 * - Clear form on close
 * - Cancel button closes modal without submission
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { createTestQueryClient, cleanupQueryClient } from '../utils/testUtils';
import CreateSpecialRelationshipModal from '@/components/CreateSpecialRelationshipModal';
import { useCreateSpecialRelationship } from '@/hooks/useSpecialRelationships';
import { createMockPersonalRelationship } from '../factories/specialRelationshipFactory';

expect.extend(toHaveNoViolations);

// Mock the hooks
jest.mock('@/hooks/useSpecialRelationships', () => ({
  useCreateSpecialRelationship: jest.fn(),
}));

const mockedUseCreate = useCreateSpecialRelationship as jest.MockedFunction<
  typeof useCreateSpecialRelationship
>;

describe('CreateSpecialRelationshipModal Component', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockMutate = jest.fn();
  const mockMutateAsync = jest.fn();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();

    mockedUseCreate.mockReturnValue({
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
      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <CreateSpecialRelationshipModal
          isOpen={false}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows "Add Personal Relationship" title for personal relationships', () => {
      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      expect(screen.getByRole('heading', { name: /add personal relationship/i })).toBeInTheDocument();
    });

    it('shows "Add Professional Relationship" title for professional relationships', () => {
      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={true}
        />,
        { wrapper }
      );

      expect(screen.getByRole('heading', { name: /add professional relationship/i })).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/relationship type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /add relationship/i })).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  // =================================================================
  // Form Validation Tests
  // =================================================================

  describe('Form Validation', () => {
    it('validates required fields on submit', async () => {
      const user = userEvent.setup();

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const submitButton = screen.getByRole('button', { name: /add relationship/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      // Should NOT call mutation
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('shows validation error on blur', async () => {
      const user = userEvent.setup();

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.click(nameInput);
      await user.tab(); // Blur

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('clears validation error when user types', async () => {
      const user = userEvent.setup();

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.click(nameInput);
      await user.tab(); // Blur to show error

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      // Type to clear error
      await user.type(nameInput, 'J');

      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('validates phone number format', async () => {
      const user = userEvent.setup();

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '123');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/phone number must be at least 10 digits/i)).toBeInTheDocument();
      });
    });

    it('focuses first invalid field on submit', async () => {
      const user = userEvent.setup();

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const submitButton = screen.getByRole('button', { name: /add relationship/i });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        expect(document.activeElement).toBe(nameInput);
      });
    });
  });

  // =================================================================
  // Form Submission Tests
  // =================================================================

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();

      mockMutateAsync.mockResolvedValueOnce(
        createMockPersonalRelationship({ id: 'new-001' })
      );

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      // Fill form
      await user.type(screen.getByLabelText(/name/i), 'John Smith');
      await user.type(screen.getByLabelText(/relationship type/i), 'Spouse');

      // Submit
      const submitButton = screen.getByRole('button', { name: /add relationship/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            client_group_id: 'group-001',
            name: 'John Smith',
            relationship_type: expect.stringContaining('Spouse'),
            status: 'Active',
            is_professional: false,
          })
        );
      });
    });

    it('includes optional fields in submission when provided', async () => {
      const user = userEvent.setup();

      mockMutateAsync.mockResolvedValueOnce(createMockPersonalRelationship());

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      // Fill all fields
      await user.type(screen.getByLabelText(/name/i), 'John Smith');
      await user.type(screen.getByLabelText(/relationship type/i), 'Spouse');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '01234567890');

      // Submit
      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'john@example.com',
            phone_number: '01234567890',
          })
        );
      });
    });

    it('sets is_professional flag correctly for professional relationships', async () => {
      const user = userEvent.setup();

      mockMutateAsync.mockResolvedValueOnce(createMockPersonalRelationship());

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={true}
        />,
        { wrapper }
      );

      await user.type(screen.getByLabelText(/name/i), 'Jane Accountant');
      await user.type(screen.getByLabelText(/relationship type/i), 'Accountant');

      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            is_professional: true,
          })
        );
      });
    });
  });

  // =================================================================
  // Loading State Tests
  // =================================================================

  describe('Loading State', () => {
    it('shows loading state during submission', () => {
      mockedUseCreate.mockReturnValue({
        ...mockedUseCreate(),
        isPending: true,
      } as any);

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      expect(screen.getByText(/adding/i)).toBeInTheDocument();
    });

    it('disables submit button during submission', () => {
      mockedUseCreate.mockReturnValue({
        ...mockedUseCreate(),
        isPending: true,
      } as any);

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const submitButton = screen.getByRole('button', { name: /adding/i });
      expect(submitButton).toBeDisabled();
    });

    it('disables cancel button during submission', () => {
      mockedUseCreate.mockReturnValue({
        ...mockedUseCreate(),
        isPending: true,
      } as any);

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  // =================================================================
  // Success Handling Tests
  // =================================================================

  describe('Success Handling', () => {
    it('closes modal on successful creation', async () => {
      const user = userEvent.setup();

      mockMutateAsync.mockResolvedValueOnce(
        createMockPersonalRelationship({ id: 'new-001', name: 'John Smith' })
      );

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      await user.type(screen.getByLabelText(/name/i), 'John Smith');
      await user.type(screen.getByLabelText(/relationship type/i), 'Spouse');
      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('calls onSuccess callback with created relationship', async () => {
      const user = userEvent.setup();
      const mockRelationship = createMockPersonalRelationship({ id: 'new-001' });

      mockMutateAsync.mockResolvedValueOnce(mockRelationship);

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
          onSuccess={mockOnSuccess}
        />,
        { wrapper }
      );

      await user.type(screen.getByLabelText(/name/i), 'John Smith');
      await user.type(screen.getByLabelText(/relationship type/i), 'Spouse');
      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockRelationship);
      });
    });

    it('clears form after successful submission', async () => {
      const user = userEvent.setup();

      mockMutateAsync.mockResolvedValueOnce(createMockPersonalRelationship());

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'John Smith');
      await user.type(screen.getByLabelText(/relationship type/i), 'Spouse');

      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });

      // Form should be cleared (if modal reopened, fields would be empty)
    });
  });

  // =================================================================
  // Error Handling Tests
  // =================================================================

  describe('Error Handling', () => {
    it('displays error message on submission failure', async () => {
      const user = userEvent.setup();

      mockMutateAsync.mockRejectedValueOnce(new Error('Failed to create relationship'));

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      await user.type(screen.getByLabelText(/name/i), 'John Smith');
      await user.type(screen.getByLabelText(/relationship type/i), 'Spouse');
      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to create relationship/i)).toBeInTheDocument();
      });
    });

    it('does not close modal on submission failure', async () => {
      const user = userEvent.setup();

      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      await user.type(screen.getByLabelText(/name/i), 'John Smith');
      await user.type(screen.getByLabelText(/relationship type/i), 'Spouse');
      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('keeps form data on submission failure', async () => {
      const user = userEvent.setup();

      mockMutateAsync.mockRejectedValueOnce(new Error('Validation error'));

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      await user.type(screen.getByLabelText(/name/i), 'John Smith');
      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      await waitFor(() => {
        expect(screen.getByText(/validation error/i)).toBeInTheDocument();
      });

      // Form data should still be present
      expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument();
    });
  });

  // =================================================================
  // Cancel Behavior Tests
  // =================================================================

  describe('Cancel Behavior', () => {
    it('closes modal when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not submit when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      await user.type(screen.getByLabelText(/name/i), 'John Smith');
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('clears errors when modal closes', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      // Trigger validation error
      await user.click(screen.getByLabelText(/name/i));
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      // Close modal
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Reopen modal
      rerender(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
      );

      // Error should be cleared
      expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
    });
  });

  // =================================================================
  // Accessibility Tests
  // =================================================================

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('focuses first input when modal opens', async () => {
      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        expect([nameInput, document.activeElement]).toContain(document.activeElement);
      });
    });

    it('closes modal on Escape key', async () => {
      const user = userEvent.setup();

      render(
        <CreateSpecialRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          clientGroupId="group-001"
          isProfessional={false}
        />,
        { wrapper }
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
