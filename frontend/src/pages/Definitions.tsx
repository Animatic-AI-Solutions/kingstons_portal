import React, { useState } from 'react';
import { Link } from 'react-router-dom';

type TabType = 'providers' | 'funds' | 'portfolio-templates';

const Definitions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('providers');

  // Function to determine the appropriate link for each entity type
  const getEntityLink = (type: TabType) => {
    switch (type) {
      case 'providers':
        return '/definitions/providers';
      case 'funds':
        return '/definitions/funds';
      case 'portfolio-templates':
        return '/definitions/portfolio-templates';
      default:
        return '/';
    }
  };

  // Function to determine the appropriate "Add" link for each entity type
  const getAddEntityLink = (type: TabType) => {
    switch (type) {
      case 'providers':
        return '/definitions/providers/add';
      case 'funds':
        return '/definitions/funds/add';
      case 'portfolio-templates':
        return '/definitions/portfolio-templates/add';
      default:
        return '/';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Definitions</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('providers')}
            className={`${
              activeTab === 'providers'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
          >
            Providers
          </button>
          <button
            onClick={() => setActiveTab('funds')}
            className={`${
              activeTab === 'funds'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
          >
            Funds
          </button>
          <button
            onClick={() => setActiveTab('portfolio-templates')}
            className={`${
              activeTab === 'portfolio-templates'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
          >
            Portfolios
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 capitalize">{activeTab}</h2>
          <Link
            to={getAddEntityLink(activeTab)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Add {activeTab.slice(0, -1)}
          </Link>
        </div>

        <div className="prose max-w-none">
          {activeTab === 'providers' && (
            <div>
              <p className="text-base text-gray-700 mb-4">
                Providers are the financial institutions that offer investment products to your clients. 
                Managing providers allows you to track which institutions you work with and what products they offer.
              </p>
              <div className="mt-6">
                <Link
                  to={getEntityLink(activeTab)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View All Providers
                </Link>
              </div>
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Provider Management Features</h3>
                <ul className="mt-4 space-y-2 text-base text-gray-700">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Add and manage provider details
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Track provider contact information
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    View products offered by each provider
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'funds' && (
            <div>
              <p className="text-base text-gray-700 mb-4">
                Funds are the specific investment options within products. 
                Managing funds allows you to track performance and allocations across client accounts.
              </p>
              <div className="mt-6">
                <Link
                  to={getEntityLink(activeTab)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View All Funds
                </Link>
              </div>
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Fund Management Features</h3>
                <ul className="mt-4 space-y-2 text-base text-gray-700">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Add and manage fund details
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Track fund performance history
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    View fund allocations across portfolios
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'portfolio-templates' && (
            <div>
              <p className="text-base text-gray-700 mb-4">
                Portfolio Templates are pre-defined investment templates for clients. 
                Managing portfolio templates allows you to create and apply investment strategies consistently.
              </p>
              <div className="mt-6">
                <Link
                  to={getEntityLink(activeTab)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View All Portfolio Templates
                </Link>
              </div>
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Portfolio Template Management Features</h3>
                <ul className="mt-4 space-y-2 text-base text-gray-700">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create and manage portfolio models
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Set fund allocations within portfolios
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Track portfolio performance
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Definitions;
