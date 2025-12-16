/**
 * SpecialRelationshipsSubTab Component (Cycle 8)
 *
 * Main container component for the Special Relationships feature.
 * Orchestrates tab navigation, data fetching, and rendering of tables and modals.
 *
 * Features:
 * - Tab navigation between Personal and Professional relationships
 * - Data fetching using useSpecialRelationships hook
 * - Loading state with skeleton loader
 * - Error state with retry capability
 * - Empty state for each tab type
 * - Create/Edit modal integration
 * - Filters relationships based on active tab
 * - Manages all relationship CRUD operations
 *
 * @component SpecialRelationshipsSubTab
 */

import React, { useState, useMemo, useCallback } from 'react';
import TabNavigation from './TabNavigation';
import PersonalRelationshipsTable from './PersonalRelationshipsTable';
import ProfessionalRelationshipsTable from './ProfessionalRelationshipsTable';
import SkeletonTable from './SkeletonTable';
import EmptyStatePersonal from './EmptyStatePersonal';
import EmptyStateProfessional from './EmptyStateProfessional';
import CreateSpecialRelationshipModal from './CreateSpecialRelationshipModal';
import EditSpecialRelationshipModal from './EditSpecialRelationshipModal';
import { useSpecialRelationships } from '@/hooks/useSpecialRelationships';
import {
  SpecialRelationship,
  RelationshipStatus,
  PROFESSIONAL_RELATIONSHIP_TYPES
} from '@/types/specialRelationship';

// ==========================
// Constants
// ==========================

/**
 * Button text constants
 * Using DRY principle to avoid string duplication
 */
const BUTTON_TEXT = {
  ADD_PERSONAL: 'Add Personal Relationship',
  ADD_PROFESSIONAL: 'Add Professional Relationship',
  TRY_AGAIN: 'Try Again',
} as const;

/**
 * Error message constants
 */
const ERROR_MESSAGES = {
  LOAD_FAILED: 'Unable to load relationships',
  GENERIC_ERROR: 'An error occurred while loading data',
} as const;

/**
 * Button CSS classes
 * Shared button styling to maintain consistency
 */
const BUTTON_CLASSES = {
  PRIMARY: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
} as const;

// ==========================
// Types
// ==========================

/**
 * Props for SpecialRelationshipsSubTab component
 */
export interface SpecialRelationshipsSubTabProps {
  /** Client group ID to fetch relationships for */
  clientGroupId: string;
}

// ==========================
// Component
// ==========================

/**
 * SpecialRelationshipsSubTab is the main container component that brings together
 * all special relationship functionality including tabs, tables, and modals.
 *
 * Architecture:
 * - Uses TabNavigation for switching between Personal and Professional views
 * - Fetches data via useSpecialRelationships hook with React Query
 * - Filters relationships based on PROFESSIONAL_RELATIONSHIP_TYPES constant
 * - Manages modal state for Create and Edit operations
 * - Provides comprehensive error handling with retry capability
 * - Implements loading states with skeleton loaders
 * - Shows contextual empty states per tab
 *
 * Performance optimizations:
 * - useCallback wraps all event handlers to prevent unnecessary re-renders
 * - useMemo caches filtered relationships and computed values
 * - React Query provides intelligent caching (5min stale, 10min gc)
 *
 * @param {SpecialRelationshipsSubTabProps} props - Component props
 * @param {string} props.clientGroupId - Client group ID to fetch relationships for
 * @returns {JSX.Element} Complete special relationships interface
 *
 * @example
 * ```tsx
 * <SpecialRelationshipsSubTab clientGroupId="123" />
 * ```
 */
