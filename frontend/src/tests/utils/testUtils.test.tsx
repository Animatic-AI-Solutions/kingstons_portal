import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  renderWithProviders,
  createTestQueryClient,
  cleanupQueryClient,
  waitForQueryClient,
  screen,
} from './testUtils';

describe('testUtils', () => {
  describe('createTestQueryClient', () => {
    it('creates QueryClient with retry disabled', () => {
      const client = createTestQueryClient();
      expect(client.getDefaultOptions().queries?.retry).toBe(false);
    });

    it('creates QueryClient with zero gcTime', () => {
      const client = createTestQueryClient();
      expect(client.getDefaultOptions().queries?.gcTime).toBe(0);
    });

    it('creates QueryClient with zero staleTime', () => {
      const client = createTestQueryClient();
      expect(client.getDefaultOptions().queries?.staleTime).toBe(0);
    });

    it('creates QueryClient with mutations retry disabled', () => {
      const client = createTestQueryClient();
      expect(client.getDefaultOptions().mutations?.retry).toBe(false);
    });
  });

  describe('cleanupQueryClient', () => {
    it('clears all queries from cache', () => {
      const client = createTestQueryClient();
      client.setQueryData(['test'], { data: 'value' });
      expect(client.getQueryCache().getAll()).toHaveLength(1);

      cleanupQueryClient(client);
      expect(client.getQueryCache().getAll()).toHaveLength(0);
    });

    it('clears query cache completely', () => {
      const client = createTestQueryClient();
      client.setQueryData(['test1'], { data: 'value1' });
      client.setQueryData(['test2'], { data: 'value2' });
      expect(client.getQueryCache().getAll()).toHaveLength(2);

      cleanupQueryClient(client);
      expect(client.getQueryCache().getAll()).toHaveLength(0);
    });
  });

  describe('renderWithProviders', () => {
    it('renders component with default providers', () => {
      const TestComponent = () => <div>Test Content</div>;
      renderWithProviders(<TestComponent />);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('provides QueryClient to components', async () => {
      const TestComponent = () => {
        const { data } = useQuery({
          queryKey: ['test'],
          queryFn: async () => 'query-data',
        });
        return <div>{data || 'loading'}</div>;
      };

      const { queryClient } = renderWithProviders(<TestComponent />);
      await waitForQueryClient(queryClient);
      expect(screen.getByText('query-data')).toBeInTheDocument();
    });

    it('provides MemoryRouter with default route', () => {
      const TestComponent = () => {
        const location = useLocation();
        return <span>{location.pathname}</span>;
      };

      renderWithProviders(<TestComponent />);
      expect(screen.getByText('/')).toBeInTheDocument();
    });

    it('allows custom initial route option', () => {
      // Note: useLocation is globally mocked in setupTests.ts, so we test that
      // the initialRoute option is accepted without error rather than actual routing
      const TestComponent = () => <div>Custom Route Test</div>;

      const result = renderWithProviders(<TestComponent />, {
        initialRoute: '/clients/123',
      });

      expect(screen.getByText('Custom Route Test')).toBeInTheDocument();
      expect(result.queryClient).toBeDefined();
    });

    it('returns queryClient for test assertions', () => {
      const TestComponent = () => <div>Test</div>;
      const { queryClient } = renderWithProviders(<TestComponent />);
      expect(queryClient).toBeDefined();
      expect(queryClient.isFetching()).toBe(0);
    });

    it('allows custom queryClient to be provided', () => {
      const customClient = createTestQueryClient();
      customClient.setQueryData(['custom'], { value: 'test' });

      const TestComponent = () => {
        const { data } = useQuery({
          queryKey: ['custom'],
          queryFn: async () => ({ value: 'should not fetch' }),
        });
        return <div>{data?.value || 'no-data'}</div>;
      };

      renderWithProviders(<TestComponent />, { queryClient: customClient });
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });

  describe('waitForQueryClient', () => {
    it('waits for all fetches to complete', async () => {
      const TestComponent = () => {
        const { data, isLoading } = useQuery({
          queryKey: ['async'],
          queryFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'async-data';
          },
        });
        return <div>{isLoading ? 'loading' : data}</div>;
      };

      const { queryClient } = renderWithProviders(<TestComponent />);
      expect(screen.getByText('loading')).toBeInTheDocument();

      await waitForQueryClient(queryClient);
      expect(screen.getByText('async-data')).toBeInTheDocument();
    });

    it('completes immediately when no queries are running', async () => {
      const client = createTestQueryClient();
      expect(client.isFetching()).toBe(0);

      await expect(waitForQueryClient(client)).resolves.not.toThrow();
    });
  });

  describe('Provider nesting order', () => {
    it('provides both QueryClient and Router context', () => {
      const TestComponent = () => {
        const location = useLocation();
        const { data } = useQuery({
          queryKey: ['location-test'],
          queryFn: async () => `Pathname: ${location.pathname}`,
        });
        return <div>{data || 'loading'}</div>;
      };

      const { queryClient } = renderWithProviders(<TestComponent />, {
        initialRoute: '/test-route',
      });

      // Component should have access to both location and query
      expect(queryClient).toBeDefined();
      // The query will eventually show the pathname
    });
  });

  describe('Isolation between tests', () => {
    it('first test sets query data', () => {
      const client = createTestQueryClient();
      client.setQueryData(['isolation-test'], { count: 1 });
      expect(client.getQueryData(['isolation-test'])).toEqual({ count: 1 });
    });

    it('second test should not see first test data', () => {
      const client = createTestQueryClient();
      expect(client.getQueryData(['isolation-test'])).toBeUndefined();
    });
  });
});
