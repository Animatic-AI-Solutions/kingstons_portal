import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Reporting from '../pages/Reporting';

// Mock components and hooks
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    api: {
      get: jest.fn().mockImplementation((url) => {
        if (url.includes('analytics/company')) {
          return Promise.resolve({
            data: {
              total_fum: 5250000,
              irr_all_time: 7.8,
              irr_ytd: 5.2,
              irr_1y: 6.5,
              irr_3y: 8.2,
              irr_5y: 9.1,
              client_count: 45,
              account_count: 72,
              active_holding_count: 156
            }
          });
        } else if (url.includes('analytics/clients')) {
          return Promise.resolve({
            data: [
              {
                id: 1,
                name: 'John Smith',
                total_fum: 250000,
                irr_all_time: 8.5,
                irr_ytd: 4.8,
                irr_1y: 7.2,
                account_count: 2
              },
              {
                id: 2,
                name: 'Mary Williams',
                total_fum: 175000,
                irr_all_time: 6.2,
                irr_ytd: 3.5,
                irr_1y: 5.8,
                account_count: 1
              },
              {
                id: 3,
                name: 'Robert Davis',
                total_fum: 325000,
                irr_all_time: 9.1,
                irr_ytd: 6.2,
                irr_1y: 8.5,
                account_count: 3
              }
            ]
          });
        } else if (url.includes('analytics/accounts')) {
          return Promise.resolve({
            data: [
              {
                id: 1,
                name: 'Retirement Account',
                client_name: 'John Smith',
                total_value: 150000,
                irr_all_time: 8.5,
                irr_ytd: 4.8,
                irr_1y: 7.2,
                holding_count: 3
              },
              {
                id: 2,
                name: 'College Savings',
                client_name: 'John Smith',
                total_value: 75000,
                irr_all_time: 6.2,
                irr_ytd: 3.5,
                irr_1y: 5.8,
                holding_count: 2
              },
              {
                id: 3,
                name: 'Investment Account',
                client_name: 'Mary Williams',
                total_value: 125000,
                irr_all_time: 7.8,
                irr_ytd: 5.2,
                irr_1y: 6.5,
                holding_count: 4
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      })
    }
  })
}));

describe('Reporting Component', () => {
  test('renders the company overview section', async () => {
    render(<Reporting />);
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Company Overview')).toBeInTheDocument();
    });
    
    // Check if the company metrics are displayed
    expect(screen.getByText('$5,250,000')).toBeInTheDocument(); // Total FUM
    expect(screen.getByText('7.8%')).toBeInTheDocument(); // IRR All Time
    expect(screen.getByText('45')).toBeInTheDocument(); // Client Count
    expect(screen.getByText('72')).toBeInTheDocument(); // Account Count
  });

  test('switches between report tabs', async () => {
    render(<Reporting />);
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Company Overview')).toBeInTheDocument();
    });
    
    // Client Performance tab should be active by default
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Mary Williams')).toBeInTheDocument();
    expect(screen.getByText('Robert Davis')).toBeInTheDocument();
    
    // Click on Account Performance tab
    const accountTab = screen.getByRole('tab', { name: /account performance/i });
    fireEvent.click(accountTab);
    
    // Account Performance data should be visible
    expect(screen.getByText('Retirement Account')).toBeInTheDocument();
    expect(screen.getByText('College Savings')).toBeInTheDocument();
    expect(screen.getByText('Investment Account')).toBeInTheDocument();
    
    // Client data should not be visible anymore
    expect(screen.queryByText('Robert Davis')).not.toBeInTheDocument();
  });

  test('filters performance data based on search query', async () => {
    render(<Reporting />);
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Get the search input
    const searchInput = screen.getByPlaceholderText('Search clients...');
    
    // Search for 'John'
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // John Smith should be visible, but others should not
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.queryByText('Mary Williams')).not.toBeInTheDocument();
    expect(screen.queryByText('Robert Davis')).not.toBeInTheDocument();
    
    // Clear the search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // All clients should be visible again
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Mary Williams')).toBeInTheDocument();
    expect(screen.getByText('Robert Davis')).toBeInTheDocument();
  });

  test('changes time period for IRR display', async () => {
    render(<Reporting />);
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // All Time IRR should be visible by default
    expect(screen.getByText('8.5%')).toBeInTheDocument(); // John Smith's All Time IRR
    
    // Get the time period selector
    const periodSelector = screen.getByLabelText('Select Time Period');
    
    // Change to YTD
    fireEvent.change(periodSelector, { target: { value: 'ytd' } });
    
    // YTD IRR should be visible
    expect(screen.getByText('4.8%')).toBeInTheDocument(); // John Smith's YTD IRR
    
    // Change to 1 Year
    fireEvent.change(periodSelector, { target: { value: '1y' } });
    
    // 1 Year IRR should be visible
    expect(screen.getByText('7.2%')).toBeInTheDocument(); // John Smith's 1Y IRR
  });

  test('sorts performance data by different columns', async () => {
    render(<Reporting />);
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Get the sort selector
    const sortSelector = screen.getByLabelText('Sort By');
    
    // Sort by Total FUM
    fireEvent.change(sortSelector, { target: { value: 'total_fum' } });
    
    // The clients should be sorted by FUM (default descending)
    const clientRows = screen.getAllByRole('row').slice(1); // Skip header row
    expect(clientRows[0]).toHaveTextContent('Robert Davis');
    expect(clientRows[1]).toHaveTextContent('John Smith');
    expect(clientRows[2]).toHaveTextContent('Mary Williams');
    
    // Get the sort direction button
    const sortDirectionButton = screen.getByRole('button', { name: /sort direction/i });
    
    // Change to ascending
    fireEvent.click(sortDirectionButton);
    
    // The clients should be sorted by FUM in ascending order
    const updatedClientRows = screen.getAllByRole('row').slice(1); // Skip header row
    expect(updatedClientRows[0]).toHaveTextContent('Mary Williams');
    expect(updatedClientRows[1]).toHaveTextContent('John Smith');
    expect(updatedClientRows[2]).toHaveTextContent('Robert Davis');
  });
});
