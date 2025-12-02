import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Custom hook for navigation with data refresh capabilities
 * Provides methods to navigate to pages while ensuring fresh data is loaded
 */
export const useNavigationRefresh = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /**
   * Navigate to client groups page and refresh data
   * Useful for breadcrumbs and post-action navigation
   */
  const navigateToClientGroups = () => {
    queryClient.invalidateQueries({ queryKey: ['client-bulk-data'] });
    navigate('/client-groups');
  };

  /**
   * Navigate to any route and refresh specific query data
   * @param route - The route to navigate to
   * @param queryKeys - Array of query keys to invalidate
   */
  const navigateWithRefresh = (route: string, queryKeys: string[][] = []) => {
    // Invalidate specified queries
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
    navigate(route);
  };

  /**
   * Navigate to a route with a success message in state and refresh data
   * @param route - The route to navigate to
   * @param message - Success message to display
   * @param queryKeys - Array of query keys to invalidate
   */
  const navigateWithSuccessMessage = (
    route: string, 
    message: string, 
    queryKeys: string[][] = [['client-bulk-data']]
  ) => {
    // Invalidate specified queries to ensure fresh data
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
    
    navigate(route, { 
      state: { message } 
    });
  };

  /**
   * Refresh current page data without navigation
   * @param queryKeys - Array of query keys to invalidate
   */
  const refreshCurrentPageData = (queryKeys: string[][] = [['client-bulk-data']]) => {
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  };

  return {
    navigateToClientGroups,
    navigateWithRefresh,
    navigateWithSuccessMessage,
    refreshCurrentPageData,
    navigate // Regular navigate function for cases where no refresh is needed
  };
};

export default useNavigationRefresh; 