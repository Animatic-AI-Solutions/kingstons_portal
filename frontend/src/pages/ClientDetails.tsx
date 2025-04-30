import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Client {
  id: string;
  name: string;
  relationship: string;
  status: string;
  advisor: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientFormData {
  name: string;
  relationship: string;
  status: string;
  advisor: string | null;
}

const ClientDetails: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    relationship: '',
    status: 'active',
    advisor: null
  });

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      setIsLoading(true);
      console.log(`Fetching client data for ID: ${clientId}`);
      
      const response = await api.get(`/clients/${clientId}`);
      console.log("Client data received:", response.data);
      
      setClient(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch client');
      console.error('Error fetching client:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/clients');
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await api.delete(`/clients/${clientId}`);
      navigate('/clients');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete client');
      console.error('Error deleting client:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMakeDormant = async () => {
    try {
      setIsUpdating(true);
      await api.patch(`/clients/${clientId}/status`, { status: 'dormant' });
      // Refresh client data
      fetchClientData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update client status');
      console.error('Error updating client status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseUpdateForm = () => {
    setIsEditing(false);
    // Sync form data with client data if client exists
    if (client) {
      setFormData({
        name: client.name,
        relationship: client.relationship,
        status: client.status,
        advisor: client.advisor
      });
    }
  };

  const handleVersionHistory = async () => {
    try {
      const response = await api.post(`/client-versions?client_id=${clientId}`);
      setVersions(response.data);
      setShowVersionModal(true);
    } catch (err: any) {
      console.error('Error fetching version history:', err);
    }
  };

  const handleSaveChanges = async () => {
    if (!client) return;
    
    try {
      setIsSaving(true);
      // Only send fields that have actually changed
      const changedFields: Record<string, any> = {};
      
      if (formData.name !== client.name) changedFields.name = formData.name;
      if (formData.relationship !== client.relationship) changedFields.relationship = formData.relationship;
      if (formData.status !== client.status) changedFields.status = formData.status;
      if (formData.advisor !== client.advisor) changedFields.advisor = formData.advisor;

      // Don't make the API call if nothing has changed
      if (Object.keys(changedFields).length === 0) {
        setIsEditing(false);
        setIsSaving(false);
        return;
      }

      await api.patch(`/clients/${clientId}`, changedFields);
      
      // Reload the client data
      fetchClientData();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update client');
      console.error('Error updating client:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadClientPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      // Prepare the API call to download the PDF
      const response = await fetch(`/clients/${clientId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF as a blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `client_${clientId}_${client?.name.replace(/\s+/g, '_')}.pdf`;
      
      // Trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download client PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const startCorrection = () => {
    if (!client) return;
    
    // Initialize form data with current client values
    setFormData({
      name: client.name,
      relationship: client.relationship,
      status: client.status,
      advisor: client.advisor
    });
    
    // Enter correction mode
    setIsCorrecting(true);
  };

  const handleCorrect = async () => {
    if (!client) return;

    try {
      // Only send fields that have actually changed
      const changedFields: Partial<ClientFormData> = {};
      
      if (formData.name !== client.name) changedFields.name = formData.name;
      if (formData.relationship !== client.relationship) changedFields.relationship = formData.relationship;
      if (formData.status !== client.status) changedFields.status = formData.status;
      
      // Special handling for advisor which could be null
      if (
        (formData.advisor === '' && client.advisor !== null) || 
        (formData.advisor !== client.advisor && formData.advisor !== '')
      ) {
        changedFields.advisor = formData.advisor === '' ? null : formData.advisor;
      }
      
      // Only perform API call if there are changes
      if (Object.keys(changedFields).length > 0) {
        await api.patch(`/clients/${clientId}`, changedFields);
        await fetchClientData();
      }
      
      setIsCorrecting(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to correct client');
      console.error('Error correcting client:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      // ... existing code ...
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit form');
      console.error('Error submitting form:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-600 text-center py-4">{error || 'Client not found'}</div>
        <div className="flex justify-center mt-4">
          <button
            onClick={handleBack}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Client Details</h1>
        <div className="flex space-x-4">
          <button
            onClick={handleBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Back to Clients
          </button>
          {client.status !== 'dormant' && (
            <button
              onClick={handleMakeDormant}
              className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Set Dormant
            </button>
          )}
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete Client
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {isCorrecting ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name || client.name}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  ) : (
                    client.name
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Relationship</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {isCorrecting ? (
                    <select
                      name="relationship"
                      value={formData.relationship || client.relationship}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="Relationship">Relationship</option>
                      <option value="Single">Single</option>
                      <option value="Trust">Trust</option>
                    </select>
                  ) : (
                    client.relationship
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{client.status}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Advisor</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {isCorrecting ? (
                    <input
                      type="text"
                      name="advisor"
                      value={formData.advisor || client.advisor || ''}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  ) : (
                    client.advisor || 'Not assigned'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(client.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          {isCorrecting ? (
            <>
              <button
                onClick={() => setIsCorrecting(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleCorrect}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startCorrection}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Correct Details
              </button>
              <button
                onClick={handleVersionHistory}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                Version History
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
