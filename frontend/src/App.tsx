import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Pages - Main site pages
import Home from './pages/Home';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import Profile from './pages/Profile';

// Auth Components - User authentication related components
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
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

// Definitions Pages - System configuration and reference data management
import Definitions from './pages/Definitions';
import Providers from './pages/Providers';  // Investment providers
import Funds from './pages/Funds';          // Investment funds
import Portfolios from './pages/Portfolios'; // Portfolio management
import ProviderDetails from './pages/ProviderDetails';
import FundDetails from './pages/FundDetails';
import PortfolioDetails from './pages/PortfolioDetails';
import PortfolioTemplateDetails from './pages/PortfolioTemplateDetails';
import AddProvider from './pages/AddProvider';
import AddFund from './pages/AddFund';
import AddPortfolioTemplate from './pages/AddPortfolioTemplate';
import CreateClientProducts from './pages/CreateClientProducts';

// Reporting Pages - Analytics and performance reporting
import Reporting from './pages/Reporting';

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
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Routes>
        {/* Authentication Routes - Public routes for user authentication */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/forgot-password" element={<ResetPasswordForm />} />
        <Route path="/reset-password" element={<SetNewPasswordForm />} />
        
        {/* Legal Pages - Public access to terms and conditions */}
        <Route path="/terms" element={
          <>
            <Navbar />
            <div className="flex-grow">
              <Terms />
            </div>
            <Footer />
          </>
        } />
        <Route path="/cookies" element={
          <>
            <Navbar />
            <div className="flex-grow">
              <Cookies />
            </div>
            <Footer />
          </>
        } />
        
        {/* Protected Routes - Require authentication to access */}
        <Route element={<ProtectedRoute />}>
          {/* Home */}
          <Route path="/" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Home />
              </div>
              <Footer />
            </>
          } />
          
          {/* Profile Page */}
          <Route path="/profile" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Profile />
              </div>
              <Footer />
            </>
          } />
          
          {/* Client Management Section - CRUD operations for clients */}
          <Route path="/client_groups" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Clients />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/client_groups/add" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <AddClient />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/client_groups/:clientId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <ClientDetails />
              </div>
              <Footer />
            </>
          } />
          
          {/* Product Management Section - Managing client products */}
          <Route path="/products" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Products />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/products/:productId/*" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <ProductDetails />
              </div>
              <Footer />
            </>
          } />
          
          {/* Definitions Section - System setup and configuration */}
          <Route path="/definitions" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Definitions />
              </div>
              <Footer />
            </>
          } />
          
          {/* Redirect routes for unified definitions page */}
          <Route path="/definitions/providers" element={<Navigate to="/definitions?tab=providers" replace />} />
          <Route path="/definitions/funds" element={<Navigate to="/definitions?tab=funds" replace />} />
          <Route path="/definitions/portfolio-templates" element={<Navigate to="/definitions?tab=portfolios" replace />} />
          
          <Route path="/definitions/providers/:providerId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <ProviderDetails />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/providers/add" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <AddProvider />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/funds/:fundId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <FundDetails />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/funds/add" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <AddFund />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/portfolio-templates/:portfolioId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <PortfolioTemplateDetails />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/portfolio-templates/add" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <AddPortfolioTemplate />
              </div>
              <Footer />
            </>
          } />
          
          {/* Client Account Management - Creating accounts for specific client groups */}
          <Route path="/client-group-products/:clientId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <CreateClientProducts />
              </div>
              <Footer />
            </>
          } />
          
          {/* General account creation flow - Allows creating accounts without specific client group context */}
          <Route path="/create-client-group-products" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <CreateClientProducts />
              </div>
              <Footer />
            </>
          } />
          
          {/* Reporting Section - Financial performance analytics and reporting */}
          <Route path="/reporting" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Reporting />
              </div>
              <Footer />
            </>
          } />
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
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
