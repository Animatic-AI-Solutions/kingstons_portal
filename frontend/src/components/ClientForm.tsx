import React, { useState } from 'react';
import { 
  BaseInput, 
  InputLabel,
  SearchableDropdown,
  Button
} from './ui';

/**
 * Interface for client form data
 * @property {string} name - Client's full name
 * @property {string} status - Client's status (active or inactive)
 * @property {string | null} advisor - The assigned advisor's name (optional)
 * @property {string} type - Client group type (e.g., 'Family', 'Corporate', 'Trust')
 */
interface ClientFormData {
  name: string;
  status: string;
  advisor: string | null;
  type: string;
}

/**
 * Props interface for the ClientForm component
 * @property {Function} onSubmit - Callback function that receives the form data on submission
 * @property {ClientFormData} [initialData] - Optional initial data to populate the form (for editing)
 */
interface ClientFormProps {
  onSubmit: (data: ClientFormData) => void;
  initialData?: ClientFormData;
}

/**
 * ClientForm Component
 * 
 * Reusable form for creating and editing client information.
 * Used in both AddClient and EditClient pages.
 * 
 * @param {ClientFormProps} props - Component props
 * @returns {JSX.Element} - Rendered form component
 */
const ClientForm: React.FC<ClientFormProps> = ({ onSubmit, initialData }) => {
  // Initialize form state with provided data or defaults
  const [formData, setFormData] = useState<ClientFormData>({
    name: initialData?.name || '',
    status: initialData?.status || 'active',
    advisor: initialData?.advisor || null,
    type: initialData?.type || 'Family'
  });

  /**
   * Handles input changes and updates form state
   * @param {React.ChangeEvent<HTMLInputElement | HTMLSelectElement>} e - Change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: ClientFormData) => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handles form submission
   * Prevents default form submission behavior and passes data to onSubmit callback
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Name Field */}
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
        helperText="This will be the primary identifier for the client group"
        leftIcon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />

      {/* Type Field - Type of client group */}
      <div>
        <InputLabel htmlFor="type" required>
          Client Group Type
        </InputLabel>
        <SearchableDropdown
          id="type"
          value={formData.type}
          onChange={(value) => {
            setFormData((prev) => ({
              ...prev,
              type: value as string
            }));
          }}
          options={[
            { value: 'Family', label: 'Family' },
            { value: 'Business', label: 'Business' },
            { value: 'Trust', label: 'Trust' }
          ]}
          placeholder="Select client group type"
          required
        />
        <p className="mt-1 text-xs text-gray-500">Choose the type that best describes this client group</p>
      </div>

      {/* Status Dropdown - Active or Inactive */}
      <div>
        <InputLabel htmlFor="status" required>
          Status
        </InputLabel>
        <SearchableDropdown
          id="status"
          value={formData.status}
          onChange={(value) => {
            setFormData((prev) => ({
              ...prev,
              status: value as string
            }));
          }}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
          placeholder="Select status"
          required
        />
        <p className="mt-1 text-xs text-gray-500">Set the current operational status of the client group</p>
      </div>

      {/* Advisor Field - Optional field for assigned advisor */}
      <BaseInput
        id="advisor"
          name="advisor"
        label="Advisor"
        placeholder="Enter advisor name"
          value={formData.advisor || ''}
          onChange={handleChange}
        helperText="Optional: Assign a specific advisor to this client group"
        leftIcon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      />

      {/* Submit Button */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="submit"
          size="md"
          className="min-w-[120px]"
        >
          Create Client Group
        </Button>
      </div>
    </form>
  );
};

export default ClientForm; 