import React, { Suspense, useState } from 'react';
import { StatBox, FundDistributionChart, DataTable, StatBoxSkeleton, ChartSkeleton, TableSkeleton } from '../components/ui';
import useDashboardData from '../hooks/useDashboardData';

// Icons for the stats boxes
const CurrencyIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ClientsIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const AccountsIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const ProductsIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

// Icons for view toggle
const PieChartIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
  </svg>
);

const TableIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V10z" />
  </svg>
);

const ErrorMessage: React.FC<{ message: string; retry: () => void }> = ({ message, retry }) => (
  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <p className="text-red-700 text-base">{message}</p>
        <button 
          onClick={retry}
          className="mt-2 text-sm text-red-700 font-medium underline"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

type ViewMode = 'charts' | 'tables';

const Home: React.FC = () => {
  const { metrics, funds, providers, templates, loading, error, refetch } = useDashboardData();
  const [viewMode, setViewMode] = useState<ViewMode>('charts');

  return (
    <div className="w-full">
      {loading && !metrics ? (
        <div className="flex flex-col gap-6">
          {/* Stats grid - full width */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <StatBoxSkeleton key={i} />
              ))}
            </div>
          </div>
          
          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {/* Fund distribution chart */}
            <div>
              <ChartSkeleton />
            </div>
            
            {/* Provider distribution chart */}
            <div>
              <ChartSkeleton />
            </div>
            
            {/* Portfolio Template distribution chart */}
            <div>
              <ChartSkeleton />
            </div>
          </div>
        </div>
      ) : error ? (
        <ErrorMessage message={error.message} retry={refetch} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Stats grid - full width */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Funds Under Management */}
              <StatBox
                title="Total Funds Under Management"
                value={metrics?.totalFUM || 0}
                format="currency"
                changePercentage={null}
                icon={<CurrencyIcon />}
                colorScheme="primary"
              />
              
              {/* Company IRR */}
              <StatBox
                title="Company IRR"
                value={metrics?.companyIRR || 0}
                format="percentage"
                changePercentage={null}
                icon={<ChartIcon />}
                colorScheme="secondary"
              />
              
              {/* Total Client Groups */}
              <StatBox
                title="Total Client Groups"
                value={metrics?.totalClients || 0}
                format="number"
                changePercentage={null}
                icon={<ClientsIcon />}
                colorScheme="success"
              />
              
              {/* Total Products */}
              <StatBox
                title="Total Products"
                value={metrics?.totalAccounts || 0}
                format="number"
                changePercentage={null}
                icon={<ProductsIcon />}
                colorScheme="warning"
              />
            </div>
          </div>
          
          {/* View Toggle Button */}
          <div className="flex justify-between items-center mt-6">
            <h2 className="text-2xl font-bold text-gray-900">Portfolio Distribution</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">View as:</span>
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setViewMode('charts')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    viewMode === 'charts'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <PieChartIcon />
                  <span>Charts</span>
                </button>
                <button
                  onClick={() => setViewMode('tables')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    viewMode === 'tables'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <TableIcon />
                  <span>Tables</span>
                </button>
              </div>
            </div>
          </div>

          {/* Charts/Tables row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Fund distribution */}
            <div className="min-h-[500px]">
              {loading ? (
                viewMode === 'charts' ? <ChartSkeleton /> : <TableSkeleton />
              ) : viewMode === 'charts' ? (
                <Suspense fallback={<ChartSkeleton />}>
                  <FundDistributionChart
                    data={funds}
                    threshold={5}
                    title="Percentage of FUM in each Fund"
                  />
                </Suspense>
              ) : (
                <DataTable
                  data={funds}
                  title="FUM by Fund"
                />
              )}
            </div>
            
            {/* Provider distribution */}
            <div className="min-h-[500px]">
              {loading ? (
                viewMode === 'charts' ? <ChartSkeleton /> : <TableSkeleton />
              ) : viewMode === 'charts' ? (
                <Suspense fallback={<ChartSkeleton />}>
                  <FundDistributionChart
                    data={providers.map(provider => ({
                      id: provider.id,
                      name: provider.name,
                      amount: provider.amount
                    }))}
                    threshold={5}
                    title="Percentage of FUM by Provider"
                  />
                </Suspense>
              ) : (
                <DataTable
                  data={providers.map(provider => ({
                    id: provider.id,
                    name: provider.name,
                    amount: provider.amount
                  }))}
                  title="FUM by Provider"
                />
              )}
            </div>
            
            {/* Portfolio Template distribution */}
            <div className="min-h-[500px]">
              {loading ? (
                viewMode === 'charts' ? <ChartSkeleton /> : <TableSkeleton />
              ) : viewMode === 'charts' ? (
                <Suspense fallback={<ChartSkeleton />}>
                  <FundDistributionChart
                    data={templates.map(template => ({
                      id: template.id,
                      name: template.name,
                      amount: template.amount
                    }))}
                    threshold={5}
                    title="Percentage of FUM by Portfolio Template"
                  />
                </Suspense>
              ) : (
                <DataTable
                  data={templates.map(template => ({
                    id: template.id,
                    name: template.name,
                    amount: template.amount
                  }))}
                  title="FUM by Portfolio Template"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add a refresh button when we have data */}
      {!loading && metrics && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className={`
              flex items-center px-4 py-2 rounded-md text-sm font-medium
              bg-primary-50 text-primary-700 hover:bg-primary-100 
              transition-colors duration-200 focus:outline-none focus:ring-2 
              focus:ring-offset-2 focus:ring-primary-500
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <svg 
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            Refresh Data
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
