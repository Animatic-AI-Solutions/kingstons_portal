import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProviderColor } from '../services/providerColors';

// Interfaces for data types
interface ClientGroup {
  id: number;
  name: string;
  advisor?: string | null;
  status: string;
}

interface ProductOwner {
  id: number;
  name: string;
  type?: string;
}

interface Product {
  id: number;
  product_name: string;
  client_id: number;
  provider_id?: number;
  provider_name?: string;
  provider_theme_color?: string;
  portfolio_id?: number;
  status: string;
  total_value?: number;
}

interface Fund {
  id: number;
  fund_name: string;
  isin_number?: string;
}

interface PortfolioFund {
  id: number;
  portfolio_id: number;
  available_funds_id: number;
  market_value?: number;
  fund_name?: string;
}

interface MonthlyTransaction {
  year_month: string;
  total_investment: number;
  total_withdrawal: number;
  total_switch_in: number;
  total_switch_out: number;
  net_flow: number;
  valuation: number;
}

interface SelectedItem {
  id: number;
  name: string;
}

// Component for searchable dropdown
const SearchableDropdown: React.FC<{
  label: string;
  placeholder: string;
  items: any[];
  selectedItems: SelectedItem[];
  onItemAdd: (item: SelectedItem) => void;
  onItemRemove: (id: number) => void;
}> = ({ label, placeholder, items, selectedItems, onItemAdd, onItemRemove }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const isSelected = (id: number) => {
    return selectedItems.some(item => item.id === id);
  };

  return (
    <div className="mb-6">
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 mb-3">
            {selectedItems.map(item => (
              <div 
                key={item.id}
                className="flex items-center bg-primary-50 border border-primary-200 rounded-full px-3 py-1 text-sm"
              >
                <span className="truncate max-w-[180px]">{item.name}</span>
                <button 
                  onClick={() => onItemRemove(item.id)}
                  className="ml-1.5 text-gray-500 hover:text-red-500"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 transition-colors"
          />
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
            </svg>
          </button>
        </div>
      </div>
      
      {isOpen && filteredItems.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
          <ul className="py-1">
            {filteredItems.map(item => (
              <li 
                key={item.id}
                className={`flex justify-between items-center px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
                  isSelected(item.id) ? 'bg-primary-50' : ''
                }`}
              >
                <span>{item.name}</span>
                {!isSelected(item.id) && (
                  <button 
                    onClick={() => {
                      onItemAdd({ id: item.id, name: item.name });
                      setSearchQuery('');
                    }}
                    className="text-primary-700 hover:text-primary-800 font-medium"
                  >
                    Add
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Main component
const ReportGenerator: React.FC = () => {
  const { api } = useAuth();
  
  // State for data
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fundData, setFundData] = useState<Fund[]>([]);
  const [portfolioFunds, setPortfolioFunds] = useState<PortfolioFund[]>([]);
  
  // State for selections
  const [selectedClientGroups, setSelectedClientGroups] = useState<SelectedItem[]>([]);
  const [selectedProductOwners, setSelectedProductOwners] = useState<SelectedItem[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedItem[]>([]);
  
  // State for results
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedOwners, setRelatedOwners] = useState<ProductOwner[]>([]);
  const [totalValuation, setTotalValuation] = useState<number | null>(null);
  const [totalIRR, setTotalIRR] = useState<number | null>(null);
  const [valuationDate, setValuationDate] = useState<string | null>(null);
  const [monthlyTransactions, setMonthlyTransactions] = useState<MonthlyTransaction[]>([]);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [
          clientGroupsRes,
          productsRes,
          fundsRes
        ] = await Promise.all([
          api.get('/client_groups'),
          api.get('/client_products'),
          api.get('/funds')
        ]);
        
        setClientGroups(clientGroupsRes.data);
        setProducts(productsRes.data);
        setFundData(fundsRes.data);
        
        // For product owners, we'll use client_groups since those are the entities that own products
        setProductOwners(clientGroupsRes.data.map((group: ClientGroup) => ({
          id: group.id,
          name: group.name,
          type: 'client_group'
        })));
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        setError(err.response?.data?.detail || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [api]);
  
  // Add a new function for proper IRR calculation
  const calculateIRR = (cashFlows: {date: Date, amount: number}[], maxIterations = 100, precision = 0.000001): number => {
    // IRR calculation using Newton-Raphson method
    // Initial guess - start with a reasonable rate (5%)
    let rate = 0.05;
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Calculate NPV and its derivative at current rate
      let npv = 0;
      let derivativeNpv = 0;
      const firstDate = cashFlows[0].date;
      
      for (let i = 0; i < cashFlows.length; i++) {
        const daysDiff = (cashFlows[i].date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
        const yearFraction = daysDiff / 365;
        
        // NPV calculation
        npv += cashFlows[i].amount / Math.pow(1 + rate, yearFraction);
        
        // Derivative of NPV
        derivativeNpv += -yearFraction * cashFlows[i].amount / Math.pow(1 + rate, yearFraction + 1);
      }
      
      // Break if we've reached desired precision
      if (Math.abs(npv) < precision) {
        return rate * 100; // Convert to percentage
      }
      
      // Newton-Raphson update
      const newRate = rate - npv / derivativeNpv;
      
      // Handle non-convergence
      if (!isFinite(newRate) || isNaN(newRate)) {
        break;
      }
      
      rate = newRate;
    }
    
    return rate * 100; // Convert to percentage
  };
  
  // Handle selection changes and generate report
  const generateReport = async () => {
    if (selectedClientGroups.length === 0 && selectedProductOwners.length === 0 && selectedProducts.length === 0) {
      setDataError('Please select at least one client group, product owner, or product');
      return;
    }
    
    setIsCalculating(true);
    setDataError(null);
    
    try {
      // Get all related products based on selections
      const productIds: number[] = [];
      const ownerIds: number[] = [];
      
      // Add directly selected products
      if (selectedProducts.length > 0) {
        productIds.push(...selectedProducts.map(p => p.id));
      }
      
      // Add products from selected client groups
      if (selectedClientGroups.length > 0) {
        const clientGroupIds = selectedClientGroups.map(cg => cg.id);
        const clientProducts = products.filter(p => clientGroupIds.includes(p.client_id));
        productIds.push(...clientProducts.map(p => p.id));
        ownerIds.push(...clientGroupIds);
      }
      
      // Add products from selected product owners
      if (selectedProductOwners.length > 0) {
        const ownerProductIds = selectedProductOwners.map(po => po.id);
        const ownerProducts = products.filter(p => ownerProductIds.includes(p.client_id));
        productIds.push(...ownerProducts.map(p => p.id));
        ownerIds.push(...ownerProductIds);
      }
      
      // Remove duplicates
      const uniqueProductIds = [...new Set(productIds)];
      const uniqueOwnerIds = [...new Set(ownerIds)];
      
      if (uniqueProductIds.length === 0) {
        setDataError('No products found for your selection');
        setIsCalculating(false);
        return;
      }
      
      // Fetch portfolio funds for these products
      const portfolioIdsResponse = await Promise.all(
        uniqueProductIds.map(id => api.get(`/client_products/${id}`))
      );
      
      const portfolioIds = portfolioIdsResponse
        .map(res => res.data.portfolio_id)
        .filter(id => id !== null);
      
      if (portfolioIds.length === 0) {
        setDataError('No portfolios found for selected products');
        setIsCalculating(false);
        return;
      }
      
      // Fetch portfolio funds
      const portfolioFundsResponses = await Promise.all(
        portfolioIds.map(id => api.get(`/portfolio_funds?portfolio_id=${id}`))
      );
      
      const allPortfolioFunds = portfolioFundsResponses.flatMap(res => res.data);
      setPortfolioFunds(allPortfolioFunds);
      
      // Fetch monthly transactions for all portfolio funds
      const portfolioFundIds = allPortfolioFunds.map((pf: PortfolioFund) => pf.id);
      
      if (portfolioFundIds.length === 0) {
        setDataError('No funds found for selected portfolios');
        setIsCalculating(false);
        return;
      }
      
      // Fetch activity logs for all portfolio funds
      const activityLogsPromises = portfolioFundIds.map(pfId => 
        api.get(`/holding_activity_logs?portfolio_fund_id=${pfId}`)
      );
      
      const activityLogsResponses = await Promise.all(activityLogsPromises);
      const allActivityLogs = activityLogsResponses.flatMap(res => res.data);
      
      // Fetch valuations for all portfolio funds
      const valuationsPromises = portfolioFundIds.map(pfId => 
        api.get(`/fund_valuations?portfolio_fund_id=${pfId}`)
      );
      
      const valuationsResponses = await Promise.all(valuationsPromises);
      const allValuations = valuationsResponses.flatMap(res => res.data);
      
      // Group transactions by month
      const transactionsByMonth = new Map<string, {
        investments: number;
        withdrawals: number;
        switchIn: number;
        switchOut: number;
        valuation: number;
      }>();
      
      // Process activity logs
      allActivityLogs.forEach((log: any) => {
        const date = new Date(log.date);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!transactionsByMonth.has(yearMonth)) {
          transactionsByMonth.set(yearMonth, {
            investments: 0,
            withdrawals: 0,
            switchIn: 0,
            switchOut: 0,
            valuation: 0
          });
        }
        
        const monthData = transactionsByMonth.get(yearMonth)!;
        
        switch(log.activity_type) {
          case 'Investment':
          case 'RegularInvestment':
          case 'GovernmentUplift':
            monthData.investments += Math.abs(log.amount);
            break;
          case 'Withdrawal':
            monthData.withdrawals += Math.abs(log.amount);
            break;
          case 'SwitchIn':
            monthData.switchIn += Math.abs(log.amount);
            break;
          case 'SwitchOut':
            monthData.switchOut += Math.abs(log.amount);
            break;
        }
      });
      
      // Process valuations
      allValuations.forEach((valuation: any) => {
        const date = new Date(valuation.valuation_date);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!transactionsByMonth.has(yearMonth)) {
          transactionsByMonth.set(yearMonth, {
            investments: 0,
            withdrawals: 0,
            switchIn: 0,
            switchOut: 0,
            valuation: 0
          });
        }
        
        const monthData = transactionsByMonth.get(yearMonth)!;
        monthData.valuation += valuation.market_value || 0;
      });
      
      // Convert to sorted array for display
      const sortedTransactions = Array.from(transactionsByMonth.entries())
        .map(([yearMonth, data]) => ({
          year_month: yearMonth,
          total_investment: data.investments,
          total_withdrawal: data.withdrawals,
          total_switch_in: data.switchIn,
          total_switch_out: data.switchOut,
          net_flow: data.investments - data.withdrawals + data.switchIn - data.switchOut,
          valuation: data.valuation
        }))
        .sort((a, b) => a.year_month.localeCompare(b.year_month));
      
      setMonthlyTransactions(sortedTransactions);
      
      // Calculate total valuation from most recent month
      if (sortedTransactions.length > 0) {
        const latestMonth = sortedTransactions[sortedTransactions.length - 1];
        setTotalValuation(latestMonth.valuation);
        setValuationDate(latestMonth.year_month);
        
        // Prepare cash flows for IRR calculation
        // Initial investment is negative (money going out)
        // Final valuation is positive (money coming in)
        const cashFlows: {date: Date, amount: number}[] = [];
        
        // Add all monthly cash flows
        sortedTransactions.forEach((transaction, index) => {
          const date = new Date(transaction.year_month + "-15"); // Using middle of month
          
          // For first month, use initial valuation (if available) or 0
          if (index === 0) {
            // Initial value as negative (outflow)
            cashFlows.push({
              date,
              amount: -transaction.valuation || 0
            });
          }
          
          // Add net flow for each month (negative = money put in, positive = money taken out)
          const netFlow = -(transaction.total_investment - transaction.total_withdrawal);
          if (netFlow !== 0) {
            cashFlows.push({
              date,
              amount: netFlow
            });
          }
          
          // For last month, add final valuation
          if (index === sortedTransactions.length - 1) {
            // Final value as positive (inflow)
            cashFlows.push({
              date,
              amount: transaction.valuation || 0
            });
          }
        });
        
        // Only calculate IRR if we have meaningful cash flows
        if (cashFlows.length >= 2) {
          try {
            const irrValue = calculateIRR(cashFlows);
            setTotalIRR(irrValue);
          } catch (err) {
            console.error('Error calculating IRR:', err);
            setTotalIRR(null);
          }
        } else {
          setTotalIRR(null);
        }
      }
      
      // Set related products and owners
      const relatedProductsList = products.filter(p => uniqueProductIds.includes(p.id));
      setRelatedProducts(relatedProductsList);
      
      const relatedOwnersList = productOwners.filter(po => uniqueOwnerIds.includes(po.id));
      setRelatedOwners(relatedOwnersList);
      
    } catch (err: any) {
      console.error('Error generating report:', err);
      setDataError(err.response?.data?.detail || 'Failed to generate report');
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const [year, month] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-normal text-gray-900 font-sans tracking-wide mb-6">
        Report Generator
      </h1>
      
      {error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side - Selection Panels */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-normal text-gray-900 mb-4">Select Items for Report</h2>
            
            {/* Client Groups Selection */}
            <SearchableDropdown
              label="Client Groups"
              placeholder="Search client groups..."
              items={clientGroups.map(cg => ({ id: cg.id, name: cg.name }))}
              selectedItems={selectedClientGroups}
              onItemAdd={(item) => setSelectedClientGroups([...selectedClientGroups, item])}
              onItemRemove={(id) => setSelectedClientGroups(selectedClientGroups.filter(item => item.id !== id))}
            />
            
            {/* Product Owners Selection */}
            <SearchableDropdown
              label="Product Owners"
              placeholder="Search product owners..."
              items={productOwners.map(po => ({ id: po.id, name: po.name }))}
              selectedItems={selectedProductOwners}
              onItemAdd={(item) => setSelectedProductOwners([...selectedProductOwners, item])}
              onItemRemove={(id) => setSelectedProductOwners(selectedProductOwners.filter(item => item.id !== id))}
            />
            
            {/* Products Selection */}
            <SearchableDropdown
              label="Products"
              placeholder="Search products..."
              items={products.map(p => ({ id: p.id, name: p.product_name }))}
              selectedItems={selectedProducts}
              onItemAdd={(item) => setSelectedProducts([...selectedProducts, item])}
              onItemRemove={(id) => setSelectedProducts(selectedProducts.filter(item => item.id !== id))}
            />
            
            {/* Generate Report Button */}
            <button
              onClick={generateReport}
              disabled={isCalculating}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-xl shadow-sm hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Calculating...
                </>
              ) : (
                <>
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Report
                </>
              )}
            </button>
            
            {dataError && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-3">
                <p className="text-sm text-red-700">{dataError}</p>
              </div>
            )}
          </div>
          
          {/* Right Side - Results Panel */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-normal text-gray-900 mb-4">Report Summary</h2>
            
            {/* Related Items */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Related Items</h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                {relatedProducts.length > 0 || relatedOwners.length > 0 ? (
                  <div className="space-y-3">
                    {relatedOwners.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Product Owners</h4>
                        <div className="flex flex-wrap gap-2">
                          {relatedOwners.map(owner => (
                            <span 
                              key={owner.id}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {owner.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {relatedProducts.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Products</h4>
                        <div className="flex flex-wrap gap-2">
                          {relatedProducts.map(product => (
                            <span 
                              key={product.id}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {product.product_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No related items to display. Generate a report to see relationships.</p>
                )}
              </div>
            </div>
            
            {/* Valuation Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Total Valuation</h3>
                {totalValuation !== null ? (
                  <div>
                    <div className="text-2xl font-semibold text-primary-700">{formatCurrency(totalValuation)}</div>
                    {valuationDate && (
                      <div className="text-xs text-gray-500 mt-1">as of {formatDate(valuationDate)}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No valuation data available</div>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Total IRR</h3>
                {totalIRR !== null ? (
                  <div className={`text-2xl font-semibold ${totalIRR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(totalIRR)}
                    <span className="ml-1">
                      {totalIRR >= 0 ? '▲' : '▼'}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No IRR data available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Monthly Transactions Table */}
      {monthlyTransactions.length > 0 && (
        <div className="mt-8 bg-white shadow-sm rounded-lg border border-gray-100 p-6">
          <h2 className="text-lg font-normal text-gray-900 mb-4">Monthly Transactions</h2>
          
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
                    Switch In
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Switch Out
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
                {monthlyTransactions.map((transaction) => (
                  <tr key={transaction.year_month} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(transaction.year_month)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(transaction.total_investment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(transaction.total_withdrawal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(transaction.total_switch_in)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(transaction.total_switch_out)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(transaction.net_flow)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(transaction.valuation)}
                    </td>
                  </tr>
                ))}
                
                {/* Total Row */}
                <tr className="bg-gray-50 font-medium">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(monthlyTransactions.reduce((sum, t) => sum + t.total_investment, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(monthlyTransactions.reduce((sum, t) => sum + t.total_withdrawal, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(monthlyTransactions.reduce((sum, t) => sum + t.total_switch_in, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(monthlyTransactions.reduce((sum, t) => sum + t.total_switch_out, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(monthlyTransactions.reduce((sum, t) => sum + t.net_flow, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {totalValuation !== null ? formatCurrency(totalValuation) : '-'}
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