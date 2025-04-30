import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Providers from '../pages/Providers';

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
              name: 'Vanguard',
              description: 'Leading provider of mutual funds and ETFs',
              contact_name: 'John Smith',
              contact_email: 'john.smith@vanguard.com',
              contact_phone: '(555) 123-4567',
              website: 'https://www.vanguard.com',
              status: 'active',
              created_at: '2022-01-15',
              product_count: 12
            },
            {
              id: 2,
              name: 'Fidelity',
              description: 'Financial services corporation',
              contact_name: 'Sarah Johnson',
              contact_email: 'sarah.johnson@fidelity.com',
              contact_phone: '(555) 234-5678',
              website: 'https://www.fidelity.com',
              status: 'active',
              created_at: '2022-02-20',
              product_count: 8
            },
            {
              id: 5,
              name: 'JP Morgan',
              description: 'Investment bank and financial services company',
              contact_name: 'Robert Wilson',
              contact_email: 'robert.wilson@jpmorgan.com',
              contact_phone: '(555) 567-8901',
              website: 'https://www.jpmorgan.com',
              status: 'inactive',
              created_at: '2022-05-12',
              product_count: 0
            }
          ]
        });
      })
    }
  })
}));

describe('Providers Component', () => {
  test('renders the providers list', async () => {
    render(<Providers />);
    
    // Wait for the providers to load
    await waitFor(() => {
      expect(screen.getByText('Vanguard')).toBeInTheDocument();
    });
    
    // Check if the active providers are displayed
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.getByText('Fidelity')).toBeInTheDocument();
    
    // Inactive provider should not be visible initially
    expect(screen.queryByText('JP Morgan')).not.toBeInTheDocument();
  });

  test('filters providers based on search query', async () => {
    render(<Providers />);
    
    // Wait for the providers to load
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
    
    // Both providers should be visible again
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.getByText('Fidelity')).toBeInTheDocument();
  });
});
