import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationContext {
  from?: string;
  clientId?: string;
  clientName?: string;
  portfolioId?: string;
  portfolioName?: string;
  state?: any;
}

interface BackDestination {
  path: string;
  state?: any;
}

/**
 * Custom hook for smart breadcrumb-aware navigation
 * Determines the appropriate back destination based on navigation context
 */
export const useSmartNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Parse navigation context from URL parameters and location state
   */
  const getNavigationContext = (): NavigationContext => {
    const searchParams = new URLSearchParams(location.search);
    
    return {
      // URL parameters (used by ClientDetails navigation)
      from: searchParams.get('from') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      clientName: searchParams.get('clientName') || undefined,
      portfolioId: searchParams.get('portfolioId') || undefined,
      portfolioName: searchParams.get('portfolioName') || undefined,
      
      // Location state (used by Products navigation)
      state: location.state || undefined
    };
  };

  /**
   * Determine the appropriate back destination based on navigation context
   */
  const determineBackDestination = (context: NavigationContext, fallbackClientId?: number): BackDestination => {
    // Priority 1: URL parameter navigation (from ClientDetails)
    if (context.from === 'client-details' && context.clientId) {
      return {
        path: `/client-groups/${context.clientId}`,
        state: undefined
      };
    }

    // Priority 2: Portfolio details navigation
    if (context.from === 'portfolio-details' && context.portfolioId) {
      return {
        path: `/portfolios/${context.portfolioId}`,
        state: undefined
      };
    }

    // Priority 3: Location state navigation (from Products page)
    if (context.state?.from && typeof context.state.from === 'object') {
      const fromState = context.state.from;
      if (fromState.pathname === '/products') {
        return {
          path: '/products',
          state: undefined
        };
      }
      
      // Handle other state-based navigation
      if (fromState.pathname) {
        return {
          path: fromState.pathname,
          state: undefined
        };
      }
    }

    // Priority 4: Breadcrumb array from location state (similar to ProductDetails pattern)
    if (context.state?.breadcrumb && Array.isArray(context.state.breadcrumb)) {
      const breadcrumbs = context.state.breadcrumb;
      if (breadcrumbs.length > 0) {
        const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
        return {
          path: lastBreadcrumb.path,
          state: undefined
        };
      }
    }

    // Priority 5: Fallback to client group if client ID is available
    if (fallbackClientId) {
      return {
        path: `/client-groups/${fallbackClientId}`,
        state: undefined
      };
    }

    // Priority 6: Default fallback to products page
    return {
      path: '/products',
      state: undefined
    };
  };

  /**
   * Navigate back to the appropriate destination with optional notification
   */
  const navigateBack = (notification?: { type: string; message: string }, fallbackClientId?: number) => {
    const context = getNavigationContext();
    const destination = determineBackDestination(context, fallbackClientId);
    
    const navigationState = notification ? {
      ...destination.state,
      notification
    } : destination.state;

    navigate(destination.path, { 
      state: navigationState 
    });
  };

  /**
   * Get breadcrumb trail for display (similar to ProductDetails pattern)
   */
  const getBreadcrumbTrail = (currentItemName?: string): Array<{path: string; label: string}> => {
    const context = getNavigationContext();
    const trail: Array<{path: string; label: string}> = [];

    // Build breadcrumb trail based on navigation context
    if (context.from === 'client-details' && context.clientId) {
      trail.push({ path: '/client-groups', label: 'Client Groups' });
      trail.push({ 
        path: `/client-groups/${context.clientId}`, 
        label: context.clientName ? decodeURIComponent(context.clientName) : 'Client Details' 
      });
    } else if (context.from === 'portfolio-details' && context.portfolioId) {
      trail.push({ path: '/definitions/portfolio-templates', label: 'Portfolio Templates' });
      trail.push({ 
        path: `/portfolios/${context.portfolioId}`, 
        label: context.portfolioName ? decodeURIComponent(context.portfolioName) : 'Portfolio Details' 
      });
    } else if (context.state?.from?.pathname === '/products') {
      trail.push({ path: '/products', label: 'Products' });
    } else if (context.state?.breadcrumb && Array.isArray(context.state.breadcrumb)) {
      // Use provided breadcrumb trail
      return context.state.breadcrumb.map((item: any) => ({
        path: item.path,
        label: item.name || item.label
      }));
    } else {
      // Default breadcrumb
      trail.push({ path: '/products', label: 'Products' });
    }

    return trail;
  };

  return {
    getNavigationContext,
    determineBackDestination,
    navigateBack,
    getBreadcrumbTrail
  };
};

export default useSmartNavigation; 