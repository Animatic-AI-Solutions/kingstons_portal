# Cycle 9: VulnerabilitiesTable Component

**Goal**: Create the nested table for displaying vulnerabilities with columns: Description, Adjustments, Diagnosed, Recorded, Status, Actions

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for the VulnerabilitiesTable component.

**File**: `frontend/src/tests/components/phase2/health-vulnerabilities/VulnerabilitiesTable.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import VulnerabilitiesTable from '@/components/phase2/health-vulnerabilities/VulnerabilitiesTable';
import { Vulnerability } from '@/types/healthVulnerability';

describe('VulnerabilitiesTable', () => {
  const mockVulnerabilities: Vulnerability[] = [
    {
      id: 1,
      product_owner_id: 100,
      description: 'Hearing impairment',
      adjustments: 'Speak clearly, face-to-face',
      diagnosed: true,
      date_recorded: '2024-01-15T10:30:00Z',
      status: 'Active',
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      product_owner_id: 100,
      description: 'Cognitive decline',
      adjustments: 'Involve family in discussions',
      diagnosed: false,
      date_recorded: '2024-02-20T14:00:00Z',
      status: 'Monitoring',
      notes: 'Suspected early dementia',
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
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Adjustments')).toBeInTheDocument();
      expect(screen.getByText('Diagnosed')).toBeInTheDocument();
      expect(screen.getByText('Recorded')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    it('should render all vulnerabilities', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Hearing impairment')).toBeInTheDocument();
      expect(screen.getByText('Cognitive decline')).toBeInTheDocument();
    });

    it('should display adjustments', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Speak clearly, face-to-face')).toBeInTheDocument();
      expect(screen.getByText('Involve family in discussions')).toBeInTheDocument();
    });

    it('should show diagnosed as Yes/No', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('should format recorded date as dd/MM/yyyy', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
      expect(screen.getByText('20/02/2024')).toBeInTheDocument();
    });

    it('should display status', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
    });

    it('should display dash for missing adjustments', () => {
      const vulnWithNoAdjustments: Vulnerability[] = [{
        ...mockVulnerabilities[0],
        adjustments: null,
      }];

      render(
        <VulnerabilitiesTable
          vulnerabilities={vulnWithNoAdjustments}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('row click for edit', () => {
    it('should call onRowClick when row is clicked', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
          personId={100}
          personType="product_owner"
          onRowClick={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const row = screen.getByText('Hearing impairment').closest('tr');
      fireEvent.click(row!);

      expect(mockOnEdit).toHaveBeenCalledWith(mockVulnerabilities[0]);
    });

    it('should have cursor-pointer on rows', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
          personId={100}
          personType="product_owner"
          onRowClick={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const row = screen.getByText('Hearing impairment').closest('tr');
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  describe('delete action', () => {
    it('should have delete button for each row', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
          personId={100}
          personType="product_owner"
          onRowClick={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(2);
    });

    it('should call onDelete with vulnerability data when delete clicked', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
          personId={100}
          personType="product_owner"
          onRowClick={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith(mockVulnerabilities[0]);
    });

    it('should not trigger row click when delete button is clicked', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={mockVulnerabilities}
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
    it('should show empty state when no vulnerabilities', () => {
      render(
        <VulnerabilitiesTable
          vulnerabilities={[]}
          personId={100}
          personType="product_owner"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/no vulnerabilities/i)).toBeInTheDocument();
    });
  });
});
```

---

## GREEN Phase - Implement Component

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the VulnerabilitiesTable component to pass all tests.

**File**: `frontend/src/components/phase2/health-vulnerabilities/VulnerabilitiesTable.tsx`

