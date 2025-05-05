import React, { useEffect } from 'react';
import { useParams, useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import AccountOverview from './AccountOverview';
import AccountIRRCalculation from './AccountIRRCalculation';
import AccountIRRHistory from './AccountIRRHistory';

const AccountDetails: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  
  console.log('AccountDetails: accountId from useParams:', accountId);

  useEffect(() => {
    // Redirect to overview by default
    if (window.location.pathname === `/accounts/${accountId}`) {
      console.log('AccountDetails: Redirecting to overview tab');
      navigate(`/accounts/${accountId}/overview`, { replace: true });
    }
  }, [accountId, navigate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header with navigation tabs */}
      <div className="mb-6">
        <nav className="flex space-x-2 px-2 py-2 bg-gray-50 rounded-lg">
          <NavLink
            to={`/accounts/${accountId}/overview`}
            className={({ isActive }: { isActive: boolean }) =>
              isActive
                ? 'bg-primary-700 text-white shadow-sm rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out'
            }
          >
            Overview
          </NavLink>
          <NavLink
            to={`/accounts/${accountId}/irr-calculation`}
            className={({ isActive }: { isActive: boolean }) =>
              isActive
                ? 'bg-primary-700 text-white shadow-sm rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out'
            }
          >
            IRR Calculation
          </NavLink>
          <NavLink
            to={`/accounts/${accountId}/irr-history`}
            className={({ isActive }: { isActive: boolean }) =>
              isActive
                ? 'bg-primary-700 text-white shadow-sm rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out'
            }
          >
            IRR History
          </NavLink>
        </nav>
      </div>

      {/* Routes for each tab */}
      <Routes>
        <Route
          path="overview"
          element={
            <>
              {console.log('AccountDetails: Rendering AccountOverview with accountId:', accountId)}
              <AccountOverview accountId={accountId} />
            </>
          }
        />
        <Route
          path="irr-calculation"
          element={
            <>
              {console.log('AccountDetails: Rendering AccountIRRCalculation with accountId:', accountId)}
              <AccountIRRCalculation accountId={accountId} />
            </>
          }
        />
        <Route
          path="irr-history"
          element={
            <>
              {console.log('AccountDetails: Rendering AccountIRRHistory with accountId:', accountId)}
              <AccountIRRHistory accountId={accountId} />
            </>
          }
        />
      </Routes>
    </div>
  );
};

export default AccountDetails;
