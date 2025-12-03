import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UserIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ChartBarIcon,
  FlagIcon,
  BuildingLibraryIcon,
  CurrencyPoundIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import DynamicPageContainer from '../../components/DynamicPageContainer';

// Import tab components (placeholders for now)
import SummaryTab from './tabs/SummaryTab';
import AimsActionsTab from './tabs/AimsActionsTab';
import BasicDetailsTab from './tabs/BasicDetailsTab';
import LiabilitiesAssetsTab from './tabs/LiabilitiesAssetsTab';
import IncomeExpenditureTab from './tabs/IncomeExpenditureTab';
import OtherProductsTab from './tabs/OtherProductsTab';
import ClientManagementTab from './tabs/ClientManagementTab';

/**
 * ClientGroupSuite - Hub for all client group information and activities
 *
 * This is the main page for managing a specific client group.
 * Uses horizontal tab navigation similar to the Phase 2 prototype.
 *
 * Features:
 * - Overview of client group details
 * - People management (product owners)
 * - Financial products tracking
 * - Activity history and timeline
 * - Meetings and appointments
 * - Settings and configuration
 */
const ClientGroupSuite: React.FC = () => {
  const { clientGroupId } = useParams<{ clientGroupId: string }>();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState('summary');

  // Main tabs configuration
  const mainTabs = [
    { id: 'summary', label: 'Summary', icon: ChartBarIcon },
    { id: 'aims', label: 'Aims & Actions', icon: FlagIcon },
    { id: 'basic', label: 'Basic Details', icon: UserIcon },
    { id: 'liabilities', label: 'Liabilities & Assets', icon: BuildingLibraryIcon },
    { id: 'income', label: 'Income & Expenditure', icon: CurrencyPoundIcon },
    { id: 'products', label: 'Other Products', icon: ShieldCheckIcon },
    { id: 'management', label: 'Client Management', icon: BriefcaseIcon },
  ];

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return <SummaryTab clientGroupId={clientGroupId!} />;
      case 'aims':
        return <AimsActionsTab clientGroupId={clientGroupId!} />;
      case 'basic':
        return <BasicDetailsTab clientGroupId={clientGroupId!} />;
      case 'liabilities':
        return <LiabilitiesAssetsTab clientGroupId={clientGroupId!} />;
      case 'income':
        return <IncomeExpenditureTab clientGroupId={clientGroupId!} />;
      case 'products':
        return <OtherProductsTab clientGroupId={clientGroupId!} />;
      case 'management':
        return <ClientManagementTab clientGroupId={clientGroupId!} />;
      default:
        return <SummaryTab clientGroupId={clientGroupId!} />;
    }
  };

  return (
    <DynamicPageContainer maxWidth="1800px" className="py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">
              Client Group Suite
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Manage all aspects of this client group
            </p>
          </div>
          <button
            onClick={() => navigate('/client-groups')}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Client Groups
          </button>
        </div>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    isActive
                      ? 'border-primary-700 text-primary-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon
                  className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${isActive ? 'text-primary-700' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </DynamicPageContainer>
  );
};

export default ClientGroupSuite;
