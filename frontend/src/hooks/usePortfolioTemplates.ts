import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import api from '../services/api';

interface PortfolioTemplate {
  id: number;
  name: string;
  created_at: string;
  portfolioCount: number;
  weighted_risk?: number;
  generation_id?: number;
  generation_name?: string;
  status: string;
}

interface UsePortfolioTemplatesResult {
  portfolios: PortfolioTemplate[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

export const usePortfolioTemplates = (): UsePortfolioTemplatesResult => {
  const queryClient = useQueryClient();

  const fetchPortfolios = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    try {
      const response = await api.get('/available_portfolios/bulk-with-counts', { signal });

      return response.data as PortfolioTemplate[];
    } catch (err: any) {
      // Don't log canceled errors as they're normal behavior
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Error in fetchPortfolios:', err);
      }
      throw err;
    }
  }, []);

  const {
    data: portfolios = [],
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: ({ signal }) => fetchPortfolios({ signal }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: 'always', // Always refetch on mount for fresh data
    refetchOnReconnect: true
  });

  const refetchPortfolios = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    portfolios,
    loading,
    error: error ? String(error) : null,
    refetch: refetchPortfolios,
    isRefetching
  };
};

export const usePortfolioTemplateDetails = (portfolioId: string | undefined) => {
  const fetchPortfolioDetails = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    if (!portfolioId || portfolioId === 'undefined') {
      throw new Error('Portfolio ID is required');
    }

    try {
      // Fetch all required data in parallel
      const [templateResponse, generationsResponse, linkedProductsResponse] = await Promise.all([
        api.get(`/available_portfolios/${portfolioId}`, { signal }),
        api.get(`/available_portfolios/${portfolioId}/generations`, { signal }),
        api.get(`/available_portfolios/${portfolioId}/linked-products`, { signal }).catch(() => ({ data: { products: [], total_fum: 0 } }))
      ]);

      // Handle new API response structure which returns {products: [], total_fum: number}
      const linkedProductsData = linkedProductsResponse.data;
      const products = linkedProductsData?.products || [];
      const totalFum = linkedProductsData?.total_fum || 0;

      return {
        template: templateResponse.data,
        generations: generationsResponse.data || [],
        linkedProducts: products,
        totalFum: totalFum
      };
    } catch (err: any) {
      // Don't log canceled errors as they're normal behavior
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Error fetching portfolio template details:', err);
      }
      throw err;
    }
  }, [portfolioId]);

  return useQuery({
    queryKey: ['portfolio-template-details', portfolioId],
    queryFn: ({ signal }) => fetchPortfolioDetails({ signal }),
    enabled: !!portfolioId && portfolioId !== 'undefined',
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false
  });
};

// Simplified hook for immediate use - can replace complex manual data fetching
export const usePortfolioTemplateDetailsSimple = (portfolioId: string | undefined) => {
  const { data, isLoading, error, refetch } = usePortfolioTemplateDetails(portfolioId);

  return {
    template: data?.template || null,
    generations: data?.generations || [],
    linkedProducts: data?.linkedProducts || [],
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}; 