import React, { useState } from 'react';

/**
 * Interface for client form data
 * @property {string} name - Client's full name
 * @property {string} relationship - Type of relationship (e.g., 'R', 'S', 'T')
 * @property {string} status - Client's status (active or inactive)
 * @property {string | null} advisor - The assigned advisor's name (optional)
 */
interface ClientFormData {
  name: string;
  relationship: string;
  status: string;
  advisor: string | null;
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
    relationship: initialData?.relationship || '',
    status: initialData?.status || 'active',
    advisor: initialData?.advisor || null
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {/* Relationship Field - Type of client relationship */}
      <div>
        <label htmlFor="relationship" className="block text-sm font-medium text-gray-700">
          Relationship
        </label>
        <input
          type="text"
          name="relationship"
          id="relationship"
          value={formData.relationship}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {/* Status Dropdown - Active or Inactive */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          name="status"
          id="status"
          value={formData.status}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Advisor Field - Optional field for assigned advisor */}
      <div>
        <label htmlFor="advisor" className="block text-sm font-medium text-gray-700">
          Advisor
        </label>
        <input
          type="text"
          name="advisor"
          id="advisor"
          value={formData.advisor || ''}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default ClientForm; 