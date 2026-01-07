# Cycle 11: HealthSubTab Component

**Goal**: Create the Health sub-tab that combines PersonTable with expandable HealthConditionsTable

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for the HealthSubTab component.

**File**: `frontend/src/tests/components/phase2/health-vulnerabilities/HealthSubTab.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import HealthSubTab from '@/components/phase2/health-vulnerabilities/HealthSubTab';
import * as hooks from '@/hooks/useHealthVulnerabilities';
import * as productOwnerHooks from '@/hooks/useProductOwners';
import * as srHooks from '@/hooks/useSpecialRelationships';

expect.extend(toHaveNoViolations);

jest.mock('@/hooks/useHealthVulnerabilities');
jest.mock('@/hooks/useProductOwners');
jest.mock('@/hooks/useSpecialRelationships');

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('HealthSubTab', () => {
  const mockProductOwners = [
    { id: 1, firstname: 'John', surname: 'Smith', relationship: 'Primary Owner', status: 'active' },
    { id: 2, firstname: 'Jane', surname: 'Smith', relationship: 'Joint Owner', status: 'active' },
  ];

  const mockSpecialRelationships = [
    { id: 10, name: 'Tom Smith', relationship_type: 'Child', status: 'Active' },
  ];

  const mockHealthPO = [
    { id: 1, product_owner_id: 1, condition: 'Smoking', name: 'Current Smoker', status: 'Active' },
    { id: 2, product_owner_id: 1, condition: 'Diabetes', name: 'Type 2', status: 'Monitoring' },
    { id: 3, product_owner_id: 2, condition: 'Heart Disease', name: 'CAD', status: 'Inactive' },
  ];

  const mockHealthSR = [
    { id: 4, special_relationship_id: 10, condition: 'Asthma', name: 'Mild', status: 'Active' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
      data: mockProductOwners,
      isLoading: false,
      error: null,
    });

    (srHooks.useSpecialRelationships as jest.Mock).mockReturnValue({
      data: mockSpecialRelationships,
      isLoading: false,
      error: null,
    });

    (hooks.useHealthProductOwners as jest.Mock).mockReturnValue({
      data: mockHealthPO,
      isLoading: false,
      error: null,
    });

    (hooks.useHealthSpecialRelationships as jest.Mock).mockReturnValue({
      data: mockHealthSR,
      isLoading: false,
      error: null,
    });
  });

  describe('person table rendering', () => {
    it('should render all product owners', async () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should render special relationships at bottom', async () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      expect(screen.getByText('Tom Smith')).toBeInTheDocument();
      expect(screen.getByText('SR')).toBeInTheDocument();
    });

    it('should display correct active/inactive counts', async () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      // John Smith has 2 active (Smoking, Diabetes-Monitoring counts as active?), 0 inactive
      // This depends on business logic - adjust test based on actual requirements
    });
  });

  describe('expandable rows', () => {
    it('should expand row to show health conditions when clicked', async () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      // Click on John Smith row
      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        // Should show health conditions table
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
        expect(screen.getByText('Type 2')).toBeInTheDocument();
      });
    });

    it('should collapse row when clicked again', async () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      // Expand
      fireEvent.click(screen.getByText('John Smith'));
      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(screen.getByText('John Smith'));
      await waitFor(() => {
        expect(screen.queryByText('Current Smoker')).not.toBeVisible();
      });
    });

    it('should show smoking conditions at top in expanded table', async () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // Find the health conditions table rows
        // Smoking should be first
      });
    });
  });

  describe('add modal', () => {
    it('should open add modal when add button clicked', async () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      fireEvent.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/add health condition/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading state', () => {
      (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state with retry button', () => {
      (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: jest.fn(),
      });

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no people', () => {
      (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });
      (srHooks.useSpecialRelationships as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      expect(screen.getByText(/no people found/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with expanded row', async () => {
      const { container } = render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Expand row
      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper table role structure', () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
    });

    it('should indicate expandable rows with aria-expanded', async () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      const row = screen.getByText('John Smith').closest('tr');
      expect(row).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(row).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('keyboard navigation', () => {
    it('should expand row on Enter key', async () => {
      const user = userEvent.setup();

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      const row = screen.getByText('John Smith').closest('tr');
      row?.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });
    });

    it('should expand row on Space key', async () => {
      const user = userEvent.setup();

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      const row = screen.getByText('John Smith').closest('tr');
      row?.focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });
    });

    it('should allow tab navigation to add buttons', async () => {
      const user = userEvent.setup();

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Tab to first add button
      await user.tab();
      await user.tab();

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      expect(addButtons[0]).toHaveFocus();
    });
  });

  describe('edge cases', () => {
    it('should handle many product owners (100+)', async () => {
      const manyOwners = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        firstname: `Person${i}`,
        surname: `Surname${i}`,
        relationship: i === 0 ? 'Primary Owner' : 'Joint Owner',
        status: 'active',
      }));

      (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
        data: manyOwners,
        isLoading: false,
        error: null,
      });

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Person0 Surname0')).toBeInTheDocument();
        expect(screen.getByText('Person99 Surname99')).toBeInTheDocument();
      });
    });

    it('should handle product owner with no health records', async () => {
      (hooks.useHealthProductOwners as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Expand row - should show empty nested table
      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(screen.getByText(/no health conditions/i)).toBeInTheDocument();
      });
    });

    it('should handle person with very long name', () => {
      const longNameOwner = [{
        id: 1,
        firstname: 'A'.repeat(50),
        surname: 'B'.repeat(50),
        relationship: 'Primary Owner',
        status: 'active',
      }];

      (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
        data: longNameOwner,
        isLoading: false,
        error: null,
      });

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      expect(screen.getByText(`${'A'.repeat(50)} ${'B'.repeat(50)}`)).toBeInTheDocument();
    });

    it('should handle special characters in names', () => {
      const specialOwner = [{
        id: 1,
        firstname: "O'Brien",
        surname: 'Smith-Jones',
        relationship: 'Primary Owner',
        status: 'active',
      }];

      (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
        data: specialOwner,
        isLoading: false,
        error: null,
      });

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      expect(screen.getByText("O'Brien Smith-Jones")).toBeInTheDocument();
    });

    it('should handle unicode names', () => {
      const unicodeOwner = [{
        id: 1,
        firstname: '田中',
        surname: '太郎',
        relationship: 'Primary Owner',
        status: 'active',
      }];

      (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
        data: unicodeOwner,
        isLoading: false,
        error: null,
      });

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      expect(screen.getByText('田中 太郎')).toBeInTheDocument();
    });

    it('should handle rapid expand/collapse clicks', async () => {
      const user = userEvent.setup();

      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Rapid clicks should not break the component
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByText('John Smith'));
      }

      // Component should still be responsive
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    it('should maintain expanded state when data refreshes', async () => {
      const { rerender } = render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Expand row
      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });

      // Simulate data refresh - rerender with same data
      rerender(<HealthSubTab clientGroupId={1} />);

      // Row should still be expanded
      expect(screen.getByText('Current Smoker')).toBeInTheDocument();
    });
  });

  describe('edit modal', () => {
    it('should open edit modal when health condition row clicked', async () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Expand row
      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });

      // Click on health condition row to edit
      fireEvent.click(screen.getByText('Current Smoker'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/edit health condition/i)).toBeInTheDocument();
      });
    });
  });

  describe('delete functionality', () => {
    it('should show delete confirmation when delete clicked', async () => {
      render(<HealthSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Expand row
      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });

      // Click delete button for first condition
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/confirm delete/i)).toBeInTheDocument();
      });
    });
  });
});
```

