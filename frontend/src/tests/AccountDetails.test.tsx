import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountDetails from '../pages/ProductDetails';

// Mock components and hooks
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: '1' }),
  Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    api: {
      get: jest.fn().mockImplementation((url) => {
        if (url.includes('accounts/1')) {
          return Promise.resolve({
            data: {
              id: 1,
              name: 'Retirement Account',
              client_id: 1,
              client_name: 'John Smith',
              provider_id: 1,
              provider_name: 'Vanguard',
              product_id: 1,
              product_name: 'IRA',
              start_date: '2022-01-20',
              status: 'active',
              total_value: 150000,
              irr: 8.5,
              weighting: 65
            }
          });
        } else if (url.includes('accounts/1/holdings')) {
          return Promise.resolve({
            data: [
              {
                id: 1,
                account_id: 1,
                fund_id: 1,
                fund_name: 'Total Stock Market Index',
                fund_ticker: 'VTSAX',
                units: 1250.75,
                start_date: '2022-01-25',
                status: 'active',
                market_value: 100000,
                portfolio_id: 1,
                portfolio_name: 'Moderate Portfolio',
                weighting: 65
              },
              {
                id: 2,
                account_id: 1,
                fund_id: 2,
                fund_name: 'Total Bond Market Index',
                fund_ticker: 'VBTLX',
                units: 4500.25,
                start_date: '2022-01-25',
                status: 'active',
                market_value: 50000,
                portfolio_id: 1,
                portfolio_name: 'Moderate Portfolio',
                weighting: 35
              }
            ]
          });
        } else if (url.includes('accounts/1/activity-logs')) {
          return Promise.resolve({
            data: [
              {
                id: 1,
                account_id: 1,
                holding_id: 1,
                fund_name: 'Total Stock Market Index',
                activity_type: 'Purchase',
                activity_date: '2022-01-25',
                units: 1250.75,
                price_per_unit: 80.75,
                amount: 100000,
                notes: 'Initial purchase'
              },
              {
                id: 2,
                account_id: 1,
                holding_id: 2,
                fund_name: 'Total Bond Market Index',
                activity_type: 'Purchase',
                activity_date: '2022-01-25',
                units: 4500.25,
                price_per_unit: 11.11,
                amount: 50000,
                notes: 'Initial purchase'
              },
              {
                id: 3,
                account_id: 1,
                holding_id: 1,
                fund_name: 'Total Stock Market Index',
                activity_type: 'Valuation',
                activity_date: '2022-03-31',
                units: 1250.75,
                price_per_unit: 82.50,
                market_value: 103187,
                notes: 'Quarterly valuation'
              }
            ]
          });
        }
        return Promise.resolve({ data: {} });
      }),
      post: jest.fn().mockResolvedValue({ data: { id: 4 } }),
      put: jest.fn().mockResolvedValue({ data: { id: 1 } })
    }
  })
}));

describe('AccountDetails Component', () => {
  test('renders the account details', async () => {
    render(<AccountDetails />);
    
    // Wait for the account details to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Check if the account details are displayed
    expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.getByText('IRA')).toBeInTheDocument();
    expect(screen.getByText('$150,000')).toBeInTheDocument();
    expect(screen.getByText('8.5%')).toBeInTheDocument();
  });

  test('switches between account tabs', async () => {
    render(<AccountDetails />);
    
    // Wait for the account details to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Info tab should be active by default
    expect(screen.getByText('Client:')).toBeInTheDocument();
    expect(screen.getByText('Provider:')).toBeInTheDocument();
    expect(screen.getByText('Product:')).toBeInTheDocument();
    
    // Click on Holdings tab
    const holdingsTab = screen.getByRole('tab', { name: /holdings/i });
    fireEvent.click(holdingsTab);
    
    // Holdings data should be visible
    await waitFor(() => {
      expect(screen.getByText('Total Stock Market Index')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Bond Market Index')).toBeInTheDocument();
    expect(screen.getByText('1,250.75')).toBeInTheDocument();
    expect(screen.getByText('4,500.25')).toBeInTheDocument();
    expect(screen.getByText('$100,000')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
    
    // Click on Activity Log tab
    const activityTab = screen.getByRole('tab', { name: /activity log/i });
    fireEvent.click(activityTab);
    
    // Activity log data should be visible
    await waitFor(() => {
      expect(screen.getByText('Purchase')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Purchase').length).toBe(2);
    expect(screen.getByText('Valuation')).toBeInTheDocument();
    expect(screen.getByText('$103,187')).toBeInTheDocument();
    expect(screen.getByText('Initial purchase')).toBeInTheDocument();
    expect(screen.getByText('Quarterly valuation')).toBeInTheDocument();
  });

  test('displays edit account button', async () => {
    render(<AccountDetails />);
    
    // Wait for the account details to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Check if the edit account button is displayed
    expect(screen.getByRole('button', { name: /edit account/i })).toBeInTheDocument();
  });

  test('displays add holding button on holdings tab', async () => {
    render(<AccountDetails />);
    
    // Wait for the account details to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Click on Holdings tab
    const holdingsTab = screen.getByRole('tab', { name: /holdings/i });
    fireEvent.click(holdingsTab);
    
    // Check if the add holding button is displayed
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add holding/i })).toBeInTheDocument();
    });
  });

  test('displays record activity button on activity log tab', async () => {
    render(<AccountDetails />);
    
    // Wait for the account details to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Click on Activity Log tab
    const activityTab = screen.getByRole('tab', { name: /activity log/i });
    fireEvent.click(activityTab);
    
    // Check if the record activity button is displayed
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /record activity/i })).toBeInTheDocument();
    });
  });

  test('filters activity log by activity type', async () => {
    render(<AccountDetails />);
    
    // Wait for the account details to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Click on Activity Log tab
    const activityTab = screen.getByRole('tab', { name: /activity log/i });
    fireEvent.click(activityTab);
    
    // Wait for the activity log to load
    await waitFor(() => {
      expect(screen.getAllByText('Purchase').length).toBe(2);
    });
    
    // Get the activity type filter
    const activityTypeFilter = screen.getByLabelText('Filter by Activity Type');
    
    // Filter by 'Valuation'
    fireEvent.change(activityTypeFilter, { target: { value: 'Valuation' } });
    
    // Only Valuation activities should be visible
    expect(screen.queryByText('Purchase')).not.toBeInTheDocument();
    expect(screen.getByText('Valuation')).toBeInTheDocument();
    expect(screen.getByText('Quarterly valuation')).toBeInTheDocument();
    
    // Clear the filter
    fireEvent.change(activityTypeFilter, { target: { value: '' } });
    
    // All activities should be visible again
    expect(screen.getAllByText('Purchase').length).toBe(2);
    expect(screen.getByText('Valuation')).toBeInTheDocument();
  });
});
