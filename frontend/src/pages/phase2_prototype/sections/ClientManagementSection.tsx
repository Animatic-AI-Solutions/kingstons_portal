import React, { useState } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatMoney } from '../../../utils/formatMoney';
import { ClientGroupFees } from '../types';

interface ClientManagementInfo {
  leadAdvisor: string;
  typeOfClient: string;
  ongoingClientStartDate?: string;
  dateOfClientDeclaration: string;
  dateOfPrivacyDeclaration: string;
  lastFeeAgreement: string;
  feeAchieved: number;
  fixedFee: number;
  totalFUM: number;
  nextReviewDate: string;
}

interface ClientManagementSectionProps {
  clientManagementInfo: ClientManagementInfo;
  clientGroupFees: ClientGroupFees[];
}

const ClientManagementSection: React.FC<ClientManagementSectionProps> = ({
  clientManagementInfo,
  clientGroupFees
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedInfo, setEditedInfo] = useState(clientManagementInfo);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedInfo(clientManagementInfo);
  };

  const handleSave = () => {
    // TODO: Implement save logic
    console.log('Saving client info:', editedInfo);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedInfo(clientManagementInfo);
    setIsEditing(false);
  };

  const handleChange = (field: keyof ClientManagementInfo, value: string | number) => {
    setEditedInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate totals for the fees table
  const totalFixedFeeDirect = clientGroupFees.reduce((sum, fee) => sum + fee.fixedFeeDirect, 0);
  const totalFixedFeeFacilitated = clientGroupFees.reduce((sum, fee) => sum + fee.fixedFeeFacilitated, 0);
  const totalPercentageFeeFacilitated = clientGroupFees.reduce((sum, fee) => sum + fee.percentageFeeFacilitated, 0);
  const totalRevenue = clientGroupFees.reduce((sum, fee) => sum + fee.totalRevenue, 0);

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Client & Fee Information</h3>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors"
              >
                <CheckIcon className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Top Row - Advisor, Client Type, and Dates */}
      <div className="bg-gray-50 p-2 rounded border border-gray-200 mb-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Advisor */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Advisor:</span>
            {isEditing ? (
              <input
                type="text"
                value={editedInfo.leadAdvisor}
                onChange={(e) => handleChange('leadAdvisor', e.target.value)}
                className="px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-900">{editedInfo.leadAdvisor}</span>
            )}
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-gray-300"></div>

          {/* Client Type */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Client Type:</span>
            {isEditing ? (
              <select
                value={editedInfo.typeOfClient}
                onChange={(e) => handleChange('typeOfClient', e.target.value)}
                className="px-2 py-0.5 text-sm font-medium border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Ongoing">Ongoing</option>
                <option value="One-Off">One-Off</option>
              </select>
            ) : (
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {editedInfo.typeOfClient}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-gray-300"></div>

          {/* Client Declaration Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Client Dec:</span>
            {isEditing ? (
              <input
                type="text"
                value={editedInfo.dateOfClientDeclaration}
                onChange={(e) => handleChange('dateOfClientDeclaration', e.target.value)}
                className="px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-900">{editedInfo.dateOfClientDeclaration}</span>
            )}
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-gray-300"></div>

          {/* Privacy Declaration Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Privacy Dec:</span>
            {isEditing ? (
              <input
                type="text"
                value={editedInfo.dateOfPrivacyDeclaration}
                onChange={(e) => handleChange('dateOfPrivacyDeclaration', e.target.value)}
                className="px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-900">{editedInfo.dateOfPrivacyDeclaration}</span>
            )}
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-gray-300"></div>

          {/* Fee Agreement Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Fee Agreement:</span>
            {isEditing ? (
              <input
                type="text"
                value={editedInfo.lastFeeAgreement}
                onChange={(e) => handleChange('lastFeeAgreement', e.target.value)}
                className="px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-900">{editedInfo.lastFeeAgreement}</span>
            )}
          </div>

          {/* Client Start Date (if Ongoing) */}
          {editedInfo.typeOfClient === 'Ongoing' && (
            <>
              {/* Divider */}
              <div className="h-4 w-px bg-gray-300"></div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Client Start:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedInfo.ongoingClientStartDate}
                    onChange={(e) => handleChange('ongoingClientStartDate', e.target.value)}
                    className="px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span className="text-sm font-semibold text-gray-900">{editedInfo.ongoingClientStartDate}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fees Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-bold text-gray-900 uppercase">Client Group</th>
              <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase">Fixed Fee Direct</th>
              <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase">Fixed Fee Facilitated</th>
              <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase">Percentage Fee Facilitated</th>
              <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clientGroupFees.map((fee) => (
              <tr key={fee.clientGroupId} className="hover:bg-gray-50">
                <td className="px-2 py-1 text-sm font-medium text-gray-900">{fee.clientGroupName}</td>
                <td className="px-2 py-1 text-sm text-gray-900 text-right">{formatMoney(fee.fixedFeeDirect)}</td>
                <td className="px-2 py-1 text-sm text-gray-900 text-right">{formatMoney(fee.fixedFeeFacilitated)}</td>
                <td className="px-2 py-1 text-sm text-gray-900 text-right">{formatMoney(fee.percentageFeeFacilitated)}</td>
                <td className="px-2 py-1 text-sm font-semibold text-gray-900 text-right">{formatMoney(fee.totalRevenue)}</td>
              </tr>
            ))}
            {/* Total Row */}
            <tr className="bg-blue-50 font-bold border-t-2 border-gray-400">
              <td className="px-2 py-1 text-sm text-gray-900">Total</td>
              <td className="px-2 py-1 text-sm text-gray-900 text-right">{formatMoney(totalFixedFeeDirect)}</td>
              <td className="px-2 py-1 text-sm text-gray-900 text-right">{formatMoney(totalFixedFeeFacilitated)}</td>
              <td className="px-2 py-1 text-sm text-gray-900 text-right">{formatMoney(totalPercentageFeeFacilitated)}</td>
              <td className="px-2 py-1 text-sm text-gray-900 text-right">{formatMoney(totalRevenue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientManagementSection;