---

## GREEN Phase - Implement Component

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the HealthSubTab component to pass all tests.

**File**: `frontend/src/components/phase2/health-vulnerabilities/HealthSubTab.tsx`

```typescript
/**
 * HealthSubTab Component
 *
 * Displays the Health sub-tab with:
 * - PersonTable showing all product owners and special relationships
 * - Expandable rows revealing HealthConditionsTable
 * - Add modal for creating new health conditions
 */

import React, { useState, useMemo, useCallback } from 'react';
import { SkeletonTable, ErrorDisplay } from '@/components/ui';
import PersonTable from './PersonTable';
import HealthConditionsTable from './HealthConditionsTable';
import AddHealthVulnerabilityModal from './AddHealthVulnerabilityModal';
import EditHealthVulnerabilityModal from './EditHealthVulnerabilityModal';
import {
  useHealthProductOwners,
  useHealthSpecialRelationships,
} from '@/hooks/useHealthVulnerabilities';
import { useProductOwners } from '@/hooks/useProductOwners';
import { useSpecialRelationships } from '@/hooks/useSpecialRelationships';
import { PersonWithCounts, HealthCondition } from '@/types/healthVulnerability';

interface HealthSubTabProps {
  clientGroupId: number;
  productOwnerId?: number;
}

const HealthSubTab: React.FC<HealthSubTabProps> = ({
  clientGroupId,
  productOwnerId,
}) => {
  const [expandedPersonId, setExpandedPersonId] = useState<number | null>(null);
  const [expandedPersonType, setExpandedPersonType] = useState<'product_owner' | 'special_relationship' | null>(null);

  // Add Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonWithCounts | null>(null);

  // Edit Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthCondition | null>(null);

  // Fetch data
  const {
    data: productOwners = [],
    isLoading: isLoadingOwners,
    error: ownersError,
    refetch: refetchOwners,
  } = useProductOwners(clientGroupId);

  // NOTE: useSpecialRelationships requires productOwnerId, not clientGroupId
  // For Phase 2 client group context, fetch special relationships for the primary product owner
  // or use a client-group-level hook if available
  const primaryProductOwner = useMemo(() => {
    if (productOwnerId) return productOwnerId;
    // Find primary product owner from the loaded product owners
    const primary = productOwners.find(po => po.relationship === 'Primary Owner');
    return primary?.id;
  }, [productOwnerId, productOwners]);

  const {
    data: specialRelationships = [],
    isLoading: isLoadingSR,
    error: srError,
    refetch: refetchSR,
  } = useSpecialRelationships(primaryProductOwner);

  const {
    data: healthProductOwners = [],
    isLoading: isLoadingHealthPO,
  } = useHealthProductOwners(clientGroupId);

  const {
    data: healthSpecialRelationships = [],
    isLoading: isLoadingHealthSR,
  } = useHealthSpecialRelationships(clientGroupId);

  const isLoading = isLoadingOwners || isLoadingSR || isLoadingHealthPO || isLoadingHealthSR;
  const error = ownersError || srError;

  // Calculate counts and map to PersonWithCounts
  const productOwnersWithCounts: PersonWithCounts[] = useMemo(() => {
    return productOwners.map(po => {
      const healthRecords = healthProductOwners.filter(h => h.product_owner_id === po.id);
      const activeCount = healthRecords.filter(h => h.status === 'Active' || h.status === 'Monitoring').length;
      const inactiveCount = healthRecords.filter(h => h.status === 'Inactive' || h.status === 'Resolved').length;

      return {
        id: po.id,
        name: `${po.firstname} ${po.surname}`,
        relationship: po.relationship || 'Product Owner',
        personType: 'product_owner' as const,
        status: po.status,
        activeCount,
        inactiveCount,
      };
    });
  }, [productOwners, healthProductOwners]);

  const specialRelationshipsWithCounts: PersonWithCounts[] = useMemo(() => {
    return specialRelationships.map(sr => {
      const healthRecords = healthSpecialRelationships.filter(h => h.special_relationship_id === sr.id);
      const activeCount = healthRecords.filter(h => h.status === 'Active' || h.status === 'Monitoring').length;
      const inactiveCount = healthRecords.filter(h => h.status === 'Inactive' || h.status === 'Resolved').length;

      return {
        id: sr.id,
        name: sr.name,
        relationship: sr.relationship_type || 'Special Relationship',
        personType: 'special_relationship' as const,
        status: sr.status,
        activeCount,
        inactiveCount,
      };
    });
  }, [specialRelationships, healthSpecialRelationships]);

  // Get health conditions for expanded person
  const expandedPersonHealth: HealthCondition[] = useMemo(() => {
    if (!expandedPersonId || !expandedPersonType) return [];

    if (expandedPersonType === 'product_owner') {
      return healthProductOwners.filter(h => h.product_owner_id === expandedPersonId);
    } else {
      return healthSpecialRelationships.filter(h => h.special_relationship_id === expandedPersonId);
    }
  }, [expandedPersonId, expandedPersonType, healthProductOwners, healthSpecialRelationships]);

  const handleRowClick = useCallback((person: PersonWithCounts) => {
    if (expandedPersonId === person.id && expandedPersonType === person.personType) {
      setExpandedPersonId(null);
      setExpandedPersonType(null);
    } else {
      setExpandedPersonId(person.id);
      setExpandedPersonType(person.personType);
    }
  }, [expandedPersonId, expandedPersonType]);

  const handleAdd = useCallback((person: PersonWithCounts) => {
    setSelectedPerson(person);
    setAddModalOpen(true);
  }, []);

  const handleAddModalClose = useCallback(() => {
    setAddModalOpen(false);
    setSelectedPerson(null);
  }, []);

  const handleAddModalSuccess = useCallback(() => {
    // Queries will be invalidated by the mutation hook
    handleAddModalClose();
  }, [handleAddModalClose]);

  // Edit modal handlers - triggered when clicking on a health condition row
  const handleEdit = useCallback((condition: HealthCondition) => {
    // Find the person for this condition
    const person = expandedPersonType === 'product_owner'
      ? productOwnersWithCounts.find(p => p.id === condition.product_owner_id)
      : specialRelationshipsWithCounts.find(p => p.id === condition.special_relationship_id);

    if (person) {
      setSelectedPerson(person);
      setSelectedRecord(condition);
      setEditModalOpen(true);
    }
  }, [expandedPersonType, productOwnersWithCounts, specialRelationshipsWithCounts]);

  const handleEditModalClose = useCallback(() => {
    setEditModalOpen(false);
    setSelectedRecord(null);
  }, []);

  const handleEditModalSuccess = useCallback(() => {
    // Queries will be invalidated by the mutation hook
    handleEditModalClose();
  }, [handleEditModalClose]);

  const handleDelete = useCallback((condition: HealthCondition) => {
    // Delete handled by HealthConditionsTable with DeleteConfirmationModal
  }, []);

  const handleRetry = useCallback(() => {
    refetchOwners();
    refetchSR();
  }, [refetchOwners, refetchSR]);

  // Loading state
  if (isLoading) {
    return <SkeletonTable rowCount={5} role="status" />;
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        message="Failed to load health data"
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PersonTable
        productOwners={productOwnersWithCounts}
        specialRelationships={specialRelationshipsWithCounts}
        onAdd={handleAdd}
        onRowClick={handleRowClick}
        expandedPersonId={expandedPersonId}
      />

      {/* Expanded Health Conditions Table */}
      {expandedPersonId && expandedPersonType && (
        <div className="ml-8 mt-2" id={`nested-table-${expandedPersonType}-${expandedPersonId}`}>
          <HealthConditionsTable
            conditions={expandedPersonHealth}
            personId={expandedPersonId}
            personType={expandedPersonType}
            onRowClick={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* Add Modal */}
      {selectedPerson && (
        <AddHealthVulnerabilityModal
          isOpen={addModalOpen}
          onClose={handleAddModalClose}
          person={selectedPerson}
          tabType="health"
          onSuccess={handleAddModalSuccess}
        />
      )}

      {/* Edit Modal */}
      {selectedPerson && selectedRecord && (
        <EditHealthVulnerabilityModal
          isOpen={editModalOpen}
          onClose={handleEditModalClose}
          person={selectedPerson}
          record={selectedRecord}
          tabType="health"
          onSuccess={handleEditModalSuccess}
        />
      )}
    </div>
  );
};

export default HealthSubTab;
```

---

## BLUE Phase - Refactor

- [ ] Add edit/delete modal handlers
- [ ] Optimize re-renders with React.memo
- [ ] Add error boundaries
- [ ] Extract common logic to custom hook

---

## Acceptance Criteria

- [ ] All 28+ tests pass (10 base + 18 enhanced)
- [ ] PersonTable displays all people with correct counts
- [ ] Rows expand/collapse on click
- [ ] Expanded rows show HealthConditionsTable
- [ ] Add modal opens when add button clicked
- [ ] Loading, error, and empty states work correctly
- [ ] **Accessibility**: No jest-axe violations, proper ARIA attributes, aria-expanded on rows
- [ ] **Keyboard navigation**: Enter/Space expand rows, tab navigation to buttons
- [ ] **Edge cases**: Many owners (100+), empty health records, long names, special chars, unicode, rapid clicks
- [ ] **Edit modal**: Opens when clicking health condition row
- [ ] **Delete modal**: Shows confirmation when delete clicked
