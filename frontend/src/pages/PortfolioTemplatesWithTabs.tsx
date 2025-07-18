import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PortfolioTemplates from './PortfolioTemplates';
import PortfolioGenerations from './PortfolioGenerations';

type TabType = 'templates' | 'generations';

const PortfolioTemplatesWithTabs: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('templates');

  if (!user) return null;

  return (
    <div className="container mx-auto px-2 py-1">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-current={activeTab === 'templates' ? 'page' : undefined}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('generations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'generations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-current={activeTab === 'generations' ? 'page' : undefined}
          >
            Generations
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'templates' ? (
          <PortfolioTemplates tabMode={true} />
        ) : (
          <PortfolioGenerations tabMode={true} />
        )}
      </div>
    </div>
  );
};

export default PortfolioTemplatesWithTabs; 