import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Define interfaces for our data structures
interface ClientGroup {
  id: number;
  name: string;
}

interface ProductOwner {
  id: number;
  name: string;
}

interface Product {
  id: number;
  product_name: string;
  provider_name?: string;
  client_id?: number;
  provider_id?: number;
}

interface MonthlyTransaction {
  month: string;
  investment: number;
  withdrawal: number;
  net_flow: number;
  valuation: number;
}

const ReportGenerator: React.FC = () => {
  const { api } = useAuth();
  
  // State for selected items
  const [selectedClientGroups, setSelectedClientGroups] = useState<ClientGroup[]>([]);
  const [selectedProductOwners, setSelectedProductOwners] = useState<ProductOwner[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  
  // State for dropdown options
  const [clientGroupOptions, setClientGroupOptions] = useState<ClientGroup[]>([]);
  const [productOwnerOptions, setProductOwnerOptions] = useState<ProductOwner[]>([]);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  
  // State for search queries
  const [clientGroupSearch, setClientGroupSearch] = useState('');
  const [productOwnerSearch, setProductOwnerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  
  // State for results
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedProductOwners, setRelatedProductOwners] = useState<ProductOwner[]>([]);
  const [totalValuation, setTotalValuation] = useState<number | null>(null);
  const [totalIRR, setTotalIRR] = useState<number | null>(null);
  const [valuationDate, setValuationDate] = useState<string | null>(null);
  
  // State for IRR calculation
  const [monthlyTransactions, setMonthlyTransactions] = useState<MonthlyTransaction[]>([]);
  
  // State for loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch data on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [clientGroupsRes, productsRes] = await Promise.all([
          api.get('/client_groups'),
          api.get('/client_products')
        ]);
        
        setClientGroupOptions(clientGroupsRes.data);
        setProductOptions(productsRes.data);
        
        // For now, we'll use a placeholder for product owners
        // In a real implementation, this would come from an API
        setProductOwnerOptions([
          { id: 1, name: 'Owner 1' },
          { id: 2, name: 'Owner 2' },
          { id: 3, name: 'Owner 3' }
        ]);
        
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch initial data');
        console.error('Error fetching initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [api]);
  
  // Handle adding a client group
  const addClientGroup = (clientGroup: ClientGroup) => {
    if (!selectedClientGroups.some(cg => cg.id === clientGroup.id)) {
      setSelectedClientGroups([...selectedClientGroups, clientGroup]);
    }
  };
  
  // Handle removing a client group
  const removeClientGroup = (clientGroupId: number) => {
    setSelectedClientGroups(selectedClientGroups.filter(cg => cg.id !== clientGroupId));
  };
  
  // Handle adding a product owner
  const addProductOwner = (productOwner: ProductOwner) => {
    if (!selectedProductOwners.some(po => po.id === productOwner.id)) {
      setSelectedProductOwners([...selectedProductOwners, productOwner]);
    }
  };
  
  // Handle removing a product owner
  const removeProductOwner = (productOwnerId: number) => {
    setSelectedProductOwners(selectedProductOwners.filter(po => po.id !== productOwnerId));
  };
  
  // Handle adding a product
  const addProduct = (product: Product) => {
    if (!selectedProducts.some(p => p.id === product.id)) {
      setSelectedProducts([...selectedProducts, product]);
    }
  };
  
  // Handle removing a product
  const removeProduct = (productId: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };
  
  // Generate report based on selections
  const generateReport = async () => {
    if (selectedClientGroups.length === 0 && selectedProductOwners.length === 0 && selectedProducts.length === 0) {
      setError('Please select at least one item to generate a report');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call the API with the selected items
      // and get back the calculated data
      
      // For now, we'll simulate a successful response
      setTimeout(() => {
        setRelatedProducts([
          { id: 101, product_name: 'ISA Account', provider_name: 'Provider A' },
          { id: 102, product_name: 'Pension', provider_name: 'Provider B' }
        ]);
        
        setRelatedProductOwners([
          { id: 201, name: 'John Smith' },
          { id: 202, name: 'Jane Doe' }
        ]);
        
        setTotalValuation(1250000);
        setTotalIRR(7.35);
        setValuationDate('2023-10-31');
        
        setMonthlyTransactions([
          { month: '2023-01', investment: 10000, withdrawal: 0, net_flow: 10000, valuation: 10000 },
          { month: '2023-02', investment: 5000, withdrawal: 0, net_flow: 5000, valuation: 15500 },
          { month: '2023-03', investment: 0, withdrawal: 2000, net_flow: -2000, valuation: 14000 },
          { month: '2023-04', investment: 0, withdrawal: 0, net_flow: 0, valuation: 14700 },
          { month: '2023-05', investment: 20000, withdrawal: 0, net_flow: 20000, valuation: 35500 },
          { month: '2023-06', investment: 0, withdrawal: 0, net_flow: 0, valuation: 36900 }
        ]);
        
        setIsLoading(false);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate report');
      console.error('Error generating report:', err);
      setIsLoading(false);
    }
  };
  
  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Format percentage for display
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-normal text-gray-900 font-sans tracking-wide mb-6">
        Report Generator
      </h1>
      
      <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Input Selection */}
          <div className="border-r border-gray-200 pr-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Selection Criteria</h2>
            
            {/* Client Groups Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Groups
              </label>
              
              {/* Display selected client groups */}
              {selectedClientGroups.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedClientGroups.map(clientGroup => (
                    <div 
                      key={clientGroup.id}
                      className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md flex items-center text-sm"
                    >
                      <span>{clientGroup.name}</span>
                      <button 
                        onClick={() => removeClientGroup(clientGroup.id)}
                        className="ml-1 text-indigo-500 hover:text-indigo-700"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Client group search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search client groups..."
                  value={clientGroupSearch}
                  onChange={(e) => setClientGroupSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                
                {/* Dropdown for client group search results */}
                {clientGroupSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                    {clientGroupOptions
                      .filter(cg => cg.name.toLowerCase().includes(clientGroupSearch.toLowerCase()))
                      .map(clientGroup => (
                        <div 
                          key={clientGroup.id}
                          className="px-4 py-2 hover:bg-gray-100 flex justify-between items-center cursor-pointer"
                          onClick={() => {
                            addClientGroup(clientGroup);
                            setClientGroupSearch('');
                          }}
                        >
                          <span>{clientGroup.name}</span>
                          <button className="text-primary-700 hover:text-primary-900">
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Product Owners Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Owners
              </label>
              
              {/* Display selected product owners */}
              {selectedProductOwners.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedProductOwners.map(productOwner => (
                    <div 
                      key={productOwner.id}
                      className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md flex items-center text-sm"
                    >
                      <span>{productOwner.name}</span>
                      <button 
                        onClick={() => removeProductOwner(productOwner.id)}
                        className="ml-1 text-indigo-500 hover:text-indigo-700"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Product owner search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search product owners..."
                  value={productOwnerSearch}
                  onChange={(e) => setProductOwnerSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                
                {/* Dropdown for product owner search results */}
                {productOwnerSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                    {productOwnerOptions
                      .filter(po => po.name.toLowerCase().includes(productOwnerSearch.toLowerCase()))
                      .map(productOwner => (
                        <div 
                          key={productOwner.id}
                          className="px-4 py-2 hover:bg-gray-100 flex justify-between items-center cursor-pointer"
                          onClick={() => {
                            addProductOwner(productOwner);
                            setProductOwnerSearch('');
                          }}
                        >
                          <span>{productOwner.name}</span>
                          <button className="text-primary-700 hover:text-primary-900">
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Products Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Products
              </label>
              
              {/* Display selected products */}
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedProducts.map(product => (
                    <div 
                      key={product.id}
                      className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md flex items-center text-sm"
                    >
                      <span>{product.product_name}</span>
                      <button 
                        onClick={() => removeProduct(product.id)}
                        className="ml-1 text-indigo-500 hover:text-indigo-700"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Product search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                
                {/* Dropdown for product search results */}
                {productSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                    {productOptions
                      .filter(p => p.product_name.toLowerCase().includes(productSearch.toLowerCase()))
                      .map(product => (
                        <div 
                          key={product.id}
                          className="px-4 py-2 hover:bg-gray-100 flex justify-between items-center cursor-pointer"
                          onClick={() => {
                            addProduct(product);
                            setProductSearch('');
                          }}
                        >
                          <span>{product.product_name}</span>
                          <button className="text-primary-700 hover:text-primary-900">
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Generate Report Button */}
            <button
              onClick={generateReport}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-white bg-primary-700 rounded-xl shadow-sm hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : 'Generate Report'}
            </button>
            
            {/* Error message */}
            {error && (
              <div className="mt-4 text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>
          
          {/* Right Panel - Results Summary */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Report Summary</h2>
            
            {totalValuation !== null ? (
              <>
                {/* Related Entities */}
                <div className="mb-6">
                  <h3 className="text-base font-medium text-gray-700 mb-2">Related Entities</h3>
                  
                  {/* Related Products */}
                  {relatedProducts.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Products</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <ul className="space-y-1">
                          {relatedProducts.map(product => (
                            <li key={product.id} className="text-sm flex items-center">
                              <div className="h-2 w-2 rounded-full bg-indigo-500 mr-2"></div>
                              <span>{product.product_name}</span>
                              {product.provider_name && (
                                <span className="text-gray-500 ml-1">({product.provider_name})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* Related Product Owners */}
                  {relatedProductOwners.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Product Owners</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <ul className="space-y-1">
                          {relatedProductOwners.map(owner => (
                            <li key={owner.id} className="text-sm flex items-center">
                              <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                              <span>{owner.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Total Valuation */}
                <div className="mb-6 bg-white shadow-sm rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Total Valuation</h3>
                  <div className="text-2xl font-semibold text-gray-900">{formatCurrency(totalValuation)}</div>
                  {valuationDate && (
                    <div className="text-xs text-gray-500 mt-1">
                      as of {formatDate(valuationDate)}
                    </div>
                  )}
                </div>
                
                {/* Total IRR */}
                {totalIRR !== null && (
                  <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total IRR</h3>
                    <div className={`text-2xl font-semibold flex items-center ${totalIRR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(totalIRR)}
                      <span className="ml-2">
                        {totalIRR >= 0 ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-500">
                  Select criteria and generate a report to see results.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* IRR Calculation Table */}
      {monthlyTransactions.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">IRR Calculation</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investment
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Withdrawal
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Flow
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valuation
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyTransactions.map((transaction, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.month).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {transaction.investment > 0 ? formatCurrency(transaction.investment) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {transaction.withdrawal > 0 ? formatCurrency(transaction.withdrawal) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={transaction.net_flow >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(transaction.net_flow)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-indigo-600">
                      {formatCurrency(transaction.valuation)}
                    </td>
                  </tr>
                ))}
                
                {/* Total Row */}
                <tr className="bg-gray-100 font-medium">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(monthlyTransactions.reduce((sum, t) => sum + t.investment, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(monthlyTransactions.reduce((sum, t) => sum + t.withdrawal, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    {formatCurrency(monthlyTransactions.reduce((sum, t) => sum + t.net_flow, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-indigo-600">
                    {formatCurrency(monthlyTransactions[monthlyTransactions.length - 1].valuation)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator; 