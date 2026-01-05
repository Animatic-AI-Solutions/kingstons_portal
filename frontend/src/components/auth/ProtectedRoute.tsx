import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Protected Route Component
 * 
 * Wraps protected routes and redirects unauthenticated users to the login page.
 * Preserves the originally requested URL for redirect after login.
 */
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while authentication state is being determined
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the current location for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  // Render the child routes
  return <Outlet />;
};

export default ProtectedRoute; 