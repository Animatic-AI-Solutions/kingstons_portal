/**
 * HealthSubTab Component
 *
 * Health sub-tab that displays PersonTable with all product owners and special
 * relationships. When a person row is clicked, it expands to show their
 * HealthConditionsTable. Includes Add and Edit modals.
 *
 * Features:
 * - Renders all product owners and special relationships from hooks
 * - Special relationships show "SR" indicator (handled by PersonTable)
 * - Displays correct active/inactive counts per person (Active vs Lapsed status)
 * - Row click expands/collapses to show HealthConditionsTable for that person
 * - Only one row expanded at a time
 * - Smoking Status conditions appear at top in expanded table
 * - Add button opens AddHealthVulnerabilityModal with tabType="health"
 * - Clicking a health condition row opens EditHealthVulnerabilityModal
 * - Delete handled by HealthConditionsTable's built-in DeleteConfirmationModal
 * - Loading state shows skeleton with role="status"
 * - Error state shows error message with retry button
 * - Empty state when no people found
 * - Full accessibility support (aria-expanded, keyboard navigation)
 *
 * @module components/phase2/health-vulnerabilities/HealthSubTab
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useProductOwners } from '@/hooks/useProductOwners';
import { useSpecialRelationships } from '@/hooks/useSpecialRelationships';
import {
  useHealthProductOwners,
  useHealthSpecialRelationships,
  useDeleteHealthRecord,
  useUpdateHealthRecord,
} from '@/hooks/useHealthVulnerabilities';
import PersonTable from './PersonTable';
import HealthConditionsTable from './HealthConditionsTable';
import AddHealthVulnerabilityModal from './AddHealthVulnerabilityModal';
import EditHealthVulnerabilityModal from './EditHealthVulnerabilityModal';
import { SkeletonTable, EmptyState, ErrorDisplay } from '@/components/ui';
import type {
  PersonWithCounts,
  PersonType,
  HealthCondition,
  HealthProductOwner,
  HealthSpecialRelationship,
  ExpandedPerson,
} from '@/types/healthVulnerability';
import type { ProductOwner } from '@/types/productOwner';
import type { SpecialRelationship } from '@/types/specialRelationship';

// =============================================================================
// Props Interface
// =============================================================================

export interface HealthSubTabProps {
  /** The client group ID to display health data for */
  clientGroupId: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Transforms a ProductOwner into PersonWithCounts by counting health records
 * @param owner - The product owner to transform
 * @param healthRecords - All health records for product owners
 * @returns PersonWithCounts with active/inactive counts
 */
