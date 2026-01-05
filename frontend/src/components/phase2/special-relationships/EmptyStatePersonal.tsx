/**
 * EmptyStatePersonal Component (Cycle 6)
 *
 * Empty state for personal relationships tab.
 * Displays messaging and call-to-action for adding first personal relationship.
 *
 * Features:
 * - Icon (Users from lucide-react)
 * - Heading and description
 * - Add Personal Relationship button
 * - ARIA live region (role="status", aria-live="polite")
 * - WCAG 2.1 AA compliant
 *
 * @component EmptyStatePersonal
 */

import React from 'react';
import { Users } from 'lucide-react';

// ==========================
// Types
// ==========================

interface EmptyStatePersonalProps {
  onAddClick: () => void;
}

// ==========================
// Component
// ==========================

const EmptyStatePersonal: React.FC<EmptyStatePersonalProps> = ({ onAddClick }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center text-center py-12 px-4"
    >
      <div className="mb-4 text-gray-400">
        <Users size={48} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No personal relationships yet
      </h3>

      <p className="text-sm text-gray-600 mb-6 max-w-md">
        Add family members and dependents to track important personal connections and their information.
      </p>

      <button
        type="button"
        onClick={onAddClick}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Add Personal Relationship
      </button>
    </div>
  );
};

export default EmptyStatePersonal;
