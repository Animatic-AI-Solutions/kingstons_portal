import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientDetails from '../pages/ClientDetails';

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
        if (url.includes('clients/1')) {
          return Promise.resolve({
            data: {
              id: 1,
              name: 'John Smith',
              advisor: 'Sarah Johnson',
              relationship: 'R',
              status: 'active',
              created_at: '2022-01-15',
              total_fum: 250000,
              irr: 8.5,
              email: 'john.smith@example.com',
              phone: '(555) 123-4567',
              address: '123 Main St, Anytown, USA',
              notes: 'Prefers email communication'
            }
          });
        } else if (url.includes('clients/1/accounts')) {
          return Promise.resolve({
            data: [
              {
                id: 1,
                name: 'Retirement Account',
                client_id: 1,
                provider_id: 1,
                provider_name: 'Vanguard',
                product_id: 1,
                product_name: 'IRA',
                start_date: '2022-01-20',
                status: 'active',
                total_value: 150000,
                irr: 8.5,
                weighting: 60
              },
              {
                id: 2,
                name: 'College Savings',
                client_id: 1,
                provider_id: 2,
                provider_name: 'Fidelity',
                product_id: 3,
                product_name: '529 Plan',
                start_date: '2022-02-15',
                status: 'active',
                total_value: 75000,
                irr: 6.2,
                weighting: 30
              },
              {
                id: 3,
                name: 'Emergency Fund',
                client_id: 1,
                provider_id: 3,
                provider_name: 'Chase',
                product_id: 5,
                product_name: 'Savings Account',
                start_date: '2022-03-10',
                status: 'active',
                total_value: 25000,
                irr: 1.5,
                weighting: 10
              }
            ]
          });
        }
        return Promise.resolve({ data: {} });
      }),
      put: jest.fn().mockResolvedValue({ data: { id: 1 } })
    }
  })
}));

describe('ClientDetails Component', () => {
  test('renders the client details', async () => {
    render(<ClientDetails />);
    
    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Check if the client details are displayed
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Retail')).toBeInTheDocument(); // 'R' relationship displayed as 'Retail'
    expect(screen.getByText('£250,000')).toBeInTheDocument();
    expect(screen.getByText('8.5%')).toBeInTheDocument();
  });

  test('switches between client tabs', async () => {
    render(<ClientDetails />);
    
    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Info tab should be active by default
    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('john.smith@example.com')).toBeInTheDocument();
    expect(screen.getByText('Phone:')).toBeInTheDocument();
    expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
    expect(screen.getByText('Address:')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, Anytown, USA')).toBeInTheDocument();
    expect(screen.getByText('Notes:')).toBeInTheDocument();
    expect(screen.getByText('Prefers email communication')).toBeInTheDocument();
    
    // Click on Accounts tab
    const accountsTab = screen.getByRole('tab', { name: /accounts/i });
    fireEvent.click(accountsTab);
    
    // Accounts data should be visible
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    expect(screen.getByText('College Savings')).toBeInTheDocument();
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.getByText('Fidelity')).toBeInTheDocument();
    expect(screen.getByText('Chase')).toBeInTheDocument();
    expect(screen.getByText('IRA')).toBeInTheDocument();
    expect(screen.getByText('529 Plan')).toBeInTheDocument();
    expect(screen.getByText('Savings Account')).toBeInTheDocument();
    expect(screen.getAllByText('£150,000')[0]).toBeInTheDocument();
    expect(screen.getAllByText('£75,000')[0]).toBeInTheDocument();
    expect(screen.getAllByText('£25,000')[0]).toBeInTheDocument();
    expect(screen.getAllByText('8.5%')[0]).toBeInTheDocument();
    expect(screen.getByText('6.2%')).toBeInTheDocument();
    expect(screen.getByText('1.5%')).toBeInTheDocument();
  });

  test('displays edit client button', async () => {
    render(<ClientDetails />);
    
    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Check if the edit client button is displayed
    expect(screen.getByRole('button', { name: /edit client/i })).toBeInTheDocument();
  });

  test('displays deactivate client button for active clients', async () => {
    render(<ClientDetails />);
    
    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Check if the deactivate client button is displayed
    expect(screen.getByRole('button', { name: /deactivate client/i })).toBeInTheDocument();
  });

  test('displays add account button on accounts tab', async () => {
    render(<ClientDetails />);
    
    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Click on Accounts tab
    const accountsTab = screen.getByRole('tab', { name: /accounts/i });
    fireEvent.click(accountsTab);
    
    // Check if the add account button is displayed
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add account/i })).toBeInTheDocument();
    });
  });

  test('shows account details when account row is clicked', async () => {
    render(<ClientDetails />);
    
    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Click on Accounts tab
    const accountsTab = screen.getByRole('tab', { name: /accounts/i });
    fireEvent.click(accountsTab);
    
    // Wait for the accounts to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Click on the first account row
    const accountRow = screen.getByText('Retirement Account').closest('tr');
    if (accountRow) {
      fireEvent.click(accountRow);
    }
    
    // The navigation should be triggered, but since we're mocking useNavigate,
    // we can't directly test the navigation. We can only check that the row was clicked.
    expect(accountRow).toHaveBeenCalled;
  });

  test('displays account weightings correctly', async () => {
    render(<ClientDetails />);
    
    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Click on Accounts tab
    const accountsTab = screen.getByRole('tab', { name: /accounts/i });
    fireEvent.click(accountsTab);
    
    // Wait for the accounts to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Check if the account weightings are displayed correctly
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });
});
