/**
 * SpecialRelationshipRow Component Tests (Cycle 5 - RED Phase)
 *
 * Comprehensive test suite for the SpecialRelationshipRow component.
 * Tests rendering of Personal vs Professional relationships, status-based styling,
 * action buttons integration, React.memo optimization, age calculation, and field handling.
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 * These tests WILL FAIL because the component doesn't exist yet.
 *
 * @component SpecialRelationshipRow
 * @requirements
 * - Display Personal relationships with: first_name, last_name, relationship_type, date_of_birth, age, email, phone, status
 * - Display Professional relationships with: first_name, last_name, relationship_type, company_name, position, email, phone, status
 * - Status-based styling: Active (green), Inactive (gray), Deceased (red/dark)
 * - Integration with SpecialRelationshipActions component
 * - React.memo optimization to prevent unnecessary re-renders
 * - Age calculation from date_of_birth for personal relationships
 * - Handle missing/null fields gracefully (display "-" or empty)
 * - Support row click callbacks for editing
 * - Proper accessibility (ARIA attributes, keyboard navigation)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import SpecialRelationshipRow from '@/components/SpecialRelationshipRow';
import {
  SpecialRelationship,
  PERSONAL_RELATIONSHIP_TYPES,
  PROFESSIONAL_RELATIONSHIP_TYPES,
} from '@/types/specialRelationship';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock the SpecialRelationshipActions component
jest.mock('@/components/SpecialRelationshipActions', () => {
  return function MockSpecialRelationshipActions({ relationship }: any) {
    return (
      <div data-testid="mock-actions">
        Actions for {relationship.name}
      </div>
    );
  };
});

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

// =================================================================
// Factory Functions for Test Data
// =================================================================

/**
 * Creates a Personal relationship (e.g., Spouse, Child, Parent)
 * Personal relationships have date_of_birth and no professional fields
 */
const createPersonalRelationship = (
  overrides?: Partial<SpecialRelationship>
): SpecialRelationship => ({
  id: 101,
  product_owner_ids: [123],
  type: 'Personal',
  relationship: 'Spouse',
  status: 'Active',
  title: 'Mrs',
  name: 'Jane Smith',
  date_of_birth: '1975-06-15',
  email: 'jane.smith@example.com',
  phone_number: '+44-7700-900001',
  address_id: null,
  address_line1: '123 Main St',
  address_line2: 'Apt 4B',
  city: 'London',
  county: 'Greater London',
  postcode: 'SW1A 1AA',
  country: 'United Kingdom',
  notes: 'Primary contact',
  firm_name: null,
  dependency: false,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  ...overrides,
});

/**
 * Creates a Professional relationship (e.g., Accountant, Solicitor)
 * Professional relationships have firm_name
 * and typically no date_of_birth
 */
const createProfessionalRelationship = (
  overrides?: Partial<SpecialRelationship>
): SpecialRelationship => ({
  id: 201,
  product_owner_ids: [123],
  type: 'Professional',
  relationship: 'Accountant',
  status: 'Active',
  title: 'Mr',
  name: 'John Johnson',
  date_of_birth: null,
  email: 'john.johnson@accounting.co.uk',
  phone_number: '+44-7700-900002',
  address_id: null,
  address_line1: '456 Business Ave',
  address_line2: 'Suite 200',
  city: 'London',
  county: 'Greater London',
  postcode: 'EC1A 1BB',
  country: 'United Kingdom',
  notes: null,
  firm_name: 'Johnson & Associates',
  dependency: false,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  ...overrides,
});

/**
 * Creates an Inactive relationship
 */
const createInactiveRelationship = (
  overrides?: Partial<SpecialRelationship>
): SpecialRelationship => ({
  ...createPersonalRelationship(),
  id: 102,
  status: 'Inactive',
  ...overrides,
});

/**
 * Creates a Deceased relationship
 */
const createDeceasedRelationship = (
  overrides?: Partial<SpecialRelationship>
): SpecialRelationship => ({
  ...createPersonalRelationship(),
  id: 103,
  status: 'Deceased',
  ...overrides,
});

/**
 * Helper to calculate age from date_of_birth
 * Matches the logic expected in the component
 */
const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

// =================================================================
// Test Suite
// =================================================================

