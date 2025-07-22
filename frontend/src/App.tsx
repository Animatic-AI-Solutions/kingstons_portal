import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Pages - Main site pages
import Home from './pages/Home';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import Profile from './pages/Profile';
import ReportGenerator from './pages/ReportGenerator';
import ReportDisplayPage from './pages/ReportDisplayPage';

// Auth Components - User authentication related components
import LoginForm from './components/auth/LoginForm';
import ResetPasswordForm from './components/auth/ResetPasswordForm';
import SetNewPasswordForm from './components/auth/SetNewPasswordForm';
import ProtectedRoute from './components/ProtectedRoute';

// Client Management Pages - Handling wealth management client data
import Clients from './pages/Clients';
import AddClient from './pages/AddClient';
import ClientDetails from './pages/ClientDetails';

// Product Management Pages - For handling financial products
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import ProductOwners from './pages/ProductOwners';
import ProductOwnerDetails from './pages/ProductOwnerDetails';

// Definitions Pages - System configuration and reference data management
import Funds from './pages/Funds';
import Providers from './pages/Providers';
import PortfolioTemplates from './pages/PortfolioTemplates';
import PortfolioTemplatesWithTabs from './pages/PortfolioTemplatesWithTabs';
import ProviderDetails from './pages/ProviderDetails';
import FundDetails from './pages/FundDetails';
import PortfolioDetails from './pages/PortfolioDetails';
import PortfolioTemplateDetails from './pages/PortfolioTemplateDetails';
import AddProvider from './pages/AddProvider';
import AddFund from './pages/AddFund';
import AddPortfolioTemplate from './pages/AddPortfolioTemplate';
import AddPortfolioGeneration from './pages/AddPortfolioGeneration';
import EditPortfolioGeneration from './pages/EditPortfolioGeneration';
import CreateClientProducts from './pages/CreateClientProducts';

// Reporting Pages - Analytics and performance reporting
import Reporting from './pages/Reporting';
import Analytics from './pages/Analytics';
import Revenue from './pages/Revenue';

// Component Testing Page - UI/UX design finalization
import Components from './pages/Components';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes by default
    },
  },
});

/**
 * Main App content component
 * Defines all application routes and wraps them with appropriate layout components
 * Routes are organized into authentication, legal pages, and protected application routes
 */
const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen w-full">
      <Routes>
        {/* Authentication Routes - Public routes for user authentication */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/forgot-password" element={<ResetPasswordForm />} />
        <Route path="/reset-password" element={<SetNewPasswordForm />} />
        
        {/* Legal Pages - Public access to terms and conditions */}
        <Route path="/terms" element={<AppLayout><Terms /></AppLayout>} />
        <Route path="/cookies" element={<AppLayout><Cookies /></AppLayout>} />
        
        {/* Protected Routes - Require authentication to access */}
        <Route element={<ProtectedRoute />}>
          {/* Home */}
          <Route path="/" element={<AppLayout><Home /></AppLayout>} />
          
          {/* Profile Page */}
          <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
          
          {/* Client Management Section - CRUD operations for clients */}
          <Route path="/client_groups" element={<AppLayout><Clients /></AppLayout>} />
          <Route path="/client_groups/add" element={<AppLayout><AddClient /></AppLayout>} />
          <Route path="/client_groups/:clientId" element={<AppLayout><ClientDetails /></AppLayout>} />
          
          {/* Product Management Section - Managing client products */}
          <Route path="/products" element={<AppLayout><Products /></AppLayout>} />
          <Route path="/products/:productId/*" element={<AppLayout><ProductDetails /></AppLayout>} />
          <Route path="/product_owners" element={<AppLayout><ProductOwners /></AppLayout>} />
          <Route path="/product_owners/:productOwnerId" element={<AppLayout><ProductOwnerDetails /></AppLayout>} />
          
          {/* Definitions Section - System setup and configuration */}
          {/* Separate definition pages */}
          <Route path="/definitions/funds" element={<AppLayout><Funds /></AppLayout>} />
          <Route path="/definitions/providers" element={<AppLayout><Providers /></AppLayout>} />
          <Route path="/definitions/portfolio-templates" element={<AppLayout><PortfolioTemplatesWithTabs /></AppLayout>} />
          
          {/* Legacy unified definitions page (redirect to funds by default) */}
          <Route path="/definitions" element={<Navigate to="/definitions/funds" replace />} />
          
          {/* Redirect routes for backward compatibility */}
          <Route path="/definitions/templates" element={<Navigate to="/definitions/portfolio-templates" replace />} />
          
          <Route path="/definitions/providers/:providerId" element={<AppLayout><ProviderDetails /></AppLayout>} />
          <Route path="/definitions/providers/add" element={<AppLayout><AddProvider /></AppLayout>} />
          <Route path="/definitions/funds/:fundId" element={<AppLayout><FundDetails /></AppLayout>} />
          <Route path="/definitions/funds/add" element={<AppLayout><AddFund /></AppLayout>} />
          <Route path="/definitions/portfolio-templates/:portfolioId" element={<AppLayout><PortfolioTemplateDetails /></AppLayout>} />
          <Route path="/definitions/portfolio-templates/add" element={<AppLayout><AddPortfolioTemplate /></AppLayout>} />
          <Route path="/definitions/templates/:portfolioId" element={<AppLayout><PortfolioTemplateDetails /></AppLayout>} />
          <Route path="/definitions/templates/add" element={<AppLayout><AddPortfolioTemplate /></AppLayout>} />
          <Route path="/add-generation/:portfolioId" element={<AppLayout><AddPortfolioGeneration /></AppLayout>} />
          <Route path="/edit-generation/:portfolioId/:generationId" element={<AppLayout><EditPortfolioGeneration /></AppLayout>} />
          
          {/* Add individual routes for generations */}
          <Route path="/definitions/portfolio-generations/:generationId" element={<AppLayout><div>Generation Details Component</div></AppLayout>} />
          <Route path="/definitions/portfolio-generations/add" element={<AppLayout><div>Add Generation Component</div></AppLayout>} />
          
          {/* Client Account Management - Creating accounts for specific client groups */}
          <Route path="/client-group-products/:clientId" element={<AppLayout><CreateClientProducts /></AppLayout>} />
          <Route path="/create-client-group-products" element={<AppLayout><CreateClientProducts /></AppLayout>} />
          
          {/* Reporting Section - Financial performance analytics and reporting */}
          <Route path="/analytics" element={<AppLayout><Analytics /></AppLayout>} />
          <Route path="/revenue" element={<AppLayout><Revenue /></AppLayout>} />
          <Route path="/report-generator" element={<AppLayout><ReportGenerator /></AppLayout>} />
          <Route path="/report-display" element={<AppLayout><ReportDisplayPage /></AppLayout>} />
          
          {/* Component Testing - UI/UX design finalization */}
          <Route path="/components" element={<AppLayout><Components /></AppLayout>} />
        </Route>
        
        {/* Default route - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
};

/**
 * Main App component
 * Wraps the entire application with necessary providers
 */
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
