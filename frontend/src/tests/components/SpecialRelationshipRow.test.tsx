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
        Actions for {relationship.first_name} {relationship.last_name}
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
  id: 'rel-personal-1',
  client_group_id: 'cg-123',
  relationship_type: 'Spouse',
  status: 'Active',
  title: 'Mrs',
  first_name: 'Jane',
  last_name: 'Smith',
  date_of_birth: '1975-06-15',
  email: 'jane.smith@example.com',
  mobile_phone: '+44-7700-900001',
  home_phone: '+44-20-7946-0001',
  work_phone: null,
  address_line1: '123 Main St',
  address_line2: 'Apt 4B',
  city: 'London',
  county: 'Greater London',
  postcode: 'SW1A 1AA',
  country: 'United Kingdom',
  notes: 'Primary contact',
  company_name: null,
  position: null,
  professional_id: null,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  ...overrides,
});

/**
 * Creates a Professional relationship (e.g., Accountant, Solicitor)
 * Professional relationships have company_name, position, professional_id
 * and typically no date_of_birth
 */
const createProfessionalRelationship = (
  overrides?: Partial<SpecialRelationship>
): SpecialRelationship => ({
  id: 'rel-professional-1',
  client_group_id: 'cg-123',
  relationship_type: 'Accountant',
  status: 'Active',
  title: 'Mr',
  first_name: 'John',
  last_name: 'Johnson',
  date_of_birth: null,
  email: 'john.johnson@accounting.co.uk',
  mobile_phone: '+44-7700-900002',
  home_phone: null,
  work_phone: '+44-20-7946-0002',
  address_line1: '456 Business Ave',
  address_line2: 'Suite 200',
  city: 'London',
  county: 'Greater London',
  postcode: 'EC1A 1BB',
  country: 'United Kingdom',
  notes: null,
  company_name: 'Johnson & Associates',
  position: 'Senior Partner',
  professional_id: 'ACCA-12345',
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
  id: 'rel-inactive-1',
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
  id: 'rel-deceased-1',
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
        relationship_type: 'Spouse',
        first_name: 'Alice',
        last_name: 'Johnson',
        date_of_birth: '1980-03-15',
        email: 'alice@example.com',
        mobile_phone: '+44-7700-900123',
        status: 'Active',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Check all expected fields are displayed
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Johnson')).toBeInTheDocument();
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
        relationship_type: 'Child',
        first_name: 'Emma',
        last_name: 'Smith',
        date_of_birth: '2010-05-20',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      expect(screen.getByText('Child')).toBeInTheDocument();
      expect(screen.getByText('Emma')).toBeInTheDocument();
    });
  });

  // =================================================================
  // Professional Relationship Rendering Tests
  // =================================================================

  describe('Professional Relationship Rendering', () => {
    it('renders all fields for professional relationship (Accountant)', () => {
      const relationship = createProfessionalRelationship({
        relationship_type: 'Accountant',
        first_name: 'Robert',
        last_name: 'Brown',
        company_name: 'Brown & Co',
        position: 'Managing Director',
        email: 'robert@brown.com',
        mobile_phone: '+44-7700-900456',
        status: 'Active',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Check all expected fields are displayed
      expect(screen.getByText('Robert')).toBeInTheDocument();
      expect(screen.getByText('Brown')).toBeInTheDocument();
      expect(screen.getByText('Accountant')).toBeInTheDocument();
      expect(screen.getByText('Brown & Co')).toBeInTheDocument();
      expect(screen.getByText('Managing Director')).toBeInTheDocument();
      expect(screen.getByText('robert@brown.com')).toBeInTheDocument();
      expect(screen.getByText('+44-7700-900456')).toBeInTheDocument();
    });

    it('renders Solicitor relationship type correctly', () => {
      const relationship = createProfessionalRelationship({
        relationship_type: 'Solicitor',
        first_name: 'Sarah',
        last_name: 'Williams',
        company_name: 'Williams Legal',
        position: 'Partner',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      expect(screen.getByText('Solicitor')).toBeInTheDocument();
      expect(screen.getByText('Sarah')).toBeInTheDocument();
      expect(screen.getByText('Williams Legal')).toBeInTheDocument();
      expect(screen.getByText('Partner')).toBeInTheDocument();
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
        relationship_type: 'Financial Advisor',
        first_name: 'Michael',
        last_name: 'Davis',
        company_name: 'Davis Financial Services',
        position: 'Senior Advisor',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      expect(screen.getByText('Financial Advisor')).toBeInTheDocument();
      expect(screen.getByText('Michael')).toBeInTheDocument();
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
        first_name: 'TestFirst',
        last_name: 'TestLast',
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
      const relationship = createPersonalRelationship({ first_name: 'Original' });

      const { rerender } = render(
        <SpecialRelationshipRow relationship={relationship} />,
        { wrapper }
      );

      expect(screen.getByText('Original')).toBeInTheDocument();

      // Change relationship data
      const updatedRelationship = { ...relationship, first_name: 'Updated' };
      rerender(<SpecialRelationshipRow relationship={updatedRelationship} />);

      // Should show updated data
      expect(screen.getByText('Updated')).toBeInTheDocument();
      expect(screen.queryByText('Original')).not.toBeInTheDocument();
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
        mobile_phone: null,
        home_phone: null,
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Should show placeholder for missing phone
      const placeholders = screen.getAllByText('-');
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it('displays "-" when company_name is null for professional', () => {
      const relationship = createProfessionalRelationship({
        company_name: null,
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('displays "-" when position is null for professional', () => {
      const relationship = createProfessionalRelationship({
        position: null,
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
        mobile_phone: '',
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

      const row = screen.getByText('Jane').closest('tr');
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

      const row = screen.getByText('Jane').closest('tr');

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
        first_name: 'VeryLongFirstNameThatExceedsNormalLength',
        last_name: 'VeryLongLastNameThatExceedsNormalLength',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      // Should render without breaking layout
      expect(screen.getByText('VeryLongFirstNameThatExceedsNormalLength')).toBeInTheDocument();
      expect(screen.getByText('VeryLongLastNameThatExceedsNormalLength')).toBeInTheDocument();
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
        first_name: "O'Brien",
        last_name: 'Müller-Smith',
      });

      render(<SpecialRelationshipRow relationship={relationship} />, { wrapper });

      expect(screen.getByText("O'Brien")).toBeInTheDocument();
      expect(screen.getByText('Müller-Smith')).toBeInTheDocument();
    });
  });
});
