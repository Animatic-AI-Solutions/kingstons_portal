import React from 'react';
import TopBar from '../TopBar';
import Sidebar from '../Sidebar';
import Footer from '../Footer';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * AppLayout Component
 * 
 * Provides consistent layout structure with top bar, sidebar and footer for all protected pages.
 * Handles the responsive spacing and layout positioning.
 * The sidebar is now minimized by default (64px) and expands on hover (256px).
 * The top bar is fixed at the top with higher z-index than the sidebar.
 */
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 w-full">
      {/* Top Bar - fixed at top */}
      <TopBar />
      
      {/* Main layout with sidebar and content */}
      <div className="flex flex-1 pt-8">
        <Sidebar />
        {/* Main content area with fixed margin for 64px minimized sidebar */}
        <div className="flex-1 ml-16 flex flex-col min-w-0 w-full">
          <main className="flex-grow p-1 sm:p-2 w-full">
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default AppLayout; 