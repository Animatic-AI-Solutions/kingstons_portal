import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '../../services/api';
import { 
  MagnifyingGlassIcon,
  UsersIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  BriefcaseIcon,
  ChevronRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface SearchResult {
  entity_type: string;
  entity_id: number;
  name: string;
  description: string;
  additional_info: string;
}

/**
 * GlobalSearch Component
 * 
 * A search bar that allows users to search across all entities in the system
 * including client groups, products, funds, providers, and portfolios.
 * Follows Group 1 design system standards.
 */
const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await globalSearch(query.trim());
        setResults(response.data.results || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const getEntityIcon = (entityType: string) => {
    const iconProps = { className: "h-4 w-4 flex-shrink-0" };
    
    switch (entityType) {
      case 'client_group':
        return <UsersIcon {...iconProps} className="h-4 w-4 text-blue-600 flex-shrink-0" />;
      case 'product':
        return <CubeIcon {...iconProps} className="h-4 w-4 text-green-600 flex-shrink-0" />;
      case 'fund':
        return <ArrowTrendingUpIcon {...iconProps} className="h-4 w-4 text-purple-600 flex-shrink-0" />;
      case 'provider':
        return <BuildingOffice2Icon {...iconProps} className="h-4 w-4 text-orange-600 flex-shrink-0" />;
      case 'portfolio':
        return <BriefcaseIcon {...iconProps} className="h-4 w-4 text-indigo-600 flex-shrink-0" />;
      default:
        return <MagnifyingGlassIcon {...iconProps} className="h-4 w-4 text-gray-500 flex-shrink-0" />;
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    const labels = {
      client_group: 'Client',
      product: 'Product',
      fund: 'Fund',
      provider: 'Provider',
      portfolio: 'Portfolio'
    };
    return labels[entityType as keyof typeof labels] || entityType;
  };

  const getEntityTypeColor = (entityType: string) => {
    const colors = {
      client_group: 'bg-blue-50 text-blue-700 border-blue-200',
      product: 'bg-green-50 text-green-700 border-green-200',
      fund: 'bg-purple-50 text-purple-700 border-purple-200',
      provider: 'bg-orange-50 text-orange-700 border-orange-200',
      portfolio: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
    return colors[entityType as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const handleResultClick = (result: SearchResult) => {
    const routes = {
      client_group: `/client_groups/${result.entity_id}`,
      product: `/products/${result.entity_id}`,
      fund: `/definitions/funds/${result.entity_id}`,
      provider: `/definitions/providers/${result.entity_id}`,
      portfolio: `/definitions/portfolio-templates/${result.entity_id}`
    };

    const route = routes[result.entity_type as keyof typeof routes];
    if (route) {
      // For products, pass state information about coming from global search
      if (result.entity_type === 'product') {
        navigate(route, {
          state: {
            from: {
              pathname: window.location.pathname,
              label: 'Search Results'
            }
          }
        });
      } else {
        navigate(route);
      }
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.trim()})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 text-yellow-900 font-medium rounded px-0.5">
          {part}
        </span>
      ) : part
    );
  };

  // Loading icon
  const loadingIcon = (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input - Following Group 1 Design System */}
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <div className="h-4 w-4 text-gray-400">
            {isLoading ? loadingIcon : <MagnifyingGlassIcon className="h-4 w-4" />}
          </div>
        </div>
        
        {/* Input Field - Group 1 styling */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder="Search clients, products, funds..."
          className="block w-full h-10 px-3 py-2 pl-10 pr-10 text-sm border border-gray-300 rounded-md shadow-sm bg-white 
                     transition-all duration-150 ease-in-out 
                     focus:outline-none focus:ring-3 focus:ring-offset-2 focus:border-primary-700 focus:ring-primary-700/10
                     hover:border-gray-400"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="searchbox"
        />
        
        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-150"
            aria-label="Clear search"
          >
            <div className="h-4 w-4">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <ul role="listbox" className="py-1">
              {results.map((result, index) => (
                <li key={`${result.entity_type}-${result.entity_id}`} role="option" aria-selected={selectedIndex === index}>
                  <button
                    type="button"
                    onClick={() => handleResultClick(result)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 ${
                      selectedIndex === index ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        {/* Entity Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getEntityIcon(result.entity_type)}
                        </div>
                        
                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900 truncate">
                              {highlightMatch(result.name, query)}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getEntityTypeColor(result.entity_type)}`}>
                              {getEntityTypeLabel(result.entity_type)}
                            </span>
                          </div>
                          
                          {result.description && (
                            <p className="text-sm text-gray-600 truncate">
                              {highlightMatch(result.description, query)}
                            </p>
                          )}
                          
                          {result.additional_info && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {highlightMatch(result.additional_info, query)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow Icon */}
                      <div className="flex-shrink-0 ml-2">
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              <div className="flex items-center justify-center space-x-2">
                <MagnifyingGlassIcon className="h-4 w-4" />
                <span>No results found for "{query}"</span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch; 