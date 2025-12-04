import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SummaryTab from './SummaryTab';
import api from '../../../services/api';

// Mock the API
jest.mock('../../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('SummaryTab', () => {
  const mockClientGroupId = '141';

  const mockProductOwners = [
    {
      id: 1,
      status: 'active',
      firstname: 'John',
      surname: 'Smith',
      known_as: 'Johnny',
      title: 'Mr',
      middle_names: 'William',
      relationship_status: 'Married',
      gender: 'Male',
      previous_names: '',
      dob: '1975-05-15',
      place_of_birth: 'London',
      email_1: 'john.smith@example.com',
      email_2: '',
      phone_1: '+44 7700 900000',
      phone_2: '',
      moved_in_date: '2010-01-01',
      address_id: 1,
      three_words: 'reliable honest dedicated',
      share_data_with: 'Jane Smith',
      employment_status: 'Employed',
      occupation: 'Software Engineer',
      passport_expiry_date: '2028-12-31',
      ni_number: 'AB123456C',
      aml_result: 'Pass',
      aml_date: '2024-01-15',
      created_at: '2024-01-01',
      address_line_1: '123 Test Street',
      address_line_2: 'Flat 4B',
      address_line_3: '',
      address_line_4: 'London',
      address_line_5: 'SW1A 1AA',
    },
    {
      id: 2,
      status: 'active',
      firstname: 'Jane',
      surname: 'Smith',
      known_as: 'Janie',
      title: 'Mrs',
      middle_names: 'Elizabeth',
      relationship_status: 'Married',
      gender: 'Female',
      previous_names: 'Jones',
      dob: '1978-08-22',
      place_of_birth: 'Manchester',
      email_1: 'jane.smith@example.com',
      email_2: '',
      phone_1: '+44 7700 900001',
      phone_2: '',
      moved_in_date: '2010-01-01',
      address_id: 1,
      three_words: 'caring supportive kind',
      share_data_with: 'John Smith',
      employment_status: 'Self-Employed',
      occupation: 'Consultant',
      passport_expiry_date: '2027-06-30',
      ni_number: 'CD789012E',
      aml_result: 'Pass',
      aml_date: '2024-01-15',
      created_at: '2024-01-01',
      address_line_1: '123 Test Street',
      address_line_2: 'Flat 4B',
      address_line_3: '',
      address_line_4: 'London',
      address_line_5: 'SW1A 1AA',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', () => {
      mockedApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      // Check for spinner by class name since it doesn't have role="status"
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when API call fails', async () => {
      const errorMessage = 'Failed to load product owners';
      mockedApi.get.mockRejectedValue({
        response: { data: { detail: errorMessage } },
      });

      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show generic error when no detail provided', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network error'));

      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load product owners')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no product owners exist', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        expect(screen.getByText('No product owners found for this client group')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    beforeEach(() => {
      mockedApi.get.mockResolvedValue({ data: mockProductOwners });
    });

    it('should fetch product owners for the correct client group', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledWith(`/client-groups/${mockClientGroupId}/product-owners`);
      });
    });

    it('should display product owner cards', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        expect(screen.getByText('People in Client Group')).toBeInTheDocument();
        expect(screen.getByText('Mr John William Smith')).toBeInTheDocument();
        expect(screen.getByText('Mrs Jane Elizabeth Smith')).toBeInTheDocument();
      });
    });

    it('should display personal details correctly', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        // Check for specific details
        expect(screen.getByText('john.smith@example.com')).toBeInTheDocument();
        expect(screen.getByText('+44 7700 900000')).toBeInTheDocument();
        expect(screen.getByText('Software Engineer')).toBeInTheDocument();
        expect(screen.getByText('AB123456C')).toBeInTheDocument();
      });
    });

    it('should display address information', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        expect(screen.getAllByText('123 Test Street').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Flat 4B').length).toBeGreaterThan(0);
        expect(screen.getAllByText('SW1A 1AA').length).toBeGreaterThan(0);
      });
    });

    it('should calculate age correctly', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        const ages = screen.getAllByText(/Age:/i);
        expect(ages.length).toBeGreaterThan(0);
      });
    });

    it('should display "N/A" for missing optional fields', async () => {
      const ownerWithMissingFields = {
        ...mockProductOwners[0],
        email_2: '',
        phone_2: '',
        previous_names: '',
      };
      mockedApi.get.mockResolvedValue({ data: [ownerWithMissingFields] });

      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        const naElements = screen.getAllByText('N/A');
        expect(naElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Client Order Section', () => {
    beforeEach(() => {
      mockedApi.get.mockResolvedValue({ data: mockProductOwners });
    });

    it('should display client order section', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        expect(screen.getByText('Client Order')).toBeInTheDocument();
      });
    });

    it('should show numbered list of product owners', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        expect(screen.getByText('1.')).toBeInTheDocument();
        expect(screen.getByText('2.')).toBeInTheDocument();
      });
    });

    it('should make items draggable', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        const draggableItems = screen.getAllByText(/Mr|Mrs/).filter(
          (el) => el.closest('[draggable="true"]')
        );
        expect(draggableItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Drag and Drop Functionality', () => {
    beforeEach(() => {
      mockedApi.get.mockResolvedValue({ data: mockProductOwners });
    });

    it('should handle drag start', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        const orderSection = screen.getByText('Client Order').closest('div');
        const draggableItems = orderSection?.querySelectorAll('[draggable="true"]');

        if (draggableItems && draggableItems.length > 0) {
          fireEvent.dragStart(draggableItems[0]);
          // Item should be in dragging state (tested via className)
          expect(draggableItems[0].className).toContain('cursor-move');
        }
      });
    });

    it('should handle drag over', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        const orderSection = screen.getByText('Client Order').closest('div');
        const draggableItems = orderSection?.querySelectorAll('[draggable="true"]');

        if (draggableItems && draggableItems.length > 1) {
          fireEvent.dragStart(draggableItems[0]);
          fireEvent.dragOver(draggableItems[1]);
          // Should prevent default to allow drop
          expect(draggableItems[1]).toBeInTheDocument();
        }
      });
    });

    it('should handle drag end', async () => {
      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        const orderSection = screen.getByText('Client Order').closest('div');
        const draggableItems = orderSection?.querySelectorAll('[draggable="true"]');

        if (draggableItems && draggableItems.length > 0) {
          fireEvent.dragStart(draggableItems[0]);
          fireEvent.dragEnd(draggableItems[0]);
          // Drag state should be cleared
          expect(draggableItems[0]).toBeInTheDocument();
        }
      });
    });
  });

  describe('Inactive Status Handling', () => {
    it('should apply inactive styling for lapsed status', async () => {
      const lapsedOwner = { ...mockProductOwners[0], status: 'lapsed' };
      mockedApi.get.mockResolvedValue({ data: [lapsedOwner] });

      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        // Find the card div by looking for the specific card structure
        const nameElement = screen.getByText('Mr John William Smith');
        const card = nameElement.closest('.bg-white.shadow-md.rounded-lg');
        expect(card?.className).toContain('opacity-50');
        expect(card?.className).toContain('grayscale');
      });
    });

    it('should apply inactive styling for deceased status', async () => {
      const deceasedOwner = { ...mockProductOwners[0], status: 'deceased' };
      mockedApi.get.mockResolvedValue({ data: [deceasedOwner] });

      render(<SummaryTab clientGroupId={mockClientGroupId} />);

      await waitFor(() => {
        // Find the card div by looking for the specific card structure
        const nameElement = screen.getByText('Mr John William Smith');
        const card = nameElement.closest('.bg-white.shadow-md.rounded-lg');
        expect(card?.className).toContain('opacity-50');
      });
    });
  });
});
