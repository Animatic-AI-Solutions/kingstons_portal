/**
 * VulnerabilitiesSubTab Component
 *
 * Vulnerabilities sub-tab that displays PersonTable with all product owners and special
 * relationships. When a person row is clicked, it expands to show their
 * VulnerabilitiesTable. Includes Add and Edit modals.
 *
 * Features:
 * - Renders all product owners and special relationships from hooks
 * - Special relationships show "SR" indicator (handled by PersonTable)
 * - Displays correct active/inactive counts per person (Active vs Lapsed status)
 * - Row click expands/collapses to show VulnerabilitiesTable for that person
 * - Only one row expanded at a time
 * - Add button opens AddHealthVulnerabilityModal with tabType="vulnerabilities"
 * - Clicking a vulnerability row opens EditHealthVulnerabilityModal
 * - Delete handled by VulnerabilitiesTable's built-in DeleteConfirmationModal
 * - Loading state shows skeleton with role="status"
 * - Error state shows error message with retry button
 * - Empty state when no people found
 * - Full accessibility support (aria-expanded, keyboard navigation)
 *
 * @module components/phase2/health-vulnerabilities/VulnerabilitiesSubTab
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useProductOwners } from '@/hooks/useProductOwners';
import { useSpecialRelationships } from '@/hooks/useSpecialRelationships';
import {
  useVulnerabilitiesProductOwners,
  useVulnerabilitiesSpecialRelationships,
  useDeleteVulnerability,
  useUpdateVulnerability,
} from '@/hooks/useHealthVulnerabilities';
import PersonTable from './PersonTable';
import VulnerabilitiesTable from './VulnerabilitiesTable';
import AddHealthVulnerabilityModal from './AddHealthVulnerabilityModal';
import EditHealthVulnerabilityModal from './EditHealthVulnerabilityModal';
import { SkeletonTable, EmptyState, ErrorDisplay } from '@/components/ui';
import type {
  PersonWithCounts,
  PersonType,
  Vulnerability,
  VulnerabilityProductOwner,
  VulnerabilitySpecialRelationship,
  ExpandedPerson,
} from '@/types/healthVulnerability';
import { isVulnerabilityProductOwner } from '@/types/healthVulnerability';
import type { ProductOwner } from '@/types/productOwner';
import type { SpecialRelationship } from '@/types/specialRelationship';

// =============================================================================
// Props Interface
// =============================================================================

export interface VulnerabilitiesSubTabProps {
  /** The client group ID to display vulnerability data for */
  clientGroupId: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Transforms a ProductOwner into PersonWithCounts by counting vulnerability records
 * @param owner - The product owner to transform
 * @param vulnRecords - All vulnerability records for product owners
 * @returns PersonWithCounts with active/inactive counts
 */
function transformProductOwnerToPerson(
  owner: ProductOwner,
  vulnRecords: VulnerabilityProductOwner[]
): PersonWithCounts {
  const ownerRecords = vulnRecords.filter(
    (record) => record.product_owner_id === owner.id
  );
  const activeCount = ownerRecords.filter((r) => r.status === 'Active').length;
  const inactiveCount = ownerRecords.filter((r) => r.status === 'Lapsed').length;

  return {
    id: owner.id,
    name: `${owner.firstname} ${owner.surname}`,
    relationship: owner.status === 'active' ? 'Primary Owner' : 'Product Owner',
    personType: 'product_owner' as PersonType,
    status: owner.status,
    activeCount,
    inactiveCount,
  };
}

/**
 * Transforms a SpecialRelationship into PersonWithCounts by counting vulnerability records
 * @param sr - The special relationship to transform
 * @param vulnRecords - All vulnerability records for special relationships
 * @returns PersonWithCounts with active/inactive counts
 */
function transformSpecialRelationshipToPerson(
  sr: SpecialRelationship,
  vulnRecords: VulnerabilitySpecialRelationship[]
): PersonWithCounts {
  const srRecords = vulnRecords.filter(
    (record) => record.special_relationship_id === sr.id
  );
  const activeCount = srRecords.filter((r) => r.status === 'Active').length;
  const inactiveCount = srRecords.filter((r) => r.status === 'Lapsed').length;

  return {
    id: sr.id,
    name: sr.name,
    relationship: sr.relationship,
    personType: 'special_relationship' as PersonType,
    status: sr.status,
    activeCount,
    inactiveCount,
  };
}

/**
 * Gets vulnerabilities for a specific person
 * @param personId - The person's ID
 * @param personType - Whether product_owner or special_relationship
 * @param vulnPO - Vulnerability records for product owners
 * @param vulnSR - Vulnerability records for special relationships
 * @returns Array of vulnerabilities for the person
 */
