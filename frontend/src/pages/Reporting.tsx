import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface PerformanceData {
  id: number | string;
  name: string;
  type: 'client' | 'account' | 'portfolio' | 'portfolio_template';
  fum: number;
  irr: number;
  startDate: string;
  advisor?: string;
  template_group?: string;
  portfolio_count?: number;
  is_template?: boolean;
}

interface PortfolioGroup {
  name: string;
  count: number;
  avgIrr: number;
  totalFum: number;
  bestIrr: number;
  is_template?: boolean;
}

interface SortToggleProps {
  sortOrder: 'highest' | 'lowest';
  onToggle: () => void;
}

interface ClientRisk {
  client_id: number;
  client_name: string;
  risk_score: number;
  total_investment: number;
}

const SortToggle: React.FC<SortToggleProps> = ({ sortOrder, onToggle }) => {
  return (
    <div className="flex items-center">
      <span className="mr-2 text-sm font-medium text-gray-700">
        Showing {sortOrder === 'highest' ? 'Best' : 'Worst'} Performers
      </span>
      <button 
        onClick={onToggle}
        className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 bg-primary-600"
        role="switch"
        aria-checked={sortOrder === 'lowest'}
      >
        <span 
          className={`${sortOrder === 'lowest' ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
        />
      </button>
    </div>
  );
};

const Reporting: React.FC = () => {
  const { api } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'accounts' | 'portfolios'>('overview');
  const [companyFUM, setCompanyFUM] = useState<number>(0);
  const [companyIRR, setCompanyIRR] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<'highest' | 'lowest'>('highest');
  const [limit] = useState<number>(5);
  const [portfolioGroups, setPortfolioGroups] = useState<PortfolioGroup[]>([]);
  const [clientRisks, setClientRisks] = useState<ClientRisk[]>([]);
  const [isRiskLoading, setIsRiskLoading] = useState(true);

  useEffect(() => {
    fetchReportingData();
  }, [activeTab, sortOrder, api]);

  useEffect(() => {
    const fetchClientRisks = async () => {
      try {
        setIsRiskLoading(true);
        console.log("Fetching client risks data...");
        const response = await api.get('/analytics/client_risks');
        setClientRisks(response.data);
        setIsRiskLoading(false);
      } catch (err: any) {
        console.error('Error fetching client risks:', err);
        setIsRiskLoading(false);
      }
    };

    fetchClientRisks();
  }, []);

  const fetchReportingData = async () => {
    try {
      setIsLoading(true);
      console.log(`Fetching performance data for ${activeTab} tab...`);
      
      // Fetch performance data from the API, always using 'all-time'
      const response = await api.get('/analytics/performance_data', {
        params: {
          date_range: 'all-time', // Always use 'all-time'
          entity_type: activeTab,
          sort_order: sortOrder,
          limit: limit
        }
      });
      
      console.log("Performance data received");
      
      // Set company-wide data with fallbacks
      setCompanyFUM(response.data?.companyFUM || 0);
      setCompanyIRR(response.data?.companyIRR || 0);
      
      // Set performance data with fallback
      setPerformanceData(response.data?.performanceData || []);
      
      // Set portfolio groups data if available
      if (response.data?.portfolioGroups) {
        setPortfolioGroups(response.data.portfolioGroups);
      } else {
        setPortfolioGroups([]);
      }
      
      setError(null);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch reporting data');
      console.error('Error fetching reporting data:', err);
      setIsLoading(false);
    }
  };

  // Handle toggle between highest/lowest sorting
  const handleSortToggle = () => {
    setSortOrder(prevOrder => prevOrder === 'highest' ? 'lowest' : 'highest');
  };

  // Format currency with commas and 2 decimal places
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage with 1 decimal place
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold text-primary-800">Analytics</h1>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
          <div className="bg-primary-700 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Total Funds Under Management</h2>
          </div>
          <div className="px-6 py-6">
            <p className="text-4xl font-bold text-primary-800">{formatCurrency(companyFUM)}</p>
            <p className="text-sm text-gray-500 mt-2">Total funds under management</p>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
          <div className="bg-primary-700 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Average Internal Rate of Return</h2>
          </div>
          <div className="px-6 py-6">
            <p className={`text-4xl font-bold ${companyIRR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(companyIRR)}
              <span className="ml-2">
                {companyIRR >= 0 ? '▲' : '▼'}
              </span>
            </p>
            <p className="text-sm text-gray-500 mt-2">Internal rate of return (All Time)</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-primary-700 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors duration-200`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`${
              activeTab === 'clients'
                ? 'border-primary-700 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors duration-200`}
          >
            Clients
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`${
              activeTab === 'accounts'
                ? 'border-primary-700 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors duration-200`}
          >
            Accounts
          </button>
          <button
            onClick={() => setActiveTab('portfolios')}
            className={`${
              activeTab === 'portfolios'
                ? 'border-primary-700 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors duration-200`}
          >
            Portfolios
          </button>
        </nav>
      </div>

      {/* Performance Table */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-primary-800 capitalize">
            {activeTab === 'overview' ? 'Performance Overview' : `${activeTab} Performance`}
          </h2>
          <SortToggle sortOrder={sortOrder} onToggle={handleSortToggle} />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-600 text-center py-4">{error}</div>
        ) : performanceData.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No performance data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider w-10">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  {activeTab === 'overview' && (
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                  )}
                  {activeTab === 'clients' && (
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Advisor
                    </th>
                  )}
                  {activeTab === 'portfolios' && (
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Portfolio Count
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                    FUM
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                    IRR
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performanceData.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`${activeTab === 'portfolios' && !item.is_template ? 'bg-gray-50' : ''} ${index < 5 ? "hover:bg-gray-50" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-semibold text-gray-800">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-base font-medium text-gray-900">{item.name}</div>
                        {activeTab === 'portfolios' && !item.is_template && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Custom
                          </span>
                        )}
                      </div>
                    </td>
                    {activeTab === 'overview' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base text-gray-900 capitalize">{item.type}</div>
                      </td>
                    )}
                    {activeTab === 'clients' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base text-gray-900">{item.advisor || 'N/A'}</div>
                      </td>
                    )}
                    {activeTab === 'portfolios' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {item.portfolio_count || 0} portfolios
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-gray-900">{formatDate(item.startDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-gray-900">{formatCurrency(item.fum)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-base font-medium ${item.irr >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                        {formatPercentage(item.irr)}
                        <span className="ml-1">
                          {item.irr >= 0 ? '▲' : '▼'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Additional Analytics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-primary-800 mb-4">Performance Distribution</h2>
          <div className="text-center py-8 text-gray-500">
            <p>Performance distribution chart would be displayed here.</p>
            <p className="mt-2 text-sm">This would show the distribution of IRR across the selected entity type.</p>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-primary-800 mb-4">Historical Performance</h2>
          <div className="text-center py-8 text-gray-500">
            <p>Historical performance chart would be displayed here.</p>
            <p className="mt-2 text-sm">This would show performance trends over time for the selected entity type.</p>
          </div>
        </div>
      </div>

      {/* Portfolio Group Summary (only shown when viewing portfolios) */}
      {activeTab === 'portfolios' && portfolioGroups.length > 0 && (
        <div className="mt-8 bg-white shadow-md rounded-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-primary-800 mb-4">Portfolio Template Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolioGroups.map(group => (
              <div 
                key={group.name} 
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  group.is_template ? 'border-l-4 border-primary-500' : 'border-l-4 border-gray-400'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-lg mb-0 text-primary-800">{group.name}</h3>
                  {!group.is_template && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Custom
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <p className="text-gray-500 text-sm">Average IRR</p>
                    <p className={`font-bold text-xl ${group.avgIrr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(group.avgIrr)}
                      <span className="ml-1 text-sm">
                        {group.avgIrr >= 0 ? '▲' : '▼'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Total FUM</p>
                    <p className="font-bold text-xl text-primary-800">{formatCurrency(group.totalFum)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Portfolio Count</p>
                    <p className="font-bold text-xl text-primary-800">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-800">
                        {group.count}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Best Performer</p>
                    <p className="font-bold text-xl text-green-600">
                      {formatPercentage(group.bestIrr)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="mt-8 bg-white shadow-md rounded-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-primary-800 mb-4">Export Options</h2>
        <div className="flex flex-wrap gap-4">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <svg className="h-5 w-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to PDF
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <svg className="h-5 w-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <svg className="h-5 w-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Schedule Report
          </button>
        </div>
      </div>

      {/* Client Risk Analysis Section */}
      <div className="mt-8 bg-white shadow-md rounded-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-primary-800 mb-4">Client Risk Analysis</h2>
        {isRiskLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : clientRisks.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No risk data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                    Total Investment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientRisks.map((client) => (
                  <tr key={client.client_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base font-medium text-primary-800">{client.client_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`text-base font-medium ${
                          client.risk_score >= 5 ? 'text-red-600' : 
                          client.risk_score >= 3 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>
                          {client.risk_score.toFixed(2)}
                        </div>
                        <div className="ml-2 text-sm text-gray-500">
                          {client.risk_score >= 5 ? 'High Risk' : 
                           client.risk_score >= 3 ? 'Medium Risk' : 
                           'Low Risk'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-gray-900">{formatCurrency(client.total_investment)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reporting;