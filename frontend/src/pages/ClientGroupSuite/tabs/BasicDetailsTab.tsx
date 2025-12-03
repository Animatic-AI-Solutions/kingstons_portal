import React, { useState } from 'react';
import {
  UserGroupIcon,
  UsersIcon,
  HeartIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

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
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">People content coming soon</p>
              <p className="text-gray-400 text-sm mt-2">
                Personal information, contact details, and addresses
              </p>
            </div>
          </div>
        );
      case 'relationships':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Special Relationships content coming soon</p>
              <p className="text-gray-400 text-sm mt-2">
                Accountants, solicitors, and family relationships
              </p>
            </div>
          </div>
        );
      case 'health':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Health & Vulnerability content coming soon</p>
              <p className="text-gray-400 text-sm mt-2">
                Health conditions and vulnerability tracking
              </p>
            </div>
          </div>
        );
      case 'documents':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Legal Documents content coming soon</p>
              <p className="text-gray-400 text-sm mt-2">
                Wills, LPOAs, and other legal documents
              </p>
            </div>
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
      {/* Sub-tab Navigation */}
      <div className="border-b border-gray-200 bg-gray-50 -mx-6 px-6 py-3 rounded-t-lg">
        <nav className="-mb-px flex space-x-8">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`
                  group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm
                  ${
                    isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon
                  className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sub-tab Content */}
      <div>
        {renderSubTabContent()}
      </div>
    </div>
  );
};

export default BasicDetailsTab;
