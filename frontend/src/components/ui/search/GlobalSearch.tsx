import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '../../../services/api';
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

  // Close dropdown when clicking outside - improved reliability
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    if (isOpen) {
      // Use capture phase to ensure this fires before other handlers
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

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
        return <UsersIcon {...iconProps} className="h-4 w-4 text-blue-500 flex-shrink-0" />;
      case 'product':
        return <CubeIcon {...iconProps} className="h-4 w-4 text-green-500 flex-shrink-0" />;
      case 'fund':
        return <ArrowTrendingUpIcon {...iconProps} className="h-4 w-4 text-purple-500 flex-shrink-0" />;
      case 'provider':
        return <BuildingOffice2Icon {...iconProps} className="h-4 w-4 text-orange-500 flex-shrink-0" />;
      case 'portfolio':
        return <BriefcaseIcon {...iconProps} className="h-4 w-4 text-indigo-500 flex-shrink-0" />;
      default:
        return <MagnifyingGlassIcon {...iconProps} className="h-4 w-4 text-gray-400 flex-shrink-0" />;
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

  const getEntityTypeBadgeColor = (entityType: string) => {
    const colors = {
      client_group: 'bg-blue-50 text-blue-600',
      product: 'bg-green-50 text-green-600',
      fund: 'bg-purple-50 text-purple-600',
      provider: 'bg-orange-50 text-orange-600',
      portfolio: 'bg-indigo-50 text-indigo-600'
    };
    return colors[entityType as keyof typeof colors] || 'bg-gray-50 text-gray-600';
  };

  const getEntityKeyDetail = (result: SearchResult) => {
    // Return simplified, entity-specific key information
    switch (result.entity_type) {
      case 'client_group':
        return result.additional_info || 'Active client';
      case 'product':
        return result.additional_info || 'Active product';
      case 'fund':
        // Extract ISIN if available, otherwise show additional info
        const isinMatch = result.additional_info?.match(/ISIN:\s*([A-Z0-9]+)/i);
        return isinMatch ? isinMatch[1] : (result.additional_info || 'Investment fund');
      case 'provider':
        return result.additional_info || 'Financial provider';
      case 'portfolio':
        return result.additional_info || 'Portfolio template';
      default:
        return result.additional_info || '';
    }
  };

  // Business priority order for search results
  const sortResultsByBusinessPriority = (results: SearchResult[]): SearchResult[] => {
    const priorityOrder = {
      'client_group': 1,
      'product': 2,
      'fund': 3,
      'portfolio': 4,
      'provider': 5
    };

    return [...results].sort((a, b) => {
      // First, sort by entity type priority
      const aPriority = priorityOrder[a.entity_type as keyof typeof priorityOrder] || 999;
      const bPriority = priorityOrder[b.entity_type as keyof typeof priorityOrder] || 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Within same type, sort alphabetically by name
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
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

  // Loading icon
  const loadingIcon = (
    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input - Following Group 1 Design System */}
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <div className="h-5 w-5 text-gray-400">
            {isLoading ? loadingIcon : <MagnifyingGlassIcon className="h-5 w-5" />}
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
          placeholder="Search clients, products, funds, providers, portfolios..."
          className="block w-full h-11 px-4 py-3 pl-11 pr-11 text-sm border border-gray-300 rounded-lg shadow-sm bg-white 
                     transition-all duration-150 ease-in-out 
                     focus:outline-none focus:ring-4 focus:ring-offset-2 focus:border-primary-700 focus:ring-primary-700/10
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
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-150"
            aria-label="Clear search"
          >
            <div className="h-5 w-5">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto min-w-[400px]">
          {results.length > 0 ? (
            <ul role="listbox" className="py-1">
              {sortResultsByBusinessPriority(results).map((result, index) => (
                <li key={`${result.entity_type}-${result.entity_id}`} role="option" aria-selected={selectedIndex === index}>
                  <button
                    type="button"
                    onClick={() => handleResultClick(result)}
                    className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 ${
                      selectedIndex === index ? 'bg-gray-50' : ''
                    }`}
                  >
                    {/* Single-line layout - Full width utilization */}
                    <div className="flex items-center gap-3 w-full">
                      {/* Icon column - fixed, centered */}
                      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {getEntityIcon(result.entity_type)}
                      </div>
                      
                      {/* Name column - flexible, takes remaining space */}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 text-sm truncate block">
                          {result.name}
                        </span>
                      </div>
                      
                      {/* Type Badge column - fixed width */}
                      <div className="w-16 flex-shrink-0">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getEntityTypeBadgeColor(result.entity_type)}`}>
                          {getEntityTypeLabel(result.entity_type)}
                        </span>
                      </div>
                      
                      {/* Key Detail column - fixed width */}
                      <div className="w-20 flex-shrink-0">
                        <span className="text-xs text-gray-500 truncate block">
                          {getEntityKeyDetail(result)}
                        </span>
                      </div>
                      
                      {/* Arrow column - fixed, centered */}
                      <div className="w-4 flex items-center justify-center flex-shrink-0">
                        <ChevronRightIcon className="h-3 w-3 text-gray-400" />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="px-4 py-4 text-sm text-gray-500 text-center">
              <div className="flex flex-col items-center justify-center space-y-1">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-300" />
                <span>No results found</span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;