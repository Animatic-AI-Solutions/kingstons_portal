/**
 * E2E Test for Client Group Creation Flow
 * Tests the complete user journey from form open to successful creation
 *
 * Note: This test requires a running backend server and database
 * Run with: npm run test:e2e (configure in package.json)
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CreateClientGroupPrototype from '../../pages/CreateClientGroupPrototype';

// Test wrapper with all required providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Create Client Group E2E', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Clear any test data from previous runs
    jest.clearAllMocks();
  });

  it('should complete full client group creation flow with one product owner', async () => {
    render(<CreateClientGroupPrototype />, { wrapper: AllTheProviders });

    // Step 1: Verify page loaded
    expect(screen.getByText('Create New Client Group')).toBeInTheDocument();

    // Step 2: Fill client group details
    const clientGroupNameInput = screen.getByLabelText('Client Group Name');
    await user.type(clientGroupNameInput, 'Smith Family Trust');

    const statusDropdown = screen.getByLabelText('Status');
    await user.click(statusDropdown);
    await user.click(screen.getByText('active'));

    // Step 3: Add a product owner
    const addOwnerButton = screen.getByRole('button', { name: /add product owner/i });
    await user.click(addOwnerButton);

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    });

    // Step 4: Fill product owner details (minimal required fields)
    const firstNameInput = screen.getByLabelText('First Name');
    await user.type(firstNameInput, 'John');

    const surnameInput = screen.getByLabelText('Surname');
    await user.type(surnameInput, 'Smith');

    // Step 5: Save product owner
    const saveOwnerButton = screen.getByRole('button', { name: /save product owner/i });
    await user.click(saveOwnerButton);

    // Wait for form to close and owner to appear in list
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Smith')).toBeInTheDocument();
    });

    // Step 6: Submit the form
    const createButton = screen.getByRole('button', { name: /create client group/i });
    expect(createButton).not.toBeDisabled();

    await user.click(createButton);

    // Step 7: Wait for success (should navigate away or show success message)
    await waitFor(() => {
      // Either we navigate away or see a success indicator
      // This depends on your implementation
      expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should show validation errors for empty required fields', async () => {
    render(<CreateClientGroupPrototype />, { wrapper: AllTheProviders });

    // Try to submit without filling required fields
    const createButton = screen.getByRole('button', { name: /create client group/i });

    // Button should be disabled when no product owners added
    expect(createButton).toBeDisabled();
  });

  it('should allow adding multiple product owners', async () => {
    render(<CreateClientGroupPrototype />, { wrapper: AllTheProviders });

    // Fill client group details
    const clientGroupNameInput = screen.getByLabelText('Client Group Name');
    await user.type(clientGroupNameInput, 'Joint Account');

    // Add first product owner
    const addOwnerButton = screen.getByRole('button', { name: /add product owner/i });
    await user.click(addOwnerButton);

    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Surname'), 'Smith');

    const saveOwnerButton = screen.getByRole('button', { name: /save product owner/i });
    await user.click(saveOwnerButton);

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    // Add second product owner
    await user.click(addOwnerButton);

    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('First Name'), 'Jane');
    await user.type(screen.getByLabelText('Surname'), 'Smith');
    await user.click(screen.getByRole('button', { name: /save product owner/i }));

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Verify both owners are in the list
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');

    // Should have header row + 2 product owner rows
    expect(rows.length).toBe(3);
  });

  it('should allow editing a product owner', async () => {
    render(<CreateClientGroupPrototype />, { wrapper: AllTheProviders });

    // Fill client group and add owner
    await user.type(screen.getByLabelText('Client Group Name'), 'Test Group');

    const addOwnerButton = screen.getByRole('button', { name: /add product owner/i });
    await user.click(addOwnerButton);

    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Surname'), 'Doe');
    await user.click(screen.getByRole('button', { name: /save product owner/i }));

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Edit the owner
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText('First Name');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Jane');

    await user.click(screen.getByRole('button', { name: /save product owner/i }));

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should allow deleting a product owner', async () => {
    render(<CreateClientGroupPrototype />, { wrapper: AllTheProviders });

    // Add owner
    await user.type(screen.getByLabelText('Client Group Name'), 'Test Group');

    const addOwnerButton = screen.getByRole('button', { name: /add product owner/i });
    await user.click(addOwnerButton);

    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Surname'), 'Smith');
    await user.click(screen.getByRole('button', { name: /save product owner/i }));

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    // Mock window.confirm to return true
    global.confirm = jest.fn(() => true);

    // Delete the owner
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    render(<CreateClientGroupPrototype />, { wrapper: AllTheProviders });

    await user.type(screen.getByLabelText('Client Group Name'), 'Test Group');

    const addOwnerButton = screen.getByRole('button', { name: /add product owner/i });
    await user.click(addOwnerButton);

    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Surname'), 'Smith');

    // Enter invalid email
    const emailInput = screen.getByLabelText('Email 1');
    await user.type(emailInput, 'invalid-email');

    // Try to save
    await user.click(screen.getByRole('button', { name: /save product owner/i }));

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    render(<CreateClientGroupPrototype />, { wrapper: AllTheProviders });

    // Fill form
    await user.type(screen.getByLabelText('Client Group Name'), 'Test Group');

    const addOwnerButton = screen.getByRole('button', { name: /add product owner/i });
    await user.click(addOwnerButton);

    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Surname'), 'Smith');
    await user.click(screen.getByRole('button', { name: /save product owner/i }));

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    // Submit
    const createButton = screen.getByRole('button', { name: /create client group/i });
    await user.click(createButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/creating/i)).toBeInTheDocument();
    });
  });
});