const SpecialRelationshipsSubTab: React.FC<SpecialRelationshipsSubTabProps> = ({
  clientGroupId,
}) => {
  // ==========================
  // State
  // ==========================

  const [activeTab, setActiveTab] = useState<'personal' | 'professional'>('personal');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<SpecialRelationship | null>(null);

  // ==========================
  // Data Fetching
  // ==========================

  const {
    data: relationships = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useSpecialRelationships(clientGroupId, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // ==========================
  // Filtered Data
  // ==========================

  /**
   * Filter relationships based on active tab
   * Personal tab shows relationships with personal relationship types
   * Professional tab shows relationships with professional relationship types
   */
  const filteredRelationships = useMemo(() => {
    return relationships.filter((rel) => {
      const isProfessional = PROFESSIONAL_RELATIONSHIP_TYPES.includes(rel.relationship_type);

      if (activeTab === 'personal') {
        return !isProfessional;
      } else {
        return isProfessional;
      }
    });
  }, [relationships, activeTab]);

  // ==========================
  // Event Handlers
  // ==========================

  /**
   * Handle tab change
   * Wrapped in useCallback to prevent unnecessary re-renders of TabNavigation
   */
  const handleTabChange = useCallback((tab: 'personal' | 'professional') => {
    setActiveTab(tab);
  }, []);

  /**
   * Handle create button click
   * Wrapped in useCallback to prevent unnecessary re-renders
   */
  const handleAddClick = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  /**
   * Handle edit button click
   * Wrapped in useCallback to provide stable reference to table components
   */
  const handleEdit = useCallback((relationship: SpecialRelationship) => {
    setEditingRelationship(relationship);
    setShowEditModal(true);
  }, []);

  /**
   * Handle delete button click (placeholder - would integrate with delete mutation)
   * Wrapped in useCallback to provide stable reference to table components
   */
  const handleDelete = useCallback((relationship: SpecialRelationship) => {
    // TODO: Integrate with useDeleteSpecialRelationship hook
    console.log('Delete relationship:', relationship.id);
  }, []);

  /**
   * Handle status change (placeholder - would integrate with update mutation)
   * Wrapped in useCallback to provide stable reference to table components
   */
  const handleStatusChange = useCallback((id: string, status: RelationshipStatus) => {
    // TODO: Integrate with useUpdateSpecialRelationshipStatus hook
    console.log('Update status:', id, status);
  }, []);

  /**
   * Handle row click (placeholder - could navigate to detail view)
   * Wrapped in useCallback to provide stable reference to table components
   */
  const handleRowClick = useCallback((relationship: SpecialRelationship) => {
    console.log('Row clicked:', relationship.id);
  }, []);

  /**
   * Close create modal
   * Wrapped in useCallback to prevent unnecessary re-renders of modal
   */
  const handleCreateModalClose = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  /**
   * Close edit modal and clear editing state
   * Wrapped in useCallback to prevent unnecessary re-renders of modal
   */
  const handleEditModalClose = useCallback(() => {
    setShowEditModal(false);
    setEditingRelationship(null);
  }, []);

  // ==========================
  // Render Helpers
  // ==========================

  /**
   * Get create button text based on active tab
   * Memoized to avoid recalculation on every render
   */
  const createButtonText = useMemo(() => {
    return activeTab === 'personal'
      ? BUTTON_TEXT.ADD_PERSONAL
      : BUTTON_TEXT.ADD_PROFESSIONAL;
  }, [activeTab]);

  /**
   * Determine if current tab should be treated as professional
   * Memoized for stable reference in modal props
   */
  const isProfessionalTab = useMemo(() => {
    return activeTab === 'professional';
  }, [activeTab]);

  // ==========================
  // Render States
  // ==========================

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4">
        <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        <SkeletonTable rowCount={4} />
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="space-y-4">
        <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="flex flex-col items-center justify-center text-center py-12 px-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {ERROR_MESSAGES.LOAD_FAILED}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {error instanceof Error ? error.message : ERROR_MESSAGES.GENERIC_ERROR}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className={BUTTON_CLASSES.PRIMARY}
          >
            {BUTTON_TEXT.TRY_AGAIN}
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (filteredRelationships.length === 0) {
    return (
      <div className="space-y-4">
        <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Empty State (includes its own add button) */}
        {activeTab === 'personal' ? (
          <EmptyStatePersonal onAddClick={handleAddClick} />
        ) : (
          <EmptyStateProfessional onAddClick={handleAddClick} />
        )}

        {/* Create Modal */}
        <CreateSpecialRelationshipModal
          isOpen={showCreateModal}
          onClose={handleCreateModalClose}
          clientGroupId={clientGroupId}
          isProfessional={isProfessionalTab}
        />
      </div>
    );
  }

  // Data State
  return (
    <div className="space-y-4">
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Create Button */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={handleAddClick}
          className={BUTTON_CLASSES.PRIMARY}
        >
          {createButtonText}
        </button>
      </div>

      {/* Table */}
      {activeTab === 'personal' ? (
        <div id="personal-relationships-panel" role="tabpanel" aria-labelledby="personal-tab">
          <PersonalRelationshipsTable
            relationships={filteredRelationships}
            onRowClick={handleRowClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        </div>
      ) : (
        <div id="professional-relationships-panel" role="tabpanel" aria-labelledby="professional-tab">
          <ProfessionalRelationshipsTable
            relationships={filteredRelationships}
            onRowClick={handleRowClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {/* Modals */}
      <CreateSpecialRelationshipModal
        isOpen={showCreateModal}
        onClose={handleCreateModalClose}
        clientGroupId={clientGroupId}
        isProfessional={isProfessionalTab}
      />

      {editingRelationship && (
        <EditSpecialRelationshipModal
          isOpen={showEditModal}
          onClose={handleEditModalClose}
          relationship={editingRelationship}
        />
      )}
    </div>
  );
};

export default SpecialRelationshipsSubTab;
