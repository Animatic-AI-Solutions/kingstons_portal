/**
 * PersonTable Component Tests (RED Phase - Cycle 7)
 *
 * Tests for the PersonTable component that displays product owners and special
 * relationships with health/vulnerability counts in the Health & Vulnerabilities Tab.
 *
 * The component displays:
 * - Name column with person name
 * - Relationship column with relationship type
 * - Active column with count of active health conditions + vulnerabilities
 * - Inactive column with count of inactive/resolved records
 * - Actions column with add button
 *
 * Special relationships are displayed at the bottom with a purple SR badge.
 *
 * Following TDD RED-GREEN-BLUE methodology.
 * Expected Result: All tests FAIL (RED phase) until implementation complete.
 *
 * @module tests/components/phase2/health-vulnerabilities/PersonTable
 */

import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import type { PersonWithCounts } from '@/types/healthVulnerability';

// This import will fail in RED phase - component doesn't exist yet
import PersonTable from '@/components/phase2/health-vulnerabilities/PersonTable';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// =============================================================================
// Mock Data
// =============================================================================

const mockProductOwners: PersonWithCounts[] = [
  {
    id: 1,
    name: 'John Smith',
    relationship: 'Primary Owner',
    personType: 'product_owner',
    status: 'Active',
    activeCount: 3,
    inactiveCount: 1,
  },
  {
    id: 2,
    name: 'Jane Smith',
    relationship: 'Joint Owner',
    personType: 'product_owner',
    status: 'Active',
    activeCount: 0,
    inactiveCount: 0,
  },
];

const mockSpecialRelationships: PersonWithCounts[] = [
  {
    id: 10,
    name: 'Tom Smith',
    relationship: 'Child',
    personType: 'special_relationship',
    status: 'Active',
    activeCount: 1,
    inactiveCount: 2,
  },
];

// Default props for rendering
const defaultProps = {
  productOwners: mockProductOwners,
  specialRelationships: mockSpecialRelationships,
  onAdd: jest.fn(),
  onRowClick: jest.fn(),
  expandedPersonId: null,
};

// =============================================================================
// Test Suite
// =============================================================================

