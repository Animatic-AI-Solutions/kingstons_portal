import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  status?: string;
  end_date?: string;
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
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div className="mb-6 relative" ref={containerRef}>
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
                <span className="truncate">{item.name}</span>
                {!isSelected(item.id) && (
                  <button 
                    onClick={() => {
                      onItemAdd({ id: item.id, name: item.name });
                      setSearchQuery('');
                    }}
                    className="text-primary-700 hover:text-primary-800 font-medium ml-2 flex-shrink-0"
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

// Add the IRR calculation method back as a fallback
const calculateIRR = (cashFlows: {date: Date, amount: number}[], maxIterations = 100, precision = 0.000001): number | null => {
  // Check if we have enough cash flows
  if (cashFlows.length < 2) {
    console.error("IRR calculation requires at least two cash flows");
    return null;
  }
  
  // Sort cash flows by date to ensure chronological order
  const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Check if all dates are the same
  const allSameDate = sortedFlows.every(flow => 
    flow.date.getFullYear() === sortedFlows[0].date.getFullYear() && 
    flow.date.getMonth() === sortedFlows[0].date.getMonth()
  );
  
  // If all dates are the same, use simple return calculation
  if (allSameDate) {
    console.log("All cash flow dates are in the same month - using simple return calculation");
    // Calculate simple return: (ending_value - initial_investment) / initial_investment
    const totalOutflow = sortedFlows.reduce((sum, flow) => flow.amount < 0 ? sum + flow.amount : sum, 0);
    const totalInflow = sortedFlows.reduce((sum, flow) => flow.amount > 0 ? sum + flow.amount : sum, 0);
    
    if (Math.abs(totalOutflow) < 0.01) {
      console.error("Cannot calculate return: total investment amount is near zero");
      return null;
    }
    
    const simpleReturn = totalInflow / Math.abs(totalOutflow) - 1;
    return simpleReturn * 100; // Convert to percentage
  }
  
  // Group cash flows by month
  const startDate = sortedFlows[0].date;
  const endDate = sortedFlows[sortedFlows.length - 1].date;
  
  // Calculate total number of months between start and end
  const totalMonths = 
    ((endDate.getFullYear() - startDate.getFullYear()) * 12) + 
    (endDate.getMonth() - startDate.getMonth());
  
  // For very short periods (less than a month), use simple IRR calculation
  if (totalMonths < 1) {
    console.log("Investment period is less than one month - using simple IRR calculation");
    const initialInvestment = sortedFlows[0].amount;
    const finalValue = sortedFlows[sortedFlows.length - 1].amount;
    
    if (Math.abs(initialInvestment) < 0.01) {
      console.error("Initial investment is too small or zero");
      return null;
    }
    
    // Calculate simple return
    const simpleReturn = finalValue / Math.abs(initialInvestment) - 1;
    
    // Annualize the return based on days
    const days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const annualizedReturn = (1 + simpleReturn) ** (365 / Math.max(1, days)) - 1;
    
    return annualizedReturn * 100; // Convert to percentage
  }
  
  // Group cash flows by month
  const monthlyAmounts: number[] = Array(totalMonths + 1).fill(0);
  
  for (const flow of sortedFlows) {
    const monthIndex = 
      ((flow.date.getFullYear() - startDate.getFullYear()) * 12) + 
      (flow.date.getMonth() - startDate.getMonth());
    
    if (monthIndex < 0 || monthIndex >= monthlyAmounts.length) {
      console.error(`Invalid month index: ${monthIndex} for date ${flow.date.toISOString()}`);
      continue;
    }
    
    monthlyAmounts[monthIndex] += flow.amount;
  }
  
  // Newton-Raphson method for IRR calculation
  let rate = 0.05; // Initial guess: 5%
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let npv = 0;
    let derivativeNpv = 0;
    
    for (let i = 0; i < monthlyAmounts.length; i++) {
      const t = i / 12; // Convert month index to years
      npv += monthlyAmounts[i] / Math.pow(1 + rate, t);
      derivativeNpv += -t * monthlyAmounts[i] / Math.pow(1 + rate, t + 1);
    }
    
    // Break if we've reached desired precision
    if (Math.abs(npv) < precision) {
      return rate * 100; // Convert to percentage
    }
    
    // Newton-Raphson update
    const newRate = rate - npv / derivativeNpv;
    
    // Handle non-convergence
    if (!isFinite(newRate) || isNaN(newRate)) {
      console.error("IRR calculation did not converge");
      return null;
    }
    
    rate = newRate;
  }
  
  console.warn("IRR calculation reached maximum iterations without converging");
  return rate * 100; // Return best approximation
};

// Main component
const ReportGenerator: React.FC = (): React.ReactNode => {
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
  
  // First, add a function to directly fetch the latest IRR values from the API
  const fetchLatestIRRValues = async (portfolioFundIds: number[]) => {
    try {
      // Create an array of promises for fetching IRR values for each portfolio fund
      const irrPromises = portfolioFundIds.map(pfId => 
        api.get(`/portfolio_funds/${pfId}/latest-irr`)
      );
      
      // Execute all promises in parallel
      const irrResponses = await Promise.all(irrPromises);
      
      // Extract the IRR values from the responses
      const irrValues = irrResponses.map(response => response.data);
      return irrValues;
    } catch (error) {
      console.error("Error fetching IRR values:", error);
      return [];
    }
  };
  
  // Modify the generateReport function to use the API first and fall back to calculation
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
      
      // Instead of filtering out inactive funds, identify them for later use
      const inactiveFundIds = new Set<number>();
      allPortfolioFunds.forEach(fund => {
        if (fund.status !== 'active' && fund.status !== undefined && fund.status !== null) {
          inactiveFundIds.add(fund.id);
        }
      });
      
      console.log("All Portfolio Funds:", allPortfolioFunds.length);
      console.log("Inactive Portfolio Funds:", inactiveFundIds.size);
      
      if (inactiveFundIds.size > 0) {
        const inactiveFunds = allPortfolioFunds.filter(fund => inactiveFundIds.has(fund.id));
        
        // Group inactive funds by status
        const fundsByStatus = new Map<string, PortfolioFund[]>();
        inactiveFunds.forEach(fund => {
          const status = fund.status || 'unknown';
          if (!fundsByStatus.has(status)) {
            fundsByStatus.set(status, []);
          }
          fundsByStatus.get(status)!.push(fund);
        });
        
        console.warn("Inactive funds by status (valuations will be set to zero):");
        fundsByStatus.forEach((funds, status) => {
          console.warn(`Status: ${status}, Count: ${funds.length}, Fund IDs: ${funds.map(f => f.id).join(', ')}`);
        });
      }
      
      setPortfolioFunds(allPortfolioFunds);
      
      // After fetching portfolio funds
      console.log("Portfolio Funds:", allPortfolioFunds);
      
      // Check for duplicate portfolio funds
      const portfolioFundMap = new Map();
      const duplicateFunds: PortfolioFund[] = [];
      
      allPortfolioFunds.forEach(fund => {
        if (portfolioFundMap.has(fund.id)) {
          duplicateFunds.push(fund);
        } else {
          portfolioFundMap.set(fund.id, fund);
        }
      });
      
      if (duplicateFunds.length > 0) {
        console.warn(`Found ${duplicateFunds.length} duplicate portfolio funds:`, duplicateFunds);
      } else {
        console.log("No duplicate portfolio funds detected");
      }
      
      // Fetch monthly transactions for all portfolio funds
      const portfolioFundIds = [...portfolioFundMap.keys()]; // Use unique fund IDs only
      
      if (portfolioFundIds.length === 0) {
        setDataError('No funds found for selected portfolios');
        setIsCalculating(false);
        return;
      }
      
      console.log("Portfolio Fund IDs:", portfolioFundIds);
      
      // Fetch activity logs for all portfolio funds
      const activityLogsPromises = portfolioFundIds.map(pfId => 
        api.get(`/holding_activity_logs?portfolio_fund_id=${pfId}`)
      );
      
      const activityLogsResponses = await Promise.all(activityLogsPromises);
      const allActivityLogs = activityLogsResponses.flatMap(res => res.data);
      
      console.log("All Activity Logs:", allActivityLogs.length);
      
      // Include all activity logs, but track which ones are for inactive funds
      const inactiveFundActivityLogs = allActivityLogs.filter(log => 
        inactiveFundIds.has(log.portfolio_fund_id)
      );
      
      if (inactiveFundActivityLogs.length > 0) {
        console.log(`Activity logs for inactive funds: ${inactiveFundActivityLogs.length}. These will be included in monthly transactions.`);
      }
      
      // Log some sample activity logs to see their structure
      if (allActivityLogs.length > 0) {
        console.log("Sample activity log:", allActivityLogs[0]);
        
        // Count activity logs by month and status (active/inactive)
        const logsByMonthAndStatus = new Map<string, {active: number, inactive: number}>();
        allActivityLogs.forEach(log => {
          if (log.activity_timestamp) {
            const date = new Date(log.activity_timestamp);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!logsByMonthAndStatus.has(yearMonth)) {
              logsByMonthAndStatus.set(yearMonth, {active: 0, inactive: 0});
            }
            
            const monthData = logsByMonthAndStatus.get(yearMonth)!;
            if (inactiveFundIds.has(log.portfolio_fund_id)) {
              monthData.inactive++;
            } else {
              monthData.active++;
            }
          }
        });
        
        console.log("Activity logs by month and status:", 
          Object.fromEntries(
            Array.from(logsByMonthAndStatus.entries()).map(([month, data]) => 
              [month, {active: data.active, inactive: data.inactive}]
            )
          )
        );
        
        // Track investment amounts by product and month for debugging
        const investmentsByProductAndMonth = new Map<string, number>();
        
        allActivityLogs.forEach(log => {
          if (log.activity_timestamp && (log.activity_type === 'Investment' || log.activity_type === 'RegularInvestment' || log.activity_type === 'GovernmentUplift')) {
            const date = new Date(log.activity_timestamp);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const portfolioFundId = log.portfolio_fund_id;
            const key = `${yearMonth}-${portfolioFundId}`;
            const amount = parseFloat(log.amount) || 0;
            
            if (amount > 0) {
              investmentsByProductAndMonth.set(key, (investmentsByProductAndMonth.get(key) || 0) + amount);
              console.log(`Investment: ${yearMonth}, PF ID: ${portfolioFundId}, Amount: ${amount}, Running total: ${investmentsByProductAndMonth.get(key)}, Inactive: ${inactiveFundIds.has(portfolioFundId)}`);
            }
          }
        });
        
        console.log("Investments by product and month:", Object.fromEntries(investmentsByProductAndMonth));
      }
      
      // Fetch valuations for all portfolio funds
      const valuationsPromises = portfolioFundIds.map(pfId => 
        api.get(`/fund_valuations?portfolio_fund_id=${pfId}`)
      );
      
      const valuationsResponses = await Promise.all(valuationsPromises);
      const allValuations = valuationsResponses.flatMap(res => res.data);
      
      console.log("All Valuations:", allValuations.length);
      
      // Include all valuations, but track which ones are for inactive funds
      const inactiveFundValuations = allValuations.filter(v => 
        inactiveFundIds.has(v.portfolio_fund_id)
      );
      
      if (inactiveFundValuations.length > 0) {
        console.log(`Valuations for inactive funds: ${inactiveFundValuations.length}. These will be set to 0 in the latest month.`);
      }
      
      // Group transactions by month, summing across all entities
      const transactionsByMonth = new Map<string, {
        investments: number;
        withdrawals: number;
        switchIn: number;
        switchOut: number;
        valuation: number;
      }>();
      
      // Process activity logs
      if (allActivityLogs.length === 0) {
        console.warn("No activity logs found for the selected funds");
      } else {
        // Check for potential duplicate activity logs
        const potentialDuplicates = new Map<string, any[]>();
        
        allActivityLogs.forEach(log => {
          if (!log.activity_timestamp) return;
          
          // Create a key based on fund ID, date and amount
          const date = new Date(log.activity_timestamp);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          const key = `${log.portfolio_fund_id}-${dateStr}-${log.amount}-${log.activity_type}`;
          
          if (!potentialDuplicates.has(key)) {
            potentialDuplicates.set(key, []);
          }
          
          potentialDuplicates.get(key)!.push(log);
        });
        
        // Check for duplicates
        let duplicatesFound = 0;
        potentialDuplicates.forEach((logs, key) => {
          if (logs.length > 1) {
            console.warn(`Potential duplicate logs found for key ${key}:`, logs);
            duplicatesFound++;
          }
        });
        
        if (duplicatesFound > 0) {
          console.warn(`Found ${duplicatesFound} potential duplicate activity log groups`);
        } else {
          console.log("No duplicate activity logs detected");
        }
      }
      
      // Group by month and sum all activity
      allActivityLogs.forEach((log: any) => {
        if (!log.activity_timestamp) {
          console.warn("Activity log without date:", log);
          return;
        }
        
        // Skip logs with no amount or zero amount
        if (!log.amount || parseFloat(log.amount) === 0) {
          console.debug(`Skipping log with zero/null amount: ${log.activity_type}`, log);
          return;
        }
        
        const date = new Date(log.activity_timestamp);
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
        
        // Sum all activity by type
        switch(log.activity_type) {
          case 'Investment':
          case 'RegularInvestment':
          case 'GovernmentUplift':
            monthData.investments += Math.abs(parseFloat(log.amount) || 0);
            break;
          case 'Withdrawal':
            monthData.withdrawals += Math.abs(parseFloat(log.amount) || 0);
            break;
          case 'SwitchIn':
            monthData.switchIn += Math.abs(parseFloat(log.amount) || 0);
            break;
          case 'SwitchOut':
            monthData.switchOut += Math.abs(parseFloat(log.amount) || 0);
            break;
          default:
            console.warn(`Unknown activity type: ${log.activity_type} for log:`, log);
        }
      });
      
      // Find the latest valuation for each month
      const latestValuationDatesByMonth = new Map<string, Date>();
      
      allValuations.forEach((valuation: any) => {
        if (!valuation.valuation_date) {
          console.warn("Valuation without date:", valuation);
          return;
        }
        
        const date = new Date(valuation.valuation_date);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const existingLatestDate = latestValuationDatesByMonth.get(yearMonth);
        if (!existingLatestDate || date > existingLatestDate) {
          latestValuationDatesByMonth.set(yearMonth, date);
        }
      });
      
      // Track the latest valuation for each portfolio fund in each month
      const monthlyFundValuations = new Map<string, Map<number, number>>();
      
      // Group valuations by month and portfolio fund ID
      allValuations.forEach((v: any) => {
        if (!v.valuation_date || !v.portfolio_fund_id) {
          console.warn("Valuation missing date or portfolio fund ID:", v);
          return;
        }
        
        const valuationDate = new Date(v.valuation_date);
        const yearMonth = `${valuationDate.getFullYear()}-${String(valuationDate.getMonth() + 1).padStart(2, '0')}`;
        const pfId = v.portfolio_fund_id;
        
        // Initialize month if needed
        if (!monthlyFundValuations.has(yearMonth)) {
          monthlyFundValuations.set(yearMonth, new Map<number, number>());
        }
        
        const fundValuationsForMonth = monthlyFundValuations.get(yearMonth)!;
        
        // For inactive funds, set valuation to zero
        if (inactiveFundIds.has(pfId)) {
          // Use zero valuation for inactive funds
          fundValuationsForMonth.set(pfId, 0);
        } 
        // For active funds, use the market value
        else if (!fundValuationsForMonth.has(pfId) || valuationDate >= latestValuationDatesByMonth.get(yearMonth)!) {
          fundValuationsForMonth.set(pfId, v.market_value || 0);
        }
      });
      
      // Sum valuations for each month across all portfolio funds
      for (const [yearMonth, fundValuations] of monthlyFundValuations.entries()) {
        // Initialize month in transactions if needed
        if (!transactionsByMonth.has(yearMonth)) {
          transactionsByMonth.set(yearMonth, {
            investments: 0,
            withdrawals: 0,
            switchIn: 0,
            switchOut: 0,
            valuation: 0
          });
        }
        
        // For the latest month, add all inactive funds with zero valuation if they're not already there
        if (yearMonth === Array.from(monthlyFundValuations.keys()).sort().pop()) {
          inactiveFundIds.forEach(fundId => {
            if (!fundValuations.has(fundId)) {
              fundValuations.set(fundId, 0);
              console.log(`Added missing inactive fund ${fundId} to latest month ${yearMonth} with zero valuation`);
            } else {
              fundValuations.set(fundId, 0);
              console.log(`Reset valuation to zero for inactive fund ${fundId} in latest month ${yearMonth}`);
            }
          });
        }
        
        // Sum valuations across all funds for this month
        const totalValuation = Array.from(fundValuations.entries())
          .reduce((sum, [fundId, value]) => {
            // Double-check: if it's an inactive fund in the latest month, ensure it's zero
            if (yearMonth === Array.from(monthlyFundValuations.keys()).sort().pop() && inactiveFundIds.has(fundId)) {
              return sum; // Don't add inactive funds to the latest month's valuation
            }
            return sum + value;
          }, 0);
        
        // Update the month data
        const monthData = transactionsByMonth.get(yearMonth)!;
        monthData.valuation = totalValuation;
        
        console.log(`Month ${yearMonth} - Portfolio Funds with valuations: ${fundValuations.size}, Total: ${totalValuation}`);
      }
      
      console.log("Transactions by Month:", Object.fromEntries(transactionsByMonth));
      
      // Group investments by product ID for debugging
      const investmentsByProduct = new Map<number, {
        investments: number;
        portfolioFunds: number[];
        productName: string;
      }>();
      
      // Set related products and owners
      const relatedProductsList = products.filter(p => uniqueProductIds.includes(p.id));
      
      // Get product names
      const productIdToName = new Map<number, string>();
      relatedProductsList.forEach(p => {
        productIdToName.set(p.id, p.product_name);
      });
      
      // Count activities by product
      allActivityLogs.forEach(log => {
        if (!log.activity_timestamp || !log.portfolio_fund_id) return;
        
        // Only count investments
        if (['Investment', 'RegularInvestment', 'GovernmentUplift'].includes(log.activity_type)) {
          // Find which product this portfolio fund belongs to
          const portfolioFund = allPortfolioFunds.find(pf => pf.id === log.portfolio_fund_id);
          if (!portfolioFund) return;
          
          // Find the product that owns this portfolio
          const product = relatedProductsList.find(p => p.portfolio_id === portfolioFund.portfolio_id);
          if (!product) return;
          
          const productId = product.id;
          const amount = parseFloat(log.amount) || 0;
          
          if (!investmentsByProduct.has(productId)) {
            investmentsByProduct.set(productId, {
              investments: 0,
              portfolioFunds: [],
              productName: productIdToName.get(productId) || `Product ID ${productId}`
            });
          }
          
          const productData = investmentsByProduct.get(productId)!;
          productData.investments += amount;
          if (!productData.portfolioFunds.includes(log.portfolio_fund_id)) {
            productData.portfolioFunds.push(log.portfolio_fund_id);
          }
        }
      });
      
      // Log investments by product
      console.log("Investments by product:");
      investmentsByProduct.forEach((data, productId) => {
        console.log(`Product ${data.productName} (ID: ${productId}): £${data.investments.toFixed(2)}, Fund IDs: ${data.portfolioFunds.join(', ')}`);
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
      
      console.log("Sorted Transactions:", sortedTransactions);
      
      setMonthlyTransactions(sortedTransactions);
      
      // Check if we have transactions to work with
      if (sortedTransactions.length === 0) {
        console.warn("No transactions found for the selected items");
        setDataError('No transactions found for the selected items');
        setIsCalculating(false);
        return;
      }
      
      // Calculate total valuation from most recent month
      if (sortedTransactions.length > 0) {
        const latestMonth = sortedTransactions[sortedTransactions.length - 1];
        
        // For the latest month, validate the valuation excludes inactive funds
        const latestMonthKey = latestMonth.year_month;
        const latestMonthFundValuations = monthlyFundValuations.get(latestMonthKey);
        
        if (latestMonthFundValuations) {
          // Calculate total excluding inactive funds
          const validatedTotalValuation = Array.from(latestMonthFundValuations.entries())
            .filter(([fundId, _]) => !inactiveFundIds.has(fundId))
            .reduce((sum, [_, value]) => sum + value, 0);
          
          console.log(`Latest month (${latestMonthKey}) total valuation: ${validatedTotalValuation} (excluding ${inactiveFundIds.size} inactive funds)`);
          
          // Update the total valuation
          setTotalValuation(validatedTotalValuation);
        } else {
          setTotalValuation(latestMonth.valuation);
        }
        
        setValuationDate(latestMonth.year_month);
        
        // Calculate IRR using our consolidated monthly transaction data
        if (sortedTransactions.length > 1) {
          const cashFlows: {date: Date, amount: number}[] = [];
          
          // Process each monthly transaction into a cash flow
          sortedTransactions.forEach((transaction, index) => {
            // Create date object for the middle of the month
            const [year, month] = transaction.year_month.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 15);
            
            // Skip transactions with zero or invalid values
            if (isNaN(date.getTime())) {
              console.warn(`Invalid date for transaction: ${transaction.year_month}`);
              return;
            }
            
            // The first month's valuation is considered an outflow (initial investment)
            if (index === 0) {
              if (transaction.valuation > 0) {
                // Initial investment is negative (money going out)
                cashFlows.push({
                  date,
                  amount: -transaction.valuation
                });
                console.log(`Added initial investment: ${-transaction.valuation} on ${date.toISOString()}`);
              } else {
                console.warn(`First month has zero valuation: ${transaction.year_month}`);
                
                // Fall back to using the first month's net flow as the initial investment
                if (transaction.net_flow > 0) {
                  cashFlows.push({
                    date,
                    amount: -transaction.net_flow
                  });
                  console.log(`Added initial net flow as investment: ${-transaction.net_flow} on ${date.toISOString()}`);
                }
              }
            }
            
            // For intermediate months, add net flow
            if (index > 0 && index < sortedTransactions.length - 1) {
              // Add net monthly cash flow (if any)
              // Investments are negative (money going out), withdrawals are positive (money coming in)
              const netFlow = -(transaction.net_flow);
              if (Math.abs(netFlow) > 0.01) {
                cashFlows.push({
                  date,
                  amount: netFlow
                });
                console.log(`Added net flow: ${netFlow} on ${date.toISOString()}`);
              }
            }
            
            // For the last month, add the final valuation as a positive cash flow
            if (index === sortedTransactions.length - 1) {
              if (transaction.valuation > 0) {
                // Add a small time offset to the date to avoid same-day cash flows
                const finalDate = new Date(date);
                finalDate.setDate(finalDate.getDate() + 1);
                
                // Final valuation is positive (money coming in)
                cashFlows.push({
                  date: finalDate,
                  amount: transaction.valuation
                });
                console.log(`Added final valuation: ${transaction.valuation} on ${finalDate.toISOString()}`);
              } else {
                console.warn(`Last month has zero valuation: ${transaction.year_month}`);
              }
            }
          });
          
          console.log("Cash Flows for IRR calculation:", cashFlows);
          
          // Only calculate IRR if we have meaningful cash flows
          if (cashFlows.length >= 2) {
            try {
              const irrValue = calculateIRR(cashFlows);
              
              if (irrValue !== null) {
                setTotalIRR(irrValue);
                console.log(`Calculated IRR: ${irrValue}%`);
              } else {
                console.error("IRR calculation failed to produce a valid result");
                setTotalIRR(null);
              }
            } catch (err) {
              console.error('Error calculating IRR:', err);
              setTotalIRR(null);
            }
          } else {
            console.warn(`Not enough cash flows to calculate IRR: ${cashFlows.length} flows`);
            setTotalIRR(null);
          }
        } else {
          console.warn("Only one month of data available, can't calculate IRR");
          setTotalIRR(null);
        }
      }
      
      // Set related products and owners
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