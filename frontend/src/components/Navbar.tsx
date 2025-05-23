import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { ProfileAvatar } from './ui';

/**
 * Navbar Component
 * 
 * Primary navigation component that appears at the top of every page when logged in.
 * Provides access to main application sections and displays user information.
 * Conditionally renders navigation links based on authentication status.
 */
const Navbar: React.FC = () => {
  // Get authentication context data (user info and logout function)
  const { user, logout } = useAuth();
  // Hook for programmatic navigation
  const navigate = useNavigate();
  // Hook to access current route location
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close the profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Handles user logout
   * Calls the logout function from auth context and redirects to login page
   */
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /**
   * Determines if a navigation link should be highlighted as active
   * @param path - The path to check against current location
   * @returns boolean - True if the current path matches or is a sub-path
   */
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  /**
   * Handles the search form submission
   * @param e - The form submit event
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  // Using the dark purple from the color scheme as the primary color
  const activeNavLinkStyle = "border-b-2 border-primary-700 text-primary-700 font-medium";
  const inactiveNavLinkStyle = "border-b-2 border-transparent text-gray-700 hover:text-primary-700 hover:border-primary-300 transition-all duration-200";

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center mr-4">
              <Link to="/" className="flex items-center">
                <img
                  src="/images/Companylogo2.png"
                  alt="Kingston Logo"
                  className="h-8 mr-2"
                />
                <img
                  src="/images/Companyname1.png"
                  alt="Kingston"
                  className="h-6"
                />
              </Link>
            </div>
            
            {user && (
              <div className="hidden md:flex space-x-4 ml-2">
                <Link 
                  to="/" 
                  className={`px-2 py-6 text-sm ${isActive('/') ? activeNavLinkStyle : inactiveNavLinkStyle}`}
                >
                  Home
                </Link>
                <Link 
                  to="/client_groups" 
                  className={`px-2 py-6 text-sm ${isActive('/client_groups') ? activeNavLinkStyle : inactiveNavLinkStyle}`}
                >
                  Client Groups
                </Link>
                <Link 
                  to="/products" 
                  className={`px-2 py-6 text-sm ${isActive('/products') ? activeNavLinkStyle : inactiveNavLinkStyle}`}
                >
                  Products
                </Link>
                <Link 
                  to="/actions" 
                  className={`px-2 py-6 text-sm ${isActive('/actions') ? activeNavLinkStyle : inactiveNavLinkStyle}`}
                >
                  Actions
                </Link>
                <Link 
                  to="/definitions" 
                  className={`px-2 py-6 text-sm ${isActive('/definitions') ? activeNavLinkStyle : inactiveNavLinkStyle}`}
                >
                  Definitions
                </Link>
                <Link 
                  to="/reporting" 
                  className={`px-2 py-6 text-sm ${isActive('/reporting') ? activeNavLinkStyle : inactiveNavLinkStyle}`}
                >
                  Analytics
                </Link>
                <Link 
                  to="/report-generator" 
                  className={`px-2 py-6 text-sm ${isActive('/report-generator') ? activeNavLinkStyle : inactiveNavLinkStyle}`}
                >
                  Report
                </Link>
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center">
              <form onSubmit={handleSearch} className="relative mr-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 pl-8 pr-3 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 transition-colors text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <svg 
                      className="h-4 w-4 text-gray-400" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor" 
                      aria-hidden="true"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </div>
                </div>
              </form>
              
              {/* Profile Menu */}
              <div className="relative mr-2" ref={profileMenuRef}>
                <div>
                  <ProfileAvatar
                    imageUrl={user?.profile_picture_url || '/images/Companylogo2.png'}
                    size="sm"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    alt={`${user?.first_name || 'User'} profile`}
                  />
                </div>
                
                {showProfileMenu && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setShowProfileMenu(false);
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Profile Settings
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="bg-primary-700 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