```typescript
/**
 * VulnerabilitiesTable Component
 *
 * Displays vulnerabilities in a nested table with:
 * - Description, Adjustments, Diagnosed (Yes/No), Recorded (date), Status, Actions
 * - Click on row to edit (opens EditHealthVulnerabilityModal)
 * - Delete button with confirmation dialog
 *
 * @component
 * @param {VulnerabilitiesTableProps} props - Component props
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { DeleteIconButton, EmptyState } from '@/components/ui';
import DeleteConfirmationModal from '@/components/phase2/people/DeleteConfirmationModal';
import { Vulnerability, PersonType } from '@/types/healthVulnerability';
import { useDeleteVulnerability } from '@/hooks/useHealthVulnerabilities';

interface VulnerabilitiesTableProps {
  /** Array of vulnerabilities to display */
  vulnerabilities: Vulnerability[];
  /** ID of the person who owns these vulnerabilities */
  personId: number;
  /** Whether person is product_owner or special_relationship */
  personType: PersonType;
  /** Callback when row is clicked to edit */
  onRowClick: (vulnerability: Vulnerability) => void;
  /** Callback when delete is confirmed */
  onDelete: (vulnerability: Vulnerability) => void;
  /** Loading state */
  isLoading?: boolean;
}

const EMPTY_VALUE = '-';

const VulnerabilitiesTable: React.FC<VulnerabilitiesTableProps> = ({
  vulnerabilities,
  personId,
  personType,
  onRowClick,
  onDelete,
  isLoading = false,
}) => {
  // State for delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<Vulnerability | null>(null);
  const deleteVulnerability = useDeleteVulnerability();

  if (vulnerabilities.length === 0) {
    return (
      <div className="py-4">
        <EmptyState
          title="No vulnerabilities"
          message="No vulnerabilities recorded for this person"
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

  const handleDeleteClick = (e: React.MouseEvent, vulnerability: Vulnerability) => {
    e.stopPropagation(); // Prevent row click
    setDeleteTarget(vulnerability);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    await deleteVulnerability.mutateAsync({
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
                Description
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Adjustments
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                Diagnosed
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Recorded
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
            {vulnerabilities.map((vulnerability) => (
              <tr
                key={vulnerability.id}
                onClick={() => onRowClick(vulnerability)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-3 py-2 text-sm text-gray-900">
                  {vulnerability.description}
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">
                  {vulnerability.adjustments || EMPTY_VALUE}
                </td>
                <td className="px-3 py-2 text-sm text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium
                    ${vulnerability.diagnosed ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}
                  `}>
                    {vulnerability.diagnosed ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">
                  {formatDate(vulnerability.date_recorded)}
                </td>
                <td className="px-3 py-2 text-sm">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium
                    ${vulnerability.status === 'Active' ? 'bg-green-100 text-green-800' : ''}
                    ${vulnerability.status === 'Resolved' ? 'bg-gray-100 text-gray-800' : ''}
                    ${vulnerability.status === 'Monitoring' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${vulnerability.status === 'Inactive' ? 'bg-gray-100 text-gray-600' : ''}
                  `}>
                    <span className="sr-only">Status: </span>
                    {vulnerability.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <DeleteIconButton
                    onClick={(e) => handleDeleteClick(e, vulnerability)}
                    ariaLabel={`Delete ${vulnerability.description}`}
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
        isLoading={deleteVulnerability.isPending}
        title="Delete Vulnerability"
        description={`Are you sure you want to delete "${deleteTarget?.description}"? This action cannot be undone.`}
      />
    </>
  );
};

export default VulnerabilitiesTable;
```

---

## BLUE Phase - Refactor

- [x] Ensure consistent styling with HealthConditionsTable
- [ ] Add loading skeleton state
- [x] Add confirmation dialog for delete (DeleteConfirmationModal integrated)
- [ ] Extract common table patterns to shared component

---

## Acceptance Criteria

- [ ] All 14 tests pass
- [ ] Columns: Description, Adjustments, Diagnosed, Recorded, Status, Actions
- [ ] Diagnosed shows Yes/No (not true/false)
- [ ] Recorded date formatted as dd/MM/yyyy
- [ ] Row click opens edit modal (via onRowClick callback)
- [ ] Delete button shows confirmation dialog before deleting
- [ ] Delete button click does NOT trigger row click
- [ ] Empty state displays when no vulnerabilities
- [ ] Consistent styling with HealthConditionsTable
- [ ] Status badges have sr-only text for accessibility
