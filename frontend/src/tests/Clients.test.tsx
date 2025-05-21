import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Clients from '../pages/Clients';

// Mock components and hooks
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    api: {
      get: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          data: [
            {
              id: 1,
              name: 'John Smith',
              advisor: 'Sarah Johnson',
              relationship: 'R',
              status: 'active',
              created_at: '2022-01-15',
              total_fum: 250000
            },
            {
              id: 2,
              name: 'Mary Williams',
              advisor: 'David Brown',
              relationship: 'S',
              status: 'active',
              created_at: '2022-02-20',
              total_fum: 175000
            },
            {
              id: 3,
              name: 'Robert Davis',
              advisor: 'Sarah Johnson',
              relationship: 'T',
              status: 'inactive',
              created_at: '2022-03-10',
              total_fum: 0
            }
          ]
        });
      })
    }
  })
}));

describe('Clients Component', () => {
  test('renders the clients list', async () => {
    render(<Clients />);
    
    // Wait for the clients to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Check if the active clients are displayed
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Mary Williams')).toBeInTheDocument();
    
    // Inactive client should not be visible initially
    expect(screen.queryByText('Robert Davis')).not.toBeInTheDocument();
  });

  test('filters clients based on search query', async () => {
    render(<Clients />);
    
    // Wait for the clients to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Get the search input
    const searchInput = screen.getByPlaceholderText('Search clients...');
    
    // Search for 'John'
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // John Smith should be visible, but Mary Williams should not
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.queryByText('Mary Williams')).not.toBeInTheDocument();
    
    // Clear the search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // Both clients should be visible again
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Mary Williams')).toBeInTheDocument();
  });

  test('filters clients by advisor', async () => {
    render(<Clients />);
    
    // Wait for the clients to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Get the advisor filter dropdown
    const advisorFilter = screen.getByLabelText('Filter by Advisor');
    
    // Filter by 'Sarah Johnson'
    fireEvent.change(advisorFilter, { target: { value: 'Sarah Johnson' } });
    
    // John Smith should be visible, but Mary Williams should not
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.queryByText('Mary Williams')).not.toBeInTheDocument();
    
    // Clear the filter
    fireEvent.change(advisorFilter, { target: { value: '' } });
    
    // Both clients should be visible again
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Mary Williams')).toBeInTheDocument();
  });

  test('displays client FUM in correct format', async () => {
    render(<Clients />);
    
    // Wait for the clients to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Check if the FUM is displayed in the correct format
    expect(screen.getByText('£250,000')).toBeInTheDocument();
    expect(screen.getByText('£175,000')).toBeInTheDocument();
  });
});
