# Cycle 8: HealthConditionsTable Component

**Goal**: Create the nested table for displaying health conditions with columns: Condition, Name, Diagnosed, Medication/Dosage, Status, Actions

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for the HealthConditionsTable component.

**File**: `frontend/src/tests/components/phase2/health-vulnerabilities/HealthConditionsTable.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import HealthConditionsTable from '@/components/phase2/health-vulnerabilities/HealthConditionsTable';
import { HealthCondition } from '@/types/healthVulnerability';

describe('HealthConditionsTable', () => {
  const mockConditions: HealthCondition[] = [
    {
      id: 1,
      product_owner_id: 100,
      condition: 'Heart Disease',
      name: 'Coronary Artery Disease',
      date_of_diagnosis: '2020-05-15',
      status: 'Active',
      medication: 'Aspirin 75mg daily',
      date_recorded: '2024-01-01T00:00:00Z',
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      product_owner_id: 100,
      condition: 'Smoking',
      name: 'Current Smoker',
      date_of_diagnosis: '2015-01-01',
      status: 'Active',
      medication: null,
      date_recorded: '2024-01-01T00:00:00Z',
      notes: '10 cigarettes per day',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 3,
      product_owner_id: 100,
      condition: 'Diabetes',
      name: 'Type 2 Diabetes',
      date_of_diagnosis: '2019-03-20',
      status: 'Monitoring',
      medication: 'Metformin 500mg twice daily',
      date_recorded: '2024-01-01T00:00:00Z',
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('column rendering', () => {
    it('should render all column headers', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Condition')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Diagnosed')).toBeInTheDocument();
      expect(screen.getByText('Medication/Dosage')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    it('should render all health conditions', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Coronary Artery Disease')).toBeInTheDocument();
      expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      expect(screen.getByText('Type 2 Diabetes')).toBeInTheDocument();
    });

    it('should display condition type', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Heart Disease')).toBeInTheDocument();
      expect(screen.getByText('Smoking')).toBeInTheDocument();
      expect(screen.getByText('Diabetes')).toBeInTheDocument();
    });

    it('should format diagnosis date as dd/MM/yyyy', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('15/05/2020')).toBeInTheDocument();
      expect(screen.getByText('01/01/2015')).toBeInTheDocument();
    });

    it('should display medication/dosage', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Aspirin 75mg daily')).toBeInTheDocument();
      expect(screen.getByText('Metformin 500mg twice daily')).toBeInTheDocument();
    });

    it('should display dash for missing medication', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Smoking condition has no medication
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('should display status', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getAllByText('Active')).toHaveLength(2);
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
    });
  });

  describe('smoking condition sorting', () => {
    it('should display smoking conditions at the top', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const rows = screen.getAllByRole('row');
      // First data row (index 1, after header) should be smoking
      expect(rows[1]).toHaveTextContent('Smoking');
      expect(rows[1]).toHaveTextContent('Current Smoker');
    });

    it('should maintain order of non-smoking conditions', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const rows = screen.getAllByRole('row');
      // Smoking first, then Heart Disease, then Diabetes (original order for non-smoking)
      expect(rows[1]).toHaveTextContent('Smoking');
      expect(rows[2]).toHaveTextContent('Heart Disease');
      expect(rows[3]).toHaveTextContent('Diabetes');
    });
  });

  describe('row click for edit', () => {
    it('should call onRowClick when row is clicked', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onRowClick={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const row = screen.getByText('Current Smoker').closest('tr');
      fireEvent.click(row!);

      expect(mockOnEdit).toHaveBeenCalledWith(expect.objectContaining({ condition: 'Smoking' }));
    });

    it('should have cursor-pointer on rows', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onRowClick={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const row = screen.getByText('Current Smoker').closest('tr');
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  describe('delete action', () => {
    it('should have delete button for each row', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onRowClick={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(3);
    });

    it('should call onDelete with condition data when delete clicked', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onRowClick={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith(expect.objectContaining({ condition: 'Smoking' }));
    });

    it('should not trigger row click when delete button is clicked', () => {
      render(
        <HealthConditionsTable
          conditions={mockConditions}
          personId={100}
          personType="product_owner"
          onRowClick={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalled();
      expect(mockOnEdit).not.toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no conditions', () => {
      render(
        <HealthConditionsTable
          conditions={[]}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/no health conditions/i)).toBeInTheDocument();
    });
  });
});
```

---

## GREEN Phase - Implement Component

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the HealthConditionsTable component to pass all tests.

**File**: `frontend/src/components/phase2/health-vulnerabilities/HealthConditionsTable.tsx`

