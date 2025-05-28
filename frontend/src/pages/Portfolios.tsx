import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Modal, notification } from 'antd';
import { ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';

interface Fund {
  id: number;
  fund_id: number;
  target_weighting: number;
  available_funds?: {
    id: number;
    fund_name: string;
    risk_factor?: number;
  };
}

interface Portfolio {
  id: number;
  name: string;
  created_at: string;
  funds?: Fund[];
  averageRisk?: number;
  product_count?: number;
}

type SortField = 'name' | 'created_at' | 'averageRisk';
type SortOrder = 'asc' | 'desc';

const Portfolios: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [portfolioToDelete, setPortfolioToDelete] = useState<Portfolio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const calculateAverageRisk = (portfolio: Portfolio): number => {
    if (!portfolio.funds || portfolio.funds.length === 0) return 0;

    let totalWeightedRisk = 0;
    let totalWeight = 0;

    portfolio.funds.forEach(fund => {
      // Handle both direct risk_factor on fund or nested in available_funds
      const riskFactor = fund.available_funds?.risk_factor;
      
      if (riskFactor !== undefined && fund.target_weighting) {
        totalWeightedRisk += riskFactor * fund.target_weighting;
        totalWeight += fund.target_weighting;
      }
    });

    return totalWeight > 0 ? Number((totalWeightedRisk / totalWeight).toFixed(1)) : 0;
  };

  const fetchPortfolioDetails = async (portfolioId: number): Promise<Portfolio | null> => {
    try {
      const response = await api.get(`/available_portfolios/${portfolioId}`);
      const productCountResponse = await api.get(`/available_portfolios/${portfolioId}/product_count`);
      
      if (response.data) {
        console.log(`Fetched details for portfolio ${portfolioId}:`, response.data);
        
        // Calculate risk if funds data is available
        const portfolioData = response.data;
        const averageRisk = portfolioData.funds ? calculateAverageRisk(portfolioData) : 0;
        
        return {
          ...portfolioData,
          averageRisk,
          product_count: productCountResponse.data.count
        };
      }
      return null;
    } catch (err) {
      console.error(`Error fetching portfolio details for ${portfolioId}:`, err);
      return null;
    }
  };

  const fetchPortfolios = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching portfolio templates...");
      
      // Get list of all portfolio templates
      const response = await api.get('/available_portfolios');
      console.log(`Received ${response.data.length} portfolio templates`);
      
      // We need detailed information for each portfolio to calculate risk
      const portfolioTemplates = response.data;
      const detailedPortfolios = await Promise.all(
        portfolioTemplates.map(async (portfolio: any) => {
          const detailedPortfolio = await fetchPortfolioDetails(portfolio.id);
          if (detailedPortfolio) {
            return detailedPortfolio;
          }
          
          // If detail fetch fails, return basic portfolio info
          return {
            ...portfolio,
            averageRisk: 0
          };
        })
      );
      
      setPortfolios(detailedPortfolios);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch portfolios');
      console.error('Error fetching portfolios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortFieldChange = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAddPortfolio = () => {
    navigate('/definitions/portfolio-templates/add');
  };

  const handlePortfolioClick = (e: React.MouseEvent, portfolioId: number) => {
    if ((e.target as HTMLElement).closest('.delete-button-class')) {
        return;
    }
    if (portfolioId) {
      navigate(`/definitions/portfolio-templates/${portfolioId}`);
    } else {
      console.error('Attempted to navigate to portfolio template with undefined ID');
    }
  };

  const showDeleteModal = (portfolio: Portfolio) => {
    setPortfolioToDelete(portfolio);
    setIsDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!portfolioToDelete) return;

    if (portfolioToDelete.product_count && portfolioToDelete.product_count > 0) {
      notification.error({
        message: 'Deletion Failed',
        description: `This template is linked to ${portfolioToDelete.product_count} product(s) and cannot be deleted.`,
      });
      setIsDeleteModalVisible(false);
      setPortfolioToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/available_portfolios/${portfolioToDelete.id}`);
      notification.success({
        message: 'Portfolio Template Deleted',
        description: `Template "${portfolioToDelete.name}" has been successfully deleted.`,
      });
      fetchPortfolios();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete portfolio template');
      notification.error({
        message: 'Deletion Failed',
        description: err.response?.data?.detail || 'An unexpected error occurred.',
      });
      console.error('Error deleting portfolio template:', err);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalVisible(false);
      setPortfolioToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalVisible(false);
    setPortfolioToDelete(null);
  };

  const filteredAndSortedPortfolios = portfolios
    .filter(portfolio => 
      (portfolio.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortField === 'averageRisk') {
        const aValue = a.averageRisk || 0;
        const bValue = b.averageRisk || 0;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        const aValue = String(a[sortField] || '').toLowerCase();
        const bValue = String(b[sortField] || '').toLowerCase();
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
    });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Portfolio Templates</h1>
        <button
          onClick={handleAddPortfolio}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Add Portfolio Template
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search portfolio templates..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <select
              value={sortField}
              onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="name">Name</option>
              <option value="created_at">Created Date</option>
              <option value="averageRisk">Risk Factor</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {sortOrder === 'asc' ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Portfolio List */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-4">{error}</div>
          ) : filteredAndSortedPortfolios.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No portfolio templates found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Factor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedPortfolios.map((portfolio) => (
                    <tr 
                      key={portfolio.id} 
                      className="hover:bg-purple-50 transition-colors duration-150 cursor-pointer"
                      onClick={(e) => handlePortfolioClick(e, portfolio.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {portfolio.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {portfolio.averageRisk?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(portfolio.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 delete-button-class">
                        <Button
                          icon={<DeleteOutlined />}
                          danger
                          onClick={(e) => {
                            e.stopPropagation();
                            showDeleteModal(portfolio);
                          }}
                          disabled={portfolio.product_count !== undefined && portfolio.product_count > 0}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {portfolioToDelete && (
        <Modal
          title="Confirm Delete"
          visible={isDeleteModalVisible}
          onOk={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          confirmLoading={isDeleting}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <p>
            Are you sure you want to delete the portfolio template "{portfolioToDelete.name}"?
          </p>
          {portfolioToDelete.product_count !== undefined && portfolioToDelete.product_count > 0 && (
            <p className="text-red-500 mt-2">
              <ExclamationCircleOutlined style={{ marginRight: 8 }} />
              This template is currently linked to {portfolioToDelete.product_count} product(s) and cannot be deleted.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Portfolios;