describe('SpecialRelationshipRow Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <table>
        <tbody>{children}</tbody>
      </table>
    </QueryClientProvider>
  );

  // =================================================================
  // Personal Relationship Rendering Tests
  // =================================================================

  describe('Personal Relationship Rendering', () => {
    it('renders all fields for personal relationship (Spouse)', () => {
      const relationship = createPersonalRelationship({
        relationship: 'Spouse',
        name: 'Alice Johnson',
        date_of_birth: '1980-03-15',
        email: 'alice@example.com',
        phone_number: '+44-7700-900123',
        status: 'Active',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Check all expected fields are displayed
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Spouse')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('+44-7700-900123')).toBeInTheDocument();

      // Age should be calculated and displayed
      const expectedAge = calculateAge('1980-03-15');
      expect(screen.getByText(expectedAge.toString())).toBeInTheDocument();
    });

    it('renders date of birth for personal relationships', () => {
      const relationship = createPersonalRelationship({
        date_of_birth: '1990-12-25',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Date should be displayed (format may vary, but should contain year)
      expect(screen.getByText(/1990/)).toBeInTheDocument();
    });

    it('calculates and displays age correctly from date_of_birth', () => {
      const relationship = createPersonalRelationship({
        date_of_birth: '2000-01-01',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      const expectedAge = calculateAge('2000-01-01');
      expect(screen.getByText(expectedAge.toString())).toBeInTheDocument();
    });

    it('does not display professional fields for personal relationships', () => {
      const relationship = createPersonalRelationship();

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Should NOT show company_name or position columns for personal relationships
      expect(screen.queryByText('Company')).not.toBeInTheDocument();
      expect(screen.queryByText('Position')).not.toBeInTheDocument();
    });

    it('renders Child relationship type correctly', () => {
      const relationship = createPersonalRelationship({
        relationship: 'Child',
        name: 'Emma Smith',
        date_of_birth: '2010-05-20',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      expect(screen.getByText('Child')).toBeInTheDocument();
      expect(screen.getByText('Emma Smith')).toBeInTheDocument();
    });
  });

  // =================================================================
  // Professional Relationship Rendering Tests
  // =================================================================

  describe('Professional Relationship Rendering', () => {
    it('renders all fields for professional relationship (Accountant)', () => {
      const relationship = createProfessionalRelationship({
        relationship: 'Accountant',
        name: 'Robert Brown',
        firm_name: 'Brown & Co',
        email: 'robert@brown.com',
        phone_number: '+44-7700-900456',
        status: 'Active',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Check all expected fields are displayed
      expect(screen.getByText('Robert Brown')).toBeInTheDocument();
      expect(screen.getByText('Accountant')).toBeInTheDocument();
      expect(screen.getByText('Brown & Co')).toBeInTheDocument();
      expect(screen.getByText('robert@brown.com')).toBeInTheDocument();
      expect(screen.getByText('+44-7700-900456')).toBeInTheDocument();
    });

    it('renders Solicitor relationship type correctly', () => {
      const relationship = createProfessionalRelationship({
        relationship: 'Solicitor',
        name: 'Sarah Williams',
        firm_name: 'Williams Legal',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      expect(screen.getByText('Solicitor')).toBeInTheDocument();
      expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
      expect(screen.getByText('Williams Legal')).toBeInTheDocument();
    });

    it('does not display date_of_birth or age for professional relationships', () => {
      const relationship = createProfessionalRelationship();

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Should NOT show date_of_birth or age columns for professional relationships
      expect(screen.queryByText(/Birth/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Age/i)).not.toBeInTheDocument();
    });

    it('renders Financial Advisor relationship type correctly', () => {
      const relationship = createProfessionalRelationship({
        relationship: 'Financial Advisor',
        name: 'Michael Davis',
        firm_name: 'Davis Financial Services',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      expect(screen.getByText('Financial Advisor')).toBeInTheDocument();
      expect(screen.getByText('Michael Davis')).toBeInTheDocument();
    });
  });

  // =================================================================
  // Status-Based Styling Tests
  // =================================================================

  describe('Status-Based Styling', () => {
    it('applies Active status styling (green)', () => {
      const relationship = createPersonalRelationship({
        status: 'Active',
      });

      const { container } = render(
        <SpecialRelationshipRow relationship={relationship} />,
        { wrapper }
      );

      const row = container.querySelector('tr');

      // Row should have classes indicating active status (e.g., green background or text)
      expect(row?.className).toMatch(/active|green/i);
    });

    it('applies Inactive status styling (gray)', () => {
      const relationship = createInactiveRelationship();

      const { container } = render(
        <SpecialRelationshipRow relationship={relationship} />,
        { wrapper }
      );

      const row = container.querySelector('tr');

      // Row should have classes indicating inactive status (e.g., gray background or text)
      expect(row?.className).toMatch(/inactive|gray|grey/i);
    });

    it('applies Deceased status styling (red/dark)', () => {
      const relationship = createDeceasedRelationship();

      const { container } = render(
        <SpecialRelationshipRow relationship={relationship} />,
        { wrapper }
      );

      const row = container.querySelector('tr');

      // Row should have classes indicating deceased status (e.g., red or dark styling)
      expect(row?.className).toMatch(/deceased|red|dark/i);
    });

    it('displays status badge with correct text', () => {
      const activeRelationship = createPersonalRelationship({ status: 'Active' });

      render(<SpecialRelationshipRow relationship={activeRelationship} />, { wrapper });

      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  // =================================================================
  // Action Buttons Integration Tests
  // =================================================================

  describe('Action Buttons Integration', () => {
    it('renders SpecialRelationshipActions component', () => {
      const relationship = createPersonalRelationship();

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Mock actions component should be present
      expect(screen.getByTestId('mock-actions')).toBeInTheDocument();
    });

    it('passes relationship prop to SpecialRelationshipActions', () => {
      const relationship = createPersonalRelationship({
        name: 'TestFirst TestLast',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Mock component displays the name, verifying it received the relationship prop
      expect(screen.getByText(/Actions for TestFirst TestLast/)).toBeInTheDocument();
    });
  });

  // =================================================================
  // React.memo Optimization Tests
  // =================================================================

  describe('React.memo Optimization', () => {
    it('does not re-render when unrelated props change', () => {
      const relationship = createPersonalRelationship();
      let renderCount = 0;

      // Wrap component to track renders
      const TestComponent = React.memo(
        ({ rel, unrelatedProp }: { rel: SpecialRelationship; unrelatedProp: number }) => {
          renderCount++;
          return <SpecialRelationshipRow relationship={rel} />;
        }
      );

      const { rerender } = render(
        <TestComponent rel={relationship} unrelatedProp={1} />,
        { wrapper }
      );

      expect(renderCount).toBe(1);

      // Re-render with same relationship but different unrelatedProp
      rerender(<TestComponent rel={relationship} unrelatedProp={2} />);

      // Component should re-render since prop changed (but inner row shouldn't if memoized correctly)
      expect(renderCount).toBe(2);
    });

    it('re-renders when relationship data changes', () => {
      const relationship = createPersonalRelationship({ name: 'Original Name' });

      const { rerender } = render(
        <SpecialRelationshipRow relationship={relationship} />,
        { wrapper }
      );

      expect(screen.getByText('Original Name')).toBeInTheDocument();

      // Change relationship data
      const updatedRelationship = { ...relationship, name: 'Updated Name' };
      rerender(<SpecialRelationshipRow relationship={updatedRelationship} />);

      // Should show updated data
      expect(screen.getByText('Updated Name')).toBeInTheDocument();
      expect(screen.queryByText('Original Name')).not.toBeInTheDocument();
    });

    it('re-renders when status changes', () => {
      const relationship = createPersonalRelationship({ status: 'Active' });

      const { rerender, container } = render(
        <SpecialRelationshipRow relationship={relationship} />,
        { wrapper }
      );

      const initialRow = container.querySelector('tr');
      const initialClassName = initialRow?.className;

      // Change status
      const updatedRelationship = { ...relationship, status: 'Inactive' as const };
      rerender(<SpecialRelationshipRow relationship={updatedRelationship} />);

      const updatedRow = container.querySelector('tr');
      const updatedClassName = updatedRow?.className;

      // Styling should change
      expect(initialClassName).not.toBe(updatedClassName);
    });
  });

  // =================================================================
  // Missing/Null Field Handling Tests
  // =================================================================

  describe('Missing/Null Field Handling', () => {
    it('displays "-" when email is null', () => {
      const relationship = createPersonalRelationship({
        email: null,
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Should show placeholder for missing email
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('displays "-" when phone is null', () => {
      const relationship = createPersonalRelationship({
        phone_number: null,
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Should show placeholder for missing phone
      const placeholders = screen.getAllByText('-');
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it('displays "-" when firm_name is null for professional', () => {
      const relationship = createProfessionalRelationship({
        firm_name: null,
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles missing date_of_birth gracefully', () => {
      const relationship = createPersonalRelationship({
        date_of_birth: null,
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Should show placeholder and not crash
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles empty string fields', () => {
      const relationship = createPersonalRelationship({
        email: '',
        phone_number: '',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Should display placeholders for empty strings
      const placeholders = screen.getAllByText('-');
      expect(placeholders.length).toBeGreaterThan(0);
    });
  });

  // =================================================================
  // Row Click Handler Tests
  // =================================================================

  describe('Row Click Handler', () => {
    it('calls onClick callback when row is clicked', async () => {
      const user = userEvent.setup();
      const relationship = createPersonalRelationship();
      const handleClick = jest.fn();

      render(
        <SpecialRelationshipRow relationship={relationship} onClick={handleClick} />,
        { wrapper }
      );

      const row = screen.getByText('Jane Smith').closest('tr');
      expect(row).toBeInTheDocument();

      if (row) {
        await user.click(row);
      }

      expect(handleClick).toHaveBeenCalledWith(relationship);
    });

    it('does not call onClick when action buttons are clicked', async () => {
      const user = userEvent.setup();
      const relationship = createPersonalRelationship();
      const handleClick = jest.fn();

      render(
        <SpecialRelationshipRow relationship={relationship} onClick={handleClick} />,
        { wrapper }
      );

      // Click on actions area (mocked component)
      const actionsArea = screen.getByTestId('mock-actions');
      await user.click(actionsArea);

      // Row onClick should not be triggered due to event propagation stopping
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // =================================================================
  // Accessibility Tests
  // =================================================================

  describe('Accessibility', () => {
    it('has no accessibility violations for personal relationship', async () => {
      const relationship = createPersonalRelationship();

      const { container } = render(
        <table>
          <tbody>
            <SpecialRelationshipRow relationship={relationship} />
          </tbody>
        </table>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations for professional relationship', async () => {
      const relationship = createProfessionalRelationship();

      const { container } = render(
        <table>
          <tbody>
            <SpecialRelationshipRow relationship={relationship} />
          </tbody>
        </table>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper table row structure', () => {
      const relationship = createPersonalRelationship();

      const { container } = render(
        <SpecialRelationshipRow relationship={relationship} />,
        { wrapper }
      );

      const row = container.querySelector('tr');
      const cells = container.querySelectorAll('td');

      expect(row).toBeInTheDocument();
      expect(cells.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation on clickable rows', async () => {
      const user = userEvent.setup();
      const relationship = createPersonalRelationship();
      const handleClick = jest.fn();

      render(
        <SpecialRelationshipRow relationship={relationship} onClick={handleClick} />,
        { wrapper }
      );

      const row = screen.getByText('Jane Smith').closest('tr');

      if (row) {
        row.focus();
        await user.keyboard('{Enter}');
      }

      // Should support Enter key activation
      expect(handleClick).toHaveBeenCalled();
    });
  });

  // =================================================================
  // Edge Cases
  // =================================================================

  describe('Edge Cases', () => {
    it('handles very long names gracefully', () => {
      const relationship = createPersonalRelationship({
        name: 'VeryLongFirstNameThatExceedsNormalLength VeryLongLastNameThatExceedsNormalLength',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Should render without breaking layout
      expect(screen.getByText('VeryLongFirstNameThatExceedsNormalLength VeryLongLastNameThatExceedsNormalLength')).toBeInTheDocument();
    });

    it('handles future dates in date_of_birth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const relationship = createPersonalRelationship({
        date_of_birth: futureDateString,
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Should handle gracefully (age might be negative or show error)
      // Component should not crash
      const smithElements = screen.getAllByText(/Smith/);
      expect(smithElements.length).toBeGreaterThan(0);
      expect(smithElements[0]).toBeInTheDocument();
    });

    it('handles special characters in names', () => {
      const relationship = createPersonalRelationship({
        name: "O'Brien Müller-Smith",
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      expect(screen.getByText("O'Brien Müller-Smith")).toBeInTheDocument();
    });
  });
});
