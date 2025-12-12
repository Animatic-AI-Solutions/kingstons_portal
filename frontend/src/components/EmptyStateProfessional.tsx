/**
 * EmptyStateProfessional Component (Cycle 6)
 *
 * Empty state for professional relationships tab.
 * Displays messaging and call-to-action for adding first professional relationship.
 *
 * Features:
 * - Icon (Briefcase from lucide-react)
 * - Heading and description
 * - Add Professional Relationship button
 * - ARIA live region (role="status", aria-live="polite")
 * - WCAG 2.1 AA compliant
 *
 * @component EmptyStateProfessional
 */

import React from 'react';
import { Briefcase } from 'lucide-react';

// ==========================
// Types
// ==========================

interface EmptyStateProfessionalProps {
  onAddClick: () => void;
}

// ==========================
// Component
// ==========================

const EmptyStateProfessional: React.FC<EmptyStateProfessionalProps> = ({ onAddClick }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center text-center py-12 px-4"
    >
      <div className="mb-4 text-gray-400">
        <Briefcase size={48} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No professional relationships yet
      </h3>

      <p className="text-sm text-gray-600 mb-6 max-w-md">
        Add accountants, solicitors, financial advisors, and other professional contacts to manage your network.
      </p>

      <button
        type="button"
        onClick={onAddClick}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Add Professional Relationship
      </button>
    </div>
  );
};

export default EmptyStateProfessional;
