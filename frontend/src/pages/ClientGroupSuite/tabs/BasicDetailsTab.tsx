import React from 'react';

interface BasicDetailsTabProps {
  clientGroupId: string;
}

/**
 * BasicDetailsTab - Detailed client information
 *
 * Shows:
 * - People details (personal information, contact, address)
 * - Special relationships (accountants, solicitors, family)
 * - Health and vulnerability tracking
 * - Documents (Wills, LPOAs)
 * - Risk assessments
 * - Capacity to loss
 */
const BasicDetailsTab: React.FC<BasicDetailsTabProps> = ({ clientGroupId }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Basic Details</h2>
        <p className="text-gray-600 text-sm mt-1">
          Comprehensive client information and documentation
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Basic Details content coming soon</p>
          <p className="text-gray-400 text-sm mt-2">
            Will display detailed information for client group {clientGroupId}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasicDetailsTab;
