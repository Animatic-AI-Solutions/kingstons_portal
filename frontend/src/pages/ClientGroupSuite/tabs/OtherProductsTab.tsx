import React from 'react';

interface OtherProductsTabProps {
  clientGroupId: string;
}

/**
 * OtherProductsTab - Insurance and protection products
 *
 * Shows:
 * - Life insurance policies
 * - Income protection
 * - Critical illness cover
 * - Other insurance products
 * - Policy details (provider, premium, cover amount)
 * - Renewal dates
 */
const OtherProductsTab: React.FC<OtherProductsTabProps> = ({ clientGroupId }) => {
  return (
    <div className="space-y-6">
      {/* Placeholder Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Other Products content coming soon</p>
          <p className="text-gray-400 text-sm mt-2">
            Will display insurance products for client group {clientGroupId}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OtherProductsTab;
