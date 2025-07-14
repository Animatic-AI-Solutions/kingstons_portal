import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/ui/feedback/TableSkeleton';
import { EmptyState } from '../components/ui/feedback/EmptyState';
import { ErrorDisplay } from '../components/ui/feedback/ErrorDisplay';
import { AddButton, SearchInput } from '../components/ui';
import { usePortfolioTemplates } from '../hooks/usePortfolioTemplates';
import { 
  Portfolio, 
  calculateAverageRisk,
  getRiskRange 
} from '../utils/definitionsShared';
import StandardTable, { ColumnConfig } from '../components/StandardTable';

const PortfolioTemplates: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');

  // Data fetching using optimized custom hook
  const { 
    portfolios, 
    loading: portfoliosLoading, 
    error: portfoliosError,
    isRefetching
  } = usePortfolioTemplates();



  // Event handlers
  const handleItemClick = useCallback((portfolio: Portfolio) => {
    navigate(`/definitions/portfolio-templates/${portfolio.id}`);
  }, [navigate]);

  const handleAddNew = useCallback(() => {
    navigate('/definitions/portfolio-templates/add');
  }, [navigate]);



  // Apply search filtering only - StandardTable will handle column filtering and sorting
  const searchFilteredPortfolios = useMemo(() => {
    console.log('Processing portfolios data:', portfolios.length, 'portfolios');
    console.log('Sample portfolio:', portfolios[0]);
    
    let filtered = portfolios;
    
    // Apply text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(portfolio => 
        portfolio.name?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter - only show active templates
    const portfoliosWithStatus = portfolios.filter(p => 'status' in p && p.status);
    if (portfoliosWithStatus.length > 0) {
      filtered = filtered.filter(portfolio => portfolio.status === 'active');
    }
    
    console.log('Filtered portfolios:', filtered.length);
    
    // Add computed values for StandardTable
    return filtered.map(portfolio => ({
      ...portfolio,
      weighted_risk_value: calculateAverageRisk(portfolio),
      risk_range: getRiskRange(portfolio)
    }));
  }, [portfolios, searchQuery]);

  // Column configuration for StandardTable
  const columns: ColumnConfig[] = [
    {
      key: 'name',
      label: 'Name',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'weighted_risk_value',
      label: 'Weighted Risk',
      dataType: 'risk',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'portfolioCount',
      label: 'Portfolio Count',
      dataType: 'number',
      alignment: 'left',
      control: 'sort',
      format: (value) => (value || 0).toString()
    }
  ];

  if (!user) return null;

  return (
    <div className="container mx-auto px-2 py-1">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Portfolio Templates</h1>
        <div className="flex items-center gap-4">
          <AddButton 
            context="Template"
            design="balanced"
            size="md"
            onClick={handleAddNew}
          />
        </div>
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search portfolio templates..."
          size="md"
          className="flex-1"
        />
      </div>

      {/* Portfolio Templates Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {portfoliosLoading ? (
          <div className="p-6">
            <TableSkeleton columns={3} />
          </div>
        ) : portfoliosError ? (
          <div className="p-6">
            <ErrorDisplay message={portfoliosError} />
          </div>
        ) : searchFilteredPortfolios.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No portfolio templates found" />
          </div>
        ) : (
          <div className="relative">
            {isRefetching && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 z-10">
                <div className="h-full bg-primary-500 animate-pulse"></div>
              </div>
            )}
          <StandardTable
            data={searchFilteredPortfolios}
            columns={columns}
            className="cursor-pointer"
            onRowClick={handleItemClick}
          />
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioTemplates; 