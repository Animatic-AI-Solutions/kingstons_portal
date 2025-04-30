import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Accounts from '../pages/Accounts';

// Mock components and hooks
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    api: {
      get: jest.fn().mockImplementation((url) => {
        if (url.includes('accounts')) {
          return Promise.resolve({
            data: [
              {
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
                irr: 8.5
              },
              {
                id: 2,
                name: 'College Savings',
                client_id: 1,
                client_name: 'John Smith',
                provider_id: 2,
                provider_name: 'Fidelity',
                product_id: 3,
                product_name: '529 Plan',
                start_date: '2022-02-15',
                status: 'active',
                total_value: 75000,
                irr: 6.2
              },
              {
                id: 3,
                name: 'Investment Account',
                client_id: 2,
                client_name: 'Mary Williams',
                provider_id: 1,
                provider_name: 'Vanguard',
                product_id: 2,
                product_name: 'Brokerage Account',
                start_date: '2022-03-10',
                status: 'active',
                total_value: 125000,
                irr: 7.8
              },
              {
                id: 4,
                name: 'Old 401k',
                client_id: 3,
                client_name: 'Robert Davis',
                provider_id: 3,
                provider_name: 'JP Morgan',
                product_id: 4,
                product_name: '401k',
                start_date: '2021-11-05',
                status: 'inactive',
                total_value: 0,
                irr: 0
              }
            ]
          });
        } else if (url.includes('clients')) {
          return Promise.resolve({
            data: [
              { id: 1, name: 'John Smith' },
              { id: 2, name: 'Mary Williams' },
              { id: 3, name: 'Robert Davis' }
            ]
          });
        } else if (url.includes('providers')) {
          return Promise.resolve({
            data: [
              { id: 1, name: 'Vanguard' },
              { id: 2, name: 'Fidelity' },
              { id: 3, name: 'JP Morgan' }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      })
    }
  })
}));

describe('Accounts Component', () => {
  test('renders the accounts list', async () => {
    render(<Accounts />);
    
    // Wait for the accounts to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Check if the active accounts are displayed
    expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    expect(screen.getByText('College Savings')).toBeInTheDocument();
    expect(screen.getByText('Investment Account')).toBeInTheDocument();
    
    // Inactive account should not be visible initially
    expect(screen.queryByText('Old 401k')).not.toBeInTheDocument();
  });

  test('filters accounts based on search query', async () => {
    render(<Accounts />);
    
    // Wait for the accounts to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Get the search input
    const searchInput = screen.getByPlaceholderText('Search accounts...');
    
    // Search for 'Retirement'
    fireEvent.change(searchInput, { target: { value: 'Retirement' } });
    
    // Retirement Account should be visible, but others should not
    expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    expect(screen.queryByText('College Savings')).not.toBeInTheDocument();
    expect(screen.queryByText('Investment Account')).not.toBeInTheDocument();
    
    // Clear the search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // All accounts should be visible again
    expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    expect(screen.getByText('College Savings')).toBeInTheDocument();
    expect(screen.getByText('Investment Account')).toBeInTheDocument();
  });

  test('groups accounts by client when toggle is clicked', async () => {
    render(<Accounts />);
    
    // Wait for the accounts to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Get the group by client toggle
    const groupToggle = screen.getByLabelText('Group by Client');
    
    // Click the toggle
    fireEvent.click(groupToggle);
    
    // Client names should be visible as group headers
    expect(screen.getByText('John Smith (2)')).toBeInTheDocument();
    expect(screen.getByText('Mary Williams (1)')).toBeInTheDocument();
    
    // Accounts should still be visible under their respective clients
    expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    expect(screen.getByText('College Savings')).toBeInTheDocument();
    expect(screen.getByText('Investment Account')).toBeInTheDocument();
    
    // Click the toggle again to ungroup
    fireEvent.click(groupToggle);
    
    // Client group headers should no longer be visible
    expect(screen.queryByText('John Smith (2)')).not.toBeInTheDocument();
    expect(screen.queryByText('Mary Williams (1)')).not.toBeInTheDocument();
    
    // All accounts should still be visible
    expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    expect(screen.getByText('College Savings')).toBeInTheDocument();
    expect(screen.getByText('Investment Account')).toBeInTheDocument();
  });

  test('displays account values and IRR in correct format', async () => {
    render(<Accounts />);
    
    // Wait for the accounts to load
    await waitFor(() => {
      expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    });
    
    // Check if the values and IRR are displayed in the correct format
    expect(screen.getByText('$150,000')).toBeInTheDocument();
    expect(screen.getByText('8.5%')).toBeInTheDocument();
    expect(screen.getByText('$75,000')).toBeInTheDocument();
    expect(screen.getByText('6.2%')).toBeInTheDocument();
  });
});
