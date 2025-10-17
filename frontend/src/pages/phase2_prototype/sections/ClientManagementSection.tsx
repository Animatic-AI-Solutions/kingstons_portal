import React from 'react';

interface ClientManagementInfo {
  leadAdvisor: string;
  typeOfClient: string;
  ongoingClientStartDate?: string;
  dateOfClientDeclaration: string;
  dateOfPrivacyDeclaration: string;
  lastFeeAgreement: string;
  feeAchieved: number;
  fixedFee: number;
  nextReviewDate: string;
}

interface ClientManagementSectionProps {
  clientManagementInfo: ClientManagementInfo;
}

const ClientManagementSection: React.FC<ClientManagementSectionProps> = ({
  clientManagementInfo
}) => {
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <h3 className="text-base font-semibold mb-2">Client & Fee Information</h3>
      <div className="grid grid-cols-3 gap-x-4 gap-y-2">
        <div>
          <p className="text-sm font-bold text-blue-600">Lead Advisor</p>
          <p className="text-base font-semibold text-gray-900">{clientManagementInfo.leadAdvisor}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-blue-600">Type of Client</p>
          <span className="inline-block px-2 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {clientManagementInfo.typeOfClient}
          </span>
        </div>
        {clientManagementInfo.typeOfClient === 'Ongoing' && (
          <div>
            <p className="text-sm font-bold text-blue-600">Ongoing Client Start Date</p>
            <p className="text-base font-semibold text-gray-900">{clientManagementInfo.ongoingClientStartDate}</p>
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-blue-600">Date of Client Declaration</p>
          <p className="text-base font-semibold text-gray-900">{clientManagementInfo.dateOfClientDeclaration}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-blue-600">Date of Privacy Declaration</p>
          <p className="text-base font-semibold text-gray-900">{clientManagementInfo.dateOfPrivacyDeclaration}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-blue-600">Last Fee Agreement</p>
          <p className="text-base font-semibold text-gray-900">{clientManagementInfo.lastFeeAgreement}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-blue-600">Fee Achieved</p>
          <p className="text-base font-semibold text-gray-900">{clientManagementInfo.feeAchieved}%</p>
        </div>
        <div>
          <p className="text-sm font-bold text-blue-600">Fixed Fee</p>
          <p className="text-base font-semibold text-gray-900">{formatCurrency(clientManagementInfo.fixedFee)}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-blue-600">Next Review Date</p>
          <p className="text-base font-semibold text-gray-900">{clientManagementInfo.nextReviewDate}</p>
        </div>
      </div>
    </div>
  );
};

export default ClientManagementSection;
