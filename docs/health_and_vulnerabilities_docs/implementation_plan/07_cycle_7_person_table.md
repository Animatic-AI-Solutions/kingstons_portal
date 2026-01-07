# Cycle 7: PersonTable Component

**Goal**: Create the main table showing all product owners and special relationships with Name, Relationship, Active, Inactive, and Actions columns

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for the PersonTable component.

**File**: `frontend/src/tests/components/phase2/health-vulnerabilities/PersonTable.test.tsx`

```typescript
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import PersonTable from '@/components/phase2/health-vulnerabilities/PersonTable';
import { PersonWithCounts } from '@/types/healthVulnerability';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

describe('PersonTable', () => {
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

  const mockOnAdd = jest.fn();
  const mockOnRowClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('column rendering', () => {
    it('should render all column headers', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Relationship')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('product owner rendering', () => {
    it('should render all product owners', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display relationship type', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText('Primary Owner')).toBeInTheDocument();
      expect(screen.getByText('Joint Owner')).toBeInTheDocument();
    });

    it('should display active and inactive counts', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      // John Smith has 3 active, 1 inactive
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should NOT display SR tag for product owners', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const srTags = screen.queryAllByText('SR');
      expect(srTags).toHaveLength(0);
    });
  });

  describe('special relationship rendering', () => {
    it('should render special relationships at bottom', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const rows = screen.getAllByRole('row');
      // Header + 2 product owners + 1 special relationship = 4 rows
      expect(rows).toHaveLength(4);

      // Last data row should be special relationship
      expect(rows[3]).toHaveTextContent('Tom Smith');
    });

    it('should display SR tag for special relationships', () => {
      render(
        <PersonTable
          productOwners={[]}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText('SR')).toBeInTheDocument();
    });

    it('should apply purple styling to special relationship rows', () => {
      render(
        <PersonTable
          productOwners={[]}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const row = screen.getByText('Tom Smith').closest('tr');
      expect(row).toHaveClass('bg-purple-50');
    });
  });

  describe('actions column', () => {
    it('should have an add button for each row', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      expect(addButtons).toHaveLength(3); // 2 POs + 1 SR
    });

    it('should call onAdd with person data when add button clicked', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      fireEvent.click(addButtons[0]);

      expect(mockOnAdd).toHaveBeenCalledWith(mockProductOwners[0]);
    });
  });

  describe('row click behavior', () => {
    it('should call onRowClick when row is clicked', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      fireEvent.click(screen.getByText('John Smith'));

      expect(mockOnRowClick).toHaveBeenCalledWith(mockProductOwners[0]);
    });

    it('should not trigger onRowClick when add button is clicked', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      fireEvent.click(addButtons[0]);

      expect(mockOnAdd).toHaveBeenCalled();
      expect(mockOnRowClick).not.toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no people', () => {
      render(
        <PersonTable
          productOwners={[]}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText(/no people found/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper table structure', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    });

    it('should have aria-expanded attribute on rows', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
          expandedPersonId={null}
        />
      );

      const rows = screen.getAllByRole('row');
      // Data rows (excluding header) should have aria-expanded
      const dataRows = rows.slice(1);
      dataRows.forEach(row => {
        expect(row).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should set aria-expanded to true for expanded row', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
          expandedPersonId={1}
        />
      );

      const johnRow = screen.getByText('John Smith').closest('tr');
      expect(johnRow).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-controls linking to nested table', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
          expandedPersonId={1}
        />
      );

      const johnRow = screen.getByText('John Smith').closest('tr');
      expect(johnRow).toHaveAttribute('aria-controls', 'nested-table-product_owner-1');
    });

    // jest-axe automated accessibility tests
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in empty state', async () => {
      const { container } = render(
        <PersonTable
          productOwners={[]}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with expanded row', async () => {
      const { container } = render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
          expandedPersonId={1}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ===========================================================================
  // Keyboard Navigation Tests
  // ===========================================================================

  describe('keyboard navigation', () => {
    it('should allow tab navigation to add buttons', async () => {
      const user = userEvent.setup();
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const addButtons = screen.getAllByRole('button', { name: /add/i });

      // Tab to first add button
      await user.tab();
      expect(addButtons[0]).toHaveFocus();

      // Tab to second add button
      await user.tab();
      expect(addButtons[1]).toHaveFocus();
    });

    it('should allow Enter key to activate add button', async () => {
      const user = userEvent.setup();
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      addButtons[0].focus();
      await user.keyboard('{Enter}');

      expect(mockOnAdd).toHaveBeenCalledWith(mockProductOwners[0]);
    });

    it('should allow Space key to activate add button', async () => {
      const user = userEvent.setup();
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      addButtons[0].focus();
      await user.keyboard(' ');

      expect(mockOnAdd).toHaveBeenCalledWith(mockProductOwners[0]);
    });

    it('should have visible focus indicator on add button', async () => {
      const user = userEvent.setup();
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      await user.tab();

      // Check that focus ring classes are applied
      expect(addButtons[0]).toHaveClass('focus:ring-2');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle product owners only (no special relationships)', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.queryByText('SR')).not.toBeInTheDocument();
    });

    it('should handle special relationships only (no product owners)', () => {
      render(
        <PersonTable
          productOwners={[]}
          specialRelationships={mockSpecialRelationships}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText('Tom Smith')).toBeInTheDocument();
      expect(screen.getByText('SR')).toBeInTheDocument();
    });

    it('should handle very long names gracefully', () => {
      const longNamePerson: PersonWithCounts = {
        id: 99,
        name: 'A'.repeat(100) + ' ' + 'B'.repeat(100),
        relationship: 'Primary Owner',
        personType: 'product_owner',
        status: 'Active',
        activeCount: 0,
        inactiveCount: 0,
      };

      render(
        <PersonTable
          productOwners={[longNamePerson]}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText(longNamePerson.name)).toBeInTheDocument();
    });

    it('should handle special characters in names', () => {
      const specialCharPerson: PersonWithCounts = {
        id: 99,
        name: "O'Brien-Smith & Partners <Test>",
        relationship: 'Primary Owner',
        personType: 'product_owner',
        status: 'Active',
        activeCount: 0,
        inactiveCount: 0,
      };

      render(
        <PersonTable
          productOwners={[specialCharPerson]}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText("O'Brien-Smith & Partners <Test>")).toBeInTheDocument();
    });

    it('should handle unicode characters in names', () => {
      const unicodePerson: PersonWithCounts = {
        id: 99,
        name: '田中太郎 émoji 🏠',
        relationship: 'Primary Owner',
        personType: 'product_owner',
        status: 'Active',
        activeCount: 0,
        inactiveCount: 0,
      };

      render(
        <PersonTable
          productOwners={[unicodePerson]}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText('田中太郎 émoji 🏠')).toBeInTheDocument();
    });

    it('should handle zero counts correctly', () => {
      const zeroPerson: PersonWithCounts = {
        id: 99,
        name: 'Zero Count Person',
        relationship: 'Primary Owner',
        personType: 'product_owner',
        status: 'Active',
        activeCount: 0,
        inactiveCount: 0,
      };

      render(
        <PersonTable
          productOwners={[zeroPerson]}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const row = screen.getByText('Zero Count Person').closest('tr');
      expect(within(row!).getAllByText('0')).toHaveLength(2);
    });

    it('should handle large counts correctly', () => {
      const largePerson: PersonWithCounts = {
        id: 99,
        name: 'Large Count Person',
        relationship: 'Primary Owner',
        personType: 'product_owner',
        status: 'Active',
        activeCount: 999,
        inactiveCount: 1000,
      };

      render(
        <PersonTable
          productOwners={[largePerson]}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('should handle many rows without performance issues', () => {
      const manyPeople: PersonWithCounts[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Person ${i + 1}`,
        relationship: i % 2 === 0 ? 'Primary Owner' : 'Joint Owner',
        personType: 'product_owner' as const,
        status: 'Active',
        activeCount: i,
        inactiveCount: i % 10,
      }));

      const startTime = performance.now();
      render(
        <PersonTable
          productOwners={manyPeople}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );
      const endTime = performance.now();

      // Should render within 500ms even with 100 rows
      expect(endTime - startTime).toBeLessThan(500);
      expect(screen.getAllByRole('row')).toHaveLength(101); // header + 100 data rows
    });

    it('should handle duplicate IDs from different person types', () => {
      const poWithId1: PersonWithCounts = {
        id: 1,
        name: 'Product Owner 1',
        relationship: 'Primary Owner',
        personType: 'product_owner',
        status: 'Active',
        activeCount: 1,
        inactiveCount: 0,
      };

      const srWithId1: PersonWithCounts = {
        id: 1, // Same ID but different personType
        name: 'Special Relationship 1',
        relationship: 'Child',
        personType: 'special_relationship',
        status: 'Active',
        activeCount: 2,
        inactiveCount: 0,
      };

      render(
        <PersonTable
          productOwners={[poWithId1]}
          specialRelationships={[srWithId1]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      // Both should render (keyed by personType-id)
      expect(screen.getByText('Product Owner 1')).toBeInTheDocument();
      expect(screen.getByText('Special Relationship 1')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Screen Reader Support Tests
  // ===========================================================================

  describe('screen reader support', () => {
    it('should have descriptive aria-labels on add buttons', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      expect(screen.getByRole('button', { name: /add health or vulnerability for john smith/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add health or vulnerability for jane smith/i })).toBeInTheDocument();
    });

    it('should use proper table semantics with scope attributes', () => {
      render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
        />
      );

      const headers = screen.getAllByRole('columnheader');
      headers.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });

    it('should announce expanded state changes', () => {
      const { rerender } = render(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
          expandedPersonId={null}
        />
      );

      const johnRow = screen.getByText('John Smith').closest('tr');
      expect(johnRow).toHaveAttribute('aria-expanded', 'false');

      rerender(
        <PersonTable
          productOwners={mockProductOwners}
          specialRelationships={[]}
          onAdd={mockOnAdd}
          onRowClick={mockOnRowClick}
          expandedPersonId={1}
        />
      );

      expect(johnRow).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
```

---

## GREEN Phase - Implement Component

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the PersonTable component to pass all tests.

**File**: `frontend/src/components/phase2/health-vulnerabilities/PersonTable.tsx`

```typescript
/**
 * PersonTable Component
 *
 * Displays product owners and special relationships in a table with:
 * - Name (with SR tag for special relationships)
 * - Relationship
 * - Active count
 * - Inactive count
 * - Actions (Add button)
 */

import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { EmptyState } from '@/components/ui';
import { PersonWithCounts } from '@/types/healthVulnerability';

interface PersonTableProps {
  productOwners: PersonWithCounts[];
  specialRelationships: PersonWithCounts[];
  onAdd: (person: PersonWithCounts) => void;
  onRowClick: (person: PersonWithCounts) => void;
  expandedPersonId?: number | null;
}

const PersonTable: React.FC<PersonTableProps> = ({
  productOwners,
  specialRelationships,
  onAdd,
  onRowClick,
  expandedPersonId,
}) => {
  // Combine with product owners first, special relationships at bottom
  const allPeople = [...productOwners, ...specialRelationships];

  if (allPeople.length === 0) {
    return (
      <EmptyState
        title="No people found"
        message="No product owners or special relationships in this client group"
      />
    );
  }

  const handleAddClick = (e: React.MouseEvent, person: PersonWithCounts) => {
    e.stopPropagation(); // Prevent row click
    onAdd(person);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200" role="table">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Relationship
            </th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Active
            </th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Inactive
            </th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {allPeople.map((person) => {
            const isSpecialRelationship = person.personType === 'special_relationship';
            const isExpanded = expandedPersonId === person.id;
            const nestedTableId = `nested-table-${person.personType}-${person.id}`;

            return (
              <tr
                key={`${person.personType}-${person.id}`}
                onClick={() => onRowClick(person)}
                aria-expanded={isExpanded}
                aria-controls={nestedTableId}
                className={`
                  cursor-pointer transition-colors
                  ${isSpecialRelationship ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50'}
                  ${isExpanded ? 'bg-primary-50' : ''}
                `}
              >
                {/* Name Column */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {person.name}
                    </span>
                    {isSpecialRelationship && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-200 text-purple-800">
                        SR
                      </span>
                    )}
                  </div>
                </td>

                {/* Relationship Column */}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {person.relationship}
                </td>

                {/* Active Count Column */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className={`text-sm font-medium ${person.activeCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {person.activeCount}
                  </span>
                </td>

                {/* Inactive Count Column */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className={`text-sm font-medium ${person.inactiveCount > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                    {person.inactiveCount}
                  </span>
                </td>

                {/* Actions Column */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <button
                    onClick={(e) => handleAddClick(e, person)}
                    className="inline-flex items-center justify-center p-1.5 rounded-md text-primary-600 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label={`Add health or vulnerability for ${person.name}`}
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PersonTable;
```

---

## BLUE Phase - Refactor

- [ ] Add expand/collapse indicator icon in Name column
- [ ] Add sorting capability for columns
- [ ] Add loading skeleton variant
- [ ] Optimize with React.memo
- [ ] Add comprehensive JSDoc comments

---

## Acceptance Criteria

- [ ] All 40+ tests pass (unit, a11y, keyboard, edge cases, screen reader)
- [ ] Name column shows SR tag for special relationships
- [ ] Relationship column displays correctly
- [ ] Active/Inactive counts display correctly with proper styling
- [ ] Add button in Actions column works
- [ ] Special relationships appear at bottom with purple styling
- [ ] Row click triggers onRowClick callback
- [ ] Add button click does NOT trigger row click (event propagation stopped)
- [ ] Rows have aria-expanded attribute (true/false based on expansion state)
- [ ] Rows have aria-controls linking to nested table ID
- [ ] **Accessibility (jest-axe)**: No WCAG violations in any state
- [ ] **Keyboard**: Tab navigation, Enter/Space activation, visible focus indicators
- [ ] **Screen reader**: Descriptive aria-labels, proper table semantics with scope
- [ ] **Edge cases**: Long names, special chars, unicode, zero/large counts, many rows, duplicate IDs
