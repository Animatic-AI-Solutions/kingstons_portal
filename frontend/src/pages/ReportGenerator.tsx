import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

// Fallback formatters - replace with your actual implementations if they exist elsewhere
const formatDateFallback = (dateString: string | null): string => {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length !== 2) return dateString; // Expect YYYY-MM
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  if (isNaN(year) || isNaN(month)) return dateString;
  const dateObj = new Date(year, month - 1);
  if (isNaN(dateObj.getTime())) return dateString;
  return dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const formatCurrencyFallback = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatPercentageFallback = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}%`;
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
  const [displayedProductOwners, setDisplayedProductOwners] = useState<ProductOwner[]>([]);
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
          allProductsRes,
          fundsRes,
          actualProductOwnersRes
        ] = await Promise.all([
          api.get('/client_groups'),
          api.get('/client_products'),
          api.get('/funds'),
          api.get('/product_owners')
        ]);
        
        setClientGroups(clientGroupsRes.data || []);
        setProducts(allProductsRes.data || []);
        setFundData(fundsRes.data || []);
        
        if (actualProductOwnersRes && actualProductOwnersRes.data) {
          setProductOwners(actualProductOwnersRes.data.map((owner: any) => ({
            id: owner.id,
            name: owner.name,
          })) || []);
        } else {
          setProductOwners([]);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        setError(err.response?.data?.detail || 'Failed to load initial data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [api]);
  
  // useEffect to update Product Owners displayed in "Related Items"
  useEffect(() => {
    const updateDisplayedOwners = async () => {
      let ownersToDisplay: ProductOwner[] = [];
      const ownerIdSet = new Set<number>();

      // Add directly selected product owners
      if (selectedProductOwners.length > 0) {
        selectedProductOwners.forEach(spo => {
          const fullOwner = productOwners.find(po => po.id === spo.id);
          if (fullOwner && !ownerIdSet.has(fullOwner.id)) {
            ownersToDisplay.push(fullOwner);
            ownerIdSet.add(fullOwner.id);
          }
        });
      }

      // Add product owners related to selected client groups
      if (selectedClientGroups.length > 0) {
        for (const scg of selectedClientGroups) {
          try {
            const response = await api.get(`/client_group_product_owners?client_group_id=${scg.id}`);
            if (response.data && response.data.length > 0) {
              const groupOwnerIds = response.data.map((assoc: any) => assoc.product_owner_id);
              for (const ownerId of groupOwnerIds) {
                const fullOwner = productOwners.find(po => po.id === ownerId);
                if (fullOwner && !ownerIdSet.has(fullOwner.id)) {
                  ownersToDisplay.push(fullOwner);
                  ownerIdSet.add(fullOwner.id);
                }
              }
            }
          } catch (err) {
            console.error(`Failed to fetch product owners for client group ${scg.id}:`, err);
          }
        }
      }
      setDisplayedProductOwners(ownersToDisplay);
    };

    if (productOwners.length > 0 || selectedClientGroups.length > 0) { // Run if product owners are loaded or client groups are selected
      updateDisplayedOwners();
    } else {
      setDisplayedProductOwners([]); // Clear if no selections and no owners loaded
    }
  }, [selectedProductOwners, selectedClientGroups, productOwners, api]);

  // NEW useEffect for instant "Related Products" display (REQ 3)
  useEffect(() => {
    const updateRelatedProducts = async () => {
      let productsToDisplay: Product[] = [];
      const displayedProductIds = new Set<number>();

      // 1. Directly selected products
      for (const sp of selectedProducts) {
        const product = products.find(p => p.id === sp.id);
        if (product && !displayedProductIds.has(product.id)) {
          productsToDisplay.push(product);
          displayedProductIds.add(product.id);
        }
      }

      // 2. Products from selected client groups
      if (selectedClientGroups.length > 0) {
        const clientGroupIds = selectedClientGroups.map(cg => cg.id);
        const clientGroupProds = products.filter(p => p.client_id && clientGroupIds.includes(p.client_id));
        clientGroupProds.forEach(p => {
          if (!displayedProductIds.has(p.id)) {
            productsToDisplay.push(p);
            displayedProductIds.add(p.id);
          }
        });
      }

      // 3. Products from selected product owners
      if (selectedProductOwners.length > 0) {
        for (const spo of selectedProductOwners) {
          try {
            const response = await api.get(`/product_owners/${spo.id}/products`);
            if (response.data && Array.isArray(response.data)) {
              const ownerSpecificProducts = response.data as Product[];
              ownerSpecificProducts.forEach(p => {
                if (!displayedProductIds.has(p.id)) {
                  productsToDisplay.push(p); // Add the full product object
                  displayedProductIds.add(p.id);
                }
              });
            }
          } catch (err) {
            console.error(`Failed to fetch products for PO ${spo.id} (report gen):`, err);
            // Optionally, show a partial error or decide if report can proceed
          }
        }
      }
      setRelatedProducts(productsToDisplay);
    };
    
    // Run when selections change or the main product list is available
    // products.length check ensures we don't run with an empty lookup list
    if (products.length > 0 || selectedProductOwners.length > 0 ) { // also run if product owners selected, as they fetch their own products
        updateRelatedProducts();
    } else {
        setRelatedProducts([]); // Clear if no relevant selections
    }
  }, [selectedProducts, selectedClientGroups, selectedProductOwners, products, api]);

  const calculateIRR = (cashFlows: {date: Date, amount: number}[], maxIterations = 100, precision = 0.000001): number | null => {
    if (cashFlows.length < 2 || cashFlows.filter(cf => cf.amount !== 0).length < 2) {
      console.warn("IRR calculation requires at least two non-zero cash flows.");
      return null;
    }
    const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstFlowDate = sortedFlows[0].date;
  
    let rate = 0.1; // Initial guess
    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;
      for (const flow of sortedFlows) {
        const years = (flow.date.getTime() - firstFlowDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        npv += flow.amount / Math.pow(1 + rate, years);
        if (rate > -1) { 
          derivative += -years * flow.amount / Math.pow(1 + rate, years + 1);
        } else {
          return null; 
        }
      }
      if (Math.abs(npv) < precision) return rate * 100; 
      if (derivative === 0) return null; 
      rate -= npv / derivative;
      if (rate < -0.99) rate = -0.99; 
    }
    console.warn("IRR did not converge after max iterations.");
    return null; 
  };

  const generateReport = async () => {
    if (selectedClientGroups.length === 0 && selectedProductOwners.length === 0 && selectedProducts.length === 0) {
      setDataError('Please select at least one client group, product owner, or product to generate a report.');
      return;
    }
    
    setIsCalculating(true);
    setDataError(null);
    setMonthlyTransactions([]);
    setTotalValuation(null);
    setValuationDate(null);
    setTotalIRR(null);
    
    try {
      // --- Step 1: Consolidate all Product IDs for the Report (REQ 1) ---
      const productIdsForReport = new Set<number>();
      // This will store full product objects fetched for product owners if they are not in the main 'products' list
      const additionalProductsData: Product[] = []; 

      // 1a. Add directly selected products
      if (selectedProducts.length > 0) {
        selectedProducts.forEach(p => productIdsForReport.add(p.id));
      }
      
      // 1b. Add products from selected client groups
      if (selectedClientGroups.length > 0) {
        const clientGroupIds = selectedClientGroups.map(cg => cg.id);
        const clientGroupAttachedProducts = products.filter(p => p.client_id && clientGroupIds.includes(p.client_id));
        clientGroupAttachedProducts.forEach(p => productIdsForReport.add(p.id));
      }
      
      // 1c. Add products from selected product owners
      if (selectedProductOwners.length > 0) {
        for (const spo of selectedProductOwners) {
          try {
            const response = await api.get(`/product_owners/${spo.id}/products`);
            if (response.data && Array.isArray(response.data)) {
              const ownerSpecificProducts = response.data as Product[];
              ownerSpecificProducts.forEach(p => {
                productIdsForReport.add(p.id);
                // If this product isn't in our main 'products' list, store its details
                if (!products.find(mainP => mainP.id === p.id)) {
                    additionalProductsData.push(p);
                }
              });
            }
          } catch (err) {
            console.error(`Failed to fetch products for PO ${spo.id} (report gen):`, err);
            // Optionally, show a partial error or decide if report can proceed
          }
        }
      }
      
      const uniqueProductIds = Array.from(productIdsForReport);
      
      if (uniqueProductIds.length === 0) {
        setDataError('No products found for your selection to generate the report.');
        setIsCalculating(false);
        return;
      }
      console.log("Unique Product IDs for report:", uniqueProductIds);

      // --- Step 2: Get Portfolio IDs for all selected products ---
      // Combine main products list with any additionally fetched products for a full lookup
      const comprehensiveProductList = [...products, ...additionalProductsData.filter(ap => !products.find(mp => mp.id === ap.id))];

      const portfolioIds = uniqueProductIds.map(productId => {
        const productDetails = comprehensiveProductList.find(p => p.id === productId);
        return productDetails?.portfolio_id;
      }).filter(id => id != null) as number[];
      
      if (portfolioIds.length === 0) {
        setDataError('No portfolios associated with the selected products.');
        setIsCalculating(false);
        return;
      }
      const uniquePortfolioIds = [...new Set(portfolioIds)];
      console.log("Unique Portfolio IDs for report:", uniquePortfolioIds);
      
      // --- Step 3: Fetch all PortfolioFunds for these Portfolios ---
      const portfolioFundsResponses = await Promise.all(
        uniquePortfolioIds.map(id => api.get(`/portfolio_funds?portfolio_id=${id}`))
      );
      const allPortfolioFunds = portfolioFundsResponses.flatMap(res => res.data as PortfolioFund[]);
      
      if (allPortfolioFunds.length === 0) {
        setDataError('No funds found for the selected portfolios.');
        setIsCalculating(false);
        return;
      }
      console.log("Total PortfolioFunds fetched:", allPortfolioFunds.length);

      // --- Step 4: Identify Inactive PortfolioFunds (REQ 2) ---
      const inactiveFundIds = new Set<number>();
      allPortfolioFunds.forEach(fund => {
        if (fund.id && fund.status && fund.status !== 'active') {
          inactiveFundIds.add(fund.id);
        }
      });
      console.log("Inactive PortfolioFund IDs:", Array.from(inactiveFundIds));

      // --- Step 5: Fetch Activity Logs and Valuations ---
      const uniquePortfolioFundIdsForAPI = [...new Set(allPortfolioFunds.map(pf => pf.id))];

      const activityLogsPromises = uniquePortfolioFundIdsForAPI.map(pfId => 
        api.get(`/holding_activity_logs?portfolio_fund_id=${pfId}`)
      );
      const allActivityLogs = (await Promise.all(activityLogsPromises)).flatMap(res => res.data);
      console.log("Total Activity Logs fetched:", allActivityLogs.length);

      const latestValuationsViewResponse = await api.get('/all_latest_fund_valuations');
      const latestValuationFromViewMap = new Map<number, { value: number, valuation_date: string }>();
      if (latestValuationsViewResponse.data && Array.isArray(latestValuationsViewResponse.data)) {
          latestValuationsViewResponse.data.forEach((val: any) => {
              if (val.portfolio_fund_id != null && val.value != null && val.valuation_date != null) {
                  latestValuationFromViewMap.set(val.portfolio_fund_id, { value: parseFloat(val.value), valuation_date: val.valuation_date });
              }
          });
      }
      console.log("Latest Valuations from View loaded:", latestValuationFromViewMap.size);
      
      // Fetch all historical valuations for the monthly table
      const historicalValuationsPromises = uniquePortfolioFundIdsForAPI.map(pfId => 
        api.get(`/fund_valuations?portfolio_fund_id=${pfId}`)
      );
      const allHistoricalValuations = (await Promise.all(historicalValuationsPromises)).flatMap(res => res.data);
      console.log("Total Historical Valuations fetched:", allHistoricalValuations.length);

      // --- Step 6: Process Transactions and Valuations by Month ---
      const transactionsByMonthMap = new Map<string, {
        investments: number; withdrawals: number; switchIn: number; switchOut: number; valuation: number;
      }>();
      
      allActivityLogs.forEach((log: any) => {
        if (!log.activity_timestamp || !log.amount) return; // Skip logs without timestamp or amount
        const parsedAmount = parseFloat(log.amount);
        if (parsedAmount === 0) return; // Skip zero amount logs

        const date = new Date(log.activity_timestamp);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!transactionsByMonthMap.has(yearMonth)) {
          transactionsByMonthMap.set(yearMonth, { investments: 0, withdrawals: 0, switchIn: 0, switchOut: 0, valuation: 0 });
        }
        const monthData = transactionsByMonthMap.get(yearMonth)!;
        
        switch(log.activity_type) {
          case 'Investment': case 'RegularInvestment': case 'GovernmentUplift': monthData.investments += parsedAmount; break;
          case 'Withdrawal': monthData.withdrawals += parsedAmount; break; // Assuming withdrawals are positive in DB
          case 'SwitchIn': monthData.switchIn += parsedAmount; break;
          case 'SwitchOut': monthData.switchOut += parsedAmount; break;
        }
      });

      // Group historical valuations by month and sum them up
      const monthlyHistoricalValuationSums = new Map<string, number>(); // yearMonth -> total historical value
      const distinctValuationDatesByMonth = new Map<string, Date>(); // To find the latest date in a historical month

      allHistoricalValuations.forEach((v: any) => {
          if (!v.valuation_date || v.portfolio_fund_id == null || v.value == null) return;
          const valDate = new Date(v.valuation_date);
          const yearMonth = `${valDate.getFullYear()}-${String(valDate.getMonth() + 1).padStart(2, '0')}`;
          
          const currentVal = parseFloat(v.value);
          // This logic assumes we sum all valuation records within a month.
          // If you need only month-end, the query or processing here needs adjustment.
          // For simplicity, we sum them now. A more precise approach would be to pick one valuation per fund per month (e.g., latest).
          monthlyHistoricalValuationSums.set(yearMonth, (monthlyHistoricalValuationSums.get(yearMonth) || 0) + currentVal);

          if (!distinctValuationDatesByMonth.has(yearMonth) || valDate > distinctValuationDatesByMonth.get(yearMonth)!) {
            distinctValuationDatesByMonth.set(yearMonth, valDate);
          }
      });
      
      const allReportYearMonths = new Set<string>([...transactionsByMonthMap.keys(), ...monthlyHistoricalValuationSums.keys()]);
      const sortedReportYearMonths = Array.from(allReportYearMonths).sort();
      const latestReportCycleMonth = sortedReportYearMonths.length > 0 ? sortedReportYearMonths[sortedReportYearMonths.length - 1] : null;

      // Populate valuations in transactionsByMonthMap
      sortedReportYearMonths.forEach(yearMonth => {
        if (!transactionsByMonthMap.has(yearMonth)) { // Ensure month entry exists if only valuations occurred
            transactionsByMonthMap.set(yearMonth, { investments: 0, withdrawals: 0, switchIn: 0, switchOut: 0, valuation: 0 });
        }
        const monthData = transactionsByMonthMap.get(yearMonth)!;
        
        if (yearMonth === latestReportCycleMonth) { // For the LATEST month in the report cycle
            let latestMonthValuation = 0;
            uniquePortfolioFundIdsForAPI.forEach(pfId => {
                if (inactiveFundIds.has(pfId)) { // REQ 2: Inactive funds = 0 for current valuation
                    latestMonthValuation += 0;
                } else {
                    const latestValData = latestValuationFromViewMap.get(pfId);
                    latestMonthValuation += latestValData ? latestValData.value : 0;
                }
            });
            monthData.valuation = latestMonthValuation;
        } else { // For HISTORICAL months
            monthData.valuation = monthlyHistoricalValuationSums.get(yearMonth) || 0;
        }
      });
      
      // --- Step 7: Final Report Data Assembly & State Updates ---
      const finalMonthlyTransactions = sortedReportYearMonths.map(yearMonth => {
        const data = transactionsByMonthMap.get(yearMonth)!;
        return {
          year_month: yearMonth,
          total_investment: data.investments,
          total_withdrawal: data.withdrawals,
          total_switch_in: data.switchIn,
          total_switch_out: data.switchOut,
          net_flow: data.investments - data.withdrawals + data.switchIn - data.switchOut, // Note: sign of withdrawal matters
          valuation: data.valuation
        };
      });
      setMonthlyTransactions(finalMonthlyTransactions);

      // Calculate overall "Total Valuation" for the summary box (REQ 2 applied)
      let summaryTotalValuation = 0;
      let mostRecentValuationDateForActiveFunds: Date | null = null;

      uniquePortfolioFundIdsForAPI.forEach(pfId => {
          if (!inactiveFundIds.has(pfId)) { // Only sum active funds for the summary
              const latestVal = latestValuationFromViewMap.get(pfId);
              if (latestVal) {
                  summaryTotalValuation += latestVal.value;
                  const currentValDate = new Date(latestVal.valuation_date);
                  if (!mostRecentValuationDateForActiveFunds || currentValDate > mostRecentValuationDateForActiveFunds) {
                      mostRecentValuationDateForActiveFunds = currentValDate;
                  }
              }
          }
      });
      setTotalValuation(summaryTotalValuation);
      
      let formattedValuationDate: string | null = latestReportCycleMonth; // Default/fallback
      if (mostRecentValuationDateForActiveFunds) { // Check if it's not null
          // Now TypeScript knows it's a Date object here
          formattedValuationDate = `${mostRecentValuationDateForActiveFunds.getFullYear()}-${String(mostRecentValuationDateForActiveFunds.getMonth() + 1).padStart(2, '0')}`;
      }
      setValuationDate(formattedValuationDate);
      
      // IRR Calculation (REQ 2 applied for terminal value)
      if (finalMonthlyTransactions.length > 0) {
          const cashFlows: {date: Date, amount: number}[] = [];
        finalMonthlyTransactions.forEach((transaction, index) => {
            const [yearStr, monthStr] = transaction.year_month.split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr) - 1; // JS months are 0-indexed

            // Initial investment: Using net_flow for the first period.
            // If valuation is positive, it's an "investment" (outflow).
            // If net_flow is positive (more money in), it's an outflow from investor's perspective.
            if (index === 0) {
                let initialOutlay = -(transaction.total_investment); // Or more complex logic if needed
                if (transaction.valuation > 0 && transaction.total_investment === 0 && transaction.total_withdrawal ===0 ) {
                   initialOutlay = -transaction.valuation; // If first entry is just a valuation
                }
                 if (initialOutlay !==0) cashFlows.push({ date: new Date(year, month, 1), amount: initialOutlay });
            }
            
            // Net flows for periods between the first and last.
            // Positive net_flow (investment) is negative for IRR calc.
            // Negative net_flow (withdrawal) is positive for IRR calc.
            if (index > 0 && index < finalMonthlyTransactions.length -1 ) {
                 if(transaction.net_flow !== 0) cashFlows.push({ date: new Date(year, month, 1), amount: -transaction.net_flow });
            }

            // Terminal value: Use the summaryTotalValuation (which respects inactive funds)
            if (index === finalMonthlyTransactions.length - 1) {
                 // Add any final period net flow before the terminal valuation
                 if(transaction.net_flow !== 0 && index !== 0) { // avoid double counting if only one period
                    cashFlows.push({ date: new Date(year, month, 1), amount: -transaction.net_flow });
                 }
                 // Add terminal valuation
                 if(summaryTotalValuation !== 0) cashFlows.push({ date: new Date(year, month, 28), amount: summaryTotalValuation });
            }
        });
        
        console.log("Cash Flows for IRR:", cashFlows);
        if (cashFlows.filter(cf => cf.amount !==0).length >= 2) { // Need at least two non-zero cashflows
            // Ensure first cashflow is negative for typical IRR scenarios
            const firstNonZeroIndex = cashFlows.findIndex(cf => cf.amount !== 0);
            if(firstNonZeroIndex !== -1 && cashFlows[firstNonZeroIndex].amount > 0) {
                // If first significant cashflow is positive, IRR might be problematic or require adjustment
                console.warn("First significant cashflow is positive, IRR might be unusual.");
            }
            try {
                 const irrValue = calculateIRR(cashFlows); // Your existing calculateIRR function
                setTotalIRR(irrValue);
            } catch(irrError){
                 console.error("Error calculating IRR:", irrError);
              setTotalIRR(null);
            }
          } else {
            console.warn("Not enough distinct cash flows to calculate IRR.");
            setTotalIRR(null);
          }
        } else {
          setTotalIRR(null);
      }
      
    } catch (err: any) {
      console.error('Error generating report:', err);
      setDataError(err.response?.data?.detail || 'Failed to generate report. Check console for details.');
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Pivoted Table Data Preparation (ensure this is BEFORE the return statement with JSX)
  const transactionRowLabels = [
    { key: 'total_investment', label: 'Investment' },
    { key: 'total_withdrawal', label: 'Withdrawal' },
    { key: 'total_switch_in', label: 'Switch In' },
    { key: 'total_switch_out', label: 'Switch Out' },
    { key: 'net_flow', label: 'Net Flow' },
    { key: 'valuation', label: 'Valuation' },
  ];

  const columnMonths = useMemo(() => {
    if (!monthlyTransactions || monthlyTransactions.length === 0) return [];
    // Ensure months are sorted chronologically, as they might come from a Set initially
    return monthlyTransactions.map(mt => mt.year_month).sort((a, b) => a.localeCompare(b));
  }, [monthlyTransactions]);

  const pivotedTableData = useMemo(() => {
    if (!monthlyTransactions || monthlyTransactions.length === 0 || columnMonths.length === 0) return [];
    
    const dataMap = new Map<string, MonthlyTransaction>();
    monthlyTransactions.forEach(mt => dataMap.set(mt.year_month, mt));

    return transactionRowLabels.map(rowType => {
      const row: { [key: string]: string | number } = { transactionType: rowType.label };
      let totalForRow = 0;
      columnMonths.forEach(month => {
        const monthData = dataMap.get(month);
        const value = monthData ? monthData[rowType.key as keyof MonthlyTransaction] as number : 0;
        row[month] = value;
        // Only sum transaction types for the 'Total' column, not month-end valuations
        if (rowType.key !== 'valuation') { 
          totalForRow += value;
        }
      });
      // For the 'Valuation' row, the 'Total' column should reflect the latest portfolio valuation summary.
      // It should NOT be a sum of all monthly valuations.
      row['total'] = rowType.key === 'valuation' ? (totalValuation ?? 0) : totalForRow;
      return row;
    });
  }, [monthlyTransactions, columnMonths, transactionRowLabels, totalValuation]); // Added totalValuation dependency

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-normal text-gray-900 font-sans tracking-wide mb-6">
        Report Generator
      </h1>
      
      {/* Error display for initial load errors */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
      )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side - Selection Panels */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-normal text-gray-900 mb-4">Select Items for Report</h2>
            
            <SearchableDropdown
              label="Client Groups"
              placeholder="Search client groups..."
              items={clientGroups.map(cg => ({ id: cg.id, name: cg.name }))}
              selectedItems={selectedClientGroups}
            onItemAdd={(item) => setSelectedClientGroups(prev => [...prev, item])}
            onItemRemove={(id) => setSelectedClientGroups(prev => prev.filter(item => item.id !== id))}
            />
            
            <SearchableDropdown
              label="Product Owners"
              placeholder="Search product owners..."
              items={productOwners.map(po => ({ id: po.id, name: po.name }))}
              selectedItems={selectedProductOwners}
            onItemAdd={(item) => setSelectedProductOwners(prev => [...prev, item])}
            onItemRemove={(id) => setSelectedProductOwners(prev => prev.filter(item => item.id !== id))}
            />
            
            <SearchableDropdown
              label="Products"
              placeholder="Search products..."
              items={products.map(p => ({ id: p.id, name: p.product_name }))}
              selectedItems={selectedProducts}
            onItemAdd={(item) => setSelectedProducts(prev => [...prev, item])}
            onItemRemove={(id) => setSelectedProducts(prev => prev.filter(item => item.id !== id))}
            />
            
            <button
              onClick={generateReport}
            disabled={isCalculating || isLoading} // Disable if initial load is also happening
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-xl shadow-sm hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            {isCalculating ? 'Calculating...' : 'Generate Report'}
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
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Related Items</h3>
            <div className="border rounded-lg p-4 bg-gray-50 min-h-[100px]">
              {(displayedProductOwners.length > 0 || relatedProducts.length > 0) ? (
                  <div className="space-y-3">
                  {displayedProductOwners.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Product Owners</h4>
                        <div className="flex flex-wrap gap-2">
                        {displayedProductOwners.map(owner => (
                          <span key={owner.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                          <span key={product.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {product.product_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                <p className="text-sm text-gray-500">Select items to see related entities.</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Total Valuation</h3>
                {totalValuation !== null ? (
                  <div>
                    <div className="text-2xl font-semibold text-primary-700">{formatCurrencyFallback(totalValuation)}</div>
                    {valuationDate && (
                      <div className="text-xs text-gray-500 mt-1">as of {formatDateFallback(valuationDate)}</div>
                    )}
                  </div>
                ) : (
                <div className="text-sm text-gray-500">{isCalculating ? 'Calculating...' : 'No valuation data'}</div>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Total IRR</h3>
                {totalIRR !== null ? (
                  <div className={`text-2xl font-semibold ${totalIRR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentageFallback(totalIRR)}
                  </div>
                ) : (
                <div className="text-sm text-gray-500">{isCalculating ? 'Calculating...' : 'No IRR data'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      
      {/* Monthly Transactions Table (Pivoted) */}
      {monthlyTransactions.length > 0 && (
         <div className="mt-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Transactions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 table-fixed">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="w-1/5 px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-blue-300 sticky left-0 bg-gray-100 z-10">
                    Transaction Type
                  </th>
                  {columnMonths.map(month => (
                    <th key={month} scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-blue-300">
                      {formatDateFallback(month)}
                    </th>
                  ))}
                  <th scope="col" className="w-1/6 px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-blue-300 sticky right-0 bg-gray-100 z-10">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pivotedTableData.map((row) => {
                  const isValuationRow = row.transactionType === 'Valuation';
                  return (
                    <tr 
                      key={row.transactionType as string} 
                      className={`hover:bg-blue-50 transition-colors duration-150 group ${
                        isValuationRow ? 'border-t-2 border-gray-400 font-semibold' : ''
                      }`}
                    >
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-800 sticky left-0 bg-white group-hover:bg-blue-50 z-5 ${
                        isValuationRow ? 'font-semibold text-blue-700' : 'font-medium'
                      }`}>
                        {row.transactionType as string}
                      </td>
                      {columnMonths.map(month => (
                        <td key={month} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {formatCurrencyFallback(row[month] as number)}
                        </td>
                      ))}
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-right sticky right-0 bg-white group-hover:bg-blue-50 z-5 ${
                         isValuationRow ? 'font-semibold text-blue-700' : 'font-medium'
                      }`}>
                        {formatCurrencyFallback(row.total as number)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator; 