function getVulnerabilitiesForPerson(
  personId: number,
  personType: PersonType,
  vulnPO: VulnerabilityProductOwner[],
  vulnSR: VulnerabilitySpecialRelationship[]
): Vulnerability[] {
  if (personType === 'product_owner') {
    return vulnPO.filter((r) => r.product_owner_id === personId);
  }
  return vulnSR.filter((r) => r.special_relationship_id === personId);
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * VulnerabilitiesSubTab Component
 *
 * Displays vulnerabilities for all product owners and special relationships
 * in a client group. Supports expandable rows, add/edit modals, and delete functionality.
 */
const VulnerabilitiesSubTab: React.FC<VulnerabilitiesSubTabProps> = ({ clientGroupId }) => {
  // ===========================================================================
  // State
  // ===========================================================================
  const [expandedPerson, setExpandedPerson] = useState<ExpandedPerson | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalPerson, setAddModalPerson] = useState<PersonWithCounts | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalVulnerability, setEditModalVulnerability] = useState<Vulnerability | null>(null);
  const [editModalPerson, setEditModalPerson] = useState<PersonWithCounts | null>(null);

  // ===========================================================================
  // Data Fetching Hooks
  // ===========================================================================
  const productOwnersQuery = useProductOwners(clientGroupId);
  const {
    data: productOwners = [],
    isLoading: isLoadingPO,
    isError: isErrorPO,
    error: errorPO,
    refetch: refetchPO,
  } = productOwnersQuery;

  // Get primary product owner ID for special relationships query
  const primaryProductOwnerId = productOwners.length > 0 ? productOwners[0].id : null;

  const specialRelationshipsQuery = useSpecialRelationships(primaryProductOwnerId);
  const {
    data: specialRelationships = [],
    isLoading: isLoadingSR,
    isError: isErrorSR,
    error: errorSR,
    refetch: refetchSR,
  } = specialRelationshipsQuery;

  const vulnPOQuery = useVulnerabilitiesProductOwners(clientGroupId);
  const {
    data: vulnProductOwners = [],
    isLoading: isLoadingVulnPO,
  } = vulnPOQuery;

  const vulnSRQuery = useVulnerabilitiesSpecialRelationships(clientGroupId);
  const {
    data: vulnSpecialRelationships = [],
    isLoading: isLoadingVulnSR,
  } = vulnSRQuery;

  // Delete mutation
  const deleteMutation = useDeleteVulnerability();

  // Update mutation (for lapse/reactivate)
  const updateMutation = useUpdateVulnerability();

  // ===========================================================================
  // Computed Values
  // ===========================================================================
  const isLoading = isLoadingPO || isLoadingSR || isLoadingVulnPO || isLoadingVulnSR;
  const isError = isErrorPO || isErrorSR;
  const error = errorPO || errorSR;

  // Transform product owners to PersonWithCounts
  const productOwnerPersons: PersonWithCounts[] = useMemo(() => {
    return productOwners.map((owner) =>
      transformProductOwnerToPerson(owner, vulnProductOwners)
    );
  }, [productOwners, vulnProductOwners]);

  // Transform special relationships to PersonWithCounts
  const specialRelationshipPersons: PersonWithCounts[] = useMemo(() => {
    return specialRelationships.map((sr) =>
      transformSpecialRelationshipToPerson(sr, vulnSpecialRelationships)
    );
  }, [specialRelationships, vulnSpecialRelationships]);

  // Check if there are no people
  const noPeople = productOwnerPersons.length === 0 && specialRelationshipPersons.length === 0;

  // Get expanded person's ID and type for PersonTable
  const expandedPersonId = expandedPerson?.id ?? null;
  const expandedPersonType = expandedPerson?.personType ?? null;

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  /**
   * Handles row click to expand/collapse
   */
  const handleRowClick = useCallback((person: PersonWithCounts) => {
    setExpandedPerson((prev) => {
      // If clicking the same person, collapse
      if (prev?.id === person.id && prev?.personType === person.personType) {
        return null;
      }
      // Otherwise expand the new person
      return { id: person.id, personType: person.personType };
    });
  }, []);

  /**
   * Handles add button click
   */
  const handleAdd = useCallback((person: PersonWithCounts) => {
    setAddModalPerson(person);
    setAddModalOpen(true);
  }, []);

  /**
   * Handles add modal close
   */
  const handleAddModalClose = useCallback(() => {
    setAddModalOpen(false);
    setAddModalPerson(null);
  }, []);

  /**
   * Handles add modal success
   * Currently empty because modal closes itself and React Query automatically
   * invalidates queries via the mutation's onSuccess handler.
   * Future use: Could add toast notifications or analytics tracking.
   */
  const handleAddModalSuccess = useCallback(() => {
    // TODO: Consider adding toast notification or analytics tracking
  }, []);

  /**
   * Handles edit modal close
   */
  const handleEditModalClose = useCallback(() => {
    setEditModalOpen(false);
    setEditModalVulnerability(null);
    setEditModalPerson(null);
  }, []);

  /**
   * Handles edit modal success
   * Currently empty because modal closes itself and React Query automatically
   * invalidates queries via the mutation's onSuccess handler.
   * Future use: Could add toast notifications or analytics tracking.
   */
  const handleEditModalSuccess = useCallback(() => {
    // TODO: Consider adding toast notification or analytics tracking
  }, []);

  /**
   * Handles delete vulnerability
   * Uses type guard for proper type narrowing
   */
  const handleDelete = useCallback((vulnerability: Vulnerability) => {
    const personType: PersonType = isVulnerabilityProductOwner(vulnerability)
      ? 'product_owner'
      : 'special_relationship';

    deleteMutation.mutateAsync({
      id: vulnerability.id,
      personType,
    });
  }, [deleteMutation]);

  /**
   * Handles retry button click
   */
  const handleRetry = useCallback(() => {
    refetchPO();
    if (primaryProductOwnerId) {
      refetchSR();
    }
  }, [refetchPO, refetchSR, primaryProductOwnerId]);

  /**
   * Render function for expanded row content
   * Returns VulnerabilitiesTable for the given person
   * Memoized with useCallback for performance optimization
   */
  const renderExpandedContent = useCallback(
    (person: PersonWithCounts) => {
      const vulnerabilities = getVulnerabilitiesForPerson(
        person.id,
        person.personType,
        vulnProductOwners,
        vulnSpecialRelationships
      );

      // Create person-specific handlers that capture the person context
      const handleRowVulnerabilityClick = (vulnerability: Vulnerability) => {
        setEditModalVulnerability(vulnerability);
        setEditModalPerson(person);
        setEditModalOpen(true);
      };

      const handleVulnerabilityDelete = (vulnerability: Vulnerability) => {
        deleteMutation.mutateAsync({
          id: vulnerability.id,
          personType: person.personType,
        });
      };

      const handleVulnerabilityLapse = (vulnerability: Vulnerability) => {
        updateMutation.mutateAsync({
          id: vulnerability.id,
          personType: person.personType,
          data: { status: 'Lapsed' },
        });
      };

      const handleVulnerabilityReactivate = (vulnerability: Vulnerability) => {
        updateMutation.mutateAsync({
          id: vulnerability.id,
          personType: person.personType,
          data: { status: 'Active' },
        });
      };

      return (
        <div className="py-4 pl-8 border-l-2 border-gray-200">
          <VulnerabilitiesTable
            vulnerabilities={vulnerabilities}
            personId={person.id}
            personType={person.personType}
            onRowClick={handleRowVulnerabilityClick}
            onDelete={handleVulnerabilityDelete}
            onLapse={handleVulnerabilityLapse}
            onReactivate={handleVulnerabilityReactivate}
          />
        </div>
      );
    },
    [vulnProductOwners, vulnSpecialRelationships, deleteMutation, updateMutation]
  );

  // ===========================================================================
  // Render
  // ===========================================================================

  // Loading state
  if (isLoading) {
    return <SkeletonTable rowCount={5} />;
  }

  // Error state
  if (isError) {
    return (
      <ErrorDisplay
        message={`Error: ${error?.message || 'An error occurred loading vulnerability data'}`}
        onRetry={handleRetry}
      />
    );
  }

  // Empty state
  if (!isLoading && !isError && noPeople) {
    return <EmptyState message="No people found" />;
  }

  // Data loaded state
  return (
    <div>
      <PersonTable
        productOwners={productOwnerPersons}
        specialRelationships={specialRelationshipPersons}
        onAdd={handleAdd}
        onRowClick={handleRowClick}
        expandedPersonId={expandedPersonId}
        expandedPersonType={expandedPersonType}
        renderExpandedContent={renderExpandedContent}
      />

      {/* Add Vulnerability Modal */}
      {addModalPerson && (
        <AddHealthVulnerabilityModal
          isOpen={addModalOpen}
          onClose={handleAddModalClose}
          person={addModalPerson}
          tabType="vulnerabilities"
          onSuccess={handleAddModalSuccess}
        />
      )}

      {/* Edit Vulnerability Modal */}
      {editModalVulnerability && editModalPerson && (
        <EditHealthVulnerabilityModal
          isOpen={editModalOpen}
          onClose={handleEditModalClose}
          person={editModalPerson}
          record={editModalVulnerability}
          tabType="vulnerabilities"
          onSuccess={handleEditModalSuccess}
        />
      )}
    </div>
  );
};

export default VulnerabilitiesSubTab;
