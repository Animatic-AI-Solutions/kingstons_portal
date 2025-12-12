/**
 * ErrorStateNetwork Component (Cycle 6)
 *
 * Network error state component.
 * Displays error message and retry button for network/connection failures.
 *
 * Features:
 * - Icon (WifiOff from lucide-react)
 * - Error heading and descriptive message
 * - Try Again button
 * - ARIA live region (role="alert", aria-live="assertive")
 * - Red color scheme for error indication
 * - WCAG 2.1 AA compliant
 *
 * @component ErrorStateNetwork
 */

import React from 'react';
import { WifiOff } from 'lucide-react';

// ==========================
// Types
// ==========================

interface ErrorStateNetworkProps {
  onRetry: () => void;
}

// ==========================
// Component
// ==========================

const ErrorStateNetwork: React.FC<ErrorStateNetworkProps> = ({ onRetry }) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center text-center py-12 px-4"
    >
      <div className="mb-4 text-red-400">
        <WifiOff size={48} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Unable to load relationships
      </h3>

      <p className="text-sm text-gray-600 mb-6 max-w-md">
        Check your internet connection and try again. If the problem persists, please contact support.
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Try Again
      </button>
    </div>
  );
};

export default ErrorStateNetwork;
