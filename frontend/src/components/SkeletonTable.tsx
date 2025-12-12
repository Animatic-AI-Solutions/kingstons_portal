/**
 * SkeletonTable Component (Cycle 6)
 *
 * Loading skeleton for table components.
 * Displays animated placeholder rows while data loads.
 *
 * Features:
 * - Configurable row count (default: 4)
 * - Animated pulse effect
 * - Varied cell widths for realistic appearance
 * - ARIA live region (role="status", aria-live="polite")
 * - Screen reader announcement
 * - WCAG 2.1 AA compliant
 *
 * @component SkeletonTable
 */

import React from 'react';

// ==========================
// Types
// ==========================

interface SkeletonTableProps {
  rowCount?: number;
}

// ==========================
// Component
// ==========================

const SkeletonTable: React.FC<SkeletonTableProps> = ({ rowCount = 4 }) => {
  return (
    <div role="status" aria-live="polite" aria-label="Loading relationships">
      <span className="sr-only">Loading relationships</span>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Relationship
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Age
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rowCount }).map((_, index) => (
            <tr key={index} className="animate-pulse">
              <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-28"></div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SkeletonTable;
