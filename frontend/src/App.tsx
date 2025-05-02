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

// Account Management Pages - For handling financial accounts
import Accounts from './pages/Accounts';
import OptimizedAccountDetails from './pages/OptimizedAccountDetails';

// Definitions Pages - System configuration and reference data management
import Definitions from './pages/Definitions';
import Providers from './pages/Providers';  // Investment providers
import Products from './pages/Products';    // Financial products offered
import Funds from './pages/Funds';          // Investment funds
import Portfolios from './pages/Portfolios'; // Portfolio management
import ProviderDetails from './pages/ProviderDetails';
import ProductDetails from './pages/ProductDetails';
import FundDetails from './pages/FundDetails';
import PortfolioDetails from './pages/PortfolioDetails';
import PortfolioTemplateDetails from './pages/PortfolioTemplateDetails';
import AddProvider from './pages/AddProvider';
import AddProduct from './pages/AddProduct';
import AddFund from './pages/AddFund';
import AddPortfolio from './pages/AddPortfolio';
import CreateClientAccounts from './pages/CreateClientAccounts';

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
          <Route path="/clients" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Clients />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/clients/add" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <AddClient />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/clients/:clientId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <ClientDetails />
              </div>
              <Footer />
            </>
          } />
          
          {/* Account Management Section - Managing financial accounts */}
          <Route path="/accounts" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Accounts />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/accounts/:accountId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <OptimizedAccountDetails />
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
          
          <Route path="/definitions/providers" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Providers />
              </div>
              <Footer />
            </>
          } />
          
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
          
          <Route path="/definitions/products" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Products />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/products/:productId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <ProductDetails />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/products/add" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <AddProduct />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/funds" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Funds />
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
          
          <Route path="/definitions/portfolios" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <Portfolios />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/portfolios/:portfolioId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <PortfolioDetails />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/portfolio-templates/:templateId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <PortfolioTemplateDetails />
              </div>
              <Footer />
            </>
          } />
          
          <Route path="/definitions/portfolios/add" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <AddPortfolio />
              </div>
              <Footer />
            </>
          } />
          
          {/* Client Account Management - Creating accounts for specific clients */}
          <Route path="/client-accounts/:clientId" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <CreateClientAccounts />
              </div>
              <Footer />
            </>
          } />
          
          {/* General account creation flow - Allows creating accounts without specific client context */}
          <Route path="/create-client-accounts" element={
            <>
              <Navbar />
              <div className="flex-grow pt-6 pb-12">
                <CreateClientAccounts />
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
