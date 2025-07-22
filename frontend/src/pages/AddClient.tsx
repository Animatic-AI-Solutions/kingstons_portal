import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigationRefresh } from '../hooks/useNavigationRefresh';
import { 
  BaseInput, 
  InputLabel, 
  InputError,
  ActionButton,
  DateInput
} from '../components/ui';
import { CreatableDropdown, BaseDropdown } from '../components/ui';
import DynamicPageContainer from '../components/DynamicPageContainer';

interface ClientFormData {
  name: string;
  status: string;
  advisor: string | null;
  type: string;
  created_at: string | null;
}

const AddClient: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const { navigateWithSuccessMessage, navigateToClientGroups } = useNavigationRefresh();
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    status: 'active',
    advisor: null,
    type: 'Family',
    created_at: null
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advisors, setAdvisors] = useState<string[]>([]);

  // Fetch advisors on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch existing client groups to get unique advisor names
        const clientGroupsResponse = await api.get('/client_groups');
        const uniqueAdvisors = [...new Set(
          clientGroupsResponse.data
            .map((client: any) => client.advisor)
            .filter((advisor: string) => advisor !== null && advisor.trim() !== '')
        )] as string[];
        setAdvisors(uniqueAdvisors);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [api]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
  };

  const handleCreateAdvisor = async (advisorName: string) => {
    try {
      // For now, we'll add the advisor to the local list since there's no specific advisor API endpoint
      // In a real implementation, you might want to create an advisor record in the database
      const newAdvisor = advisorName.trim();
      
      if (!newAdvisor) {
        throw new Error('Advisor name cannot be empty');
      }

      // Add to the local advisors list if it doesn't exist
      if (!advisors.includes(newAdvisor)) {
        setAdvisors(prevAdvisors => [...prevAdvisors, newAdvisor]);
      }

      // Return the option object for the CreatableDropdown
      return {
        value: newAdvisor,
        label: newAdvisor
      };
    } catch (err) {
      console.error('Error creating advisor:', err);
      setError('Failed to create advisor. Please try again.');
      // Return a fallback option instead of null
      return {
        value: advisorName.trim(),
        label: advisorName.trim()
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare form data with created_at handling
      const submitData = {
        ...formData,
        created_at: formData.created_at || new Date().toISOString() // Default to current date if not provided
      };
      
      console.log('Creating client with data:', submitData);
      
      const response = await api.post('/client_groups', submitData);
      
      console.log('Client created successfully:', response.data);
      
      // Navigate back to clients list with success message and refresh data
      navigateWithSuccessMessage(
        '/client_groups',
        `Client group "${formData.name}" created successfully`
      );
    } catch (err: any) {
      setError(`Failed to create client: ${JSON.stringify(err.response?.data || err.message)}`);
      console.error('Error creating client:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prepare options for dropdowns
  const advisorOptions = advisors.map(advisor => ({
    value: advisor,
    label: advisor
  }));

  const typeOptions = [
    { value: 'Family', label: 'Family' },
    { value: 'Business', label: 'Business' },
    { value: 'Trust', label: 'Trust' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'dormant', label: 'Dormant' }
  ];

  return (
    <DynamicPageContainer 
      maxWidth="2800px"
      className="py-3"
    >
      {/* Breadcrumb Navigation */}
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/client_groups" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Client Groups
            </Link>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">Add New Client Group</span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="mb-4">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Add New Client Group</h1>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <InputError showIcon>
                {error}
              </InputError>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BaseInput
              id="name"
              name="name"
              type="text"
              label="Client Group Name"
              placeholder="Enter client group name"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="off"
              error={error && !formData.name ? 'Client name is required' : undefined}
              helperText="This will be the primary identifier for the client group"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />

            <div>
              <DateInput
                label="Client Since"
                value={formData.created_at ? new Date(formData.created_at) : undefined}
                onChange={(date, formattedDate) => {
                  console.log('DEBUG: AddClient DateInput onChange:', { date, formattedDate });
                  if (date) {
                    const isoString = date.toISOString();
                    console.log('DEBUG: AddClient setting created_at to:', isoString);
                    setFormData(prev => ({ ...prev, created_at: isoString }));
                  } else {
                    console.log('DEBUG: AddClient setting created_at to null');
                    setFormData(prev => ({ ...prev, created_at: null }));
                  }
                }}
                placeholder="dd/mm/yyyy"
                showCalendarIcon={true}
                helperText="Optional: Set the actual start date for this client relationship. Leave blank to use today's date."
              />
            </div>

            <div>
              <CreatableDropdown
                label="Advisor"
                options={advisorOptions}
                value={formData.advisor || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, advisor: value as string || null }))}
                onCreateOption={handleCreateAdvisor}
                placeholder="Select or create advisor"
                createLabel="Create advisor"
                helperText="Optional: Assign a specific advisor to this client group"
              />
            </div>

            <div>
              <BaseDropdown
                label="Client Group Type"
                options={typeOptions}
                value={formData.type}
                onChange={(value) => setFormData(prev => ({ ...prev, type: value as string }))}
                placeholder="Select client group type"
                required
                helperText="Choose the type that best describes this client group"
              />
            </div>

            <div>
              <BaseDropdown
                label="Status"
                options={statusOptions}
                value={formData.status}
                onChange={(value) => setFormData(prev => ({ ...prev, status: value as string }))}
                placeholder="Select status"
                required
                helperText="Set the current operational status of the client group"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <ActionButton
              variant="save"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e);
              }}
              loading={isSubmitting}
              disabled={isSubmitting}
              className="min-w-[140px]"
            />
          </div>
        </form>
      </div>
    </DynamicPageContainer>
  );
};

export default AddClient;
