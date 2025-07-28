import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompleteProductDetails } from '../services/api';

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
  fixed_cost?: number;
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
      if (!productId) {
        throw new Error('Product ID is required');
      }
      
      console.log(`🔍 [useProductDetails] Fetching product details for ID: ${productId}`);
      const startTime = performance.now();
      
      const response = await getCompleteProductDetails(productId);
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      console.log(`✅ [useProductDetails] Product ${productId} loaded in ${duration}ms`);
      
      return response.data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Utility function to invalidate this product's cache
  const invalidateProduct = () => {
    queryClient.invalidateQueries(['product-details', productId]);
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
      console.log(`🔍 [useMultipleProductDetails] Fetching ${productIds.length} products`);
      
      const promises = productIds.map(id => getCompleteProductDetails(id));
      const responses = await Promise.all(promises);
      
      return responses.map(response => response.data);
    },
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  return {
    ...queries,  
    products: queries.data || [],
    isLoading: queries.isPending,
  };
};

export default useProductDetails; 