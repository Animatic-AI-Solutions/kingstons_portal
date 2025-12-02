import { renderHook } from '@testing-library/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
}));

describe('useSmartNavigation', () => {
  const mockNavigate = jest.fn();
  const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;
  const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(mockNavigate);
  });

  describe('getNavigationContext', () => {
    it('should parse URL parameters correctly', () => {
      mockUseLocation.mockReturnValue({
        search: '?from=client-details&clientId=123&clientName=Test%20Client',
        state: null,
        pathname: '/products/456/overview',
        hash: '',
        key: 'test'
      });

      const { result } = renderHook(() => useSmartNavigation());
      const context = result.current.getNavigationContext();

      expect(context).toEqual({
        from: 'client-details',
        clientId: '123',
        clientName: 'Test%20Client',
        portfolioId: undefined,
        portfolioName: undefined,
        state: null
      });
    });

    it('should include location state', () => {
      const mockState = { from: { pathname: '/products', label: 'Products' } };
      mockUseLocation.mockReturnValue({
        search: '',
        state: mockState,
        pathname: '/products/456/overview',
        hash: '',
        key: 'test'
      });

      const { result } = renderHook(() => useSmartNavigation());
      const context = result.current.getNavigationContext();

      expect(context.state).toEqual(mockState);
    });
  });

  describe('determineBackDestination', () => {
    it('should prioritize client-details URL parameter navigation', () => {
      const context = {
        from: 'client-details',
        clientId: '123',
        clientName: 'Test%20Client',
        state: { from: { pathname: '/products' } } // This should be ignored
      };

      const { result } = renderHook(() => useSmartNavigation());
      const destination = result.current.determineBackDestination(context);

      expect(destination).toEqual({
        path: '/client-groups/123',
        state: undefined
      });
    });

    it('should handle portfolio-details navigation', () => {
      const context = {
        from: 'portfolio-details',
        portfolioId: '789',
        portfolioName: 'Conservative%20Portfolio'
      };

      const { result } = renderHook(() => useSmartNavigation());
      const destination = result.current.determineBackDestination(context);

      expect(destination).toEqual({
        path: '/portfolios/789',
        state: undefined
      });
    });

    it('should handle Products page state navigation', () => {
      const context = {
        state: {
          from: {
            pathname: '/products',
            label: 'Products'
          }
        }
      };

      const { result } = renderHook(() => useSmartNavigation());
      const destination = result.current.determineBackDestination(context);

      expect(destination).toEqual({
        path: '/products',
        state: undefined
      });
    });

    it('should handle breadcrumb array from state', () => {
      const context = {
        state: {
          breadcrumb: [
            { path: '/client-groups', name: 'Client Groups' },
            { path: '/client-groups/123', name: 'ABC Company' }
          ]
        }
      };

      const { result } = renderHook(() => useSmartNavigation());
      const destination = result.current.determineBackDestination(context);

      expect(destination).toEqual({
        path: '/client-groups/123',
        state: undefined
      });
    });

    it('should fallback to client group with fallbackClientId', () => {
      const context = {}; // No navigation context
      const fallbackClientId = 456;

      const { result } = renderHook(() => useSmartNavigation());
      const destination = result.current.determineBackDestination(context, fallbackClientId);

      expect(destination).toEqual({
        path: '/client-groups/456',
        state: undefined
      });
    });

    it('should fallback to products page when no context available', () => {
      const context = {}; // No navigation context

      const { result } = renderHook(() => useSmartNavigation());
      const destination = result.current.determineBackDestination(context);

      expect(destination).toEqual({
        path: '/products',
        state: undefined
      });
    });
  });

  describe('navigateBack', () => {
    it('should navigate with notification', () => {
      mockUseLocation.mockReturnValue({
        search: '?from=client-details&clientId=123',
        state: null,
        pathname: '/products/456/overview',
        hash: '',
        key: 'test'
      });

      const { result } = renderHook(() => useSmartNavigation());
      
      const notification = { type: 'success', message: 'Product deleted successfully' };
      result.current.navigateBack(notification);

      expect(mockNavigate).toHaveBeenCalledWith('/client-groups/123', {
        state: { notification }
      });
    });

    it('should navigate without notification', () => {
      mockUseLocation.mockReturnValue({
        search: '',
        state: { from: { pathname: '/products' } },
        pathname: '/products/456/overview',
        hash: '',
        key: 'test'
      });

      const { result } = renderHook(() => useSmartNavigation());
      result.current.navigateBack();

      expect(mockNavigate).toHaveBeenCalledWith('/products', {
        state: undefined
      });
    });

    it('should use fallback client ID when no other context available', () => {
      mockUseLocation.mockReturnValue({
        search: '',
        state: null,
        pathname: '/products/456/overview',
        hash: '',
        key: 'test'
      });

      const { result } = renderHook(() => useSmartNavigation());
      result.current.navigateBack(undefined, 789);

      expect(mockNavigate).toHaveBeenCalledWith('/client-groups/789', {
        state: undefined
      });
    });
  });

  describe('getBreadcrumbTrail', () => {
    it('should build breadcrumb trail for client-details navigation', () => {
      mockUseLocation.mockReturnValue({
        search: '?from=client-details&clientId=123&clientName=ABC%20Company',
        state: null,
        pathname: '/products/456/overview',
        hash: '',
        key: 'test'
      });

      const { result } = renderHook(() => useSmartNavigation());
      const trail = result.current.getBreadcrumbTrail();

      expect(trail).toEqual([
        { path: '/client-groups', label: 'Client Groups' },
        { path: '/client-groups/123', label: 'ABC Company' }
      ]);
    });

    it('should build breadcrumb trail for portfolio-details navigation', () => {
      mockUseLocation.mockReturnValue({
        search: '?from=portfolio-details&portfolioId=789&portfolioName=Conservative%20Portfolio',
        state: null,
        pathname: '/products/456/overview',
        hash: '',
        key: 'test'
      });

      const { result } = renderHook(() => useSmartNavigation());
      const trail = result.current.getBreadcrumbTrail();

      expect(trail).toEqual([
        { path: '/definitions/portfolio-templates', label: 'Portfolio Templates' },
        { path: '/portfolios/789', label: 'Conservative Portfolio' }
      ]);
    });

    it('should build breadcrumb trail for products navigation', () => {
      mockUseLocation.mockReturnValue({
        search: '',
        state: { from: { pathname: '/products' } },
        pathname: '/products/456/overview',
        hash: '',
        key: 'test'
      });

      const { result } = renderHook(() => useSmartNavigation());
      const trail = result.current.getBreadcrumbTrail();

      expect(trail).toEqual([
        { path: '/products', label: 'Products' }
      ]);
    });

    it('should use provided breadcrumb array from state', () => {
      const breadcrumbArray = [
        { path: '/client-groups', name: 'Client Groups' },
        { path: '/client-groups/123', label: 'ABC Company' }
      ];

      mockUseLocation.mockReturnValue({
        search: '',
        state: { breadcrumb: breadcrumbArray },
        pathname: '/products/456/overview',
        hash: '',
        key: 'test'
      });

      const { result } = renderHook(() => useSmartNavigation());
      const trail = result.current.getBreadcrumbTrail();

      expect(trail).toEqual([
        { path: '/client-groups', label: 'Client Groups' },
        { path: '/client-groups/123', label: 'ABC Company' }
      ]);
    });

    it('should default to products breadcrumb', () => {
      mockUseLocation.mockReturnValue({
        search: '',
        state: null,
        pathname: '/products/456/overview',
        hash: '',
        key: 'test'
      });

      const { result } = renderHook(() => useSmartNavigation());
      const trail = result.current.getBreadcrumbTrail();

      expect(trail).toEqual([
        { path: '/products', label: 'Products' }
      ]);
    });
  });
}); 