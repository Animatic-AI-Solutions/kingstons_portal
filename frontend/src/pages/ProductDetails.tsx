import React, { useEffect } from 'react';
import { useParams, useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import AccountOverview from './ProductOverview';
import AccountIRRCalculation from './ProductIRRCalculation';
import AccountIRRHistory from './ProductIRRHistory';

const ProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to overview by default
    if (window.location.pathname === `/products/${productId}`) {
      navigate(`/products/${productId}/overview`, { replace: true });
    }
  }, [productId, navigate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header with navigation tabs */}
      <div className="mb-6">
        <nav className="flex space-x-2 px-2 py-2 bg-gray-50 rounded-lg">
          <NavLink
            to={`/products/${productId}/overview`}
            className={({ isActive }: { isActive: boolean }) =>
              isActive
                ? 'bg-primary-700 text-white shadow-sm rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out'
            }
          >
            Overview
          </NavLink>
          <NavLink
            to={`/products/${productId}/irr-calculation`}
            className={({ isActive }: { isActive: boolean }) =>
              isActive
                ? 'bg-primary-700 text-white shadow-sm rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out'
            }
          >
            IRR Calculation
          </NavLink>
          <NavLink
            to={`/products/${productId}/irr-history`}
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
          element={<AccountOverview accountId={productId} />}
        />
        <Route
          path="irr-calculation"
          element={<AccountIRRCalculation accountId={productId} />}
        />
        <Route
          path="irr-history"
          element={<AccountIRRHistory accountId={productId} />}
        />
      </Routes>
    </div>
  );
};

export default ProductDetails;
