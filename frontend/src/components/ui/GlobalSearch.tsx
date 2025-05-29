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
      navigate(route);
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
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

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder="Search clients, products, funds..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg 
                   bg-white/80 backdrop-blur-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                   transition-all duration-200 ease-in-out
                   placeholder:text-gray-400"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 backdrop-blur-sm">
          {results.length > 0 ? (
            <>
              {/* Results Header */}
              <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Search Results
                  </span>
                  <span className="text-xs text-gray-500">
                    {results.length} found
                  </span>
                </div>
              </div>

              {/* Results List */}
              <div className="max-h-80 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={`${result.entity_type}-${result.entity_id}`}
                    onClick={() => handleResultClick(result)}
                    className={`px-4 py-3 cursor-pointer transition-all duration-150 ease-in-out border-b border-gray-50 last:border-b-0
                              ${selectedIndex === index 
                                ? 'bg-blue-50 border-blue-100' 
                                : 'hover:bg-gray-50'
                              }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Entity Icon */}
                      <div className="mt-0.5">
                        {getEntityIcon(result.entity_type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Entity Name */}
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {highlightMatch(result.name, query)}
                          </h4>
                          
                          {/* Entity Type Badge */}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getEntityTypeColor(result.entity_type)}`}>
                            {getEntityTypeLabel(result.entity_type)}
                          </span>
                        </div>

                        {/* Description */}
                        {result.description && (
                          <p className="text-xs text-gray-600 mb-1 line-clamp-1">
                            {result.description}
                          </p>
                        )}

                        {/* Additional Info */}
                        {result.additional_info && (
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {result.additional_info}
                          </p>
                        )}
                      </div>

                      {/* Arrow Icon */}
                      <div className="mt-0.5">
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    <span>Use ↑↓ to navigate, Enter to select</span>
                  </div>
                  <span>ESC to close</span>
                </div>
              </div>
            </>
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="px-4 py-8 text-center">
              <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">No results found</p>
              <p className="text-xs text-gray-400">
                Try searching for clients, products, or funds
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch; 