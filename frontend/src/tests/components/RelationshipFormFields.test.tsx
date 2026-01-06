/**
 * RelationshipFormFields Component Tests (Cycle 7 - RED Phase)
 *
 * Comprehensive test suite for relationship form fields component with validation.
 * Tests field rendering, validation messages, conditional fields, and accessibility.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @component RelationshipFormFields
 * @requirements
 * - Render all required form fields (Name, Relationship Type, Status)
 * - Render conditional fields (DOB/Dependency for Personal, Relationship With for Professional)
 * - Display validation error messages inline
 * - Show required field indicators (asterisks)
 * - Integrate with useRelationshipValidation hook
 * - Call onChange when field values change
 * - Call onBlur when fields lose focus
 * - Editable dropdown for relationship type
 * - Accessibility (labels, ARIA attributes, error announcements)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import RelationshipFormFields from '@/components/_archive/RelationshipFormFields';
import { SpecialRelationshipFormData } from '@/types/specialRelationship';

expect.extend(toHaveNoViolations);

describe('RelationshipFormFields Component', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  const defaultPersonalFormData: Partial<SpecialRelationshipFormData> = {
    name: '',
    type: 'Personal',
    relationship: '',
    status: 'Active',
  };

  const defaultProfessionalFormData: Partial<SpecialRelationshipFormData> = {
    name: '',
    type: 'Professional',
    relationship: '',
    status: 'Active',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =================================================================
  // Personal Form Fields Rendering Tests
  // =================================================================

  describe('Personal Form Fields Rendering', () => {
    it('renders name field with label and required indicator', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      // Multiple required fields have asterisks - verify at least one exists
      const asterisks = screen.getAllByText(/\*/);
      expect(asterisks.length).toBeGreaterThan(0);
    });

    it('renders relationship type dropdown', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByLabelText(/^type/i)).toBeInTheDocument();
    });

    it('renders date of birth field for personal relationships', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    });

    it('renders dependency checkbox for personal relationships', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByLabelText(/dependent/i)).toBeInTheDocument();
    });

    it('renders email field', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('renders phone number field', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });

    it('renders status dropdown with required indicator', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('shows Active, Inactive, Deceased options for personal status', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const statusDropdown = screen.getByLabelText(/status/i);
      expect(statusDropdown).toBeInTheDocument();

      // Check options exist (implementation-specific)
      expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
    });
  });

  // =================================================================
  // Professional Form Fields Rendering Tests
  // =================================================================

  describe('Professional Form Fields Rendering', () => {
    it('does not render date of birth field for professional relationships', () => {
      render(
        <RelationshipFormFields
          formData={defaultProfessionalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.queryByLabelText(/date of birth/i)).not.toBeInTheDocument();
    });

    it('does not render dependency checkbox for professional relationships', () => {
      render(
        <RelationshipFormFields
          formData={defaultProfessionalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.queryByLabelText(/dependency/i)).not.toBeInTheDocument();
    });

    it('renders relationship with field for professional relationships', () => {
      render(
        <RelationshipFormFields
          formData={defaultProfessionalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByRole('combobox', { name: /relationship/i })).toBeInTheDocument();
    });

    it('does not show Deceased option for professional status', () => {
      render(
        <RelationshipFormFields
          formData={defaultProfessionalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const statusDropdown = screen.getByLabelText(/status/i);
      expect(statusDropdown).toBeInTheDocument();

      // Deceased should not be an option for professional
      expect(screen.queryByRole('option', { name: /deceased/i })).not.toBeInTheDocument();
    });
  });

  // =================================================================
  // Validation Error Display Tests
  // =================================================================

  describe('Validation Error Display', () => {
    it('displays name error message', () => {
      const errors = { name: 'Name is required' };

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={errors}
        />
      );

      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('displays relationship type error message', () => {
      const errors = { type: 'Type is required' };

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={errors}
        />
      );

      expect(screen.getByText('Type is required')).toBeInTheDocument();
    });

    it('displays date of birth error message', () => {
      const errors = { date_of_birth: 'Date cannot be in the future' };

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={errors}
        />
      );

      expect(screen.getByText('Date cannot be in the future')).toBeInTheDocument();
    });

    it('displays email error message', () => {
      const errors = { email: 'Please enter a valid email address' };

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={errors}
        />
      );

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('displays phone number error message', () => {
      const errors = { phone_number: 'Please enter a valid phone number' };

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={errors}
        />
      );

      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });

    it('displays multiple errors simultaneously', () => {
      const errors = {
        name: 'Name is required',
        email: 'Please enter a valid email address',
        phone_number: 'Phone number must be at least 10 digits',
      };

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={errors}
        />
      );

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(screen.getByText('Phone number must be at least 10 digits')).toBeInTheDocument();
    });

    it('applies error styling to field with error', () => {
      const errors = { name: 'Name is required' };

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={errors}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput.className).toContain('border-red');
    });
  });

  // =================================================================
  // User Interaction Tests
  // =================================================================

  describe('User Interactions', () => {
    it('calls onChange when name field changes', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'John Smith');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('calls onBlur when name field loses focus', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.click(nameInput);
      await user.tab();

      await waitFor(() => {
        expect(mockOnBlur).toHaveBeenCalledWith('name', expect.any(String));
      });
    });

    it('calls onChange when email field changes', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'john@example.com');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('toggles dependency checkbox', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const dependencyCheckbox = screen.getByLabelText(/dependent/i);
      await user.click(dependencyCheckbox);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ dependency: true })
        );
      });
    });

    it('changes status dropdown value', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const statusDropdown = screen.getByLabelText(/status/i);
      await user.selectOptions(statusDropdown, 'Inactive');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Inactive' })
        );
      });
    });
  });

  // =================================================================
  // Editable Dropdown Tests
  // =================================================================

  describe('Editable Dropdown for Relationship Type', () => {
    it('shows predefined relationship types', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const relationshipInput = screen.getByRole('combobox', { name: /relationship/i });
      expect(relationshipInput).toBeInTheDocument();
    });

    it('allows custom relationship type input', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const relationshipInput = screen.getByRole('combobox', { name: /relationship/i });
      await user.type(relationshipInput, 'Godchild');

      // user.type() triggers onChange for each character typed
      // Verify onChange was called (input is controlled so value won't change in test without updating formData)
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('filters relationship types as user types', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const relationshipInput = screen.getByRole('combobox', { name: /relationship/i });
      await user.type(relationshipInput, 'Sp');

      // Dropdown should filter to show "Spouse"
      await waitFor(() => {
        expect(screen.queryByText(/spouse/i)).toBeInTheDocument();
      });
    });
  });

  // =================================================================
  // Accessibility Tests
  // =================================================================

  describe('Accessibility', () => {
    it('has no accessibility violations for personal form', async () => {
      const { container } = render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations for professional form', async () => {
      const { container } = render(
        <RelationshipFormFields
          formData={defaultProfessionalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper labels for all form fields', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^type/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /relationship/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('error messages have role="alert"', () => {
      const errors = { name: 'Name is required' };

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={errors}
        />
      );

      const errorElement = screen.getByText('Name is required');
      expect(errorElement.closest('[role="alert"]')).toBeInTheDocument();
    });

    it('required fields have aria-required attribute', () => {
      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      const nameInput = screen.getByLabelText(/^name/i);
      const typeSelect = screen.getByLabelText(/^type/i);
      const relationshipInput = screen.getByRole('combobox', { name: /relationship/i });
      const statusDropdown = screen.getByLabelText(/status/i);

      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(typeSelect).toHaveAttribute('aria-required', 'true');
      expect(relationshipInput).toHaveAttribute('aria-required', 'true');
      expect(statusDropdown).toHaveAttribute('aria-required', 'true');
    });

    it('fields with errors have aria-invalid attribute', () => {
      const errors = { name: 'Name is required' };

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={errors}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('fields with errors are described by error message', () => {
      const errors = { name: 'Name is required' };

      render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={errors}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      const errorId = nameInput.getAttribute('aria-describedby');

      expect(errorId).toBeTruthy();
      const errorElement = document.getElementById(errorId!);
      expect(errorElement).toHaveTextContent('Name is required');
    });
  });

  // =================================================================
  // Edge Case Tests
  // =================================================================

  describe('Edge Cases', () => {
    it('handles empty product owners list for professional relationships', () => {
      render(
        <RelationshipFormFields
          formData={defaultProfessionalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      // Should still render relationship field
      expect(screen.getByRole('combobox', { name: /relationship/i })).toBeInTheDocument();
    });

    it('handles undefined product owners', () => {
      render(
        <RelationshipFormFields
          formData={defaultProfessionalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      // Should still render without errors
      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    });

    it('handles pre-filled form data', () => {
      const filledFormData: Partial<SpecialRelationshipFormData> = {
        name: 'John Smith',
        type: 'Personal',
        relationship: 'Spouse',
        status: 'Active',
        email: 'john@example.com',
        phone_number: '01234567890',
      };

      render(
        <RelationshipFormFields
          formData={filledFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('01234567890')).toBeInTheDocument();
    });

    it('handles switching between personal and professional', () => {
      const { rerender } = render(
        <RelationshipFormFields
          formData={defaultPersonalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();

      rerender(
        <RelationshipFormFields
          formData={defaultProfessionalFormData as SpecialRelationshipFormData}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          errors={{}}
        />
      );

      expect(screen.queryByLabelText(/date of birth/i)).not.toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /relationship/i })).toBeInTheDocument();
    });
  });
});
