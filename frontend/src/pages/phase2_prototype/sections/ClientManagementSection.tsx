import React, { useState } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatMoney } from '../../../utils/formatMoney';

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
}

const ClientManagementSection: React.FC<ClientManagementSectionProps> = ({
  clientManagementInfo
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedInfo, setEditedInfo] = useState(clientManagementInfo);

  // Calculate fee value: fixed fee + (percentage fee * FUM)
  const percentageFee = (editedInfo.feeAchieved / 100) * editedInfo.totalFUM;
  const feeValue = editedInfo.fixedFee + percentageFee;

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

      <div className="grid grid-cols-12 gap-3">
        {/* Left Column - Client Info */}
        <div className="col-span-7 space-y-3">
          {/* Advisor and Client Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-2 rounded border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Advisor</p>
              {isEditing ? (
                <input
                  type="text"
                  value={editedInfo.leadAdvisor}
                  onChange={(e) => handleChange('leadAdvisor', e.target.value)}
                  className="w-full px-2 py-1 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-900">{editedInfo.leadAdvisor}</p>
              )}
            </div>
            <div className="bg-gray-50 p-2 rounded border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Client Type</p>
              {isEditing ? (
                <select
                  value={editedInfo.typeOfClient}
                  onChange={(e) => handleChange('typeOfClient', e.target.value)}
                  className="w-full px-2 py-1 text-sm font-medium border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>

          {/* Dates Section */}
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <p className="text-xs font-bold text-blue-700 uppercase mb-2">Key Dates</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-semibold text-gray-500">Client Dec</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedInfo.dateOfClientDeclaration}
                    onChange={(e) => handleChange('dateOfClientDeclaration', e.target.value)}
                    className="w-full px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-sm font-semibold text-gray-900">{editedInfo.dateOfClientDeclaration}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Privacy Dec</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedInfo.dateOfPrivacyDeclaration}
                    onChange={(e) => handleChange('dateOfPrivacyDeclaration', e.target.value)}
                    className="w-full px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-sm font-semibold text-gray-900">{editedInfo.dateOfPrivacyDeclaration}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Fee Agreement</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedInfo.lastFeeAgreement}
                    onChange={(e) => handleChange('lastFeeAgreement', e.target.value)}
                    className="w-full px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-sm font-semibold text-gray-900">{editedInfo.lastFeeAgreement}</p>
                )}
              </div>
              {editedInfo.typeOfClient === 'Ongoing' && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">Client Start</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedInfo.ongoingClientStartDate}
                      onChange={(e) => handleChange('ongoingClientStartDate', e.target.value)}
                      className="w-full px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-gray-900">{editedInfo.ongoingClientStartDate}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Financial Metrics */}
        <div className="col-span-5 space-y-3">
          {/* Fee Metrics - Prominent Cards */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
            <p className="text-xs font-semibold text-green-700 uppercase mb-1">Fee Achieved</p>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={editedInfo.feeAchieved}
                onChange={(e) => handleChange('feeAchieved', parseFloat(e.target.value))}
                className="w-full px-2 py-1 text-lg font-bold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{editedInfo.feeAchieved}%</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Total Fee Value</p>
            <p className="text-2xl font-bold text-gray-900">{formatMoney(feeValue)}</p>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-2 rounded border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total FUM</p>
              {isEditing ? (
                <input
                  type="number"
                  value={editedInfo.totalFUM}
                  onChange={(e) => handleChange('totalFUM', parseFloat(e.target.value))}
                  className="w-full px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm font-bold text-gray-900">{formatMoney(editedInfo.totalFUM)}</p>
              )}
            </div>
            <div className="bg-gray-50 p-2 rounded border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Fixed Fee</p>
              {isEditing ? (
                <input
                  type="number"
                  value={editedInfo.fixedFee}
                  onChange={(e) => handleChange('fixedFee', parseFloat(e.target.value))}
                  className="w-full px-2 py-0.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm font-bold text-gray-900">{formatMoney(editedInfo.fixedFee)}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientManagementSection;
