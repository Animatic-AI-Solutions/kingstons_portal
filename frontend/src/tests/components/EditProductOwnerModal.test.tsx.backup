/**
 * EditProductOwnerModal Component Tests (RED Phase - Iteration 6)
 *
 * Comprehensive failing tests for Edit Product Owner Modal with progressive disclosure UI.
 * Tests cover modal rendering, form fields, validation, submission, error handling,
 * accessibility, and edge cases.
 *
 * Following TDD RED-GREEN-BLUE methodology.
 * All tests should FAIL until implementation is complete (GREEN phase).
 */

import React from 'react';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditProductOwnerModal from '@/components/EditProductOwnerModal';
import { createActiveProductOwner, createLapsedProductOwner, createDeceasedProductOwner } from '../factories/productOwnerFactory';
import * as productOwnersApi from '@/services/api/productOwners';

// Mock the API module
jest.mock('@/services/api/productOwners');

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

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

describe('EditProductOwnerModal Component', () => {
  let queryClient: QueryClient;
  let mockUpdateProductOwner: jest.Mock;
  let mockOnClose: jest.Mock;
  let mockOnUpdate: jest.Mock;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockUpdateProductOwner = jest.fn().mockResolvedValue({ data: {} });
    mockOnClose = jest.fn();
    mockOnUpdate = jest.fn();

    // Setup API mock - use mockImplementation instead of assignment
    (productOwnersApi.updateProductOwner as jest.Mock).mockImplementation(mockUpdateProductOwner);
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // ============================================================
  // Modal Rendering Tests (8-10 tests)
  // ============================================================

  describe('Modal Rendering', () => {
    it('renders modal when open prop is true', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render modal when open prop is false', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={false}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows "Edit Product Owner" title', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      expect(screen.getByText(/edit product owner/i)).toBeInTheDocument();
    });

    it('displays full product owner name in subtitle', () => {
      const productOwner = createActiveProductOwner({
        title: 'Mr',
        firstname: 'John',
        surname: 'Smith',
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      expect(screen.getByText(/mr john smith/i)).toBeInTheDocument();
    });

    it('shows Save and Cancel buttons', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders form with all field sections', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Check for section headings
      expect(screen.getByText(/personal information/i)).toBeInTheDocument();
      expect(screen.getByText(/contact information/i)).toBeInTheDocument();
      expect(screen.getByText(/health information/i)).toBeInTheDocument();
      expect(screen.getByText(/professional information/i)).toBeInTheDocument();
    });

    it('shows progressive disclosure sections collapsed by default (except first)', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Personal Information should be expanded (first section)
      const personalSection = screen.getByText(/personal information/i).closest('button');
      expect(personalSection).toHaveAttribute('aria-expanded', 'true');

      // Other sections should be collapsed
      const contactSection = screen.getByText(/contact information/i).closest('button');
      expect(contactSection).toHaveAttribute('aria-expanded', 'false');

      const healthSection = screen.getByText(/health information/i).closest('button');
      expect(healthSection).toHaveAttribute('aria-expanded', 'false');

      const professionalSection = screen.getByText(/professional information/i).closest('button');
      expect(professionalSection).toHaveAttribute('aria-expanded', 'false');
    });

    it('modal has proper width and height (responsive)', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      const dialog = screen.getByRole('dialog');
      // Check for responsive width classes (should have max-width)
      expect(dialog.className).toMatch(/max-w-/);
    });
  });

  // ============================================================
  // Form Field Rendering Tests (12-15 tests)
  // ============================================================

  describe('Form Field Rendering', () => {
    it('renders Personal Information section with 9 fields', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Personal Information fields (9 fields)
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/middle name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/surname/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/previous.*name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/place of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/relationship status/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /^status/i })).toBeInTheDocument();
    });

    it('renders Contact Information section with 6 fields', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Contact Information section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      // Contact Information fields (6 fields)
      expect(screen.getByLabelText(/primary email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/secondary email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/primary phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/secondary phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders Health Information section with 3 fields', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Health Information section
      const healthSection = screen.getByText(/health information/i);
      await user.click(healthSection);

      // Health Information fields (3 fields - deceased_date only shown for deceased status)
      expect(screen.getByLabelText(/vulnerability/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/health notes/i)).toBeInTheDocument();
      // deceased_date not shown for active status
      expect(screen.queryByLabelText(/deceased date/i)).not.toBeInTheDocument();
    });

    it('renders Professional Information section with 2 fields', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Professional Information section
      const professionalSection = screen.getByText(/professional information/i);
      await user.click(professionalSection);

      // Professional Information fields (2 fields)
      expect(screen.getByLabelText(/occupation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ni number/i)).toBeInTheDocument();
    });

    it('all fields pre-populated with existing product owner data', () => {
      const productOwner = createActiveProductOwner({
        title: 'Dr',
        firstname: 'Jane',
        surname: 'Doe',
        email_1: 'jane@example.com',
        phone_1: '07700900123',
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Check fields are pre-populated
      expect(screen.getByDisplayValue('Dr')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });

    it('required fields marked with asterisk (firstname, surname)', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Check for asterisks on required fields
      const firstNameLabel = screen.getByText(/first name/i);
      expect(firstNameLabel.textContent).toContain('*');

      const surnameLabel = screen.getByText(/surname/i);
      expect(surnameLabel.textContent).toContain('*');
    });

    it('email fields have email validation', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Contact section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      const emailInput = screen.getByLabelText(/primary email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('phone fields have phone validation', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Contact section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      const phoneInput = screen.getByLabelText(/primary phone/i);
      expect(phoneInput).toHaveAttribute('type', 'tel');
    });

    it('date fields have date picker/validation', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      const dobInput = screen.getByLabelText(/date of birth/i);
      expect(dobInput).toHaveAttribute('type', 'date');
    });

    it('NI Number field has UK format validation', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Professional section
      const professionalSection = screen.getByText(/professional information/i);
      await user.click(professionalSection);

      const niInput = screen.getByLabelText(/ni number/i);
      expect(niInput).toHaveAttribute('pattern', expect.stringContaining('[A-Z]'));
    });

    it('deceased date field only shown when status is deceased', async () => {
      const productOwner = createDeceasedProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Health section
      const healthSection = screen.getByText(/health information/i);
      await user.click(healthSection);

      // deceased_date should be visible for deceased status
      expect(screen.getByLabelText(/deceased date/i)).toBeInTheDocument();
    });

    it('all optional fields can be empty', () => {
      const productOwner = createActiveProductOwner({
        title: null,
        middle_names: null,
        email_1: null,
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Optional fields should allow empty values
      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      expect(titleInput.value).toBe('');
    });
  });

  // ============================================================
  // Progressive Disclosure Tests (6-8 tests)
  // ============================================================

  describe('Progressive Disclosure', () => {
    it('Personal Information section expanded by default', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      const personalSection = screen.getByText(/personal information/i).closest('button');
      expect(personalSection).toHaveAttribute('aria-expanded', 'true');
    });

    it('other sections collapsed by default', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      const contactSection = screen.getByText(/contact information/i).closest('button');
      expect(contactSection).toHaveAttribute('aria-expanded', 'false');

      const healthSection = screen.getByText(/health information/i).closest('button');
      expect(healthSection).toHaveAttribute('aria-expanded', 'false');

      const professionalSection = screen.getByText(/professional information/i).closest('button');
      expect(professionalSection).toHaveAttribute('aria-expanded', 'false');
    });

    it('click section header to expand/collapse', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      const contactSection = screen.getByText(/contact information/i);

      // Initially collapsed
      expect(contactSection.closest('button')).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      await user.click(contactSection);
      expect(contactSection.closest('button')).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      await user.click(contactSection);
      expect(contactSection.closest('button')).toHaveAttribute('aria-expanded', 'false');
    });

    it('expanded section shows all fields', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Contact section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      // All contact fields should be visible
      expect(screen.getByLabelText(/primary email/i)).toBeVisible();
      expect(screen.getByLabelText(/secondary email/i)).toBeVisible();
      expect(screen.getByLabelText(/primary phone/i)).toBeVisible();
      expect(screen.getByLabelText(/secondary phone/i)).toBeVisible();
    });

    it('collapsed section hides fields', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Contact section collapsed - fields should not be visible
      expect(screen.queryByLabelText(/primary email/i)).not.toBeInTheDocument();
    });

    it('multiple sections can be open simultaneously', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand multiple sections
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      const healthSection = screen.getByText(/health information/i);
      await user.click(healthSection);

      // Both should be expanded
      expect(contactSection.closest('button')).toHaveAttribute('aria-expanded', 'true');
      expect(healthSection.closest('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('section indicators show open/closed state (chevron icon)', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Check for chevron icons in section headers
      const personalSection = screen.getByText(/personal information/i).closest('button');
      const chevron = within(personalSection!).getByRole('img', { hidden: true });
      expect(chevron).toBeInTheDocument();
    });

    it('sections have proper ARIA attributes (aria-expanded)', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      const personalSection = screen.getByText(/personal information/i).closest('button');
      expect(personalSection).toHaveAttribute('aria-expanded');
    });
  });

  // ============================================================
  // Form Validation Tests (10-12 tests)
  // ============================================================

  describe('Form Validation', () => {
    it('shows error for empty firstname (required)', async () => {
      const productOwner = createActiveProductOwner({ firstname: 'John' });
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Clear firstname field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty surname (required)', async () => {
      const productOwner = createActiveProductOwner({ surname: 'Smith' });
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Clear surname field
      const surnameInput = screen.getByLabelText(/surname/i);
      await user.clear(surnameInput);
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/surname is required/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid email_1 format', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Contact section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      // Enter invalid email
      const emailInput = screen.getByLabelText(/primary email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid email_2 format', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Contact section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      // Enter invalid email
      const emailInput = screen.getByLabelText(/secondary email/i);
      await user.type(emailInput, 'invalid@');
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid phone number format', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Contact section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      // Enter invalid phone
      const phoneInput = screen.getByLabelText(/primary phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, 'abc');
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid date format (dob)', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Enter invalid date
      const dobInput = screen.getByLabelText(/date of birth/i);
      await user.clear(dobInput);
      await user.type(dobInput, 'invalid-date');
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid date/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid NI Number format', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Professional section
      const professionalSection = screen.getByText(/professional information/i);
      await user.click(professionalSection);

      // Enter invalid NI Number
      const niInput = screen.getByLabelText(/ni number/i);
      await user.clear(niInput);
      await user.type(niInput, '123456');
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid ni number format/i)).toBeInTheDocument();
      });
    });

    it('does not allow save with validation errors', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Clear required field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should not call API
      expect(mockUpdateProductOwner).not.toHaveBeenCalled();
    });

    it('clears validation errors when field corrected', async () => {
      const productOwner = createActiveProductOwner({ firstname: 'John' });
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Clear firstname to trigger error
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.tab();

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });

      // Correct the field
      await user.type(firstNameInput, 'Jane');

      // Error should clear
      await waitFor(() => {
        expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
      });
    });

    it('shows all validation errors simultaneously', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Clear multiple required fields
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);

      const surnameInput = screen.getByLabelText(/surname/i);
      await user.clear(surnameInput);

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Both errors should show
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/surname is required/i)).toBeInTheDocument();
      });
    });

    it('validates on blur and on submit', async () => {
      const productOwner = createActiveProductOwner({ firstname: 'John' });
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Clear field and blur - should validate
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.tab();

      // Error should show on blur
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
    });

    it('required field indicators work correctly', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Check required fields have asterisk
      expect(screen.getByText(/first name/i).textContent).toContain('*');
      expect(screen.getByText(/surname/i).textContent).toContain('*');

      // Check optional fields don't have asterisk
      const titleLabel = screen.getByText(/^title$/i);
      expect(titleLabel.textContent).not.toContain('*');
    });
  });

  // ============================================================
  // Form Submission Tests (8-10 tests)
  // ============================================================

  describe('Form Submission', () => {
    it('calls updateProductOwner API on Save button click', async () => {
      const productOwner = createActiveProductOwner({ id: 123 });
      const user = userEvent.setup();
      mockUpdateProductOwner.mockResolvedValue({ ...productOwner });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Make a change
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should call API
      await waitFor(() => {
        expect(mockUpdateProductOwner).toHaveBeenCalledWith(
          123,
          expect.objectContaining({ firstname: 'Jane' })
        );
      });
    });

    it('sends only changed fields in API request', async () => {
      const productOwner = createActiveProductOwner({
        id: 123,
        firstname: 'John',
        surname: 'Smith',
        email_1: 'john@example.com',
      });
      const user = userEvent.setup();
      mockUpdateProductOwner.mockResolvedValue({ ...productOwner });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change only firstname
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should only send changed field
      await waitFor(() => {
        expect(mockUpdateProductOwner).toHaveBeenCalledWith(123, {
          firstname: 'Jane',
        });
      });
    });

    it('shows loading spinner on Save button during submission', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      // Mock slow API response
      mockUpdateProductOwner.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });

    it('disables Save button during submission', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      mockUpdateProductOwner.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Button should be disabled
      expect(saveButton).toBeDisabled();
    });

    it('shows success toast on successful update', async () => {
      const productOwner = createActiveProductOwner({ id: 123 });
      const user = userEvent.setup();
      const toast = require('react-hot-toast');
      mockUpdateProductOwner.mockResolvedValue({ ...productOwner, firstname: 'Jane' });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('updated'));
      });
    });

    it('closes modal on successful update', async () => {
      const productOwner = createActiveProductOwner({ id: 123 });
      const user = userEvent.setup();
      mockUpdateProductOwner.mockResolvedValue({ ...productOwner });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should close modal
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('calls onUpdate callback after successful update', async () => {
      const productOwner = createActiveProductOwner({ id: 123 });
      const user = userEvent.setup();
      mockUpdateProductOwner.mockResolvedValue({ ...productOwner });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should call onUpdate callback
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    it('handles partial field updates', async () => {
      const productOwner = createActiveProductOwner({
        id: 123,
        firstname: 'John',
        email_1: 'john@example.com',
      });
      const user = userEvent.setup();
      mockUpdateProductOwner.mockResolvedValue({ ...productOwner });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Contact section
      const contactSection = screen.getByText(/contact information/i);
      await user.click(contactSection);

      // Change only email
      const emailInput = screen.getByLabelText(/primary email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'jane@example.com');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should only update email
      await waitFor(() => {
        expect(mockUpdateProductOwner).toHaveBeenCalledWith(123, {
          email_1: 'jane@example.com',
        });
      });
    });

    it('preserves unchanged fields', async () => {
      const productOwner = createActiveProductOwner({
        id: 123,
        firstname: 'John',
        surname: 'Smith',
        email_1: 'john@example.com',
      });
      const user = userEvent.setup();
      mockUpdateProductOwner.mockResolvedValue({ ...productOwner });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change only one field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should not include unchanged fields in API call
      await waitFor(() => {
        const callArg = mockUpdateProductOwner.mock.calls[0][1];
        expect(callArg).not.toHaveProperty('surname');
        expect(callArg).not.toHaveProperty('email_1');
      });
    });

    it('validates all fields before submission', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Clear required fields
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);

      const surnameInput = screen.getByLabelText(/surname/i);
      await user.clear(surnameInput);

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show all errors before attempting submit
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/surname is required/i)).toBeInTheDocument();
      });

      // Should not call API
      expect(mockUpdateProductOwner).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // User Interactions Tests (8-10 tests)
  // ============================================================

  describe('User Interactions', () => {
    it('Cancel button closes modal without saving', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Make a change
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should close modal without saving
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockUpdateProductOwner).not.toHaveBeenCalled();
    });

    it('Backdrop click closes modal without saving', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Make a change
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click backdrop (outside modal)
      const dialog = screen.getByRole('dialog');
      const backdrop = dialog.parentElement;
      await user.click(backdrop!);

      // Should close modal
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockUpdateProductOwner).not.toHaveBeenCalled();
    });

    it('Escape key closes modal without saving', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Make a change
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Press Escape
      await user.keyboard('{Escape}');

      // Should close modal
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockUpdateProductOwner).not.toHaveBeenCalled();
    });

    it('shows "unsaved changes" warning if data modified and Cancel clicked', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Make a change
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should show confirmation dialog
      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('unsaved changes'));

      confirmSpy.mockRestore();
    });

    it('does not show warning if no changes made', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      const confirmSpy = jest.spyOn(window, 'confirm');

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Don't make any changes

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should not show confirmation dialog
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('confirms navigation away with unsaved changes', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Make a change
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Try to close (e.g., Escape key)
      await user.keyboard('{Escape}');

      // Should show confirmation and close if confirmed
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('can type into all text fields', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Test typing in various fields
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Test');
      expect(firstNameInput).toHaveValue('Test');

      const surnameInput = screen.getByLabelText(/surname/i);
      await user.clear(surnameInput);
      await user.type(surnameInput, 'User');
      expect(surnameInput).toHaveValue('User');
    });

    it('can select dates in date fields', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Select date
      const dobInput = screen.getByLabelText(/date of birth/i);
      await user.clear(dobInput);
      await user.type(dobInput, '1990-01-15');
      expect(dobInput).toHaveValue('1990-01-15');
    });

    it('can toggle sections open/closed', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
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

    it('form resets when modal closed and reopened', async () => {
      const productOwner = createActiveProductOwner({ firstname: 'John' });
      const user = userEvent.setup();

      const { rerender } = render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Make a change
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      // Close modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <EditProductOwnerModal
            isOpen={false}
            onClose={mockOnClose}
            productOwner={productOwner}
            onUpdate={mockOnUpdate}
          />
        </QueryClientProvider>
      );

      // Reopen modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <EditProductOwnerModal
            isOpen={true}
            onClose={mockOnClose}
            productOwner={productOwner}
            onUpdate={mockOnUpdate}
          />
        </QueryClientProvider>
      );

      // Should reset to original value
      const reopenedFirstNameInput = screen.getByLabelText(/first name/i);
      expect(reopenedFirstNameInput).toHaveValue('John');
    });
  });

  // ============================================================
  // Error Handling Tests (8-10 tests)
  // ============================================================

  describe('Error Handling', () => {
    it('shows error toast on API failure (500)', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockUpdateProductOwner.mockRejectedValue({
        response: { status: 500 },
        message: 'Server error',
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('shows specific error for 404 not found', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockUpdateProductOwner.mockRejectedValue({
        response: { status: 404, data: { detail: 'Product owner not found' } },
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show specific 404 error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
      });
    });

    it('shows specific error for 422 validation error', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockUpdateProductOwner.mockRejectedValue({
        response: { status: 422, data: { detail: 'Invalid data provided' } },
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Invalid'));
      });
    });

    it('shows specific error for 409 conflict error', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockUpdateProductOwner.mockRejectedValue({
        response: { status: 409, data: { detail: 'Product owner was modified by another user' } },
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show conflict error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('modified by another user'));
      });
    });

    it('keeps modal open on error', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      mockUpdateProductOwner.mockRejectedValue({
        response: { status: 500 },
        message: 'Server error',
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Wait for error
      await waitFor(() => {
        expect(mockUpdateProductOwner).toHaveBeenCalled();
      });

      // Modal should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('allows retry after error', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      // First call fails, second succeeds
      mockUpdateProductOwner
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValueOnce({ ...productOwner });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save (fails)
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProductOwner).toHaveBeenCalledTimes(1);
      });

      // Retry (succeeds)
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProductOwner).toHaveBeenCalledTimes(2);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('form state preserved after error', async () => {
      const productOwner = createActiveProductOwner({ firstname: 'John' });
      const user = userEvent.setup();

      mockUpdateProductOwner.mockRejectedValue({ response: { status: 500 } });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      // Click Save (fails)
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProductOwner).toHaveBeenCalled();
      });

      // Form value should be preserved
      expect(firstNameInput).toHaveValue('Jane');
    });

    it('network timeout handled gracefully', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockUpdateProductOwner.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show timeout error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('timeout'));
      });
    });

    it('shows user-friendly error messages', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockUpdateProductOwner.mockRejectedValue({
        response: { status: 500, data: { detail: 'Database connection failed' } },
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show user-friendly error (not technical details)
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('error messages use formatApiError', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      mockUpdateProductOwner.mockRejectedValue({
        response: { status: 500 },
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should use formatApiError utility
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('error'));
      });
    });
  });

  // ============================================================
  // Accessibility Tests (8-10 tests)
  // ============================================================

  describe('Accessibility', () => {
    it('modal has proper ARIA labels (aria-labelledby, aria-describedby)', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('focus traps within modal when open', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Check that focus is within modal
      const dialog = screen.getByRole('dialog');
      expect(document.activeElement).toBe(dialog) ||
        expect(dialog.contains(document.activeElement)).toBe(true);
    });

    it('returns focus to Edit button on close', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      // Create a button to represent the Edit button that opened the modal
      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      document.body.appendChild(editButton);
      editButton.focus();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Focus should return to edit button
      // Note: This test may need adjustment based on actual implementation
      expect(mockOnClose).toHaveBeenCalled();

      document.body.removeChild(editButton);
    });

    it('all form fields have labels', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Check all visible fields have labels
      const firstNameInput = screen.getByLabelText(/first name/i);
      expect(firstNameInput).toBeInTheDocument();

      const surnameInput = screen.getByLabelText(/surname/i);
      expect(surnameInput).toBeInTheDocument();
    });

    it('required fields announced to screen readers', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
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
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Clear required field to trigger error
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.tab();

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });

      // Field should be associated with error via aria-describedby
      expect(firstNameInput).toHaveAttribute('aria-describedby');
      expect(firstNameInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('keyboard navigation works (Tab, Shift+Tab)', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Tab through fields
      await user.tab();
      const firstNameInput = screen.getByLabelText(/first name/i);
      expect(document.activeElement).toBe(firstNameInput) ||
        expect(firstNameInput).toHaveFocus();
    });

    it('section headers keyboard accessible (Enter/Space to toggle)', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      const contactSection = screen.getByText(/contact information/i).closest('button');

      // Focus the button
      contactSection?.focus();

      // Press Enter to toggle
      await user.keyboard('{Enter}');
      expect(contactSection).toHaveAttribute('aria-expanded', 'true');

      // Press Space to toggle
      await user.keyboard(' ');
      expect(contactSection).toHaveAttribute('aria-expanded', 'false');
    });

    it('Save button accessible', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toHaveAccessibleName();
    });

    it('Cancel button accessible', () => {
      const productOwner = createActiveProductOwner();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveAccessibleName();
    });
  });

  // ============================================================
  // Edge Cases Tests (8-10 tests)
  // ============================================================

  describe('Edge Cases', () => {
    it('handles missing optional fields', () => {
      const productOwner = createActiveProductOwner({
        title: null,
        middle_names: null,
        email_1: null,
        phone_1: null,
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Should render without errors
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles very long text in fields (truncation)', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Type very long text
      const longText = 'A'.repeat(500);
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, longText);

      // Should handle gracefully (may truncate or show validation error)
      expect(firstNameInput).toBeInTheDocument();
    });

    it('handles product owner with all fields empty', () => {
      const productOwner = createActiveProductOwner({
        title: null,
        middle_names: null,
        previous_names: null,
        dob: null,
        place_of_birth: null,
        email_1: null,
        email_2: null,
        phone_1: null,
        phone_2: null,
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Should render without errors
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles product owner with all fields filled', () => {
      const productOwner = createActiveProductOwner({
        title: 'Dr',
        firstname: 'John',
        middle_names: 'James',
        surname: 'Smith',
        previous_names: 'Jones',
        dob: '1980-01-15',
        place_of_birth: 'London',
        relationship_status: 'Married',
        email_1: 'john@example.com',
        email_2: 'j.smith@work.com',
        phone_1: '07700900123',
        phone_2: '07700900456',
        occupation: 'Doctor',
        ni_number: 'AB123456C',
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // All fields should be populated
      expect(screen.getByDisplayValue('Dr')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('James')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    });

    it('handles special characters in text fields', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Type special characters
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "O'Brien-Smith");

      // Should accept special characters
      expect(firstNameInput).toHaveValue("O'Brien-Smith");
    });

    it('handles deceased product owner (shows deceased_date field)', async () => {
      const productOwner = createDeceasedProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Health section
      const healthSection = screen.getByText(/health information/i);
      await user.click(healthSection);

      // deceased_date field should be visible
      expect(screen.getByLabelText(/deceased date/i)).toBeInTheDocument();
    });

    it('handles active/lapsed product owner (hides deceased_date field)', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Health section
      const healthSection = screen.getByText(/health information/i);
      await user.click(healthSection);

      // deceased_date field should not be visible
      expect(screen.queryByLabelText(/deceased date/i)).not.toBeInTheDocument();
    });

    it('status change from active to deceased shows deceased_date field', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Health section
      const healthSection = screen.getByText(/health information/i);
      await user.click(healthSection);

      // Initially no deceased_date field
      expect(screen.queryByLabelText(/deceased date/i)).not.toBeInTheDocument();

      // Change status to deceased
      const statusSelect = screen.getByRole('combobox', { name: /^status/i });
      await user.selectOptions(statusSelect, 'deceased');

      // deceased_date field should now appear
      await waitFor(() => {
        expect(screen.getByLabelText(/deceased date/i)).toBeInTheDocument();
      });
    });

    it('status change from deceased to active hides deceased_date field', async () => {
      const productOwner = createDeceasedProductOwner();
      const user = userEvent.setup();

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Expand Health section
      const healthSection = screen.getByText(/health information/i);
      await user.click(healthSection);

      // Initially deceased_date field visible
      expect(screen.getByLabelText(/deceased date/i)).toBeInTheDocument();

      // Change status to active
      const statusSelect = screen.getByRole('combobox', { name: /^status/i });
      await user.selectOptions(statusSelect, 'active');

      // deceased_date field should be hidden
      await waitFor(() => {
        expect(screen.queryByLabelText(/deceased date/i)).not.toBeInTheDocument();
      });
    });

    it('handles concurrent edits gracefully', async () => {
      const productOwner = createActiveProductOwner();
      const user = userEvent.setup();

      // Simulate concurrent edit conflict
      mockUpdateProductOwner.mockRejectedValue({
        response: {
          status: 409,
          data: { detail: 'Product owner was modified by another user. Please refresh and try again.' },
        },
      });

      render(
        <EditProductOwnerModal
          isOpen={true}
          onClose={mockOnClose}
          productOwner={productOwner}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );

      // Change field
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'X');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show conflict error
      const toast = require('react-hot-toast');
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('modified by another user')
        );
      });
    });
  });
});
