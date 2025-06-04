import { useState, useEffect, useCallback } from 'react';
import { getErrorMessage } from '../utils/definitionsShared';

// Custom hook for data fetching with cancellation
export function useEntityData<T>(
  fetchFn: (params: any) => Promise<T[]>,
  dependencies: any[],
  initialFilters: Record<string, any> = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  
  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    
    try {
      const result = await fetchFn({ 
        ...filters,
        signal: controller.signal 
      });
      setData(result);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
    
    return controller;
  }, [fetchFn, ...dependencies, ...Object.values(filters)]);
  
  useEffect(() => {
    let controller: AbortController;
    
    const fetch = async () => {
      controller = await fetchData();
    };
    
    fetch();
    
    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, [fetchData]);
  
  return { 
    data, 
    loading, 
    error, 
    setFilters, 
    refresh: fetchData 
  };
} 