describe('PersonTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // 1. Column Rendering
  // ===========================================================================

  describe('Column Rendering', () => {
    it('should render all 5 column headers (Name, Relationship, Active, Inactive, Actions)', () => {
      render(<PersonTable {...defaultProps} />);

      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /relationship/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /^active$/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /^inactive$/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 2. Product Owner Rendering
  // ===========================================================================

  describe('Product Owner Rendering', () => {
    it('should render all product owners', () => {
      render(<PersonTable {...defaultProps} />);

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display relationship type', () => {
      render(<PersonTable {...defaultProps} />);

      expect(screen.getByText('Primary Owner')).toBeInTheDocument();
      expect(screen.getByText('Joint Owner')).toBeInTheDocument();
    });

    it('should display active and inactive counts', () => {
      render(<PersonTable {...defaultProps} />);

      // John Smith has 3 active, 1 inactive
      const rows = screen.getAllByRole('row');
      const johnRow = rows.find(row => within(row).queryByText('John Smith'));
      expect(johnRow).toBeInTheDocument();

      if (johnRow) {
        expect(within(johnRow).getByText('3')).toBeInTheDocument();
        expect(within(johnRow).getByText('1')).toBeInTheDocument();
      }
    });

    it('should NOT display SR tag for product owners', () => {
      render(<PersonTable {...defaultProps} />);

      // Find John Smith's row and verify no SR badge
      const rows = screen.getAllByRole('row');
      const johnRow = rows.find(row => within(row).queryByText('John Smith'));

      if (johnRow) {
        // SR badge should not exist in product owner rows
        expect(within(johnRow).queryByText('SR')).not.toBeInTheDocument();
      }
    });
  });

  // ===========================================================================
  // 3. Special Relationship Rendering
  // ===========================================================================

  describe('Special Relationship Rendering', () => {
    it('should render special relationships at bottom of table', () => {
      render(<PersonTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      // Product owners should come first, then special relationships
      const lastDataRow = rows[rows.length - 1];
      expect(within(lastDataRow).getByText('Tom Smith')).toBeInTheDocument();
    });

    it('should display SR tag (purple badge) for special relationships', () => {
      render(<PersonTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      const tomRow = rows.find(row => within(row).queryByText('Tom Smith'));

      if (tomRow) {
        // SR badge should exist in special relationship rows
        const srBadge = within(tomRow).getByText('SR');
        expect(srBadge).toBeInTheDocument();
        // Badge should have purple styling
        expect(srBadge).toHaveClass('bg-purple-100', 'text-purple-800');
      }
    });

    it('should apply purple background styling to SR rows (bg-purple-50)', () => {
      render(<PersonTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      const tomRow = rows.find(row => within(row).queryByText('Tom Smith'));

      if (tomRow) {
        expect(tomRow).toHaveClass('bg-purple-50');
      }
    });
  });

  // ===========================================================================
  // 4. Actions Column
  // ===========================================================================

  describe('Actions Column', () => {
    it('should have an add button for each row', () => {
      render(<PersonTable {...defaultProps} />);

      // 2 product owners + 1 special relationship = 3 add buttons
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      expect(addButtons).toHaveLength(3);
    });

    it('should call onAdd with person data when add button clicked', async () => {
      const mockOnAdd = jest.fn();
      const user = userEvent.setup();

      render(<PersonTable {...defaultProps} onAdd={mockOnAdd} />);

      // Click add button for John Smith
      const addButtons = screen.getAllByRole('button', { name: /add health or vulnerability for john smith/i });
      await user.click(addButtons[0]);

      expect(mockOnAdd).toHaveBeenCalledTimes(1);
      expect(mockOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'John Smith',
          personType: 'product_owner',
        })
      );
    });
  });

  // ===========================================================================
  // 5. Row Click Behavior
  // ===========================================================================

  describe('Row Click Behavior', () => {
    it('should call onRowClick when row is clicked', async () => {
      const mockOnRowClick = jest.fn();
      const user = userEvent.setup();

      render(<PersonTable {...defaultProps} onRowClick={mockOnRowClick} />);

      const rows = screen.getAllByRole('row');
      // Click the first data row (John Smith)
      await user.click(rows[1]);

      expect(mockOnRowClick).toHaveBeenCalledTimes(1);
      expect(mockOnRowClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'John Smith',
        })
      );
    });

    it('should NOT trigger onRowClick when add button is clicked (event propagation stopped)', async () => {
      const mockOnRowClick = jest.fn();
      const mockOnAdd = jest.fn();
      const user = userEvent.setup();

      render(
        <PersonTable
          {...defaultProps}
          onRowClick={mockOnRowClick}
          onAdd={mockOnAdd}
        />
      );

      // Click the add button for John Smith
      const addButtons = screen.getAllByRole('button', { name: /add health or vulnerability for john smith/i });
      await user.click(addButtons[0]);

      // onAdd should be called, but onRowClick should NOT be called
      expect(mockOnAdd).toHaveBeenCalledTimes(1);
      expect(mockOnRowClick).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 6. Empty State
  // ===========================================================================

  describe('Empty State', () => {
    it('should show "No people found" message when no data', () => {
      render(
        <PersonTable
          productOwners={[]}
          specialRelationships={[]}
          onAdd={jest.fn()}
          onRowClick={jest.fn()}
        />
      );

      expect(screen.getByText(/no people found/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 7. Accessibility (jest-axe)
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have proper table structure (treegrid, columnheader roles)', () => {
      render(<PersonTable {...defaultProps} />);

      // Using treegrid role for expandable rows with aria-expanded
      expect(screen.getByRole('treegrid')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    });

    it('should have aria-expanded attribute on rows (false by default)', () => {
      render(<PersonTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row
      const dataRows = rows.slice(1);

      dataRows.forEach(row => {
        expect(row).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should set aria-expanded to true for expanded row', () => {
      // Must pass both expandedPersonId and expandedPersonType for row to be expanded
      render(<PersonTable {...defaultProps} expandedPersonId={1} expandedPersonType="product_owner" />);

      const rows = screen.getAllByRole('row');
      const johnRow = rows.find(row => within(row).queryByText('John Smith'));

      if (johnRow) {
        expect(johnRow).toHaveAttribute('aria-expanded', 'true');
      }
    });

    it('should have aria-controls linking to nested table ID', () => {
      // Must pass both expandedPersonId and expandedPersonType for row to be expanded
      render(<PersonTable {...defaultProps} expandedPersonId={1} expandedPersonType="product_owner" />);

      const rows = screen.getAllByRole('row');
      const johnRow = rows.find(row => within(row).queryByText('John Smith'));

      if (johnRow) {
        const ariaControls = johnRow.getAttribute('aria-controls');
        expect(ariaControls).toBeTruthy();
        // The controlled element should exist
        expect(document.getElementById(ariaControls!)).toBeInTheDocument();
      }
    });

    it('should have no accessibility violations (use jest-axe)', async () => {
      const { container } = render(<PersonTable {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no a11y violations in empty state', async () => {
      const { container } = render(
        <PersonTable
          productOwners={[]}
          specialRelationships={[]}
          onAdd={jest.fn()}
          onRowClick={jest.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no a11y violations with expanded row', async () => {
      const { container } = render(
        <PersonTable {...defaultProps} expandedPersonId={1} expandedPersonType="product_owner" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ===========================================================================
  // 8. Keyboard Navigation
  // ===========================================================================

  describe('Keyboard Navigation', () => {
    it('should allow tab navigation to add buttons', async () => {
      const user = userEvent.setup();
      render(<PersonTable {...defaultProps} />);

      // Tab through elements until we reach the first add button
      await user.tab();
      let iterations = 0;
      const maxIterations = 20;

      while (
        iterations < maxIterations &&
        !document.activeElement?.getAttribute('aria-label')?.includes('Add health or vulnerability')
      ) {
        await user.tab();
        iterations++;
      }

      // Should have focused an add button
      expect(document.activeElement).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Add health or vulnerability')
      );
    });

    it('should allow Enter key to activate add button', async () => {
      const mockOnAdd = jest.fn();
      const user = userEvent.setup();

      render(<PersonTable {...defaultProps} onAdd={mockOnAdd} />);

      // Focus the first add button
      const addButtons = screen.getAllByRole('button', { name: /add health or vulnerability/i });
      addButtons[0].focus();

      // Press Enter
      await user.keyboard('{Enter}');

      expect(mockOnAdd).toHaveBeenCalledTimes(1);
    });

    it('should allow Space key to activate add button', async () => {
      const mockOnAdd = jest.fn();
      const user = userEvent.setup();

      render(<PersonTable {...defaultProps} onAdd={mockOnAdd} />);

      // Focus the first add button
      const addButtons = screen.getAllByRole('button', { name: /add health or vulnerability/i });
      addButtons[0].focus();

      // Press Space
      await user.keyboard(' ');

      expect(mockOnAdd).toHaveBeenCalledTimes(1);
    });

    it('should have visible focus indicator (focus:ring-2 class)', async () => {
      const user = userEvent.setup();
      render(<PersonTable {...defaultProps} />);

      const addButtons = screen.getAllByRole('button', { name: /add health or vulnerability/i });
      addButtons[0].focus();

      // Check for focus ring classes
      expect(addButtons[0]).toHaveClass('focus:ring-2');
    });
  });

  // ===========================================================================
  // 9. Screen Reader Support
  // ===========================================================================

  describe('Screen Reader Support', () => {
    it('should have descriptive aria-labels on add buttons (e.g., "Add health or vulnerability for John Smith")', () => {
      render(<PersonTable {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /add health or vulnerability for john smith/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add health or vulnerability for jane smith/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add health or vulnerability for tom smith/i })
      ).toBeInTheDocument();
    });

    it('should use proper table semantics with scope="col" on headers', () => {
      render(<PersonTable {...defaultProps} />);

      const headers = screen.getAllByRole('columnheader');
      headers.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });

    it('should announce expanded state changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<PersonTable {...defaultProps} />);

      // Initial state - not expanded
      const rows = screen.getAllByRole('row');
      const johnRow = rows.find(row => within(row).queryByText('John Smith'));
      expect(johnRow).toHaveAttribute('aria-expanded', 'false');

      // Rerender with expanded row (must pass both id and type)
      rerender(<PersonTable {...defaultProps} expandedPersonId={1} expandedPersonType="product_owner" />);

      const updatedRows = screen.getAllByRole('row');
      const updatedJohnRow = updatedRows.find(row => within(row).queryByText('John Smith'));
      expect(updatedJohnRow).toHaveAttribute('aria-expanded', 'true');
    });
  });

  // ===========================================================================
  // 10. Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle product owners only (no SRs)', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={jest.fn()}
          onRowClick={jest.fn()}
        />
      );

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('Tom Smith')).not.toBeInTheDocument();
    });

    it('should handle special relationships only (no POs)', () => {
      render(
        <PersonTable
          productOwners={[]}
          specialRelationships={mockSpecialRelationships}
          onAdd={jest.fn()}
          onRowClick={jest.fn()}
        />
      );

      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.getByText('Tom Smith')).toBeInTheDocument();
    });

    it('should handle very long names gracefully', () => {
      const longNamePO: PersonWithCounts[] = [
        {
          id: 100,
          name: 'Very Long Name That Might Overflow The Container And Cause Layout Issues',
          relationship: 'Primary Owner',
          personType: 'product_owner',
          status: 'Active',
          activeCount: 1,
          inactiveCount: 0,
        },
      ];

      render(
        <PersonTable
          productOwners={longNamePO}
          specialRelationships={[]}
          onAdd={jest.fn()}
          onRowClick={jest.fn()}
        />
      );

      const nameElement = screen.getByText(
        'Very Long Name That Might Overflow The Container And Cause Layout Issues'
      );
      expect(nameElement).toBeInTheDocument();
      // Should have truncation class or text-overflow handling
      expect(nameElement).toHaveClass('truncate');
    });

    it("should handle special characters in names (O'Brien-Smith & Partners)", () => {
      const specialCharPO: PersonWithCounts[] = [
        {
          id: 101,
          name: "O'Brien-Smith & Partners",
          relationship: 'Primary Owner',
          personType: 'product_owner',
          status: 'Active',
          activeCount: 0,
          inactiveCount: 0,
        },
      ];

      render(
        <PersonTable
          productOwners={specialCharPO}
          specialRelationships={[]}
          onAdd={jest.fn()}
          onRowClick={jest.fn()}
        />
      );

      expect(screen.getByText("O'Brien-Smith & Partners")).toBeInTheDocument();
    });

    it('should handle unicode characters in names', () => {
      const unicodePO: PersonWithCounts[] = [
        {
          id: 102,
          name: '\u7530\u4E2D\u592A\u90CE', // Tanaka Taro in Japanese
          relationship: 'Primary Owner',
          personType: 'product_owner',
          status: 'Active',
          activeCount: 2,
          inactiveCount: 1,
        },
      ];

      render(
        <PersonTable
          productOwners={unicodePO}
          specialRelationships={[]}
          onAdd={jest.fn()}
          onRowClick={jest.fn()}
        />
      );

      expect(screen.getByText('\u7530\u4E2D\u592A\u90CE')).toBeInTheDocument();
    });

    it('should handle zero counts correctly', () => {
      render(<PersonTable {...defaultProps} />);

      // Jane Smith has 0 active, 0 inactive
      const rows = screen.getAllByRole('row');
      const janeRow = rows.find(row => within(row).queryByText('Jane Smith'));

      if (janeRow) {
        const zeroCells = within(janeRow).getAllByText('0');
        expect(zeroCells).toHaveLength(2); // Both active and inactive are 0
      }
    });

    it('should handle large counts (999, 1000)', () => {
      const largeCounts: PersonWithCounts[] = [
        {
          id: 103,
          name: 'Big Counter',
          relationship: 'Primary Owner',
          personType: 'product_owner',
          status: 'Active',
          activeCount: 999,
          inactiveCount: 1000,
        },
      ];

      render(
        <PersonTable
          productOwners={largeCounts}
          specialRelationships={[]}
          onAdd={jest.fn()}
          onRowClick={jest.fn()}
        />
      );

      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('should handle many rows (100) without performance issues (<500ms)', () => {
      const manyPOs: PersonWithCounts[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Person ${i + 1}`,
        relationship: 'Primary Owner',
        personType: 'product_owner' as const,
        status: 'Active',
        activeCount: i % 10,
        inactiveCount: i % 5,
      }));

      const startTime = performance.now();

      render(
        <PersonTable
          productOwners={manyPOs}
          specialRelationships={[]}
          onAdd={jest.fn()}
          onRowClick={jest.fn()}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Render should complete in under 500ms
      expect(renderTime).toBeLessThan(500);

      // Verify all rows rendered
      const rows = screen.getAllByRole('row');
      // 100 data rows + 1 header row = 101
      expect(rows).toHaveLength(101);
    });

    it('should handle duplicate IDs from different person types (keyed by personType-id)', () => {
      // Same ID but different person types
      const poWithId1: PersonWithCounts[] = [
        {
          id: 1,
          name: 'Product Owner One',
          relationship: 'Primary Owner',
          personType: 'product_owner',
          status: 'Active',
          activeCount: 1,
          inactiveCount: 0,
        },
      ];

      const srWithId1: PersonWithCounts[] = [
        {
          id: 1,
          name: 'Special Relationship One',
          relationship: 'Child',
          personType: 'special_relationship',
          status: 'Active',
          activeCount: 2,
          inactiveCount: 1,
        },
      ];

      render(
        <PersonTable
          productOwners={poWithId1}
          specialRelationships={srWithId1}
          onAdd={jest.fn()}
          onRowClick={jest.fn()}
        />
      );

      // Both should render without key conflicts
      expect(screen.getByText('Product Owner One')).toBeInTheDocument();
      expect(screen.getByText('Special Relationship One')).toBeInTheDocument();

      // Verify correct counts for each
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(3); // header + 2 data rows
    });
  });
});
