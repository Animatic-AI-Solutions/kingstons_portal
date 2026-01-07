# Cycle 12: VulnerabilitiesSubTab Component

**Goal**: Create the Vulnerabilities sub-tab (similar pattern to HealthSubTab)

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for the VulnerabilitiesSubTab component. Follow similar pattern to HealthSubTab tests.

**File**: `frontend/src/tests/components/phase2/health-vulnerabilities/VulnerabilitiesSubTab.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VulnerabilitiesSubTab from '@/components/phase2/health-vulnerabilities/VulnerabilitiesSubTab';
import * as hooks from '@/hooks/useHealthVulnerabilities';
import * as productOwnerHooks from '@/hooks/useProductOwners';
import * as srHooks from '@/hooks/useSpecialRelationships';

jest.mock('@/hooks/useHealthVulnerabilities');
jest.mock('@/hooks/useProductOwners');
jest.mock('@/hooks/useSpecialRelationships');

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('VulnerabilitiesSubTab', () => {
  const mockProductOwners = [
    { id: 1, firstname: 'John', surname: 'Smith', relationship: 'Primary Owner', status: 'active' },
  ];

  const mockSpecialRelationships = [
    { id: 10, name: 'Tom Smith', relationship_type: 'Child', status: 'Active' },
  ];

  const mockVulnPO = [
    { id: 1, product_owner_id: 1, description: 'Hearing impairment', diagnosed: true, status: 'Active' },
    { id: 2, product_owner_id: 1, description: 'Mobility issues', diagnosed: false, status: 'Inactive' },
  ];

  const mockVulnSR = [
    { id: 3, special_relationship_id: 10, description: 'Cognitive decline', diagnosed: true, status: 'Active' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
      data: mockProductOwners, isLoading: false, error: null,
    });
    (srHooks.useSpecialRelationships as jest.Mock).mockReturnValue({
      data: mockSpecialRelationships, isLoading: false, error: null,
    });
    (hooks.useVulnerabilitiesProductOwners as jest.Mock).mockReturnValue({
      data: mockVulnPO, isLoading: false, error: null,
    });
    (hooks.useVulnerabilitiesSpecialRelationships as jest.Mock).mockReturnValue({
      data: mockVulnSR, isLoading: false, error: null,
    });
  });

  describe('person table rendering', () => {
    it('should render all product owners', () => {
      render(<VulnerabilitiesSubTab clientGroupId={1} />, { wrapper: createWrapper() });
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    it('should render special relationships at bottom with SR tag', () => {
      render(<VulnerabilitiesSubTab clientGroupId={1} />, { wrapper: createWrapper() });
      expect(screen.getByText('Tom Smith')).toBeInTheDocument();
      expect(screen.getByText('SR')).toBeInTheDocument();
    });

    it('should display correct active/inactive vulnerability counts', () => {
      render(<VulnerabilitiesSubTab clientGroupId={1} />, { wrapper: createWrapper() });
      // John Smith: 1 active, 1 inactive
    });
  });

  describe('expandable rows', () => {
    it('should expand row to show vulnerabilities when clicked', async () => {
      render(<VulnerabilitiesSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(screen.getByText('Hearing impairment')).toBeInTheDocument();
        expect(screen.getByText('Mobility issues')).toBeInTheDocument();
      });
    });

    it('should collapse row when clicked again', async () => {
      render(<VulnerabilitiesSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('John Smith'));
      await waitFor(() => expect(screen.getByText('Hearing impairment')).toBeInTheDocument());

      fireEvent.click(screen.getByText('John Smith'));
      await waitFor(() => expect(screen.queryByText('Hearing impairment')).not.toBeVisible());
    });
  });

  describe('add modal', () => {
    it('should open add vulnerability modal when add button clicked', async () => {
      render(<VulnerabilitiesSubTab clientGroupId={1} />, { wrapper: createWrapper() });

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      fireEvent.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/add vulnerability/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading state', () => {
      (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
        data: undefined, isLoading: true, error: null,
      });

      render(<VulnerabilitiesSubTab clientGroupId={1} />, { wrapper: createWrapper() });
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state with retry button', () => {
      (productOwnerHooks.useProductOwners as jest.Mock).mockReturnValue({
        data: undefined, isLoading: false, error: new Error('Failed'), refetch: jest.fn(),
      });

      render(<VulnerabilitiesSubTab clientGroupId={1} />, { wrapper: createWrapper() });
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});
```

---

## GREEN Phase - Implement Component

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the VulnerabilitiesSubTab component to pass all tests. Follow similar pattern to HealthSubTab.

**File**: `frontend/src/components/phase2/health-vulnerabilities/VulnerabilitiesSubTab.tsx`

