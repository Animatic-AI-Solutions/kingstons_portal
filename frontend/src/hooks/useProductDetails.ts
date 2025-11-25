import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPortfolioFundsByProduct } from '../services/api';

export interface ProductDetails {
  id: number;
  product_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  weighting?: number;
  plan_number?: string;
  provider_id?: number;
  provider_name?: string;
  product_type?: string;
  portfolio_id?: number;
  total_value?: number;
  previous_value?: number;
  irr?: number | string;
  risk_rating?: number;
  provider_theme_color?: string;
  template_generation_id?: number;
  template_info?: {
    id: number;
    generation_name: string;
    name?: string;
  };
  product_owners?: any[];
  fixed_fee_facilitated?: number;
  percentage_fee?: number;
  client_group_id?: number;
  client_group_name?: string;
  funds?: any[];
  portfolio?: any;
}

/**
 * Centralized hook for fetching product details with React Query caching
 * Eliminates duplicate API calls by using a single cached query
 * 
 * @param productId - The ID of the product to fetch
 * @returns React Query result with product data, loading state, and error handling
 */
export const useProductDetails = (productId: string | number | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['product-details', productId],
    queryFn: async () => {
      console.log('🔍 [PRODUCT DETAILS HOOK] ==================== FETCHING PRODUCT DATA ====================');
      console.log('🔍 [PRODUCT DETAILS HOOK] Product ID:', productId);

      if (!productId) {
        throw new Error('Product ID is required');
      }

      const response = await getPortfolioFundsByProduct(Number(productId));

      console.log('🔍 [PRODUCT DETAILS HOOK] Fetched product data from API:', response.data);
      console.log('🔍 [PRODUCT DETAILS HOOK] Product IRR from API:', response.data?.irr);
      console.log('🔍 [PRODUCT DETAILS HOOK] ==================== FETCH COMPLETE ====================');

      return response.data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Log when data is served from cache vs fetched fresh
  console.log('🔍 [PRODUCT DETAILS HOOK] Query status:', {
    productId,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    dataUpdatedAt: new Date(query.dataUpdatedAt).toISOString(),
    isStale: query.isStale,
    irr: query.data?.irr
  });

  // Utility function to invalidate this product's cache
  const invalidateProduct = () => {
    queryClient.invalidateQueries({ queryKey: ['product-details', productId] });
  };

  // Utility function to update product data in cache
  const updateProductInCache = (updatedData: Partial<ProductDetails>) => {
    queryClient.setQueryData(['product-details', productId], (oldData: any) => {
      if (!oldData) return oldData;
      return { ...oldData, ...updatedData };
    });
  };

  return {
    ...query,
    product: query.data,
    isLoading: query.isPending,
    invalidateProduct,
    updateProductInCache,
  };
};

/**
 * Hook for getting multiple products with deduplication
 * Useful when multiple components need different products
 */
export const useMultipleProductDetails = (productIds: (string | number)[]) => {
  const queries = useQuery({
    queryKey: ['multiple-products', productIds.sort().join(',')],
    queryFn: async () => {
      const promises = productIds.map(id => getPortfolioFundsByProduct(Number(id)));
      const responses = await Promise.all(promises);

      return responses.map(response => response.data);
    },
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...queries,  
    products: queries.data || [],
    isLoading: queries.isPending,
  };
};

export default useProductDetails; 