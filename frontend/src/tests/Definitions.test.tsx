import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Definitions from '../pages/Definitions';

// Mock components and hooks
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    api: {
      get: jest.fn().mockImplementation((url) => {
        if (url.includes('provider-templates')) {
          return Promise.resolve({
            data: [
              {
                id: 1,
                name: 'Vanguard',
                description: 'Leading provider of mutual funds and ETFs',
                status: 'active',
                created_at: '2022-01-15',
                product_template_count: 5
              },
              {
                id: 2,
                name: 'Fidelity',
                description: 'Financial services corporation',
                status: 'active',
                created_at: '2022-02-20',
                product_template_count: 3
              },
              {
                id: 3,
                name: 'JP Morgan',
                description: 'Investment bank and financial services company',
                status: 'inactive',
                created_at: '2022-05-12',
                product_template_count: 0
              }
            ]
          });
        } else if (url.includes('product-templates')) {
          return Promise.resolve({
            data: [
              {
                id: 1,
                name: 'IRA',
                provider_template_id: 1,
                provider_template_name: 'Vanguard',
                description: 'Individual Retirement Account',
                status: 'active',
                created_at: '2022-01-20',
                fund_template_count: 8
              },
              {
                id: 2,
                name: 'Brokerage Account',
                provider_template_id: 1,
                provider_template_name: 'Vanguard',
                description: 'Standard investment account',
                status: 'active',
                created_at: '2022-01-25',
                fund_template_count: 12
              },
              {
                id: 3,
                name: '529 Plan',
                provider_template_id: 2,
                provider_template_name: 'Fidelity',
                description: 'College savings plan',
                status: 'active',
                created_at: '2022-02-22',
                fund_template_count: 6
              }
            ]
          });
        } else if (url.includes('fund-templates')) {
          return Promise.resolve({
            data: [
              {
                id: 1,
                name: 'Total Stock Market Index',
                ticker: 'VTSAX',
                provider_template_id: 1,
                provider_template_name: 'Vanguard',
                description: 'Broad US stock market exposure',
                asset_class: 'Equity',
                status: 'active',
                created_at: '2022-01-22'
              },
              {
                id: 2,
                name: 'Total Bond Market Index',
                ticker: 'VBTLX',
                provider_template_id: 1,
                provider_template_name: 'Vanguard',
                description: 'Broad US bond market exposure',
                asset_class: 'Fixed Income',
                status: 'active',
                created_at: '2022-01-23'
              },
              {
                id: 3,
                name: 'Total International Stock Index',
                ticker: 'VTIAX',
                provider_template_id: 1,
                provider_template_name: 'Vanguard',
                description: 'Broad international stock market exposure',
                asset_class: 'Equity',
                status: 'active',
                created_at: '2022-01-24'
              }
            ]
          });
        } else if (url.includes('portfolio-templates')) {
          return Promise.resolve({
            data: [
              {
                id: 1,
                name: 'Conservative Portfolio',
                description: '30% stocks, 70% bonds',
                status: 'active',
                created_at: '2022-02-10',
                fund_template_count: 2
              },
              {
                id: 2,
                name: 'Moderate Portfolio',
                description: '60% stocks, 40% bonds',
                status: 'active',
                created_at: '2022-02-12',
                fund_template_count: 2
              },
              {
                id: 3,
                name: 'Aggressive Portfolio',
                description: '90% stocks, 10% bonds',
                status: 'active',
                created_at: '2022-02-15',
                fund_template_count: 2
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      })
    }
  })
}));

describe('Definitions Component', () => {
  test('renders the definitions tabs', async () => {
    render(<Definitions />);
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Providers')).toBeInTheDocument();
    });
    
    // Check if all tabs are displayed
    expect(screen.getByRole('tab', { name: /providers/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /funds/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /portfolios/i })).toBeInTheDocument();
  });

  test('displays provider templates by default', async () => {
    render(<Definitions />);
    
    // Wait for the provider templates to load
    await waitFor(() => {
      expect(screen.getByText('Vanguard')).toBeInTheDocument();
    });
    
    // Check if the active provider templates are displayed
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.getByText('Fidelity')).toBeInTheDocument();
    
    // Inactive provider template should not be visible initially
    expect(screen.queryByText('JP Morgan')).not.toBeInTheDocument();
  });

  test('switches between definition tabs', async () => {
    render(<Definitions />);
    
    // Wait for the provider templates to load
    await waitFor(() => {
      expect(screen.getByText('Vanguard')).toBeInTheDocument();
    });
    
    // Click on Products tab
    const productsTab = screen.getByRole('tab', { name: /products/i });
    fireEvent.click(productsTab);
    
    // Product templates should be visible
    await waitFor(() => {
      expect(screen.getByText('IRA')).toBeInTheDocument();
    });
    expect(screen.getByText('Brokerage Account')).toBeInTheDocument();
    expect(screen.getByText('529 Plan')).toBeInTheDocument();
    
    // Provider templates should not be visible anymore
    expect(screen.queryByText('Leading provider of mutual funds and ETFs')).not.toBeInTheDocument();
    
    // Click on Funds tab
    const fundsTab = screen.getByRole('tab', { name: /funds/i });
    fireEvent.click(fundsTab);
    
    // Fund templates should be visible
    await waitFor(() => {
      expect(screen.getByText('Total Stock Market Index')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Bond Market Index')).toBeInTheDocument();
    expect(screen.getByText('Total International Stock Index')).toBeInTheDocument();
    
    // Click on Portfolios tab
    const portfoliosTab = screen.getByRole('tab', { name: /portfolios/i });
    fireEvent.click(portfoliosTab);
    
    // Portfolio templates should be visible
    await waitFor(() => {
      expect(screen.getByText('Conservative Portfolio')).toBeInTheDocument();
    });
    expect(screen.getByText('Moderate Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Aggressive Portfolio')).toBeInTheDocument();
  });

  test('filters provider templates based on search query', async () => {
    render(<Definitions />);
    
    // Wait for the provider templates to load
    await waitFor(() => {
      expect(screen.getByText('Vanguard')).toBeInTheDocument();
    });
    
    // Get the search input
    const searchInput = screen.getByPlaceholderText('Search providers...');
    
    // Search for 'Vanguard'
    fireEvent.change(searchInput, { target: { value: 'Vanguard' } });
    
    // Vanguard should be visible, but Fidelity should not
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.queryByText('Fidelity')).not.toBeInTheDocument();
    
    // Clear the search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // Both provider templates should be visible again
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.getByText('Fidelity')).toBeInTheDocument();
  });

  test('shows add button for each definition type', async () => {
    render(<Definitions />);
    
    // Wait for the provider templates to load
    await waitFor(() => {
      expect(screen.getByText('Vanguard')).toBeInTheDocument();
    });
    
    // Check if the add provider button is displayed
    expect(screen.getByRole('button', { name: /add provider/i })).toBeInTheDocument();
    
    // Click on Products tab
    const productsTab = screen.getByRole('tab', { name: /products/i });
    fireEvent.click(productsTab);
    
    // Check if the add product button is displayed
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument();
    });
    
    // Click on Funds tab
    const fundsTab = screen.getByRole('tab', { name: /funds/i });
    fireEvent.click(fundsTab);
    
    // Check if the add fund button is displayed
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add fund/i })).toBeInTheDocument();
    });
    
    // Click on Portfolios tab
    const portfoliosTab = screen.getByRole('tab', { name: /portfolios/i });
    fireEvent.click(portfoliosTab);
    
    // Check if the add portfolio button is displayed
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add portfolio/i })).toBeInTheDocument();
    });
  });
});