```typescript
/**
 * VulnerabilitiesSubTab Component
 *
 * Displays the Vulnerabilities sub-tab with:
 * - PersonTable showing all product owners and special relationships
 * - Expandable rows revealing VulnerabilitiesTable
 * - Add modal for creating new vulnerabilities
 */

import React, { useState, useMemo, useCallback } from 'react';
import { SkeletonTable, ErrorDisplay } from '@/components/ui';
import PersonTable from './PersonTable';
import VulnerabilitiesTable from './VulnerabilitiesTable';
import AddHealthVulnerabilityModal from './AddHealthVulnerabilityModal';
import EditHealthVulnerabilityModal from './EditHealthVulnerabilityModal';
import {
  useVulnerabilitiesProductOwners,
  useVulnerabilitiesSpecialRelationships,
} from '@/hooks/useHealthVulnerabilities';
import { useProductOwners } from '@/hooks/useProductOwners';
import { useSpecialRelationships } from '@/hooks/useSpecialRelationships';
import { PersonWithCounts, Vulnerability } from '@/types/healthVulnerability';

interface VulnerabilitiesSubTabProps {
  clientGroupId: number;
  productOwnerId?: number;
}

const VulnerabilitiesSubTab: React.FC<VulnerabilitiesSubTabProps> = ({
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
  const [selectedRecord, setSelectedRecord] = useState<Vulnerability | null>(null);

  // Fetch data
  const {
    data: productOwners = [],
    isLoading: isLoadingOwners,
    error: ownersError,
    refetch: refetchOwners,
  } = useProductOwners(clientGroupId);

  // NOTE: useSpecialRelationships requires productOwnerId, not clientGroupId
  const primaryProductOwner = useMemo(() => {
    if (productOwnerId) return productOwnerId;
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
    data: vulnProductOwners = [],
    isLoading: isLoadingVulnPO,
  } = useVulnerabilitiesProductOwners(clientGroupId);

  const {
    data: vulnSpecialRelationships = [],
    isLoading: isLoadingVulnSR,
  } = useVulnerabilitiesSpecialRelationships(clientGroupId);

  const isLoading = isLoadingOwners || isLoadingSR || isLoadingVulnPO || isLoadingVulnSR;
  const error = ownersError || srError;

  // Calculate counts
  const productOwnersWithCounts: PersonWithCounts[] = useMemo(() => {
    return productOwners.map(po => {
      const vulnRecords = vulnProductOwners.filter(v => v.product_owner_id === po.id);
      const activeCount = vulnRecords.filter(v => v.status === 'Active').length;
      const inactiveCount = vulnRecords.filter(v => v.status === 'Inactive' || v.status === 'Resolved').length;

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
  }, [productOwners, vulnProductOwners]);

  const specialRelationshipsWithCounts: PersonWithCounts[] = useMemo(() => {
    return specialRelationships.map(sr => {
      const vulnRecords = vulnSpecialRelationships.filter(v => v.special_relationship_id === sr.id);
      const activeCount = vulnRecords.filter(v => v.status === 'Active').length;
      const inactiveCount = vulnRecords.filter(v => v.status === 'Inactive' || v.status === 'Resolved').length;

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
  }, [specialRelationships, vulnSpecialRelationships]);

  // Get vulnerabilities for expanded person
  const expandedPersonVulnerabilities: Vulnerability[] = useMemo(() => {
    if (!expandedPersonId || !expandedPersonType) return [];

    if (expandedPersonType === 'product_owner') {
      return vulnProductOwners.filter(v => v.product_owner_id === expandedPersonId);
    } else {
      return vulnSpecialRelationships.filter(v => v.special_relationship_id === expandedPersonId);
    }
  }, [expandedPersonId, expandedPersonType, vulnProductOwners, vulnSpecialRelationships]);

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
    handleAddModalClose();
  }, [handleAddModalClose]);

  // Edit modal handlers - triggered when clicking on a vulnerability row
  const handleEdit = useCallback((vulnerability: Vulnerability) => {
    const person = expandedPersonType === 'product_owner'
      ? productOwnersWithCounts.find(p => p.id === vulnerability.product_owner_id)
      : specialRelationshipsWithCounts.find(p => p.id === vulnerability.special_relationship_id);

    if (person) {
      setSelectedPerson(person);
      setSelectedRecord(vulnerability);
      setEditModalOpen(true);
    }
  }, [expandedPersonType, productOwnersWithCounts, specialRelationshipsWithCounts]);

  const handleEditModalClose = useCallback(() => {
    setEditModalOpen(false);
    setSelectedRecord(null);
  }, []);

  const handleEditModalSuccess = useCallback(() => {
    handleEditModalClose();
  }, [handleEditModalClose]);

  const handleDelete = useCallback((vulnerability: Vulnerability) => {
    // Delete handled by VulnerabilitiesTable with DeleteConfirmationModal
  }, []);

  const handleRetry = useCallback(() => {
    refetchOwners();
    refetchSR();
  }, [refetchOwners, refetchSR]);

  if (isLoading) {
    return <SkeletonTable rowCount={5} role="status" />;
  }

  if (error) {
    return <ErrorDisplay message="Failed to load vulnerability data" onRetry={handleRetry} />;
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

      {expandedPersonId && expandedPersonType && (
        <div className="ml-8 mt-2" id={`nested-table-${expandedPersonType}-${expandedPersonId}`}>
          <VulnerabilitiesTable
            vulnerabilities={expandedPersonVulnerabilities}
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
          tabType="vulnerabilities"
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
          tabType="vulnerabilities"
          onSuccess={handleEditModalSuccess}
        />
      )}
    </div>
  );
};

export default VulnerabilitiesSubTab;
```

---

## BLUE Phase - Refactor

- [ ] Extract shared logic with HealthSubTab to custom hook
- [ ] Ensure consistent styling
- [ ] Add edit/delete modal handlers

---

## Acceptance Criteria

- [ ] All 9 tests pass
- [ ] PersonTable displays all people with correct vulnerability counts
- [ ] Rows expand/collapse on click
- [ ] Expanded rows show VulnerabilitiesTable
- [ ] Add modal opens with vulnerability form
- [ ] Loading, error, and empty states work correctly
