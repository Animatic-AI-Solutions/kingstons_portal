import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type TabType = 'providers' | 'products' | 'funds' | 'portfolios';

const Definitions: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('providers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Function to determine the appropriate link for each entity type
  const getEntityLink = (type: TabType) => {
    switch (type) {
      case 'providers':
        return '/definitions/providers';
      case 'products':
        return '/definitions/products';
      case 'funds':
        return '/definitions/funds';
      case 'portfolios':
        return '/definitions/portfolios';
      default:
        return '/';
    }
  };

  // Function to determine the appropriate "Add" link for each entity type
  const getAddEntityLink = (type: TabType) => {
    switch (type) {
      case 'providers':
        return '/definitions/providers/add';
      case 'products':
        return '/definitions/products/add';
      case 'funds':
        return '/definitions/funds/add';
      case 'portfolios':
        return '/definitions/portfolios/add';
      default:
        return '/';
    }
  };

  // Get provider color function for the color dots
  const getProviderColor = (providerName: string | undefined): string => {
    if (!providerName) return '#CCCCCC'; // Default gray for unknown providers
    
    // Define a set of vibrant colors to use for providers
    const colors = [
      '#4F46E5', // Indigo
      '#16A34A', // Green
      '#EA580C', // Orange
      '#DC2626', // Red
      '#7C3AED', // Purple
      '#0369A1', // Blue
      '#B45309', // Amber
      '#0D9488', // Teal
      '#BE185D', // Pink
      '#475569', // Slate
      '#059669', // Emerald
      '#D97706', // Yellow
      '#9333EA', // Fuchsia
      '#4338CA', // Blue-600
    ];
    
    // Use a simple hash function to get consistent colors for the same provider name
    const hash = providerName.split('').reduce((acc: number, char: string) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Map the hash to one of our predefined colors
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Format percentage with 1 decimal place
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Navigate to details page
  const handleItemClick = (type: TabType, id: number) => {
    navigate(`/definitions/${type}/${id}`);
  };

  // Fake data for demo
  const sampleProviders = [
    { id: 1, name: 'Vanguard', type: 'Investment Bank', status: 'active', products: 12, updated_at: '2023-06-15' },
    { id: 2, name: 'Fidelity', type: 'Wealth Management', status: 'active', products: 8, updated_at: '2023-07-21' },
    { id: 3, name: 'BlackRock', type: 'Asset Management', status: 'active', products: 15, updated_at: '2023-05-30' },
    { id: 4, name: 'JP Morgan', type: 'Investment Bank', status: 'inactive', products: 5, updated_at: '2023-04-12' },
    { id: 5, name: 'Charles Schwab', type: 'Brokerage', status: 'active', products: 9, updated_at: '2023-08-03' }
  ].filter(provider => showInactive || provider.status === 'active')
   .filter(provider => provider.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       provider.type.toLowerCase().includes(searchQuery.toLowerCase()));

  const sampleProducts = [
    { id: 1, name: 'Retirement Portfolio', provider: 'Vanguard', type: 'Pension', status: 'active', updated_at: '2023-08-15' },
    { id: 2, name: 'Growth Fund', provider: 'Fidelity', type: 'Investment', status: 'active', updated_at: '2023-07-20' },
    { id: 3, name: 'Income Builder', provider: 'BlackRock', type: 'Investment', status: 'active', updated_at: '2023-06-30' },
    { id: 4, name: 'High Yield Bond', provider: 'JP Morgan', type: 'Bond', status: 'inactive', updated_at: '2023-05-12' },
    { id: 5, name: 'Emerging Markets', provider: 'Charles Schwab', type: 'ETF', status: 'active', updated_at: '2023-08-05' }
  ].filter(product => showInactive || product.status === 'active')
   .filter(product => product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      product.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      product.type.toLowerCase().includes(searchQuery.toLowerCase()));

  const sampleFunds = [
    { id: 1, name: 'Global Equity', provider: 'Vanguard', type: 'Equity', performance: 8.2, risk: 'Medium' },
    { id: 2, name: 'Tech Growth', provider: 'Fidelity', type: 'Sector', performance: 12.5, risk: 'High' },
    { id: 3, name: 'Fixed Income', provider: 'BlackRock', type: 'Bond', performance: 3.2, risk: 'Low' },
    { id: 4, name: 'Dividend Appreciation', provider: 'Vanguard', type: 'Equity', performance: 7.5, risk: 'Medium' },
    { id: 5, name: 'Real Estate', provider: 'Charles Schwab', type: 'REIT', performance: 5.8, risk: 'Medium-High' }
  ].filter(fund => fund.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   fund.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   fund.type.toLowerCase().includes(searchQuery.toLowerCase()));

  const samplePortfolios = [
    { id: 1, name: 'Conservative Growth', type: 'Model', risk: 'Conservative', advisor: 'Jan Smith', performance: 3.8 },
    { id: 2, name: 'Balanced Income', type: 'Model', risk: 'Balanced', advisor: 'Debbie Johnson', performance: 5.2 },
    { id: 3, name: 'Growth Portfolio', type: 'Custom', risk: 'Growth', advisor: 'Michael Brown', performance: 9.1 },
    { id: 4, name: 'High Growth', type: 'Model', risk: 'Aggressive', advisor: 'Jan Smith', performance: 11.5 },
    { id: 5, name: 'Income Focus', type: 'Custom', risk: 'Conservative', advisor: 'Debbie Johnson', performance: 4.3 }
  ].filter(portfolio => portfolio.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         portfolio.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         portfolio.risk.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         portfolio.advisor.toLowerCase().includes(searchQuery.toLowerCase()));

  // Get advisor color
  const getAdvisorColor = (advisorName: string): string => {
    if (advisorName.toLowerCase().includes('jan')) return '#ff59d6'; // Pink
    if (advisorName.toLowerCase().includes('debbie')) return '#3ceba6'; // Green
    return '#59cbff'; // Blue (default)
  };

  const handleAddNew = () => {
    navigate(getAddEntityLink(activeTab));
  };

  return (
    <div className="container mx-auto px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Definitions</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>Show Inactive</span>
          </label>
          <button
            onClick={handleAddNew}
            className="bg-primary-700 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add {activeTab.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-2 px-2 py-2 bg-gray-50 rounded-lg">
          <button
            onClick={() => setActiveTab('providers')}
            className={`${
              activeTab === 'providers'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
          >
            Providers
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`${
              activeTab === 'products'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('funds')}
            className={`${
              activeTab === 'funds'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
          >
            Funds
          </button>
          <button
            onClick={() => setActiveTab('portfolios')}
            className={`${
              activeTab === 'portfolios'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
          >
            Portfolios
          </button>
        </nav>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        {/* Search Bar */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 transition-colors duration-200"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'providers' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Provider</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Products</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sampleProviders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-b border-gray-200">
                      No providers found
                    </td>
                  </tr>
                ) : (
                  sampleProviders.map(provider => (
                    <tr 
                      key={provider.id} 
                      className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleItemClick('providers', provider.id)}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="h-3 w-3 rounded-full mr-2 flex-shrink-0" 
                            style={{ backgroundColor: getProviderColor(provider.name) }}
                          ></div>
                          <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{provider.name}</div>
        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{provider.type}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          provider.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {provider.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-indigo-600 font-medium">{provider.products}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {new Date(provider.updated_at).toLocaleDateString()}
              </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Product</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Provider</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sampleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-b border-gray-200">
                      No products found
                    </td>
                  </tr>
                ) : (
                  sampleProducts.map(product => (
                    <tr 
                      key={product.id} 
                      className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleItemClick('products', product.id)}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{product.name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="h-3 w-3 rounded-full mr-2 flex-shrink-0" 
                            style={{ backgroundColor: getProviderColor(product.provider) }}
                          ></div>
                          <div className="text-sm text-gray-600 font-sans">{product.provider}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{product.type}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {new Date(product.updated_at).toLocaleDateString()}
              </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
              </div>
            </div>
          )}

          {activeTab === 'funds' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Fund</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Provider</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Performance (1Y)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Risk Rating</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sampleFunds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-b border-gray-200">
                      No funds found
                    </td>
                  </tr>
                ) : (
                  sampleFunds.map(fund => (
                    <tr 
                      key={fund.id} 
                      className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleItemClick('funds', fund.id)}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{fund.name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="h-3 w-3 rounded-full mr-2 flex-shrink-0" 
                            style={{ backgroundColor: getProviderColor(fund.provider) }}
                          ></div>
                          <div className="text-sm text-gray-600 font-sans">{fund.provider}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{fund.type}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className={`text-sm font-medium ${fund.performance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatPercentage(fund.performance)}
                          <span className="ml-1">
                            {fund.performance >= 0 ? '▲' : '▼'}
                          </span>
              </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          fund.risk === 'Low' ? 'bg-green-100 text-green-800' : 
                          fund.risk === 'Medium' ? 'bg-blue-100 text-blue-800' : 
                          fund.risk === 'Medium-High' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {fund.risk}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
              </div>
            </div>
          )}

          {activeTab === 'portfolios' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Portfolio</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Risk Profile</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Advisor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Performance (YTD)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {samplePortfolios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-b border-gray-200">
                      No portfolios found
                    </td>
                  </tr>
                ) : (
                  samplePortfolios.map(portfolio => (
                    <tr 
                      key={portfolio.id} 
                      className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleItemClick('portfolios', portfolio.id)}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{portfolio.name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{portfolio.type}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          portfolio.risk === 'Conservative' ? 'bg-blue-100 text-blue-800' : 
                          portfolio.risk === 'Balanced' ? 'bg-indigo-100 text-indigo-800' : 
                          portfolio.risk === 'Growth' ? 'bg-purple-100 text-purple-800' : 
                          'bg-pink-100 text-pink-800'
                        }`}>
                          {portfolio.risk}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <span 
                            className="inline-block h-2 w-2 rounded-full mr-2"
                            style={{ backgroundColor: getAdvisorColor(portfolio.advisor) }}
                          ></span>
                          <div className="text-sm text-gray-600 font-sans">{portfolio.advisor}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className={`text-sm font-medium ${portfolio.performance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatPercentage(portfolio.performance)}
                          <span className="ml-1">
                            {portfolio.performance >= 0 ? '▲' : '▼'}
                          </span>
              </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
              </div>
            </div>
          )}
    </div>
  );
};

export default Definitions;
