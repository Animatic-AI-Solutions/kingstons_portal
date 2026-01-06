/**
 * ProfessionalRelationshipsTable Component (Refactored with Phase2Table)
 *
 * Table for displaying professional relationships (accountants, solicitors, advisors).
 * Now uses the reusable Phase2Table component with configured columns.
 *
 * Features:
 * - Columns: Name, Relationship, Product Owners, Email, Firm Name, Status, Actions
 * - Sortable columns via Phase2Table
 * - Responsive design
 * - Empty/Loading/Error states
 * - Row click handling
 * - WCAG 2.1 AA compliant accessibility
 *
 * @component ProfessionalRelationshipsTable
 */

import React, { ReactNode } from 'react';
import { SpecialRelationship } from '@/types/specialRelationship';
import { Phase2Table } from '../tables';
import type { ColumnDef } from '../tables/Phase2Table';
import {
  LapseIconButton,
  MakeDeceasedIconButton,
  ReactivateIconButton,
  DeleteIconButton,
} from '@/components/ui';
import { EMPTY_VALUE_PLACEHOLDER, PRODUCT_OWNER_BADGE_CLASSES } from './relationshipTable';

// ==========================
// Types
// ==========================

/**
 * Product Owner Interface
 * Represents a product owner that can be linked to relationships
 */
interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

/**
 * Props for ProfessionalRelationshipsTable component
 *
 * @property {SpecialRelationship[]} relationships - Array of professional relationships to display
 * @property {ProductOwner[]} productOwners - Array of product owners for reference
 * @property {Function} [onRowClick] - Optional callback when row is clicked
 * @property {Function} [onLapse] - Callback when lapse button is clicked
 * @property {Function} [onMakeDeceased] - Callback when make deceased button is clicked
 * @property {Function} [onReactivate] - Callback when reactivate button is clicked
 * @property {Function} onDelete - Callback when delete button is clicked
 * @property {Function} [onAdd] - Optional callback for add button
 * @property {boolean} [isLoading] - Loading state flag
 * @property {Error | null} [error] - Error object if applicable
 * @property {Function} [onRetry] - Optional callback for retry button in error state
 */
interface ProfessionalRelationshipsTableProps {
  relationships: SpecialRelationship[];
  productOwners?: ProductOwner[];
  onRowClick?: (relationship: SpecialRelationship) => void;
  onLapse?: (relationship: SpecialRelationship) => void;
  onMakeDeceased?: (relationship: SpecialRelationship) => void;
  onReactivate?: (relationship: SpecialRelationship) => void;
  onDelete: (relationship: SpecialRelationship) => void;
  onAdd?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

// ==========================
// Helper Functions
// ==========================

/**
 * Render Product Owner Pills
 * Creates pill badges for each product owner associated with the relationship
 *
 * @param ownerIds - Array of product owner IDs
 * @param productOwners - Array of all product owners
 * @returns ReactNode with pills or placeholder
 */
const renderProductOwnerPills = (
  ownerIds: number[] | undefined,
  productOwners: ProductOwner[]
): ReactNode => {
  if (!ownerIds || ownerIds.length === 0) {
    return <span>{EMPTY_VALUE_PLACEHOLDER}</span>;
  }

  const owners = ownerIds
    .map((id) => productOwners.find((po) => po.id === id))
    .filter(Boolean) as ProductOwner[];

  if (owners.length === 0) {
    return <span>{EMPTY_VALUE_PLACEHOLDER}</span>;
  }

  return (
    <div className={PRODUCT_OWNER_BADGE_CLASSES.container}>
      {owners.map((owner) => (
        <span key={owner.id} className={PRODUCT_OWNER_BADGE_CLASSES.badge}>
          {owner.firstname} {owner.surname}
        </span>
      ))}
    </div>
  );
};

// ==========================
// Component
// ==========================

/**
 * ProfessionalRelationshipsTable component displays professional relationships using Phase2Table.
 * Handles loading, error, and empty states. Supports row click and action buttons.
 *
 * @param {ProfessionalRelationshipsTableProps} props - Component props
 * @returns {JSX.Element} Rendered Phase2Table
 */
const ProfessionalRelationshipsTable: React.FC<ProfessionalRelationshipsTableProps> = ({
  relationships,
  productOwners = [],
  onRowClick,
  onLapse,
  onMakeDeceased,
  onReactivate,
  onDelete,
  onAdd,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  // ==========================
  // Column Definitions
  // ==========================

  const columns: ColumnDef<SpecialRelationship>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => row.name || EMPTY_VALUE_PLACEHOLDER,
    },
    {
      key: 'relationship',
      label: 'Relationship',
      sortable: false,
      render: (row) => row.relationship,
    },
    {
      key: 'product_owners',
      label: 'Product Owners',
      sortable: false,
      render: (row) => renderProductOwnerPills(row.product_owner_ids, productOwners),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: false,
      render: (row) => row.email || EMPTY_VALUE_PLACEHOLDER,
    },
    {
      key: 'firm_name',
      label: 'Firm Name',
      sortable: false,
      render: (row) => row.firm_name || EMPTY_VALUE_PLACEHOLDER,
    },
  ];

  // ==========================
  // Actions Renderer
  // ==========================

  /**
   * Render action buttons based on relationship status
   * Active: Lapse + Make Deceased
   * Inactive/Deceased: Reactivate + Delete
   */
  const actionsRenderer = (row: SpecialRelationship) => {
    const isInactive = row.status === 'Inactive' || row.status === 'Deceased';

    if (isInactive) {
      return (
        <>
          {onReactivate && (
            <ReactivateIconButton
              onClick={(e) => {
                e.stopPropagation();
                onReactivate(row);
              }}
              ariaLabel={`Reactivate ${row.name}`}
            />
          )}
          <DeleteIconButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
            ariaLabel={`Delete ${row.name}`}
          />
        </>
      );
    }

    // Active status
    return (
      <>
        {onLapse && (
          <LapseIconButton
            onClick={(e) => {
              e.stopPropagation();
              onLapse(row);
            }}
            ariaLabel={`Lapse ${row.name}`}
          />
        )}
        {onMakeDeceased && (
          <MakeDeceasedIconButton
            onClick={(e) => {
              e.stopPropagation();
              onMakeDeceased(row);
            }}
            ariaLabel={`Mark ${row.name} as deceased`}
          />
        )}
      </>
    );
  };

  // ==========================
  // Render
  // ==========================

  return (
    <Phase2Table
      data={relationships}
      columns={columns}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      onRowClick={onRowClick}
      actionsRenderer={actionsRenderer}
      addButton={
        onAdd
          ? {
              label: 'Professional Relationship',
              onClick: onAdd,
            }
          : undefined
      }
      ariaLabel="Professional relationships table"
      emptyMessage="No professional relationships found"
      emptySubMessage="Add your first professional relationship to get started"
    />
  );
};

export default ProfessionalRelationshipsTable;
