import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/**
 * Creates a QueryClient configured for testing
 *
 * Configuration rationale:
 * - retry: false - Tests should fail fast, no retry logic
 * - gcTime: 0 - Immediate cleanup, no cache persistence between tests
 * - staleTime: 0 - Always treat data as stale, no implicit caching
 * - Suppressed error logger - Avoid console noise from expected errors
 *
 * @returns A new QueryClient instance optimized for testing
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    // Note: logger option removed in React Query v5
  });
}

/**
 * Cleans up QueryClient cache and removes all queries/mutations
 *
 * Usage: Call in afterEach() to prevent test pollution
 *
 * @param client - The QueryClient to clean up
 */
export function cleanupQueryClient(client: QueryClient): void {
  client.clear();
  client.getQueryCache().clear();
  client.getMutationCache().clear();
}

interface TestProvidersProps {
  children: React.ReactNode;
  queryClient: QueryClient;
  initialRoute?: string;
}

/**
 * AllTheProviders wrapper with correct nesting order
 *
 * Nesting: QueryClientProvider > MemoryRouter
 * Rationale: Query provider needs to wrap router for route-based queries
 *
 * @param props - Component props including children, queryClient, and initialRoute
 */
function AllTheProviders({
  children,
  queryClient,
  initialRoute = '/',
}: TestProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route for MemoryRouter, defaults to '/' */
  initialRoute?: string;
  /** Custom QueryClient instance, creates new if not provided */
  queryClient?: QueryClient;
}

export interface RenderWithProvidersResult extends RenderResult {
  /** The QueryClient instance used for this render */
  queryClient: QueryClient;
}

/**
 * Custom render function with all required providers
 *
 * Provides QueryClientProvider and MemoryRouter context to components under test.
 * Compatible with setupTests.ts global mocks (AuthContext, react-router-dom).
 *
 * Usage:
 * ```typescript
 * const { getByText, queryClient } = renderWithProviders(<MyComponent />);
 * await waitFor(() => expect(queryClient.isFetching()).toBe(0));
 * ```
 *
 * @param ui - Component to render
 * @param options - Optional route and queryClient overrides
 * @returns Render result + queryClient for assertions
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialRoute = '/',
    queryClient: providedQueryClient,
    ...renderOptions
  }: RenderWithProvidersOptions = {}
): RenderWithProvidersResult {
  // Create new QueryClient if not provided (isolated per test)
  const queryClient = providedQueryClient ?? createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders
      queryClient={queryClient}
      initialRoute={initialRoute}
    >
      {children}
    </AllTheProviders>
  );

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...renderResult,
    queryClient,
  };
}

/**
 * Helper to wait for all React Query operations to complete
 *
 * Waits until the QueryClient has no active fetches or mutations.
 *
 * Usage:
 * ```typescript
 * await waitForQueryClient(queryClient);
 * expect(screen.getByText('Loaded data')).toBeInTheDocument();
 * ```
 *
 * @param client - The QueryClient to wait for
 */
export async function waitForQueryClient(client: QueryClient): Promise<void> {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => expect(client.isFetching()).toBe(0));
}

// Re-export testing library utilities for convenience
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
