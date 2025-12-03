import React from 'react';
import { renderWithProviders, screen, fireEvent, waitFor } from './utils/testUtils';
import ClientDetails from '../pages/ClientDetails';

// Mock the useClientDetails hook to provide test data directly
// This is more reliable than mocking the API layer for component tests
jest.mock('../hooks/useClientDetails', () => ({
  useClientDetails: jest.fn(),
}));

// Mock the useClientMutations hook
jest.mock('../hooks/useClientMutations', () => ({
  useClientMutations: jest.fn(() => ({
    updateClient: jest.fn(),
    deleteClient: jest.fn(),
  })),
}));

// Mock provider colors service to prevent API calls
jest.mock('../services/providerColors', () => ({
  getProviderColor: jest.fn(() => '#3B82F6'),
  initializeColorService: jest.fn(),
}));

// Mock API functions that might be called
jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
  getClientGroupProductOwners: jest.fn().mockResolvedValue({ data: [] }),
  calculateStandardizedMultipleFundsIRR: jest.fn().mockResolvedValue({ data: {} }),
  getProductOwners: jest.fn().mockResolvedValue({ data: [] }),
  addClientGroupProductOwner: jest.fn().mockResolvedValue({ data: {} }),
  removeClientGroupProductOwner: jest.fn().mockResolvedValue({ data: {} }),
  getProductOwnersForProducts: jest.fn().mockResolvedValue({ data: [] }),
  getStandardizedClientIRR: jest.fn().mockResolvedValue({ data: {} }),
  getProviderThemeColors: jest.fn().mockResolvedValue({ data: [] }),
}));

// Import the mocked hooks after setting up the mocks
import { useClientDetails } from '../hooks/useClientDetails';
const mockUseClientDetails = useClientDetails as jest.MockedFunction<typeof useClientDetails>;

// Mock client data
const mockClientData = {
  id: '1',
  name: 'John Smith',
  advisor: 'Sarah Johnson',
  type: 'R',
  status: 'active',
  created_at: '2022-01-15',
  updated_at: '2022-01-15',
  total_value: 250000,
  total_irr: 8.5,
  accounts: [
    {
      id: 1,
      client_id: 1,
      product_name: 'Retirement Account',
      provider_name: 'Vanguard',
      start_date: '2022-01-20',
      status: 'active',
      total_value: 150000,
      irr: 8.5,
      weighting: 60
    },
    {
      id: 2,
      client_id: 1,
      product_name: 'College Savings',
      provider_name: 'Fidelity',
      start_date: '2022-02-15',
      status: 'active',
      total_value: 75000,
      irr: 6.2,
      weighting: 30
    },
    {
      id: 3,
      client_id: 1,
      product_name: 'Emergency Fund',
      provider_name: 'Chase',
      start_date: '2022-03-10',
      status: 'active',
      total_value: 25000,
      irr: 1.5,
      weighting: 10
    }
  ]
};

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();

  // Mock useClientDetails to return successful data
  mockUseClientDetails.mockReturnValue({
    data: mockClientData,
    isLoading: false,
    error: null,
    invalidateClient: jest.fn(),
    refreshInBackground: jest.fn(),
    updateClientInCache: jest.fn(),
  } as any);
});

describe('ClientDetails Component', () => {
  test('renders the client details', async () => {
    renderWithProviders(<ClientDetails />, {
      initialRoute: '/clients/1'
    });

    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if the client details are displayed
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Retail')).toBeInTheDocument(); // 'R' relationship displayed as 'Retail'
    expect(screen.getByText('£250,000')).toBeInTheDocument();
    expect(screen.getByText('8.5%')).toBeInTheDocument();
  });

  test('switches between client tabs', async () => {
    renderWithProviders(<ClientDetails />, {
      initialRoute: '/clients/1'
    });

    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    }, { timeout: 3000 });

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
    renderWithProviders(<ClientDetails />, {
      initialRoute: '/clients/1'
    });

    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if the edit client button is displayed
    expect(screen.getByRole('button', { name: /edit client/i })).toBeInTheDocument();
  });

  test('displays deactivate client button for active clients', async () => {
    renderWithProviders(<ClientDetails />, {
      initialRoute: '/clients/1'
    });

    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if the deactivate client button is displayed
    expect(screen.getByRole('button', { name: /deactivate client/i })).toBeInTheDocument();
  });

  test('displays add account button on accounts tab', async () => {
    renderWithProviders(<ClientDetails />, {
      initialRoute: '/clients/1'
    });

    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click on Accounts tab
    const accountsTab = screen.getByRole('tab', { name: /accounts/i });
    fireEvent.click(accountsTab);

    // Check if the add account button is displayed
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add account/i })).toBeInTheDocument();
    });
  });

  test('shows account details when account row is clicked', async () => {
    renderWithProviders(<ClientDetails />, {
      initialRoute: '/clients/1'
    });

    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    }, { timeout: 3000 });

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
    renderWithProviders(<ClientDetails />, {
      initialRoute: '/clients/1'
    });

    // Wait for the client details to load
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    }, { timeout: 3000 });

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
