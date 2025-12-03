import React from 'react';

interface SummaryTabProps {
  clientGroupId: string;
}

/**
 * SummaryTab - Overview of client group
 *
 * Shows:
 * - Client group header (name, type, status)
 * - Key metrics (FUM, number of products, number of people)
 * - People in client group summary
 * - Quick actions
 * - Recent activity summary
 */
const SummaryTab: React.FC<SummaryTabProps> = ({ clientGroupId }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Summary</h2>
        <p className="text-gray-600 text-sm mt-1">
          Overview of client group information and key metrics
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Summary tab content coming soon</p>
          <p className="text-gray-400 text-sm mt-2">
            Client Group ID: {clientGroupId}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummaryTab;
