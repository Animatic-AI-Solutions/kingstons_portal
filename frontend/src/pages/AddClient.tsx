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
  advisor_id: number | null; // New advisor relationship field
  type: string;
  client_start_date: string | null;
  created_at: string | null;
}

const AddClient: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const { navigateWithSuccessMessage, navigateToClientGroups } = useNavigationRefresh();
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    status: 'active',
    advisor_id: null,
    type: 'Family',
    client_start_date: null,
    created_at: null
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advisorOptions, setAdvisorOptions] = useState<{ value: string; label: string }[]>([]);

  // Fetch available advisors for dropdown using authenticated API
  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        const response = await api.get('/advisors');
        const advisors = response.data;
        const options = advisors.map((advisor) => ({
          value: advisor.advisor_id.toString(),
          label: advisor.full_name || `${advisor.first_name} ${advisor.last_name}`.trim()
        }));
        setAdvisorOptions(options);
      } catch (err) {
        console.error('Error fetching advisors:', err);
        setAdvisorOptions([]);
      }
    };

    fetchAdvisors();
  }, [api]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
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
      
      const response = await api.post('/client-groups', submitData);
      
      console.log('Client created successfully:', response.data);
      
      // Navigate back to clients list with success message and refresh data
      navigateWithSuccessMessage(
        '/client-groups',
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

  const typeOptions = [
    { value: 'Business', label: 'Business' },
    { value: 'Family', label: 'Family' },
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
            <Link to="/client-groups" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700">
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

            {/* Advisor Assignment - Using BaseDropdown */}
            <div>
              <BaseDropdown
                label="Advisor"
                options={advisorOptions}
                value={formData.advisor_id?.toString() || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  advisor_id: value ? parseInt(value as string) : null
                }))}
                placeholder="Select an advisor"
                helperText="Optional: Assign a specific advisor to this client group"
              />
            </div>

            <div>
              <DateInput
                label="Client Start Date"
                value={formData.client_start_date ? new Date(formData.client_start_date) : undefined}
                onChange={(date, formattedDate) => {
                  if (date) {
                    const isoString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD for DATE field
                    setFormData(prev => ({ ...prev, client_start_date: isoString }));
                  } else {
                    setFormData(prev => ({ ...prev, client_start_date: null }));
                  }
                }}
                placeholder="dd/mm/yyyy"
                showCalendarIcon={true}
                helperText="Date when the client relationship officially began"
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
