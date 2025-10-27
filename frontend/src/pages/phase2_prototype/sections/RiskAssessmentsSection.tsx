import React from 'react';
import { ChevronRightIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { RiskAssessment, CapacityToLoss } from '../types';

interface RiskAssessmentsSectionProps {
  riskAssessments: RiskAssessment[];
  capacityToLoss: CapacityToLoss[];
  onRiskAssessmentClick: (assessment: RiskAssessment) => void;
  onCapacityToLossClick: (capacity: CapacityToLoss) => void;
  onLapseRiskAssessment?: (assessment: RiskAssessment) => void;
  onDeleteRiskAssessment?: (assessment: RiskAssessment) => void;
}

const RiskAssessmentsSection: React.FC<RiskAssessmentsSectionProps> = ({
  riskAssessments,
  capacityToLoss,
  onRiskAssessmentClick,
  onCapacityToLossClick,
  onLapseRiskAssessment,
  onDeleteRiskAssessment
}) => {
  // Helper function to get risk group label from score
  const getRiskGroupLabel = (riskScore: number): string => {
    const riskGroups: Record<number, string> = {
      1: 'Very Minimal',
      2: 'Minimal',
      3: 'Modest',
      4: 'Medium',
      5: 'More Adventurous',
      6: 'Adventurous',
      7: 'Speculative'
    };
    return riskGroups[riskScore] || 'Unknown';
  };

  // Sort assessments: Current before Lapsed
  const sortedAssessments = [...riskAssessments].sort((a, b) => {
    if (a.status === 'Current' && b.status === 'Lapsed') return -1;
    if (a.status === 'Lapsed' && b.status === 'Current') return 1;
    return 0;
  });

  // Sort capacity to loss: Active before Lapsed
  const sortedCapacity = [...capacityToLoss].sort((a, b) => {
    if (a.status === 'Active' && b.status === 'Lapsed') return -1;
    if (a.status === 'Lapsed' && b.status === 'Active') return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Attitude to Risk */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Attitude to Risk</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Person</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Actual Score</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Category Score</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Risk Group</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Date</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Actions</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAssessments.map((assessment) => (
              <tr
                key={assessment.id}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                  assessment.status === 'Lapsed' ? 'opacity-60' : ''
                }`}
                onClick={() => onRiskAssessmentClick(assessment)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{assessment.personName}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    assessment.status === 'Lapsed'
                      ? 'bg-gray-200 text-gray-900'
                      : assessment.assessmentType === 'Finemetrica'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {assessment.assessmentType}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                  {assessment.rawResult ? `${assessment.rawResult}/100` : '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                  {assessment.assessmentType === 'Finemetrica'
                    ? `${assessment.riskScore}/7`
                    : `${assessment.manualRiskScore}/7`
                  }
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    assessment.status === 'Lapsed'
                      ? 'bg-gray-200 text-gray-900'
                      : assessment.assessmentType === 'Finemetrica'
                      ? (assessment.riskScore && assessment.riskScore <= 3
                          ? 'bg-green-100 text-green-800'
                          : assessment.riskScore && assessment.riskScore <= 5
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800')
                      : (assessment.manualRiskScore && assessment.manualRiskScore <= 3
                          ? 'bg-green-100 text-green-800'
                          : assessment.manualRiskScore && assessment.manualRiskScore <= 5
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800')
                  }`}>
                    {assessment.assessmentType === 'Finemetrica'
                      ? getRiskGroupLabel(assessment.riskScore || 0)
                      : getRiskGroupLabel(assessment.manualRiskScore || 0)
                    }
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{assessment.date || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    assessment.status === 'Current'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    {assessment.status}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base">
                  <div className="flex items-center gap-2">
                    {onLapseRiskAssessment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLapseRiskAssessment(assessment);
                        }}
                        className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors"
                        title="Lapse"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteRiskAssessment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRiskAssessment(assessment);
                        }}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                  <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Capacity for Loss */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Capacity for Loss</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Person</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Score</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Category</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Date Assessed</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCapacity.map((capacity) => (
              <tr
                key={capacity.id}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                  capacity.status === 'Lapsed' ? 'opacity-60' : ''
                }`}
                onClick={() => onCapacityToLossClick(capacity)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{capacity.personName}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 font-semibold">{capacity.score}/10</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    capacity.status === 'Lapsed'
                      ? 'bg-gray-200 text-gray-900'
                      : capacity.category.includes('High')
                      ? 'bg-green-100 text-green-800'
                      : capacity.category.includes('Medium')
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {capacity.category}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{capacity.dateAssessed}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    capacity.status === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    {capacity.status}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                  <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskAssessmentsSection;
