import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AddButton, SearchInput, StandardTable, TableSkeleton, EmptyState, ErrorDisplay } from '../components/ui';
import type { ColumnConfig } from '../components/ui/tables/StandardTable';
import { usePortfolioGenerations } from '../hooks/usePortfolioGenerations';
import DynamicPageContainer from '../components/phase2/client-groups/DynamicPageContainer';

// Define the Generation interface
interface Generation {
  id: number;
  name: string;
  template_id: number;
  template_name: string;
  created_date: string;
  status: string;
  product_count: number;
  created_by?: string;
  description?: string;
}

interface PortfolioGenerationsProps {
  tabMode?: boolean;
}

const PortfolioGenerations: React.FC<PortfolioGenerationsProps> = ({ tabMode = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');

  // Data fetching using optimized custom hook
  const { 
    generations, 
    loading: generationsLoading, 
    error: generationsError,
    isRefetching
  } = usePortfolioGenerations();

  // Event handlers
  const handleItemClick = useCallback((generation: Generation) => {
    // Navigate to the template details page with generation ID as parameter
    navigate(`/definitions/portfolio-templates/${generation.template_id}?generation=${generation.id}`);
  }, [navigate]);

  const handleAddNew = useCallback(() => {
    navigate('/definitions/portfolio-generations/add');
  }, [navigate]);

  // Apply search filtering only - StandardTable will handle column filtering and sorting
  const searchFilteredGenerations = useMemo(() => {
    console.log('Processing generations data:', generations.length, 'generations');
    console.log('Sample generation:', generations[0]);
    
    let filtered = generations;
    
    // Apply text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(generation => 
        generation.name?.toLowerCase().includes(query) ||
        generation.template_name?.toLowerCase().includes(query) ||
        generation.description?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter - only show active generations
    const generationsWithStatus = generations.filter(g => 'status' in g && g.status);
    if (generationsWithStatus.length > 0) {
      filtered = filtered.filter(generation => generation.status === 'active');
    }
    
    console.log('Filtered generations:', filtered.length);
    
    return filtered;
  }, [generations, searchQuery]);

  // Column configuration for StandardTable
  const columns: ColumnConfig[] = [
    {
      key: 'name',
      label: 'Generation Name',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'template_name',
      label: 'Source Template',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'product_count',
      label: 'Products Using',
      dataType: 'number',
      alignment: 'right',
      control: 'sort',
      format: (value) => (value || 0).toString()
    }
  ];

  if (!user) return null;

  const content = (
    <>
      {/* Header - only show when not in tab mode */}
      {!tabMode && (
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Portfolio Generations</h1>
          <div className="flex items-center gap-4">
            <AddButton 
              context="Generation"
              design="balanced"
              size="md"
              onClick={handleAddNew}
            />
          </div>
        </div>
      )}
      
      {/* Header when in tab mode */}
      {tabMode && (
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold text-gray-900">Portfolio Generations</h2>
          <div className="flex items-center gap-4">
            <AddButton 
              context="Generation"
              design="balanced"
              size="md"
              onClick={handleAddNew}
            />
          </div>
        </div>
      )}

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search portfolio generations..."
          size="md"
          className="flex-1"
        />
      </div>

      {/* Portfolio Generations Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {generationsLoading ? (
          <div className="p-6">
            <TableSkeleton columns={3} />
          </div>
        ) : generationsError ? (
          <div className="p-6">
            <ErrorDisplay message={generationsError} />
          </div>
        ) : searchFilteredGenerations.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No portfolio generations found" />
          </div>
        ) : (
          <div className="relative">
            {isRefetching && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 z-10">
                <div className="h-full bg-primary-500 animate-pulse"></div>
              </div>
            )}
            <StandardTable
              data={searchFilteredGenerations}
              columns={columns}
              className="cursor-pointer"
              onRowClick={handleItemClick}
            />
          </div>
        )}
      </div>
    </>
  );

  return tabMode ? content : (
    <DynamicPageContainer 
      maxWidth="2800px"
      className="py-1"
    >
      {content}
    </DynamicPageContainer>
  );
};

export default PortfolioGenerations; 