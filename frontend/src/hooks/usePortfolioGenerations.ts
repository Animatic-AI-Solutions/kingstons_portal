import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import api from '../services/api';

interface PortfolioGeneration {
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

interface UsePortfolioGenerationsResult {
  generations: PortfolioGeneration[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

export const usePortfolioGenerations = (): UsePortfolioGenerationsResult => {
  const queryClient = useQueryClient();

  const fetchGenerations = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    try {
      // Use the existing endpoint for template portfolio generations (now with product counts)
      const response = await api.get('/available_portfolios/template-portfolio-generations/active', { signal });

      // Transform the data to match our expected interface
      const transformedData: PortfolioGeneration[] = await Promise.all(
        response.data.map(async (gen: any) => {
          // Get the template name from available_portfolios
          let templateName = 'Unknown Template';
          try {
            const templateResponse = await api.get(`/available_portfolios/${gen.available_portfolio_id}`, { signal });
            templateName = templateResponse.data.name || 'Unknown Template';
          } catch (error) {
            console.warn(`Could not fetch template name for portfolio ${gen.available_portfolio_id}`);
          }

          return {
            id: gen.id,
            name: gen.generation_name || `Generation ${gen.id}`,
            template_id: gen.available_portfolio_id,
            template_name: templateName,
            created_date: gen.created_at || new Date().toISOString(),
            status: gen.status || 'active',
            product_count: gen.product_count || 0, // Use the product_count from backend
            created_by: gen.created_by || 'System',
            description: gen.description || ''
          };
        })
      );

      return transformedData;

    } catch (err) {
      console.error('Error in fetchGenerations:', err);
      throw err;
    }
  }, []);

  const {
    data: generations = [],
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['portfolio-generations'],
    queryFn: ({ signal }) => fetchGenerations({ signal }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: 'always', // Always refetch on mount for fresh data
    refetchOnReconnect: true
  });

  const refetchGenerations = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    generations,
    loading,
    error: error ? String(error) : null,
    refetch: refetchGenerations,
    isRefetching
  };
};

export const usePortfolioGenerationDetails = (generationId: string | undefined) => {
  const fetchGenerationDetails = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    if (!generationId || generationId === 'undefined') {
      throw new Error('Generation ID is required');
    }

    try {
      // Use the existing endpoint for getting a single generation by ID
      const generationResponse = await api.get(`/available_portfolios/generations/${generationId}`, { signal });

      // Get linked products for this generation using products_list_view
      const productsResponse = await api.get('/client_products', { signal });
      const linkedProducts = productsResponse.data.filter((product: any) =>
        product.effective_template_generation_id === parseInt(generationId)
      );

      return {
        generation: generationResponse.data,
        linkedProducts: linkedProducts || []
      };
    } catch (err) {
      console.error('Error fetching portfolio generation details:', err);
      throw err;
    }
  }, [generationId]);

  return useQuery({
    queryKey: ['portfolio-generation-details', generationId],
    queryFn: ({ signal }) => fetchGenerationDetails({ signal }),
    enabled: !!generationId && generationId !== 'undefined',
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false
  });
};

// Simplified hook for immediate use - can replace complex manual data fetching
export const usePortfolioGenerationDetailsSimple = (generationId: string | undefined) => {
  const { data, isLoading, error, refetch } = usePortfolioGenerationDetails(generationId);

  return {
    generation: data?.generation || null,
    linkedProducts: data?.linkedProducts || [],
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}; 