import React, { useState, useEffect } from 'react';
import { getFundIRRValues, updateIRRValue, deleteIRRValue } from '../services/api';
import { formatDate, formatCurrency, formatPercentage } from '../utils/formatters';

interface IRRValue {
  id: number;
  fund_id: number;
  value: number;
  date: string;
  valuation: number;
}

interface IRRHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioFundId: number;
  fundName: string;
  onUpdate: () => void;
}

const IRRHistoryModal: React.FC<IRRHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  portfolioFundId, 
  fundName,
  onUpdate 
}) => {
  const [irrValues, setIrrValues] = useState<IRRValue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<IRRValue | null>(null);
  const [editedDate, setEditedDate] = useState<string>('');
  const [editedValuation, setEditedValuation] = useState<string>('');

  useEffect(() => {
    if (isOpen && portfolioFundId) {
      fetchIRRValues();
    }
  }, [isOpen, portfolioFundId]);

  const fetchIRRValues = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFundIRRValues(portfolioFundId);
      setIrrValues(response.data);
    } catch (err: any) {
      console.error('Error fetching IRR values:', err);
      setError('Failed to load IRR history');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (irrValue: IRRValue) => {
    setEditingValue(irrValue);
    // Format date for the date input (YYYY-MM-DD)
    setEditedDate(irrValue.date.split('T')[0]);
    setEditedValuation(irrValue.valuation.toString());
  };

  const handleSave = async () => {
    if (!editingValue) return;
    
    try {
      const updateData = {
        date: editedDate,
        valuation: parseFloat(editedValuation)
      };
      
      await updateIRRValue(editingValue.id, updateData);
      setEditingValue(null);
      fetchIRRValues();
      onUpdate(); // Notify parent component to refresh
    } catch (err: any) {
      console.error('Error updating IRR value:', err);
      setError('Failed to update IRR value: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this IRR entry?')) return;
    
    try {
      await deleteIRRValue(id);
      fetchIRRValues();
      onUpdate(); // Notify parent component to refresh
    } catch (err: any) {
      console.error('Error deleting IRR value:', err);
      setError('Failed to delete IRR value: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCancel = () => {
    setEditingValue(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            IRR History for {fundName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : irrValues.length === 0 ? (
          <div className="p-4 text-gray-500 text-center">No IRR values found for this fund.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                  Valuation
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                  IRR Value
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {irrValues.map((irrValue) => (
                <tr key={irrValue.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingValue?.id === irrValue.id ? (
                      <input
                        type="date"
                        value={editedDate}
                        onChange={(e) => setEditedDate(e.target.value)}
                        className="border rounded p-1 w-full"
                      />
                    ) : (
                      formatDate(irrValue.date)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingValue?.id === irrValue.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editedValuation}
                        onChange={(e) => setEditedValuation(e.target.value)}
                        className="border rounded p-1 w-full"
                      />
                    ) : (
                      formatCurrency(irrValue.valuation)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatPercentage(irrValue.value / 100)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {editingValue?.id === irrValue.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleSave}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(irrValue)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(irrValue.id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default IRRHistoryModal; 