```typescript
/**
 * HealthConditionsTable Component
 *
 * Displays health conditions in a nested table with:
 * - Condition, Name, Diagnosed (date), Medication/Dosage, Status, Actions
 * - Smoking conditions sorted to appear at the top
 * - Click on row to edit (opens EditHealthVulnerabilityModal)
 * - Delete button with confirmation dialog
 *
 * @component
 * @param {HealthConditionsTableProps} props - Component props
 */

import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { DeleteIconButton, EmptyState } from '@/components/ui';
import DeleteConfirmationModal from '@/components/phase2/people/DeleteConfirmationModal';
import { HealthCondition, PersonType, isSmokingCondition } from '@/types/healthVulnerability';
import { useDeleteHealthRecord } from '@/hooks/useHealthVulnerabilities';

interface HealthConditionsTableProps {
  /** Array of health conditions to display */
  conditions: HealthCondition[];
  /** ID of the person who owns these conditions */
  personId: number;
  /** Whether person is product_owner or special_relationship */
  personType: PersonType;
  /** Callback when row is clicked to edit */
  onRowClick: (condition: HealthCondition) => void;
  /** Callback when delete is confirmed (for parent state updates) */
  onDelete: (condition: HealthCondition) => void;
  /** Loading state */
  isLoading?: boolean;
}

const EMPTY_VALUE = '-';

/**
 * Sort conditions with smoking at top, maintaining other order
 */
const sortConditionsWithSmokingFirst = (conditions: HealthCondition[]): HealthCondition[] => {
  const smoking: HealthCondition[] = [];
  const other: HealthCondition[] = [];

  conditions.forEach(condition => {
    if (isSmokingCondition(condition)) {
      smoking.push(condition);
    } else {
      other.push(condition);
    }
  });

  return [...smoking, ...other];
};

const HealthConditionsTable: React.FC<HealthConditionsTableProps> = ({
  conditions,
  personId,
  personType,
  onRowClick,
  onDelete,
  isLoading = false,
}) => {
  // State for delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<HealthCondition | null>(null);
  const deleteHealthRecord = useDeleteHealthRecord();

  // Sort with smoking first
  const sortedConditions = useMemo(
    () => sortConditionsWithSmokingFirst(conditions),
    [conditions]
  );

  if (conditions.length === 0) {
    return (
      <div className="py-4">
        <EmptyState
          title="No health conditions"
          message="No health conditions recorded for this person"
        />
      </div>
    );
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return EMPTY_VALUE;
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return EMPTY_VALUE;
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, condition: HealthCondition) => {
    e.stopPropagation(); // Prevent row click
    setDeleteTarget(condition);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    await deleteHealthRecord.mutateAsync({
      id: deleteTarget.id,
      personType,
    });

    onDelete(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200" role="table">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Condition
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Diagnosed
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Medication/Dosage
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedConditions.map((condition) => (
              <tr
                key={condition.id}
                onClick={() => onRowClick(condition)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-3 py-2 text-sm text-gray-900">
                  {condition.condition}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900">
                  {condition.name || EMPTY_VALUE}
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">
                  {formatDate(condition.date_of_diagnosis)}
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">
                  {condition.medication || EMPTY_VALUE}
                </td>
                <td className="px-3 py-2 text-sm">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium
                    ${condition.status === 'Active' ? 'bg-green-100 text-green-800' : ''}
                    ${condition.status === 'Resolved' ? 'bg-gray-100 text-gray-800' : ''}
                    ${condition.status === 'Monitoring' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${condition.status === 'Inactive' ? 'bg-gray-100 text-gray-600' : ''}
                  `}>
                    <span className="sr-only">Status: </span>
                    {condition.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <DeleteIconButton
                    onClick={(e) => handleDeleteClick(e, condition)}
                    ariaLabel={`Delete ${condition.name || condition.condition}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteHealthRecord.isPending}
        title="Delete Health Condition"
        description={`Are you sure you want to delete "${deleteTarget?.name || deleteTarget?.condition}"? This action cannot be undone.`}
      />
    </>
  );
};

export default HealthConditionsTable;
```

---

## BLUE Phase - Refactor

- [ ] Add loading skeleton state
- [x] Add confirmation dialog for delete (DeleteConfirmationModal integrated)
- [x] Optimize sorting with useMemo
- [x] Add comprehensive JSDoc comments
- [ ] Extract status badge to reusable component

---

## Acceptance Criteria

- [ ] All 16 tests pass
- [ ] Columns: Condition, Name, Diagnosed, Medication/Dosage, Status, Actions
- [ ] Diagnosed date formatted as dd/MM/yyyy
- [ ] Smoking conditions appear at top
- [ ] Row click opens edit modal (via onRowClick callback)
- [ ] Delete button shows confirmation dialog before deleting
- [ ] Delete button click does NOT trigger row click
- [ ] Empty state displays when no conditions
- [ ] Status badges color-coded with sr-only text for accessibility
