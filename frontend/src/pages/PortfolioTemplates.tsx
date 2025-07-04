import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/ui/feedback/TableSkeleton';
import { EmptyState } from '../components/ui/feedback/EmptyState';
import { ErrorDisplay } from '../components/ui/feedback/ErrorDisplay';
import { useEntityData } from '../hooks/useEntityData';
import { 
  Portfolio, 
  calculateAverageRisk,
  getRiskRange 
} from '../utils/definitionsShared';
import api from '../services/api';
import StandardTable, { ColumnConfig } from '../components/StandardTable';

const PortfolioTemplates: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');

  // Data fetching
  const fetchPortfolios = useCallback(async (params: { signal?: AbortSignal } = {}) => {
    console.log("Fetching portfolio templates from /available_portfolios...");
    
    try {
      // Get list of all portfolio templates
      const response = await api.get('/available_portfolios', { signal: params.signal });
      console.log(`Successfully received ${response.data.length} portfolio templates`);
      console.log('Sample portfolio data:', response.data[0]);
      
      // For each template, fetch its generations and count portfolios using them
      const templatesWithCounts = await Promise.all(
        response.data.map(async (template: any) => {
          try {
            // Get all generations for this template
            const generationsResponse = await api.get(`/available_portfolios/${template.id}/generations`, { signal: params.signal });
            const generations = generationsResponse.data || [];
            
            // Count portfolios for each generation
            let totalPortfolioCount = 0;
            await Promise.all(
              generations.map(async (generation: any) => {
                try {
                  const countResponse = await api.get('/portfolios', {
                    params: {
                      template_generation_id: generation.id,
                      count_only: true
                    },
                    signal: params.signal
                  });
                  totalPortfolioCount += countResponse.data?.count || 0;
                } catch (err) {
                  console.warn(`Failed to count portfolios for generation ${generation.id}:`, err);
                }
              })
            );
            
            return {
              ...template,
              portfolioCount: totalPortfolioCount
            };
          } catch (err) {
            console.warn(`Failed to fetch data for template ${template.id}:`, err);
            return {
              ...template,
              portfolioCount: 0
            };
          }
        })
      );
      
      console.log('Templates with portfolio counts:', templatesWithCounts);
      return templatesWithCounts;
    } catch (err) {
      console.error('Error in fetchPortfolios:', err);
      throw err;
    }
  }, []);

  const { 
    data: portfolios, 
    loading: portfoliosLoading, 
    error: portfoliosError 
  } = useEntityData<Portfolio>(fetchPortfolios, []);



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
    <div className="container mx-auto px-2 py-1 bg-teal-50/40">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Portfolio Templates</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleAddNew}
            className="bg-teal-600 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-teal-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 shadow-sm flex items-center gap-1"
            aria-label="Add new portfolio template"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Template
          </button>
        </div>
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search portfolio templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-200"
              aria-label="Search portfolio templates"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
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
          <StandardTable
            data={searchFilteredPortfolios}
            columns={columns}
            className="cursor-pointer"
            onRowClick={handleItemClick}
          />
        )}
      </div>
    </div>
  );
};

export default PortfolioTemplates; 