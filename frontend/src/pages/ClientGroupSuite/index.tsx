import React, { useState, useEffect } from 'react';
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
import DynamicPageContainer from '../../components/phase2/client-groups/DynamicPageContainer';
import api from '../../services/api';

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

  // Client group data state
  const [clientGroupName, setClientGroupName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch client group basic info for breadcrumb
  useEffect(() => {
    const fetchClientGroup = async () => {
      if (!clientGroupId) return;

      try {
        const response = await api.get(`/client-groups/${clientGroupId}`);
        setClientGroupName(response.data.name || 'Client Group');
      } catch (error) {
        console.error('Failed to fetch client group:', error);
        setClientGroupName('Client Group');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientGroup();
  }, [clientGroupId]);

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

  // Breadcrumb component
  const Breadcrumbs = () => {
    return (
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <button
              onClick={() => navigate('/client-groups')}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Clients
            </button>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">
                {isLoading ? 'Loading...' : clientGroupName}
              </span>
            </div>
          </li>
        </ol>
      </nav>
    );
  };

  return (
    <DynamicPageContainer maxWidth="1800px" className="py-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">
          {isLoading ? 'Loading...' : clientGroupName}
        </h1>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-900 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-base font-medium whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </DynamicPageContainer>
  );
};

export default ClientGroupSuite;
