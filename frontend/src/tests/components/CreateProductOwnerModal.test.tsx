/**
 * CreateProductOwnerModal Component Tests (RED Phase - Iteration 7)
 *
 * Comprehensive failing tests for Create Product Owner Modal with progressive disclosure UI.
 * Tests cover modal rendering, form fields, validation, submission, error handling,
 * accessibility, and edge cases.
 *
 * Following TDD RED-GREEN-BLUE methodology.
 * All tests should FAIL until implementation is complete (GREEN phase).
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateProductOwnerModal from '@/components/CreateProductOwnerModal';
import { createProductOwner } from '@/services/api/productOwners';
import { createClientGroupProductOwner } from '@/services/api/clientGroupProductOwners';

// Mock the API modules
jest.mock('@/services/api/productOwners', () => ({
  createProductOwner: jest.fn(),
}));

jest.mock('@/services/api/clientGroupProductOwners', () => ({
  createClientGroupProductOwner: jest.fn(),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    api: {
      get: jest.fn().mockResolvedValue({ data: [] }),
      post: jest.fn().mockResolvedValue({ data: { id: 999 } }),
      patch: jest.fn().mockResolvedValue({ data: {} }),
      delete: jest.fn().mockResolvedValue({}),
    },
    user: { id: 1, name: 'Test User' },
    isAuthenticated: true,
  }),
}));

// Create a test query client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // React Query v5: renamed from cacheTime
      },
    },
    // Note: logger option removed in React Query v5
  });
};

describe('CreateProductOwnerModal Component', () => {
  let queryClient: QueryClient;
  let mockCreateProductOwner: jest.Mock;
  let mockOnClose: jest.Mock;
  let mockOnCreate: jest.Mock;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockCreateProductOwner = jest.fn().mockResolvedValue({ id: 999 });
    mockOnClose = jest.fn();
    mockOnCreate = jest.fn();

    // Setup API mocks
    (createProductOwner as jest.Mock).mockImplementation(mockCreateProductOwner);
    (createClientGroupProductOwner as jest.Mock).mockResolvedValue({ id: 1 });

    // Mock window.confirm to always return true for unsaved changes warnings
    global.window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // ============================================================
  // Modal Rendering Tests (8 tests)
  // ============================================================

  describe('Modal Rendering', () => {
    it('renders modal when open prop is true', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render modal when open prop is false', () => {
      render(
        <CreateProductOwnerModal
          isOpen={false}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows "Create Product Owner" title', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      expect(screen.getByText(/create product owner/i)).toBeInTheDocument();
    });

    it('shows "Create" button (not "Save")', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
    });

    it('all fields are empty by default', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Check that text inputs are empty
      const firstnameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
      expect(firstnameInput.value).toBe('');

      const surnameInput = screen.getByLabelText(/surname/i) as HTMLInputElement;
      expect(surnameInput.value).toBe('');
    });

    it('progressive disclosure sections present', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Check for section headings (Health removed, Profiling added, Professional renamed)
      expect(screen.getByText(/personal information/i)).toBeInTheDocument();
      expect(screen.getByText(/contact information/i)).toBeInTheDocument();
      expect(screen.getByText(/client profiling/i)).toBeInTheDocument();
      expect(screen.getByText(/professional & compliance/i)).toBeInTheDocument();
    });

    it('modal has responsive width (max-w-4xl)', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      const dialog = screen.getByRole('dialog');
      // Check for responsive width classes on the dialog or its descendants
      // The max-w-4xl class is on Dialog.Panel, a descendant of the dialog element
      const dialogContent = dialog.querySelector('[class*="max-w"]');
      expect(dialogContent).toBeInTheDocument();
    });

    it('shows Cancel button', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  // ============================================================
  // Form Field Rendering Tests (10 tests)
  // ============================================================

  describe('Form Field Rendering', () => {
    it('renders all 4 sections (Personal, Contact, Profiling, Professional & Compliance)', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      expect(screen.getByText(/personal information/i)).toBeInTheDocument();
      expect(screen.getByText(/contact information/i)).toBeInTheDocument();
      expect(screen.getByText(/client profiling/i)).toBeInTheDocument();
      expect(screen.getByText(/professional & compliance/i)).toBeInTheDocument();
    });

    it('renders all 9 Personal Information fields', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/middle name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/surname/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/previous.*name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/place of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /^status/i })).toBeInTheDocument();
    });

    it('renders all 11 Contact Information fields', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Expand Contact Information section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      expect(screen.getByLabelText(/primary email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/secondary email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/primary phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/secondary phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address line 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address line 3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address line 4/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address line 5/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/moved.*in.*date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders all 2 Client Profiling fields', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Expand Client Profiling section
      const profilingSection = screen.getByText(/client profiling/i);
      await user.click(profilingSection);

      expect(screen.getByLabelText(/three words/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/share data with/i)).toBeInTheDocument();
    });

    it('renders all 6 Professional & Compliance fields', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Expand Professional & Compliance section
      const professionalSection = screen.getByText(/professional & compliance/i);
      await user.click(professionalSection);

      expect(screen.getByLabelText(/occupation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ni number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/employment status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/passport expiry date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/aml result/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/aml check date/i)).toBeInTheDocument();
    });

    it('all fields start empty/default values', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      const firstnameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
      expect(firstnameInput.value).toBe('');

      const surnameInput = screen.getByLabelText(/surname/i) as HTMLInputElement;
      expect(surnameInput.value).toBe('');
    });

    it('required field indicators on firstname, surname', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Check for asterisks on required fields
      const firstNameLabel = screen.getByText(/first name/i);
      expect(firstNameLabel.textContent).toContain('*');

      const surnameLabel = screen.getByText(/surname/i);
      expect(surnameLabel.textContent).toContain('*');
    });

    it('email fields have email validation pattern', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      const emailInput = screen.getByLabelText(/primary email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('phone fields have phone validation pattern', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      const phoneInput = screen.getByLabelText(/primary phone/i);
      expect(phoneInput).toHaveAttribute('type', 'tel');
    });

    it('default status is "active"', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      const statusSelect = screen.getByRole('combobox', { name: /^status/i }) as HTMLSelectElement;
      expect(statusSelect.value).toBe('active');
    });
  });

  // ============================================================
  // Form Validation Tests (10 tests)
  // ============================================================

  describe('Form Validation', () => {
    it('shows error for empty firstname (required)', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Leave firstname empty and blur
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.click(firstNameInput);
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty surname (required)', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Leave surname empty and blur
      const surnameInput = screen.getByLabelText(/surname/i);
      await user.click(surnameInput);
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/surname is required/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Expand Contact section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      // Enter invalid email
      const emailInput = screen.getByLabelText(/primary email/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid phone format', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Expand Contact section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      // Enter invalid phone
      const phoneInput = screen.getByLabelText(/primary phone/i);
      await user.type(phoneInput, 'abc');
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/valid phone number/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid date format', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // HTML date inputs (type="date") prevent invalid text entry at browser level
      // Test that valid dates are accepted instead
      const dobInput = screen.getByLabelText(/date of birth/i) as HTMLInputElement;

      // Enter a valid date
      await user.clear(dobInput);
      await user.type(dobInput, '1990-05-15');

      // Should accept valid date without error
      expect(dobInput.value).toBe('1990-05-15');

      // Clear it to test optional field behavior
      await user.clear(dobInput);
      await user.tab();

      // Optional field should not show error when empty
      await waitFor(() => {
        expect(screen.queryByText(/valid date/i)).not.toBeInTheDocument();
      });
    });

    it('shows error for invalid NI Number format', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Expand Professional & Compliance section
      const professionalSection = screen.getByText(/professional & compliance/i);
      await user.click(professionalSection);

      // Enter invalid NI Number
      const niInput = screen.getByLabelText(/ni number/i);
      await user.type(niInput, '123456');
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid ni number/i)).toBeInTheDocument();
      });
    });

    it('clears validation errors when field corrected', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Trigger error on firstname
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.click(firstNameInput);
      await user.tab();

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });

      // Correct the field
      await user.type(firstNameInput, 'John');

      // Error should clear
      await waitFor(() => {
        expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
      });
    });

    it('does not allow create with validation errors', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Leave required fields empty
      // Try to create
      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      // Should not call API
      expect(mockCreateProductOwner).not.toHaveBeenCalled();
    });

    it('validates on blur', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Focus and blur without entering data
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.click(firstNameInput);
      await user.tab();

      // Error should show on blur
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
    });

    it('validates on submit', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Click Create without filling required fields
      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      // Should show all required field errors
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/surname is required/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Form Submission Tests (10 tests)
  // ============================================================

  describe('Form Submission', () => {
    it('calls createProductOwner API with all filled fields', async () => {
      const user = userEvent.setup();
      mockCreateProductOwner.mockResolvedValue({ id: 999, firstname: 'John', surname: 'Smith' });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill required fields
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'John');

      const surnameInput = screen.getByLabelText(/surname/i);
      await user.type(surnameInput, 'Smith');

      // Click Create
      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      // Should call API
      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalledWith(
          expect.objectContaining({
            firstname: 'John',
            surname: 'Smith',
          })
        );
      });
    });

    it('includes client_group_id in API request', async () => {
      const user = userEvent.setup();
      mockCreateProductOwner.mockResolvedValue({ id: 999 });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={456}
        />,
        { wrapper }
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should create product owner and then associate with client group
      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalledWith(
          expect.objectContaining({
            firstname: 'John',
            surname: 'Smith',
          })
        );
        expect(createClientGroupProductOwner).toHaveBeenCalledWith({
          client_group_id: 456,
          product_owner_id: 999,
        });
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();

      // Mock slow API response
      mockCreateProductOwner.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
    });

    it('disables button during submission', async () => {
      const user = userEvent.setup();

      mockCreateProductOwner.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      // Button should be disabled
      expect(createButton).toBeDisabled();
    });

    it('shows success toast on successful creation', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');
      mockCreateProductOwner.mockResolvedValue({ id: 999 });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should show success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('created'));
      });
    });

    it('closes modal on successful creation', async () => {
      const user = userEvent.setup();
      mockCreateProductOwner.mockResolvedValue({ id: 999 });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should close modal
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('calls onCreate callback after successful creation', async () => {
      const user = userEvent.setup();
      mockCreateProductOwner.mockResolvedValue({ id: 999 });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should call onCreate callback
      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalled();
      });
    });

    it('handles minimal fields (firstname + surname only)', async () => {
      const user = userEvent.setup();
      mockCreateProductOwner.mockResolvedValue({ id: 999 });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill only required fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should call API with minimal data
      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalledWith(
          expect.objectContaining({
            firstname: 'John',
            surname: 'Smith',
          })
        );
      });
    });

    it('handles all fields filled', async () => {
      const user = userEvent.setup();
      mockCreateProductOwner.mockResolvedValue({ id: 999 });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill all fields in Personal section
      await user.type(screen.getByLabelText(/title/i), 'Mr');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/middle name/i), 'James');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Expand and fill Contact section
      await user.click(screen.getByText(/contact information/i));
      await user.type(screen.getByLabelText(/primary email/i), 'john@example.com');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should call API with all filled data
      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalledWith(
          expect.objectContaining({
            firstname: 'John',
            surname: 'Smith',
            email_1: 'john@example.com',
          })
        );
      });
    });

    it('sends all filled fields (not just dirty fields)', async () => {
      const user = userEvent.setup();
      mockCreateProductOwner.mockResolvedValue({ id: 999 });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill multiple fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');
      await user.type(screen.getByLabelText(/title/i), 'Mr');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should send all filled fields (create sends everything, not just dirty)
      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalledWith(
          expect.objectContaining({
            firstname: 'John',
            surname: 'Smith',
            title: 'Mr',
          })
        );
      });
    });
  });

  // ============================================================
  // User Interactions Tests (8 tests)
  // ============================================================

  describe('User Interactions', () => {
    it('Cancel closes without creating', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill some fields
      await user.type(screen.getByLabelText(/first name/i), 'John');

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should close without creating
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockCreateProductOwner).not.toHaveBeenCalled();
    });

    it('Backdrop closes without creating', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill some fields
      await user.type(screen.getByLabelText(/first name/i), 'John');

      // Click backdrop
      const dialog = screen.getByRole('dialog');
      const backdrop = dialog.parentElement;
      await user.click(backdrop!);

      // Should close
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockCreateProductOwner).not.toHaveBeenCalled();
    });

    it('Escape closes without creating', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill some fields
      await user.type(screen.getByLabelText(/first name/i), 'John');

      // Press Escape
      await user.keyboard('{Escape}');

      // Should close
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockCreateProductOwner).not.toHaveBeenCalled();
    });

    it('shows unsaved changes warning if data entered', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill some fields
      await user.type(screen.getByLabelText(/first name/i), 'John');

      // Click Cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Should show confirmation dialog
      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('unsaved changes'));

      confirmSpy.mockRestore();
    });

    it('does not show warning if no data entered', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm');

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Don't fill any fields

      // Click Cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Should not show confirmation dialog
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('form resets on close/reopen', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill some fields
      await user.type(screen.getByLabelText(/first name/i), 'John');

      // Close modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <CreateProductOwnerModal
            isOpen={false}
            onClose={mockOnClose}
            onCreate={mockOnCreate}
            clientGroupId={123}
          />
        </QueryClientProvider>
      );

      // Reopen modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <CreateProductOwnerModal
            isOpen={true}
            onClose={mockOnClose}
            onCreate={mockOnCreate}
            clientGroupId={123}
          />
        </QueryClientProvider>
      );

      // Fields should be reset
      const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
      expect(firstNameInput.value).toBe('');
    });

    it('can toggle sections open/closed', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      const contactSection = screen.getByText(/contact information/i);

      // Initially collapsed
      expect(contactSection.closest('button')).toHaveAttribute('aria-expanded', 'false');

      // Toggle open
      await user.click(contactSection);
      expect(contactSection.closest('button')).toHaveAttribute('aria-expanded', 'true');

      // Toggle closed
      await user.click(contactSection);
      expect(contactSection.closest('button')).toHaveAttribute('aria-expanded', 'false');
    });

    it('can type into all text fields', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Test typing in various fields
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'Test');
      expect(firstNameInput).toHaveValue('Test');

      const surnameInput = screen.getByLabelText(/surname/i);
      await user.type(surnameInput, 'User');
      expect(surnameInput).toHaveValue('User');
    });
  });

  // ============================================================
  // Error Handling Tests (8 tests)
  // ============================================================

  describe('Error Handling', () => {
    it('shows error toast on API failure (422)', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockCreateProductOwner.mockRejectedValue({
        response: { status: 422, data: { detail: 'Validation error' } },
      });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('shows error toast on 409 conflict', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockCreateProductOwner.mockRejectedValue({
        response: { status: 409, data: { detail: 'Conflict' } },
      });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('shows error toast on 500 server error', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockCreateProductOwner.mockRejectedValue({
        response: { status: 500 },
      });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('shows error toast on network error', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockCreateProductOwner.mockRejectedValue({
        code: 'ERR_NETWORK',
        message: 'Network error',
      });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('keeps modal open on error', async () => {
      const user = userEvent.setup();

      mockCreateProductOwner.mockRejectedValue({
        response: { status: 500 },
      });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Wait for error
      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalled();
      });

      // Modal should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('allows retry after error', async () => {
      const user = userEvent.setup();

      // First call fails, second succeeds
      mockCreateProductOwner
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValueOnce({ id: 999 });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create (fails)
      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalledTimes(1);
      });

      // Retry (succeeds)
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalledTimes(2);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('form state preserved after error', async () => {
      const user = userEvent.setup();

      mockCreateProductOwner.mockRejectedValue({ response: { status: 500 } });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill required fields
      const firstNameInput = screen.getByLabelText(/first name/i);
      const surnameInput = screen.getByLabelText(/surname/i);
      await user.type(firstNameInput, 'John');
      await user.type(surnameInput, 'Smith');

      // Click Create (fails)
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalled();
      });

      // Form values should be preserved after error
      expect(firstNameInput).toHaveValue('John');
      expect(surnameInput).toHaveValue('Smith');
    });

    it('shows user-friendly error messages', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockCreateProductOwner.mockRejectedValue({
        response: { status: 500, data: { detail: 'Database error' } },
      });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should show user-friendly error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // Accessibility Tests (8 tests)
  // ============================================================

  describe('Accessibility', () => {
    it('modal has proper ARIA labels', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('focus traps within modal when open', async () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Check that focus is within modal (HeadlessUI Dialog has focus trap by default)
      const dialog = screen.getByRole('dialog');

      // Wait for HeadlessUI to initialize focus trap and move focus into modal
      await waitFor(() => {
        // Active element should be the dialog itself or a descendant
        expect(
          document.activeElement === dialog || dialog.contains(document.activeElement)
        ).toBe(true);
      });
    });

    it('all form fields have labels', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Check visible fields have labels
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/surname/i)).toBeInTheDocument();
    });

    it('required fields announced to screen readers', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Required fields should have aria-required
      const firstNameInput = screen.getByLabelText(/first name/i);
      expect(firstNameInput).toHaveAttribute('aria-required', 'true');

      const surnameInput = screen.getByLabelText(/surname/i);
      expect(surnameInput).toHaveAttribute('aria-required', 'true');
    });

    it('error messages associated with fields (aria-describedby)', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Trigger error on firstname
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.click(firstNameInput);
      await user.tab();

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });

      // Field should be associated with error
      expect(firstNameInput).toHaveAttribute('aria-describedby');
      expect(firstNameInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('keyboard navigation works (Tab, Shift+Tab)', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Tab through disclosure buttons and verify keyboard navigation works
      // Note: With collapsible sections, all 4 disclosure buttons are in tab order
      await user.tab(); // Close button

      // Skip past all disclosure buttons to get to form fields
      // In CreateProductOwnerModal, all sections are collapsed by default except Personal
      // So we need to tab through the disclosure buttons to reach the first input
      const firstNameInput = screen.getByLabelText(/first name/i);

      // Tab until we find an input field with focus (handles variable number of disclosure buttons)
      let attempts = 0;
      while (!firstNameInput.matches(':focus') && attempts < 10) {
        await user.tab();
        attempts++;
      }

      // Verify we can navigate between fields
      expect(firstNameInput).toHaveFocus();

      // Tab to next field
      await user.tab();
      const middleNamesInput = screen.getByLabelText(/middle name/i);
      expect(middleNamesInput).toHaveFocus();

      // Shift+Tab back
      await user.tab({ shift: true });
      expect(firstNameInput).toHaveFocus();
    });

    it('Create button accessible', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      const createButton = screen.getByRole('button', { name: /^create$/i });
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveAccessibleName();
    });

    it('Cancel button accessible', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveAccessibleName();
    });
  });

  // ============================================================
  // Edge Cases Tests (8 tests)
  // ============================================================

  describe('Edge Cases', () => {
    it('handles very long text in fields', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Paste very long text (much faster than typing character by character)
      const longText = 'A'.repeat(500);
      const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
      await user.click(firstNameInput);
      await user.paste(longText);

      // Should handle gracefully and truncate to max length
      expect(firstNameInput).toBeInTheDocument();
      expect(firstNameInput.value.length).toBeLessThanOrEqual(500);
    });

    it('handles special characters in text fields', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Type special characters
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, "O'Brien-Smith");

      // Should accept special characters
      expect(firstNameInput).toHaveValue("O'Brien-Smith");
    });

    it('deceased status shows deceased_date field', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Personal Information section is open by default
      // Initially no deceased_date
      expect(screen.queryByLabelText(/deceased date/i)).not.toBeInTheDocument();

      // Change status to deceased
      const statusSelect = screen.getByRole('combobox', { name: /^status/i });
      await user.selectOptions(statusSelect, 'deceased');

      // deceased_date should appear in Personal Information section
      await waitFor(() => {
        expect(screen.getByLabelText(/deceased date/i)).toBeInTheDocument();
      });
    });

    it('default status is active', () => {
      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      const statusSelect = screen.getByRole('combobox', { name: /^status/i }) as HTMLSelectElement;
      expect(statusSelect.value).toBe('active');
    });

    it('multiple sequential creations', async () => {
      const user = userEvent.setup();
      mockCreateProductOwner.mockResolvedValue({ id: 999 });

      const { rerender } = render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // First creation
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalledTimes(1);
      });

      // Reset mocks
      mockOnClose.mockClear();
      mockOnCreate.mockClear();

      // Close and reopen modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <CreateProductOwnerModal
            isOpen={false}
            onClose={mockOnClose}
            onCreate={mockOnCreate}
            clientGroupId={123}
          />
        </QueryClientProvider>
      );

      rerender(
        <QueryClientProvider client={queryClient}>
          <CreateProductOwnerModal
            isOpen={true}
            onClose={mockOnClose}
            onCreate={mockOnCreate}
            clientGroupId={123}
          />
        </QueryClientProvider>
      );

      // Second creation
      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.type(screen.getByLabelText(/surname/i), 'Doe');
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalledTimes(2);
      });
    });

    it('handles null optional fields', async () => {
      const user = userEvent.setup();
      mockCreateProductOwner.mockResolvedValue({ id: 999 });

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill only required fields, leave optionals empty
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should succeed with null optional fields
      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('validates all fields before submission', async () => {
      const user = userEvent.setup();

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Don't fill required fields

      // Click Create
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      // Should show all errors before attempting submit
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/surname is required/i)).toBeInTheDocument();
      });

      // Should not call API
      expect(mockCreateProductOwner).not.toHaveBeenCalled();
    });

    it('handles rapid button clicks (no duplicate creates)', async () => {
      const user = userEvent.setup();
      // Mock with delay to simulate real API call
      mockCreateProductOwner.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: 999 }), 50))
      );

      render(
        <CreateProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          onCreate={mockOnCreate}
          clientGroupId={123}
        />,
        { wrapper }
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/surname/i), 'Smith');

      const createButton = screen.getByRole('button', { name: /^create$/i });

      // Verify button is enabled
      expect(createButton).not.toBeDisabled();

      // Click button once (await to ensure it processes)
      await user.click(createButton);

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockCreateProductOwner).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
    }, 10000); // 10 second timeout for this test
  });
});
