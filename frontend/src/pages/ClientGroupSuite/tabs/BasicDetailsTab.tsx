import React, { useState, useMemo } from 'react';
import {
  UserGroupIcon,
  UsersIcon,
  HeartIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import PeopleSubTab from './components/PeopleSubTab';
import SpecialRelationshipsWrapper from './components/SpecialRelationshipsWrapper';
import { HealthVulnerabilityTab } from '@/components/phase2/health-vulnerabilities';
import { LegalDocumentsContainer } from '@/components/phase2/legal-documents';
import { useProductOwners } from '@/hooks/useProductOwners';

interface BasicDetailsTabProps {
  clientGroupId: string;
}

/**
 * BasicDetailsTab - Detailed client information with sub-tabs
 *
 * Sub-tabs:
 * - People: Personal information, contact, address
 * - Special Relationships: Accountants, solicitors, family
 * - Health & Vulnerability: Medical info and vulnerability tracking
 * - Legal Documents: Wills, LPOAs, etc.
 * - Risk: Risk assessments and capacity to loss
 */
const BasicDetailsTab: React.FC<BasicDetailsTabProps> = ({ clientGroupId }) => {
  const [activeSubTab, setActiveSubTab] = useState('people');

  // Parse clientGroupId to number for API calls
  const clientGroupIdNumber = useMemo<number | null>(() => {
    if (!clientGroupId) return null;
    const parsed = parseInt(clientGroupId, 10);
    return isNaN(parsed) ? null : parsed;
  }, [clientGroupId]);

  // Fetch product owners for Legal Documents tab
  const { data: productOwners } = useProductOwners(clientGroupIdNumber);

  // Sub-tabs configuration
  const subTabs = [
    { id: 'people', label: 'People', icon: UserGroupIcon },
    { id: 'relationships', label: 'Special Relationships', icon: UsersIcon },
    { id: 'health', label: 'Health & Vulnerability', icon: HeartIcon },
    { id: 'documents', label: 'Legal Documents', icon: DocumentTextIcon },
    { id: 'risk', label: 'Risk', icon: ShieldCheckIcon },
  ];

  // Render sub-tab content
  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'people':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <PeopleSubTab />
          </div>
        );
      case 'relationships':
        return <SpecialRelationshipsWrapper />;
      case 'health':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <HealthVulnerabilityTab clientGroupId={parseInt(clientGroupId, 10)} />
          </div>
        );
      case 'documents':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            {clientGroupIdNumber ? (
              <LegalDocumentsContainer
                clientGroupId={clientGroupIdNumber}
                productOwners={productOwners || []}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Invalid client group</p>
              </div>
            )}
          </div>
        );
      case 'risk':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Risk content coming soon</p>
              <p className="text-gray-400 text-sm mt-2">
                Risk assessments and capacity to loss
              </p>
            </div>
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
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    activeSubTab === tab.id
                      ? 'bg-primary-700 text-white shadow-md'
                      : 'text-primary-700 hover:bg-primary-100 hover:text-primary-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-tab Content */}
      <div>
        {renderSubTabContent()}
      </div>
    </div>
  );
};

export default BasicDetailsTab;
