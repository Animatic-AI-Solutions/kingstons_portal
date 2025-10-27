import React, { useState } from 'react';
import PeopleTableSection from '../sections/PeopleTableSection';
import RelationshipsSection from '../sections/RelationshipsSection';
import HealthVulnerabilitySection from '../sections/HealthVulnerabilitySection';
import DocumentsSection from '../sections/DocumentsSection';
import RiskAssessmentsSection from '../sections/RiskAssessmentsSection';
import MeetingsSection from '../sections/MeetingsSection';
import ClientManagementSection from '../sections/ClientManagementSection';
import {
  Person,
  SpecialRelationship,
  HealthItem,
  VulnerabilityItem,
  Document,
  RiskAssessment,
  CapacityToLoss,
  AssignedMeeting,
  MeetingInstance
} from '../types';

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

interface BasicDetailsTabProps {
  people: Person[];
  clientOrder: string[];
  relationships: SpecialRelationship[];
  healthItems: HealthItem[];
  vulnerabilities: VulnerabilityItem[];
  documents: Document[];
  riskAssessments: RiskAssessment[];
  capacityToLoss: CapacityToLoss[];
  assignedMeetings: AssignedMeeting[];
  meetingInstances: MeetingInstance[];
  clientManagementInfo: ClientManagementInfo;
  onPersonClick: (person: Person) => void;
  onRelationshipClick: (relationship: SpecialRelationship) => void;
  onHealthVulnerabilityClick: (item: HealthItem | VulnerabilityItem) => void;
  onDocumentClick: (document: Document) => void;
  onRiskAssessmentClick: (assessment: RiskAssessment) => void;
  onCapacityToLossClick: (capacity: CapacityToLoss) => void;
  onAssignedMeetingClick: (meeting: AssignedMeeting) => void;
  onMeetingInstanceClick: (instance: MeetingInstance) => void;
}

const BasicDetailsTab: React.FC<BasicDetailsTabProps> = ({
  people,
  clientOrder,
  relationships,
  healthItems,
  vulnerabilities,
  documents,
  riskAssessments,
  capacityToLoss,
  assignedMeetings,
  meetingInstances,
  clientManagementInfo,
  onPersonClick,
  onRelationshipClick,
  onHealthVulnerabilityClick,
  onDocumentClick,
  onRiskAssessmentClick,
  onCapacityToLossClick,
  onAssignedMeetingClick,
  onMeetingInstanceClick
}) => {
  const [activeSubTab, setActiveSubTab] = useState('people');

  // Action handlers
  const handleDelete = (item: any) => {
    console.log('Delete:', item);
    // TODO: Implement delete logic
  };

  const handleLapse = (item: any) => {
    console.log('Lapse:', item);
    // TODO: Implement lapse logic
  };

  const basicDetailsTabs = [
    { id: 'people', label: 'People' },
    { id: 'relationships', label: 'Special Relationships' },
    { id: 'health', label: 'Health & Vulnerability' },
    { id: 'documents', label: 'Legal Documents' },
    { id: 'risk', label: 'Risk' },
    { id: 'management', label: 'Client Management' },
  ];

  const renderBasicDetailsContent = () => {
    switch (activeSubTab) {
      case 'people':
        return (
          <PeopleTableSection
            people={people}
            clientOrder={clientOrder}
            onPersonClick={onPersonClick}
            onDelete={handleDelete}
            onLapse={handleLapse}
          />
        );
      case 'relationships':
        return (
          <RelationshipsSection
            relationships={relationships}
            onRelationshipClick={onRelationshipClick}
            onDelete={handleDelete}
            onLapse={handleLapse}
          />
        );
      case 'health':
        return (
          <HealthVulnerabilitySection
            people={people}
            clientOrder={clientOrder}
            healthItems={healthItems}
            vulnerabilities={vulnerabilities}
            onItemClick={onHealthVulnerabilityClick}
          />
        );
      case 'documents':
        return (
          <DocumentsSection
            documents={documents}
            people={people}
            clientOrder={clientOrder}
            onDocumentClick={onDocumentClick}
            onDelete={handleDelete}
            onLapse={handleLapse}
          />
        );
      case 'risk':
        return (
          <RiskAssessmentsSection
            riskAssessments={riskAssessments}
            capacityToLoss={capacityToLoss}
            onRiskAssessmentClick={onRiskAssessmentClick}
            onCapacityToLossClick={onCapacityToLossClick}
          />
        );
      case 'management':
        return (
          <div className="space-y-6">
            <ClientManagementSection clientManagementInfo={clientManagementInfo} />
            <MeetingsSection
              assignedMeetings={assignedMeetings}
              meetingInstances={meetingInstances}
              onAssignedMeetingClick={onAssignedMeetingClick}
              onMeetingInstanceClick={onMeetingInstanceClick}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Prominent divider line for visual separation */}
      <div className="border-t-4 border-primary-600 pt-6 mt-4">
        {/* Sub-section label */}
        <div className="text-center mb-3">
          <span className="text-base font-bold text-primary-700 uppercase tracking-wide">
            Select Section
          </span>
        </div>
        {/* Sub-tabs with visual distinction - smaller, colored */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center bg-primary-50 rounded-lg p-1 overflow-x-auto border border-primary-200 shadow-sm">
            {basicDetailsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeSubTab === tab.id
                    ? 'bg-primary-700 text-white shadow-md'
                    : 'text-primary-700 hover:bg-primary-100 hover:text-primary-800'
                }`}
              >
                <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {renderBasicDetailsContent()}
    </div>
  );
};

export default BasicDetailsTab;
