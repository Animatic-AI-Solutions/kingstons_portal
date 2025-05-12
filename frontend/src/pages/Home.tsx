import React, { Suspense } from 'react';
import { StatBox, FundDistributionChart, StatBoxSkeleton, ChartSkeleton } from '../components/ui';
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

const Home: React.FC = () => {
  const { metrics, funds, loading, error, refetch } = useDashboardData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {loading && !metrics ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Stats grid - 2/3 width */}
          <div className="lg:w-2/3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <StatBoxSkeleton key={i} />
              ))}
            </div>
          </div>
          
          {/* Pie chart - 1/3 width */}
          <div className="lg:w-1/3 mt-6 lg:mt-0">
            <ChartSkeleton />
          </div>
        </div>
      ) : error ? (
        <ErrorMessage message={error.message} retry={refetch} />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Stats grid - 2/3 width */}
          <div className="lg:w-2/3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              
              {/* Total Clients */}
              <StatBox
                title="Total Clients"
                value={metrics?.totalClients || 0}
                format="number"
                changePercentage={null}
                icon={<ClientsIcon />}
                colorScheme="success"
              />
              
              {/* Total Accounts */}
              <StatBox
                title="Total Accounts"
                value={metrics?.totalAccounts || 0}
                format="number"
                changePercentage={null}
                icon={<AccountsIcon />}
                colorScheme="warning"
              />
            </div>
          </div>
          
          {/* Pie chart - 1/3 width */}
          <div className="lg:w-1/3 mt-6 lg:mt-0">
            <Suspense fallback={<ChartSkeleton />}>
              <FundDistributionChart
                data={funds}
                threshold={5}
                title="Percentage of FUM in each Fund"
              />
            </Suspense>
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
              focus:ring-offset-2 focus:ring-primary-700
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
