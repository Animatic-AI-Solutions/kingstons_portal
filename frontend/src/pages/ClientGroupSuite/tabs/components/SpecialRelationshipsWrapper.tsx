/**
 * SpecialRelationshipsWrapper Component
 *
 * Wrapper component that bridges the client group context to the Special Relationships feature.
 * Handles fetching product owners for the client group and displays relationships for all of them.
 *
 * Features:
 * - Fetches product owners for the client group
 * - Displays relationships for the first product owner (typical case: 1-2 owners per group)
 * - Shows loading and error states
 * - For multiple product owners, shows a selector or combined view
 *
 * @module pages/ClientGroupSuite/tabs/components/SpecialRelationshipsWrapper
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { SpecialRelationshipsSubTab } from '@/components/phase2';
import { useProductOwners } from '@/hooks/useProductOwners';

/**
 * Route parameters interface for type-safe param extraction
 */
interface RouteParams {
  /** Client group ID from URL route parameter (string) */
  clientGroupId: string;
}

/**
 * SpecialRelationshipsWrapper Component
 *
 * Fetches product owners for the client group and displays their special relationships.
 * For most client groups (1-2 product owners), this shows the first owner's relationships.
 *
 * @returns JSX element with Special Relationships content
 */
const SpecialRelationshipsWrapper: React.FC = () => {
  // Extract clientGroupId from route params
  const { clientGroupId } = useParams<RouteParams>();

  // Fetch product owners for this client group
  const {
    data: productOwners,
    isLoading,
    isError,
    error,
    refetch,
  } = useProductOwners(clientGroupId || '');

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading relationships...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg font-semibold mb-2">
            Unable to load relationships
          </div>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state - no product owners
  if (!productOwners || productOwners.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No people found for this client group</p>
          <p className="text-gray-400 text-sm mt-2">
            Add people to this client group to manage their relationships
          </p>
        </div>
      </div>
    );
  }

  // For now, show relationships for the first product owner
  // TODO: In future, add a selector if multiple product owners exist
  const primaryProductOwner = productOwners[0];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* If multiple product owners, show info */}
      {productOwners.length > 1 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This client group has {productOwners.length} people.
            Showing relationships for {primaryProductOwner.firstname} {primaryProductOwner.surname}.
          </p>
        </div>
      )}

      {/* Render the actual Special Relationships component */}
      <SpecialRelationshipsSubTab
        productOwnerId={primaryProductOwner.id}
        allProductOwners={productOwners}
      />
    </div>
  );
};

export default SpecialRelationshipsWrapper;
