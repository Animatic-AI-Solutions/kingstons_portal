import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccountOverview from './ProductOverview';
import AccountIRRCalculation from './ProductIRRCalculation';
import AccountIRRHistory from './ProductIRRHistory';

interface Account {
  id: number;
  product_name: string;
  client_name?: string;
}

const ProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { api } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [breadcrumbTrail, setBreadcrumbTrail] = useState<Array<{path: string; label: string}>>([]);
  
  // Build the complete breadcrumb trail
  const buildBreadcrumbTrail = () => {
    const trail: Array<{path: string; label: string}> = [];
    
    // Check if we have state from the previous navigation
    if (location.state?.from) {
      const fromPath = location.state.from.pathname;
      const fromLabel = location.state.from.label || 'Back';
      
      // Build trail based on the previous page
      if (fromPath.startsWith('/client_groups/')) {
        // Coming from client details page
        trail.push({ path: '/client_groups', label: 'Client Groups' });
        trail.push({ path: fromPath, label: fromLabel });
      } else if (fromPath.startsWith('/portfolios/')) {
        // Coming from portfolio details page  
        trail.push({ path: '/definitions/portfolio-templates', label: 'Portfolio Templates' });
        trail.push({ path: fromPath, label: fromLabel });
      } else if (fromPath.startsWith('/definitions/providers/')) {
        // Coming from provider details page
        trail.push({ path: '/definitions/providers', label: 'Providers' });
        trail.push({ path: fromPath, label: fromLabel });
      } else if (fromPath === '/products') {
        // Coming from products page
        trail.push({ path: '/products', label: 'Products' });
      } else if (fromPath === '/') {
        // Coming from dashboard
        trail.push({ path: '/', label: 'Dashboard' });
      } else {
        // Default case
        trail.push({ path: fromPath, label: fromLabel });
      }
      
      return trail;
    }
    
    // Check URL parameters for previous page info
    const searchParams = new URLSearchParams(location.search);
    const fromParam = searchParams.get('from');
    const clientId = searchParams.get('clientId');
    const clientName = searchParams.get('clientName');
    const portfolioId = searchParams.get('portfolioId');
    const portfolioName = searchParams.get('portfolioName');
    
    if (fromParam === 'client-details' && clientId) {
      trail.push({ path: '/client_groups', label: 'Client Groups' });
      trail.push({ 
        path: `/client_groups/${clientId}`, 
        label: clientName ? decodeURIComponent(clientName) : 'Client Details' 
      });
      return trail;
    }
    
    if (fromParam === 'portfolio-details' && portfolioId) {
      trail.push({ path: '/definitions/portfolio-templates', label: 'Portfolio Templates' });
      trail.push({ 
        path: `/portfolios/${portfolioId}`, 
        label: portfolioName ? decodeURIComponent(portfolioName) : 'Portfolio Details' 
      });
      return trail;
    }
    
    // Default fallback - determine based on current URL structure
    const currentPath = location.pathname;
    if (currentPath.includes('/client_groups/')) {
      // If we came from a client details page
      const clientIdFromPath = currentPath.split('/client_groups/')[1]?.split('/')[0];
      trail.push({ path: '/client_groups', label: 'Client Groups' });
      trail.push({ path: `/client_groups/${clientIdFromPath}`, label: 'Client Details' });
      return trail;
    }
    
    // Default to products page
    trail.push({ path: '/products', label: 'Products' });
    return trail;
  };
  
  // Set breadcrumb trail once when component mounts
  useEffect(() => {
    const trail = buildBreadcrumbTrail();
    setBreadcrumbTrail(trail);
  }, []); // Empty dependency array - only run once on mount
  
  useEffect(() => {
    // Redirect to overview by default, preserving any query parameters
    if (window.location.pathname === `/products/${productId}`) {
      navigate(`/products/${productId}/overview${location.search}`, { replace: true });
    }
  }, [productId, navigate, location.search]);

  // Fetch product data for the title
  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId) return;
      
      try {
        setIsLoading(true);
        const response = await api.get(`/api/client_products/${productId}/complete`);
        setAccount(response.data);
      } catch (err) {
        console.error('Error fetching product data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchProductData();
    }
  }, [productId, api]);

  return (
    <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-3">
      {/* Breadcrumbs */}
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          {breadcrumbTrail.map((item, index) => (
            <li key={item.path} className="inline-flex items-center">
              <Link to={item.path} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700">
                {index === 0 && (
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                  </svg>
                )}
                {item.label}
              </Link>
              {index < breadcrumbTrail.length - 1 && (
                <svg className="w-6 h-6 text-gray-400 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
              )}
            </li>
          ))}
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">Product Details</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Product Title */}
      <div className="mb-6">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-9 bg-gray-200 rounded w-1/3"></div>
          </div>
        ) : account ? (
          <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">
            {account.product_name}
          </h1>
        ) : (
          <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">
            Product Details
          </h1>
        )}
      </div>

      {/* Header with navigation tabs */}
      <div className="mb-6">
        <nav className="flex space-x-2 px-2 py-2 bg-gray-50 rounded-lg">
          <NavLink
            to={`/products/${productId}/overview${location.search}`}
            className={({ isActive }: { isActive: boolean }) =>
              isActive
                ? 'bg-primary-700 text-white shadow-sm rounded-lg px-2 py-2 font-medium text-base transition-all duration-200 ease-in-out'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg px-2 py-2 font-medium text-base transition-all duration-200 ease-in-out'
            }
          >
            Overview
          </NavLink>
          <NavLink
            to={`/products/${productId}/irr-calculation${location.search}`}
            className={({ isActive }: { isActive: boolean }) =>
              isActive
                ? 'bg-primary-700 text-white shadow-sm rounded-lg px-2 py-2 font-medium text-base transition-all duration-200 ease-in-out'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg px-2 py-2 font-medium text-base transition-all duration-200 ease-in-out'
            }
          >
            IRR Calculation
          </NavLink>
          <NavLink
            to={`/products/${productId}/irr-history${location.search}`}
            className={({ isActive }: { isActive: boolean }) =>
              isActive
                ? 'bg-primary-700 text-white shadow-sm rounded-lg px-2 py-2 font-medium text-base transition-all duration-200 ease-in-out'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg px-2 py-2 font-medium text-base transition-all duration-200 ease-in-out'
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