function transformProductOwnerToPerson(
  owner: ProductOwner,
  healthRecords: HealthProductOwner[]
): PersonWithCounts {
  const ownerRecords = healthRecords.filter(
    (record) => record.product_owner_id === owner.id
  );
  const activeCount = ownerRecords.filter((r) => r.status === 'Active').length;
  const inactiveCount = ownerRecords.filter((r) => r.status === 'Inactive').length;

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
 * Transforms a SpecialRelationship into PersonWithCounts by counting health records
 * @param sr - The special relationship to transform
 * @param healthRecords - All health records for special relationships
 * @returns PersonWithCounts with active/inactive counts
 */
function transformSpecialRelationshipToPerson(
  sr: SpecialRelationship,
  healthRecords: HealthSpecialRelationship[]
): PersonWithCounts {
  const srRecords = healthRecords.filter(
    (record) => record.special_relationship_id === sr.id
  );
  const activeCount = srRecords.filter((r) => r.status === 'Active').length;
  const inactiveCount = srRecords.filter((r) => r.status === 'Inactive').length;

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
 * Gets health conditions for a specific person
 * @param personId - The person's ID
 * @param personType - Whether product_owner or special_relationship
 * @param healthPO - Health records for product owners
 * @param healthSR - Health records for special relationships
 * @returns Array of health conditions for the person
 */
function getHealthConditionsForPerson(
  personId: number,
  personType: PersonType,
  healthPO: HealthProductOwner[],
  healthSR: HealthSpecialRelationship[]
): HealthCondition[] {
  if (personType === 'product_owner') {
    return healthPO.filter((r) => r.product_owner_id === personId);
  }
  return healthSR.filter((r) => r.special_relationship_id === personId);
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * HealthSubTab Component
 *
 * Displays health conditions for all product owners and special relationships
 * in a client group. Supports expandable rows, add/edit modals, and delete functionality.
 */
const HealthSubTab: React.FC<HealthSubTabProps> = ({ clientGroupId }) => {
  // ===========================================================================
  // State
  // ===========================================================================
  const [expandedPerson, setExpandedPerson] = useState<ExpandedPerson | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalPerson, setAddModalPerson] = useState<PersonWithCounts | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalCondition, setEditModalCondition] = useState<HealthCondition | null>(null);
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

  const healthPOQuery = useHealthProductOwners(clientGroupId);
  const {
    data: healthProductOwners = [],
    isLoading: isLoadingHealthPO,
  } = healthPOQuery;

  const healthSRQuery = useHealthSpecialRelationships(clientGroupId);
  const {
    data: healthSpecialRelationships = [],
    isLoading: isLoadingHealthSR,
  } = healthSRQuery;

  // Delete mutation
  const deleteMutation = useDeleteHealthRecord();

  // Update mutation (for lapse/reactivate)
  const updateMutation = useUpdateHealthRecord();

  // ===========================================================================
  // Computed Values
  // ===========================================================================
  const isLoading = isLoadingPO || isLoadingSR || isLoadingHealthPO || isLoadingHealthSR;
  const isError = isErrorPO || isErrorSR;
  const error = errorPO || errorSR;

  // Transform product owners to PersonWithCounts
  const productOwnerPersons: PersonWithCounts[] = useMemo(() => {
    return productOwners.map((owner) =>
      transformProductOwnerToPerson(owner, healthProductOwners)
    );
  }, [productOwners, healthProductOwners]);

  // Transform special relationships to PersonWithCounts
  const specialRelationshipPersons: PersonWithCounts[] = useMemo(() => {
    return specialRelationships.map((sr) =>
      transformSpecialRelationshipToPerson(sr, healthSpecialRelationships)
    );
  }, [specialRelationships, healthSpecialRelationships]);

  // Check if there are no people
  const noPeople = productOwnerPersons.length === 0 && specialRelationshipPersons.length === 0;
  const hasPeople = !noPeople;

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
    setEditModalCondition(null);
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
   * Returns HealthConditionsTable for the given person
   * NOTE: Must be defined before early returns to satisfy Rules of Hooks
   */
  const renderExpandedContent = useCallback(
    (person: PersonWithCounts) => {
      const conditions = getHealthConditionsForPerson(
        person.id,
        person.personType,
        healthProductOwners,
        healthSpecialRelationships
      );

      // Create person-specific handlers that capture the person context
      const handleConditionClick = (condition: HealthCondition) => {
        setEditModalCondition(condition);
        setEditModalPerson(person);
        setEditModalOpen(true);
      };

      const handleConditionDelete = (condition: HealthCondition) => {
        deleteMutation.mutateAsync({
          id: condition.id,
          personType: person.personType,
        });
      };

      const handleConditionLapse = (condition: HealthCondition) => {
        updateMutation.mutateAsync({
          id: condition.id,
          personType: person.personType,
          data: { status: 'Inactive' },
        });
      };

      const handleConditionReactivate = (condition: HealthCondition) => {
        updateMutation.mutateAsync({
          id: condition.id,
          personType: person.personType,
          data: { status: 'Active' },
        });
      };

      return (
        <div className="py-4 pl-8 border-l-2 border-gray-200">
          <HealthConditionsTable
            conditions={conditions}
            personId={person.id}
            personType={person.personType}
            onRowClick={handleConditionClick}
            onDelete={handleConditionDelete}
            onLapse={handleConditionLapse}
            onReactivate={handleConditionReactivate}
          />
        </div>
      );
    },
    [healthProductOwners, healthSpecialRelationships, deleteMutation, updateMutation]
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
        message={`Error: ${error?.message || 'An error occurred loading health data'}`}
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

      {/* Add Health Condition Modal */}
      {addModalPerson && (
        <AddHealthVulnerabilityModal
          isOpen={addModalOpen}
          onClose={handleAddModalClose}
          person={addModalPerson}
          tabType="health"
          onSuccess={handleAddModalSuccess}
        />
      )}

      {/* Edit Health Condition Modal */}
      {editModalCondition && editModalPerson && (
        <EditHealthVulnerabilityModal
          isOpen={editModalOpen}
          onClose={handleEditModalClose}
          person={editModalPerson}
          record={editModalCondition}
          tabType="health"
          onSuccess={handleEditModalSuccess}
        />
      )}
    </div>
  );
};

export default HealthSubTab;
